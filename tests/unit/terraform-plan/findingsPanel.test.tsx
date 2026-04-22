import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmptyPlanSummary,
  type NormalizedPlan,
} from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import { RiskFindingsPanel } from "@/features/terraform-plan/components/findings/RiskFindingsPanel";
import { riskyPlan } from "@/features/terraform-plan/fixtures/samplePlans";
import { getHighestSeverity } from "@/features/terraform-plan/risk/evaluateRisk";
import type { RiskFinding } from "@/features/terraform-plan/risk/riskTypes";

const writeText = vi.fn();

function createPlanWithFindings(findings: RiskFinding[]): NormalizedPlan {
  const highRiskFindingCount = findings.filter(
    (finding) => finding.severity === "critical" || finding.severity === "high",
  ).length;

  return {
    formatVersion: "1.3",
    terraformVersion: "1.8.5",
    timestamp: "2026-04-22T15:05:00Z",
    summary: createEmptyPlanSummary(),
    resourceChanges: [],
    outputChanges: [],
    providers: [],
    modules: [],
    resourceTypeGroups: [],
    riskReport: {
      findings,
      resourceSummaries: [],
      highestSeverity: getHighestSeverity(findings),
      highRiskFindingCount,
      level: highRiskFindingCount > 0 ? "high" : "low",
      score: highRiskFindingCount > 0 ? 15 * highRiskFindingCount : 0,
      scoreBreakdown: [],
    },
    raw: {
      format_version: "1.3",
      resource_changes: [],
    } as NormalizedPlan["raw"],
  };
}

describe("RiskFindingsPanel", () => {
  beforeEach(() => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);

    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });
  });

  it("filters risky findings, updates the visible count label, and can open a resource", () => {
    const onOpenResource = vi.fn();

    render(
      <RiskFindingsPanel
        hasAnalyzed
        normalizedPlan={normalizeTerraformPlan(riskyPlan)}
        onOpenResource={onOpenResource}
      />,
    );

    expect(screen.getByText(/Showing all 7 findings\./i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Action kind$/i), {
      target: { value: "replace" },
    });
    expect(screen.getByText(/Showing 3 of 7 findings\./i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Severity$/i), {
      target: { value: "high" },
    });
    expect(screen.getByText(/Showing 1 of 7 findings\./i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Category$/i), {
      target: { value: "replacement" },
    });
    expect(screen.getByText(/Showing 1 of 7 findings\./i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Search findings/i), {
      target: { value: "aws_db_instance" },
    });
    expect(screen.getByText(/Showing 1 of 7 findings\./i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Severity$/i), {
      target: { value: "all" },
    });
    fireEvent.change(screen.getByLabelText(/^Category$/i), {
      target: { value: "all" },
    });
    fireEvent.change(screen.getByLabelText(/^Action kind$/i), {
      target: { value: "all" },
    });
    fireEvent.change(screen.getByLabelText(/Search findings/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByLabelText(/Show high risk only/i));

    expect(screen.getByText(/Showing 4 of 7 findings\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Group by resource/i }));

    expect(
      screen.getByRole("heading", {
        name: /module\.data\.aws_db_instance\.primary/i,
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole("button", {
        name: /module\.data\.aws_db_instance\.primary/i,
      })[0],
    );

    expect(onOpenResource).toHaveBeenCalledWith(
      "module.data.aws_db_instance.primary",
    );
  });

  it("copies all high-risk findings as markdown text", async () => {
    render(
      <RiskFindingsPanel
        hasAnalyzed
        normalizedPlan={normalizeTerraformPlan(riskyPlan)}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Copy all high-risk findings/i }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    const copiedText = writeText.mock.calls[0]?.[0] ?? "";

    expect(copiedText).toContain("# Terraform plan high-risk findings");
    expect(copiedText).toContain("Database replacement detected");
    expect(copiedText).toContain("Public ingress detected");
    expect(copiedText).toContain("Storage access controls changed");
    expect(copiedText).not.toContain("IAM permissions changed");
  });

  it("shows the no-findings empty state for plans without findings", () => {
    render(<RiskFindingsPanel hasAnalyzed normalizedPlan={createPlanWithFindings([])} />);

    expect(
      screen.getByText(
        /No high-risk patterns detected\. Still review the plan before applying\./i,
      ),
    ).toBeInTheDocument();
  });

  it("redacts raw secret values in evidence and copied finding text", async () => {
    const planWithSecretFinding = createPlanWithFindings([
      {
        id: "secret-change:test",
        severity: "high",
        category: "secrets",
        title: "Secret material changed",
        explanation: "A secret resource changed.",
        resourceAddress: "aws_secretsmanager_secret_version.api",
        resourceType: "aws_secretsmanager_secret_version",
        actionKind: "update",
        evidence: [
          "secret_string = super-secret-value",
          "Module scope: Root module.",
        ],
        suggestion: "Rotate carefully.",
        confidence: 0.97,
        tags: ["root-module"],
      },
    ]);

    render(
      <RiskFindingsPanel hasAnalyzed normalizedPlan={planWithSecretFinding} />,
    );

    expect(screen.queryByText(/super-secret-value/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/secret_string = \[redacted\]/i),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Copy finding Secret material changed/i }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });

    const copiedText = writeText.mock.calls[0]?.[0] ?? "";

    expect(copiedText).toContain("secret_string = [redacted]");
    expect(copiedText).not.toContain("super-secret-value");
  });
});
