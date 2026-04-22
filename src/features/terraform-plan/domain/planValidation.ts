import type { TerraformPlan } from "@/features/terraform-plan/domain/terraformPlanTypes";

export type PlanValidationIssueCode =
  | "invalid-root"
  | "missing-plan-sections"
  | "invalid-format-version"
  | "missing-format-version"
  | "invalid-resource-changes"
  | "missing-resource-changes"
  | "empty-resource-changes"
  | "invalid-output-changes"
  | "invalid-planned-values"
  | "invalid-configuration"
  | "state-file-detected";

export interface PlanValidationIssue {
  code: PlanValidationIssueCode;
  message: string;
}

export interface PlanValidationResult {
  valid: boolean;
  errors: PlanValidationIssue[];
  warnings: PlanValidationIssue[];
  plan?: TerraformPlan;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function looksLikeTerraformStateFile(value: Record<string, unknown>): boolean {
  const hasStateMarkers =
    typeof value.lineage === "string" ||
    typeof value.serial === "number" ||
    isRecord(value.values) ||
    Array.isArray(value.resources);

  return hasStateMarkers && !("resource_changes" in value);
}

export function validateTerraformPlanShape(
  value: unknown,
): PlanValidationResult {
  const errors: PlanValidationIssue[] = [];
  const warnings: PlanValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      valid: false,
      errors: [
        {
          code: "invalid-root",
          message: "Terraform plan JSON must be a JSON object at the top level.",
        },
      ],
      warnings,
    };
  }

  if (!("format_version" in value)) {
    warnings.push({
      code: "missing-format-version",
      message: "The plan is missing format_version.",
    });
  } else if (
    value.format_version !== undefined &&
    typeof value.format_version !== "string"
  ) {
    errors.push({
      code: "invalid-format-version",
      message: "The plan format_version must be a string when present.",
    });
  }

  if (!("resource_changes" in value)) {
    warnings.push({
      code: "missing-resource-changes",
      message: "The plan does not include resource_changes.",
    });
  } else if (!Array.isArray(value.resource_changes)) {
    errors.push({
      code: "invalid-resource-changes",
      message: "The plan resource_changes field must be an array when present.",
    });
  } else if (value.resource_changes.length === 0) {
    warnings.push({
      code: "empty-resource-changes",
      message: "The plan resource_changes array is empty.",
    });
  }

  if ("output_changes" in value && value.output_changes != null) {
    if (!isRecord(value.output_changes)) {
      errors.push({
        code: "invalid-output-changes",
        message: "The plan output_changes field must be an object when present.",
      });
    }
  }

  if ("planned_values" in value && value.planned_values != null) {
    if (!isRecord(value.planned_values)) {
      errors.push({
        code: "invalid-planned-values",
        message: "The plan planned_values field must be an object when present.",
      });
    }
  }

  if ("configuration" in value && value.configuration != null) {
    if (!isRecord(value.configuration)) {
      errors.push({
        code: "invalid-configuration",
        message: "The plan configuration field must be an object when present.",
      });
    }
  }

  const hasUsablePlanSection =
    Array.isArray(value.resource_changes) ||
    isRecord(value.output_changes) ||
    isRecord(value.planned_values) ||
    isRecord(value.configuration);

  if (!hasUsablePlanSection) {
    errors.push({
      code: "missing-plan-sections",
      message:
        "Terraform plan JSON should include resource_changes, output_changes, planned_values, or configuration.",
    });
  }

  if (looksLikeTerraformStateFile(value)) {
    warnings.push({
      code: "state-file-detected",
      message:
        "This JSON looks more like a Terraform state file than terraform show -json output.",
    });
  }

  return {
    valid: errors.length === 0 && hasUsablePlanSection,
    errors,
    warnings,
    plan:
      errors.length === 0 && hasUsablePlanSection
        ? (value as TerraformPlan)
        : undefined,
  };
}
