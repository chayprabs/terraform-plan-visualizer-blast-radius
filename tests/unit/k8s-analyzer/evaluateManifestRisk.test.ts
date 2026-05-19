import { describe, expect, it } from "vitest";
import { parseManifests } from "@/features/k8s-analyzer/domain/parseManifests";
import {
  evaluateManifestRisk,
  getHighestManifestSeverity,
} from "@/features/k8s-analyzer/risk/evaluateManifestRisk";
import {
  riskyManifest,
  safeManifest,
} from "@/features/k8s-analyzer/fixtures/sampleManifests";

describe("parseManifests", () => {
  it("returns no manifests for empty input", () => {
    expect(parseManifests("   ")).toEqual({ manifests: [], errors: [] });
  });

  it("records YAML syntax errors", () => {
    const parsed = parseManifests("apiVersion: [\n  broken");

    expect(parsed.manifests).toHaveLength(0);
    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0]?.documentIndex).toBe(0);
    expect(parsed.errors[0]?.message.length).toBeGreaterThan(0);
  });

  it("records missing kind and apiVersion per document", () => {
    const parsed = parseManifests(`apiVersion: v1
kind: Pod
metadata:
  name: ok
---
metadata:
  name: missing-fields
`);

    expect(parsed.manifests).toHaveLength(1);
    expect(parsed.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentIndex: 1,
          message: expect.stringContaining("kind"),
        }),
      ]),
    );
  });

  it("parses multi-document YAML with kind and spec highlights", () => {
    const parsed = parseManifests(safeManifest);

    expect(parsed.errors).toHaveLength(0);
    expect(parsed.manifests).toHaveLength(2);
    expect(parsed.manifests[1]?.kind).toBe("Deployment");
    expect(parsed.manifests[1]?.specHighlights.some((highlight) => highlight.label.includes("image"))).toBe(
      true,
    );
  });
});

describe("evaluateManifestRisk", () => {
  it("returns low risk for the safe sample", () => {
    const parsed = parseManifests(safeManifest);
    const report = evaluateManifestRisk(parsed.manifests);

    expect(report.level).toBe("low");
    expect(report.highRiskFindingCount).toBe(0);
    expect(getHighestManifestSeverity(report.findings)).toBeNull();
  });

  it("flags risky sample issues across required rule categories", () => {
    const parsed = parseManifests(riskyManifest);
    const report = evaluateManifestRisk(parsed.manifests);

    expect(report.level).toBe("critical");
    expect(report.highRiskFindingCount).toBeGreaterThanOrEqual(3);
    const categories = new Set(report.findings.map((finding) => finding.category));

    for (const category of [
      "image",
      "security_context",
      "volumes",
      "rbac",
      "api_version",
    ] as const) {
      expect(categories.has(category)).toBe(true);
    }
    expect(
      report.findings.some((finding) => finding.id.startsWith("latest-image-tag")),
    ).toBe(true);
    expect(
      report.findings.some((finding) => finding.id.startsWith("privileged-container")),
    ).toBe(true);
    expect(report.findings.some((finding) => finding.id.startsWith("hostpath"))).toBe(
      true,
    );
    expect(
      report.findings.some((finding) =>
        finding.id.startsWith("cluster-admin-binding"),
      ),
    ).toBe(true);
    expect(
      report.findings.some((finding) =>
        finding.id.startsWith("deprecated-api"),
      ),
    ).toBe(true);
  });

  it("detects missing resource limits", () => {
    const yaml = `apiVersion: v1
kind: Pod
metadata:
  name: no-limits
spec:
  containers:
    - name: app
      image: alpine:3.20
`;

    const parsed = parseManifests(yaml);
    const report = evaluateManifestRisk(parsed.manifests);

    expect(
      report.findings.some((finding) => finding.id.startsWith("missing-limits")),
    ).toBe(true);
  });
});
