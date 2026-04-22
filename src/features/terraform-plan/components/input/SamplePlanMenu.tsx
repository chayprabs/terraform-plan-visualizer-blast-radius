import { useState } from "react";
import type { TerraformPlanSampleKey } from "@/features/terraform-plan/hooks/useTerraformPlanAnalyzer";

interface SamplePlanMenuProps {
  onLoadSample: (sampleKey: TerraformPlanSampleKey) => void;
}

export function SamplePlanMenu({ onLoadSample }: SamplePlanMenuProps) {
  const [value, setValue] = useState("");

  return (
    <label className="border-border bg-background text-foreground inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium">
      <span>Load sample</span>
      <select
        aria-label="Load sample plan"
        className="bg-background text-foreground min-w-36 outline-none"
        onChange={(event) => {
          const sampleKey = event.target.value as TerraformPlanSampleKey;

          if (sampleKey) {
            onLoadSample(sampleKey);
            setValue("");
          }
        }}
        value={value}
      >
        <option value="">Choose...</option>
        <option value="tinyPlan">Tiny sample</option>
        <option value="riskyPlan">Risky sample</option>
      </select>
    </label>
  );
}
