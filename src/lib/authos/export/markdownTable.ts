export function formatMarkdownTable(rows: string[][]): string[] {
  if (rows.length === 0) {
    return [];
  }

  const header = rows[0]!;

  return [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...rows.slice(1).map((row) => `| ${row.join(" | ")} |`),
  ];
}
