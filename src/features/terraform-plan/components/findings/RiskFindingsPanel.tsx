"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { ExportTrustNote } from "@/features/terraform-plan/components/privacy/ExportTrustNote";
import { usePrivacyRedaction } from "@/features/terraform-plan/components/privacy/PrivacyRedactionContext";
import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { redactText } from "@/features/terraform-plan/privacy/redactTerraformPlan";
import { getHighestSeverity } from "@/features/terraform-plan/risk/evaluateRisk";
import {
  compareRiskSeverity,
  getRiskActionLabel,
  getRiskCategoryLabel,
  getRiskSeverityLabel,
  getRiskSeverityTooltip,
  isHighSeverity,
  RISK_SEVERITY_ORDER,
} from "@/features/terraform-plan/risk/riskCopy";
import type {
  RiskActionKind,
  RiskCategory,
  RiskFinding,
  RiskSeverity,
} from "@/features/terraform-plan/risk/riskTypes";
import { EmptyFindingsState } from "@/features/terraform-plan/components/findings/EmptyFindingsState";
import {
  formatFindingCopy,
  getFindingResourceLabel,
  getSafeFindingEvidence,
} from "@/features/terraform-plan/components/findings/findingPresentation";
import {
  FindingFilters,
  type FindingFilterOption,
  type FindingGroupMode,
} from "@/features/terraform-plan/components/findings/FindingFilters";
import { FindingCard } from "@/features/terraform-plan/components/findings/FindingCard";
import { SeverityBadge } from "@/features/terraform-plan/components/findings/SeverityBadge";
import { cn } from "@/lib/utils";

interface RiskFindingsPanelProps {
  hasAnalyzed: boolean;
  normalizedPlan: NormalizedPlan | null;
  onOpenResource?: (resourceAddress: string) => void;
}

interface FindingGroup {
  description?: string;
  findings: RiskFinding[];
  key: string;
  title: string;
}

const PLAN_WIDE_GROUP_KEY = "__plan-wide__";
const FINDING_ACTION_ORDER: RiskActionKind[] = [
  "create",
  "update",
  "replace",
  "delete",
  "read",
  "import",
  "forget",
  "no-op",
  "unknown",
  "plan",
];

function compareFindings(left: RiskFinding, right: RiskFinding): number {
  return (
    compareRiskSeverity(left.severity, right.severity) ||
    left.category.localeCompare(right.category) ||
    (left.resourceAddress ?? "~plan-wide").localeCompare(
      right.resourceAddress ?? "~plan-wide",
    ) ||
    left.title.localeCompare(right.title)
  );
}

function buildSummaryLabel(filteredCount: number, totalCount: number): string {
  if (filteredCount === totalCount) {
    return `Showing all ${totalCount} findings.`;
  }

  return `Showing ${filteredCount} of ${totalCount} findings.`;
}

