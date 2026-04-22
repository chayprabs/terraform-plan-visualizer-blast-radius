import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import type { ResourceTypeGroup } from "@/features/terraform-plan/domain/providerTypes";
import type { RiskSeverity } from "@/features/terraform-plan/risk/riskTypes";
import type { ResourceFilterOption } from "@/features/terraform-plan/components/resources/resourceTableModel";

type ResourceSeverityFilter = RiskSeverity | "none" | "all";

interface ResourceFiltersProps {
  action: ChangeActionKind | "all";
  actionOptions: ResourceFilterOption[];
  includeNoOp: boolean;
  module: string | "all";
  moduleOptions: ResourceFilterOption[];
  onActionChange: (value: ChangeActionKind | "all") => void;
  onIncludeNoOpChange: (value: boolean) => void;
  onModuleChange: (value: string | "all") => void;
  onProviderChange: (value: string | "all") => void;
  onResourceGroupChange: (value: ResourceTypeGroup | "all") => void;
  onSearchChange: (value: string) => void;
  onSeverityChange: (value: ResourceSeverityFilter) => void;
  provider: string | "all";
  providerOptions: ResourceFilterOption[];
  resourceGroup: ResourceTypeGroup | "all";
  resourceGroupOptions: ResourceFilterOption[];
  search: string;
  severity: ResourceSeverityFilter;
  severityOptions: ResourceFilterOption[];
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
  options: ResourceFilterOption[];
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-foreground text-sm font-medium">{label}</span>
      <select
        className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm"
        aria-label={label}
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

export function ResourceFilters({
  action,
  actionOptions,
  includeNoOp,
  module,
  moduleOptions,
  onActionChange,
  onIncludeNoOpChange,
  onModuleChange,
  onProviderChange,
  onResourceGroupChange,
  onSearchChange,
  onSeverityChange,
  provider,
  providerOptions,
  resourceGroup,
  resourceGroupOptions,
  search,
  severity,
  severityOptions,
}: ResourceFiltersProps) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-2 sm:col-span-2 xl:col-span-1">
          <span className="text-foreground text-sm font-medium">
            Search resources
          </span>
          <input
            type="search"
            className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search resources"
            placeholder="Search address, type, module, or provider"
          />
        </label>

        <FilterSelect
          label="Action"
          name="resource-action"
          onChange={(value) => onActionChange(value as ChangeActionKind | "all")}
          options={actionOptions}
          value={action}
        />
        <FilterSelect
          label="Severity"
          name="resource-severity"
          onChange={(value) => onSeverityChange(value as ResourceSeverityFilter)}
          options={severityOptions}
          value={severity}
        />
        <FilterSelect
          label="Provider"
          name="resource-provider"
          onChange={onProviderChange}
          options={providerOptions}
          value={provider}
        />
        <FilterSelect
          label="Module"
          name="resource-module"
          onChange={onModuleChange}
          options={moduleOptions}
          value={module}
        />
        <FilterSelect
          label="Resource group"
          name="resource-group"
          onChange={(value) =>
            onResourceGroupChange(value as ResourceTypeGroup | "all")
          }
          options={resourceGroupOptions}
          value={resourceGroup}
        />
      </div>

      <label className="text-foreground mt-4 inline-flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          className="border-border h-4 w-4 rounded"
          checked={includeNoOp}
          onChange={(event) => onIncludeNoOpChange(event.target.checked)}
        />
        Include no-op resources
      </label>
    </section>
  );
}
