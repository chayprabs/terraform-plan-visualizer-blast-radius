import type { TerraformLooseObject } from "@/features/terraform-plan/domain/terraformPlanTypes";

function splitTerraformTraversal(reference: string): string[] {
  const segments: string[] = [];
  let current = "";
  let bracketDepth = 0;

  for (const character of reference) {
    if (character === "." && bracketDepth === 0) {
      if (current.trim().length > 0) {
        segments.push(current.trim());
      }

      current = "";
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
    } else if (character === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
    }

    current += character;
  }

  if (current.trim().length > 0) {
    segments.push(current.trim());
  }

  return segments;
}

function isLiteralIndex(indexExpression: string): boolean {
  const trimmed = indexExpression.trim();

  return (
    /^-?\d+$/.test(trimmed) ||
    /^"[^"]*"$/.test(trimmed) ||
    /^'[^']*'$/.test(trimmed)
  );
}

function sanitizeTraversalSegment(segment: string): string {
  const bracketIndex = segment.indexOf("[");

  if (bracketIndex < 0) {
    return segment;
  }

  const baseSegment = segment.slice(0, bracketIndex);
  const bracketExpressions = Array.from(segment.matchAll(/\[([^\]]+)\]/g));

  if (
    bracketExpressions.length > 0 &&
    bracketExpressions.every((match) => isLiteralIndex(match[1] ?? ""))
  ) {
    return segment;
  }

  return baseSegment;
}

function isIgnorableReferenceRoot(segment: string): boolean {
  return [
    "count",
    "each",
    "local",
    "path",
    "provider",
    "self",
    "terraform",
    "var",
  ].includes(segment);
}

function looksLikeResourceType(segment: string): boolean {
  return segment.includes("_");
}

function collectReferencesFromExpression(
  expression: unknown,
  references: string[],
): void {
  if (Array.isArray(expression)) {
    for (const item of expression) {
      collectReferencesFromExpression(item, references);
    }

    return;
  }

  if (typeof expression !== "object" || expression === null) {
    return;
  }

  for (const [key, value] of Object.entries(expression as TerraformLooseObject)) {
    if (key === "references" && Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim().length > 0) {
          references.push(item.trim());
        }
      }

      continue;
    }

    collectReferencesFromExpression(value, references);
  }
}

export function normalizeTerraformReference(reference: string): string | null {
  const segments = splitTerraformTraversal(reference.trim()).map(
    sanitizeTraversalSegment,
  );

  if (segments.length === 0) {
    return null;
  }

  if (isIgnorableReferenceRoot(segments[0] ?? "")) {
    return null;
  }

  const normalizedSegments: string[] = [];
  let cursor = 0;

  while (
    segments[cursor] === "module" &&
    typeof segments[cursor + 1] === "string"
  ) {
    normalizedSegments.push("module", segments[cursor + 1]!);
    cursor += 2;
  }

  if (cursor >= segments.length) {
    return normalizedSegments.length > 0 ? normalizedSegments.join(".") : null;
  }

  if (segments[cursor] === "data") {
    const resourceType = segments[cursor + 1];
    const resourceName = segments[cursor + 2];

    if (!resourceType || !resourceName) {
      return normalizedSegments.length > 0 ? normalizedSegments.join(".") : null;
    }

    return [...normalizedSegments, "data", resourceType, resourceName].join(".");
  }

  const resourceType = segments[cursor];
  const resourceName = segments[cursor + 1];

  if (!resourceType || !resourceName || !looksLikeResourceType(resourceType)) {
    return normalizedSegments.length > 0 ? normalizedSegments.join(".") : null;
  }

  return [...normalizedSegments, resourceType, resourceName].join(".");
}

export function extractReferencesFromConfigurationExpressions(
  expressions?: Record<string, unknown> | null,
): string[] {
  if (!expressions) {
    return [];
  }

  const rawReferences: string[] = [];

  for (const expression of Object.values(expressions)) {
    collectReferencesFromExpression(expression, rawReferences);
  }

  return Array.from(
    new Set(
      rawReferences
        .map((reference) => normalizeTerraformReference(reference))
        .filter((reference): reference is string => Boolean(reference)),
    ),
  );
}
