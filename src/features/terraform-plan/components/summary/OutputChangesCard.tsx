import type { OutputChangeSummary } from "@/features/terraform-plan/domain/planDashboardSummary";
import { cn } from "@/lib/utils";

interface OutputChangesCardProps {
  summary: OutputChangeSummary;
}

const rowClasses = {
  default: "border-border bg-background text-foreground",
  positive: "border-positive bg-positive-soft text-positive",
  warning: "border-warning bg-warning-soft text-warning",
} as const;

export function OutputChangesCard({ summary }: OutputChangesCardProps) {
  const rows = [
    {
      label: "Created",
      tone: "positive" as const,
      tooltip: "Create means Terraform will add a new output value.",
      value: summary.createdCount,
    },
    {
      label: "Updated",
      tone: "default" as const,
      tooltip: "Update means Terraform will change an existing output value.",
      value: summary.updatedCount,
    },
    {
      label: "Deleted",
      tone: "warning" as const,
      tooltip: "Delete means Terraform will remove an existing output value.",
      value: summary.deletedCount,
    },
    {
      label: "Sensitive flagged",
      tone: "default" as const,
      tooltip:
        "Sensitive means Terraform marked the output as sensitive in before_sensitive or after_sensitive metadata.",
      value: summary.sensitiveCount,
    },
  ];

  return (
    <section className="border-border bg-surface rounded-lg border p-4">
      <div>
        <p
          className="text-foreground text-sm font-semibold"
          title="Output changes summarize Terraform outputs that will be created, updated, or deleted."
        >
          Output changes
        </p>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          {summary.totalCount > 0
            ? `${summary.totalCount} outputs are changing in this plan.`
            : "No output changes are present in this plan."}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className={cn("rounded-lg border px-3 py-3", rowClasses[row.tone])}
          >
            <p className="text-sm font-medium" title={row.tooltip}>
              {row.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{row.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
