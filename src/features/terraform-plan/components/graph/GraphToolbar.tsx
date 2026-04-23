"use client";

import { ExportTrustNote } from "@/features/terraform-plan/components/privacy/ExportTrustNote";
import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type { ResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import type { GraphNodeRiskLevel } from "@/features/terraform-plan/graph/graphTypes";

export interface GraphFilterOption {
  count: number;
  label: string;
  value: string;
}

interface GraphToolbarProps {
  action: ChangeActionKind | "all";
  actionOptions: GraphFilterOption[];
  exportDisabled: boolean;
  includeChangedDependencies: boolean;
  isLargeGraph: boolean;
  module: string | "all";
  moduleOptions: GraphFilterOption[];
  onActionChange: (value: ChangeActionKind | "all") => void;
  onClearFilters: () => void;
  onExportSvg: () => void;
  onFitView: () => void;
  onIncludeChangedDependenciesChange: (value: boolean) => void;
  onModuleChange: (value: string | "all") => void;
  onProviderChange: (value: string | "all") => void;
  onResetView: () => void;
  onResourceGroupChange: (value: ResourceTypeGroup | "all") => void;
  onRiskChange: (value: GraphNodeRiskLevel | "all") => void;
  onSearchChange: (value: string) => void;
  onShowChangedOnlyChange: (value: boolean) => void;
  provider: string | "all";
  providerOptions: GraphFilterOption[];
  resourceGroup: ResourceTypeGroup | "all";
  resourceGroupOptions: GraphFilterOption[];
  risk: GraphNodeRiskLevel | "all";
  riskOptions: GraphFilterOption[];
  search: string;
  showChangedOnly: boolean;
  summaryLabel: string;
}

function FilterSelect({
  label,
  name,
  onChange,
  options,
  value,
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: GraphFilterOption[];
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-foreground text-sm font-medium">{label}</span>
      <select
        aria-label={label}
        className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm"
        name={name}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </label>
  );
}

export function GraphToolbar({
  action,
  actionOptions,
  exportDisabled,
  includeChangedDependencies,
  isLargeGraph,
  module,
  moduleOptions,
  onActionChange,
  onClearFilters,
  onExportSvg,
  onFitView,
  onIncludeChangedDependenciesChange,
  onModuleChange,
  onProviderChange,
  onResetView,
  onResourceGroupChange,
  onRiskChange,
  onSearchChange,
  onShowChangedOnlyChange,
  provider,
  providerOptions,
  resourceGroup,
  resourceGroupOptions,
  risk,
  riskOptions,
  search,
  showChangedOnly,
  summaryLabel,
}: GraphToolbarProps) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">Dependency graph</h3>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-7">
            {summaryLabel}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border-border bg-background text-foreground hover:bg-surface-muted rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150"
            onClick={onFitView}
          >
            Fit view
          </button>
          <button
            type="button"
            className="border-border bg-background text-foreground hover:bg-surface-muted rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150"
            onClick={onResetView}
          >
            Reset view
          </button>
          <button
            type="button"
            className="border-border bg-background text-foreground hover:bg-surface-muted rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={exportDisabled}
            onClick={onExportSvg}
          >
            Export SVG
          </button>
          <button
            type="button"
            className="border-border bg-background text-foreground hover:bg-surface-muted rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-2 sm:col-span-2 xl:col-span-1">
          <span className="text-foreground text-sm font-medium">
            Search graph nodes
          </span>
          <input
            aria-label="Search graph nodes"
            className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by address, type, provider, or module"
            type="search"
            value={search}
          />
        </label>

        <FilterSelect
          label="Action"
          name="graph-action"
          onChange={(value) => onActionChange(value as ChangeActionKind | "all")}
          options={actionOptions}
          value={action}
        />
        <FilterSelect
          label="Risk"
          name="graph-risk"
          onChange={(value) => onRiskChange(value as GraphNodeRiskLevel | "all")}
          options={riskOptions}
          value={risk}
        />
        <FilterSelect
          label="Provider"
          name="graph-provider"
          onChange={onProviderChange}
          options={providerOptions}
          value={provider}
        />
        <FilterSelect
          label="Module"
          name="graph-module"
          onChange={onModuleChange}
          options={moduleOptions}
          value={module}
        />
        <FilterSelect
          label="Resource group"
          name="graph-resource-group"
          onChange={(value) =>
            onResourceGroupChange(value as ResourceTypeGroup | "all")
          }
          options={resourceGroupOptions}
          value={resourceGroup}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="text-foreground inline-flex items-center gap-3 text-sm font-medium">
            <input
              checked={showChangedOnly}
              className="border-border h-4 w-4 rounded"
              onChange={(event) => onShowChangedOnlyChange(event.target.checked)}
              type="checkbox"
            />
            Show only changed resources
          </label>

          <label className="text-foreground inline-flex items-center gap-3 text-sm font-medium">
            <input
              checked={includeChangedDependencies}
              className="border-border h-4 w-4 rounded disabled:cursor-not-allowed"
              disabled={!showChangedOnly}
              onChange={(event) =>
                onIncludeChangedDependenciesChange(event.target.checked)
              }
              type="checkbox"
            />
            Show dependencies of changed resources
          </label>
        </div>

        {isLargeGraph ? (
          <span className="border-warning bg-warning-soft text-warning inline-flex rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase">
            Large graph guardrails active
          </span>
        ) : null}
      </div>

      <ExportTrustNote />
    </section>
  );
}
