import type { TerraformPlanSampleKey } from "@/features/terraform-plan/hooks/useTerraformPlanAnalyzer";
import { cn } from "@/lib/utils";
import { SamplePlanMenu } from "@/features/terraform-plan/components/input/SamplePlanMenu";

interface InputToolbarProps {
  autoAnalyze: boolean;
  canAnalyze: boolean;
  copyState: "copied" | "error" | "idle";
  isBusy: boolean;
  onAnalyze: () => void;
  onAutoAnalyzeChange: (nextValue: boolean) => void;
  onClear: () => void;
  onCopyCommand: () => void;
  onLoadSample: (sampleKey: TerraformPlanSampleKey) => void;
}

export function InputToolbar({
  autoAnalyze,
  canAnalyze,
  copyState,
  isBusy,
  onAnalyze,
  onAutoAnalyzeChange,
  onClear,
  onCopyCommand,
  onLoadSample,
}: InputToolbarProps) {
  return (
    <div className="border-border flex flex-col gap-3 border-b p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SamplePlanMenu onLoadSample={onLoadSample} />
          <button
            type="button"
            className="border-border bg-background text-foreground hover:bg-surface-muted rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150"
            onClick={onCopyCommand}
          >
            Copy command
          </button>
          <button
            type="button"
            className="border-border bg-background text-foreground hover:bg-surface-muted rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150"
            onClick={onClear}
          >
            Clear
          </button>
        </div>

        <button
          type="button"
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150",
            canAnalyze && !isBusy
              ? "bg-brand text-brand-foreground"
              : "bg-surface-muted text-muted-foreground cursor-not-allowed",
          )}
          disabled={!canAnalyze || isBusy}
          onClick={onAnalyze}
        >
          {isBusy ? "Analyzing..." : "Analyze plan"}
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-foreground inline-flex items-center gap-3 text-sm font-medium">
          <input
            checked={autoAnalyze}
            className="border-border h-4 w-4 rounded"
            onChange={(event) => onAutoAnalyzeChange(event.target.checked)}
            type="checkbox"
          />
          Auto-analyze
        </label>

        <p
          className={cn(
            "text-sm",
            copyState === "copied" && "text-positive",
            copyState === "error" && "text-warning",
            copyState === "idle" && "text-muted-foreground",
          )}
        >
          {copyState === "copied"
            ? "Terraform command copied."
            : copyState === "error"
              ? "Clipboard access is unavailable here."
              : "Auto-analyze starts off for pasted text and turns on when a sample loads."}
        </p>
      </div>
    </div>
  );
}
