"use client";

import { summaryCards } from "@/features/terraform-plan/data";
import { usePlanMetrics } from "@/features/terraform-plan/context/planMetricsContext";
import { cn } from "@/lib/utils";

const toneClasses = {
  critical: "border-critical/30 bg-critical-soft",
  default: "border-border bg-surface-muted",
  positive: "border-positive/30 bg-positive-soft",
  warning: "border-warning/30 bg-warning-soft",
} as const;

const metricKeys = {
  Creates: "creates",
  Updates: "updates",
  Deletes: "deletes",
  Replacements: "replacements",
  "High Risk": "highRisk",
} as const;

export function HeroSummaryCards() {
  const { metrics } = usePlanMetrics();

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {summaryCards.map((card) => {
        const metricKey = metricKeys[card.title as keyof typeof metricKeys];
        const liveValue =
          metrics && metricKey !== undefined
            ? String(metrics[metricKey])
            : null;

        return (
          <SummaryPreviewCard
            key={card.title}
            card={card}
            value={liveValue}
          />
        );
      })}
    </div>
  );
}

function SummaryPreviewCard({
  card,
  value,
}: {
  card: (typeof summaryCards)[number];
  value: string | null;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-3",
        toneClasses[card.tone as keyof typeof toneClasses] ?? toneClasses.default,
      )}
    >
      <p className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">
        {card.title}
      </p>
      <p className="text-foreground mt-1 text-lg font-semibold tabular-nums">
        {value ?? "—"}
      </p>
      <p className="text-muted-foreground mt-1 text-xs leading-5">
        {value ? card.description : "Analyze a plan to populate this metric."}
      </p>
    </div>
  );
}
