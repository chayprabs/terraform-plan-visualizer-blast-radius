"use client";

import { useEffect, useMemo, useState } from "react";
import type { NormalizedResourceChange } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { buildAttributeDiff } from "@/features/terraform-plan/diff/buildAttributeDiff";
import { formatDiffValue } from "@/features/terraform-plan/diff/formatDiffValue";
import type {
  AttributeDiffRow,
} from "@/features/terraform-plan/diff/attributeDiffTypes";
import { DiffPathRow } from "@/features/terraform-plan/components/diff/DiffPathRow";
import { cn } from "@/lib/utils";

type DiffFilterMode = "all" | "changed" | "sensitive" | "unknown";

interface AttributeDiffViewerProps {
  resourceChange: NormalizedResourceChange;
}

interface CopyState {
  diff: "copied" | "error" | "idle";
  paths: "copied" | "error" | "idle";
}

const filterLabels: Record<DiffFilterMode, string> = {
  all: "All rows",
  changed: "Changed only",
  sensitive: "Sensitive only",
  unknown: "Unknown only",
};

function buildDiffSummaryLabel(visibleCount: number, totalCount: number): string {
  if (visibleCount === totalCount) {
    return `Showing all ${totalCount} diff rows.`;
  }

  return `Showing ${visibleCount} of ${totalCount} diff rows.`;
}

function formatMarkdownRow(row: AttributeDiffRow): string {
  const beforeLabel = formatDiffValue(row.beforeValue, {
    isSensitive: row.beforeSensitive,
  });
  const afterLabel = formatDiffValue(row.afterValue, {
    isSensitive: row.afterSensitive,
    unknownState: row.unknownState,
  });
  const notes = row.note ? ` | note: ${row.note}` : "";

  return `- [${row.kind}] ${row.path} | before: ${beforeLabel} | after: ${afterLabel}${notes}`;
}

function formatDiffMarkdown(rows: AttributeDiffRow[]): string {
  return ["# Terraform attribute diff", "", ...rows.map(formatMarkdownRow)]
    .join("\n")
    .trim();
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

function getChangedPaths(rows: AttributeDiffRow[]): string[] {
  return Array.from(
    new Set(
      rows
        .filter((row) => row.kind !== "unchanged" && !row.isTruncated)
        .map((row) => row.path),
    ),
  );
}

export function AttributeDiffViewer({
  resourceChange,
}: AttributeDiffViewerProps) {
  const [filterMode, setFilterMode] = useState<DiffFilterMode>("all");
  const [showUnchangedRows, setShowUnchangedRows] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>({
    diff: "idle",
    paths: "idle",
  });
  const diff = useMemo(
    () => buildAttributeDiff(resourceChange),
    [resourceChange],
  );
  const unchangedRowCount = useMemo(
    () =>
      diff.rows.filter((row) => row.kind === "unchanged" && !row.isTruncated)
        .length,
    [diff.rows],
  );
  const visibleRows = useMemo(() => {
    return diff.rows.filter((row) => {
      if (filterMode === "sensitive") {
        return row.kind === "sensitive";
      }

      if (filterMode === "unknown") {
        return row.kind === "unknown";
      }

      if (filterMode === "changed") {
        return row.kind !== "unchanged" || row.isTruncated;
      }

      if (!showUnchangedRows && row.kind === "unchanged" && !row.isTruncated) {
        return false;
      }

      return true;
    });
  }, [diff.rows, filterMode, showUnchangedRows]);
  const visibleChangedPaths = useMemo(
    () => getChangedPaths(visibleRows),
    [visibleRows],
  );

  useEffect(() => {
    if (copyState.diff === "idle" && copyState.paths === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState({
        diff: "idle",
        paths: "idle",
      });
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const handleCopyDiff = async () => {
    const copied = await copyText(formatDiffMarkdown(visibleRows));

    setCopyState((current) => ({
      ...current,
      diff: copied ? "copied" : "error",
    }));
  };

  const handleCopyChangedPaths = async () => {
    const copied = await copyText(visibleChangedPaths.join("\n"));

    setCopyState((current) => ({
      ...current,
      paths: copied ? "copied" : "error",
    }));
  };

  return (
    <section className="space-y-4" aria-label="Attribute diff">
      <div className="border-border bg-surface rounded-lg border p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h5 className="text-foreground text-base font-semibold">
              Attribute diff
            </h5>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {buildDiffSummaryLabel(visibleRows.length, diff.rows.length)}
            </p>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {diff.changedPaths.length} changed paths, {diff.counts.sensitive} sensitive rows,{" "}
              {diff.counts.unknown} unknown rows.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className={cn(
                "inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                copyState.diff === "copied" &&
                  "border-positive bg-positive-soft text-positive",
                copyState.diff === "error" &&
                  "border-critical bg-critical-soft text-critical",
                copyState.diff === "idle" &&
                  "border-border bg-background text-foreground hover:bg-surface-muted",
              )}
              onClick={() => {
                void handleCopyDiff();
              }}
            >
              {copyState.diff === "copied"
                ? "Copied diff"
                : copyState.diff === "error"
                  ? "Copy failed"
                  : "Copy diff as Markdown"}
            </button>

            <button
              type="button"
              className={cn(
                "inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                copyState.paths === "copied" &&
                  "border-positive bg-positive-soft text-positive",
                copyState.paths === "error" &&
                  "border-critical bg-critical-soft text-critical",
                copyState.paths === "idle" &&
                  "border-border bg-background text-foreground hover:bg-surface-muted",
              )}
              onClick={() => {
                void handleCopyChangedPaths();
              }}
              disabled={visibleChangedPaths.length === 0}
            >
              {copyState.paths === "copied"
                ? "Copied paths"
                : copyState.paths === "error"
                  ? "Copy failed"
                  : "Copy changed paths"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as DiffFilterMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={cn(
                "rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                filterMode === mode
                  ? "border-foreground bg-background text-foreground"
                  : "border-border bg-surface-muted text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setFilterMode(mode)}
              aria-pressed={filterMode === mode}
            >
              {filterLabels[mode]}
            </button>
          ))}
        </div>

        {filterMode === "all" && unchangedRowCount > 0 ? (
          <button
            type="button"
            className="text-muted-foreground mt-4 text-sm font-medium underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setShowUnchangedRows((current) => !current)}
          >
            {showUnchangedRows
              ? `Hide unchanged rows (${unchangedRowCount})`
              : `Show unchanged rows (${unchangedRowCount})`}
          </button>
        ) : null}
      </div>

      {visibleRows.length > 0 ? (
        <div className="space-y-3">
          {visibleRows.map((row) => (
            <DiffPathRow key={row.id} row={row} />
          ))}
        </div>
      ) : (
        <div className="border-border bg-surface-muted rounded-lg border p-4">
          <p className="text-foreground text-sm font-semibold">
            No diff rows match the current filter.
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Try switching filters or expanding unchanged rows to see more of this resource diff.
          </p>
        </div>
      )}
    </section>
  );
}
