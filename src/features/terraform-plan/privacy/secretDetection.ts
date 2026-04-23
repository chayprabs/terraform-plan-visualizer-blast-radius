import type {
  SecretDetectionKind,
  SecretDetectionMatch,
} from "@/features/terraform-plan/privacy/redactionTypes";

const sensitiveKeyPattern =
  /(?:^|[_-])(password|secret|client_secret|access_token|id_token|refresh_token|token|credential|access_key|api_key)(?:$|[_-])/i;
const sensitiveAssignmentPattern =
  /\b[A-Za-z0-9_-]*(?:password|secret|client_secret|access_token|id_token|refresh_token|token|credential|access_key|api_key)[A-Za-z0-9_-]*\b\s*[:=]\s*.+/i;
const detectorDefinitions: Array<{
  kind: SecretDetectionKind;
  pattern: RegExp;
}> = [
  {
    kind: "aws_access_key",
    pattern: /\b(?:AKIA|ASIA|AIDA|AROA)[A-Z0-9]{16}\b/g,
  },
  {
    kind: "github_token",
    pattern:
      /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  },
  {
    kind: "slack_token",
    pattern: /\bxox(?:a|b|p|r|s)-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    kind: "stripe_key",
    pattern: /\b(?:pk|rk|sk)_(?:live|test)_[A-Za-z0-9]{10,}\b/g,
  },
  {
    kind: "private_key",
    pattern:
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    kind: "bearer_token",
    pattern: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi,
  },
];

export function isSensitiveKeyName(key: string): boolean {
  return sensitiveKeyPattern.test(key.trim());
}

export function detectSecretLikeString(
  value: string,
  keyPath: string[] = [],
): SecretDetectionMatch[] {
  const matches: SecretDetectionMatch[] = [];

  if (
    keyPath.some((segment) => isSensitiveKeyName(segment)) ||
    sensitiveAssignmentPattern.test(value)
  ) {
    matches.push({
      kind: "sensitive_key",
      match: value,
    });
  }

  for (const { kind, pattern } of detectorDefinitions) {
    const detectedMatches = value.match(pattern) ?? [];

    for (const match of detectedMatches) {
      matches.push({
        kind,
        match,
      });
    }
  }

  return matches;
}

export function containsSecretLikeString(
  value: string,
  keyPath: string[] = [],
): boolean {
  return detectSecretLikeString(value, keyPath).length > 0;
}
