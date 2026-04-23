"use client";

import { SeverityBadge } from "@/features/terraform-plan/components/findings/SeverityBadge";
import type { BlastRadiusGroup } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";

function GroupList({
  groups,
  title,
}: {
  groups: BlastRadiusGroup[];
  title: string;
}) {
  return (
    <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <h3 className="text-foreground text-base font-semibold">{title}</h3>
      {groups.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          No affected resources are available in this grouping yet.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {groups.map((group) => (
            <div
              key={group.key}
              className="border-border bg-background rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-foreground text-sm font-semibold">
                  {group.label}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase">
                    {group.totalCount} total
                  </span>
                  <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase">
                    {group.changedCount} changed
                  </span>
                  {group.highRiskCount > 0 ? (
                    <SeverityBadge severity="high" />
                  ) : null}
                </div>
              </div>
              <p className="text-muted-foreground mt-2 text-sm leading-7">
                {group.nodes.map((node) => node.id).join(", ")}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface BlastRadiusServiceGroupsProps {
  moduleGroups: BlastRadiusGroup[];
  providerGroups: BlastRadiusGroup[];
  resourceGroupGroups: BlastRadiusGroup[];
}

export function BlastRadiusServiceGroups({
  moduleGroups,
  providerGroups,
  resourceGroupGroups,
}: BlastRadiusServiceGroupsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <GroupList groups={moduleGroups} title="By module" />
      <GroupList groups={providerGroups} title="By provider" />
      <GroupList groups={resourceGroupGroups} title="By resource group" />
    </div>
  );
}
