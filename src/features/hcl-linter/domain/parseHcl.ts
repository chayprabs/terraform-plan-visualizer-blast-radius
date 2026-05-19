import { parse as parseHcl2Json } from "@cdktf/hcl2json";

export type ParsedHcl = Record<string, unknown>;

export class HclParseError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "HclParseError";
    this.cause = cause;
  }
}

export async function parseHcl(
  source: string,
  filename = "input.tf",
): Promise<ParsedHcl> {
  try {
    const result = await parseHcl2Json(filename, source);
    return result as ParsedHcl;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse HCL input.";

    throw new HclParseError(message, error);
  }
}
