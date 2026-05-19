"use client";

import { useCallback, useMemo, useState } from "react";
import { parseManifests } from "@/features/k8s-analyzer/domain/parseManifests";
import { evaluateManifestRisk } from "@/features/k8s-analyzer/risk/evaluateManifestRisk";
import type { ManifestRiskReport } from "@/features/k8s-analyzer/risk/riskTypes";

export type K8sAnalyzerStatus = "idle" | "analyzing" | "success" | "error";

export interface K8sAnalysisResult {
  parseErrors: ReturnType<typeof parseManifests>["errors"];
  report: ManifestRiskReport;
}

export function useK8sManifestAnalyzer() {
  const [status, setStatus] = useState<K8sAnalyzerStatus>("idle");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<K8sAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const analyze = useCallback((value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      setStatus("error");
      setResult(null);
      setErrorMessage("Add Kubernetes YAML to get started.");
      return;
    }

    setStatus("analyzing");
    setErrorMessage(null);

    const parsed = parseManifests(trimmed);

    if (parsed.errors.length > 0 && parsed.manifests.length === 0) {
      setStatus("error");
      setResult(null);
      setErrorMessage(parsed.errors[0]?.message ?? "Unable to parse manifests.");
      return;
    }

    const report = evaluateManifestRisk(parsed.manifests);

    setResult({
      parseErrors: parsed.errors,
      report,
    });
    setStatus("success");
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setInput("");
    setResult(null);
    setErrorMessage(null);
  }, []);

  const manifests = useMemo(() => {
    if (!input.trim() || status === "idle") {
      return [];
    }

    return parseManifests(input).manifests;
  }, [input, status]);

  return {
    analyze,
    errorMessage,
    input,
    manifests,
    reset,
    result,
    setInput,
    status,
  };
}
