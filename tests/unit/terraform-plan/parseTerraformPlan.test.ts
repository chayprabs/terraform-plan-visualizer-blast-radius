import { describe, expect, it } from "vitest";
import {
  EMPTY_PLAN_INPUT_MESSAGE,
  INVALID_PLAN_JSON_MESSAGE,
  WRONG_PLAN_FILE_MESSAGE,
  parseTerraformPlanJson,
} from "@/features/terraform-plan/domain/parseTerraformPlan";
import { validateTerraformPlanShape } from "@/features/terraform-plan/domain/planValidation";
import {
  malformedPlanLikeObject,
  riskyPlan,
  tinyPlan,
} from "@/features/terraform-plan/fixtures/samplePlans";

describe("parseTerraformPlanJson", () => {
  it("returns a friendly error for empty input", () => {
    expect(parseTerraformPlanJson("   ")).toEqual({
      ok: false,
      error: {
        code: "empty-input",
        message: EMPTY_PLAN_INPUT_MESSAGE,
      },
    });
  });

  it("returns a friendly error and location details for invalid JSON", () => {
    const result = parseTerraformPlanJson('{\n  "format_version": "1.3",\n');

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("invalid-json");
    expect(result.error.message).toBe(INVALID_PLAN_JSON_MESSAGE);
    expect(result.error.line).toBeGreaterThanOrEqual(1);
    expect(result.error.column).toBeGreaterThanOrEqual(1);
  });

  it("rejects valid JSON that is not a Terraform plan", () => {
    const result = parseTerraformPlanJson(
      JSON.stringify(malformedPlanLikeObject, null, 2),
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("invalid-plan");
    expect(result.error.message).toBe(WRONG_PLAN_FILE_MESSAGE);
  });

  it("parses tinyPlan successfully", () => {
    const result = parseTerraformPlanJson(JSON.stringify(tinyPlan));

    expect(result).toEqual({
      ok: true,
      plan: tinyPlan,
    });
  });

  it("parses riskyPlan successfully", () => {
    const result = parseTerraformPlanJson(JSON.stringify(riskyPlan));

    expect(result).toEqual({
      ok: true,
      plan: riskyPlan,
    });
  });
});

describe("validateTerraformPlanShape", () => {
  it("accepts a valid plan while warning about missing resource_changes", () => {
    const validation = validateTerraformPlanShape({
      format_version: "1.3",
      planned_values: {
        root_module: {},
      },
    });

    expect(validation.valid).toBe(true);
    expect(validation.warnings.map((warning) => warning.code)).toContain(
      "missing-resource-changes",
    );
  });

  it("warns when JSON looks like a Terraform state file", () => {
    const validation = validateTerraformPlanShape({
      version: 4,
      lineage: "example",
      serial: 1,
      values: {
        root_module: {},
      },
    });

    expect(validation.valid).toBe(false);
    expect(validation.warnings.map((warning) => warning.code)).toContain(
      "state-file-detected",
    );
  });
});
