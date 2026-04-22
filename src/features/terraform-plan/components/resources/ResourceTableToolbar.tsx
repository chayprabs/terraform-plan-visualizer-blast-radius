import {
  RESOURCE_TABLE_SORT_FIELDS,
  type ResourceTableSortField,
} from "@/features/terraform-plan/components/resources/resourceTableModel";
import { cn } from "@/lib/utils";

interface ResourceTableToolbarProps {
  copyState: "copied" | "error" | "idle";
  onCopyFiltered: () => void;
  onSortByChange: (value: ResourceTableSortField) => void;
  showNoOpHint: boolean;
  sortBy: ResourceTableSortField;
  summaryLabel: string;
}

const sortLabels: Record<ResourceTableSortField, string> = {
  risk: "Risk",
  action: "Action",
  provider: "Provider",
  type: "Type",
  address: "Address",
};

export function ResourceTableToolbar({
  copyState,
  onCopyFiltered,
  onSortByChange,
  showNoOpHint,
  sortBy,
  summaryLabel,
}: ResourceTableToolbarProps) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            Resource changes
          </h3>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            {summaryLabel}
          </p>
          {showNoOpHint ? (
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              No-op resources are hidden by default for larger plans.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="space-y-2">
            <span className="text-foreground text-sm font-medium">Sort by</span>
            <select
              className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm sm:min-w-40"
              aria-label="Sort resources"
              value={sortBy}
              onChange={(event) =>
                onSortByChange(event.target.value as ResourceTableSortField)
              }
            >
              {RESOURCE_TABLE_SORT_FIELDS.map((value) => (
                <option key={value} value={value}>
                  {sortLabels[value]}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={cn(
              "inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              copyState === "copied" &&
                "border-positive bg-positive-soft text-positive",
              copyState === "error" &&
                "border-critical bg-critical-soft text-critical",
              copyState === "idle" &&
                "border-border bg-background text-foreground hover:bg-surface-muted",
            )}
            onClick={onCopyFiltered}
          >
            {copyState === "copied"
              ? "Copied filtered resources"
              : copyState === "error"
                ? "Copy failed"
                : "Copy filtered resource list"}
          </button>
        </div>
      </div>
    </section>
  );
}
