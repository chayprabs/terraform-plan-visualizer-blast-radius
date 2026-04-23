"use client";

import { useEffect, useMemo, useState } from "react";
import type { BlastRadiusAnalysis } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";
import { ExportTrustNote } from "@/features/terraform-plan/components/privacy/ExportTrustNote";
import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { redactTerraformValue } from "@/features/terraform-plan/privacy/redactTerraformPlan";
import {
  type TerraformPlanRedactionSettings,
} from "@/features/terraform-plan/privacy/redactionTypes";
import { createStableAnonymizer } from "@/features/terraform-plan/privacy/stableAnonymizer";
import { cn } from "@/lib/utils";

type PreviewFormat = "html" | "json" | "markdown";

interface ShareableReportData {
  blastRadius: {
    dependencyCaveat: string | null;
    directChangesCount: number;
    downstreamDependentsCount: number;
    focusResource: string;
    overallRisk: string;
    reviewerChecklist: string[];
  } | null;
  findings: Array<{
    category: string;
    resource: string | null;
    severity: string;
    title: string;
  }>;
  resources: Array<{
    action: string;
    address: string;
    module: string | null;
    provider: string;
    risk: string;
    type: string;
  }>;
  risk: {
    highRiskFindingCount: number;
    highestSeverity: string | null;
    score: number;
  } | null;
  source: {
    name: string;
    terraformVersion: string | null;
    timestamp: string | null;
  };
  summary: NormalizedPlan["summary"];
}

interface PreviewBundle {
  html: string;
  json: string;
  markdown: string;
}

