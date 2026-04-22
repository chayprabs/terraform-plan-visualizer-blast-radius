import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type {
  AnalysisError,
  AnalysisWarning,
} from "@/features/terraform-plan/worker/workerMessages";

export type TerraformPlanAnalysisStatus =
  | "idle"
  | "parsing"
  | "analyzing"
  | "success"
  | "error";

export interface TerraformPlanAnalysisState {
  status: TerraformPlanAnalysisStatus;
  inputText: string;
  normalizedPlan: NormalizedPlan | null;
  warnings: AnalysisWarning[];
  error: AnalysisError | null;
  sourceName?: string;
  progressMessage?: string;
}

type AnalysisStateAction =
  | {
      type: "REQUEST_ANALYSIS";
      inputText: string;
      sourceName?: string;
    }
  | {
      type: "SET_PROGRESS";
      status: Extract<TerraformPlanAnalysisStatus, "parsing" | "analyzing">;
      message: string;
    }
  | {
      type: "SET_SUCCESS";
      normalizedPlan: NormalizedPlan;
      warnings: AnalysisWarning[];
    }
  | {
      type: "SET_ERROR";
      error: AnalysisError;
      warnings?: AnalysisWarning[];
    }
  | {
      type: "RESET";
    };

export function createInitialAnalysisState(): TerraformPlanAnalysisState {
  return {
    status: "idle",
    inputText: "",
    normalizedPlan: null,
    warnings: [],
    error: null,
    sourceName: undefined,
    progressMessage: undefined,
  };
}

export function analysisStateReducer(
  state: TerraformPlanAnalysisState,
  action: AnalysisStateAction,
): TerraformPlanAnalysisState {
  switch (action.type) {
    case "REQUEST_ANALYSIS":
      return {
        ...state,
        status: "parsing",
        inputText: action.inputText,
        normalizedPlan: null,
        warnings: [],
        error: null,
        sourceName: action.sourceName,
        progressMessage: undefined,
      };
    case "SET_PROGRESS":
      return {
        ...state,
        status: action.status,
        progressMessage: action.message,
      };
    case "SET_SUCCESS":
      return {
        ...state,
        status: "success",
        normalizedPlan: action.normalizedPlan,
        warnings: action.warnings,
        error: null,
        progressMessage: undefined,
      };
    case "SET_ERROR":
      return {
        ...state,
        status: "error",
        normalizedPlan: null,
        error: action.error,
        warnings: action.warnings ?? [],
        progressMessage: undefined,
      };
    case "RESET":
      return createInitialAnalysisState();
    default:
      return state;
  }
}
