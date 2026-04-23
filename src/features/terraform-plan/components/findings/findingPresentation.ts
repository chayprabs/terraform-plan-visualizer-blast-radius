import type { RiskFinding } from "@/features/terraform-plan/risk/riskTypes";
import {
  getRiskActionLabel,
  getRiskCategoryLabel,
  getRiskSeverityLabel,
} from "@/features/terraform-plan/risk/riskCopy";
import { redactText } from "@/features/terraform-plan/privacy/redactTerraformPlan";
import {
  DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  type TerraformPlanRedactionSettings,
} from "@/features/terraform-plan/privacy/redactionTypes";

export function redactFindingEvidenceLine(
  line: string,
  settings: TerraformPlanRedactionSettings = DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
): string {
  return redactText(line, {
    scope: "display",
    settings,
  });
}

export function getSafeFindingEvidence(
  finding: RiskFinding,
  settings: TerraformPlanRedactionSettings = DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
): string[] {
  return finding.evidence.map((line) =>
    redactFindingEvidenceLine(line, settings),
  );
}

export function getFindingResourceLabel(finding: RiskFinding): string {
  return finding.resourceAddress ?? "Plan-wide finding";
}

export function formatFindingCopy(finding: RiskFinding, evidence: string[]): string {
  const lines = [
    `## ${finding.title}`,
    `Severity: ${getRiskSeverityLabel(finding.severity)}`,
    `Category: ${getRiskCategoryLabel(finding.category)}`,
    `Resource: ${getFindingResourceLabel(finding)}`,
    `Type: ${finding.resourceType ?? "n/a"}`,
    `Action: ${getRiskActionLabel(finding.actionKind)}`,
    "",
    finding.explanation,
    "",
    "Evidence:",
    ...evidence.map((line) => `- ${line}`),
    "",
    `Suggestion: ${finding.suggestion}`,
    `Confidence: ${Math.round(finding.confidence * 100)}%`,
  ];

  return lines.join("\n");
}
