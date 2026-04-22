import type { AttributeDiffUnknownState } from "@/features/terraform-plan/diff/attributeDiffTypes";

interface FormatDiffValueOptions {
  isSensitive?: boolean;
  maxPreviewItems?: number;
  maxStringLength?: number;
  unknownState?: AttributeDiffUnknownState;
}

function truncateString(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function formatPrimitive(value: string | number | boolean | null): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return String(value);
}

function formatArray(
  value: unknown[],
  maxPreviewItems: number,
  maxStringLength: number,
): string {
  if (value.length === 0) {
    return "[]";
  }

  const previewItems = value
    .slice(0, maxPreviewItems)
    .map((item) => formatDiffValue(item, { maxPreviewItems, maxStringLength }));
  const suffix =
    value.length > maxPreviewItems ? `, ... (${value.length} items)` : "";

  return `[${previewItems.join(", ")}${suffix}]`;
}

function formatObject(
  value: Record<string, unknown>,
  maxPreviewItems: number,
  maxStringLength: number,
): string {
  const keys = Object.keys(value).sort();

  if (keys.length === 0) {
    return "{}";
  }

  const previewEntries = keys.slice(0, maxPreviewItems).map((key) => {
    const formattedValue = formatDiffValue(value[key], {
      maxPreviewItems,
      maxStringLength,
    });

    return `${key}: ${formattedValue}`;
  });
  const suffix =
    keys.length > maxPreviewItems ? `, ... (${keys.length} keys)` : "";

  return `{ ${previewEntries.join(", ")}${suffix} }`;
}

export function formatDiffValue(
  value: unknown,
  options: FormatDiffValueOptions = {},
): string {
  const {
    isSensitive = false,
    maxPreviewItems = 3,
    maxStringLength = 120,
    unknownState = null,
  } = options;

  if (isSensitive) {
    return "[sensitive value]";
  }

  if (unknownState === "unknown-after-apply") {
    return "Unknown after apply";
  }

  if (unknownState === "known-after-apply") {
    return "Known after apply";
  }

  if (value === undefined) {
    return "—";
  }

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return formatPrimitive(value);
  }

  if (typeof value === "string") {
    return JSON.stringify(truncateString(value, maxStringLength));
  }

  if (Array.isArray(value)) {
    return formatArray(value, maxPreviewItems, maxStringLength);
  }

  if (typeof value === "object") {
    return formatObject(
      value as Record<string, unknown>,
      maxPreviewItems,
      maxStringLength,
    );
  }

  return String(value);
}
