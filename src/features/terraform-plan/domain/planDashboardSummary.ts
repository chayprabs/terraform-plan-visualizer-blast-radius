import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type {
  ModuleSummary,
  NormalizedOutputChange,
  NormalizedPlan,
  PlanSummary,
  ProviderSummary,
  ResourceTypeGroupSummary,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type { ResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import type { PlanRiskLevel } from "@/features/terraform-plan/risk/riskTypes";

export interface SummaryMetricDefinition {
  description: string;
  key:
    | "creates"
    | "deletes"
    | "highRiskFindings"
    | "imports"
    | "noOps"
    | "reads"
    | "replacements"
    | "totalResourceChanges"
    | "updates";
  label: string;
  prominent?: boolean;
  tone: "default" | "positive" | "warning";
  tooltip: string;
  value: number;
}

export interface ProviderBreakdownRow {
  destructiveCount: number;
  providerShortName: string;
  resourceCount: number;
  resourceTypes: string[];
}

export interface ModuleBreakdownRow {
  depth: number;
  destructiveCount: number;
  label: string;
  resourceCount: number;
}

export interface ResourceTypeBreakdownRow {
  destructiveCount: number;
  group: ResourceTypeGroup;
  label: string;
  resourceCount: number;
  resourceTypes: string[];
}

export interface OutputChangeSummary {
  createdCount: number;
  deletedCount: number;
  sensitiveCount: number;
  totalCount: number;
  updatedCount: number;
}

export interface TerraformVersionSummary {
  formatVersion: string | null;
  terraformVersion: string | null;
}

export interface OverallRiskSummary {
  highRiskFindingCount: number;
  level: PlanRiskLevel;
  score: number;
  totalFindings: number;
}

const resourceTypeGroupOrder: ResourceTypeGroup[] = [
  "iam",
  "network",
  "database",
  "storage",
  "compute",
  "dns",
  "kms",
  "unknown",
];

function getActionCount(
  actionCounts: Partial<Record<ChangeActionKind, number>>,
  action: ChangeActionKind,
): number {
  return actionCounts[action] ?? 0;
}

function getResourceTypeGroupLabel(group: ResourceTypeGroup): string {
  switch (group) {
    case "iam":
      return "IAM";
    case "dns":
      return "DNS";
    case "kms":
      return "KMS";
    default:
      return group.charAt(0).toUpperCase() + group.slice(1);
  }
}

export function countDestructiveActions(
  actionCounts: Partial<Record<ChangeActionKind, number>>,
): number {
  return getActionCount(actionCounts, "delete") + getActionCount(actionCounts, "replace");
}

export function hasMeaningfulResourceChanges(summary: PlanSummary): boolean {
  return (
    summary.createCount +
      summary.updateCount +
      summary.deleteCount +
      summary.replaceCount +
      summary.importCount +
      summary.forgetCount +
      summary.unknownCount >
    0
  );
}

export function buildSummaryMetrics(
  normalizedPlan: NormalizedPlan,
): SummaryMetricDefinition[] {
  const summary = normalizedPlan.summary;
  const metrics: SummaryMetricDefinition[] = [
    {
      description:
        "Entries in Terraform resource_changes, including no-op and read records.",
      key: "totalResourceChanges",
      label: "Total resource changes",
      prominent: true,
      tone: "default",
      tooltip:
        "Terraform emits one resource_changes entry for each tracked resource in the plan, even if it will not change.",
      value: summary.totalResourceChanges,
    },
    {
      description: "Resources Terraform will add on apply.",
      key: "creates",
      label: "Creates",
      tone: "positive",
      tooltip:
        "Create means Terraform plans to add a new resource that does not exist in state yet.",
      value: summary.createCount,
    },
    {
      description: "Resources Terraform can change in place.",
      key: "updates",
      label: "Updates",
      tone: "default",
      tooltip:
        "Update means Terraform can modify the existing resource without replacing it.",
      value: summary.updateCount,
    },
    {
      description: "Resources Terraform will destroy outright.",
      key: "deletes",
      label: "Deletes",
      tone: "warning",
      tooltip:
        "Delete means Terraform plans to remove the current resource from infrastructure.",
      value: summary.deleteCount,
    },
    {
      description: "Resources Terraform must destroy and recreate.",
      key: "replacements",
      label: "Replacements",
      tone: "warning",
      tooltip:
        "Replace means Terraform needs a delete-and-create sequence because the change cannot be applied in place.",
      value: summary.replaceCount,
    },
    {
      description:
        "Critical and high-severity findings produced by deterministic risk rules.",
      key: "highRiskFindings",
      label: "High-risk findings",
      tone:
        (normalizedPlan.riskReport?.highRiskFindingCount ?? summary.highRiskCount) > 0
          ? "warning"
          : "default",
      tooltip:
        "This count reflects critical and high-severity findings from the built-in deterministic risk engine.",
      value:
        normalizedPlan.riskReport?.highRiskFindingCount ?? summary.highRiskCount,
    },
    {
      description: "Refresh-only reads that do not modify infrastructure.",
      key: "reads",
      label: "Reads",
      tone: "default",
      tooltip:
        "Read means Terraform refreshes information from the provider without planning a change.",
      value: summary.readCount,
    },
    {
      description: "Resources imported into state by the plan.",
      key: "imports",
      label: "Imports",
      tone: "default",
      tooltip:
        "Import means Terraform plans to bring an existing external resource under state management.",
      value: summary.importCount,
    },
    {
      description: "Resources already aligned with state.",
      key: "noOps",
      label: "No-ops",
      tone: "default",
      tooltip:
        "No-op means Terraform inspected the resource and found no infrastructure change to apply.",
      value: summary.noOpCount,
    },
  ];

  return metrics.filter(
    (metric) =>
      !["reads", "imports", "noOps"].includes(metric.key) || metric.value > 0,
  );
}

export function buildProviderBreakdownRows(
  providers: ProviderSummary[],
): ProviderBreakdownRow[] {
  return providers.map((provider) => ({
    destructiveCount: countDestructiveActions(provider.actionCounts),
    providerShortName: provider.shortName,
    resourceCount: provider.resourceCount,
    resourceTypes: provider.resourceTypes,
  }));
}

export function buildModuleBreakdownRows(
  modules: ModuleSummary[],
): ModuleBreakdownRow[] {
  return modules.map((module) => ({
    depth: module.depth,
    destructiveCount: countDestructiveActions(module.actionCounts),
    label: module.addressPrefix === "root" ? "Root module" : module.addressPrefix,
    resourceCount: module.resourceCount,
  }));
}

export function buildResourceTypeBreakdownRows(
  resourceTypeGroups: ResourceTypeGroupSummary[],
): ResourceTypeBreakdownRow[] {
  const groupMap = new Map(resourceTypeGroups.map((group) => [group.group, group]));

  return resourceTypeGroupOrder.map((group) => {
    const existing = groupMap.get(group);

    return {
      destructiveCount: existing
        ? countDestructiveActions(existing.actionCounts)
        : 0,
      group,
      label: getResourceTypeGroupLabel(group),
      resourceCount: existing?.resourceCount ?? 0,
      resourceTypes: existing?.resourceTypes ?? [],
    };
  });
}

export function buildOutputChangeSummary(
  outputChanges: NormalizedOutputChange[],
): OutputChangeSummary {
  const summary: OutputChangeSummary = {
    createdCount: 0,
    deletedCount: 0,
    sensitiveCount: 0,
    totalCount: outputChanges.length,
    updatedCount: 0,
  };

  for (const outputChange of outputChanges) {
    if (outputChange.isSensitive) {
      summary.sensitiveCount += 1;
    }

    switch (outputChange.action) {
      case "create":
        summary.createdCount += 1;
        break;
      case "delete":
        summary.deletedCount += 1;
        break;
      case "replace":
      case "update":
        summary.updatedCount += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

export function buildTerraformVersionSummary(
  normalizedPlan: NormalizedPlan,
): TerraformVersionSummary {
  return {
    formatVersion: normalizedPlan.formatVersion || null,
    terraformVersion: normalizedPlan.terraformVersion ?? null,
  };
}

export function buildOverallRiskSummary(
  normalizedPlan: NormalizedPlan,
): OverallRiskSummary {
  return {
    highRiskFindingCount: normalizedPlan.riskReport?.highRiskFindingCount ?? 0,
    level: normalizedPlan.riskReport?.level ?? "low",
    score: normalizedPlan.riskReport?.score ?? 0,
    totalFindings: normalizedPlan.riskReport?.findings.length ?? 0,
  };
}
