import type { ProviderBreakdownRow } from "@/features/terraform-plan/domain/planDashboardSummary";
import { cn } from "@/lib/utils";

interface ProviderBreakdownProps {
  rows: ProviderBreakdownRow[];
}

export function ProviderBreakdown({ rows }: ProviderBreakdownProps) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4">
      <div>
        <p
          className="text-foreground text-sm font-semibold"
          title="Providers are grouped by the short name Terraform derives from provider_name."
        >
          Provider breakdown
        </p>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          Count resources by provider and highlight delete-or-replace activity.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm leading-6">
          No provider data is available for this plan.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-left">
                <th className="pb-2 font-medium">Provider</th>
                <th
                  className="pb-2 text-right font-medium"
                  title="Total resources associated with this provider in the plan."
                >
                  Count
                </th>
                <th
                  className="pb-2 text-right font-medium"
                  title="Delete and replace actions for this provider."
                >
                  Destructive
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.providerShortName}
                  className="border-border border-b last:border-b-0"
                >
                  <td className="py-3">
                    <p className="text-foreground font-medium">
                      {row.providerShortName}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      {row.resourceTypes.join(", ")}
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
