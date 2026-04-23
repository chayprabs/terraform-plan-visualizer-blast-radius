"use client";

import { useEffect, useMemo, useState } from "react";
import type { BlastRadiusAnalysis } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";
import { ExportTrustNote } from "@/features/terraform-plan/components/privacy/ExportTrustNote";
import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { buildHtmlReport } from "@/features/terraform-plan/export/buildHtmlReport";
import { buildJsonReport, buildTerraformPlanExportData } from "@/features/terraform-plan/export/buildJsonReport";
import { buildMarkdownReport } from "@/features/terraform-plan/export/buildMarkdownReport";
import { buildPrComment } from "@/features/terraform-plan/export/buildPrComment";
import type { TerraformPlanRedactionSettings } from "@/features/terraform-plan/privacy/redactionTypes";
import { cn } from "@/lib/utils";

interface ExportPanelProps {
  blastRadiusAnalysis: BlastRadiusAnalysis | null;
  hasAnalyzed: boolean;
  normalizedPlan: NormalizedPlan | null;
  settings: TerraformPlanRedactionSettings;
  sourceName?: string;
}

interface ExportBundle {
  fileStem: string;
  generatedAt: string;
  html: string;
  json: string;
  markdown: string;
  prComment: string;
}

type ToastTone = "error" | "success";

function sanitizeFileStem(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFileStem(sourceName?: string): string {
  const sourceStem = sanitizeFileStem(sourceName ?? "terraform-plan");

  return `${sourceStem || "terraform-plan"}-analysis`;
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

function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): boolean {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 0);

    return true;
  } catch {
    return false;
  }
}

function ExportActionButton({
  disabled,
  label,
  onClick,
  title,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <span className="block" title={title}>
      <button
        type="button"
        className={cn(
          "inline-flex w-full items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
          disabled
            ? "border-border bg-surface-muted text-muted-foreground cursor-not-allowed"
            : "border-border bg-background text-foreground hover:bg-surface-muted",
        )}
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </button>
    </span>
  );
}

export function ExportPanel({
  blastRadiusAnalysis,
  hasAnalyzed,
  normalizedPlan,
  settings,
  sourceName,
}: ExportPanelProps) {
  const [toast, setToast] = useState<{
    message: string;
    tone: ToastTone;
  } | null>(null);
  const exportBundle = useMemo<ExportBundle | null>(() => {
    if (!normalizedPlan) {
      return null;
    }

    const exportData = buildTerraformPlanExportData({
      blastRadiusAnalysis,
      normalizedPlan,
      settings,
      sourceName,
    });

    return {
      fileStem: buildFileStem(sourceName),
      generatedAt: exportData.source.generatedAt,
      html: buildHtmlReport(exportData),
      json: buildJsonReport(exportData),
      markdown: buildMarkdownReport(exportData),
      prComment: buildPrComment(exportData),
    };
  }, [blastRadiusAnalysis, normalizedPlan, settings, sourceName]);
  const isDisabled = !hasAnalyzed || !exportBundle;
  const disabledTooltip = "Analyze a Terraform plan to enable export.";

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 2200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const showToast = (message: string, tone: ToastTone) => {
    setToast({ message, tone });
  };

  return (
    <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">Export</h3>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-7">
            Copy a redacted PR summary or download standalone Markdown, HTML, and
            JSON reports for review workflows.
          </p>
        </div>

        <div className="border-border bg-background rounded-lg border px-3 py-2 text-sm text-muted-foreground">
          Generated {exportBundle?.generatedAt ?? "after analysis"}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ExportActionButton
          disabled={false}
          label="Copy link to current view"
          onClick={async () => {
            const copied = await copyText(window.location.href);

            showToast(
              copied ? "Copied share-safe link" : "Copy failed",
              copied ? "success" : "error",
            );
          }}
          title="Copy the current review state without including Terraform plan JSON"
        />
        <ExportActionButton
          disabled={isDisabled}
          label="Copy PR comment"
          onClick={async () => {
            if (!exportBundle) {
              return;
            }

            const copied = await copyText(exportBundle.prComment);

            showToast(copied ? "Copied PR comment" : "Copy failed", copied ? "success" : "error");
          }}
          title={isDisabled ? disabledTooltip : "Copy the redacted pull request comment"}
        />
      </div>

      <p className="text-muted-foreground mt-3 text-sm leading-6">
        This link does not include your Terraform plan. Export a redacted
        report to share results.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ExportActionButton
          disabled={isDisabled}
          label="Copy Markdown report"
          onClick={async () => {
            if (!exportBundle) {
              return;
            }

            const copied = await copyText(exportBundle.markdown);

            showToast(
              copied ? "Copied Markdown report" : "Copy failed",
              copied ? "success" : "error",
            );
          }}
          title={isDisabled ? disabledTooltip : "Copy the full redacted Markdown report"}
        />
        <ExportActionButton
          disabled={isDisabled}
          label="Download Markdown"
          onClick={() => {
            if (!exportBundle) {
              return;
            }

            const downloaded = downloadTextFile(
              `${exportBundle.fileStem}.md`,
              exportBundle.markdown,
              "text/markdown;charset=utf-8",
            );

            showToast(
              downloaded ? "Downloaded report" : "Download failed",
              downloaded ? "success" : "error",
            );
          }}
          title={isDisabled ? disabledTooltip : "Download the redacted Markdown report"}
        />
        <ExportActionButton
          disabled={isDisabled}
          label="Download HTML report"
          onClick={() => {
            if (!exportBundle) {
              return;
            }

            const downloaded = downloadTextFile(
              `${exportBundle.fileStem}.html`,
              exportBundle.html,
              "text/html;charset=utf-8",
            );

            showToast(
              downloaded ? "Downloaded report" : "Download failed",
              downloaded ? "success" : "error",
            );
          }}
          title={isDisabled ? disabledTooltip : "Download the standalone redacted HTML report"}
        />
        <ExportActionButton
          disabled={isDisabled}
          label="Download JSON report"
          onClick={() => {
            if (!exportBundle) {
              return;
            }

            const downloaded = downloadTextFile(
              `${exportBundle.fileStem}.json`,
              exportBundle.json,
              "application/json;charset=utf-8",
            );

            showToast(
              downloaded ? "Downloaded report" : "Download failed",
              downloaded ? "success" : "error",
            );
          }}
          title={isDisabled ? disabledTooltip : "Download the machine-readable redacted JSON report"}
        />
      </div>

      <ExportTrustNote />

      <div aria-live="polite" className="mt-4 min-h-10">
        {toast ? (
          <div
            className={cn(
              "inline-flex rounded-lg border px-3 py-2 text-sm font-medium",
              toast.tone === "success" &&
                "border-positive bg-positive-soft text-positive",
              toast.tone === "error" &&
                "border-critical bg-critical-soft text-critical",
            )}
            role="status"
          >
            {toast.message}
          </div>
        ) : null}
      </div>
    </section>
  );
}
