"use client";

import { useEffect, useMemo, useState } from "react";
import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { EmptyFindingsState } from "@/features/terraform-plan/components/findings/EmptyFindingsState";
import { FindingCard } from "@/features/terraform-plan/components/findings/FindingCard";
import {
  formatFindingCopy,
  getSafeFindingEvidence,
} from "@/features/terraform-plan/components/findings/findingPresentation";
import { compareRiskSeverity } from "@/features/terraform-plan/risk/riskCopy";
import type { RiskFinding } from "@/features/terraform-plan/risk/riskTypes";

interface ResourceFindingsTabProps {
  resourceChange: NormalizedResourceChange;
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

function compareFindings(left: RiskFinding, right: RiskFinding): number {
  return (
    compareRiskSeverity(left.severity, right.severity) ||
    left.category.localeCompare(right.category) ||
    left.title.localeCompare(right.title)
  );
}

export function ResourceFindingsTab({
  resourceChange,
}: ResourceFindingsTabProps) {
  const [copiedFindingId, setCopiedFindingId] = useState<string | null>(null);
  const [failedFindingId, setFailedFindingId] = useState<string | null>(null);
  const findings = useMemo(
    () => [...(resourceChange.riskSummary?.findings ?? [])].sort(compareFindings),
    [resourceChange],
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

  if (findings.length === 0) {
    return (
      <EmptyFindingsState
        title="No deterministic risk findings are attached to this resource."
        description="This resource did not match any current risk rules, but the diff is still worth reviewing before apply."
      />
    );
  }

  const handleCopyFinding = async (finding: RiskFinding) => {
    const copied = await copyText(
      formatFindingCopy(finding, getSafeFindingEvidence(finding)),
    );

    if (copied) {
      setCopiedFindingId(finding.id);
      setFailedFindingId(null);
      return;
    }

    setCopiedFindingId(null);
    setFailedFindingId(finding.id);
  };

  return (
    <section className="space-y-4" aria-label="Resource findings">
      <div className="border-border bg-surface rounded-lg border p-4 sm:p-5">
        <p className="text-foreground text-sm font-semibold">
          {findings.length} finding{findings.length === 1 ? "" : "s"} attached
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          These findings are scoped to this resource only and use the same deterministic Terraform risk rules as the main findings panel.
        </p>
      </div>

      <div className="space-y-3">
        {findings.map((finding) => (
          <FindingCard
            key={finding.id}
            copyState={
              copiedFindingId === finding.id
                ? "copied"
                : failedFindingId === finding.id
                  ? "error"
                  : "idle"
            }
            evidence={getSafeFindingEvidence(finding)}
            finding={finding}
            onCopy={() => {
              void handleCopyFinding(finding);
            }}
          />
        ))}
      </div>
    </section>
  );
}
