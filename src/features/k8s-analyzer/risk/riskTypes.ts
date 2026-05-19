import type { ParsedK8sManifest } from "@/features/k8s-analyzer/domain/manifestTypes";

export type ManifestRiskSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export type ManifestRiskCategory =
  | "image"
  | "resources"
  | "security_context"
  | "volumes"
  | "rbac"
  | "api_version"
  | "rollout"
  | "general";

export type ManifestRiskLevel = "low" | "medium" | "high" | "critical";

export interface ManifestRiskFinding {
  id: string;
  severity: ManifestRiskSeverity;
  category: ManifestRiskCategory;
  title: string;
  explanation: string;
  manifestRef: string;
  kind?: string;
  name?: string;
  namespace?: string;
  evidence: string[];
  suggestion: string;
}

export interface ManifestRiskReport {
  findings: ManifestRiskFinding[];
  highestSeverity: ManifestRiskSeverity | null;
  highRiskFindingCount: number;
  level: ManifestRiskLevel;
  score: number;
}

export interface ManifestRiskRuleContext {
  manifest: ParsedK8sManifest;
  manifestRef: string;
}

export interface ManifestRiskRule {
  id: string;
  evaluate: (context: ManifestRiskRuleContext) => ManifestRiskFinding[];
}
