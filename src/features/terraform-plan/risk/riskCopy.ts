import type {
  PlanRiskLevel,
  RiskActionKind,
  RiskCategory,
  RiskFinding,
  RiskSeverity,
} from "@/features/terraform-plan/risk/riskTypes";

export const RISK_SEVERITY_ORDER: RiskSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export const RISK_SEVERITY_LABELS: Record<RiskSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

export const RISK_SEVERITY_TOOLTIPS: Record<RiskSeverity, string> = {
  critical:
    "Review before apply. This change can destroy or recreate production-like infrastructure.",
  high: "Needs reviewer attention. Confirm the intended blast radius.",
  medium:
    "Review the affected resources before apply and confirm the change is intentional.",
  low: "Low-severity signal. Confirm the change still matches expectations.",
  info: "Informational context that may still help during plan review.",
};

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  destructive: "Destructive",
  replacement: "Replacement",
  iam: "IAM",
  network: "Network",
  database: "Database",
  storage: "Storage",
  secrets: "Secrets",
  encryption: "Encryption",
  public_access: "Public access",
  cost: "Cost",
  reliability: "Reliability",
  unknowns: "Unknowns",
  outputs: "Outputs",
  provider: "Provider",
  module: "Module",
};

export const RISK_CATEGORY_TOOLTIPS: Record<RiskCategory, string> = {
  destructive: "Findings about deletes or other destructive resource changes.",
  replacement:
    "Findings about destroy-and-recreate changes rather than in-place updates.",
  iam: "Findings related to identity, policy, role, or binding changes.",
  network:
    "Findings related to firewalls, security groups, routing, or network reachability.",
  database: "Findings related to database availability, state, or data durability.",
  storage: "Findings related to buckets, object storage, or storage access controls.",
  secrets: "Findings related to secrets, credentials, or secret-management resources.",
  encryption:
    "Findings related to keys, vaults, or encryption policy and configuration changes.",
  public_access:
    "Findings that may expose resources or data to broader network access.",
  cost: "Findings that may increase spend or resource footprint.",
  reliability:
    "Findings that may affect resilience, availability, or operational safety.",
  unknowns:
    "Findings raised because Terraform cannot fully resolve the post-apply state.",
  outputs: "Findings related to Terraform output value changes.",
  provider: "Findings related to provider configuration or provider metadata.",
  module: "Findings that describe module scope or module-level change patterns.",
};

export const RISK_ACTION_LABELS: Record<RiskActionKind, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
  replace: "Replace",
  "no-op": "No-op",
  read: "Read",
  import: "Import",
  forget: "Forget",
  unknown: "Unknown",
  plan: "Plan-wide",
};

export const RISK_ACTION_TOOLTIPS: Record<RiskActionKind, string> = {
  create: "Terraform will create this resource.",
  update: "Terraform will update this resource in place.",
  delete: "Terraform will destroy this resource.",
  replace: "Terraform will destroy and recreate this resource.",
  "no-op": "Terraform does not expect an infrastructure change for this object.",
  read: "Terraform will read or refresh this object without changing infrastructure.",
  import: "Terraform will attach an existing object to state.",
  forget: "Terraform will remove this object from state without destroying it.",
  unknown: "Terraform reported an action that could not be normalized confidently.",
  plan: "This finding applies to the overall Terraform plan rather than one resource.",
};

export const RISK_SEVERITY_SCORES: Record<RiskSeverity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 4,
  info: 2,
};

export function compareRiskSeverity(
  left: RiskSeverity,
  right: RiskSeverity,
): number {
  return RISK_SEVERITY_ORDER.indexOf(left) - RISK_SEVERITY_ORDER.indexOf(right);
}

export function getRiskSeverityLabel(severity: RiskSeverity): string {
  return RISK_SEVERITY_LABELS[severity];
}

export function getRiskSeverityTooltip(severity: RiskSeverity): string {
  return RISK_SEVERITY_TOOLTIPS[severity];
}

export function getRiskCategoryLabel(category: RiskCategory): string {
  return RISK_CATEGORY_LABELS[category];
}

export function getRiskCategoryTooltip(category: RiskCategory): string {
  return RISK_CATEGORY_TOOLTIPS[category];
}

export function getRiskActionLabel(actionKind: RiskActionKind): string {
  return RISK_ACTION_LABELS[actionKind];
}

export function getRiskActionTooltip(actionKind: RiskActionKind): string {
  return RISK_ACTION_TOOLTIPS[actionKind];
}

export function getHighestSeverityValue(
  severities: RiskSeverity[],
): RiskSeverity | null {
  if (severities.length === 0) {
    return null;
  }

  return [...severities].sort(compareRiskSeverity)[0] ?? null;
}

export function isHighSeverity(severity: RiskSeverity): boolean {
  return severity === "critical" || severity === "high";
}

export function getFindingScore(severity: RiskSeverity): number {
  return RISK_SEVERITY_SCORES[severity];
}

export function getPlanRiskLevel(
  score: number,
  highestSeverity: RiskSeverity | null,
): PlanRiskLevel {
  if (highestSeverity === "critical" || score >= 75) {
    return "critical";
  }

  if (highestSeverity === "high" || score >= 40) {
    return "high";
  }

  if (highestSeverity === "medium" || score >= 15) {
    return "medium";
  }

  return "low";
}

export function getModuleScopeLabel(moduleAddress?: string | null): string {
  return moduleAddress ? `Child module ${moduleAddress}` : "Root module";
}

export function getModuleTags(moduleAddress?: string | null): string[] {
  return moduleAddress ? ["child-module", moduleAddress] : ["root-module"];
}

export function getRiskLevelTone(level: PlanRiskLevel): "default" | "positive" | "warning" | "critical" {
  switch (level) {
    case "critical":
      return "critical";
    case "high":
    case "medium":
      return "warning";
    case "low":
    default:
      return "positive";
  }
}

export function createScoreBreakdown(findings: RiskFinding[]) {
  return findings.map((finding) => ({
    findingId: finding.id,
    title: finding.title,
    severity: finding.severity,
    points: getFindingScore(finding.severity),
  }));
}
