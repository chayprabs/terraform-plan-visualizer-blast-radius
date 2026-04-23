import { changeActionKinds, type ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type { ResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import {
  DEFAULT_RESOURCE_TABLE_SORT,
  RESOURCE_TABLE_SORT_FIELDS,
  type ResourceSeverityValue,
  type ResourceTableSortField,
} from "@/features/terraform-plan/components/resources/resourceTableModel";
import type { GraphNodeRiskLevel } from "@/features/terraform-plan/graph/graphTypes";
import {
  DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  type TerraformPlanRedactionSettings,
} from "@/features/terraform-plan/privacy/redactionTypes";
import type { RiskActionKind, RiskCategory, RiskSeverity } from "@/features/terraform-plan/risk/riskTypes";

export type TerraformPlanInputTab = "paste" | "upload";
export type TerraformPlanFindingGroupMode = "resource" | "severity";
export type TerraformPlanResourceDetailsTab =
  | "overview"
  | "diff"
  | "findings"
  | "raw-json"
  | "dependencies";

export interface TerraformPlanFindingsViewState {
  actionKind: RiskActionKind | "all";
  category: RiskCategory | "all";
  groupBy: TerraformPlanFindingGroupMode;
  highRiskOnly: boolean;
  search: string;
  severity: RiskSeverity | "all";
}

export interface TerraformPlanResourceTableViewState {
  action: ChangeActionKind | "all";
  inSelectedBlastRadiusOnly: boolean;
  includeNoOp: boolean;
  module: string | "all";
  provider: string | "all";
  resourceGroup: ResourceTypeGroup | "all";
  search: string;
  severity: ResourceSeverityValue | "all";
  sortBy: ResourceTableSortField;
}

export interface TerraformPlanGraphViewState {
  action: ChangeActionKind | "all";
  includeChangedDependencies: boolean;
  module: string | "all";
  provider: string | "all";
  resourceGroup: ResourceTypeGroup | "all";
  risk: GraphNodeRiskLevel | "all";
  search: string;
  showChangedOnly: boolean;
}

export interface TerraformPlanUrlState {
  blastRadiusFocusAddress: string | null;
  findings: TerraformPlanFindingsViewState;
  graph: TerraformPlanGraphViewState;
  inputTab: TerraformPlanInputTab;
  redactionSettings: TerraformPlanRedactionSettings;
  resourceDetailsTab: TerraformPlanResourceDetailsTab;
  resources: TerraformPlanResourceTableViewState;
  selectedResourceAddress: string | null;
}

export interface ParsedTerraformPlanUrlState {
  hasRedactionSettings: boolean;
  state: TerraformPlanUrlState;
}

export const DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE: TerraformPlanFindingsViewState =
  {
    actionKind: "all",
    category: "all",
    groupBy: "severity",
    highRiskOnly: false,
    search: "",
    severity: "all",
  };

export const DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE: TerraformPlanResourceTableViewState =
  {
    action: "all",
    inSelectedBlastRadiusOnly: false,
    includeNoOp: true,
    module: "all",
    provider: "all",
    resourceGroup: "all",
    search: "",
    severity: "all",
    sortBy: DEFAULT_RESOURCE_TABLE_SORT,
  };

export const DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE: TerraformPlanGraphViewState =
  {
    action: "all",
    includeChangedDependencies: false,
    module: "all",
    provider: "all",
    resourceGroup: "all",
    risk: "all",
    search: "",
    showChangedOnly: false,
  };

export const DEFAULT_TERRAFORM_PLAN_URL_STATE: TerraformPlanUrlState = {
  blastRadiusFocusAddress: null,
  findings: DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE,
  graph: DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE,
  inputTab: "paste",
  redactionSettings: DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  resourceDetailsTab: "overview",
  resources: DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE,
  selectedResourceAddress: null,
};

const INPUT_TAB_VALUES: TerraformPlanInputTab[] = ["paste", "upload"];
const FINDING_GROUP_VALUES: TerraformPlanFindingGroupMode[] = [
  "resource",
  "severity",
];
const RESOURCE_DETAILS_TAB_VALUES: TerraformPlanResourceDetailsTab[] = [
  "overview",
  "diff",
  "findings",
  "raw-json",
  "dependencies",
];
const RISK_SEVERITY_VALUES: RiskSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];
const RISK_CATEGORY_VALUES: RiskCategory[] = [
  "destructive",
  "replacement",
  "iam",
  "network",
  "database",
  "storage",
  "secrets",
  "encryption",
  "public_access",
  "cost",
  "reliability",
  "unknowns",
  "outputs",
  "provider",
  "module",
];
const RISK_ACTION_VALUES: RiskActionKind[] = [...changeActionKinds, "plan"];
const RESOURCE_GROUP_VALUES: ResourceTypeGroup[] = [
  "iam",
  "network",
  "database",
  "storage",
  "compute",
  "dns",
  "kms",
  "unknown",
];
const GRAPH_RISK_VALUES: GraphNodeRiskLevel[] = [...RISK_SEVERITY_VALUES, "none"];
const RESOURCE_SEVERITY_VALUES: ResourceSeverityValue[] = [
  ...RISK_SEVERITY_VALUES,
  "none",
];

function getStringParam(
  params: URLSearchParams,
  key: string,
): string | null {
  const value = params.get(key);

  return value && value.trim().length > 0 ? value : null;
}

function getBooleanParam(
  params: URLSearchParams,
  key: string,
): boolean | null {
  const value = params.get(key);

  if (value === "1") {
    return true;
  }

  if (value === "0") {
    return false;
  }

  return null;
}

function getEnumParam<T extends string>(
  params: URLSearchParams,
  key: string,
  allowedValues: readonly T[],
): T | null {
  const value = getStringParam(params, key);

  return value && allowedValues.includes(value as T) ? (value as T) : null;
}

function setParam(
  params: URLSearchParams,
  key: string,
  value: string | null | undefined,
  defaultValue?: string,
): void {
  if (!value || value === defaultValue) {
    params.delete(key);
    return;
  }

  params.set(key, value);
}

function setBooleanParam(
  params: URLSearchParams,
  key: string,
  value: boolean,
  defaultValue: boolean,
): void {
  if (value === defaultValue) {
    params.delete(key);
    return;
  }

  params.set(key, value ? "1" : "0");
}

export function parseTerraformPlanUrlState(
  search: string,
): ParsedTerraformPlanUrlState {
  const params = new URLSearchParams(search);
  const findingsActionKind =
    getEnumParam(params, "fa", RISK_ACTION_VALUES) ??
    DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.actionKind;
  const findingsCategory =
    getEnumParam(params, "fc", RISK_CATEGORY_VALUES) ??
    DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.category;
  const findingsGroupBy =
    getEnumParam(params, "fg", FINDING_GROUP_VALUES) ??
    DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.groupBy;
  const findingsSeverity =
    getEnumParam(params, "fv", RISK_SEVERITY_VALUES) ??
    DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.severity;
  const resourcesAction =
    getEnumParam(params, "ra", changeActionKinds) ??
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.action;
  const resourcesGroup =
    getEnumParam(params, "rgrp", RESOURCE_GROUP_VALUES) ??
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.resourceGroup;
  const resourcesSeverity =
    getEnumParam(params, "rsev", RESOURCE_SEVERITY_VALUES) ??
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.severity;
  const resourcesSortBy =
    getEnumParam(params, "rso", RESOURCE_TABLE_SORT_FIELDS) ??
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.sortBy;
  const graphAction =
    getEnumParam(params, "ga", changeActionKinds) ??
    DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.action;
  const graphGroup =
    getEnumParam(params, "ggrp", RESOURCE_GROUP_VALUES) ??
    DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.resourceGroup;
  const graphRisk =
    getEnumParam(params, "gr", GRAPH_RISK_VALUES) ??
    DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.risk;
  const redactionSettings: TerraformPlanRedactionSettings = {
    anonymizeResourceNamesInExports:
      getBooleanParam(params, "panon") ??
      DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS.anonymizeResourceNamesInExports,
    detectSecretLikeStrings:
      getBooleanParam(params, "psecret") ??
      DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS.detectSecretLikeStrings,
    maskCloudAccountIdsInExports:
      getBooleanParam(params, "pacct") ??
      DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS.maskCloudAccountIdsInExports,
    maskDomainNamesInExports:
      getBooleanParam(params, "pdomain") ??
      DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS.maskDomainNamesInExports,
    maskIpAddressesInExports:
      getBooleanParam(params, "pip") ??
      DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS.maskIpAddressesInExports,
    maskTerraformSensitiveValues: true,
  };

  return {
    hasRedactionSettings: [
      "panon",
      "psecret",
      "pacct",
      "pdomain",
      "pip",
    ].some((key) => params.has(key)),
    state: {
      blastRadiusFocusAddress: getStringParam(params, "br"),
      findings: {
        actionKind: findingsActionKind,
        category: findingsCategory,
        groupBy: findingsGroupBy,
        highRiskOnly:
          getBooleanParam(params, "fh") ??
          DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.highRiskOnly,
        search:
          getStringParam(params, "fs") ??
          DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.search,
        severity: findingsSeverity,
      },
      graph: {
        action: graphAction,
        includeChangedDependencies:
          getBooleanParam(params, "gdep") ??
          DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.includeChangedDependencies,
        module:
          getStringParam(params, "gm") ??
          DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.module,
        provider:
          getStringParam(params, "gp") ??
          DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.provider,
        resourceGroup: graphGroup,
        risk: graphRisk,
        search:
          getStringParam(params, "gs") ??
          DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.search,
        showChangedOnly:
          getBooleanParam(params, "gco") ??
          DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.showChangedOnly,
      },
      inputTab:
        getEnumParam(params, "it", INPUT_TAB_VALUES) ??
        DEFAULT_TERRAFORM_PLAN_URL_STATE.inputTab,
      redactionSettings,
      resourceDetailsTab:
        getEnumParam(params, "rt", RESOURCE_DETAILS_TAB_VALUES) ??
        DEFAULT_TERRAFORM_PLAN_URL_STATE.resourceDetailsTab,
      resources: {
        action: resourcesAction,
        inSelectedBlastRadiusOnly:
          getBooleanParam(params, "rbr") ??
          DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.inSelectedBlastRadiusOnly,
        includeNoOp:
          getBooleanParam(params, "rno") ??
          DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.includeNoOp,
        module:
          getStringParam(params, "rm") ??
          DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.module,
        provider:
          getStringParam(params, "rp") ??
          DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.provider,
        resourceGroup: resourcesGroup,
        search:
          getStringParam(params, "rs") ??
          DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.search,
        severity: resourcesSeverity,
        sortBy: resourcesSortBy,
      },
      selectedResourceAddress: getStringParam(params, "sr"),
    },
  };
}

export function buildTerraformPlanUrlSearch(
  state: TerraformPlanUrlState,
): string {
  const params = new URLSearchParams();

  setParam(params, "it", state.inputTab, DEFAULT_TERRAFORM_PLAN_URL_STATE.inputTab);
  setParam(params, "br", state.blastRadiusFocusAddress);
  setParam(params, "sr", state.selectedResourceAddress);
  setParam(
    params,
    "rt",
    state.resourceDetailsTab,
    DEFAULT_TERRAFORM_PLAN_URL_STATE.resourceDetailsTab,
  );

  setParam(
    params,
    "fs",
    state.findings.search,
    DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.search,
  );
  setParam(
    params,
    "fv",
    state.findings.severity,
    DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.severity,
  );
  setParam(
    params,
    "fc",
    state.findings.category,
    DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.category,
  );
  setParam(
    params,
    "fa",
    state.findings.actionKind,
    DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.actionKind,
  );
  setBooleanParam(
    params,
    "fh",
    state.findings.highRiskOnly,
    DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.highRiskOnly,
  );
  setParam(
    params,
    "fg",
    state.findings.groupBy,
    DEFAULT_TERRAFORM_PLAN_FINDINGS_VIEW_STATE.groupBy,
  );

  setParam(
    params,
    "rs",
    state.resources.search,
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.search,
  );
  setParam(
    params,
    "ra",
    state.resources.action,
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.action,
  );
  setParam(
    params,
    "rp",
    state.resources.provider,
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.provider,
  );
  setParam(
    params,
    "rm",
    state.resources.module,
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.module,
  );
  setParam(
    params,
    "rgrp",
    state.resources.resourceGroup,
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.resourceGroup,
  );
  setParam(
    params,
    "rsev",
    state.resources.severity,
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.severity,
  );
  setBooleanParam(
    params,
    "rbr",
    state.resources.inSelectedBlastRadiusOnly,
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.inSelectedBlastRadiusOnly,
  );
  setBooleanParam(
    params,
    "rno",
    state.resources.includeNoOp,
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.includeNoOp,
  );
  setParam(
    params,
    "rso",
    state.resources.sortBy,
    DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE.sortBy,
  );

  setParam(
    params,
    "gs",
    state.graph.search,
    DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.search,
  );
  setParam(
    params,
    "ga",
    state.graph.action,
    DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.action,
  );
  setParam(
    params,
    "gp",
    state.graph.provider,
    DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.provider,
  );
  setParam(
    params,
    "gm",
    state.graph.module,
    DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.module,
  );
  setParam(
    params,
    "ggrp",
    state.graph.resourceGroup,
    DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.resourceGroup,
  );
  setParam(
    params,
    "gr",
    state.graph.risk,
    DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.risk,
  );
  setBooleanParam(
    params,
    "gco",
    state.graph.showChangedOnly,
    DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.showChangedOnly,
  );
  setBooleanParam(
    params,
    "gdep",
    state.graph.includeChangedDependencies,
    DEFAULT_TERRAFORM_PLAN_GRAPH_VIEW_STATE.includeChangedDependencies,
  );

  setBooleanParam(
    params,
    "psecret",
    state.redactionSettings.detectSecretLikeStrings,
    DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS.detectSecretLikeStrings,
  );
  setBooleanParam(
    params,
    "panon",
    state.redactionSettings.anonymizeResourceNamesInExports,
    DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS.anonymizeResourceNamesInExports,
  );
  setBooleanParam(
    params,
    "pacct",
    state.redactionSettings.maskCloudAccountIdsInExports,
    DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS.maskCloudAccountIdsInExports,
  );
  setBooleanParam(
    params,
    "pip",
    state.redactionSettings.maskIpAddressesInExports,
    DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS.maskIpAddressesInExports,
  );
  setBooleanParam(
    params,
    "pdomain",
    state.redactionSettings.maskDomainNamesInExports,
    DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS.maskDomainNamesInExports,
  );

  const serialized = params.toString();

  return serialized.length > 0 ? `?${serialized}` : "";
}

export function replaceWindowTerraformPlanUrlState(
  state: TerraformPlanUrlState,
): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const nextSearch = buildTerraformPlanUrlSearch(state);
  const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;

  window.history.replaceState({}, "", nextUrl);

  return new URL(nextUrl, window.location.origin).toString();
}
