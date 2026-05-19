import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeTerraformPlanText } from "@/features/terraform-plan/worker/workerMessages";

const largePlanPath = join(process.cwd(), "tests/fixtures/large-plan.json");
const largePlanJson = readFileSync(largePlanPath, "utf8");

describe("large plan performance", () => {
  it("normalizes a large plan within the worker budget", () => {
    const plan = JSON.parse(largePlanJson) as {
      resource_changes: unknown[];
    };
    const startedAt = performance.now();

    const result = analyzeTerraformPlanText(largePlanJson, {
      sourceName: "large-plan.json",
    });

    const elapsedMs = performance.now() - startedAt;

    expect(result.ok).toBe(true);
    expect(elapsedMs).toBeLessThan(30_000);

    if (result.ok) {
      expect(result.normalizedPlan.resourceChanges.length).toBe(
        plan.resource_changes.length,
      );
    }
  });
});
