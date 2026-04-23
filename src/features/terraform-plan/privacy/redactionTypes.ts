export type RedactionScope = "display" | "export";

export type SecretDetectionKind =
  | "aws_access_key"
  | "bearer_token"
  | "github_token"
  | "private_key"
  | "sensitive_key"
  | "slack_token"
  | "stripe_key";

export type StablePlaceholderCategory =
  | "account"
  | "domain"
  | "ip"
  | "module"
  | "resource"
  | "secret";

export interface SecretDetectionMatch {
  kind: SecretDetectionKind;
  match: string;
}

export interface TerraformPlanRedactionSettings {
  anonymizeResourceNamesInExports: boolean;
  detectSecretLikeStrings: boolean;
  maskCloudAccountIdsInExports: boolean;
  maskDomainNamesInExports: boolean;
  maskIpAddressesInExports: boolean;
  maskTerraformSensitiveValues: true;
}

export interface StableAnonymizer {
  anonymize: (
    category: StablePlaceholderCategory,
    originalValue: string,
  ) => string;
}

export interface RedactionOptions {
  anonymizer?: StableAnonymizer;
  scope?: RedactionScope;
  settings?: TerraformPlanRedactionSettings;
}

export const DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS: TerraformPlanRedactionSettings =
  {
    anonymizeResourceNamesInExports: false,
    detectSecretLikeStrings: true,
    maskCloudAccountIdsInExports: true,
    maskDomainNamesInExports: false,
    maskIpAddressesInExports: false,
    maskTerraformSensitiveValues: true,
  };
