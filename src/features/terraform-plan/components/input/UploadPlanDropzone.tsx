import { useId } from "react";
import { cn } from "@/lib/utils";

interface UploadedFileInfo {
  name: string;
  size: number;
}

interface UploadPlanDropzoneProps {
  fileInfo?: UploadedFileInfo | null;
  isDragActive: boolean;
  onSelectFile: (file: File) => void;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${bytes} bytes`;
}

export function UploadPlanDropzone({
  fileInfo,
  isDragActive,
  onSelectFile,
}: UploadPlanDropzoneProps) {
  const inputId = useId();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-foreground text-sm font-semibold">Upload plan file</p>
        <p className="text-muted-foreground mt-1 text-sm leading-6">
          Drop a file here or choose one from your device. We support
          <code> .json </code>
          and
          <code> .tfplan.json </code>
          naming, but we inspect the contents instead of rejecting on extension
          alone.
        </p>
      </div>

      <div
        className={cn(
          "border-border bg-background rounded-lg border border-dashed p-6 text-center transition-colors duration-150",
          isDragActive && "border-brand bg-surface-muted",
        )}
      >
        <input
          id={inputId}
          accept=".json,.tfplan.json,application/json,text/json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              onSelectFile(file);
            }

            event.currentTarget.value = "";
          }}
          type="file"
        />

        <label
          htmlFor={inputId}
          className="bg-brand text-brand-foreground inline-flex cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-transform duration-150 hover:-translate-y-0.5"
        >
          Choose file
        </label>

        <p className="text-foreground mt-4 text-sm font-medium">
          Drag and drop a Terraform plan JSON file onto this panel.
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Preferred file names are <code>plan.json</code> or
          <code> something.tfplan.json</code>.
        </p>
      </div>

      {fileInfo ? (
        <div className="border-border bg-surface-muted rounded-lg border px-4 py-3">
          <p className="text-foreground text-sm font-semibold">Loaded file</p>
          <p className="text-foreground mt-2 text-sm">{fileInfo.name}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatBytes(fileInfo.size)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
