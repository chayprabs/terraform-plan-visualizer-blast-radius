import { describe, expect, it } from "vitest";
import { parseWorkflow } from "@/features/gha-analyzer/domain/parseWorkflow";
import { riskyWorkflowYaml, safeWorkflowYaml } from "@/features/gha-analyzer/fixtures/sampleWorkflow";
import { evaluateWorkflowRisk } from "@/features/gha-analyzer/risk/evaluateWorkflowRisk";

describe("parseWorkflow", () => {
  it("rejects empty workflow YAML", () => {
    expect(parseWorkflow("   ")).toEqual({
      ok: false,
      error: "Workflow YAML is empty.",
    });
  });

  it("rejects malformed YAML", () => {
    const result = parseWorkflow("name: [\n  broken");

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.length).toBeGreaterThan(0);
  });

  it("rejects YAML that does not resolve to an object", () => {
    expect(parseWorkflow("- just\n- a\n- list")).toEqual({
      ok: false,
      error: "Workflow YAML must resolve to an object.",
    });
  });

  it("extracts triggers, jobs, steps, and permissions", () => {
    const parsed = parseWorkflow(riskyWorkflowYaml);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(parsed.workflow.name).toBe("Risky fork workflow");
    expect(parsed.workflow.on).toContain("pull_request_target");
    expect(parsed.workflow.permissions).toBe("write-all");
    expect(parsed.workflow.jobs).toHaveLength(1);
    expect(parsed.workflow.jobs[0]?.steps).toHaveLength(2);
    expect(parsed.workflow.jobs[0]?.steps[0]?.uses).toBe("actions/checkout@main");
  });
});

describe("evaluateWorkflowRisk", () => {
  it("flags risky fork workflow patterns", () => {
    const parsed = parseWorkflow(riskyWorkflowYaml);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const report = evaluateWorkflowRisk(parsed.workflow);

    expect(report.highestSeverity).toBe("critical");
    expect(report.highRiskFindingCount).toBeGreaterThanOrEqual(4);
    expect(report.findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        "write-all-permissions",
        "missing-restrictive-permissions",
        "pull-request-target",
        "unpinned-action-ref",
        "secrets-in-fork-pr-env",
        "checkout-fetch-depth",
        "checkout-token",
        "upload-artifact-without-retention",
      ]),
    );
  });

  it("returns no findings for the safe workflow fixture", () => {
    const parsed = parseWorkflow(safeWorkflowYaml);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const report = evaluateWorkflowRisk(parsed.workflow);

    expect(report.findings).toHaveLength(0);
    expect(report.highestSeverity).toBeNull();
    expect(report.highRiskFindingCount).toBe(0);
  });
});
