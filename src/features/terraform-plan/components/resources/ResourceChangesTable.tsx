"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePrivacyRedaction } from "@/features/terraform-plan/components/privacy/PrivacyRedactionContext";
import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type { ResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import { ResourceChangeRow } from "@/features/terraform-plan/components/resources/ResourceChangeRow";
import { ResourceFilters } from "@/features/terraform-plan/components/resources/ResourceFilters";
import { ResourceTableToolbar } from "@/features/terraform-plan/components/resources/ResourceTableToolbar";
import {
  buildResourceFilterOptions,
  buildResourceSummaryLabel,
  buildResourceTableItems,
  filterAndSortResourceTableItems,
  formatResourceListCopy,
  MANY_RESOURCE_CHANGES_THRESHOLD,
  shouldIncludeNoOpByDefault,
  type ResourceSeverityValue,
  type ResourceTableSortField,
} from "@/features/terraform-plan/components/resources/resourceTableModel";
import { redactText } from "@/features/terraform-plan/privacy/redactTerraformPlan";
import {
  DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE,
  type TerraformPlanResourceTableViewState,
} from "@/features/terraform-plan/state/urlState";

interface ResourceChangesTableProps {
  blastRadiusAddresses?: ReadonlySet<string> | null;
  blastRadiusFocusAddress?: string | null;
  hasAnalyzed: boolean;
  initialState?: TerraformPlanResourceTableViewState;
  normalizedPlan: NormalizedPlan | null;
  onOpenResource?: (address: string) => void;
  onStateChange?: (state: TerraformPlanResourceTableViewState) => void;
  selectedAddress?: string | null;
}

interface CopyState {
  copiedAddress: string | null;
  errorAddress: string | null;
  filteredListState: "copied" | "error" | "idle";
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.append(helper);
    helper.select();

    const copied = document.execCommand("copy");
    helper.remove();

    return copied;
  } catch {
    return false;
  }
}

function PlaceholderState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="border-border bg-surface-muted rounded-lg border p-5">
      <p className="text-foreground text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground mt-2 text-sm leading-7">
        {description}
      </p>
    </div>
  );
}

