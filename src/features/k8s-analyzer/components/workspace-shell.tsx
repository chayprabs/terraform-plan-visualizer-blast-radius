"use client";

import { useMemo, useState } from "react";
import { ManifestFindingsPanel } from "@/features/k8s-analyzer/components/findings/ManifestFindingsPanel";
import {
  ManifestInputPanel,
  type ManifestInputNotice,
  type ManifestInputTab,
} from "@/features/k8s-analyzer/components/input/ManifestInputPanel";
import { ManifestListPanel } from "@/features/k8s-analyzer/components/manifests/ManifestListPanel";
import { AnalysisSummaryPanel } from "@/features/k8s-analyzer/components/summary/AnalysisSummaryPanel";
import {
  sampleManifestMap,
  type K8sManifestSampleKey,
} from "@/features/k8s-analyzer/fixtures/sampleManifests";
import { parseManifests } from "@/features/k8s-analyzer/domain/parseManifests";
import { useK8sManifestAnalyzer } from "@/features/k8s-analyzer/hooks/useK8sManifestAnalyzer";
import { cn } from "@/lib/utils";

const statusToneClasses = {
  analyzing: "border-warning bg-warning-soft text-warning",
  error: "border-critical bg-critical-soft text-critical",
  idle: "border-border bg-surface-muted text-muted-foreground",
  success: "border-positive bg-positive-soft text-positive",
} as const;

interface LoadedFileInfo {
  name: string;
  size: number;
}

function getStatusLabel(
  status: ReturnType<typeof useK8sManifestAnalyzer>["status"],
): string {
  switch (status) {
    case "analyzing":
      return "Analyzing";
    case "success":
      return "Success";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

export function WorkspaceShell() {
  const analyzer = useK8sManifestAnalyzer();
  const [activeTab, setActiveTab] = useState<ManifestInputTab>("paste");
  const [uploadedFile, setUploadedFile] = useState<LoadedFileInfo | null>(null);

  const hasAnalyzed = analyzer.status === "success" && analyzer.result !== null;
  const parsedManifests = useMemo(() => {
    if (!hasAnalyzed || !analyzer.input.trim()) {
      return [];
    }

    return parseManifests(analyzer.input).manifests;
  }, [analyzer.input, hasAnalyzed]);

  const notice = useMemo<ManifestInputNotice>(() => {
    if (analyzer.status === "error" && analyzer.errorMessage) {
      return {
        tone: "critical",
        title: "Unable to analyze manifests",
        description: analyzer.errorMessage,
      };
    }

    if (hasAnalyzed) {
      return {
        tone: "positive",
        title: "Analysis complete",
        description:
          "Review findings below. Parsing and risk checks ran locally in your browser.",
      };
    }

    return {
      tone: "default",
      title: "Ready for Kubernetes YAML",
      description:
        "Paste multi-document manifests or upload a .yaml file, then analyze locally.",
    };
  }, [analyzer.errorMessage, analyzer.status, hasAnalyzed]);

  const handleAnalyze = () => {
    analyzer.analyze(analyzer.input);
  };

  const handleClear = () => {
    analyzer.reset();
    setUploadedFile(null);
    setActiveTab("paste");
  };

  const handleLoadSample = (sampleKey: K8sManifestSampleKey) => {
    const sample = sampleManifestMap[sampleKey];
    analyzer.setInput(sample);
    setUploadedFile(null);
    setActiveTab("paste");
    analyzer.analyze(sample);
  };

  const handleSelectFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = () => {
      const contents = typeof reader.result === "string" ? reader.result : "";
      analyzer.setInput(contents);
      setUploadedFile({ name: file.name, size: file.size });
      analyzer.analyze(contents);
    };

    reader.readAsText(file);
  };

  return (
    <section
      id="workspace"
      className="border-border bg-surface scroll-mt-24 rounded-lg border p-4 shadow-sm sm:p-6"
      aria-label="Kubernetes manifest analyzer workspace"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-xl font-semibold tracking-tight">
            Workspace
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Local-first manifest review with paste or upload input.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
            statusToneClasses[analyzer.status],
          )}
        >
          {getStatusLabel(analyzer.status)}
        </span>
      </div>

      <div className="mt-6 space-y-6">
        <ManifestInputPanel
          activeTab={activeTab}
          canAnalyze={analyzer.input.trim().length > 0}
          fileInfo={uploadedFile}
          isBusy={analyzer.status === "analyzing"}
          notice={notice}
          onAnalyze={handleAnalyze}
          onClear={handleClear}
          onLoadSample={handleLoadSample}
          onSelectFile={handleSelectFile}
          onTabChange={setActiveTab}
          onTextChange={analyzer.setInput}
          value={analyzer.input}
        />

        <AnalysisSummaryPanel
          findingCount={analyzer.result?.report.findings.length ?? 0}
          hasAnalyzed={hasAnalyzed}
          highRiskFindingCount={
            analyzer.result?.report.highRiskFindingCount ?? 0
          }
          manifestCount={parsedManifests.length}
          parseErrorCount={analyzer.result?.parseErrors.length ?? 0}
          riskLevel={analyzer.result?.report.level ?? null}
          riskScore={analyzer.result?.report.score ?? null}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <ManifestListPanel hasAnalyzed={hasAnalyzed} manifests={parsedManifests} />
          <ManifestFindingsPanel
            findings={analyzer.result?.report.findings ?? []}
            hasAnalyzed={hasAnalyzed}
          />
        </div>
      </div>
    </section>
  );
}
