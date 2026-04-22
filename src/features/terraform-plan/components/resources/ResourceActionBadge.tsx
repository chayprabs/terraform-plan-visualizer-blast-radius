import type { ChangeActionKind } from "@/features/terraform-plan/domain/actionTypes";
import {
  getRiskActionLabel,
  getRiskActionTooltip,
} from "@/features/terraform-plan/risk/riskCopy";
import { cn } from "@/lib/utils";

interface ResourceActionBadgeProps {
  action: ChangeActionKind;
}

const actionClasses: Record<ChangeActionKind, string> = {
  create: "border-positive bg-positive-soft text-positive",
  update: "border-warning bg-warning-soft text-warning",
  delete: "border-critical bg-critical-soft text-critical",
  replace: "border-critical bg-critical-soft text-critical",
  read: "border-border bg-surface-muted text-muted-foreground",
  "no-op": "border-border bg-surface-muted text-muted-foreground",
  import: "border-positive bg-positive-soft text-positive",
  forget: "border-warning bg-warning-soft text-warning",
  unknown: "border-border bg-surface-muted text-muted-foreground",
};

export function ResourceActionBadge({ action }: ResourceActionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase",
        actionClasses[action],
      )}
      title={getRiskActionTooltip(action)}
    >
      {getRiskActionLabel(action)}
    </span>
  );
}
