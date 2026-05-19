import type { ParsedHcl } from "@/features/hcl-linter/domain/parseHcl";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatCell(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  if (typeof value === "string") {
    return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  return `\`${JSON.stringify(value)}\``;
}

function formatVariableSection(parsed: ParsedHcl): string {
  const variables = parsed.variable;

  if (!isRecord(variables) || Object.keys(variables).length === 0) {
    return "_No variables defined._\n";
  }

  const rows: string[] = [];

  for (const [name, blocks] of Object.entries(variables).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const entries = Array.isArray(blocks) ? blocks : [blocks];

    for (const block of entries) {
      if (!isRecord(block)) {
        continue;
      }

      rows.push(
        `| ${name} | ${formatCell(block.type)} | ${formatCell(block.default)} | ${formatCell(block.description)} |`,
      );
    }
  }

  return [
    "| Name | Type | Default | Description |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function formatOutputSection(parsed: ParsedHcl): string {
  const outputs = parsed.output;

  if (!isRecord(outputs) || Object.keys(outputs).length === 0) {
    return "_No outputs defined._\n";
  }

  const rows: string[] = [];

  for (const [name, blocks] of Object.entries(outputs).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const entries = Array.isArray(blocks) ? blocks : [blocks];

    for (const block of entries) {
      if (!isRecord(block)) {
        continue;
      }

      rows.push(
        `| ${name} | ${formatCell(block.description)} | ${formatCell(block.value)} | ${formatCell(block.sensitive)} |`,
      );
    }
  }

  return [
    "| Name | Description | Value | Sensitive |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

function formatResourceSection(parsed: ParsedHcl): string {
  const resources = parsed.resource;

  if (!isRecord(resources) || Object.keys(resources).length === 0) {
    return "_No resources defined._\n";
  }

  const rows: string[] = [];

  for (const [type, names] of Object.entries(resources).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (!isRecord(names)) {
      continue;
    }

    for (const [name, blocks] of Object.entries(names).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const entries = Array.isArray(blocks) ? blocks : [blocks];
      const count = entries.length;

      rows.push(
        `| ${type} | ${name} | ${count > 1 ? `${count} blocks` : "1 block"} |`,
      );
    }
  }

  return [
    "| Type | Name | Blocks |",
    "| --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
}

export function generateModuleDocs(
  parsed: ParsedHcl,
  options: { title?: string } = {},
): string {
  const title = options.title?.trim() || "Terraform module";

  return [
    `# ${title}`,
    "",
    "Generated from the current HCL input. Review descriptions and defaults before publishing.",
    "",
    "## Variables",
    "",
    formatVariableSection(parsed),
    "## Outputs",
    "",
    formatOutputSection(parsed),
    "## Resources",
    "",
    formatResourceSection(parsed),
  ].join("\n");
}
