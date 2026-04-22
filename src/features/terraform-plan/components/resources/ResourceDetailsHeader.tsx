import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { ResourceActionBadge } from "@/features/terraform-plan/components/resources/ResourceActionBadge";
import { ResourceRiskBadge } from "@/features/terraform-plan/components/resources/ResourceRiskBadge";
import {
  getModuleLabel,
} from "@/features/terraform-plan/components/resources/resourceTableModel";
import { cn } from "@/lib/utils";

interface ResourceDetailsHeaderProps {
  copyState: "copied" | "error" | "idle";
  onClose: () => void;
  onCopyAddress: () => void;
  resourceChange: NormalizedResourceChange;
  titleId: string;
}

function getCloseButtonLabel(): string {
  return "Close resource details";
}

export function ResourceDetailsHeader({
  copyState,
  onClose,
  onCopyAddress,
  resourceChange,
  titleId,
}: ResourceDetailsHeaderProps) {
  const severity = resourceChange.riskSummary?.highestSeverity ?? "none";
  const findingCount = resourceChange.riskSummary?.findings.length ?? 0;

  return (
    <div className="border-border border-b px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm font-medium tracking-[0.18em] uppercase">
              Resource details
            </p>
            <h3
              id={titleId}
              className="text-foreground mt-2 break-all text-lg font-semibold sm:text-xl"
            >
              {resourceChange.address}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {resourceChange.type} in {getModuleLabel(resourceChange.moduleAddress)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={cn(
                "inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                copyState === "copied" &&
                  "border-positive bg-positive-soft text-positive",
                copyState === "error" &&
                  "border-critical bg-critical-soft text-critical",
                copyState === "idle" &&
                  "border-border bg-background text-foreground hover:bg-surface-muted",
              )}
              onClick={onCopyAddress}
              aria-label={`Copy resource address ${resourceChange.address}`}
            >
              {copyState === "copied"
                ? "Copied address"
                : copyState === "error"
                  ? "Copy failed"
                  : "Copy address"}
            </button>

            <button
              type="button"
              className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors"
              onClick={onClose}
              aria-label={getCloseButtonLabel()}
              title={getCloseButtonLabel()}
            >
              X
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ResourceActionBadge action={resourceChange.action} />
          <ResourceRiskBadge findingCount={findingCount} severity={severity} />
          <span
            className="border-border bg-background text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase"
            title="Terraform provider and module scope."
          >
            {resourceChange.providerShortName || "unknown"} /{" "}
            {getModuleLabel(resourceChange.moduleAddress)}
          </span>
        </div>
      </div>
    </div>
  );
}
