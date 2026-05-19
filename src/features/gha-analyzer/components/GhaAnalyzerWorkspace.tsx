"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/features/terraform-plan/components/section-heading";
import { GhaSeverityBadge } from "@/features/gha-analyzer/components/GhaSeverityBadge";
import { parseWorkflow } from "@/features/gha-analyzer/domain/parseWorkflow";
import {
  riskyWorkflowYaml,
  safeWorkflowYaml,
} from "@/features/gha-analyzer/fixtures/sampleWorkflow";
import { buildMarkdownFindings } from "@/features/gha-analyzer/export/buildMarkdownFindings";
import { evaluateWorkflowRisk } from "@/features/gha-analyzer/risk/evaluateWorkflowRisk";
import type {
  WorkflowRiskFinding,
  WorkflowRiskReport,
} from "@/features/gha-analyzer/risk/riskTypes";
import { cn } from "@/lib/utils";

type AnalysisStatus = "idle" | "error" | "success";

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.append(helper);
    helper.select();

    const copied = document.execCommand("copy");
    helper.remove();

    return copied;
  } catch {
    return false;
  }
}

function getLocationLabel(finding: WorkflowRiskFinding): string {
  if (finding.jobId && finding.stepId) {
    return `Job ${finding.jobId}, step ${finding.stepId}`;
  }

  if (finding.jobId) {
    return `Job ${finding.jobId}`;
  }

  return "Workflow-wide";
}

