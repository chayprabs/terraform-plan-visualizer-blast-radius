"use client";

import type { ParsedK8sManifest } from "@/features/k8s-analyzer/domain/manifestTypes";
import { getManifestRef } from "@/features/k8s-analyzer/domain/manifestTypes";

interface ManifestListPanelProps {
  hasAnalyzed: boolean;
  manifests: ParsedK8sManifest[];
}

export function ManifestListPanel({
  hasAnalyzed,
  manifests,
}: ManifestListPanelProps) {
  if (!hasAnalyzed) {
    return (
      <section className="border-border bg-surface rounded-lg border p-6">
        <h2 className="text-foreground text-lg font-semibold">Manifests</h2>
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          Parsed kinds, metadata, and spec highlights appear here after analysis.
        </p>
      </section>
    );
  }

  if (manifests.length === 0) {
    return (
      <section className="border-border bg-surface rounded-lg border p-6">
        <h2 className="text-foreground text-lg font-semibold">Manifests</h2>
        <p className="text-muted-foreground mt-3 text-sm leading-7">
          No Kubernetes documents were found in the input.
        </p>
      </section>
    );
  }

  return (
    <section className="border-border bg-surface rounded-lg border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-foreground text-lg font-semibold">Manifests</h2>
        <p className="text-muted-foreground text-sm">
          {manifests.length} document{manifests.length === 1 ? "" : "s"}
        </p>
      </div>
      <ul className="mt-5 space-y-4">
        {manifests.map((manifest) => (
          <li
            key={`${manifest.documentIndex}-${manifest.kind}-${manifest.metadata.name ?? "unnamed"}`}
            className="border-border bg-background rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground font-medium">{manifest.kind}</span>
              <span className="text-muted-foreground font-mono text-xs">
                {manifest.apiVersion}
              </span>
            </div>
            <p className="text-foreground mt-2 text-sm font-medium">
              {getManifestRef(manifest)}
            </p>
            {manifest.specHighlights.length > 0 ? (
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {manifest.specHighlights.map((highlight) => (
                  <div
                    key={`${manifest.documentIndex}-${highlight.label}-${highlight.value}`}
                    className="border-border rounded-md border px-3 py-2"
                  >
                    <dt className="text-muted-foreground text-xs">{highlight.label}</dt>
                    <dd className="text-foreground mt-1 font-mono text-xs break-all">
                      {highlight.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                No spec highlights extracted for this document.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
