import type { WorkflowRiskSeverity } from "@/features/gha-analyzer/risk/riskTypes";
import { cn } from "@/lib/utils";

const severityClasses: Record<WorkflowRiskSeverity, string> = {
  critical: "border-critical bg-critical-soft text-critical",
  high: "border-warning bg-warning-soft text-warning",
  medium: "border-warning bg-warning-soft text-warning",
  low: "border-positive bg-positive-soft text-positive",
  info: "border-border bg-surface-muted text-muted-foreground",
};

const severityLabels: Record<WorkflowRiskSeverity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

interface GhaSeverityBadgeProps {
  severity: WorkflowRiskSeverity;
}

export function GhaSeverityBadge({ severity }: GhaSeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase",
        severityClasses[severity],
      )}
    >
      {severityLabels[severity]}
    </span>
  );
}
