import type { RiskFinding } from "@/features/terraform-plan/risk/riskTypes";
import {
  getRiskActionLabel,
  getRiskCategoryLabel,
  getRiskSeverityLabel,
} from "@/features/terraform-plan/risk/riskCopy";

const SENSITIVE_VALUE_PATTERN =
  /(password|secret|token|credential|private[_-]?key|client[_-]?secret|access[_-]?key)/i;

export function redactFindingEvidenceLine(
  line: string,
  forceRedaction: boolean,
): string {
  if (!forceRedaction && !SENSITIVE_VALUE_PATTERN.test(line)) {
    return line;
  }

  if (/\[redacted\]/i.test(line)) {
    return line;
  }

  if (/[=:]/.test(line)) {
    return line.replace(/([=:]\s*).+$/, "$1[redacted]");
  }

  return line
    .replace(/"[^"]+"/g, '"[redacted]"')
    .replace(/'[^']+'/g, "'[redacted]'");
}

export function getSafeFindingEvidence(finding: RiskFinding): string[] {
  return finding.evidence.map((line) =>
    redactFindingEvidenceLine(line, finding.category === "secrets"),
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