interface PrivacyRedactionPanelProps {
  blastRadiusAnalysis: BlastRadiusAnalysis | null;
  hasAnalyzed: boolean;
  normalizedPlan: NormalizedPlan | null;
  onSettingsChange: (settings: TerraformPlanRedactionSettings) => void;
  settings: TerraformPlanRedactionSettings;
  sourceName?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildShareableReportData(
  normalizedPlan: NormalizedPlan,
  sourceName: string | undefined,
  blastRadiusAnalysis: BlastRadiusAnalysis | null,
): ShareableReportData {
  return {
    blastRadius: blastRadiusAnalysis?.focusNode
      ? {
          dependencyCaveat: blastRadiusAnalysis.dependencyCompleteness.isIncomplete
            ? blastRadiusAnalysis.dependencyCompleteness.summary
            : null,
          directChangesCount: blastRadiusAnalysis.directChangedNodes.length,
          downstreamDependentsCount: blastRadiusAnalysis.downstream.length,
          focusResource: blastRadiusAnalysis.focusNode.id,
          overallRisk: blastRadiusAnalysis.highestRiskSeverity ?? "none",
          reviewerChecklist: blastRadiusAnalysis.reviewerChecklist,
        }
      : null,
    findings: (normalizedPlan.riskReport?.findings ?? []).map((finding) => ({
      category: finding.category,
      resource: finding.resourceAddress ?? null,
      severity: finding.severity,
      title: finding.title,
    })),
    resources: normalizedPlan.resourceChanges.map((resourceChange) => ({
      action: resourceChange.action,
      address: resourceChange.address,
      module: resourceChange.moduleAddress ?? null,
      provider: resourceChange.providerShortName,
      risk: resourceChange.riskSummary?.highestSeverity ?? "none",
      type: resourceChange.type,
    })),
    risk: normalizedPlan.riskReport
      ? {
          highRiskFindingCount: normalizedPlan.riskReport.highRiskFindingCount,
          highestSeverity: normalizedPlan.riskReport.highestSeverity,
          score: normalizedPlan.riskReport.score,
        }
      : null,
    source: {
      name: sourceName ?? "plan.json",
      terraformVersion: normalizedPlan.terraformVersion ?? null,
      timestamp: normalizedPlan.timestamp ?? null,
    },
    summary: normalizedPlan.summary,
  };
}

function formatMarkdownReport(report: ShareableReportData): string {
  const lines = [
    "# Terraform Plan Report",
    "",
    `- Source: ${report.source.name}`,
    `- Terraform version: ${report.source.terraformVersion ?? "unknown"}`,
    `- Timestamp: ${report.source.timestamp ?? "unknown"}`,
    "",
    "## Summary",
    `- Resource changes: ${report.summary.totalResourceChanges}`,
    `- Creates: ${report.summary.createCount}`,
    `- Updates: ${report.summary.updateCount}`,
    `- Deletes: ${report.summary.deleteCount}`,
    `- Replacements: ${report.summary.replaceCount}`,
    "",
    "## Risk",
    `- Highest severity: ${report.risk?.highestSeverity ?? "none"}`,
    `- High-risk findings: ${report.risk?.highRiskFindingCount ?? 0}`,
    `- Score: ${report.risk?.score ?? 0}/100`,
    "",
    "## Findings",
    ...(report.findings.length > 0
      ? report.findings.map(
          (finding) =>
            `- ${finding.severity} | ${finding.category} | ${finding.title}${finding.resource ? ` | ${finding.resource}` : ""}`,
        )
      : ["- No findings included."]),
    "",
    "## Resources",
    ...report.resources.map(
      (resource) =>
        `- ${resource.action} | ${resource.risk} | ${resource.address} | ${resource.type} | ${resource.provider} | ${resource.module ?? "root"}`,
    ),
  ];

  if (report.blastRadius) {
    lines.push(
      "",
      "## Blast Radius",
      `- Focus resource: ${report.blastRadius.focusResource}`,
      `- Overall risk: ${report.blastRadius.overallRisk}`,
      `- Direct changes count: ${report.blastRadius.directChangesCount}`,
      `- Downstream dependents count: ${report.blastRadius.downstreamDependentsCount}`,
      "",
      "### Reviewer checklist",
      ...report.blastRadius.reviewerChecklist.map((item) => `- ${item}`),
    );

    if (report.blastRadius.dependencyCaveat) {
      lines.push(
        "",
        "### Dependency caveat",
        `- ${report.blastRadius.dependencyCaveat}`,
      );
    }
  }

  return lines.join("\n").trim();
}

function formatHtmlReport(report: ShareableReportData): string {
  const findingsMarkup =
    report.findings.length > 0
      ? report.findings
          .map(
            (finding) =>
              `<li>${escapeHtml(finding.severity)} | ${escapeHtml(finding.category)} | ${escapeHtml(finding.title)}${finding.resource ? ` | ${escapeHtml(finding.resource)}` : ""}</li>`,
          )
          .join("")
      : "<li>No findings included.</li>";
  const resourcesMarkup = report.resources
    .map(
      (resource) =>
        `<li>${escapeHtml(resource.action)} | ${escapeHtml(resource.risk)} | ${escapeHtml(resource.address)} | ${escapeHtml(resource.type)} | ${escapeHtml(resource.provider)} | ${escapeHtml(resource.module ?? "root")}</li>`,
    )
    .join("");
  const blastRadiusMarkup = report.blastRadius
    ? `
      <section>
        <h2>Blast Radius</h2>
        <ul>
          <li>Focus resource: ${escapeHtml(report.blastRadius.focusResource)}</li>
          <li>Overall risk: ${escapeHtml(report.blastRadius.overallRisk)}</li>
          <li>Direct changes count: ${report.blastRadius.directChangesCount}</li>
          <li>Downstream dependents count: ${report.blastRadius.downstreamDependentsCount}</li>
        </ul>
        <h3>Reviewer checklist</h3>
        <ul>${report.blastRadius.reviewerChecklist
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}</ul>
        ${
          report.blastRadius.dependencyCaveat
            ? `<p>${escapeHtml(report.blastRadius.dependencyCaveat)}</p>`
            : ""
        }
      </section>
    `
    : "";

  return [
    "<article>",
    "<h1>Terraform Plan Report</h1>",
    "<section>",
    "<h2>Source</h2>",
    "<ul>",
    `<li>Source: ${escapeHtml(report.source.name)}</li>`,
    `<li>Terraform version: ${escapeHtml(report.source.terraformVersion ?? "unknown")}</li>`,
    `<li>Timestamp: ${escapeHtml(report.source.timestamp ?? "unknown")}</li>`,
    "</ul>",
    "</section>",
    "<section>",
    "<h2>Summary</h2>",
    "<ul>",
    `<li>Resource changes: ${report.summary.totalResourceChanges}</li>`,
    `<li>Creates: ${report.summary.createCount}</li>`,
    `<li>Updates: ${report.summary.updateCount}</li>`,
    `<li>Deletes: ${report.summary.deleteCount}</li>`,
    `<li>Replacements: ${report.summary.replaceCount}</li>`,
    "</ul>",
    "</section>",
    "<section>",
    "<h2>Risk</h2>",
    "<ul>",
    `<li>Highest severity: ${escapeHtml(report.risk?.highestSeverity ?? "none")}</li>`,
    `<li>High-risk findings: ${report.risk?.highRiskFindingCount ?? 0}</li>`,
    `<li>Score: ${report.risk?.score ?? 0}/100</li>`,
    "</ul>",
    "</section>",
    "<section>",
    "<h2>Findings</h2>",
    `<ul>${findingsMarkup}</ul>`,
    "</section>",
    "<section>",
    "<h2>Resources</h2>",
    `<ul>${resourcesMarkup}</ul>`,
    "</section>",
    blastRadiusMarkup,
    "</article>",
  ]
    .join("")
    .trim();
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

function PreviewToggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full border px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-foreground bg-background text-foreground"
          : "border-border bg-surface-muted text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function SettingToggle({
  checked,
  description,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="border-border bg-background flex items-start gap-3 rounded-lg border p-4">
      <input
        checked={checked}
        className="border-border mt-1 h-4 w-4 rounded"
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        type="checkbox"
      />
      <span>
        <span className="text-foreground block text-sm font-medium">{label}</span>
        <span className="text-muted-foreground mt-1 block text-sm leading-6">
          {description}
        </span>
      </span>
    </label>
  );
}

