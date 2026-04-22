import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type {
  TerraformImporting,
  TerraformOutputChange,
  TerraformPlan,
  TerraformReplacePath,
  TerraformResourceChange,
} from "@/features/terraform-plan/domain/terraformPlanTypes";
import type { ResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import type {
  PlanRiskReport,
  ResourceRiskSummary,
} from "@/features/terraform-plan/risk/riskTypes";

export interface PlanSummary {
  totalResourceChanges: number;
  totalOutputChanges: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
  replaceCount: number;
  noOpCount: number;
  readCount: number;
  importCount: number;
  forgetCount: number;
  unknownCount: number;
  highRiskCount: number;
}

export interface ProviderSummary {
  providerName: string;
  shortName: string;
  resourceCount: number;
  resourceTypes: string[];
  actionCounts: Partial<Record<ChangeActionKind, number>>;
}

export interface ModuleSummary {
  addressPrefix: string;
  path: string[];
  depth: number;
  resourceCount: number;
  actionCounts: Partial<Record<ChangeActionKind, number>>;
}

export interface ResourceTypeGroupSummary {
  group: ResourceTypeGroup;
  resourceCount: number;
  resourceTypes: string[];
  actionCounts: Partial<Record<ChangeActionKind, number>>;
}

export interface NormalizedResourceChange {
  address: string;
  previousAddress?: string | null;
  moduleAddress?: string | null;
  modulePath: string[];
  mode: string;
  type: string;
  typeGroup: ResourceTypeGroup;
  name: string;
  index?: number | string | null;
  providerName?: string;
  providerShortName: string;
  deposed?: string | null;
  action: ChangeActionKind;
  rawActions: string[];
  before?: unknown;
  after?: unknown;
  afterUnknown?: unknown;
  beforeSensitive?: unknown;
  afterSensitive?: unknown;
  replacePaths: TerraformReplacePath[];
  importing?: TerraformImporting | null;
  generatedConfig?: string | null;
  isDestructive: boolean;
  isHighRisk: boolean;
  riskSummary?: ResourceRiskSummary;
  raw: TerraformResourceChange;
}

export interface NormalizedOutputChange {
  name: string;
  action: ChangeActionKind;
  rawActions: string[];
  before?: unknown;
  after?: unknown;
  afterUnknown?: unknown;
  beforeSensitive?: unknown;
  afterSensitive?: unknown;
  isSensitive: boolean;
  raw: TerraformOutputChange;
}

export interface NormalizedPlan {
  formatVersion: string;
  terraformVersion?: string;
  timestamp?: string;
  summary: PlanSummary;
  resourceChanges: NormalizedResourceChange[];
  outputChanges: NormalizedOutputChange[];
  providers: ProviderSummary[];
  modules: ModuleSummary[];
  resourceTypeGroups: ResourceTypeGroupSummary[];
  riskReport?: PlanRiskReport;
  raw: TerraformPlan;
}

export function getModulePath(address: string): string[] {
  const matches = address.matchAll(/(?:^|\.)module\.([^.]+)/g);

  return Array.from(matches, (match) => match[1]).filter(Boolean);
}

export function createEmptyPlanSummary(): PlanSummary {
  return {
    totalResourceChanges: 0,
    totalOutputChanges: 0,
    createCount: 0,
    updateCount: 0,
    deleteCount: 0,
    replaceCount: 0,
    noOpCount: 0,
    readCount: 0,
    importCount: 0,
    forgetCount: 0,
    unknownCount: 0,
    highRiskCount: 0,
  };
}
