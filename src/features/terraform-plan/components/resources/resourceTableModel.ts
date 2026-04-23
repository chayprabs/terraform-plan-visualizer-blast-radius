import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type {
  NormalizedPlan,
  NormalizedResourceChange,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type { ResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import {
  compareRiskSeverity,
  getRiskActionLabel,
  getRiskSeverityLabel,
  RISK_SEVERITY_ORDER,
} from "@/features/terraform-plan/risk/riskCopy";
import type { RiskSeverity } from "@/features/terraform-plan/risk/riskTypes";

export type ResourceTableSortField =
  | "action"
  | "risk"
  | "provider"
  | "type"
  | "address";

export type ResourceSeverityValue = RiskSeverity | "none";

export interface ResourceTableItem {
  action: ChangeActionKind;
  address: string;
  changedAttributesCount: number | null;
  costCurrency: string | null;
  costMonthlyAfter: number | null;
  costMonthlyBefore: number | null;
  costMonthlyDelta: number | null;
  hasSensitiveChange: boolean;
  moduleKey: string;
  moduleLabel: string;
  name: string;
  providerKey: string;
  providerLabel: string;
  providerName: string;
  replacePathsCount: number;
  resource: NormalizedResourceChange;
  resourceGroup: ResourceTypeGroup;
  riskFindingCount: number;
  riskSeverity: ResourceSeverityValue;
  searchText: string;
  type: string;
}

export interface ResourceTableFilterState {
  action: ChangeActionKind | "all";
  blastRadiusAddressSet?: ReadonlySet<string> | null;
  includeNoOp: boolean;
  inSelectedBlastRadiusOnly?: boolean;
  module: string | "all";
  provider: string | "all";
  resourceGroup: ResourceTypeGroup | "all";
  search: string;
  severity: ResourceSeverityValue | "all";
  sortBy: ResourceTableSortField;
}

export interface ResourceFilterOption {
  count: number;
  label: string;
  value: string;
}

export interface ResourceFilterOptions {
  actionOptions: ResourceFilterOption[];
  moduleOptions: ResourceFilterOption[];
  providerOptions: ResourceFilterOption[];
  resourceGroupOptions: ResourceFilterOption[];
  severityOptions: ResourceFilterOption[];
}

export const RESOURCE_TABLE_SORT_FIELDS: ResourceTableSortField[] = [
  "risk",
  "action",
  "provider",
  "type",
  "address",
];

export const DEFAULT_RESOURCE_TABLE_SORT: ResourceTableSortField = "risk";
export const MANY_RESOURCE_CHANGES_THRESHOLD = 20;

const ROOT_MODULE_KEY = "root";
const RESOURCE_SEVERITY_ORDER: ResourceSeverityValue[] = [
  ...RISK_SEVERITY_ORDER,
  "none",
];
const FILTER_ACTION_ORDER: ChangeActionKind[] = [
  "create",
  "update",
  "delete",
  "replace",
  "read",
  "no-op",
  "import",
  "forget",
  "unknown",
];
const SORT_ACTION_ORDER: ChangeActionKind[] = [
  "replace",
  "delete",
  "update",
  "create",
  "import",
  "read",
  "no-op",
  "forget",
  "unknown",
];
const RESOURCE_GROUP_LABELS: Record<ResourceTypeGroup, string> = {
  iam: "IAM",
  network: "Network",
  database: "Database",
  storage: "Storage",
  compute: "Compute",
  dns: "DNS",
  kms: "KMS",
  unknown: "Unknown",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasSensitiveValue(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasSensitiveValue(entry));
  }

  if (isRecord(value)) {
    return Object.values(value).some((entry) => hasSensitiveValue(entry));
  }

  return false;
}

function countDiffEntries(left: unknown, right: unknown): number {
  if (Object.is(left, right)) {
    return 0;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLength = Math.max(left.length, right.length);
    let total = 0;

    for (let index = 0; index < maxLength; index += 1) {
      total += countDiffEntries(left[index], right[index]);
    }

    return total;
  }

  if (isRecord(left) && isRecord(right)) {
    const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
    let total = 0;

    for (const key of keys) {
      total += countDiffEntries(left[key], right[key]);
    }

    return total;
  }

  return 1;
}

function getChangedAttributesCount(
  resource: NormalizedResourceChange,
): number | null {
  switch (resource.action) {
    case "update":
    case "replace":
      if (resource.before === undefined && resource.after === undefined) {
        return null;
      }

      return countDiffEntries(resource.before, resource.after);
    case "no-op":
      return 0;
    default:
      return null;
  }
}

function getRiskSeverity(
  resource: NormalizedResourceChange,
): ResourceSeverityValue {
  return resource.riskSummary?.highestSeverity ?? "none";
}

function getModuleKey(moduleAddress?: string | null): string {
  return moduleAddress ?? ROOT_MODULE_KEY;
}

export function getModuleLabel(moduleAddress?: string | null): string {
  return moduleAddress ?? "root";
}

export function getModuleOptionLabel(moduleKey: string): string {
  return moduleKey === ROOT_MODULE_KEY ? "Root module" : moduleKey;
}

export function getResourceGroupLabel(group: ResourceTypeGroup): string {
  return RESOURCE_GROUP_LABELS[group];
}

export function getResourceSeverityLabel(severity: ResourceSeverityValue): string {
  return severity === "none" ? "None" : getRiskSeverityLabel(severity);
}

export function compareResourceSeverity(
  left: ResourceSeverityValue,
  right: ResourceSeverityValue,
): number {
  if (left === "none" || right === "none") {
    return RESOURCE_SEVERITY_ORDER.indexOf(left) -
      RESOURCE_SEVERITY_ORDER.indexOf(right);
  }

  return compareRiskSeverity(left, right);
}

export function shouldIncludeNoOpByDefault(
  normalizedPlan: Pick<NormalizedPlan, "resourceChanges" | "summary">,
): boolean {
  return !(
    normalizedPlan.resourceChanges.length >= MANY_RESOURCE_CHANGES_THRESHOLD &&
    normalizedPlan.summary.noOpCount > 0
  );
}

export function buildResourceTableItems(
  resourceChanges: NormalizedResourceChange[],
): ResourceTableItem[] {
  return resourceChanges.map((resource) => {
    const providerLabel = resource.providerShortName || "unknown";
    const providerName = resource.providerName ?? "unknown";
    const moduleLabel = getModuleLabel(resource.moduleAddress);
    const moduleKey = getModuleKey(resource.moduleAddress);
    const riskSeverity = getRiskSeverity(resource);

    return {
      action: resource.action,
      address: resource.address,
      changedAttributesCount: getChangedAttributesCount(resource),
      costCurrency: resource.costEstimate?.currency ?? null,
      costMonthlyAfter: resource.costEstimate?.monthlyCostAfter ?? null,
      costMonthlyBefore: resource.costEstimate?.monthlyCostBefore ?? null,
      costMonthlyDelta: resource.costEstimate?.monthlyDelta ?? null,
      hasSensitiveChange:
        hasSensitiveValue(resource.beforeSensitive) ||
        hasSensitiveValue(resource.afterSensitive),
      moduleKey,
      moduleLabel,
      name: resource.name,
      providerKey: providerLabel,
      providerLabel,
      providerName,
      replacePathsCount: resource.replacePaths.length,
      resource,
      resourceGroup: resource.typeGroup,
      riskFindingCount: resource.riskSummary?.findings.length ?? 0,
      riskSeverity,
      searchText: [
        resource.address,
        resource.name,
        resource.type,
        providerLabel,
        providerName,
        moduleLabel,
        resource.moduleAddress,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
      type: resource.type,
    };
  });
}

function compareByAction(left: ResourceTableItem, right: ResourceTableItem): number {
  return (
    SORT_ACTION_ORDER.indexOf(left.action) -
      SORT_ACTION_ORDER.indexOf(right.action) ||
    compareResourceSeverity(left.riskSeverity, right.riskSeverity) ||
    left.address.localeCompare(right.address)
  );
}

function compareByRisk(left: ResourceTableItem, right: ResourceTableItem): number {
  return (
    compareResourceSeverity(left.riskSeverity, right.riskSeverity) ||
    SORT_ACTION_ORDER.indexOf(left.action) - SORT_ACTION_ORDER.indexOf(right.action) ||
    left.address.localeCompare(right.address)
  );
}

function compareByProvider(
  left: ResourceTableItem,
  right: ResourceTableItem,
): number {
  return (
    left.providerLabel.localeCompare(right.providerLabel) ||
    left.type.localeCompare(right.type) ||
    left.address.localeCompare(right.address)
  );
}

function compareByType(left: ResourceTableItem, right: ResourceTableItem): number {
  return (
    left.type.localeCompare(right.type) ||
    left.providerLabel.localeCompare(right.providerLabel) ||
    left.address.localeCompare(right.address)
  );
}

function compareByAddress(
  left: ResourceTableItem,
  right: ResourceTableItem,
): number {
  return left.address.localeCompare(right.address);
}

export function filterAndSortResourceTableItems(
  items: ResourceTableItem[],
  filters: ResourceTableFilterState,
): ResourceTableItem[] {
  const normalizedSearch = filters.search.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!filters.includeNoOp && item.action === "no-op") {
      return false;
    }

    if (filters.action !== "all" && item.action !== filters.action) {
      return false;
    }

    if (filters.provider !== "all" && item.providerKey !== filters.provider) {
      return false;
    }

    if (filters.module !== "all" && item.moduleKey !== filters.module) {
      return false;
    }

    if (
      filters.resourceGroup !== "all" &&
      item.resourceGroup !== filters.resourceGroup
    ) {
      return false;
    }

    if (
      filters.inSelectedBlastRadiusOnly &&
      !filters.blastRadiusAddressSet?.has(item.address)
    ) {
      return false;
    }

    if (filters.severity !== "all" && item.riskSeverity !== filters.severity) {
      return false;
    }

    if (normalizedSearch.length > 0 && !item.searchText.includes(normalizedSearch)) {
      return false;
    }

    return true;
  });

  return [...filteredItems].sort((left, right) => {
    switch (filters.sortBy) {
      case "action":
        return compareByAction(left, right);
      case "provider":
        return compareByProvider(left, right);
      case "type":
        return compareByType(left, right);
      case "address":
        return compareByAddress(left, right);
      case "risk":
      default:
        return compareByRisk(left, right);
    }
  });
}

