import { describe, expect, it } from "vitest";
import {
  analyzeTerraformPlanText,
  createWorkerUnavailableWarning,
  getTextSizeBytes,
  isAnalyzeTextMessage,
} from "@/features/terraform-plan/worker/workerMessages";
import {
  malformedPlanLikeObject,
  riskyPlan,
  tinyPlan,
} from "@/features/terraform-plan/fixtures/samplePlans";

describe("workerMessages helpers", () => {
  it("recognizes valid analyze text messages", () => {
    expect(
      isAnalyzeTextMessage({
        type: "ANALYZE_TEXT",
        text: '{"format_version":"1.3"}',
        sourceName: "plan.json",
      }),
    ).toBe(true);
    expect(isAnalyzeTextMessage({ type: "OTHER", text: "{}" })).toBe(false);
    expect(isAnalyzeTextMessage(null)).toBe(false);
  });

  it("returns a size guard error before attempting analysis", () => {
    const result = analyzeTerraformPlanText("12345678901", {
      maxInputBytes: 10,
      sourceName: "large.json",
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("input-too-large");
    expect(result.error.sourceName).toBe("large.json");
  });

  it("normalizes tinyPlan through the shared analysis helper", () => {
    const result = analyzeTerraformPlanText(JSON.stringify(tinyPlan));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.normalizedPlan.summary.createCount).toBe(1);
    expect(result.normalizedPlan.summary.updateCount).toBe(1);
    expect(result.normalizedPlan.summary.noOpCount).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  it("normalizes riskyPlan and preserves runtime fallback warnings", () => {
    const result = analyzeTerraformPlanText(JSON.stringify(riskyPlan), {
      extraWarnings: [createWorkerUnavailableWarning()],
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.normalizedPlan.summary.replaceCount).toBe(1);
    expect(result.warnings.map((warning) => warning.code)).toContain(
      "worker-unavailable",
    );
  });

  it("returns a friendly invalid-plan error for non-plan JSON", () => {
    const result = analyzeTerraformPlanText(
      JSON.stringify(malformedPlanLikeObject),
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("invalid-plan");
  });

  it("measures UTF-8 text size in bytes", () => {
    expect(getTextSizeBytes("abc")).toBe(3);
    expect(getTextSizeBytes("a🙂")).toBeGreaterThan(2);
  });
});
