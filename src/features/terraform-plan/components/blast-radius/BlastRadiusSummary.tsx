"use client";

import { ResourceActionBadge } from "@/features/terraform-plan/components/resources/ResourceActionBadge";
import { SeverityBadge } from "@/features/terraform-plan/components/findings/SeverityBadge";
import type { BlastRadiusAnalysis } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border-border bg-background rounded-lg border p-4">
      <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
        {label}
      </p>
      <p className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

interface BlastRadiusSummaryProps {
  analysis: BlastRadiusAnalysis;
}

export function BlastRadiusSummary({ analysis }: BlastRadiusSummaryProps) {
  if (!analysis.focusNode || !analysis.focusResourceChange) {
    return (
      <div className="border-border bg-surface-muted rounded-lg border p-5">
        <p className="text-foreground text-sm font-semibold">
          Select a focus resource to calculate blast radius.
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-7">
          The summary will show direct changes, possibly affected dependencies,
          connected component size, and the highest risk severity once a changed
          resource is selected.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="border-border bg-surface rounded-lg border p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm font-medium tracking-[0.18em] uppercase">
              Blast radius summary
            </p>
            <h3 className="text-foreground mt-2 break-all text-lg font-semibold tracking-tight">
              {analysis.focusNode.id}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <ResourceActionBadge action={analysis.focusResourceChange.action} />
            {analysis.highestRiskSeverity ? (
              <SeverityBadge severity={analysis.highestRiskSeverity} />
            ) : (
              <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase">
                No risk
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Upstream dependencies"
          value={analysis.upstream.length}
        />
        <MetricCard
          label="Downstream dependents"
          value={analysis.downstream.length}
        />
        <MetricCard
          label="Connected component size"
          value={analysis.connectedComponent.length}
        />
        <MetricCard
          label="Directly changed"
          value={analysis.directChangedNodes.length}
        />
        <MetricCard
          label="Possibly affected"
          value={analysis.possiblyAffectedNodes.length}
        />
        <MetricCard
          label="High-risk resources"
          value={analysis.highRiskNodes.length}
        />
      </div>
    </section>
  );
}
