"use client";

import { useEffect, useMemo, useState } from "react";
import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { cn } from "@/lib/utils";

interface ResourceRawJsonTabProps {
  resourceChange: NormalizedResourceChange;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function applySensitiveMask(value: unknown, mask: unknown): unknown {
  if (mask === true) {
    return "[sensitive value]";
  }

  if (Array.isArray(value)) {
    const maskEntries = Array.isArray(mask) ? mask : [];
    return value.map((entry, index) => applySensitiveMask(entry, maskEntries[index]));
  }

  if (isRecord(value)) {
    const maskRecord = isRecord(mask) ? mask : {};
    const keys = Array.from(
      new Set([...Object.keys(value), ...Object.keys(maskRecord)]),
    ).sort();
    const nextValue: Record<string, unknown> = {};

    for (const key of keys) {
      const maskedValue = applySensitiveMask(value[key], maskRecord[key]);

      if (maskedValue !== undefined || key in value || maskRecord[key] === true) {
        nextValue[key] = maskedValue;
      }
    }

    return nextValue;
  }

  return value;
}

function buildRedactedResourceJson(
  resourceChange: NormalizedResourceChange,
): Record<string, unknown> {
  return {
    ...resourceChange.raw,
    change: {
      ...resourceChange.raw.change,
      before: applySensitiveMask(
        resourceChange.raw.change.before,
        resourceChange.raw.change.before_sensitive,
      ),
      after: applySensitiveMask(
        resourceChange.raw.change.after,
        resourceChange.raw.change.after_sensitive,
      ),
    },
  };
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
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">("idle");
  const redactedJson = useMemo(
    () => buildRedactedResourceJson(resourceChange),
    [resourceChange],
  );
  const redactedJsonText = useMemo(
    () => JSON.stringify(redactedJson, null, 2),
    [redactedJson],
  );

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const handleCopy = async () => {
    const copied = await copyText(redactedJsonText);
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
              is rendered or copied.
            </p>
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
          {redactedJsonText}
        </pre>
      </div>
    </section>
  );
}
