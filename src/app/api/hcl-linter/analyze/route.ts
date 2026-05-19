import { generateModuleDocs } from "@/features/hcl-linter/docs/generateModuleDocs";
import { HclParseError, parseHcl } from "@/features/hcl-linter/domain/parseHcl";
import { lintParsedHcl } from "@/features/hcl-linter/lint/hclLintRules";

export const runtime = "nodejs";

interface AnalyzeRequestBody {
  source?: string;
}

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;

  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const source = typeof body.source === "string" ? body.source : "";

  if (!source.trim()) {
    return Response.json({ error: "HCL source is required." }, { status: 400 });
  }

  try {
    const parsed = await parseHcl(source);
    const findings = lintParsedHcl(parsed);
    const docs = generateModuleDocs(parsed, {
      title: "Terraform HCL module",
    });

    return Response.json({ findings, docs });
  } catch (error) {
    const message =
      error instanceof HclParseError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Failed to parse HCL.";

    return Response.json({ error: message }, { status: 400 });
  }
}
