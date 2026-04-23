import { describe, expect, it } from "vitest";
import { buildBlastRadiusAnalysis } from "@/features/terraform-plan/components/blast-radius/blastRadiusModel";
import { applyCostImpactToPlan } from "@/features/terraform-plan/cost/applyCostImpact";
import { DEFAULT_COST_IMPACT_STATE } from "@/features/terraform-plan/cost/costTypes";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import { buildTerraformPlanExportData } from "@/features/terraform-plan/export/buildJsonReport";
import { buildMarkdownReport } from "@/features/terraform-plan/export/buildMarkdownReport";
import { createBlastRadiusPlan } from "./blastRadiusTestPlan";
import { SECRET_TEST_VALUES } from "./secretTestValues";

function createExportData() {
  const normalizedPlan = applyCostImpactToPlan(
    normalizeTerraformPlan(createBlastRadiusPlan()),
    {
      ...DEFAULT_COST_IMPACT_STATE,
      importedReport: {
        currency: "USD",
        entries: [
          {
            address: "module.data.aws_db_instance.primary",
            currency: "USD",
            id: "db-primary",
            monthlyCostAfter: 860,
            monthlyCostBefore: 240,
            monthlyDelta: 620,
            name: "module.data.aws_db_instance.primary",
            projectName: "app",
            source: "infracost",
          },
        ],
        totalMonthlyCostAfter: 860,
        totalMonthlyCostBefore: 240,
        totalMonthlyDelta: 620,
        warnings: [],
      },
    },
  );
  const blastRadiusAnalysis = buildBlastRadiusAnalysis(
    normalizedPlan,
    "module.data.aws_db_instance.primary",
  );
  const report = normalizedPlan.riskReport;

  if (!report) {
    throw new Error("Expected a risk report for export test data.");
  }

  const secretFinding = {
    ...report.findings[0]!,
    evidence: [
      ...report.findings[0]!.evidence,
      `GitHub token: ${SECRET_TEST_VALUES.githubToken}`,
      `Bearer token: ${SECRET_TEST_VALUES.bearerToken}`,
    ],
  };

  normalizedPlan.riskReport = {
    ...report,
    findings: [secretFinding, ...report.findings.slice(1)],
  };

  return buildTerraformPlanExportData({
    blastRadiusAnalysis,
    normalizedPlan,
    sourceName: `${SECRET_TEST_VALUES.githubToken}-plan.json`,
  });
}

describe("buildMarkdownReport", () => {
  it("includes the key report sections and excludes secret fixture values", () => {
    const markdown = buildMarkdownReport(createExportData());

    expect(markdown).toContain("# Terraform Plan Analysis Report");
    expect(markdown).toContain("## Privacy & Redaction");
    expect(markdown).toContain("## Plan Summary");
    expect(markdown).toContain("## Overall Risk Score");
    expect(markdown).toContain("## Cost Impact");
    expect(markdown).toContain("## Top Findings");
    expect(markdown).toContain("## Destructive Changes");
    expect(markdown).toContain("## Replacements");
    expect(markdown).toContain("## Provider Summary");
    expect(markdown).toContain("## Module Summary");
    expect(markdown).toContain("## Blast-Radius Summary");
    expect(markdown).toContain("## Reviewer Checklist");
    expect(markdown).not.toContain(SECRET_TEST_VALUES.githubToken);
    expect(markdown).not.toContain(SECRET_TEST_VALUES.bearerToken);
    expect(markdown).toContain("[redacted]");
  });
});
