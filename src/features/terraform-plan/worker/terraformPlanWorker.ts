/// <reference lib="webworker" />

import {
  analyzeTerraformPlanText,
  isAnalyzeTextMessage,
  type TerraformPlanWorkerInputMessage,
  type TerraformPlanWorkerOutputMessage,
} from "@/features/terraform-plan/worker/workerMessages";

declare const self: DedicatedWorkerGlobalScope;

function postMessage(message: TerraformPlanWorkerOutputMessage) {
  self.postMessage(message);
}

self.onmessage = (
  event: MessageEvent<TerraformPlanWorkerInputMessage | unknown>,
) => {
  const data = event.data;

  if (!isAnalyzeTextMessage(data)) {
    postMessage({
      type: "ANALYSIS_ERROR",
      error: {
        code: "worker-runtime-error",
        message: "The analysis worker received an unsupported message.",
      },
    });
    return;
  }

  postMessage({ type: "ANALYSIS_STARTED" });

  try {
    const result = analyzeTerraformPlanText(data.text, {
      sourceName: data.sourceName,
      onProgress: (message) => {
        postMessage({ type: "ANALYSIS_PROGRESS", message });
      },
    });

    if (result.ok) {
      postMessage({
        type: "ANALYSIS_SUCCESS",
        normalizedPlan: result.normalizedPlan,
        warnings: result.warnings,
      });
      return;
    }

    postMessage({
      type: "ANALYSIS_ERROR",
      error: result.error,
    });
  } catch (error) {
    postMessage({
      type: "ANALYSIS_ERROR",
      error: {
        code: "worker-runtime-error",
        message: "The analysis worker hit an unexpected error.",
        details:
          error instanceof Error ? error.message : "Unknown worker failure.",
        sourceName: data.sourceName,
      },
    });
  }
};

export {};
