import type { ModuleBreakdownRow } from "@/features/terraform-plan/domain/planDashboardSummary";
import { cn } from "@/lib/utils";

interface ModuleBreakdownProps {
  rows: ModuleBreakdownRow[];
}

export function ModuleBreakdown({ rows }: ModuleBreakdownProps) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4">
      <div>
        <p
          className="text-foreground text-sm font-semibold"
          title="Modules roll resource counts up by Terraform module path, starting at the root module."
        >
          Module breakdown
        </p>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          Review root and child modules side by side to spot where change volume is concentrated.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm leading-6">
          No module changes are available for this plan.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-left">
                <th className="pb-2 font-medium">Module</th>
                <th
                  className="pb-2 text-right font-medium"
                  title="Resources attached to this module path in the plan."
                >
                  Count
                </th>
                <th
                  className="pb-2 text-right font-medium"
                  title="Delete and replace actions for this module path."
                >
                  Destructive
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-border border-b last:border-b-0">
                  <td className="py-3">
                    <p
                      className="text-foreground font-medium"
                      style={{ paddingLeft: `${row.depth * 0.75}rem` }}
                    >
                      {row.label}
                    </p>
                  </td>
                  <td className="text-foreground py-3 text-right font-medium">
                    {row.resourceCount}
                  </td>
                  <td className="py-3 text-right">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
