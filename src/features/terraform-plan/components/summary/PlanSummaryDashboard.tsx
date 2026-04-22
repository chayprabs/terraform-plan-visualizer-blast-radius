import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import {
  buildOverallRiskSummary,
  buildModuleBreakdownRows,
  buildOutputChangeSummary,
  buildProviderBreakdownRows,
  buildResourceTypeBreakdownRows,
  buildSummaryMetrics,
  buildTerraformVersionSummary,
  hasMeaningfulResourceChanges,
} from "@/features/terraform-plan/domain/planDashboardSummary";
import { ModuleBreakdown } from "@/features/terraform-plan/components/summary/ModuleBreakdown";
import { OutputChangesCard } from "@/features/terraform-plan/components/summary/OutputChangesCard";
import { ProviderBreakdown } from "@/features/terraform-plan/components/summary/ProviderBreakdown";
import { ResourceTypeBreakdown } from "@/features/terraform-plan/components/summary/ResourceTypeBreakdown";
import { SummaryMetricCard } from "@/features/terraform-plan/components/summary/SummaryMetricCard";
import { TerraformVersionCard } from "@/features/terraform-plan/components/summary/TerraformVersionCard";
import { getRiskLevelTone } from "@/features/terraform-plan/risk/riskCopy";
import { cn } from "@/lib/utils";

interface PlanSummaryDashboardProps {
  hasAnalyzed: boolean;
  normalizedPlan: NormalizedPlan | null;
}

export function PlanSummaryDashboard({
  hasAnalyzed,
  normalizedPlan,
}: PlanSummaryDashboardProps) {
  if (!hasAnalyzed || !normalizedPlan) {
    return (
      <div className="border-border bg-surface-muted rounded-lg border border-dashed p-5">
        <p className="text-foreground text-sm font-semibold">
          Analyze a Terraform plan to see the change summary.
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-7">
          Resource counts, provider breakdowns, modules, output changes, and version metadata will appear here after analysis.
        </p>
      </div>
    );
  }

  const metrics = buildSummaryMetrics(normalizedPlan);
  const providerRows = buildProviderBreakdownRows(normalizedPlan.providers);
  const moduleRows = buildModuleBreakdownRows(normalizedPlan.modules);
  const resourceTypeRows = buildResourceTypeBreakdownRows(
    normalizedPlan.resourceTypeGroups,
  );
  const outputSummary = buildOutputChangeSummary(normalizedPlan.outputChanges);
  const versionSummary = buildTerraformVersionSummary(normalizedPlan);
  const overallRisk = buildOverallRiskSummary(normalizedPlan);
  const hasChanges = hasMeaningfulResourceChanges(normalizedPlan.summary);
  const overallRiskTone = getRiskLevelTone(overallRisk.level);

  return (
    <div className="space-y-4" aria-label="Plan summary dashboard">
      {!hasChanges ? (
        <div className="border-border bg-surface-muted rounded-lg border p-4">
          <p className="text-foreground text-sm font-semibold">
            No resource changes detected.
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-7">
            Terraform did not plan any creates, updates, deletes, replacements, or imports in this run.
          </p>
        </div>
      ) : null}

      <section className="border-border bg-surface rounded-lg border p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="text-foreground text-sm font-semibold"
              title="Overall risk combines deterministic findings into a 0-100 score capped from finding severity weights."
            >
              Overall risk level
            </p>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Score: {overallRisk.score}/100 across {overallRisk.totalFindings} findings.
            </p>
          </div>
          <span
            className={cn(
              "inline-flex rounded-full border px-3 py-1 text-sm font-semibold uppercase",
              overallRiskTone === "critical" &&
                "border-critical bg-critical-soft text-critical",
              overallRiskTone === "warning" &&
                "border-warning bg-warning-soft text-warning",
              overallRiskTone === "positive" &&
                "border-positive bg-positive-soft text-positive",
              overallRiskTone === "default" &&
                "border-border bg-background text-foreground",
            )}
          >
            {overallRisk.level}
          </span>
        </div>

        <p className="text-foreground mt-4 text-3xl font-semibold tracking-tight">
          {overallRisk.highRiskFindingCount}
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Critical and high-severity findings in this plan.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <SummaryMetricCard
            key={metric.key}
            description={metric.description}
            label={metric.label}
            prominent={metric.prominent}
            tone={metric.tone}
            tooltip={metric.tooltip}
            value={metric.value}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ProviderBreakdown rows={providerRows} />
        <ModuleBreakdown rows={moduleRows} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <ResourceTypeBreakdown rows={resourceTypeRows} />
        <div className="grid gap-4">
          <OutputChangesCard summary={outputSummary} />
          <TerraformVersionCard summary={versionSummary} />
        </div>
      </div>
    </div>
  );
}
