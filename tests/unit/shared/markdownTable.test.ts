import { describe, expect, it } from "vitest";
import { formatMarkdownTable } from "@/lib/shared/export/markdownTable";

describe("formatMarkdownTable", () => {
  it("formats a markdown table with header separator", () => {
    expect(
      formatMarkdownTable([
        ["Metric", "Value"],
        ["Creates", "2"],
      ]),
    ).toEqual([
      "| Metric | Value |",
      "| --- | --- |",
      "| Creates | 2 |",
    ]);
  });
});