export function GhaAnalyzerWorkspace() {
  const [yamlText, setYamlText] = useState("");
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [report, setReport] = useState<WorkflowRiskReport | null>(null);
  const [parsedSummary, setParsedSummary] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState("idle");
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [copyState]);

  const handleAnalyze = () => {
    const parsed = parseWorkflow(yamlText);

    if (!parsed.ok) {
      setStatus("error");
      setErrorMessage(parsed.error);
      setReport(null);
      setParsedSummary(null);
      return;
    }

    const nextReport = evaluateWorkflowRisk(parsed.workflow);
    const jobCount = parsed.workflow.jobs.length;
    const stepCount = parsed.workflow.jobs.reduce(
      (total, job) => total + job.steps.length,
      0,
    );

    setStatus("success");
    setErrorMessage(null);
    setReport(nextReport);
    setParsedSummary(
      [
        parsed.workflow.name ? `Workflow: ${parsed.workflow.name}` : null,
        `Triggers: ${parsed.workflow.on.length > 0 ? parsed.workflow.on.join(", ") : "none detected"}`,
        `Jobs: ${jobCount}`,
        `Steps: ${stepCount}`,
      ]
        .filter(Boolean)
        .join(" · "),
    );
  };

  const handleCopyMarkdown = async () => {
    if (!report) {
      return;
    }

    const copied = await copyText(buildMarkdownFindings(report.findings));
    setCopyState(copied ? "copied" : "error");
  };

  return (
    <section
      id="workspace"
      className="scroll-mt-24 space-y-6"
      aria-label="GitHub Actions workflow analyzer workspace"
    >
      <SectionHeading
        eyebrow="Workspace"
        title="Analyze workflow YAML"
        description="Paste a workflow file, run local checks for risky permissions and triggers, then copy findings as markdown for review threads."
      />

      <div className="border-border bg-surface rounded-lg border p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label
              htmlFor="gha-sample-select"
              className="text-foreground text-sm font-semibold"
            >
              Load sample
            </label>
            <select
              id="gha-sample-select"
              aria-label="Load sample workflow"
              className="border-border bg-background text-foreground rounded-lg border px-3 py-2 text-sm"
              defaultValue=""
              onChange={(event) => {
                const value = event.target.value;

                if (value === "risky") {
                  setYamlText(riskyWorkflowYaml);
                } else if (value === "safe") {
                  setYamlText(safeWorkflowYaml);
                }

                event.target.value = "";
              }}
            >
              <option value="">Choose a sample…</option>
              <option value="risky">Risky fork workflow</option>
              <option value="safe">Safe CI workflow</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="bg-brand text-brand-foreground inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-medium transition-transform duration-150 hover:-translate-y-0.5"
              onClick={handleAnalyze}
            >
              Analyze workflow
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center rounded-md border px-5 py-3 text-sm font-medium transition-colors",
                copyState === "copied" &&
                  "border-positive bg-positive-soft text-positive",
                copyState === "error" &&
                  "border-critical bg-critical-soft text-critical",
                copyState === "idle" &&
                  "border-border bg-background text-foreground hover:bg-surface-muted",
              )}
              onClick={() => {
                void handleCopyMarkdown();
              }}
              disabled={!report || report.findings.length === 0}
            >
              {copyState === "copied"
                ? "Copied markdown"
                : copyState === "error"
                  ? "Copy failed"
                  : "Copy findings markdown"}
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label
            htmlFor="gha-workflow-editor"
            className="text-foreground text-sm font-semibold"
          >
            Workflow YAML
          </label>
          <p
            id="gha-workflow-editor-hint"
            className="text-muted-foreground text-sm leading-6"
          >
            Paste the contents of a <code>.github/workflows/*.yml</code> file.
          </p>
          <textarea
            id="gha-workflow-editor"
            aria-describedby="gha-workflow-editor-hint"
            className="border-border bg-background text-foreground min-h-72 w-full rounded-lg border px-4 py-3 font-mono text-sm leading-6 shadow-sm outline-none transition-colors duration-150 focus:border-brand"
            onChange={(event) => setYamlText(event.target.value)}
            placeholder={`name: CI\non:\n  pull_request:\njobs:\n  test:\n    runs-on: ubuntu-latest`}
            spellCheck={false}
            value={yamlText}
          />
        </div>
      </div>

      {status === "error" && errorMessage ? (
        <p
          role="alert"
          className="border-critical bg-critical-soft text-critical rounded-lg border px-4 py-3 text-sm"
        >
          {errorMessage}
        </p>
      ) : null}

      {status === "success" && parsedSummary ? (
        <p className="border-positive bg-positive-soft text-positive rounded-lg border px-4 py-3 text-sm">
          Analysis complete. {parsedSummary}
        </p>
      ) : null}

      {report ? (
        <section className="space-y-4" aria-label="Workflow findings">
          <div className="border-border bg-surface rounded-lg border p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-foreground text-lg font-semibold">
                  Security findings
                </h3>
                <p className="text-muted-foreground mt-1 text-sm leading-6">
                  {report.findings.length === 0
                    ? "No rule matches were detected. Still review permissions, secrets, and third-party actions manually."
                    : `${report.findings.length} finding${report.findings.length === 1 ? "" : "s"} matched deterministic workflow rules.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {report.highestSeverity ? (
                  <div className="border-border bg-background inline-flex items-center gap-2 rounded-lg border px-3 py-2">
                    <GhaSeverityBadge severity={report.highestSeverity} />
                    <span className="text-foreground text-sm font-medium">
                      Highest severity
                    </span>
                  </div>
                ) : null}
                <div className="border-border bg-background inline-flex rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                  {report.highRiskFindingCount} critical/high findings
                </div>
              </div>
            </div>
          </div>

          {report.findings.length === 0 ? (
            <div className="border-border bg-background rounded-lg border p-6 text-center">
              <p className="text-foreground text-base font-semibold">
                No findings for the current rules
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                This workflow did not match write-all permissions, pull_request_target,
                unpinned actions, fork secret exposure, or missing artifact retention checks.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {report.findings.map((finding) => (
                <article
                  key={finding.id}
                  className="border-border bg-background rounded-lg border p-4 sm:p-5"
                >
                  <div className="flex flex-wrap gap-2">
                    <GhaSeverityBadge severity={finding.severity} />
                    <span className="border-border bg-surface-muted text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-xs font-medium tracking-[0.12em] uppercase">
                      {finding.category.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h4 className="text-foreground mt-4 text-lg font-semibold tracking-tight">
                    {finding.title}
                  </h4>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {getLocationLabel(finding)}
                  </p>
                  <p className="text-foreground mt-3 text-sm leading-6">
                    {finding.explanation}
                  </p>
                  {finding.evidence.length > 0 ? (
                    <ul className="text-muted-foreground mt-3 list-disc space-y-1 pl-5 font-mono text-xs leading-6">
                      {finding.evidence.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-foreground mt-4 text-sm leading-6">
                    <span className="font-semibold">Suggestion:</span>{" "}
                    {finding.suggestion}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="border-border bg-background rounded-lg border p-6 text-center">
          <p className="text-foreground text-base font-semibold">
            Analyze a workflow to inspect security findings.
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Deterministic checks run locally in this browser tab after you paste YAML
            and click Analyze workflow.
          </p>
        </div>
      )}
    </section>
  );
}
