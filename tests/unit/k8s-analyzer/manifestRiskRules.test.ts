import { describe, expect, it } from "vitest";
import { MANIFEST_RISK_RULES } from "@/features/k8s-analyzer/risk/evaluateManifestRisk";

describe("manifest risk rule registry", () => {
  it("includes at least ten manifest risk rules", () => {
    expect(MANIFEST_RISK_RULES.length).toBeGreaterThanOrEqual(10);
    expect(MANIFEST_RISK_RULES.map((rule) => rule.id)).toEqual(
      expect.arrayContaining([
        "latest-image-tag",
        "missing-limits",
        "missing-requests",
        "privileged",
        "run-as-root",
        "privilege-escalation",
        "hostpath",
        "cluster-admin-binding",
        "deprecated-api-version",
        "recreate-strategy",
        "automount-sa-token",
      ]),
    );
  });
});
