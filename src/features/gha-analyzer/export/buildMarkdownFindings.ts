import type { WorkflowRiskFinding } from "@/features/gha-analyzer/risk/riskTypes";

const SEVERITY_LABELS: Record<WorkflowRiskFinding["severity"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

const CATEGORY_LABELS: Record<WorkflowRiskFinding["category"], string> = {
  permissions: "Permissions",
  triggers: "Triggers",
  supply_chain: "Supply chain",
  secrets: "Secrets",
  artifacts: "Artifacts",
  cache: "Cache",
};

function formatFindingSection(finding: WorkflowRiskFinding): string {
  const location =
    finding.jobId && finding.stepId
      ? `Job: ${finding.jobId}, Step: ${finding.stepId}`
      : finding.jobId
        ? `Job: ${finding.jobId}`
        : "Workflow-wide";

  return [
    `## ${finding.title}`,
    "",
    `- **Severity:** ${SEVERITY_LABELS[finding.severity]}`,
    `- **Category:** ${CATEGORY_LABELS[finding.category]}`,
    `- **Location:** ${location}`,
    "",
    finding.explanation,
    "",
    "**Evidence**",
    ...finding.evidence.map((line) => `- ${line}`),
    "",
    `**Suggestion:** ${finding.suggestion}`,
  ].join("\n");
}

export function buildMarkdownFindings(findings: WorkflowRiskFinding[]): string {
  if (findings.length === 0) {
    return [
      "# GitHub Actions workflow findings",
      "",
      "No security findings matched the current rules.",
    ].join("\n");
  }

  return [
    "# GitHub Actions workflow findings",
    "",
    `Total findings: ${findings.length}`,
    "",
    ...findings.flatMap((finding) => [formatFindingSection(finding), ""]),
  ]
    .join("\n")
    .trim();
}
