import { normalizeAction } from "@/features/terraform-plan/domain/actionTypes";
import {
  createEmptyPlanSummary,
  getModulePath,
  type ModuleSummary,
  type NormalizedOutputChange,
  type NormalizedPlan,
  type NormalizedResourceChange,
  type ProviderSummary,
  type ResourceTypeGroupSummary,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { buildPlanSummary } from "@/features/terraform-plan/domain/planSummary";
import {
  getProviderShortName,
  getResourceTypeGroup,
} from "@/features/terraform-plan/domain/providerTypes";
import { evaluatePlanRisk, evaluateResourceRisk } from "@/features/terraform-plan/risk/evaluateRisk";
import { isHighSeverity } from "@/features/terraform-plan/risk/riskCopy";
import type {
  TerraformLooseObject,
  TerraformOutputChange,
  TerraformPlan,
  TerraformResourceChange,
} from "@/features/terraform-plan/domain/terraformPlanTypes";

type ActionCounter = Partial<
  Record<
    NormalizedResourceChange["action"] | NormalizedOutputChange["action"],
    number
  >
>;

function incrementActionCount(
  counts: ActionCounter,
  action: keyof ActionCounter,
): void {
  counts[action] = (counts[action] ?? 0) + 1;
}

function hasSensitiveValue(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasSensitiveValue(item));
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value as TerraformLooseObject).some((entry) =>
      hasSensitiveValue(entry),
    );
  }

  return false;
}

function normalizeResourceChange(
  change: TerraformResourceChange,
): NormalizedResourceChange {
  const action = normalizeAction(change.change.actions);
  const replacePaths = change.change.replace_paths ?? [];
  const modulePath = getModulePath(change.module_address ?? change.address);

  return {
    address: change.address,
    previousAddress: change.previous_address ?? null,
    moduleAddress: change.module_address ?? null,
    modulePath,
    mode: change.mode ?? "managed",
    type: change.type ?? "unknown",
    typeGroup: getResourceTypeGroup(change.type),
    name: change.name,
    index: change.index ?? null,
    providerName: change.provider_name,
    providerShortName: getProviderShortName(change.provider_name),
    deposed: change.deposed ?? null,
    action,
    rawActions: [...change.change.actions],
    before: change.change.before,
    after: change.change.after,
    afterUnknown: change.change.after_unknown,
    beforeSensitive: change.change.before_sensitive,
    afterSensitive: change.change.after_sensitive,
    replacePaths,
    importing: change.change.importing ?? null,
    generatedConfig: change.change.generated_config ?? null,
    isDestructive: action === "delete" || action === "replace",
    isHighRisk: false,
    riskSummary: undefined,
    raw: change,
  };
}

function normalizeOutputChange(
  name: string,
  change: TerraformOutputChange,
): NormalizedOutputChange {
  const rawActions = change.actions ?? [];

  return {
    name,
    action: normalizeAction(rawActions),
    rawActions: [...rawActions],
    before: change.before,
    after: change.after,
    afterUnknown: change.after_unknown,
    beforeSensitive: change.before_sensitive,
    afterSensitive: change.after_sensitive,
    isSensitive:
      hasSensitiveValue(change.before_sensitive) ||
      hasSensitiveValue(change.after_sensitive),
    raw: change,
  };
}

function buildProviderSummaries(
  resourceChanges: NormalizedResourceChange[],
): ProviderSummary[] {
  const providerMap = new Map<
    string,
    {
      providerName: string;
      shortName: string;
      resourceCount: number;
      resourceTypes: Set<string>;
      actionCounts: ActionCounter;
    }
  >();

  for (const change of resourceChanges) {
    const providerName = change.providerName ?? "unknown";
    const existing =
      providerMap.get(providerName) ??
      {
        providerName,
        shortName: change.providerShortName,
        resourceCount: 0,
        resourceTypes: new Set<string>(),
        actionCounts: {},
      };

    existing.resourceCount += 1;
    existing.resourceTypes.add(change.type);
    incrementActionCount(existing.actionCounts, change.action);
    providerMap.set(providerName, existing);
  }

  return Array.from(providerMap.values())
    .sort(
      (left, right) =>
        left.shortName.localeCompare(right.shortName) ||
        left.providerName.localeCompare(right.providerName),
    )
    .map((summary) => ({
      providerName: summary.providerName,
      shortName: summary.shortName,
      resourceCount: summary.resourceCount,
      resourceTypes: Array.from(summary.resourceTypes).sort(),
      actionCounts: summary.actionCounts,
    }));
}

