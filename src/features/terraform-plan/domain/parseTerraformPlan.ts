import {
  validateTerraformPlanShape,
  type PlanValidationResult,
} from "@/features/terraform-plan/domain/planValidation";
import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";

export const EMPTY_PLAN_INPUT_MESSAGE =
  "Paste Terraform plan JSON or upload a .json file to analyze.";
export const INVALID_PLAN_JSON_MESSAGE =
  "This is not valid JSON. Generate a plan with: terraform show -json tfplan > plan.json";
export const WRONG_PLAN_FILE_MESSAGE =
  "This looks like JSON, but not Terraform plan JSON. The analyzer expects output from terraform show -json.";

export interface ParseTerraformPlanError {
  code: "empty-input" | "invalid-json" | "invalid-plan";
  message: string;
  details?: string;
  line?: number;
  column?: number;
  position?: number;
  validation?: PlanValidationResult;
}

export type ParseTerraformPlanResult =
  | {
      ok: true;
      plan: TerraformPlan;
    }
  | {
      ok: false;
      error: ParseTerraformPlanError;
    };

interface JsonErrorLocation {
  position?: number;
  line?: number;
  column?: number;
}

function computeLineAndColumn(
  input: string,
  position?: number,
): Pick<JsonErrorLocation, "line" | "column"> {
  if (position === undefined || position < 0 || position > input.length) {
    return {};
  }

  const consumed = input.slice(0, position);
  const lineParts = consumed.split(/\r\n|\r|\n/);

  return {
    line: lineParts.length,
    column: (lineParts.at(-1)?.length ?? 0) + 1,
  };
}

function extractJsonErrorLocation(
  input: string,
  message: string,
): JsonErrorLocation {
  const fullMatch = message.match(
    /position\s+(\d+)(?:\s+\(line\s+(\d+)\s+column\s+(\d+)\))?/i,
  );

  if (!fullMatch) {
    return {};
  }

  const position = Number.parseInt(fullMatch[1] ?? "", 10);
  const parsedLine = Number.parseInt(fullMatch[2] ?? "", 10);
  const parsedColumn = Number.parseInt(fullMatch[3] ?? "", 10);
  const computedLocation = computeLineAndColumn(input, position);

  return {
    position,
    line: Number.isFinite(parsedLine) ? parsedLine : computedLocation.line,
    column: Number.isFinite(parsedColumn)
      ? parsedColumn
      : computedLocation.column,
  };
}

export function parseTerraformPlanJson(
  input: string,
): ParseTerraformPlanResult {
  if (input.trim().length === 0) {
    return {
      ok: false,
      error: {
        code: "empty-input",
        message: EMPTY_PLAN_INPUT_MESSAGE,
      },
    };
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(input);
  } catch (error) {
    const details =
      error instanceof Error ? error.message : "Unable to parse JSON input.";
    const location = extractJsonErrorLocation(input, details);

    return {
      ok: false,
      error: {
        code: "invalid-json",
        message: INVALID_PLAN_JSON_MESSAGE,
        details,
        ...location,
      },
    };
  }

  const validation = validateTerraformPlanShape(parsedValue);

  if (!validation.valid || !validation.plan) {
    return {
      ok: false,
      error: {
        code: "invalid-plan",
        message: WRONG_PLAN_FILE_MESSAGE,
        details: validation.errors[0]?.message ?? validation.warnings[0]?.message,
        validation,
      },
    };
  }

  return {
    ok: true,
    plan: validation.plan,
  };
}
