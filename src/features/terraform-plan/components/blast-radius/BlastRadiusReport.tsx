"use client";

import { useEffect, useMemo, useState } from "react";
import { SeverityBadge } from "@/features/terraform-plan/components/findings/SeverityBadge";
import { ExportTrustNote } from "@/features/terraform-plan/components/privacy/ExportTrustNote";
import { usePrivacyRedaction } from "@/features/terraform-plan/components/privacy/PrivacyRedactionContext";
import type { BlastRadiusAnalysis } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";
import { redactText } from "@/features/terraform-plan/privacy/redactTerraformPlan";

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

interface BlastRadiusReportProps {
  analysis: BlastRadiusAnalysis;
}

export function BlastRadiusReport({ analysis }: BlastRadiusReportProps) {
  const { settings } = usePrivacyRedaction();
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">(
    "idle",
  );
  const redactedSummary = useMemo(
    () =>
      redactText(analysis.markdownSummary, {
        scope: "export",
        settings,
      }),
    [analysis.markdownSummary, settings],
  );

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState("idle");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  if (!analysis.focusNode) {
    return null;
  }

  return (
    <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-foreground text-base font-semibold">
            Blast-radius report
          </h3>
          <p className="text-muted-foreground mt-2 text-sm leading-7">
            Copy a Markdown summary for reviewers, incidents, or change-management
            notes.
          </p>
        </div>

        <button
          type="button"
          className="bg-brand text-brand-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-transform duration-150 hover:-translate-y-0.5"
          onClick={async () => {
            const copied = await copyText(redactedSummary);

            setCopyState(copied ? "copied" : "error");
          }}
        >
          {copyState === "copied"
            ? "Copied"
            : copyState === "error"
              ? "Copy failed"
              : "Copy blast-radius summary"}
        </button>
      </div>

      <ExportTrustNote />

      {analysis.dependencyCompleteness.isIncomplete ? (
        <div className="border-warning bg-warning-soft mt-4 rounded-lg border p-4">
          <p className="text-warning text-sm font-semibold">
            Dependency data is incomplete.
          </p>
          <p className="text-warning mt-2 text-sm leading-7">
            {analysis.dependencyCompleteness.summary}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {analysis.highestRiskSeverity ? (
          <SeverityBadge severity={analysis.highestRiskSeverity} />
        ) : (
          <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase">
            No risk
          </span>
        )}
        <span className="border-border bg-background text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase">
          {analysis.directChangedNodes.length} direct changes
        </span>
        <span className="border-border bg-background text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase">
          {analysis.downstream.length} downstream dependents
        </span>
      </div>

      <pre className="border-border bg-background text-foreground mt-4 overflow-x-auto rounded-lg border p-4 text-xs leading-6 whitespace-pre-wrap">
        {redactedSummary}
      </pre>
    </section>
  );
}
