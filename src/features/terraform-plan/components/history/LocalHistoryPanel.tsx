"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type { CostImpactState } from "@/features/terraform-plan/cost/costTypes";
import type { TerraformPlanRedactionSettings } from "@/features/terraform-plan/privacy/redactionTypes";
import type { TerraformPlanUrlState } from "@/features/terraform-plan/state/urlState";
import {
  clearLocalHistory,
  createLocalHistoryEntry,
  deleteLocalHistoryEntry,
  listLocalHistoryEntries,
  saveLocalHistoryEntry,
  type LocalHistoryEntry,
  type ThemePreference,
} from "@/features/terraform-plan/state/localPreferences";
import { cn } from "@/lib/utils";

interface LocalHistoryPanelProps {
  costImpactState: CostImpactState;
  hasAnalyzed: boolean;
  normalizedPlan: NormalizedPlan | null;
  onRememberHistoryChange: (rememberHistory: boolean) => void;
  onRestoreEntry: (entryId: string) => Promise<boolean>;
  onThemeChange: (theme: ThemePreference) => void;
  rememberHistory: boolean;
  redactionSettings: TerraformPlanRedactionSettings;
  sourceName?: string;
  theme: ThemePreference;
  urlState: TerraformPlanUrlState;
}

function formatStoredAt(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

function EmptyState({ description }: { description: string }) {
  return (
    <div className="border-border bg-background rounded-lg border p-4">
      <p className="text-muted-foreground text-sm leading-7">{description}</p>
    </div>
  );
}

export function LocalHistoryPanel({
  costImpactState,
  hasAnalyzed,
  normalizedPlan,
  onRememberHistoryChange,
  onRestoreEntry,
  onThemeChange,
  rememberHistory,
  redactionSettings,
  sourceName,
  theme,
  urlState,
}: LocalHistoryPanelProps) {
  const [entries, setEntries] = useState<LocalHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);
  const lastSavedSignatureRef = useRef<string | null>(null);
  const analysisSignature = useMemo(
    () =>
      normalizedPlan
        ? [
            sourceName ?? "",
            normalizedPlan.timestamp ?? "",
            normalizedPlan.summary.totalResourceChanges,
            normalizedPlan.riskReport?.score ?? 0,
            normalizedPlan.resourceChanges.length,
          ].join(":")
        : null,
    [normalizedPlan, sourceName],
  );

  useEffect(() => {
    let cancelled = false;

    const loadEntries = async () => {
      setIsLoading(true);

      try {
        const nextEntries = await listLocalHistoryEntries();

        if (!cancelled) {
          setEntries(nextEntries);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 2200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!rememberHistory || !hasAnalyzed || !normalizedPlan || !analysisSignature) {
      return;
    }

    if (lastSavedSignatureRef.current === analysisSignature) {
      return;
    }

    lastSavedSignatureRef.current = analysisSignature;

    const persistEntry = async () => {
      try {
        const entry = createLocalHistoryEntry(
          normalizedPlan,
          sourceName,
          redactionSettings,
          {
            costImpactState,
            urlState,
          },
        );

        await saveLocalHistoryEntry(entry);
        setEntries(await listLocalHistoryEntries());
      } catch {
        setToast({
          message: "Local history could not be updated.",
          tone: "error",
        });
      }
    };

    void persistEntry();
  }, [
    analysisSignature,
    hasAnalyzed,
    normalizedPlan,
    costImpactState,
    redactionSettings,
    rememberHistory,
    sourceName,
    urlState,
  ]);

  return (
    <section className="border-border bg-surface rounded-lg border p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            Local History &amp; Preferences
          </h3>
          <p className="text-muted-foreground mt-1 max-w-3xl text-sm leading-7">
            Everything in this panel stays on this device. When remembering is
            enabled, Authos stores a redacted plan copy in IndexedDB so you can
            reopen a prior review—nothing is sent to a server.
          </p>
        </div>

        <button
          type="button"
          className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55"
          disabled={entries.length === 0}
          onClick={async () => {
            try {
              await clearLocalHistory();
              setEntries([]);
              setToast({
                message: "Cleared local history",
                tone: "success",
              });
            } catch {
              setToast({
                message: "Local history could not be cleared.",
                tone: "error",
              });
            }
          }}
        >
          Clear all local history
        </button>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <label className="border-border bg-background flex items-start gap-3 rounded-lg border p-4">
          <input
            checked={rememberHistory}
            className="border-border mt-1 h-4 w-4 rounded"
            onChange={(event) => onRememberHistoryChange(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="text-foreground block text-sm font-medium">
              Remember recent analyses on this device
            </span>
            <span className="text-muted-foreground mt-1 block text-sm leading-6">
              Off by default. When enabled, this stores redacted plan JSON and
              summary metadata locally so you can reopen a saved analysis.
            </span>
          </span>
        </label>

        <label className="border-border bg-background rounded-lg border p-4">
          <span className="text-foreground block text-sm font-medium">Theme</span>
          <span className="text-muted-foreground mt-1 block text-sm leading-6">
            Saved locally for future reviews on this device.
          </span>
          <select
            aria-label="Theme"
            className="border-border bg-surface text-foreground mt-3 w-full rounded-lg border px-3 py-2 text-sm"
            onChange={(event) => onThemeChange(event.target.value as ThemePreference)}
            value={theme}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <EmptyState description="Loading local history from browser storage." />
        ) : entries.length === 0 ? (
          <EmptyState
            description={
              rememberHistory
                ? "No saved summaries yet. Analyze a plan to store a redacted local summary."
                : "Local history is currently empty. Turn on local remembering to save redacted summaries for future reference."
            }
          />
        ) : (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="border-border bg-background rounded-lg border p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-foreground truncate text-sm font-semibold">
                    {entry.sourceName}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Saved {formatStoredAt(entry.storedAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                      {entry.totalChanges} total changes
                    </span>
                    <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                      Risk {entry.riskLevel}
                    </span>
                    <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                      Score {entry.riskScore}
                    </span>
                    <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                      {entry.highRiskFindingCount} critical/high findings
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="bg-brand text-brand-foreground hover:opacity-90 inline-flex rounded-lg px-3 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-55"
                    disabled={!entry.hasRestorablePlan}
                    onClick={async () => {
                      const restored = await onRestoreEntry(entry.id);

                      setToast({
                        message: restored
                          ? "Reopened saved analysis"
                          : "This entry has no restorable plan on this device",
                        tone: restored ? "success" : "error",
                      });
                    }}
                    title={
                      entry.hasRestorablePlan
                        ? "Load the redacted plan saved with this entry"
                        : "Only summary metadata was stored for this entry"
                    }
                  >
                    Reopen
                  </button>
                  <button
                    type="button"
                    className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                    onClick={async () => {
                      try {
                        await deleteLocalHistoryEntry(entry.id);
                        setEntries(await listLocalHistoryEntries());
                        setToast({
                          message: "Deleted local history entry",
                          tone: "success",
                        });
                      } catch {
                        setToast({
                          message: "Local history entry could not be deleted.",
                          tone: "error",
                        });
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

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
