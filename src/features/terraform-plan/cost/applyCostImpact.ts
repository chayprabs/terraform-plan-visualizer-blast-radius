import { buildPlanSummary } from "@/features/terraform-plan/domain/planSummary";
import type {
  NormalizedPlan,
  NormalizedResourceChange,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { evaluatePlanRisk, evaluateResourceRisk } from "@/features/terraform-plan/risk/evaluateRisk";
import {
  COST_ESTIMATE_NOT_PROVIDED_NOTE,
  DEFAULT_COST_CURRENCY,
  type CostImpactState,
  type CostEstimateSource,
  type ManualCostEntry,
  type PlanCostEstimate,
  type ResourceCostEstimate,
} from "@/features/terraform-plan/cost/costTypes";

function sumNullable(left: number | null, right: number | null): number | null {
  if (left === null && right === null) {
    return null;
  }

  return (left ?? 0) + (right ?? 0);
}

function resolveCostNote(state: CostImpactState): string | null {
  if (state.noteMode === "not-provided") {
    return COST_ESTIMATE_NOT_PROVIDED_NOTE;
  }

  if (state.noteMode === "custom") {
    return state.customNote.trim() || null;
  }

  return null;
}

function getCostSource(
  hasImportedReport: boolean,
  manualEntries: ManualCostEntry[],
): CostEstimateSource {
  if (hasImportedReport && manualEntries.length > 0) {
    return "mixed";
  }

  if (hasImportedReport) {
    return "infracost";
  }

  return "manual";
}

function buildResourceLookup(
  normalizedPlan: NormalizedPlan,
): {
  byAddress: Map<string, NormalizedResourceChange>;
  byName: Map<string, NormalizedResourceChange | null>;
} {
  const byAddress = new Map<string, NormalizedResourceChange>();
  const byName = new Map<string, NormalizedResourceChange | null>();

  for (const resourceChange of normalizedPlan.resourceChanges) {
    byAddress.set(resourceChange.address, resourceChange);

    if (resourceChange.previousAddress) {
      byAddress.set(resourceChange.previousAddress, resourceChange);
    }

    if (!byName.has(resourceChange.name)) {
      byName.set(resourceChange.name, resourceChange);
      continue;
    }

    byName.set(resourceChange.name, null);
  }

  return {
    byAddress,
    byName,
  };
}

function resolveResourceAddress(
  lookup: ReturnType<typeof buildResourceLookup>,
  address: string | null | undefined,
  name: string | null | undefined,
): string | null {
  const normalizedAddress = address?.trim();

  if (normalizedAddress && lookup.byAddress.has(normalizedAddress)) {
    return lookup.byAddress.get(normalizedAddress)?.address ?? null;
  }

  const normalizedName = name?.trim();

  if (
    normalizedName &&
    lookup.byAddress.has(normalizedName)
  ) {
    return lookup.byAddress.get(normalizedName)?.address ?? null;
  }

  if (normalizedName) {
    return lookup.byName.get(normalizedName)?.address ?? null;
  }

  return null;
}

function mergeCostEstimate(
  current: ResourceCostEstimate | undefined,
  nextEstimate: ResourceCostEstimate,
): ResourceCostEstimate {
  if (!current) {
    return nextEstimate;
  }

  return {
    address: current.address ?? nextEstimate.address,
    currency: current.currency || nextEstimate.currency,
    monthlyCostAfter: sumNullable(current.monthlyCostAfter, nextEstimate.monthlyCostAfter),
    monthlyCostBefore: sumNullable(
      current.monthlyCostBefore,
      nextEstimate.monthlyCostBefore,
    ),
    monthlyDelta: sumNullable(current.monthlyDelta, nextEstimate.monthlyDelta),
    name: current.name ?? nextEstimate.name,
    source:
      current.source === nextEstimate.source ? current.source : "mixed",
  };
}

function buildBasePlanCostEstimate(
  normalizedPlan: NormalizedPlan,
  state: CostImpactState,
): PlanCostEstimate | null {
  const note = resolveCostNote(state);
  const importedReport = state.importedReport;

  if (!importedReport && state.manualEntries.length === 0 && note === null) {
    return null;
  }

  const lookup = buildResourceLookup(normalizedPlan);
  const matchedEntries = new Map<string, ResourceCostEstimate>();
  const importedEntries = importedReport?.entries ?? [];
  const importedMatchedDelta = new Map<string, number | null>();

  for (const entry of importedEntries) {
    const matchedAddress = resolveResourceAddress(
      lookup,
      entry.address,
      entry.name,
    );

    if (!matchedAddress) {
      continue;
    }

    const estimate: ResourceCostEstimate = {
      address: matchedAddress,
      currency: entry.currency,
      monthlyCostAfter: entry.monthlyCostAfter,
      monthlyCostBefore: entry.monthlyCostBefore,
      monthlyDelta: entry.monthlyDelta,
      name: entry.name,
      source: "infracost",
    };

    matchedEntries.set(
      matchedAddress,
      mergeCostEstimate(matchedEntries.get(matchedAddress), estimate),
    );
  }

  for (const [resourceAddress, estimate] of matchedEntries) {
    importedMatchedDelta.set(resourceAddress, estimate.monthlyDelta);
  }

  for (const entry of state.manualEntries) {
    const matchedAddress = resolveResourceAddress(
      lookup,
      entry.resourceAddress,
      entry.resourceName,
    );
    const resourceAddress = matchedAddress ?? entry.resourceAddress;

    matchedEntries.set(resourceAddress, {
      address: resourceAddress,
      currency: entry.currency,
      monthlyCostAfter: null,
      monthlyCostBefore: null,
      monthlyDelta: entry.monthlyDelta,
      name: entry.resourceName ?? resourceAddress,
      source: "manual",
    });
  }

  const importedTotalDelta =
    importedReport?.totalMonthlyDelta ??
    importedEntries.reduce<number | null>((total, entry) => {
      if (entry.monthlyDelta === null) {
        return total;
      }

      return (total ?? 0) + entry.monthlyDelta;
    }, null);
  const totalMonthlyDelta =
    importedReport !== null
      ? state.manualEntries.reduce<number | null>((total, entry) => {
          const matchedAddress = resolveResourceAddress(
            lookup,
            entry.resourceAddress,
            entry.resourceName,
          );
          const replacedDelta = matchedAddress
            ? importedMatchedDelta.get(matchedAddress) ?? null
            : null;

          return (total ?? 0) + entry.monthlyDelta - (replacedDelta ?? 0);
        }, importedTotalDelta)
      : state.manualEntries.reduce<number | null>(
          (total, entry) => (total ?? 0) + entry.monthlyDelta,
          state.manualEntries.length > 0 ? 0 : null,
        );

  return {
    currency:
      importedReport?.currency ??
      state.manualEntries[0]?.currency ??
      DEFAULT_COST_CURRENCY,
    hasMappedResources: matchedEntries.size > 0,
    importedEntryCount: importedEntries.length,
    manualEntryCount: state.manualEntries.length,
    mappedResourceCount: matchedEntries.size,
    note,
    resourceEntries: Array.from(matchedEntries.values()).sort((left, right) =>
      (left.address ?? left.name ?? "").localeCompare(
        right.address ?? right.name ?? "",
      ),
    ),
    source: getCostSource(importedReport !== null, state.manualEntries),
    thresholds: state.thresholds,
    totalMonthlyCostAfter: importedReport?.totalMonthlyCostAfter ?? null,
    totalMonthlyCostBefore: importedReport?.totalMonthlyCostBefore ?? null,
    totalMonthlyDelta,
  };
}

export function applyCostImpactToPlan(
  normalizedPlan: NormalizedPlan,
  state: CostImpactState,
): NormalizedPlan {
  const costEstimate = buildBasePlanCostEstimate(normalizedPlan, state);

  if (!costEstimate) {
    return normalizedPlan;
  }

  const costMap = new Map(
    costEstimate.resourceEntries
      .filter((entry) => entry.address)
      .map((entry) => [entry.address!, entry]),
  );
  const resourceChanges = normalizedPlan.resourceChanges.map((resourceChange) => {
    const costEntry = costMap.get(resourceChange.address) ?? null;
    const nextResource: NormalizedResourceChange = {
      ...resourceChange,
      costEstimate: costEntry,
      costThresholds: costEstimate.thresholds,
      riskSummary: undefined,
    };
    const riskSummary = evaluateResourceRisk(nextResource);

    return {
      ...nextResource,
      isHighRisk:
        riskSummary.highestSeverity === "critical" ||
        riskSummary.highestSeverity === "high",
      riskSummary,
    };
  });
  const planWithCostBase: NormalizedPlan = {
    ...normalizedPlan,
    costEstimate,
    resourceChanges,
    riskReport: undefined,
  };
  const riskReport = evaluatePlanRisk(planWithCostBase);
  const planWithRisk: NormalizedPlan = {
    ...planWithCostBase,
    riskReport,
  };

  return {
    ...planWithRisk,
    summary: buildPlanSummary(planWithRisk),
  };
}
