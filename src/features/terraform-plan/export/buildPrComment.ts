import {
  formatCurrencyAmount,
  formatMonthlyDelta,
} from "@/features/terraform-plan/cost/costUtils";
import { getRiskCategoryLabel, getRiskSeverityLabel } from "@/features/terraform-plan/risk/riskCopy";
import type { TerraformPlanExportData } from "@/features/terraform-plan/export/exportTypes";

function formatSeverity(severity: string | null): string {
  return severity ? getRiskSeverityLabel(severity as Parameters<typeof getRiskSeverityLabel>[0]) : "None";
}

export function buildPrComment(exportData: TerraformPlanExportData): string {
  const topFindings =
    exportData.topFindings.length > 0
      ? exportData.topFindings
          .map(
            (finding) =>
              `- **${formatSeverity(finding.severity)}** ${finding.title} (${getRiskCategoryLabel(finding.category)})${finding.resourceAddress ? ` - \`${finding.resourceAddress}\`` : ""}`,
          )
          .join("\n")
      : "- No critical or high-severity findings were included.";
  const destructiveChanges =
    exportData.destructiveChanges.length > 0
      ? exportData.destructiveChanges
          .slice(0, 6)
          .map(
            (resource) =>
              `- ${resource.action} \`${resource.address}\` (${resource.type}, ${resource.provider})`,
          )
          .join("\n")
      : "- No destructive changes.";
  const reviewerChecklist = exportData.reviewerChecklist
    .slice(0, 5)
    .map((item) => `- [ ] ${item}`)
    .join("\n");
  const costDetails = exportData.costImpact
    ? [
        "",
        "**Cost impact**",
        `- Monthly delta: ${formatMonthlyDelta(
          exportData.costImpact.totalMonthlyDelta,
          exportData.costImpact.currency,
        )}`,
        `- Monthly cost before: ${formatCurrencyAmount(
          exportData.costImpact.totalMonthlyCostBefore,
          exportData.costImpact.currency,
        )}`,
        `- Monthly cost after: ${formatCurrencyAmount(
          exportData.costImpact.totalMonthlyCostAfter,
          exportData.costImpact.currency,
        )}`,
        `- Mapped resources: ${exportData.costImpact.mappedResourceCount}`,
        exportData.costImpact.note
          ? `- Reviewer note: ${exportData.costImpact.note}`
          : null,
      ]
        .filter((entry): entry is string => Boolean(entry))
        .join("\n")
    : "";
  const blastRadiusDetails = exportData.blastRadius
    ? [
        "",
        "**Blast radius**",
        `- Focus: \`${exportData.blastRadius.focusResource}\``,
        `- Direct changes: ${exportData.blastRadius.directChangesCount}`,
        `- Downstream dependents: ${exportData.blastRadius.downstreamDependentsCount}`,
        `- Overall risk: ${formatSeverity(exportData.blastRadius.overallRisk === "none" ? null : exportData.blastRadius.overallRisk)}`,
      ].join("\n")
    : "";

  return [
    "### Terraform plan analysis",
    "",
    `- Risk: **${exportData.overallRisk.level}** (${exportData.overallRisk.score}/100, highest severity ${formatSeverity(exportData.overallRisk.highestSeverity)})`,
    `- Resource changes: **${exportData.summary.totalResourceChanges}**`,
    `- Creates/updates/deletes/replacements: **${exportData.summary.createCount}/${exportData.summary.updateCount}/${exportData.summary.deleteCount}/${exportData.summary.replaceCount}**`,
    `- Critical/high findings: **${exportData.overallRisk.highRiskFindingCount}**`,
    ...(exportData.costImpact
      ? [
          `- Monthly cost delta: **${formatMonthlyDelta(
            exportData.costImpact.totalMonthlyDelta,
            exportData.costImpact.currency,
          )}**`,
        ]
      : []),
    `- Redaction: **enabled by default**`,
    "",
    "**Top findings**",
    topFindings,
    "",
    "<details>",
    "<summary>Review details</summary>",
    "",
    "**Destructive changes**",
    destructiveChanges,
    costDetails,
    blastRadiusDetails,
    "",
    "**Reviewer checklist**",
    reviewerChecklist,
    "",
    "</details>",
  ]
    .join("\n")
    .trim();
}
