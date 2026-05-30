export function createAnalysisWorker(workerModuleUrl: URL): Worker {
  return new Worker(workerModuleUrl, { type: "module" });
}
