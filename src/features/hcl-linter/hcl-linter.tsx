"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Container } from "@/components/ui/container";
import { analyzeHcl } from "@/features/hcl-linter/domain/analyzeHcl";
import type { HclLintFinding } from "@/features/hcl-linter/lint/hclLintRules";
import { cn } from "@/lib/utils";

const SAMPLE_HCL = `variable "environment" {
  type = string
}

variable "name" {
  description = "Name used as an identifier across resources"
  type        = string
  default     = "app"
}

resource "aws_security_group" "web" {
  name = var.name

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

output "security_group_id" {
  description = "Created security group id"
  value       = aws_security_group.web.id
}
`;

type WorkspaceTab = "lint" | "docs";

type AnalysisState =
  | { status: "idle" }
  | { status: "parsing" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      findings: HclLintFinding[];
      docs: string;
    };

const severityClasses = {
  error: "border-critical bg-critical-soft text-critical",
  warning: "border-warning bg-warning-soft text-warning",
  info: "border-border bg-surface-muted text-muted-foreground",
} as const;

function formatPath(path: string[]): string {
  return path.length > 0 ? path.join(".") : "(root)";
}

export function HclLinter() {
  const [source, setSource] = useState(SAMPLE_HCL);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("lint");
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  const findingCounts = useMemo(() => {
    if (analysis.status !== "ready") {
      return { error: 0, warning: 0, info: 0 };
    }

    return analysis.findings.reduce(
      (counts, finding) => {
        counts[finding.severity] += 1;
        return counts;
      },
      { error: 0, warning: 0, info: 0 },
    );
  }, [analysis]);

  const runAnalysis = useCallback(() => {
    startTransition(() => {
      void (async () => {
        setAnalysis({ status: "parsing" });

        try {
          const { findings, docs } = await analyzeHcl(source);

          setAnalysis({
            status: "ready",
            findings,
            docs,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to parse HCL.";

          setAnalysis({ status: "error", message });
        }
      })();
    });
  }, [source]);

  const isAnalyzing = isPending || analysis.status === "parsing";

  return (
    <div className="py-8 sm:py-10">
      <Container className="space-y-8 sm:space-y-10">
        <section className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
          <span className="bg-surface-muted text-muted-foreground border-border inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.18em] uppercase">
            Local browser processing
          </span>
          <h1 className="text-foreground mt-5 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Terraform HCL Linter
          </h1>
          <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-8">
            Paste Terraform HCL to lint for public CIDRs, hardcoded secret-like
            strings, missing variable descriptions, and generate module docs for
            reviewers.
          </p>
        </section>

        <section
          className="border-border bg-surface-muted rounded-lg border px-5 py-4"
          aria-label="Privacy notice"
        >
          <p className="text-foreground text-sm font-medium leading-7 sm:text-base">
            Local processing: HCL is parsed for linting on this device; module
            docs are generated in your browser.
          </p>
        </section>

        <section
          id="workspace"
          aria-label="HCL linter workspace"
          className="border-border bg-surface rounded-lg border p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-foreground text-xl font-semibold">
                HCL workspace
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Parsing uses hcl2json on the server; lint results and docs render
                in your browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSource(SAMPLE_HCL)}
                className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors"
              >
                Load sample
              </button>
              <button
                type="button"
                onClick={runAnalysis}
                disabled={isAnalyzing || !source.trim()}
                className="bg-brand text-brand-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAnalyzing ? "Analyzing…" : "Analyze HCL"}
              </button>
            </div>
          </div>

          <label className="text-foreground mt-5 block text-sm font-medium">
            Terraform HCL
            <textarea
              value={source}
              onChange={(event) => setSource(event.target.value)}
              spellCheck={false}
              className="border-border bg-background text-foreground mt-2 min-h-64 w-full rounded-md border p-4 font-mono text-sm leading-6"
              aria-label="Terraform HCL input"
            />
          </label>

          {analysis.status === "error" ? (
            <p
              role="alert"
              className="border-critical bg-critical-soft text-critical mt-4 rounded-md border px-4 py-3 text-sm"
            >
              {analysis.message}
            </p>
          ) : null}

          {analysis.status === "ready" ? (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="border-positive bg-positive-soft text-positive rounded-full border px-3 py-1">
                  {findingCounts.error + findingCounts.warning + findingCounts.info}{" "}
                  findings
                </span>
                <span className="border-critical bg-critical-soft text-critical rounded-full border px-3 py-1">
                  {findingCounts.error} errors
                </span>
                <span className="border-warning bg-warning-soft text-warning rounded-full border px-3 py-1">
                  {findingCounts.warning} warnings
                </span>
              </div>

              <div
                role="tablist"
                aria-label="HCL results"
                className="border-border flex flex-wrap gap-2 border-b pb-2"
              >
                {(["lint", "docs"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={workspaceTab === tab}
                    onClick={() => setWorkspaceTab(tab)}
                    className={cn(
                      "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                      workspaceTab === tab
                        ? "bg-brand text-brand-foreground"
                        : "text-muted-foreground hover:bg-surface-muted",
                    )}
                  >
                    {tab === "lint" ? "Lint" : "Docs"}
                  </button>
                ))}
              </div>

              {workspaceTab === "lint" ? (
                <div role="tabpanel" className="space-y-3">
                  {analysis.findings.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No lint findings. The current rules did not flag public
                      CIDRs, secret-like strings, or missing variable
                      descriptions.
                    </p>
                  ) : (
                    analysis.findings.map((finding, index) => (
                      <article
                        key={`${finding.ruleId}-${index}`}
                        className={cn(
                          "rounded-md border px-4 py-3 text-sm",
                          severityClasses[finding.severity],
                        )}
                      >
                        <p className="font-medium">{finding.message}</p>
                        <p className="mt-1 opacity-90">
                          Rule: {finding.ruleId} · Path:{" "}
                          {formatPath(finding.path)}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              ) : (
                <div role="tabpanel">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(analysis.docs);
                      }}
                      className="border-border bg-background text-foreground hover:bg-surface-muted inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium"
                    >
                      Copy markdown
                    </button>
                  </div>
                  <pre className="border-border bg-background text-foreground overflow-x-auto rounded-md border p-4 font-mono text-sm leading-6 whitespace-pre-wrap">
                    {analysis.docs}
                  </pre>
                </div>
              )}
            </div>
          ) : null}
        </section>
      </Container>
    </div>
  );
}
