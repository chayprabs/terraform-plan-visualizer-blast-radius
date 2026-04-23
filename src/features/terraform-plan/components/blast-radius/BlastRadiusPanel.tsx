"use client";

import { BlastRadiusPathList } from "@/features/terraform-plan/components/blast-radius/BlastRadiusPathList";
import { BlastRadiusReport } from "@/features/terraform-plan/components/blast-radius/BlastRadiusReport";
import { BlastRadiusResourcePicker } from "@/features/terraform-plan/components/blast-radius/BlastRadiusResourcePicker";
import { BlastRadiusServiceGroups } from "@/features/terraform-plan/components/blast-radius/BlastRadiusServiceGroups";
import { BlastRadiusSummary } from "@/features/terraform-plan/components/blast-radius/BlastRadiusSummary";
import type { BlastRadiusAnalysis } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";

interface BlastRadiusPanelProps {
  analysis: BlastRadiusAnalysis | null;
  hasAnalyzed: boolean;
  onSelectFocus: (address: string | null) => void;
}

function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="border-border bg-surface-muted rounded-lg border p-5">
      <p className="text-foreground text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground mt-2 text-sm leading-7">
        {description}
      </p>
    </div>
  );
}

export function BlastRadiusPanel({
  analysis,
  hasAnalyzed,
  onSelectFocus,
}: BlastRadiusPanelProps) {
  if (!hasAnalyzed || !analysis) {
    return (
      <EmptyState
        title="Analyze a Terraform plan to inspect blast radius."
        description="Blast-radius mode uses the local dependency graph and risk engine to summarize upstream dependencies, downstream dependents, and affected service groups."
      />
    );
  }

  return (
    <section className="space-y-4" aria-label="Terraform blast radius analysis">
      <div className="border-border bg-background rounded-lg border p-4 sm:p-5">
        <h2 className="text-foreground text-lg font-semibold">Blast Radius</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-7">
          Pick a changed resource to review what it depends on, what depends on
          it, how much of the connected graph is involved, and which services
          deserve the closest review.
        </p>
      </div>

      <BlastRadiusResourcePicker
        focusAddress={analysis.focusAddress}
        onChange={onSelectFocus}
        options={analysis.changedFocusOptions}
      />

      <BlastRadiusSummary analysis={analysis} />

      {analysis.focusNode ? (
        <>
          <BlastRadiusServiceGroups
            moduleGroups={analysis.moduleGroups}
            providerGroups={analysis.providerGroups}
            resourceGroupGroups={analysis.resourceGroupGroups}
          />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <BlastRadiusPathList paths={analysis.criticalPaths} />
            <BlastRadiusReport analysis={analysis} />
          </div>
        </>
      ) : null}
    </section>
  );
}
