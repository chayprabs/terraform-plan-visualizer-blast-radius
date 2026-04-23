"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import {
  riskyPlan,
  tinyPlan,
} from "@/features/terraform-plan/fixtures/samplePlans";
import { BlastRadiusPanel } from "@/features/terraform-plan/components/blast-radius/BlastRadiusPanel";
import { buildBlastRadiusAnalysis } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";
import { RiskFindingsPanel } from "@/features/terraform-plan/components/findings/RiskFindingsPanel";
import { PlanGraphView } from "@/features/terraform-plan/components/graph/PlanGraphView";
import { PlanInputPanel } from "@/features/terraform-plan/components/input/PlanInputPanel";
import { PrivacyRedactionPanel } from "@/features/terraform-plan/components/privacy/PrivacyRedactionPanel";
import { PrivacyRedactionProvider } from "@/features/terraform-plan/components/privacy/PrivacyRedactionContext";
import {
  ResourceDetailsDrawer,
  type ResourceDetailsTabKey,
} from "@/features/terraform-plan/components/resources/ResourceDetailsDrawer";
import { ResourceChangesTable } from "@/features/terraform-plan/components/resources/ResourceChangesTable";
import { PlanSummaryDashboard } from "@/features/terraform-plan/components/summary/PlanSummaryDashboard";
import type {
  PlanInputNotice,
  PlanInputTab,
} from "@/features/terraform-plan/components/input/PlanInputPanel";
import type { TerraformPlanSampleKey } from "@/features/terraform-plan/hooks/useTerraformPlanAnalyzer";
import { useTerraformPlanAnalyzer } from "@/features/terraform-plan/hooks/useTerraformPlanAnalyzer";
import {
  DEFAULT_MAX_TERRAFORM_PLAN_INPUT_BYTES,
  type AnalysisError,
} from "@/features/terraform-plan/worker/workerMessages";
import {
  DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  type TerraformPlanRedactionSettings,
} from "@/features/terraform-plan/privacy/redactionTypes";
import { cn } from "@/lib/utils";

const samplePlanMap = {
  riskyPlan,
  tinyPlan,
} as const;

const TERRAFORM_EXPORT_COMMAND =
  "terraform plan -out=tfplan && terraform show -json tfplan > plan.json";

const statusToneClasses = {
  analyzing: "border-warning bg-warning-soft text-warning",
  error: "border-critical bg-critical-soft text-critical",
  idle: "border-border bg-surface-muted text-muted-foreground",
  parsing: "border-warning bg-warning-soft text-warning",
  success: "border-positive bg-positive-soft text-positive",
} as const;

interface LoadedFileInfo {
  name: string;
  size: number;
}

