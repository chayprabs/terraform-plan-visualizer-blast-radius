"use client";

import { useEffect, useMemo, useState } from "react";
import { ExportTrustNote } from "@/features/terraform-plan/components/privacy/ExportTrustNote";
import { usePrivacyRedaction } from "@/features/terraform-plan/components/privacy/PrivacyRedactionContext";
import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { redactTerraformResourceChangeRaw } from "@/features/terraform-plan/privacy/redactTerraformPlan";
import { cn } from "@/lib/utils";

interface ResourceRawJsonTabProps {
  resourceChange: NormalizedResourceChange;
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.append(helper);
    helper.select();

    const copied = document.execCommand("copy");
    helper.remove();

    return copied;
  } catch {
    return false;
  }
}

export function ResourceRawJsonTab({
  resourceChange,
}: ResourceRawJsonTabProps) {
  const { settings } = usePrivacyRedaction();
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">("idle");
  const displayRedactedJson = useMemo(
    () =>
      redactTerraformResourceChangeRaw(resourceChange.raw, {
        scope: "display",
        settings,
      }),
    [resourceChange.raw, settings],
  );
  const exportRedactedJson = useMemo(
    () =>
      redactTerraformResourceChangeRaw(resourceChange.raw, {
        scope: "export",
        settings,
      }),
    [resourceChange.raw, settings],
  );
  const displayRedactedJsonText = useMemo(
    () => JSON.stringify(displayRedactedJson, null, 2),
    [displayRedactedJson],
  );
  const exportRedactedJsonText = useMemo(
    () => JSON.stringify(exportRedactedJson, null, 2),
    [exportRedactedJson],
  );

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const handleCopy = async () => {
    const copied = await copyText(exportRedactedJsonText);
    setCopyState(copied ? "copied" : "error");
  };

  return (
    <section className="space-y-4" aria-label="Resource raw JSON">
      <div className="border-border bg-surface rounded-lg border p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-foreground text-sm font-semibold">Redacted resource JSON</p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Sensitive values are masked using Terraform&apos;s
              `before_sensitive` and `after_sensitive` metadata before this JSON
              is rendered or copied. Secret-like strings are also masked when
              detection is enabled.
            </p>
            <ExportTrustNote />
          </div>

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
            onClick={() => {
              void handleCopy();
            }}
          >
            {copyState === "copied"
              ? "Copied JSON"
              : copyState === "error"
                ? "Copy failed"
                : "Copy redacted JSON"}
          </button>
        </div>
      </div>

      <div className="border-border bg-background overflow-hidden rounded-lg border">
        <pre
          className="max-h-[34rem] overflow-auto p-4 text-xs leading-6 text-foreground sm:p-5 sm:text-sm"
          aria-label="Redacted resource change JSON"
        >
          {displayRedactedJsonText}
        </pre>
      </div>
    </section>
  );
}
