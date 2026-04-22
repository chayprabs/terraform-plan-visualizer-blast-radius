import { formatDiffValue } from "@/features/terraform-plan/diff/formatDiffValue";
import type {
  AttributeDiffKind,
  AttributeDiffRow,
} from "@/features/terraform-plan/diff/attributeDiffTypes";
import { cn } from "@/lib/utils";

interface DiffPathRowProps {
  row: AttributeDiffRow;
}

const kindLabels: Record<AttributeDiffKind, string> = {
  added: "Added",
  removed: "Removed",
  changed: "Changed",
  unchanged: "Unchanged",
  unknown: "Unknown",
  sensitive: "Sensitive",
  replacedPath: "Replace path",
};

const kindClasses: Record<AttributeDiffKind, string> = {
  added: "border-positive bg-positive-soft text-positive",
  removed: "border-critical bg-critical-soft text-critical",
  changed: "border-warning bg-warning-soft text-warning",
  unchanged: "border-border bg-background text-muted-foreground",
  unknown: "border-warning bg-warning-soft text-warning",
  sensitive: "border-warning bg-warning-soft text-warning",
  replacedPath: "border-critical bg-critical-soft text-critical",
};

function getBeforeValueLabel(row: AttributeDiffRow): string {
  return formatDiffValue(row.beforeValue, {
    isSensitive: row.beforeSensitive,
  });
}

function getAfterValueLabel(row: AttributeDiffRow): string {
  return formatDiffValue(row.afterValue, {
    isSensitive: row.afterSensitive,
    unknownState: row.unknownState,
  });
}

export function DiffPathRow({ row }: DiffPathRowProps) {
  return (
    <article
      className={cn(
        "rounded-lg border p-4",
        row.kind === "unchanged" && !row.isTruncated
          ? "border-border bg-background"
          : "border-border bg-surface",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-foreground break-all text-sm font-medium">
            {row.path}
          </p>
          {row.note ? (
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {row.note}
            </p>
          ) : null}
        </div>

        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.16em] uppercase",
            kindClasses[row.kind],
          )}
        >
          {kindLabels[row.kind]}
        </span>
      </div>

      {row.isTruncated ? null : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="border-border bg-background rounded-lg border p-3">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
              Before
            </p>
            <p className="text-foreground mt-2 break-words text-sm leading-6">
              {getBeforeValueLabel(row)}
            </p>
          </div>

          <div className="border-border bg-background rounded-lg border p-3">
            <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
              After
            </p>
            <p className="text-foreground mt-2 break-words text-sm leading-6">
              {getAfterValueLabel(row)}
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
