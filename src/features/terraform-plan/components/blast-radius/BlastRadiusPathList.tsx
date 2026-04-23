"use client";

import { SeverityBadge } from "@/features/terraform-plan/components/findings/SeverityBadge";
import type { BlastRadiusCriticalPath } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";

interface BlastRadiusPathListProps {
  paths: BlastRadiusCriticalPath[];
}

export function BlastRadiusPathList({ paths }: BlastRadiusPathListProps) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div>
        <h3 className="text-foreground text-base font-semibold">
          Critical dependency paths
        </h3>
        <p className="text-muted-foreground mt-2 text-sm leading-7">
          These paths follow the graph direction of dependency to dependent and
          help explain how a focused change can propagate through the plan.
        </p>
      </div>

      {paths.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm leading-7">
          No explicit paths are available for this focus resource yet.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {paths.map((path) => (
            <div
              key={path.id}
              className="border-border bg-background rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                  {path.nodeIds.length} nodes
                </span>
                <span className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
                  {path.changedCount} changed
                </span>
                {path.highestRiskSeverity ? (
                  <SeverityBadge severity={path.highestRiskSeverity} />
                ) : null}
              </div>
              <p className="text-foreground mt-3 break-words font-mono text-sm leading-7">
                {path.label}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
