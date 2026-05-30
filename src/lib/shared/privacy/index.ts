export {
  containsSecretLikeString,
  detectSecretLikeString,
  isSensitiveKeyName,
} from "@/lib/shared/privacy/secretDetection";
export {
  redactTerraformPlan,
  redactText,
} from "@/lib/shared/privacy/redactTerraformPlan";
export { createStableAnonymizer } from "@/lib/shared/privacy/stableAnonymizer";
export {
  DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  type RedactionOptions,
  type RedactionScope,
  type SecretDetectionKind,
  type SecretDetectionMatch,
  type StableAnonymizer,
  type StablePlaceholderCategory,
  type TerraformPlanRedactionSettings,
} from "@/lib/shared/privacy/redactionTypes";
