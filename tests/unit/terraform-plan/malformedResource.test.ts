import { describe, expect, it } from "vitest";
import { analyzeTerraformPlanText } from "@/features/terraform-plan/worker/workerMessages";

describe("malformed resource_changes entries", () => {
  it("survives resource changes missing type field", () => {
    const plan = {
      format_version: "1.3",
      resource_changes: [
        {
          address: "aws_instance.example",
          change: { actions: ["update"] },
          name: "example",
          mode: "managed",
        },
      ],
    };

    const result = analyzeTerraformPlanText(JSON.stringify(plan));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalizedPlan.resourceChanges[0]?.typeGroup).toBe("unknown");
    }
  });
});