function createOptions<T extends string>(
  values: T[],
  counts: Map<T, number>,
  getLabel: (value: T) => string,
  allLabel: string,
): ResourceFilterOption[] {
  return [
    {
      count: Array.from(counts.values()).reduce((total, count) => total + count, 0),
      label: allLabel,
      value: "all",
    },
    ...values
      .filter((value) => (counts.get(value) ?? 0) > 0)
      .map((value) => ({
        count: counts.get(value) ?? 0,
        label: getLabel(value),
        value,
      })),
  ];
}

export function buildResourceFilterOptions(
  items: ResourceTableItem[],
): ResourceFilterOptions {
  const actionCounts = new Map<ChangeActionKind, number>();
  const providerCounts = new Map<string, number>();
  const moduleCounts = new Map<string, number>();
  const resourceGroupCounts = new Map<ResourceTypeGroup, number>();
  const severityCounts = new Map<ResourceSeverityValue, number>();

  for (const item of items) {
    actionCounts.set(item.action, (actionCounts.get(item.action) ?? 0) + 1);
    providerCounts.set(
      item.providerKey,
      (providerCounts.get(item.providerKey) ?? 0) + 1,
    );
    moduleCounts.set(item.moduleKey, (moduleCounts.get(item.moduleKey) ?? 0) + 1);
    resourceGroupCounts.set(
      item.resourceGroup,
      (resourceGroupCounts.get(item.resourceGroup) ?? 0) + 1,
    );
    severityCounts.set(
      item.riskSeverity,
      (severityCounts.get(item.riskSeverity) ?? 0) + 1,
    );
  }

  return {
    actionOptions: createOptions(
      FILTER_ACTION_ORDER,
      actionCounts,
      getRiskActionLabel,
      "All actions",
    ),
    moduleOptions: createOptions(
      Array.from(moduleCounts.keys()).sort((left, right) =>
        getModuleOptionLabel(left).localeCompare(getModuleOptionLabel(right)),
      ),
      moduleCounts,
      getModuleOptionLabel,
      "All modules",
    ),
    providerOptions: createOptions(
      Array.from(providerCounts.keys()).sort((left, right) =>
        left.localeCompare(right),
      ),
      providerCounts,
      (value) => value,
      "All providers",
    ),
    resourceGroupOptions: createOptions(
      Array.from(resourceGroupCounts.keys()).sort((left, right) =>
        getResourceGroupLabel(left).localeCompare(getResourceGroupLabel(right)),
      ),
      resourceGroupCounts,
      getResourceGroupLabel,
      "All groups",
    ),
    severityOptions: createOptions(
      RESOURCE_SEVERITY_ORDER,
      severityCounts,
      getResourceSeverityLabel,
      "All severities",
    ),
  };
}

export function buildResourceSummaryLabel(
  filteredCount: number,
  totalCount: number,
): string {
  if (filteredCount === totalCount) {
    return `Showing all ${totalCount} resources.`;
  }

  return `Showing ${filteredCount} of ${totalCount} resources.`;
}

export function formatResourceListCopy(items: ResourceTableItem[]): string {
  return [
    "# Filtered Terraform resources",
    "",
    ...items.map((item) =>
      `- ${getRiskActionLabel(item.action)} | ${getResourceSeverityLabel(
        item.riskSeverity,
      )} | ${item.address} | ${item.type} | ${item.providerLabel} | ${item.moduleLabel}`,
    ),
  ]
    .join("\n")
    .trim();
}
