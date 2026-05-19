import type { ManifestRiskSeverity } from "@/features/k8s-analyzer/risk/riskTypes";
import { cn } from "@/lib/utils";

const severityClasses: Record<ManifestRiskSeverity, string> = {
  critical: "border-critical bg-critical-soft text-critical",
  high: "border-critical bg-critical-soft text-critical",
  medium: "border-warning bg-warning-soft text-warning",
  low: "border-border bg-surface-muted text-foreground",
  info: "border-border bg-surface-muted text-muted-foreground",
};

interface SeverityBadgeProps {
  severity: ManifestRiskSeverity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        severityClasses[severity],
      )}
    >
      {severity}
    </span>
  );
}