interface SelectedResourceState {
  address: string;
  initialTab: ResourceDetailsTabKey;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes.toLocaleString()} bytes`;
}

function getStatusLabel(
  status: ReturnType<typeof useTerraformPlanAnalyzer>["status"],
): string {
  switch (status) {
    case "parsing":
      return "Parsing";
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

function getSourceLabel(
  sourceName?: string,
  uploadedFile?: LoadedFileInfo | null,
): string {
  return uploadedFile?.name ?? sourceName ?? "Pasted JSON";
}

function getErrorTitle(error: AnalysisError): string {
  switch (error.code) {
    case "empty-input":
      return "Add a plan to get started.";
    case "invalid-json":
      return "That file could not be parsed as JSON.";
    case "invalid-plan":
      return "This does not look like Terraform plan JSON.";
    case "input-too-large":
      return "This plan is too large to analyze locally.";
    default:
      return "The analysis did not finish.";
  }
}

function getErrorDescription(error: AnalysisError): string {
  const location =
    error.line && error.column
      ? `Line ${error.line}, column ${error.column}.`
      : undefined;
  const sizeSummary =
    error.inputSizeBytes && error.maxInputBytes
      ? `${formatBytes(error.inputSizeBytes)} loaded, max ${formatBytes(error.maxInputBytes)}.`
      : undefined;

  return [error.message, error.details, location, sizeSummary]
    .filter(Boolean)
    .join(" ");
}

export function WorkspaceShell() {
  const {
    analyzeText,
    error,
    normalizedPlan,
    progressMessage,
    reset,
    sourceName: analyzedSourceName,
    status,
    warnings,
  } = useTerraformPlanAnalyzer();
  const [activeTab, setActiveTab] = useState<PlanInputTab>("paste");
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [copyState, setCopyState] = useState<"copied" | "error" | "idle">(
    "idle",
  );
  const [draftText, setDraftText] = useState("");
  const [localInputError, setLocalInputError] = useState<PlanInputNotice | null>(
    null,
  );
  const [privacySettings, setPrivacySettings] =
    useState<TerraformPlanRedactionSettings>(
      DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
    );
  const [blastRadiusFocusAddress, setBlastRadiusFocusAddress] =
    useState<string | null>(null);
  const [selectedResource, setSelectedResource] =
    useState<SelectedResourceState | null>(null);
  const [sourceName, setSourceName] = useState<string>();
  const [uploadedFile, setUploadedFile] = useState<LoadedFileInfo | null>(null);

  const isBusy = status === "parsing" || status === "analyzing";
  const canAnalyze = draftText.trim().length > 0 && localInputError === null;
  const analyzedPlan = status === "success" ? normalizedPlan : null;
  const effectiveBlastRadiusFocusAddress = useMemo(
    () =>
      analyzedPlan?.resourceChanges.some(
        (resourceChange) => resourceChange.address === blastRadiusFocusAddress,
      )
        ? blastRadiusFocusAddress
        : null,
    [analyzedPlan, blastRadiusFocusAddress],
  );
  const selectedResourceChange = useMemo(
    () =>
      analyzedPlan?.resourceChanges.find(
        (resourceChange) => resourceChange.address === selectedResource?.address,
      ) ?? null,
    [analyzedPlan, selectedResource],
  );
  const blastRadiusAnalysis = useMemo(
    () =>
      analyzedPlan
        ? buildBlastRadiusAnalysis(analyzedPlan, effectiveBlastRadiusFocusAddress)
        : null,
    [analyzedPlan, effectiveBlastRadiusFocusAddress],
  );

  const runAutoAnalysis = useEffectEvent(() => {
    if (draftText.trim().length === 0 || localInputError) {
      return;
    }

    analyzeText(draftText, sourceName);
  });

  useEffect(() => {
    if (!autoAnalyze || draftText.trim().length === 0 || localInputError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      runAutoAnalysis();
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [autoAnalyze, draftText, localInputError, sourceName]);

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopyState("idle"), 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const handlePasteChange = useCallback(
    (nextValue: string) => {
      setDraftText(nextValue);
      setUploadedFile(null);
      setSourceName(undefined);
      setBlastRadiusFocusAddress(null);
      setSelectedResource(null);
      setLocalInputError(null);
      reset();
    },
    [reset],
  );

  const handleClear = useCallback(() => {
    setActiveTab("paste");
    setAutoAnalyze(false);
    setCopyState("idle");
    setDraftText("");
    setBlastRadiusFocusAddress(null);
    setLocalInputError(null);
    setSelectedResource(null);
    setSourceName(undefined);
    setUploadedFile(null);
    reset();
  }, [reset]);

  const handleAnalyze = useCallback(() => {
    if (!canAnalyze) {
      return;
    }

    setBlastRadiusFocusAddress(null);
    setSelectedResource(null);
    analyzeText(draftText, sourceName);
  }, [analyzeText, canAnalyze, draftText, sourceName]);

  const handleCopyCommand = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(TERRAFORM_EXPORT_COMMAND);
        setCopyState("copied");
        return;
      }

      const helper = document.createElement("textarea");
      helper.value = TERRAFORM_EXPORT_COMMAND;
      helper.setAttribute("readonly", "");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.append(helper);
      helper.select();

      const copied = document.execCommand("copy");
      helper.remove();
      setCopyState(copied ? "copied" : "error");
    } catch {
      setCopyState("error");
    }
  }, []);

  const handleLoadSample = useCallback(
    (sampleKey: TerraformPlanSampleKey) => {
      const nextText = JSON.stringify(samplePlanMap[sampleKey], null, 2);

      startTransition(() => {
        setActiveTab("paste");
        setAutoAnalyze(true);
        setDraftText(nextText);
        setBlastRadiusFocusAddress(null);
        setLocalInputError(null);
        setSelectedResource(null);
        setSourceName(`${sampleKey}.json`);
        setUploadedFile(null);
        reset();
      });
    },
    [reset],
  );

  const handleSelectFile = useCallback(
    (file: File) => {
      const nextFileInfo = {
        name: file.name,
        size: file.size,
      };

      setActiveTab("upload");
      setUploadedFile(nextFileInfo);
      setBlastRadiusFocusAddress(null);
      setSelectedResource(null);
      setSourceName(file.name);

      if (file.size > DEFAULT_MAX_TERRAFORM_PLAN_INPUT_BYTES) {
        setDraftText("");
        setLocalInputError({
          tone: "critical",
          title: "This file is too large to analyze locally.",
          description: `${file.name} is ${formatBytes(file.size)}. The current local limit is ${formatBytes(DEFAULT_MAX_TERRAFORM_PLAN_INPUT_BYTES)}.`,
        });
        reset();
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";

        startTransition(() => {
          setDraftText(text);
          setLocalInputError(null);
          reset();
        });
      };

      reader.onerror = () => {
        setDraftText("");
        setLocalInputError({
          tone: "critical",
          title: "We couldn't read that file.",
          description: `Try exporting the plan again and then reloading ${file.name}.`,
        });
        reset();
      };

      reader.readAsText(file);
    },
    [reset],
  );

  const handleOpenResource = useCallback(
    (address: string, initialTab: ResourceDetailsTabKey) => {
      if (analyzedPlan?.resourceChanges.some((resource) => resource.address === address)) {
        setBlastRadiusFocusAddress(address);
      }

      setSelectedResource({
        address,
        initialTab,
      });
    },
    [analyzedPlan],
  );
  const handleSelectBlastRadiusFocus = useCallback(
    (address: string | null) => {
      setBlastRadiusFocusAddress(address);

      if (!address) {
        setSelectedResource((current) =>
          current?.address === blastRadiusFocusAddress ? null : current,
        );
        return;
      }

      setSelectedResource({
        address,
        initialTab: "overview",
      });
    },
    [blastRadiusFocusAddress],
  );

  const inputNotice = useMemo<PlanInputNotice>(() => {
    if (localInputError) {
      return localInputError;
    }

    if (error && status === "error") {
      return {
        tone: "critical",
        title: getErrorTitle(error),
        description: getErrorDescription(error),
      };
    }

    if (draftText.trim().length === 0) {
      return {
        tone: "default",
        title: "Paste Terraform plan JSON or drop a file onto this panel.",
        description:
          "Load terraform show -json output, or pick a sample plan to explore the analyzer before using a real file.",
      };
    }

    if (status === "parsing" || status === "analyzing") {
      return {
        tone: "warning",
        title: `${getStatusLabel(status)} in progress`,
        description:
          progressMessage ??
          "Your Terraform plan is being parsed and normalized locally.",
      };
    }

    return {
      tone: "positive",
      title: `${getSourceLabel(sourceName, uploadedFile)} is ready.`,
      description: autoAnalyze
        ? "Auto-analyze is on, so changes will re-run locally after the input settles."
        : "Click Analyze plan to run local parsing and risk detection.",
    };
  }, [
    autoAnalyze,
    draftText,
    error,
    localInputError,
    progressMessage,
    sourceName,
    status,
    uploadedFile,
  ]);

  return (
    <section
      id="workspace"
      className="border-border bg-surface scroll-mt-24 rounded-lg border p-6 shadow-sm sm:p-8"
      aria-labelledby="workspace-heading"
    >
      <div className="border-border flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium tracking-[0.22em] uppercase">
            Workspace
          </p>
          <h2
            id="workspace-heading"
            className="text-foreground mt-3 text-2xl font-semibold tracking-tight"
          >
            Local plan analysis workspace
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-7">
            Paste Terraform JSON, upload a plan file, or load a fixture and run
            parsing in this tab without sending the plan to a server.
          </p>
        </div>

        <span
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase",
            statusToneClasses[status],
          )}
        >
          {getStatusLabel(status)}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div>
          <PlanInputPanel
            activeTab={activeTab}
            autoAnalyze={autoAnalyze}
            canAnalyze={canAnalyze}
            copyState={copyState}
            fileInfo={uploadedFile}
            isBusy={isBusy}
            notice={inputNotice}
            onAnalyze={handleAnalyze}
            onAutoAnalyzeChange={setAutoAnalyze}
            onClear={handleClear}
            onCopyCommand={handleCopyCommand}
            onLoadSample={handleLoadSample}
            onSelectFile={handleSelectFile}
            onTabChange={setActiveTab}
            onTextChange={handlePasteChange}
            value={draftText}
          />
        </div>

        <div
          className="border-border bg-background rounded-lg border p-4 sm:p-5"
          aria-label="Analysis output"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-foreground text-lg font-semibold">
                Analysis output
              </h3>
              <p className="text-muted-foreground mt-1 text-sm leading-7">
                Status, summary metrics, risk findings, dependency graph topology,
                resource review data, provider and module breakdowns, and output
                metadata update here after each analysis run.
              </p>
            </div>

            <span
              className={cn(
                "inline-flex rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.18em] uppercase",
                statusToneClasses[status],
              )}
            >
              {getStatusLabel(status)}
            </span>
          </div>

          <div className="mt-5" aria-live="polite">
            {(status === "parsing" || status === "analyzing") && (
              <div className="border-border bg-surface-muted rounded-lg border p-5">
                <p className="text-foreground text-sm font-semibold">
                  {getStatusLabel(status)}
                  {analyzedSourceName
                    ? ` ${getSourceLabel(analyzedSourceName, uploadedFile)}`
                    : ""}
                </p>
                <p className="text-muted-foreground mt-2 text-sm leading-7">
                  {progressMessage ??
                    "Terraform plan analysis is running in this browser tab."}
                </p>
              </div>
            )}

            {status === "error" && error ? (
              <div className="space-y-4">
                <div className="border-critical bg-critical-soft rounded-lg border p-5">
                  <p className="text-critical text-sm font-semibold">
                    {getErrorTitle(error)}
                  </p>
                  <p className="text-critical mt-2 text-sm leading-7">
                    {getErrorDescription(error)}
                  </p>
                </div>

                {error.validation ? (
                  <div className="border-border bg-surface rounded-lg border p-4">
                    <p className="text-foreground text-sm font-semibold">
                      Validation details
                    </p>
                    <ul className="text-muted-foreground mt-3 space-y-2 text-sm leading-6">
                      {error.validation.errors.map((issue) => (
                        <li key={issue.code}>Error: {issue.message}</li>
                      ))}
                      {error.validation.warnings.map((issue) => (
                        <li key={issue.code}>Warning: {issue.message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {(status === "idle" || status === "success") && (
              <div className="space-y-4">
                <PrivacyRedactionProvider settings={privacySettings}>
                  {status === "success" && normalizedPlan ? (
                    <div className="border-border bg-surface rounded-lg border p-4">
                      <p className="text-foreground text-sm font-semibold">
                        Analyzed source
                      </p>
                      <p className="text-muted-foreground mt-2 text-sm leading-6">
                        {getSourceLabel(analyzedSourceName, uploadedFile)}
                      </p>
                    </div>
                  ) : null}

                  <PlanSummaryDashboard
                    hasAnalyzed={status === "success"}
                    normalizedPlan={analyzedPlan}
                  />

                  <PrivacyRedactionPanel
                    blastRadiusAnalysis={blastRadiusAnalysis}
                    hasAnalyzed={status === "success"}
                    normalizedPlan={analyzedPlan}
                    onSettingsChange={setPrivacySettings}
                    settings={privacySettings}
                    sourceName={analyzedSourceName}
                  />

                  <RiskFindingsPanel
                    key={
                      analyzedPlan
                        ? `${analyzedSourceName ?? "plan"}:${analyzedPlan.timestamp ?? ""}:${analyzedPlan.resourceChanges.length}:${analyzedPlan.outputChanges.length}:${analyzedPlan.riskReport?.score ?? 0}:${analyzedPlan.riskReport?.findings.length ?? 0}`
                        : "risk-findings-idle"
                    }
                    hasAnalyzed={status === "success"}
                    normalizedPlan={analyzedPlan}
                    onOpenResource={(address) => {
                      handleOpenResource(address, "findings");
                    }}
                  />

                  <PlanGraphView
                    key={
                      analyzedPlan
                        ? `${analyzedSourceName ?? "plan"}:${analyzedPlan.timestamp ?? ""}:${analyzedPlan.resourceChanges.length}:${analyzedPlan.summary.noOpCount}:${analyzedPlan.riskReport?.score ?? 0}:graph`
                        : "plan-graph-idle"
                    }
                    blastRadiusDownstreamIds={blastRadiusAnalysis?.downstream.map(
                      (node) => node.id,
                    )}
                    blastRadiusFocusAddress={blastRadiusAnalysis?.focusAddress ?? null}
                    blastRadiusNodeIds={blastRadiusAnalysis?.radiusNodeIds}
                    blastRadiusUpstreamIds={blastRadiusAnalysis?.upstream.map(
                      (node) => node.id,
                    )}
                    hasAnalyzed={status === "success"}
                    normalizedPlan={analyzedPlan}
                    onOpenResource={handleOpenResource}
                    selectedAddress={selectedResource?.address ?? null}
                  />

                  <BlastRadiusPanel
                    analysis={blastRadiusAnalysis}
                    hasAnalyzed={status === "success"}
                    onSelectFocus={handleSelectBlastRadiusFocus}
                  />

                  <ResourceChangesTable
                    key={
                      analyzedPlan
                        ? `${analyzedSourceName ?? "plan"}:${analyzedPlan.timestamp ?? ""}:${analyzedPlan.resourceChanges.length}:${analyzedPlan.summary.noOpCount}:${analyzedPlan.riskReport?.score ?? 0}`
                        : "resource-table-idle"
                    }
                    blastRadiusAddresses={
                      blastRadiusAnalysis
                        ? new Set(blastRadiusAnalysis.radiusNodeIds)
                        : null
                    }
                    blastRadiusFocusAddress={blastRadiusAnalysis?.focusAddress ?? null}
                    hasAnalyzed={status === "success"}
                    normalizedPlan={analyzedPlan}
                    onOpenResource={(address) => {
                      handleOpenResource(address, "overview");
                    }}
                    selectedAddress={selectedResource?.address ?? null}
                  />

                  {selectedResourceChange ? (
                    <ResourceDetailsDrawer
                      key={`${selectedResource?.address ?? "resource"}:${selectedResource?.initialTab ?? "overview"}`}
                      initialTab={selectedResource?.initialTab ?? "overview"}
                      onClose={() => setSelectedResource(null)}
                      resourceChange={selectedResourceChange}
                    />
                  ) : null}
                </PrivacyRedactionProvider>
              </div>
            )}

            {warnings.length > 0 ? (
              <div className="border-warning bg-warning-soft mt-4 rounded-lg border p-4">
                <p className="text-warning text-sm font-semibold">Warnings</p>
                <ul className="text-warning mt-3 space-y-2 text-sm leading-6">
                  {warnings.map((warning) => (
                    <li key={warning.code}>{warning.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
