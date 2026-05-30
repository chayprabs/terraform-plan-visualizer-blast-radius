"use client";

import { PlanMetricsProvider } from "@/features/terraform-plan/context/planMetricsContext";
import { WorkspaceShell } from "@/features/terraform-plan/components/workspace-shell";

export function TerraformPlanHome() {
  return (
    <PlanMetricsProvider>
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <WorkspaceShell />
      </div>
    </PlanMetricsProvider>
  );
}
