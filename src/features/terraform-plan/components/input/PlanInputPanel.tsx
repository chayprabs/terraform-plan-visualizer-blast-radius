import { useState } from "react";
import type { TerraformPlanSampleKey } from "@/features/terraform-plan/hooks/useTerraformPlanAnalyzer";
import { cn } from "@/lib/utils";
import { InputToolbar } from "@/features/terraform-plan/components/input/InputToolbar";
import { PastePlanEditor } from "@/features/terraform-plan/components/input/PastePlanEditor";
import { PrivacyNotice } from "@/features/terraform-plan/components/input/PrivacyNotice";
import { UploadPlanDropzone } from "@/features/terraform-plan/components/input/UploadPlanDropzone";

export type PlanInputTab = "paste" | "upload";

export interface PlanInputNotice {
  description: string;
  tone: "critical" | "default" | "positive" | "warning";
  title: string;
}

interface PlanInputPanelProps {
  activeTab: PlanInputTab;
  autoAnalyze: boolean;
  canAnalyze: boolean;
  copyState: "copied" | "error" | "idle";
  fileInfo?: {
    name: string;
    size: number;
  } | null;
  isBusy: boolean;
  notice: PlanInputNotice;
  onAnalyze: () => void;
  onAutoAnalyzeChange: (nextValue: boolean) => void;
  onClear: () => void;
  onCopyCommand: () => void;
  onLoadSample: (sampleKey: TerraformPlanSampleKey) => void;
  onSelectFile: (file: File) => void;
  onTabChange: (tab: PlanInputTab) => void;
  onTextChange: (value: string) => void;
  value: string;
}

const noticeToneClasses = {
  critical: "border-critical bg-critical-soft text-critical",
  default: "border-border bg-surface-muted text-foreground",
  positive: "border-positive bg-positive-soft text-positive",
  warning: "border-warning bg-warning-soft text-warning",
} as const;

export function PlanInputPanel({
  activeTab,
  autoAnalyze,
  canAnalyze,
  copyState,
  fileInfo,
  isBusy,
  notice,
  onAnalyze,
  onAutoAnalyzeChange,
  onClear,
  onCopyCommand,
  onLoadSample,
  onSelectFile,
  onTabChange,
  onTextChange,
  value,
}: PlanInputPanelProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  return (
    <div
      className={cn(
        "border-border bg-background rounded-lg border transition-colors duration-150",
        isDragActive && "border-brand bg-surface-muted",
      )}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragActive(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragActive(false);
        const file = event.dataTransfer.files?.[0];

        if (file) {
          onTabChange("upload");
          onSelectFile(file);
        }
      }}
    >
      <div
        className="border-border flex items-center gap-2 border-b p-3"
        role="tablist"
        aria-label="Plan input methods"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "paste"}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
            activeTab === "paste"
              ? "bg-brand text-brand-foreground"
              : "text-muted-foreground hover:bg-surface-muted",
          )}
          onClick={() => onTabChange("paste")}
        >
          Paste JSON
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "upload"}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
            activeTab === "upload"
              ? "bg-brand text-brand-foreground"
              : "text-muted-foreground hover:bg-surface-muted",
          )}
          onClick={() => onTabChange("upload")}
        >
          Upload file
        </button>
      </div>

      <InputToolbar
        autoAnalyze={autoAnalyze}
        canAnalyze={canAnalyze}
        copyState={copyState}
        isBusy={isBusy}
        onAnalyze={onAnalyze}
        onAutoAnalyzeChange={onAutoAnalyzeChange}
        onClear={onClear}
        onCopyCommand={onCopyCommand}
        onLoadSample={onLoadSample}
      />

      <div className="space-y-4 p-4 sm:p-5">
        {activeTab === "paste" ? (
          <PastePlanEditor onChange={onTextChange} value={value} />
        ) : (
          <UploadPlanDropzone
            fileInfo={fileInfo}
            isDragActive={isDragActive}
            onSelectFile={onSelectFile}
          />
        )}

        <div
          className={cn(
            "rounded-lg border px-4 py-3",
            noticeToneClasses[notice.tone],
          )}
        >
          <p className="text-sm font-semibold">{notice.title}</p>
          <p className="mt-1 text-sm leading-6">{notice.description}</p>
        </div>

        <PrivacyNotice />
      </div>
    </div>
  );
}
