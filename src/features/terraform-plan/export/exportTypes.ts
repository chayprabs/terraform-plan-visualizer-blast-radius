import type { BlastRadiusAnalysis } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";
import type {
  CostEstimateSource,
  CostThresholds,
} from "@/features/terraform-plan/cost/costTypes";
import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type {
  ModuleSummary,
  NormalizedPlan,
  PlanSummary,
  ProviderSummary,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type { TerraformPlanRedactionSettings } from "@/features/terraform-plan/privacy/redactionTypes";
import type {
  PlanRiskLevel,
  RiskActionKind,
  RiskCategory,
  RiskSeverity,
} from "@/features/terraform-plan/risk/riskTypes";

export const TERRAFORM_PLAN_EXPORT_SCHEMA_VERSION = "1.1.0";
export const TERRAFORM_PLAN_EXPORT_TITLE = "Terraform Plan Analysis Report";

export interface TerraformPlanExportInput {
  blastRadiusAnalysis?: BlastRadiusAnalysis | null;
  generatedAt?: string;
  normalizedPlan: NormalizedPlan;
  settings?: TerraformPlanRedactionSettings;
  sourceName?: string;
}

export interface TerraformPlanExportPrivacy {
  appliedRedactions: string[];
  note: string;
  redacted: true;
  settings: TerraformPlanRedactionSettings;
}

export interface TerraformPlanExportSource {
  formatVersion: string;
  generatedAt: string;
  name: string;
  planTimestamp: string | null;
  terraformVersion: string | null;
}

export interface TerraformPlanExportRiskSummary {
  highRiskFindingCount: number;
  highestSeverity: RiskSeverity | null;
  level: PlanRiskLevel;
  score: number;
  totalFindings: number;
}

export interface TerraformPlanExportFinding {
  actionKind: RiskActionKind;
  category: RiskCategory;
  confidence: number;
  evidence: string[];
  explanation: string;
  id: string;
  resourceAddress: string | null;
  resourceType: string | null;
  severity: RiskSeverity;
  suggestion: string;
  title: string;
}

export interface TerraformPlanExportResourceChange {
  action: ChangeActionKind;
  address: string;
  highestSeverity: RiskSeverity | null;
  isDestructive: boolean;
  module: string;
  provider: string;
  replacePaths: string[];
  riskScore: number;
  type: string;
}

export interface TerraformPlanExportProviderSummary {
  destructiveCount: number;
  providerName: string;
  resourceCount: number;
  resourceTypes: string[];
  shortName: string;
}

export interface TerraformPlanExportModuleSummary {
  address: string;
  depth: number;
  destructiveCount: number;
  path: string[];
  resourceCount: number;
}

export interface TerraformPlanExportBlastRadius {
  dependencyCaveat: string | null;
  directChangesCount: number;
  downstreamDependentsCount: number;
  focusResource: string;
  highRiskResources: string[];
  overallRisk: RiskSeverity | "none";
  reviewerChecklist: string[];
  totalResourcesInRadius: number;
}

export interface TerraformPlanExportCostEntry {
  address: string | null;
  currency: string;
  monthlyCostAfter: number | null;
  monthlyCostBefore: number | null;
  monthlyDelta: number | null;
  name: string | null;
  source: CostEstimateSource;
}

export interface TerraformPlanExportCostImpact {
  currency: string;
  hasMappedResources: boolean;
  importedEntryCount: number;
  manualEntryCount: number;
  mappedResourceCount: number;
  note: string | null;
  resourceEntries: TerraformPlanExportCostEntry[];
  source: CostEstimateSource;
  thresholds: CostThresholds;
  totalMonthlyCostAfter: number | null;
  totalMonthlyCostBefore: number | null;
  totalMonthlyDelta: number | null;
}

export interface TerraformPlanExportData {
  blastRadius: TerraformPlanExportBlastRadius | null;
  costImpact?: TerraformPlanExportCostImpact;
  destructiveChanges: TerraformPlanExportResourceChange[];
  findings: TerraformPlanExportFinding[];
  modules: TerraformPlanExportModuleSummary[];
  overallRisk: TerraformPlanExportRiskSummary;
  privacy: TerraformPlanExportPrivacy;
  providers: TerraformPlanExportProviderSummary[];
  replacements: TerraformPlanExportResourceChange[];
  reviewerChecklist: string[];
  schemaVersion: string;
  source: TerraformPlanExportSource;
  summary: PlanSummary;
  title: string;
  topFindings: TerraformPlanExportFinding[];
}

export interface TerraformPlanExportShape {
  blastRadiusAnalysis?: BlastRadiusAnalysis | null;
  normalizedPlan: NormalizedPlan;
  providers: ProviderSummary[];
  settings: TerraformPlanRedactionSettings;
  sourceName?: string;
  summary: PlanSummary;
  modules: ModuleSummary[];
}
