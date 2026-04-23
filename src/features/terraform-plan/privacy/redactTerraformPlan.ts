import type {
  TerraformLooseObject,
  TerraformPlan,
  TerraformResourceChange,
} from "@/features/terraform-plan/domain/terraformPlanTypes";
import { createStableAnonymizer } from "@/features/terraform-plan/privacy/stableAnonymizer";
import {
  containsSecretLikeString,
  isSensitiveKeyName,
} from "@/features/terraform-plan/privacy/secretDetection";
import {
  DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  type RedactionOptions,
  type RedactionScope,
  type StableAnonymizer,
  type StablePlaceholderCategory,
  type TerraformPlanRedactionSettings,
} from "@/features/terraform-plan/privacy/redactionTypes";

const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const ACCOUNT_ID_PATTERN = /\b\d{12}\b/g;
const DOMAIN_PATTERN =
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
const MODULE_ADDRESS_PATTERN = /\b(?:module\.[A-Za-z0-9_\-\[\]"']+)+\b/g;
const TERRAFORM_ADDRESS_PATTERN =
  /\b(?:module\.[A-Za-z0-9_\-\[\]"']+\.)*(?:data\.)?[a-z0-9]+_[a-z0-9_]+\.[A-Za-z0-9_\-\[\]"']+\b/g;
const DOMAIN_LIKE_KEY_PATTERN =
  /(?:^|[_-])(domain|fqdn|host|hostname)(?:$|[_-])/i;
const IP_LIKE_KEY_PATTERN =
  /(?:^|[_-])(ip|ip_address|private_ip|public_ip)(?:$|[_-])/i;
const RESOURCE_NAME_KEY_PATTERN =
  /(?:^|[_-])(bucket|identifier|name|resource)(?:$|[_-])/i;
const ACCOUNT_LIKE_KEY_PATTERN =
  /(?:^|[_-])(account|account_id|project|project_id|subscription)(?:$|[_-])/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getSettings(
  settings?: TerraformPlanRedactionSettings,
): TerraformPlanRedactionSettings {
  return settings ?? DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS;
}

function getScope(scope?: RedactionScope): RedactionScope {
  return scope ?? "export";
}

function getAnonymizer(anonymizer?: StableAnonymizer): StableAnonymizer {
  return anonymizer ?? createStableAnonymizer();
}

function getSecretPlaceholder(
  _anonymizer: StableAnonymizer,
  _originalValue: string,
): string {
  void _anonymizer;
  void _originalValue;
  return "[redacted]";
}

function replaceMatches(
  value: string,
  pattern: RegExp,
  category: StablePlaceholderCategory,
  anonymizer: StableAnonymizer,
): string {
  return value.replace(pattern, (match) => anonymizer.anonymize(category, match));
}

function normalizeIndexedSegment(segment: string): {
  base: string;
  suffix: string;
} {
  const bracketIndex = segment.indexOf("[");

  if (bracketIndex < 0) {
    return {
      base: segment,
      suffix: "",
    };
  }

  return {
    base: segment.slice(0, bracketIndex),
    suffix: segment.slice(bracketIndex),
  };
}

function splitTerraformAddress(address: string): string[] {
  const segments: string[] = [];
  let current = "";
  let bracketDepth = 0;

  for (const character of address) {
    if (character === "." && bracketDepth === 0) {
      if (current.length > 0) {
        segments.push(current);
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

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

function anonymizeTerraformAddress(
  address: string,
  anonymizer: StableAnonymizer,
): string {
  const segments = splitTerraformAddress(address);
  const nextSegments: string[] = [];
  let cursor = 0;

  while (segments[cursor] === "module" && typeof segments[cursor + 1] === "string") {
    const normalizedSegment = normalizeIndexedSegment(segments[cursor + 1] ?? "");

    nextSegments.push("module");
    nextSegments.push(
      `${anonymizer.anonymize("module", normalizedSegment.base)}${normalizedSegment.suffix}`,
    );
    cursor += 2;
  }

  if (segments[cursor] === "data") {
    nextSegments.push("data");
    cursor += 1;
  }

  if (typeof segments[cursor] === "string") {
    nextSegments.push(segments[cursor]!);
    cursor += 1;
  }

  if (typeof segments[cursor] === "string") {
    const normalizedSegment = normalizeIndexedSegment(segments[cursor] ?? "");

    nextSegments.push(
      `${anonymizer.anonymize("resource", normalizedSegment.base)}${normalizedSegment.suffix}`,
    );
    cursor += 1;
  }

  return [...nextSegments, ...segments.slice(cursor)].join(".");
}

function maskSensitiveAssignmentLine(
  value: string,
  anonymizer: StableAnonymizer,
): string {
  return value.replace(
    /\b([A-Za-z0-9_-]*(?:password|secret|client_secret|access_token|id_token|refresh_token|token|credential|access_key|api_key)[A-Za-z0-9_-]*)\b(\s*[:=]\s*)([^,\n]+)/gi,
    (_, key, separator, originalValue) =>
      `${key}${separator}${getSecretPlaceholder(anonymizer, String(originalValue).trim())}`,
  );
}

function maskSecretLikeText(
  value: string,
  keyPath: string[],
  anonymizer: StableAnonymizer,
): string {
  const sensitiveKeyPath = keyPath.some((segment) => isSensitiveKeyName(segment));

  if (sensitiveKeyPath) {
    return getSecretPlaceholder(anonymizer, value);
  }

  let nextValue = maskSensitiveAssignmentLine(value, anonymizer);

  if (
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/.test(
      nextValue,
    )
  ) {
    return nextValue.replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      (match) => getSecretPlaceholder(anonymizer, match),
    );
  }

  nextValue = nextValue.replace(/\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi, (match) => {
    const [scheme] = match.split(/\s+/, 1);

    return `${scheme} ${getSecretPlaceholder(anonymizer, match)}`;
  });

  nextValue = nextValue.replace(
    /\b(?:AKIA|ASIA|AIDA|AROA)[A-Z0-9]{16}\b/g,
    (match) => getSecretPlaceholder(anonymizer, match),
  );
  nextValue = nextValue.replace(
    /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
    (match) => getSecretPlaceholder(anonymizer, match),
  );
  nextValue = nextValue.replace(
    /\bxox(?:a|b|p|r|s)-[A-Za-z0-9-]{10,}\b/g,
    (match) => getSecretPlaceholder(anonymizer, match),
  );
  nextValue = nextValue.replace(
    /\b(?:pk|rk|sk)_(?:live|test)_[A-Za-z0-9]{10,}\b/g,
    (match) => getSecretPlaceholder(anonymizer, match),
  );

  return nextValue;
}

function redactString(
  value: string,
  settings: TerraformPlanRedactionSettings,
  scope: RedactionScope,
  keyPath: string[],
  anonymizer: StableAnonymizer,
): string {
  let nextValue = value;
  const keyName = keyPath.at(-1) ?? "";
  const isAccountLikeKey = ACCOUNT_LIKE_KEY_PATTERN.test(keyName);
  const isDomainLikeKey = DOMAIN_LIKE_KEY_PATTERN.test(keyName);
  const isIpLikeKey = IP_LIKE_KEY_PATTERN.test(keyName);
  const isResourceNameKey =
    RESOURCE_NAME_KEY_PATTERN.test(keyName) &&
    !isAccountLikeKey &&
    !isDomainLikeKey &&
    !isIpLikeKey;

  if (settings.detectSecretLikeStrings && containsSecretLikeString(value, keyPath)) {
    nextValue = maskSecretLikeText(nextValue, keyPath, anonymizer);
  }

  if (scope === "display") {
    return nextValue;
  }

  if (settings.anonymizeResourceNamesInExports) {
    if (keyPath.some((segment) => /(?:^|[_-])address(?:$|[_-])/i.test(segment))) {
      nextValue = anonymizeTerraformAddress(nextValue, anonymizer);
    } else if (isResourceNameKey) {
      nextValue = anonymizer.anonymize("resource", nextValue);
    } else {
      nextValue = nextValue.replace(TERRAFORM_ADDRESS_PATTERN, (match) =>
        anonymizeTerraformAddress(match, anonymizer),
      );
      nextValue = nextValue.replace(MODULE_ADDRESS_PATTERN, (match) =>
        anonymizeTerraformAddress(match, anonymizer),
      );
    }
  }

  if (settings.maskCloudAccountIdsInExports) {
    nextValue = replaceMatches(nextValue, ACCOUNT_ID_PATTERN, "account", anonymizer);
  }

  if (settings.maskIpAddressesInExports) {
    nextValue = replaceMatches(nextValue, IPV4_PATTERN, "ip", anonymizer);
  }

  if (settings.maskDomainNamesInExports) {
    nextValue = replaceMatches(nextValue, DOMAIN_PATTERN, "domain", anonymizer);
  }

  return nextValue;
}

function redactUnknownValue(
  value: unknown,
  settings: TerraformPlanRedactionSettings,
  scope: RedactionScope,
  anonymizer: StableAnonymizer,
  keyPath: string[],
): unknown {
  if (typeof value === "string") {
    return redactString(value, settings, scope, keyPath, anonymizer);
  }

  if (typeof value === "number") {
    const keyName = keyPath.at(-1) ?? "";

    if (
      scope === "export" &&
      settings.maskCloudAccountIdsInExports &&
      ACCOUNT_LIKE_KEY_PATTERN.test(keyName) &&
      /^\d{12}$/.test(String(value))
    ) {
      return anonymizer.anonymize("account", String(value));
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      redactUnknownValue(entry, settings, scope, anonymizer, [
        ...keyPath,
        String(index),
      ]),
    );
  }

  if (!isRecord(value)) {
    return value;
  }

  const nextValue: TerraformLooseObject = {};

  for (const [key, entry] of Object.entries(value)) {
    if (
      settings.maskTerraformSensitiveValues &&
      key === "before" &&
      "before_sensitive" in value
    ) {
      nextValue[key] = applySensitiveMask(
        entry,
        value.before_sensitive,
        settings,
        scope,
        anonymizer,
        [...keyPath, key],
      );
      continue;
    }

    if (
      settings.maskTerraformSensitiveValues &&
      key === "after" &&
      "after_sensitive" in value
    ) {
      nextValue[key] = applySensitiveMask(
        entry,
        value.after_sensitive,
        settings,
        scope,
        anonymizer,
        [...keyPath, key],
      );
      continue;
    }

    nextValue[key] = redactUnknownValue(
      entry,
      settings,
      scope,
      anonymizer,
      [...keyPath, key],
    );
  }

  return nextValue;
}

export function applySensitiveMask(
  value: unknown,
  mask: unknown,
  settings: TerraformPlanRedactionSettings = DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  scope: RedactionScope = "display",
  anonymizer: StableAnonymizer = createStableAnonymizer(),
  keyPath: string[] = [],
): unknown {
  if (mask === true) {
    return "[sensitive value]";
  }

  if (Array.isArray(value)) {
    const maskEntries = Array.isArray(mask) ? mask : [];

    return value.map((entry, index) =>
      applySensitiveMask(
        entry,
        maskEntries[index],
        settings,
        scope,
        anonymizer,
        [...keyPath, String(index)],
      ),
    );
  }

  if (isRecord(value)) {
    const maskRecord = isRecord(mask) ? mask : {};
    const keys = Array.from(
      new Set([...Object.keys(value), ...Object.keys(maskRecord)]),
    ).sort();
    const nextValue: TerraformLooseObject = {};

    for (const key of keys) {
      const maskedValue = applySensitiveMask(
        value[key],
        maskRecord[key],
        settings,
        scope,
        anonymizer,
        [...keyPath, key],
      );

      if (maskedValue !== undefined || key in value || maskRecord[key] === true) {
        nextValue[key] = maskedValue;
      }
    }

    return nextValue;
  }

  return redactUnknownValue(value, settings, scope, anonymizer, keyPath);
}

export function redactTerraformValue(
  value: unknown,
  options: RedactionOptions = {},
): unknown {
  const settings = getSettings(options.settings);
  const scope = getScope(options.scope);
  const anonymizer = getAnonymizer(options.anonymizer);

  return redactUnknownValue(value, settings, scope, anonymizer, []);
}

export function redactText(
  value: string,
  options: RedactionOptions = {},
): string {
  const settings = getSettings(options.settings);
  const scope = getScope(options.scope);
  const anonymizer = getAnonymizer(options.anonymizer);

  return redactString(value, settings, scope, [], anonymizer);
}

export function redactTerraformPlan(
  plan: TerraformPlan,
  options: RedactionOptions = {},
): TerraformPlan {
  return redactTerraformValue(plan, options) as TerraformPlan;
}

export function redactTerraformResourceChangeRaw(
  resourceChange: TerraformResourceChange,
  options: RedactionOptions = {},
): TerraformResourceChange {
  return redactTerraformValue(resourceChange, options) as TerraformResourceChange;
}
