"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  riskyPlan,
  tinyPlan,
} from "@/features/terraform-plan/fixtures/samplePlans";
import {
  analysisStateReducer,
  createInitialAnalysisState,
} from "@/features/terraform-plan/state/analysisState";
import {
  ANALYSIS_NORMALIZING_PROGRESS_MESSAGE,
  analyzeTerraformPlanText,
  createInputTooLargeError,
  createWorkerUnavailableWarning,
  DEFAULT_MAX_TERRAFORM_PLAN_INPUT_BYTES,
  getTextSizeBytes,
  type TerraformPlanWorkerOutputMessage,
} from "@/features/terraform-plan/worker/workerMessages";
import { createAnalysisWorker } from "@/lib/shared/worker/createAnalysisWorker";

const samplePlanMap = {
  riskyPlan,
  tinyPlan,
} as const;

export type TerraformPlanSampleKey = keyof typeof samplePlanMap;

function createTerraformPlanWorker(): Worker {
  return createAnalysisWorker(
    new URL("../worker/terraformPlanWorker.ts", import.meta.url),
  );
}

export function useTerraformPlanAnalyzer() {
  const [state, dispatch] = useReducer(
    analysisStateReducer,
    undefined,
    createInitialAnalysisState,
  );
  const workerRef = useRef<Worker | null>(null);
  const analysisGenerationRef = useRef(0);

  const terminateWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const reset = useCallback(() => {
    terminateWorker();
    dispatch({ type: "RESET" });
  }, [terminateWorker]);

  useEffect(() => terminateWorker, [terminateWorker]);

  const runFallbackAnalysis = useCallback(
    async (text: string, sourceName?: string, generationId?: number) => {
      const generation = generationId ?? analysisGenerationRef.current;
      const fallbackWarning = createWorkerUnavailableWarning();

      dispatch({
        type: "SET_PROGRESS",
        status: "parsing",
        message: fallbackWarning.message,
      });

      await Promise.resolve();

      if (generation !== analysisGenerationRef.current) {
        return;
      }

      const result = analyzeTerraformPlanText(text, {
        sourceName,
        extraWarnings: [fallbackWarning],
      });

      if (generation !== analysisGenerationRef.current) {
        return;
      }

      if (result.ok) {
        dispatch({
          type: "SET_SUCCESS",
          normalizedPlan: result.normalizedPlan,
          warnings: result.warnings,
        });
        return;
      }

      dispatch({
        type: "SET_ERROR",
        error: result.error,
        warnings: [fallbackWarning],
      });
    },
    [],
  );

  const analyzeText = useCallback(
    (text: string, sourceName?: string) => {
      analysisGenerationRef.current += 1;
      const generation = analysisGenerationRef.current;

      dispatch({
        type: "REQUEST_ANALYSIS",
        inputText: text,
        sourceName,
      });

      const inputSizeBytes = getTextSizeBytes(text);

      if (inputSizeBytes > DEFAULT_MAX_TERRAFORM_PLAN_INPUT_BYTES) {
        dispatch({
          type: "SET_ERROR",
          error: createInputTooLargeError(
            inputSizeBytes,
            DEFAULT_MAX_TERRAFORM_PLAN_INPUT_BYTES,
            sourceName,
          ),
        });
        return;
      }

      if (typeof Worker === "undefined") {
        void runFallbackAnalysis(text, sourceName, generation);
        return;
      }

      terminateWorker();

      let worker: Worker;

      try {
        worker = createTerraformPlanWorker();
      } catch {
        void runFallbackAnalysis(text, sourceName, generation);
        return;
      }

      workerRef.current = worker;

      worker.onmessage = (
        event: MessageEvent<TerraformPlanWorkerOutputMessage>,
      ) => {
        if (generation !== analysisGenerationRef.current) {
          return;
        }

        const message = event.data;

        switch (message.type) {
          case "ANALYSIS_STARTED":
            dispatch({
              type: "SET_PROGRESS",
              status: "parsing",
              message: "Analysis started.",
            });
            break;
          case "ANALYSIS_PROGRESS":
            dispatch({
              type: "SET_PROGRESS",
              status:
                message.message === ANALYSIS_NORMALIZING_PROGRESS_MESSAGE
                  ? "analyzing"
                  : "parsing",
              message: message.message,
            });
            break;
          case "ANALYSIS_SUCCESS":
            dispatch({
              type: "SET_SUCCESS",
              normalizedPlan: message.normalizedPlan,
              warnings: message.warnings,
            });
            terminateWorker();
            break;
          case "ANALYSIS_ERROR":
            dispatch({
              type: "SET_ERROR",
              error: message.error,
            });
            terminateWorker();
            break;
          default:
            break;
        }
      };

      worker.onerror = () => {
        terminateWorker();
        void runFallbackAnalysis(text, sourceName, generation);
      };

      worker.postMessage({
        type: "ANALYZE_TEXT",
        text,
        sourceName,
      });
    },
    [runFallbackAnalysis, terminateWorker],
  );

  const loadSample = useCallback(
    (sampleKey: TerraformPlanSampleKey) => {
      const sample = samplePlanMap[sampleKey];
      const sourceName = `${sampleKey}.json`;

      analyzeText(JSON.stringify(sample, null, 2), sourceName);
    },
    [analyzeText],
  );

  return {
    status: state.status,
    inputText: state.inputText,
    normalizedPlan: state.normalizedPlan,
    warnings: state.warnings,
    error: state.error,
    sourceName: state.sourceName,
    progressMessage: state.progressMessage,
    analyzeText,
    reset,
    loadSample,
  };
}
