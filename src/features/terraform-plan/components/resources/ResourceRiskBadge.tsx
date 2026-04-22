import { getRiskSeverityTooltip } from "@/features/terraform-plan/risk/riskCopy";
import type { RiskSeverity } from "@/features/terraform-plan/risk/riskTypes";
import {
  getResourceSeverityLabel,
  type ResourceSeverityValue,
} from "@/features/terraform-plan/components/resources/resourceTableModel";
import { cn } from "@/lib/utils";

interface ResourceRiskBadgeProps {
  findingCount: number;
  severity: ResourceSeverityValue;
}

const severityClasses: Record<ResourceSeverityValue, string> = {
  critical: "border-critical bg-critical-soft text-critical",
  high: "border-warning bg-warning-soft text-warning",
  medium: "border-warning bg-warning-soft text-warning",
  low: "border-positive bg-positive-soft text-positive",
  info: "border-border bg-surface-muted text-muted-foreground",
  none: "border-border bg-background text-muted-foreground",
};

function getResourceRiskTooltip(
  severity: ResourceSeverityValue,
  findingCount: number,
): string {
  if (severity === "none") {
    return "No deterministic risk findings were attached to this resource.";
  }

  const baseCopy = getRiskSeverityTooltip(severity as RiskSeverity);
  const findingCopy =
    findingCount === 1
      ? "1 resource finding attached."
      : `${findingCount} resource findings attached.`;

  return `${baseCopy} ${findingCopy}`;
}

export function ResourceRiskBadge({
  findingCount,
  severity,
}: ResourceRiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase",
        severityClasses[severity],
      )}
      title={getResourceRiskTooltip(severity, findingCount)}
    >
      {getResourceSeverityLabel(severity)}
    </span>
  );
}
