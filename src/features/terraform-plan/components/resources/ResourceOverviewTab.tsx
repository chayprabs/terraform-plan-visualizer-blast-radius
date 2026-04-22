import type { ReactNode } from "react";
import type {
  NormalizedResourceChange,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type {
  TerraformIndexValue,
  TerraformReplacePath,
} from "@/features/terraform-plan/domain/terraformPlanTypes";
import { getRiskActionLabel } from "@/features/terraform-plan/risk/riskCopy";
import {
  getModuleLabel,
  getResourceSeverityLabel,
} from "@/features/terraform-plan/components/resources/resourceTableModel";
import { cn } from "@/lib/utils";

interface ResourceOverviewTabProps {
  resourceChange: NormalizedResourceChange;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasSensitiveValue(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((entry) => hasSensitiveValue(entry));
  }

  if (isRecord(value)) {
    return Object.values(value).some((entry) => hasSensitiveValue(entry));
  }

  return false;
}

function formatNameIndex(
  name: string,
  index: TerraformIndexValue | null | undefined,
): string {
  if (index === null || index === undefined) {
    return name;
  }

  return `${name} [${String(index)}]`;
}

function formatReplacePath(path: TerraformReplacePath): string {
  return path.reduce<string>((current, segment) => {
    if (typeof segment === "number") {
      return `${current}[${segment}]`;
    }

    return current.length === 0 ? segment : `${current}.${segment}`;
  }, "");
}

function getSummarySentence(resourceChange: NormalizedResourceChange): string {
  switch (resourceChange.action) {
    case "create":
      return `This ${resourceChange.type} will be created.`;
    case "update":
      return `This ${resourceChange.type} will be updated in place.`;
    case "delete":
      return `This ${resourceChange.type} will be deleted.`;
    case "replace":
      return `This ${resourceChange.type} will be replaced.`;
    case "read":
      return `Terraform will read this ${resourceChange.type} during apply.`;
    case "import":
      return `This ${resourceChange.type} will be imported into state.`;
    case "forget":
      return `This ${resourceChange.type} will be removed from state.`;
    case "no-op":
      return `Terraform does not expect to change this ${resourceChange.type}.`;
    case "unknown":
    default:
      return `Terraform reported an unknown action for this ${resourceChange.type}.`;
  }
}

function OverviewField({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="border-border bg-surface rounded-lg border p-4">
      <p className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
        {label}
      </p>
      <div className={cn("text-foreground mt-2 text-sm leading-6", valueClassName)}>
        {value}
      </div>
    </div>
  );
}

export function ResourceOverviewTab({
  resourceChange,
}: ResourceOverviewTabProps) {
  const severity = resourceChange.riskSummary?.highestSeverity ?? "none";
  const hasSensitiveChange =
    hasSensitiveValue(resourceChange.beforeSensitive) ||
    hasSensitiveValue(resourceChange.afterSensitive);
  const providerLabel = resourceChange.providerShortName || "unknown";
  const fullProviderLabel = resourceChange.providerName;

  return (
    <section className="space-y-4" aria-label="Resource overview">
      <div className="border-border bg-surface rounded-lg border p-4 sm:p-5">
        <p className="text-foreground text-sm font-semibold">Summary</p>
        <p className="text-muted-foreground mt-2 text-sm leading-7">
          {getSummarySentence(resourceChange)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <OverviewField
          label="Address"
          value={resourceChange.address}
          valueClassName="break-all"
        />
        <OverviewField
          label="Action"
          value={getRiskActionLabel(resourceChange.action)}
        />
        <OverviewField
          label="Risk level"
          value={getResourceSeverityLabel(severity)}
        />
        <OverviewField label="Type" value={resourceChange.type} />
        <OverviewField
          label="Provider"
          value={
            <div>
              <p>{providerLabel}</p>
              {fullProviderLabel ? (
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  {fullProviderLabel}
                </p>
              ) : null}
            </div>
          }
        />
        <OverviewField
          label="Module"
          value={getModuleLabel(resourceChange.moduleAddress)}
        />
        <OverviewField
          label="Name/index"
          value={formatNameIndex(resourceChange.name, resourceChange.index)}
        />
        <OverviewField
          label="Sensitive change"
          value={
            <span
              className={cn(
                "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                hasSensitiveChange
                  ? "border-warning bg-warning-soft text-warning"
                  : "border-border bg-background text-muted-foreground",
              )}
              title={
                hasSensitiveChange
                  ? "Terraform marked one or more changed values as sensitive."
                  : "Terraform did not mark this resource change as sensitive."
              }
            >
              {hasSensitiveChange ? "Sensitive values masked" : "No sensitive values flagged"}
            </span>
          }
        />
      </div>

      <div className="border-border bg-surface rounded-lg border p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-foreground text-sm font-semibold">Replace paths</p>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              Terraform-reported paths that force replacement for this resource.
            </p>
          </div>
          <span className="border-border bg-background text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
            {resourceChange.replacePaths.length} path
            {resourceChange.replacePaths.length === 1 ? "" : "s"}
          </span>
        </div>

        {resourceChange.replacePaths.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {resourceChange.replacePaths.map((path, index) => (
              <li
                key={`${resourceChange.address}-replace-path-${index}`}
                className="border-border bg-background rounded-lg border px-3 py-2 text-sm text-foreground"
              >
                {formatReplacePath(path)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground mt-4 text-sm leading-6">
            Terraform did not report replace paths for this resource.
          </p>
        )}
      </div>
    </section>
  );
}