function getFindingSearchText(finding: RiskFinding): string {
  return [
    finding.title,
    finding.resourceAddress,
    finding.resourceType,
    finding.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getGuidanceCopy(highestSeverity: RiskSeverity | null): string {
  switch (highestSeverity) {
    case "critical":
      return "Review before apply. This change can destroy or recreate production-like infrastructure.";
    case "high":
      return "Needs reviewer attention. Confirm the intended blast radius.";
    case "medium":
      return "Review these findings before apply and confirm the diff matches expectations.";
    case "low":
    case "info":
      return "These findings are lower severity, but they still help explain what will change.";
    default:
      return "No high-risk patterns detected. Still review the plan before applying.";
  }
}

function createSelectOptions<T extends string>(
  values: T[],
  counts: Map<T, number>,
  getLabel: (value: T) => string,
  allLabel: string,
): FindingFilterOption[] {
  return [
    {
      count: Array.from(counts.values()).reduce((total, count) => total + count, 0),
      label: allLabel,
      value: "all",
    },
    ...values
      .filter((value) => (counts.get(value) ?? 0) > 0)
      .map((value) => ({
        count: counts.get(value) ?? 0,
        label: getLabel(value),
        value,
      })),
  ];
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.append(helper);
    helper.select();

    const copied = document.execCommand("copy");
    helper.remove();

    return copied;
  } catch {
    return false;
  }
}

function formatHighRiskCopy(
  findings: RiskFinding[],
  settings: Parameters<typeof getSafeFindingEvidence>[1],
): string {
  const sections = findings.map((finding) =>
    formatFindingCopy(finding, getSafeFindingEvidence(finding, settings)),
  );

  return [
    "# Terraform plan high-risk findings",
    "",
    ...sections.flatMap((section) => [section, ""]),
  ]
    .join("\n")
    .trim();
}

function buildSeverityGroups(findings: RiskFinding[]): FindingGroup[] {
  return RISK_SEVERITY_ORDER.map((severity) => ({
    key: severity,
    title: getRiskSeverityLabel(severity),
    description: getRiskSeverityTooltip(severity),
    findings: findings.filter((finding) => finding.severity === severity),
  })).filter((group) => group.findings.length > 0);
}

function buildResourceGroups(findings: RiskFinding[]): FindingGroup[] {
  const groups = new Map<string, FindingGroup>();

  for (const finding of findings) {
    const key = finding.resourceAddress ?? PLAN_WIDE_GROUP_KEY;
    const existing = groups.get(key);

    if (existing) {
      existing.findings.push(finding);
      continue;
    }

    groups.set(key, {
      key,
      title: getFindingResourceLabel(finding),
      description: finding.resourceType
        ? `Primary type: ${finding.resourceType}`
        : "Plan-wide finding",
      findings: [finding],
    });
  }

  return Array.from(groups.values());
}

export function RiskFindingsPanel({
  hasAnalyzed,
  normalizedPlan,
  onOpenResource,
}: RiskFindingsPanelProps) {
  const { settings } = usePrivacyRedaction();
  const [severity, setSeverity] = useState<RiskSeverity | "all">("all");
  const [category, setCategory] = useState<RiskCategory | "all">("all");
  const [actionKind, setActionKind] = useState<RiskActionKind | "all">("all");
  const [search, setSearch] = useState("");
  const [highRiskOnly, setHighRiskOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<FindingGroupMode>("severity");
  const [copiedFindingId, setCopiedFindingId] = useState<string | null>(null);
  const [failedFindingId, setFailedFindingId] = useState<string | null>(null);
  const [bulkCopyState, setBulkCopyState] = useState<"copied" | "error" | "idle">(
    "idle",
  );
  const deferredSearch = useDeferredValue(search);
  const report = normalizedPlan?.riskReport;
  const sortedFindings = [...(report?.findings ?? [])].sort(compareFindings);
  const highRiskFindings = sortedFindings.filter((finding) =>
    isHighSeverity(finding.severity),
  );
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredFindings = sortedFindings.filter((finding) => {
    if (severity !== "all" && finding.severity !== severity) {
      return false;
    }

    if (category !== "all" && finding.category !== category) {
      return false;
    }

    if (actionKind !== "all" && finding.actionKind !== actionKind) {
      return false;
    }

    if (highRiskOnly && !isHighSeverity(finding.severity)) {
      return false;
    }

    if (normalizedSearch.length > 0) {
      return getFindingSearchText(finding).includes(normalizedSearch);
    }

    return true;
  });
  const severityCounts = new Map<RiskSeverity, number>();
  const categoryCounts = new Map<RiskCategory, number>();
  const actionCounts = new Map<RiskActionKind, number>();

  for (const finding of sortedFindings) {
    severityCounts.set(
      finding.severity,
      (severityCounts.get(finding.severity) ?? 0) + 1,
    );
    categoryCounts.set(
      finding.category,
      (categoryCounts.get(finding.category) ?? 0) + 1,
    );
    actionCounts.set(
      finding.actionKind,
      (actionCounts.get(finding.actionKind) ?? 0) + 1,
    );
  }

  const severityOptions = createSelectOptions(
    RISK_SEVERITY_ORDER,
    severityCounts,
    getRiskSeverityLabel,
    "All severities",
  );
  const categoryOptions = createSelectOptions(
    [...categoryCounts.keys()].sort((left, right) =>
      getRiskCategoryLabel(left).localeCompare(getRiskCategoryLabel(right)),
    ),
    categoryCounts,
    getRiskCategoryLabel,
    "All categories",
  );
  const actionOptions = createSelectOptions(
    FINDING_ACTION_ORDER,
    actionCounts,
    getRiskActionLabel,
    "All actions",
  );
  const highestVisibleSeverity = getHighestSeverity(filteredFindings);
  const groups =
    groupBy === "resource"
      ? buildResourceGroups(filteredFindings)
      : buildSeverityGroups(filteredFindings);
  const resourceAddressSet = new Set(
    normalizedPlan?.resourceChanges.map((resourceChange) => resourceChange.address) ??
      [],
  );

  useEffect(() => {
    if (copiedFindingId === null && failedFindingId === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedFindingId(null);
      setFailedFindingId(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copiedFindingId, failedFindingId]);

  useEffect(() => {
    if (bulkCopyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBulkCopyState("idle");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [bulkCopyState]);

  if (!hasAnalyzed || !normalizedPlan) {
    return (
      <EmptyFindingsState
        title="Analyze a Terraform plan to inspect risk findings."
        description="Deterministic Terraform risk findings will appear here after local analysis completes."
      />
    );
  }

  if (!report || sortedFindings.length === 0) {
    return (
      <EmptyFindingsState
        tone="positive"
        title="No high-risk patterns detected. Still review the plan before applying."
        description="This plan did not match any deterministic risk rules, but a human review is still worth doing before apply."
      />
    );
  }

  const handleCopyFinding = async (finding: RiskFinding) => {
    const copied = await copyText(
      redactText(
        formatFindingCopy(finding, getSafeFindingEvidence(finding, settings)),
        {
          scope: "export",
          settings,
        },
      ),
    );

    if (copied) {
      setCopiedFindingId(finding.id);
      setFailedFindingId(null);
      return;
    }

    setFailedFindingId(finding.id);
    setCopiedFindingId(null);
  };

  const handleCopyHighRiskFindings = async () => {
    const copied = await copyText(
      redactText(formatHighRiskCopy(highRiskFindings, settings), {
        scope: "export",
        settings,
      }),
    );
    setBulkCopyState(copied ? "copied" : "error");
  };

  return (
    <section className="space-y-4" aria-label="Risk findings panel">
      <div className="border-border bg-surface rounded-lg border p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-foreground text-lg font-semibold">
              Risk findings
            </h3>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {getGuidanceCopy(highestVisibleSeverity)}
            </p>
          </div>

          <button
            type="button"
            className={cn(
              "inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              bulkCopyState === "copied" &&
                "border-positive bg-positive-soft text-positive",
              bulkCopyState === "error" &&
                "border-critical bg-critical-soft text-critical",
              bulkCopyState === "idle" &&
                "border-border bg-background text-foreground hover:bg-surface-muted",
            )}
            onClick={handleCopyHighRiskFindings}
            disabled={highRiskFindings.length === 0}
          >
            {bulkCopyState === "copied"
              ? "Copied high-risk findings"
              : bulkCopyState === "error"
                ? "Copy failed"
                : "Copy all high-risk findings"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="border-border bg-background inline-flex items-center gap-2 rounded-lg border px-3 py-2">
            <SeverityBadge severity={report.highestSeverity ?? "info"} />
            <span className="text-foreground text-sm font-medium">
              Overall highest severity
            </span>
          </div>
          <div className="border-border bg-background inline-flex rounded-lg border px-3 py-2 text-sm text-muted-foreground">
            {report.highRiskFindingCount} critical/high findings
          </div>
          <div className="border-border bg-background inline-flex rounded-lg border px-3 py-2 text-sm text-muted-foreground">
            Score {report.score}/100
          </div>
        </div>

        <ExportTrustNote />
      </div>

      <FindingFilters
        actionKind={actionKind}
        actionOptions={actionOptions}
        category={category}
        categoryOptions={categoryOptions}
        groupBy={groupBy}
        highRiskOnly={highRiskOnly}
        highRiskSummary={`${highRiskFindings.length} critical/high findings in the full report.`}
        onActionKindChange={setActionKind}
        onCategoryChange={setCategory}
        onGroupByChange={setGroupBy}
        onHighRiskOnlyChange={setHighRiskOnly}
        onSearchChange={setSearch}
        onSeverityChange={setSeverity}
        search={search}
        severity={severity}
        severityOptions={severityOptions}
        summaryLabel={buildSummaryLabel(filteredFindings.length, sortedFindings.length)}
      />

      {filteredFindings.length === 0 ? (
        <EmptyFindingsState
          title="No findings match the current filters."
          description="Try clearing one or more filters to broaden the visible result set."
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.key}
              className="border-border bg-background rounded-lg border p-4 sm:p-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-foreground text-base font-semibold">
                    {group.title}
                  </h4>
                  {group.description ? (
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      {group.description}
                    </p>
                  ) : null}
                </div>
                <span className="border-border bg-surface-muted inline-flex rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {group.findings.length} finding
                  {group.findings.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {group.findings.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    copyState={
                      copiedFindingId === finding.id
                        ? "copied"
                        : failedFindingId === finding.id
                          ? "error"
                          : "idle"
                    }
                    evidence={getSafeFindingEvidence(finding, settings)}
                    finding={finding}
                    onCopy={() => {
                      void handleCopyFinding(finding);
                    }}
                    onOpenResourceAddress={
                      onOpenResource &&
                      finding.resourceAddress &&
                      resourceAddressSet.has(finding.resourceAddress)
                        ? () => onOpenResource(finding.resourceAddress!)
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
