"use client";

import { useState } from "react";
import type { K8sManifestSampleKey } from "@/features/k8s-analyzer/fixtures/sampleManifests";
import { cn } from "@/lib/utils";

export type ManifestInputTab = "paste" | "upload";

export interface ManifestInputNotice {
  description: string;
  tone: "critical" | "default" | "positive" | "warning";
  title: string;
}

interface ManifestInputPanelProps {
  activeTab: ManifestInputTab;
  canAnalyze: boolean;
  fileInfo?: {
    name: string;
    size: number;
  } | null;
  isBusy: boolean;
  notice: ManifestInputNotice;
  onAnalyze: () => void;
  onClear: () => void;
  onLoadSample: (sampleKey: K8sManifestSampleKey) => void;
  onSelectFile: (file: File) => void;
  onTabChange: (tab: ManifestInputTab) => void;
  onTextChange: (value: string) => void;
  value: string;
}

const noticeToneClasses = {
  critical: "border-critical bg-critical-soft text-critical",
  default: "border-border bg-surface-muted text-foreground",
  positive: "border-positive bg-positive-soft text-positive",
  warning: "border-warning bg-warning-soft text-warning",
} as const;

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes.toLocaleString()} bytes`;
}

export function ManifestInputPanel({
  activeTab,
  canAnalyze,
  fileInfo,
  isBusy,
  notice,
  onAnalyze,
  onClear,
  onLoadSample,
  onSelectFile,
  onTabChange,
  onTextChange,
  value,
}: ManifestInputPanelProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  return (
    <div
      className={cn(
        "border-border bg-background rounded-lg border transition-colors duration-150",
        isDragActive && "border-brand bg-surface-muted",
      )}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragActive(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragActive(false);
        const file = event.dataTransfer.files?.[0];

        if (file) {
          onTabChange("upload");
          onSelectFile(file);
        }
      }}
    >
      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div role="tablist" aria-label="Manifest input methods" className="flex flex-wrap gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "paste"}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            activeTab === "paste"
              ? "bg-brand text-brand-foreground"
              : "text-muted-foreground hover:bg-surface-muted",
          )}
          onClick={() => onTabChange("paste")}
        >
          Paste YAML
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "upload"}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            activeTab === "upload"
              ? "bg-brand text-brand-foreground"
              : "text-muted-foreground hover:bg-surface-muted",
          )}
          onClick={() => onTabChange("upload")}
        >
          Upload file
        </button>
        </div>
        <label className="text-muted-foreground text-sm">
          <span className="sr-only">Load sample manifests</span>
          <select
            className="border-border bg-background text-foreground rounded-md border px-3 py-2 text-sm"
            defaultValue=""
            onChange={(event) => {
              const sampleKey = event.target.value as K8sManifestSampleKey;

              if (sampleKey) {
                onLoadSample(sampleKey);
                event.target.value = "";
              }
            }}
          >
            <option value="">Load sample manifests</option>
            <option value="safeManifest">Safe sample</option>
            <option value="riskyManifest">Risky sample</option>
          </select>
        </label>
      </div>

      <div className="space-y-4 p-4">
        <div
          className={cn("rounded-lg border px-4 py-3", noticeToneClasses[notice.tone])}
        >
          <p className="font-medium">{notice.title}</p>
          <p className="mt-1 text-sm leading-7">{notice.description}</p>
        </div>

        {activeTab === "paste" ? (
          <textarea
            aria-label="Kubernetes manifest YAML"
            className="border-border bg-background text-foreground min-h-72 w-full rounded-lg border p-4 font-mono text-sm leading-6"
            placeholder="Paste multi-document Kubernetes YAML here..."
            value={value}
            onChange={(event) => onTextChange(event.target.value)}
          />
        ) : (
          <div className="border-border rounded-lg border border-dashed p-6 text-center">
            <label className="text-brand inline-flex cursor-pointer text-sm font-medium">
              <input
                type="file"
                accept=".yaml,.yml,text/yaml,text/plain"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    onSelectFile(file);
                  }
                }}
              />
              Choose a YAML file
            </label>
            {fileInfo ? (
              <p className="text-muted-foreground mt-3 text-sm">
                {fileInfo.name} ({formatBytes(fileInfo.size)})
              </p>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                Drag and drop a .yaml or .yml file, or choose one from disk.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="bg-brand text-brand-foreground rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!canAnalyze || isBusy}
            onClick={onAnalyze}
          >
            {isBusy ? "Analyzing..." : "Analyze manifests"}
          </button>
          <button
            type="button"
            className="border-border text-foreground hover:bg-surface-muted rounded-md border px-4 py-2 text-sm font-medium"
            onClick={onClear}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
