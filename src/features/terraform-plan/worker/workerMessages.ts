import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import {
  parseTerraformPlanJson,
  type ParseTerraformPlanError,
} from "@/features/terraform-plan/domain/parseTerraformPlan";
import {
  validateTerraformPlanShape,
  type PlanValidationIssue,
} from "@/features/terraform-plan/domain/planValidation";
import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";

export const DEFAULT_MAX_TERRAFORM_PLAN_INPUT_BYTES = 25 * 1024 * 1024;
export const ANALYSIS_PARSING_PROGRESS_MESSAGE =
  "Parsing Terraform plan JSON...";
export const ANALYSIS_NORMALIZING_PROGRESS_MESSAGE =
  "Normalizing Terraform plan changes...";

export interface AnalysisWarning {
  code: string;
  message: string;
  source: "validation" | "runtime";
}

export interface AnalysisError {
  code:
    | ParseTerraformPlanError["code"]
    | "input-too-large"
    | "worker-runtime-error";
  message: string;
  details?: string;
  sourceName?: string;
  line?: number;
  column?: number;
  position?: number;
  inputSizeBytes?: number;
  maxInputBytes?: number;
  validation?: {
    errors: PlanValidationIssue[];
    warnings: PlanValidationIssue[];
  };
}

export interface AnalyzeTextMessage {
  type: "ANALYZE_TEXT";
  text: string;
  sourceName?: string;
}

export interface AnalysisStartedMessage {
  type: "ANALYSIS_STARTED";
}

export interface AnalysisProgressMessage {
  type: "ANALYSIS_PROGRESS";
  message: string;
}

export interface AnalysisSuccessMessage {
  type: "ANALYSIS_SUCCESS";
  normalizedPlan: NormalizedPlan;
  warnings: AnalysisWarning[];
}

export interface AnalysisErrorMessage {
  type: "ANALYSIS_ERROR";
  error: AnalysisError;
}

export type TerraformPlanWorkerInputMessage = AnalyzeTextMessage;

export type TerraformPlanWorkerOutputMessage =
  | AnalysisStartedMessage
  | AnalysisProgressMessage
  | AnalysisSuccessMessage
  | AnalysisErrorMessage;

export type AnalyzeTerraformPlanTextResult =
  | {
      ok: true;
      normalizedPlan: NormalizedPlan;
      warnings: AnalysisWarning[];
    }
  | {
      ok: false;
      error: AnalysisError;
    };

export interface AnalyzeTerraformPlanTextOptions {
  maxInputBytes?: number;
  onProgress?: (message: string) => void;
  sourceName?: string;
  extraWarnings?: AnalysisWarning[];
}

export function getTextSizeBytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export function isAnalyzeTextMessage(
  value: unknown,
): value is AnalyzeTextMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "ANALYZE_TEXT" &&
    "text" in value &&
    typeof value.text === "string"
  );
}

function formatSizeInMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function createWorkerUnavailableWarning(): AnalysisWarning {
  return {
    code: "worker-unavailable",
    message:
      "Web Worker support is unavailable here, so analysis is falling back to local main-thread parsing.",
    source: "runtime",
  };
}

export function createInputTooLargeError(
  inputSizeBytes: number,
  maxInputBytes: number,
  sourceName?: string,
): AnalysisError {
  return {
    code: "input-too-large",
    message: `This input is larger than the ${formatSizeInMegabytes(maxInputBytes)} local analysis limit. Split the plan or trim unrelated changes before analyzing.`,
    details: sourceName
      ? `${sourceName} is ${inputSizeBytes.toLocaleString()} bytes.`
      : `Input size: ${inputSizeBytes.toLocaleString()} bytes.`,
    sourceName,
    inputSizeBytes,
    maxInputBytes,
  };
}

function mapParseError(
  error: ParseTerraformPlanError,
  inputSizeBytes: number,
  sourceName?: string,
): AnalysisError {
  return {
    code: error.code,
    message: error.message,
    details: error.details,
    sourceName,
    line: error.line,
    column: error.column,
    position: error.position,
    inputSizeBytes,
    validation: error.validation
      ? {
          errors: error.validation.errors,
          warnings: error.validation.warnings,
        }
      : undefined,
  };
}

function mapValidationWarnings(
  warnings: PlanValidationIssue[],
): AnalysisWarning[] {
  return warnings.map((warning) => ({
    code: warning.code,
    message: warning.message,
    source: "validation",
  }));
}

export function analyzeTerraformPlanText(
  text: string,
  options: AnalyzeTerraformPlanTextOptions = {},
): AnalyzeTerraformPlanTextResult {
  const maxInputBytes =
    options.maxInputBytes ?? DEFAULT_MAX_TERRAFORM_PLAN_INPUT_BYTES;
  const inputSizeBytes = getTextSizeBytes(text);

  if (inputSizeBytes > maxInputBytes) {
    return {
      ok: false,
      error: createInputTooLargeError(
        inputSizeBytes,
        maxInputBytes,
        options.sourceName,
      ),
    };
  }

  options.onProgress?.(ANALYSIS_PARSING_PROGRESS_MESSAGE);

  const parsedResult = parseTerraformPlanJson(text);

  if (!parsedResult.ok) {
    return {
      ok: false,
      error: mapParseError(
        parsedResult.error,
        inputSizeBytes,
        options.sourceName,
      ),
    };
  }

  options.onProgress?.(ANALYSIS_NORMALIZING_PROGRESS_MESSAGE);

  const validation = validateTerraformPlanShape(parsedResult.plan);
  const normalizedPlan = normalizeTerraformPlan(parsedResult.plan);

  return {
    ok: true,
    normalizedPlan,
    warnings: [
      ...mapValidationWarnings(validation.warnings),
      ...(options.extraWarnings ?? []),
    ],
  };
}
