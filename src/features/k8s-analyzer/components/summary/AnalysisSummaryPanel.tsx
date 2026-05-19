"use client";

import type { ManifestRiskLevel } from "@/features/k8s-analyzer/risk/riskTypes";
import { cn } from "@/lib/utils";

interface AnalysisSummaryPanelProps {
  findingCount: number;
  hasAnalyzed: boolean;
  highRiskFindingCount: number;
  manifestCount: number;
  parseErrorCount: number;
  riskLevel: ManifestRiskLevel | null;
  riskScore: number | null;
}

const levelToneClasses: Record<ManifestRiskLevel, string> = {
  critical: "border-critical bg-critical-soft text-critical",
  high: "border-critical bg-critical-soft text-critical",
  medium: "border-warning bg-warning-soft text-warning",
  low: "border-positive bg-positive-soft text-positive",
};

export function AnalysisSummaryPanel({
  findingCount,
  hasAnalyzed,
  highRiskFindingCount,
  manifestCount,
  parseErrorCount,
  riskLevel,
  riskScore,
}: AnalysisSummaryPanelProps) {
  if (!hasAnalyzed) {
    return (
      <section className="border-border bg-surface rounded-lg border p-6">
        <h2 className="text-foreground text-lg font-semibold">Summary</h2>
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          Analyze Kubernetes YAML to see the change summary.
        </p>
      </section>
    );
  }

  return (
    <section className="border-border bg-surface rounded-lg border p-6">
      <h2 className="text-foreground text-lg font-semibold">Summary</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Manifests" value={String(manifestCount)} />
        <SummaryCard label="Findings" value={String(findingCount)} />
        <SummaryCard
          label="High risk"
          value={String(highRiskFindingCount)}
          tone={highRiskFindingCount > 0 ? "critical" : "default"}
        />
        <SummaryCard
          label="Parse errors"
          value={String(parseErrorCount)}
          tone={parseErrorCount > 0 ? "warning" : "default"}
        />
      </div>
      {riskLevel && riskScore !== null ? (
        <div
          className={cn(
            "mt-5 rounded-lg border px-4 py-3",
            levelToneClasses[riskLevel],
          )}
        >
          <p className="text-sm font-medium capitalize">
            Overall risk: {riskLevel} ({riskScore}/100)
          </p>
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "critical" | "default" | "warning";
  value: string;
}) {
  const toneClasses = {
    critical: "border-critical bg-critical-soft",
    default: "border-border bg-background",
    warning: "border-warning bg-warning-soft",
  } as const;

  return (
    <div className={cn("rounded-lg border p-4", toneClasses[tone])}>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
