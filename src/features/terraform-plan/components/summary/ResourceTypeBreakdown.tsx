import type { ResourceTypeBreakdownRow } from "@/features/terraform-plan/domain/planDashboardSummary";
import { cn } from "@/lib/utils";

interface ResourceTypeBreakdownProps {
  rows: ResourceTypeBreakdownRow[];
}

export function ResourceTypeBreakdown({ rows }: ResourceTypeBreakdownProps) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4">
      <div>
        <p
          className="text-foreground text-sm font-semibold"
          title="Resource type groups bucket Terraform resource types into review-oriented categories."
        >
          Resource type groups
        </p>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          Count IAM, network, database, storage, compute, DNS, KMS, and unknown resource families.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <article key={row.group} className="border-border rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-foreground text-sm font-semibold">{row.label}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  {row.resourceTypes.length > 0
                    ? row.resourceTypes.join(", ")
                    : "No matching resource types"}
                </p>
              </div>
              <span className="text-foreground text-2xl font-semibold tracking-tight">
                {row.resourceCount}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span
                className="text-muted-foreground text-xs font-medium uppercase tracking-[0.16em]"
                title="Delete and replace actions for this resource group."
              >
                Destructive
              </span>
              <span
                className={cn(
                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                  row.destructiveCount > 0
                    ? "border-warning bg-warning-soft text-warning"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                {row.destructiveCount}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
