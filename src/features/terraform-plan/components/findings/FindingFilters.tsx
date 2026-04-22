import type {
  RiskActionKind,
  RiskCategory,
  RiskSeverity,
} from "@/features/terraform-plan/risk/riskTypes";
import { cn } from "@/lib/utils";

export interface FindingFilterOption {
  count: number;
  label: string;
  value: string;
}

export type FindingGroupMode = "resource" | "severity";

interface FindingFiltersProps {
  actionKind: RiskActionKind | "all";
  actionOptions: FindingFilterOption[];
  category: RiskCategory | "all";
  categoryOptions: FindingFilterOption[];
  groupBy: FindingGroupMode;
  highRiskOnly: boolean;
  highRiskSummary: string;
  onActionKindChange: (value: RiskActionKind | "all") => void;
  onCategoryChange: (value: RiskCategory | "all") => void;
  onGroupByChange: (value: FindingGroupMode) => void;
  onHighRiskOnlyChange: (value: boolean) => void;
  onSearchChange: (value: string) => void;
  onSeverityChange: (value: RiskSeverity | "all") => void;
  search: string;
  severity: RiskSeverity | "all";
  severityOptions: FindingFilterOption[];
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
  options: FindingFilterOption[];
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

export function FindingFilters({
  actionKind,
  actionOptions,
  category,
  categoryOptions,
  groupBy,
  highRiskOnly,
  highRiskSummary,
  onActionKindChange,
  onCategoryChange,
  onGroupByChange,
  onHighRiskOnlyChange,
  onSearchChange,
  onSeverityChange,
  search,
  severity,
  severityOptions,
  summaryLabel,
}: FindingFiltersProps) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            Filter findings
          </h3>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            {summaryLabel}
          </p>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            {highRiskSummary}
          </p>
        </div>

        <div
          className="border-border bg-background inline-flex rounded-lg border p-1"
          role="group"
          aria-label="Finding group mode"
        >
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              groupBy === "severity"
                ? "bg-surface text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onGroupByChange("severity")}
            aria-pressed={groupBy === "severity"}
            title="Group findings by severity so the highest-risk issues stay at the top."
          >
            Group by severity
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              groupBy === "resource"
                ? "bg-surface text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onGroupByChange("resource")}
            aria-pressed={groupBy === "resource"}
            title="Group findings by resource address to review all issues for one resource together."
          >
            Group by resource
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 sm:col-span-2 xl:col-span-1">
          <span className="text-foreground text-sm font-medium">
            Search findings
          </span>
          <input
            type="search"
            className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search findings"
            placeholder="Search title, address, or type"
          />
        </label>

        <FilterSelect
          label="Severity"
          name="severity"
          onChange={(value) => onSeverityChange(value as RiskSeverity | "all")}
          options={severityOptions}
          value={severity}
        />
        <FilterSelect
          label="Category"
          name="category"
          onChange={(value) => onCategoryChange(value as RiskCategory | "all")}
          options={categoryOptions}
          value={category}
        />
        <FilterSelect
          label="Action kind"
          name="action-kind"
          onChange={(value) => onActionKindChange(value as RiskActionKind | "all")}
          options={actionOptions}
          value={actionKind}
        />
      </div>

      <label className="text-foreground mt-4 inline-flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          className="border-border h-4 w-4 rounded"
          checked={highRiskOnly}
          onChange={(event) => onHighRiskOnlyChange(event.target.checked)}
        />
        Show high risk only
      </label>
    </section>
  );
}
