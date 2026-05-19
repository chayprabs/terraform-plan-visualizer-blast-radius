import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/hcl-linter/analyze/route";

function postAnalyze(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/hcl-linter/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/hcl-linter/analyze", () => {
  it("returns 400 when the request body is not valid JSON", async () => {
    const response = await postAnalyze("{");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Request body must be valid JSON.",
    });
  });

  it("returns 400 when source is missing or whitespace", async () => {
    const emptyResponse = await postAnalyze({});
    expect(emptyResponse.status).toBe(400);
    await expect(emptyResponse.json()).resolves.toEqual({
      error: "HCL source is required.",
    });

    const whitespaceResponse = await postAnalyze({ source: "   \n\t" });
    expect(whitespaceResponse.status).toBe(400);
    await expect(whitespaceResponse.json()).resolves.toEqual({
      error: "HCL source is required.",
    });
  });

  it("returns 400 when source is not a string", async () => {
    const response = await postAnalyze({ source: 42 });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "HCL source is required.",
    });
  });

  it("returns 400 for syntactically invalid HCL", async () => {
    const response = await postAnalyze({
      source: 'resource "aws_s3_bucket" "logs" {',
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("returns findings and docs for valid HCL", async () => {
    const response = await postAnalyze({
      source: [
        'variable "name" {',
        '  type = string',
        "}",
        "",
        'resource "aws_s3_bucket" "logs" {',
        '  bucket = var.name',
        "}",
      ].join("\n"),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      findings: unknown[];
      docs: string;
    };

    expect(Array.isArray(body.findings)).toBe(true);
    expect(typeof body.docs).toBe("string");
    expect(body.docs).toContain("Terraform HCL module");
  });
});
