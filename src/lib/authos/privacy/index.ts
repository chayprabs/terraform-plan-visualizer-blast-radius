export {
  containsSecretLikeString,
  detectSecretLikeString,
  isSensitiveKeyName,
} from "@/lib/authos/privacy/secretDetection";
export {
  redactTerraformPlan,
  redactText,
} from "@/lib/authos/privacy/redactTerraformPlan";
export { createStableAnonymizer } from "@/lib/authos/privacy/stableAnonymizer";
export {
  DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  type RedactionOptions,
  type RedactionScope,
  type SecretDetectionKind,
  type SecretDetectionMatch,
  type StableAnonymizer,
  type StablePlaceholderCategory,
  type TerraformPlanRedactionSettings,
} from "@/lib/authos/privacy/redactionTypes";
