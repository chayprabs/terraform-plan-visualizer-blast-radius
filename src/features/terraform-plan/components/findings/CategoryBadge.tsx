import type { RiskCategory } from "@/features/terraform-plan/risk/riskTypes";
import {
  getRiskCategoryLabel,
  getRiskCategoryTooltip,
} from "@/features/terraform-plan/risk/riskCopy";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  category: RiskCategory;
}

const categoryToneClasses: Partial<Record<RiskCategory, string>> = {
  destructive: "border-critical bg-critical-soft text-critical",
  replacement: "border-warning bg-warning-soft text-warning",
  database: "border-critical bg-critical-soft text-critical",
  public_access: "border-warning bg-warning-soft text-warning",
  secrets: "border-warning bg-warning-soft text-warning",
  encryption: "border-warning bg-warning-soft text-warning",
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[0.7rem] font-medium text-muted-foreground",
        categoryToneClasses[category],
      )}
      title={getRiskCategoryTooltip(category)}
    >
      {getRiskCategoryLabel(category)}
    </span>
  );
}
