"use client";

import { SeverityBadge } from "@/features/k8s-analyzer/components/findings/SeverityBadge";
import type { ManifestRiskFinding } from "@/features/k8s-analyzer/risk/riskTypes";

interface ManifestFindingsPanelProps {
  findings: ManifestRiskFinding[];
  hasAnalyzed: boolean;
}

export function ManifestFindingsPanel({
  findings,
  hasAnalyzed,
}: ManifestFindingsPanelProps) {
  if (!hasAnalyzed) {
    return (
      <section className="border-border bg-surface rounded-lg border p-6">
        <h2 className="text-foreground text-lg font-semibold">Risk findings</h2>
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          Analyze manifests to see image, RBAC, and security context findings.
        </p>
      </section>
    );
  }

  if (findings.length === 0) {
    return (
      <section className="border-border bg-surface rounded-lg border p-6">
        <h2 className="text-foreground text-lg font-semibold">Risk findings</h2>
        <p className="text-positive mt-3 text-sm font-medium">
          No risk findings matched the current rules.
        </p>
      </section>
    );
  }

  return (
    <section className="border-border bg-surface rounded-lg border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-foreground text-lg font-semibold">Risk findings</h2>
        <p className="text-muted-foreground text-sm">
          {findings.length} finding{findings.length === 1 ? "" : "s"}
        </p>
      </div>
      <ul className="mt-5 space-y-4">
        {findings.map((finding) => (
          <li
            key={finding.id}
            className="border-border bg-background rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} />
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                {finding.category.replaceAll("_", " ")}
              </span>
            </div>
            <h3 className="text-foreground mt-3 font-medium">{finding.title}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-7">
              {finding.explanation}
            </p>
            <p className="text-foreground mt-3 text-sm font-medium">
              {finding.manifestRef}
            </p>
            {finding.evidence.length > 0 ? (
              <ul className="text-muted-foreground mt-2 space-y-1 font-mono text-xs">
                {finding.evidence.map((line) => (
                  <li key={`${finding.id}-${line}`}>{line}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-foreground mt-3 text-sm leading-7">
              <span className="font-medium">Suggestion:</span> {finding.suggestion}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
