"use client";

import { cn } from "@/lib/utils";

interface GraphEmptyStateProps {
  title: string;
  description: string;
  tone?: "default" | "warning";
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

const toneClasses = {
  default: "border-border bg-surface-muted",
  warning: "border-warning bg-warning-soft",
} as const;

export function GraphEmptyState({
  title,
  description,
  tone = "default",
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: GraphEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed p-5 sm:p-6",
        toneClasses[tone],
      )}
    >
      <p className="text-foreground text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-7">
        {description}
      </p>

      {actionLabel || secondaryActionLabel ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {actionLabel && onAction ? (
            <button
              type="button"
              className="bg-brand text-brand-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-transform duration-150 hover:-translate-y-0.5"
              onClick={onAction}
            >
              {actionLabel}
            </button>
          ) : null}

          {secondaryActionLabel && onSecondaryAction ? (
            <button
              type="button"
              className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-150"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
