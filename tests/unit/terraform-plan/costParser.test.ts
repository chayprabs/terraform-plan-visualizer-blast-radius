import { describe, expect, it } from "vitest";
import {
  EXPECTED_INFRACOST_SOURCE_COPY,
} from "@/features/terraform-plan/cost/costTypes";
import { parseInfracostReportJson } from "@/features/terraform-plan/cost/parseInfracostReport";
import { riskyPlan } from "@/features/terraform-plan/fixtures/samplePlans";

describe("parseInfracostReportJson", () => {
  it("parses a practical subset of Infracost JSON and extracts cost fields", () => {
    const result = parseInfracostReportJson(
      JSON.stringify({
        currency: "USD",
        projects: [
          {
            breakdown: {
              resources: [
                {
                  metadata: {
                    address: "module.app.aws_instance.api",
                  },
                  monthlyCost: "68.25",
                  name: "module.app.aws_instance.api",
                  pastMonthlyCost: "42.10",
                },
                {
                  diff: "-12.50",
                  metadata: {
                    address: "module.data.aws_db_instance.primary",
                  },
                  monthlyCost: "187.50",
                  name: "module.data.aws_db_instance.primary",
                  previousMonthlyCost: "200.00",
                },
              ],
            },
            diffTotalMonthlyCost: "13.65",
            name: "app",
            pastTotalMonthlyCost: "242.10",
            totalMonthlyCost: "255.75",
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected parser success.");
    }

    expect(result.report.currency).toBe("USD");
    expect(result.report.entries).toHaveLength(2);
    expect(result.report.entries[0]).toMatchObject({
      address: "module.app.aws_instance.api",
      monthlyCostAfter: 68.25,
      monthlyCostBefore: 42.1,
      monthlyDelta: 26.15,
    });
    expect(result.report.entries[1]).toMatchObject({
      address: "module.data.aws_db_instance.primary",
      monthlyDelta: -12.5,
    });
    expect(result.report.totalMonthlyDelta).toBe(13.65);
  });

  it("returns a friendly error when Terraform plan JSON is pasted instead", () => {
    const result = parseInfracostReportJson(JSON.stringify(riskyPlan));

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected parser failure.");
    }

    expect(result.message).toContain("Terraform plan JSON");
    expect(result.expectedSourceCopy).toBe(EXPECTED_INFRACOST_SOURCE_COPY);
  });
});