function buildModuleSummaries(
  resourceChanges: NormalizedResourceChange[],
): ModuleSummary[] {
  const moduleMap = new Map<
    string,
    {
      addressPrefix: string;
      path: string[];
      depth: number;
      resourceCount: number;
      actionCounts: ActionCounter;
    }
  >();

  for (const change of resourceChanges) {
    const addressPrefix =
      change.modulePath.length > 0
        ? change.modulePath.map((segment) => `module.${segment}`).join(".")
        : "root";
    const existing =
      moduleMap.get(addressPrefix) ??
      {
        addressPrefix,
        path: [...change.modulePath],
        depth: change.modulePath.length,
        resourceCount: 0,
        actionCounts: {},
      };

    existing.resourceCount += 1;
    incrementActionCount(existing.actionCounts, change.action);
    moduleMap.set(addressPrefix, existing);
  }

  return Array.from(moduleMap.values())
    .sort(
      (left, right) =>
        left.depth - right.depth ||
        left.addressPrefix.localeCompare(right.addressPrefix),
    )
    .map((summary) => ({
      addressPrefix: summary.addressPrefix,
      path: summary.path,
      depth: summary.depth,
      resourceCount: summary.resourceCount,
      actionCounts: summary.actionCounts,
    }));
}

function buildResourceTypeGroupSummaries(
  resourceChanges: NormalizedResourceChange[],
): ResourceTypeGroupSummary[] {
  const groupMap = new Map<
    string,
    {
      group: ResourceTypeGroupSummary["group"];
      resourceCount: number;
      resourceTypes: Set<string>;
      actionCounts: ActionCounter;
    }
  >();

  for (const change of resourceChanges) {
    const existing =
      groupMap.get(change.typeGroup) ??
      {
        group: change.typeGroup,
        resourceCount: 0,
        resourceTypes: new Set<string>(),
        actionCounts: {},
      };

    existing.resourceCount += 1;
    existing.resourceTypes.add(change.type);
    incrementActionCount(existing.actionCounts, change.action);
    groupMap.set(change.typeGroup, existing);
  }

  return Array.from(groupMap.values())
    .sort((left, right) => left.group.localeCompare(right.group))
    .map((summary) => ({
      group: summary.group,
      resourceCount: summary.resourceCount,
      resourceTypes: Array.from(summary.resourceTypes).sort(),
      actionCounts: summary.actionCounts,
    }));
}

export function normalizeTerraformPlan(plan: TerraformPlan): NormalizedPlan {
  const resourceChanges = (plan.resource_changes ?? [])
    .map((change) => normalizeResourceChange(change))
    .map((change) => {
      const riskSummary = evaluateResourceRisk(change);

      return {
        ...change,
        isHighRisk: riskSummary.findings.some((finding) =>
          isHighSeverity(finding.severity),
        ),
        riskSummary,
      };
    });
  const outputChanges = Object.entries(plan.output_changes ?? {})
    .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
    .map(([name, change]) => normalizeOutputChange(name, change));

  const normalizedPlanBase: NormalizedPlan = {
    formatVersion: plan.format_version,
    terraformVersion: plan.terraform_version,
    timestamp: plan.timestamp,
    summary: createEmptyPlanSummary(),
    resourceChanges,
    outputChanges,
    providers: buildProviderSummaries(resourceChanges),
    modules: buildModuleSummaries(resourceChanges),
    resourceTypeGroups: buildResourceTypeGroupSummaries(resourceChanges),
    riskReport: undefined,
    raw: plan,
  };
  const riskReport = evaluatePlanRisk(normalizedPlanBase);
  const normalizedPlanWithRisk: NormalizedPlan = {
    ...normalizedPlanBase,
    riskReport,
  };

  return {
    ...normalizedPlanWithRisk,
    summary: buildPlanSummary(normalizedPlanWithRisk),
  };
}
