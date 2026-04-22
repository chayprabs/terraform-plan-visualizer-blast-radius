import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type {
  NormalizedOutputChange,
  NormalizedPlan,
  NormalizedResourceChange,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";

export type RiskSeverity = "critical" | "high" | "medium" | "low" | "info";

export type RiskCategory =
  | "destructive"
  | "replacement"
  | "iam"
  | "network"
  | "database"
  | "storage"
  | "secrets"
  | "encryption"
  | "public_access"
  | "cost"
  | "reliability"
  | "unknowns"
  | "outputs"
  | "provider"
  | "module";

export type PlanRiskLevel = "low" | "medium" | "high" | "critical";

export type RiskActionKind = ChangeActionKind | "plan";

export interface RiskFinding {
  id: string;
  severity: RiskSeverity;
  category: RiskCategory;
  title: string;
  explanation: string;
  resourceAddress?: string;
  resourceType?: string;
  actionKind: RiskActionKind;
  evidence: string[];
  suggestion: string;
  confidence: number;
  tags: string[];
}

export interface ResourceRiskSummary {
  resourceAddress: string;
  resourceType: string;
  actionKind: ChangeActionKind;
  findings: RiskFinding[];
  highestSeverity: RiskSeverity | null;
  score: number;
  tags: string[];
}

export interface PlanRiskScoreContribution {
  findingId: string;
  title: string;
  severity: RiskSeverity;
  points: number;
}

export interface PlanRiskReport {
  findings: RiskFinding[];
  resourceSummaries: ResourceRiskSummary[];
  highestSeverity: RiskSeverity | null;
  highRiskFindingCount: number;
  level: PlanRiskLevel;
  score: number;
  scoreBreakdown: PlanRiskScoreContribution[];
}

export interface ResourceRiskRule {
  id: string;
  evaluate: (resourceChange: NormalizedResourceChange) => RiskFinding[];
}

export interface PlanRiskRule {
  id: string;
  evaluate: (
    normalizedPlan: NormalizedPlan,
    resourceSummaries: ResourceRiskSummary[],
    outputChanges: NormalizedOutputChange[],
  ) => RiskFinding[];
}
