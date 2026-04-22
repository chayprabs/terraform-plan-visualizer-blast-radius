import type { RiskFinding } from "@/features/terraform-plan/risk/riskTypes";
import { CategoryBadge } from "@/features/terraform-plan/components/findings/CategoryBadge";
import { FindingDetails } from "@/features/terraform-plan/components/findings/FindingDetails";
import { getFindingResourceLabel } from "@/features/terraform-plan/components/findings/findingPresentation";
import { SeverityBadge } from "@/features/terraform-plan/components/findings/SeverityBadge";
import { cn } from "@/lib/utils";

interface FindingCardProps {
  copyState: "copied" | "error" | "idle";
  evidence: string[];
  finding: RiskFinding;
  onCopy: () => void;
  onOpenResourceAddress?: () => void;
}

export function FindingCard({
  copyState,
  evidence,
  finding,
  onCopy,
  onOpenResourceAddress,
}: FindingCardProps) {
  return (
    <article className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <SeverityBadge severity={finding.severity} />
          <CategoryBadge category={finding.category} />
        </div>

        <button
          type="button"
          className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          onClick={onCopy}
          aria-label={`Copy finding ${finding.title}`}
        >
          {copyState === "copied"
            ? "Copied"
            : copyState === "error"
              ? "Copy failed"
              : "Copy finding"}
        </button>
      </div>

      <h4 className="text-foreground mt-4 text-lg font-semibold tracking-tight">
        {finding.title}
      </h4>
      {onOpenResourceAddress && finding.resourceAddress ? (
        <button
          type="button"
          className={cn(
            "text-muted-foreground mt-2 break-all text-left text-sm leading-6 underline-offset-4 hover:text-foreground hover:underline",
          )}
          onClick={onOpenResourceAddress}
        >
          {getFindingResourceLabel(finding)}
        </button>
      ) : (
        <p className="text-muted-foreground mt-2 break-all text-sm leading-6">
          {getFindingResourceLabel(finding)}
        </p>
      )}

      <FindingDetails evidence={evidence} finding={finding} />
    </article>
  );
}