export function ResourceChangesTable({
  blastRadiusAddresses = null,
  blastRadiusFocusAddress = null,
  hasAnalyzed,
  initialState,
  normalizedPlan,
  onOpenResource,
  onStateChange,
  selectedAddress = null,
}: ResourceChangesTableProps) {
  const { settings } = usePrivacyRedaction();
  const resolvedInitialState =
    initialState ?? DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE;
  const [search, setSearch] = useState(resolvedInitialState.search);
  const [action, setAction] = useState<ChangeActionKind | "all">(
    resolvedInitialState.action,
  );
  const [provider, setProvider] = useState<string | "all">(
    resolvedInitialState.provider,
  );
  const [module, setModule] = useState<string | "all">(resolvedInitialState.module);
  const [resourceGroup, setResourceGroup] = useState<ResourceTypeGroup | "all">(
    resolvedInitialState.resourceGroup,
  );
  const [severity, setSeverity] = useState<ResourceSeverityValue | "all">(
    resolvedInitialState.severity,
  );
  const [inSelectedBlastRadiusOnly, setInSelectedBlastRadiusOnly] =
    useState(resolvedInitialState.inSelectedBlastRadiusOnly);
  const defaultIncludeNoOp =
    initialState?.includeNoOp ??
    (normalizedPlan ? shouldIncludeNoOpByDefault(normalizedPlan) : true);
  const [includeNoOp, setIncludeNoOp] = useState(defaultIncludeNoOp);
  const [sortBy, setSortBy] = useState<ResourceTableSortField>(
    resolvedInitialState.sortBy,
  );
  const [copyState, setCopyState] = useState<CopyState>({
    copiedAddress: null,
    errorAddress: null,
    filteredListState: "idle",
  });
  const deferredSearch = useDeferredValue(search);
  const effectiveInSelectedBlastRadiusOnly =
    inSelectedBlastRadiusOnly && Boolean(blastRadiusFocusAddress);

  const tableItems = useMemo(
    () => buildResourceTableItems(normalizedPlan?.resourceChanges ?? []),
    [normalizedPlan],
  );
  const showCostColumn = tableItems.some(
    (item) => item.costMonthlyDelta !== null && item.costCurrency !== null,
  );
  const planResetKey = [
    normalizedPlan?.timestamp ?? "",
    normalizedPlan?.resourceChanges.length ?? 0,
    normalizedPlan?.summary.noOpCount ?? 0,
  ].join(":");
  const filterOptions = useMemo(
    () => buildResourceFilterOptions(tableItems),
    [tableItems],
  );
  const filteredItems = useMemo(
    () =>
      filterAndSortResourceTableItems(tableItems, {
        action,
        blastRadiusAddressSet: blastRadiusAddresses,
        includeNoOp,
        inSelectedBlastRadiusOnly: effectiveInSelectedBlastRadiusOnly,
        module,
        provider,
        resourceGroup,
        search: deferredSearch,
        severity,
        sortBy,
      }),
    [
      action,
      blastRadiusAddresses,
      deferredSearch,
      effectiveInSelectedBlastRadiusOnly,
      includeNoOp,
      module,
      provider,
      resourceGroup,
      severity,
      sortBy,
      tableItems,
    ],
  );
  const summaryLabel = buildResourceSummaryLabel(
    filteredItems.length,
    tableItems.length,
  );
  const showNoOpHint = Boolean(
    normalizedPlan &&
      normalizedPlan.resourceChanges.length >= MANY_RESOURCE_CHANGES_THRESHOLD &&
      normalizedPlan.summary.noOpCount > 0 &&
      !includeNoOp,
  );

  useEffect(() => {
    const nextState =
      initialState ?? DEFAULT_TERRAFORM_PLAN_RESOURCE_TABLE_VIEW_STATE;

    startTransition(() => {
      setSearch(nextState.search);
      setAction(nextState.action);
      setProvider(nextState.provider);
      setModule(nextState.module);
      setResourceGroup(nextState.resourceGroup);
      setSeverity(nextState.severity);
      setInSelectedBlastRadiusOnly(nextState.inSelectedBlastRadiusOnly);
      setIncludeNoOp(defaultIncludeNoOp);
      setSortBy(nextState.sortBy);
    });
  }, [defaultIncludeNoOp, initialState, planResetKey]);

  useEffect(() => {
    if (copyState.copiedAddress === null && copyState.errorAddress === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState((current) => ({
        ...current,
        copiedAddress: null,
        errorAddress: null,
      }));
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState.copiedAddress, copyState.errorAddress]);

  useEffect(() => {
    if (copyState.filteredListState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState((current) => ({
        ...current,
        filteredListState: "idle",
      }));
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState.filteredListState]);

  useEffect(() => {
    onStateChange?.({
      action,
      inSelectedBlastRadiusOnly,
      includeNoOp,
      module,
      provider,
      resourceGroup,
      search,
      severity,
      sortBy,
    });
  }, [
    action,
    inSelectedBlastRadiusOnly,
    includeNoOp,
    module,
    onStateChange,
    provider,
    resourceGroup,
    search,
    severity,
    sortBy,
  ]);

  if (!hasAnalyzed || !normalizedPlan) {
    return (
      <PlaceholderState
        title="Analyze a Terraform plan to inspect resource changes."
        description="A filterable Terraform resource review table will appear here after local analysis completes."
      />
    );
  }

  if (tableItems.length === 0) {
    return (
      <PlaceholderState
        title="No resources were included in this plan."
        description="Terraform did not emit any resource_changes entries for this analysis."
      />
    );
  }

  const handleCopyAddress = async (address: string) => {
    const copied = await copyText(
      redactText(address, {
        scope: "export",
        settings,
      }),
    );

    setCopyState((current) => ({
      ...current,
      copiedAddress: copied ? address : null,
      errorAddress: copied ? null : address,
    }));
  };

  const handleCopyFiltered = async () => {
    const copied = await copyText(
      redactText(formatResourceListCopy(filteredItems), {
        scope: "export",
        settings,
      }),
    );

    setCopyState((current) => ({
      ...current,
      filteredListState: copied ? "copied" : "error",
    }));
  };

  return (
    <section className="space-y-4" aria-label="Resource changes table">
      <ResourceTableToolbar
        copyState={copyState.filteredListState}
        onCopyFiltered={() => {
          void handleCopyFiltered();
        }}
        onSortByChange={setSortBy}
        showNoOpHint={showNoOpHint}
        sortBy={sortBy}
        summaryLabel={summaryLabel}
      />

      <ResourceFilters
        action={action}
        actionOptions={filterOptions.actionOptions}
        blastRadiusCount={blastRadiusAddresses?.size ?? 0}
        blastRadiusFocusAddress={blastRadiusFocusAddress}
        includeNoOp={includeNoOp}
        inSelectedBlastRadiusOnly={effectiveInSelectedBlastRadiusOnly}
        module={module}
        moduleOptions={filterOptions.moduleOptions}
        onActionChange={setAction}
        onInSelectedBlastRadiusOnlyChange={setInSelectedBlastRadiusOnly}
        onIncludeNoOpChange={setIncludeNoOp}
        onModuleChange={setModule}
        onProviderChange={setProvider}
        onResourceGroupChange={setResourceGroup}
        onSearchChange={setSearch}
        onSeverityChange={setSeverity}
        provider={provider}
        providerOptions={filterOptions.providerOptions}
        resourceGroup={resourceGroup}
        resourceGroupOptions={filterOptions.resourceGroupOptions}
        search={search}
        severity={severity}
        severityOptions={filterOptions.severityOptions}
      />

      {filteredItems.length === 0 ? (
        <PlaceholderState
          title="No resources match these filters."
          description="Try clearing one or more filters to broaden the visible result set."
        />
      ) : (
        <div className="border-border bg-background overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <table
              aria-label="Terraform resource changes"
              className="min-w-[78rem] w-full border-collapse"
            >
              <thead className="bg-surface-muted">
                <tr className="border-b border-border text-left">
                  <th
                    className="text-foreground px-3 py-3 text-xs font-semibold tracking-[0.14em] uppercase"
                    title="Terraform action normalized from the resource change actions list."
                  >
                    Action
                  </th>
                  <th
                    className="text-foreground px-3 py-3 text-xs font-semibold tracking-[0.14em] uppercase"
                    title="Highest deterministic risk severity attached to this resource."
                  >
                    Risk
                  </th>
                  <th
                    className="text-foreground px-3 py-3 text-xs font-semibold tracking-[0.14em] uppercase"
                    title="Full Terraform resource address."
                  >
                    Resource address
                  </th>
                  <th className="text-foreground px-3 py-3 text-xs font-semibold tracking-[0.14em] uppercase">
                    Type
                  </th>
                  <th className="text-foreground px-3 py-3 text-xs font-semibold tracking-[0.14em] uppercase">
                    Provider
                  </th>
                  <th className="text-foreground px-3 py-3 text-xs font-semibold tracking-[0.14em] uppercase">
                    Module
                  </th>
                  <th className="text-foreground px-3 py-3 text-xs font-semibold tracking-[0.14em] uppercase">
                    Resource group
                  </th>
                  {showCostColumn ? (
                    <th
                      className="text-foreground px-3 py-3 text-xs font-semibold tracking-[0.14em] uppercase"
                      title="Estimated monthly cost delta from imported or manual cost data."
                    >
                      Cost delta
                    </th>
                  ) : null}
                  <th
                    className="text-foreground px-3 py-3 text-xs font-semibold tracking-[0.14em] uppercase"
                    title="Count of replace_paths entries reported by Terraform."
                  >
                    Replace paths count
                  </th>
                  <th
                    className="text-foreground px-3 py-3 text-xs font-semibold tracking-[0.14em] uppercase"
                    title="Whether Terraform marked one or more changed values as sensitive."
                  >
                    Sensitive change
                  </th>
                  <th
                    className="text-foreground px-3 py-3 text-xs font-semibold tracking-[0.14em] uppercase"
                    title="Approximate number of changed attributes when a readable before/after diff is available."
                  >
                    Changed attributes count
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <ResourceChangeRow
                    key={item.address}
                    copyState={
                      copyState.copiedAddress === item.address
                        ? "copied"
                        : copyState.errorAddress === item.address
                          ? "error"
                          : "idle"
                    }
                    isSelected={selectedAddress === item.address}
                    item={item}
                    onCopyAddress={() => {
                      void handleCopyAddress(item.address);
                    }}
                    onOpenDetails={() => {
                      onOpenResource?.(item.address);
                    }}
                    showCostColumn={showCostColumn}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
