import { cn } from "@/lib/utils";

interface SummaryMetricCardProps {
  description: string;
  label: string;
  prominent?: boolean;
  tone: "default" | "positive" | "warning";
  tooltip: string;
  value: number;
}

const toneClasses = {
  default: "border-border bg-surface text-foreground",
  positive: "border-positive bg-positive-soft text-positive",
  warning: "border-warning bg-warning-soft text-warning",
} as const;

export function SummaryMetricCard({
  description,
  label,
  prominent = false,
  tone,
  tooltip,
  value,
}: SummaryMetricCardProps) {
  return (
    <article className="border-border bg-surface rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold" title={tooltip}>
            {label}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            {description}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold tracking-[0.16em] uppercase",
            toneClasses[tone],
          )}
          title={tooltip}
        >
          Info
        </span>
      </div>

      <p
        className={cn(
          "text-foreground mt-4 font-semibold tracking-tight",
          prominent ? "text-4xl" : "text-3xl",
        )}
      >
        {value}
      </p>
    </article>
  );
}
