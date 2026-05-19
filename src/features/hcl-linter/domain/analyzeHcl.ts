import type { HclLintFinding } from "@/features/hcl-linter/lint/hclLintRules";

export interface HclAnalysisResult {
  findings: HclLintFinding[];
  docs: string;
}

export async function analyzeHcl(source: string): Promise<HclAnalysisResult> {
  const response = await fetch("/api/hcl-linter/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source }),
  });

  const payload = (await response.json()) as HclAnalysisResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to analyze HCL.");
  }

  return {
    findings: payload.findings,
    docs: payload.docs,
  };
}
