import {
  formatCostThresholdSummary,
  formatCurrencyAmount,
  formatMonthlyDelta,
} from "@/features/terraform-plan/cost/costUtils";
import { getRiskActionLabel, getRiskCategoryLabel, getRiskSeverityLabel } from "@/features/terraform-plan/risk/riskCopy";
import type {
  TerraformPlanExportCostImpact,
  TerraformPlanExportData,
  TerraformPlanExportFinding,
  TerraformPlanExportResourceChange,
} from "@/features/terraform-plan/export/exportTypes";
import { formatMarkdownTable } from "@/lib/shared/export/markdownTable";

function formatMaybeValue(value: string | null): string {
  return value ?? "unknown";
}

function formatSeverity(severity: string | null): string {
  return severity ? getRiskSeverityLabel(severity as Parameters<typeof getRiskSeverityLabel>[0]) : "None";
}

function formatCostSource(source: TerraformPlanExportCostImpact["source"]): string {
  switch (source) {
    case "infracost":
      return "Imported Infracost JSON";
    case "manual":
      return "Manual estimate";
    case "mixed":
    default:
      return "Imported + manual estimate";
  }
}

function formatFinding(finding: TerraformPlanExportFinding, index: number): string[] {
  return [
    `${index}. **${finding.title}** (${formatSeverity(finding.severity)} | ${getRiskCategoryLabel(finding.category)} | ${getRiskActionLabel(finding.actionKind)})`,
    `Resource: \`${finding.resourceAddress ?? "plan-wide"}\``,
    `Why it matters: ${finding.explanation}`,
    `Evidence: ${finding.evidence.join(" ") || "No supporting evidence included."}`,
    `Suggested review: ${finding.suggestion}`,
  ];
}

function formatResourceList(
  resources: TerraformPlanExportResourceChange[],
  emptyLabel: string,
): string[] {
  if (resources.length === 0) {
    return [`- ${emptyLabel}`];
  }

  return formatMarkdownTable([
    ["Action", "Resource", "Type", "Provider", "Module", "Risk", "Replace paths"],
    ...resources.map((resource) => [
      getRiskActionLabel(resource.action),
      `\`${resource.address}\``,
      resource.type,
      resource.provider,
      resource.module,
      formatSeverity(resource.highestSeverity),
      resource.replacePaths.join(", ") || "n/a",
    ]),
  ]);
}

