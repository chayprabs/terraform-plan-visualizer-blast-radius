import { describe, expect, it } from "vitest";
import { parseHcl } from "@/features/hcl-linter/domain/parseHcl";
import { generateModuleDocs } from "@/features/hcl-linter/docs/generateModuleDocs";
import { lintParsedHcl } from "@/features/hcl-linter/lint/hclLintRules";

const publicCidrHcl = `
resource "aws_security_group" "web" {
  ingress {
    cidr_blocks = ["0.0.0.0/0"]
  }
}
`;

const missingDescriptionHcl = `
variable "region" {
  type = string
}
`;

const secretHcl = `
resource "aws_instance" "app" {
  api_key = "AKIAIOSFODNN7EXAMPLE"
}
`;

const documentedModuleHcl = `
variable "name" {
  description = "Resource name"
  type        = string
}

output "name" {
  description = "Echoes the configured name"
  value       = var.name
}

resource "null_resource" "example" {}
`;

describe("parseHcl", () => {
  it("parses Terraform HCL into JSON", async () => {
    const parsed = await parseHcl(missingDescriptionHcl);

    expect(parsed.variable).toEqual(
      expect.objectContaining({
        region: expect.arrayContaining([
          expect.objectContaining({ type: "${string}" }),
        ]),
      }),
    );
  });
});

describe("hclLintRules", () => {
  it("flags public CIDR strings", async () => {
    const parsed = await parseHcl(publicCidrHcl);
    const findings = lintParsedHcl(parsed);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "public-cidr",
          severity: "warning",
        }),
      ]),
    );
  });

  it("flags missing variable descriptions", async () => {
    const parsed = await parseHcl(missingDescriptionHcl);
    const findings = lintParsedHcl(parsed);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "missing-variable-description",
          path: ["variable", "region", "0"],
        }),
      ]),
    );
  });

  it("flags hardcoded secret-like strings", async () => {
    const parsed = await parseHcl(secretHcl);
    const findings = lintParsedHcl(parsed);

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "hardcoded-secret",
          severity: "error",
        }),
      ]),
    );
  });
});

describe("generateModuleDocs", () => {
  it("renders variables, outputs, and resources tables", async () => {
    const parsed = await parseHcl(documentedModuleHcl);
    const docs = generateModuleDocs(parsed, { title: "Sample module" });

    expect(docs).toContain("# Sample module");
    expect(docs).toContain("## Variables");
    expect(docs).toContain("| name |");
    expect(docs).toContain("## Outputs");
    expect(docs).toContain("| name |");
    expect(docs).toContain("## Resources");
    expect(docs).toContain("| null_resource | example |");
  });
});
