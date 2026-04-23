"use client";

import { ResourceActionBadge } from "@/features/terraform-plan/components/resources/ResourceActionBadge";
import { SeverityBadge } from "@/features/terraform-plan/components/findings/SeverityBadge";
import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";

interface BlastRadiusResourcePickerProps {
  focusAddress: string | null;
  onChange: (address: string | null) => void;
  options: NormalizedResourceChange[];
}

export function BlastRadiusResourcePicker({
  focusAddress,
  onChange,
  options,
}: BlastRadiusResourcePickerProps) {
  if (options.length === 0) {
    return (
      <div className="border-border bg-surface-muted rounded-lg border p-4">
        <p className="text-foreground text-sm font-semibold">
          No changed resources are available to analyze.
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-7">
          Terraform did not report any `resource_changes`, so there is no blast
          radius focus resource to select.
        </p>
      </div>
    );
  }

  const selectedOption =
    options.find((option) => option.address === focusAddress) ?? null;

  return (
    <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="min-w-0 flex-1 space-y-2">
          <span className="text-foreground text-sm font-medium">
            Focus resource
          </span>
          <select
            className="border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm"
            aria-label="Blast radius focus resource"
            onChange={(event) =>
              onChange(event.target.value.length > 0 ? event.target.value : null)
            }
            value={focusAddress ?? ""}
          >
            <option value="">Select a changed resource</option>
            {options.map((resourceChange) => (
              <option key={resourceChange.address} value={resourceChange.address}>
                {resourceChange.address}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="border-border bg-background text-foreground inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-55"
          disabled={!focusAddress}
          onClick={() => onChange(null)}
        >
          Clear focus
        </button>
      </div>

      {selectedOption ? (
        <div className="border-border bg-background mt-4 rounded-lg border p-4">
          <p className="text-foreground break-all text-sm font-semibold">
            {selectedOption.address}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ResourceActionBadge action={selectedOption.action} />
            {selectedOption.riskSummary?.highestSeverity ? (
              <SeverityBadge severity={selectedOption.riskSummary.highestSeverity} />
            ) : (
              <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase">
                No risk
              </span>
            )}
            <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase">
              {selectedOption.providerShortName}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground mt-4 text-sm leading-7">
          Choose any changed resource to inspect its upstream dependencies,
          downstream dependents, critical paths, and grouped affected services.
        </p>
      )}
    </section>
  );
}