export function buildMarkdownReport(exportData: TerraformPlanExportData): string {
  const lines = [
    `# ${exportData.title}`,
    "",
    `Generated: \`${exportData.source.generatedAt}\``,
    `Source: \`${exportData.source.name}\``,
    `Terraform version: \`${formatMaybeValue(exportData.source.terraformVersion)}\``,
    `Plan timestamp: \`${formatMaybeValue(exportData.source.planTimestamp)}\``,
    "",
    "## Privacy & Redaction",
    exportData.privacy.note,
    ...exportData.privacy.appliedRedactions.map((item) => `- ${item}`),
    "",
    "## Plan Summary",
    ...formatMarkdownTable([
      ["Metric", "Value"],
      ["Total resource changes", String(exportData.summary.totalResourceChanges)],
      ["Creates", String(exportData.summary.createCount)],
      ["Updates", String(exportData.summary.updateCount)],
      ["Deletes", String(exportData.summary.deleteCount)],
      ["Replacements", String(exportData.summary.replaceCount)],
      ["Imports", String(exportData.summary.importCount)],
      ["Output changes", String(exportData.summary.totalOutputChanges)],
    ]),
    "",
    "## Overall Risk Score",
    `- Score: **${exportData.overallRisk.score}/100**`,
    `- Level: **${exportData.overallRisk.level}**`,
    `- Highest severity: **${formatSeverity(exportData.overallRisk.highestSeverity)}**`,
    `- Critical/high findings: **${exportData.overallRisk.highRiskFindingCount}**`,
    `- Total findings: **${exportData.overallRisk.totalFindings}**`,
    "",
    ...(exportData.costImpact
      ? [
          "## Cost Impact",
          `- Source: **${formatCostSource(exportData.costImpact.source)}**`,
          `- Monthly delta: **${formatMonthlyDelta(
            exportData.costImpact.totalMonthlyDelta,
            exportData.costImpact.currency,
          )}**`,
          `- Monthly cost before: **${formatCurrencyAmount(
            exportData.costImpact.totalMonthlyCostBefore,
            exportData.costImpact.currency,
          )}**`,
          `- Monthly cost after: **${formatCurrencyAmount(
            exportData.costImpact.totalMonthlyCostAfter,
            exportData.costImpact.currency,
          )}**`,
          `- Mapped resources: **${exportData.costImpact.mappedResourceCount}**`,
          `- Thresholds: ${formatCostThresholdSummary(
            exportData.costImpact.thresholds,
            exportData.costImpact.currency,
          )}`,
          ...(exportData.costImpact.note
            ? [`- Reviewer note: ${exportData.costImpact.note}`]
            : []),
          "",
          ...(exportData.costImpact.resourceEntries.length > 0
            ? formatMarkdownTable([
                ["Resource", "Delta/mo", "Before/mo", "After/mo", "Source"],
                ...exportData.costImpact.resourceEntries.map((entry) => [
                  `\`${entry.address ?? entry.name ?? "unmapped"}\``,
                  formatMonthlyDelta(entry.monthlyDelta, entry.currency),
                  formatCurrencyAmount(entry.monthlyCostBefore, entry.currency),
                  formatCurrencyAmount(entry.monthlyCostAfter, entry.currency),
                  formatCostSource(entry.source),
                ]),
              ])
            : ["No per-resource cost mappings were attached."]),
          "",
        ]
      : []),
    "## Top Findings",
    ...(exportData.topFindings.length > 0
      ? exportData.topFindings.flatMap((finding, index) => [
          ...formatFinding(finding, index + 1),
          "",
        ])
      : ["No critical or high-severity findings were included in this report.", ""]),
    "## Destructive Changes",
    ...formatResourceList(
      exportData.destructiveChanges,
      "No destructive changes were identified.",
    ),
    "",
    "## Replacements",
    ...formatResourceList(exportData.replacements, "No replacements were identified."),
    "",
    "## Provider Summary",
    ...formatMarkdownTable([
      ["Provider", "Resources", "Destructive", "Resource types"],
      ...exportData.providers.map((provider) => [
        provider.shortName,
        String(provider.resourceCount),
        String(provider.destructiveCount),
        provider.resourceTypes.join(", ") || "n/a",
      ]),
    ]),
    "",
    "## Module Summary",
    ...formatMarkdownTable([
      ["Module", "Depth", "Resources", "Destructive"],
      ...exportData.modules.map((module) => [
        module.address,
        String(module.depth),
        String(module.resourceCount),
        String(module.destructiveCount),
      ]),
    ]),
  ];

  if (exportData.blastRadius) {
    lines.push(
      "",
      "## Blast-Radius Summary",
      `- Focus resource: \`${exportData.blastRadius.focusResource}\``,
      `- Overall risk: **${formatSeverity(exportData.blastRadius.overallRisk === "none" ? null : exportData.blastRadius.overallRisk)}**`,
      `- Direct changes in radius: **${exportData.blastRadius.directChangesCount}**`,
      `- Downstream dependents: **${exportData.blastRadius.downstreamDependentsCount}**`,
      `- Total resources in radius: **${exportData.blastRadius.totalResourcesInRadius}**`,
      `- High-risk resources: ${exportData.blastRadius.highRiskResources.map((resource) => `\`${resource}\``).join(", ") || "none"}`,
    );

    if (exportData.blastRadius.dependencyCaveat) {
      lines.push(`- Dependency caveat: ${exportData.blastRadius.dependencyCaveat}`);
    }
  }

  lines.push(
    "",
    "## Reviewer Checklist",
    ...exportData.reviewerChecklist.map((item) => `- [ ] ${item}`),
  );

  return lines.join("\n").trim();
}
