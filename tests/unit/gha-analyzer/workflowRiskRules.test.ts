import { describe, expect, it } from "vitest";
import { parseWorkflow } from "@/features/gha-analyzer/domain/parseWorkflow";
import { riskyWorkflowYaml } from "@/features/gha-analyzer/fixtures/sampleWorkflow";
import { evaluateWorkflowRisk } from "@/features/gha-analyzer/risk/evaluateWorkflowRisk";

const EXPECTED_RULE_IDS = [
  "write-all-permissions",
  "missing-restrictive-permissions",
  "pull-request-target",
  "unpinned-action-ref",
  "secrets-in-fork-pr-env",
  "checkout-fetch-depth",
  "checkout-token",
  "upload-artifact-without-retention",
] as const;

describe("workflow risk rule registry", () => {
  it("evaluates at least eight distinct workflow rule families", () => {
    const parsed = parseWorkflow(riskyWorkflowYaml);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const report = evaluateWorkflowRisk(parsed.workflow);
    const ruleIds = new Set(report.findings.map((finding) => finding.ruleId));

    for (const ruleId of EXPECTED_RULE_IDS) {
      expect(ruleIds.has(ruleId)).toBe(true);
    }

    expect(ruleIds.size).toBeGreaterThanOrEqual(8);
  });
});
