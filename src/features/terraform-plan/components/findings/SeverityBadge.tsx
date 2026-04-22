import type { RiskSeverity } from "@/features/terraform-plan/risk/riskTypes";
import {
  getRiskSeverityLabel,
  getRiskSeverityTooltip,
} from "@/features/terraform-plan/risk/riskCopy";
import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: RiskSeverity;
}

const severityClasses: Record<RiskSeverity, string> = {
  critical: "border-critical bg-critical-soft text-critical",
  high: "border-warning bg-warning-soft text-warning",
  medium: "border-warning bg-warning-soft text-warning",
  low: "border-positive bg-positive-soft text-positive",
  info: "border-border bg-surface-muted text-muted-foreground",
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase",
        severityClasses[severity],
      )}
      title={getRiskSeverityTooltip(severity)}
    >
      {getRiskSeverityLabel(severity)}
    </span>
  );
}
