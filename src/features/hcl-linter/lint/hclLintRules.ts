import type { ParsedHcl } from "@/features/hcl-linter/domain/parseHcl";
import {
  containsSecretLikeString,
  isSensitiveKeyName,
} from "@/lib/shared/privacy";

export type HclLintSeverity = "error" | "warning" | "info";

export interface HclLintFinding {
  ruleId: string;
  message: string;
  severity: HclLintSeverity;
  path: string[];
}

const PUBLIC_CIDRS = new Set(["0.0.0.0/0", "::/0"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function walkValues(
  value: unknown,
  path: string[],
  visit: (path: string[], value: string) => void,
): void {
  if (typeof value === "string") {
    visit(path, value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      walkValues(entry, [...path, String(index)], visit);
    });
    return;
  }

  if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      walkValues(entry, [...path, key], visit);
    }
  }
}

function lintPublicCidrs(parsed: ParsedHcl): HclLintFinding[] {
  const findings: HclLintFinding[] = [];

  walkValues(parsed, [], (path, value) => {
    for (const cidr of PUBLIC_CIDRS) {
      if (!value.includes(cidr)) {
        continue;
      }

      findings.push({
        ruleId: "public-cidr",
        severity: "warning",
        path,
        message: `Public CIDR ${cidr} found in a string value. Confirm this exposure is intentional.`,
      });
    }
  });

  return findings;
}

function lintHardcodedSecrets(parsed: ParsedHcl): HclLintFinding[] {
  const findings: HclLintFinding[] = [];

  walkValues(parsed, [], (path, value) => {
    const trimmed = value.trim();

    if (!trimmed || trimmed.startsWith("${")) {
      return;
    }

    const keyPath = path.filter((segment) => !/^\d+$/.test(segment));
    const leafKey = keyPath.at(-1) ?? "";

    if (
      !isSensitiveKeyName(leafKey) &&
      !containsSecretLikeString(trimmed, keyPath)
    ) {
      return;
    }

    findings.push({
      ruleId: "hardcoded-secret",
      severity: "error",
      path,
      message:
        "Hardcoded secret-like string detected. Use variables, secrets managers, or environment references instead.",
    });
  });

  return findings;
}

function lintMissingVariableDescriptions(
  parsed: ParsedHcl,
): HclLintFinding[] {
  const findings: HclLintFinding[] = [];
  const variables = parsed.variable;

  if (!isRecord(variables)) {
    return findings;
  }

  for (const [name, blocks] of Object.entries(variables)) {
    const entries = Array.isArray(blocks) ? blocks : [blocks];

    for (const [index, block] of entries.entries()) {
      if (!isRecord(block)) {
        continue;
      }

      const description =
        typeof block.description === "string" ? block.description.trim() : "";

      if (description) {
        continue;
      }

      findings.push({
        ruleId: "missing-variable-description",
        severity: "warning",
        path: ["variable", name, String(index)],
        message: `Variable "${name}" is missing a description. Add one to document module inputs for reviewers.`,
      });
    }
  }

  return findings;
}

export function lintParsedHcl(parsed: ParsedHcl): HclLintFinding[] {
  return [
    ...lintPublicCidrs(parsed),
    ...lintHardcodedSecrets(parsed),
    ...lintMissingVariableDescriptions(parsed),
  ];
}