export function PrivacyRedactionPanel({
  blastRadiusAnalysis,
  hasAnalyzed,
  normalizedPlan,
  onSettingsChange,
  settings,
  sourceName,
}: PrivacyRedactionPanelProps) {
  const [previewFormat, setPreviewFormat] = useState<PreviewFormat>("markdown");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">(
    "idle",
  );
  const previewBundle = useMemo<PreviewBundle | null>(() => {
    if (!normalizedPlan) {
      return null;
    }

    const anonymizer = createStableAnonymizer();
    const reportData = buildShareableReportData(
      normalizedPlan,
      sourceName,
      blastRadiusAnalysis,
    );
    const redactedReport = redactTerraformValue(reportData, {
      anonymizer,
      scope: "export",
      settings,
    }) as ShareableReportData;

    return {
      html: formatHtmlReport(redactedReport),
      json: JSON.stringify(redactedReport, null, 2),
      markdown: formatMarkdownReport(redactedReport),
    };
  }, [blastRadiusAnalysis, normalizedPlan, settings, sourceName]);

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const activePreview = previewBundle?.[previewFormat] ?? "";

  return (
    <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            Privacy &amp; Redaction
          </h3>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-7">
            These settings stay in this browser tab only. Redaction is
            best-effort, so review every report and export before sharing.
          </p>
        </div>

        <button
          type="button"
          className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          disabled={!hasAnalyzed || !previewBundle}
          onClick={() => setPreviewVisible((current) => !current)}
        >
          {previewVisible ? "Hide redacted preview" : "Preview redacted report"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <SettingToggle
          checked={settings.maskTerraformSensitiveValues}
          description="Always on. Terraform `before_sensitive` and `after_sensitive` metadata is honored before display or export."
          disabled
          label="Mask Terraform-sensitive values"
        />
        <SettingToggle
          checked={settings.detectSecretLikeStrings}
          description="Masks common tokens, private keys, and sensitive key/value pairs before display or export."
          label="Detect and mask secret-like strings"
          onChange={(checked) =>
            onSettingsChange({
              ...settings,
              detectSecretLikeStrings: checked,
            })
          }
        />
        <SettingToggle
          checked={settings.anonymizeResourceNamesInExports}
          description="Uses stable placeholders like `resource_001` and `module_001` in exported reports and copied summaries."
          label="Anonymize resource names in exports"
          onChange={(checked) =>
            onSettingsChange({
              ...settings,
              anonymizeResourceNamesInExports: checked,
            })
          }
        />
        <SettingToggle
          checked={settings.maskCloudAccountIdsInExports}
          description="Masks account-like identifiers in exported or copied content."
          label="Mask cloud account IDs in exports"
          onChange={(checked) =>
            onSettingsChange({
              ...settings,
              maskCloudAccountIdsInExports: checked,
            })
          }
        />
        <SettingToggle
          checked={settings.maskIpAddressesInExports}
          description="Masks IPv4 addresses in copied and exported content."
          label="Mask IP addresses in exports"
          onChange={(checked) =>
            onSettingsChange({
              ...settings,
              maskIpAddressesInExports: checked,
            })
          }
        />
        <SettingToggle
          checked={settings.maskDomainNamesInExports}
          description="Masks domain names in copied and exported content."
          label="Mask domain names in exports"
          onChange={(checked) =>
            onSettingsChange({
              ...settings,
              maskDomainNamesInExports: checked,
            })
          }
        />
      </div>

      <ExportTrustNote />

      {previewVisible ? (
        <div className="border-border bg-background mt-4 rounded-lg border p-4">
          {!previewBundle ? (
            <p className="text-muted-foreground text-sm leading-7">
              Analyze a Terraform plan to preview redacted report output.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <PreviewToggle
                    active={previewFormat === "markdown"}
                    label="Markdown"
                    onClick={() => setPreviewFormat("markdown")}
                  />
                  <PreviewToggle
                    active={previewFormat === "html"}
                    label="HTML"
                    onClick={() => setPreviewFormat("html")}
                  />
                  <PreviewToggle
                    active={previewFormat === "json"}
                    label="JSON"
                    onClick={() => setPreviewFormat("json")}
                  />
                </div>

                <button
                  type="button"
                  className={cn(
                    "inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    copyState === "copied" &&
                      "border-positive bg-positive-soft text-positive",
                    copyState === "error" &&
                      "border-critical bg-critical-soft text-critical",
                    copyState === "idle" &&
                      "border-border bg-surface text-foreground hover:bg-surface-muted",
                  )}
                  onClick={async () => {
                    const copied = await copyText(activePreview);

                    setCopyState(copied ? "copied" : "error");
                  }}
                >
                  {copyState === "copied"
                    ? `Copied ${previewFormat}`
                    : copyState === "error"
                      ? "Copy failed"
                      : `Copy ${previewFormat}`}
                </button>
              </div>

              <pre className="border-border bg-surface max-h-[30rem] overflow-auto rounded-lg border p-4 text-xs leading-6 whitespace-pre-wrap text-foreground">
                {activePreview}
              </pre>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
