import {
  detectSecretLikeString,
  redactText,
  type TerraformPlanRedactionSettings,
} from "@/lib/authos/privacy";

const STABLE_PLACEHOLDER_PATTERN =
  /\b(?:account|domain|ip|module|resource)_\d{3}\b/g;

function countRedactionReplacements(
  originalText: string,
  redactedText: string,
): number {
  const addedRedactedMarkers =
    (redactedText.match(/\[redacted\]/g) ?? []).length -
    (originalText.match(/\[redacted\]/g) ?? []).length;

  const originalPlaceholders = new Set(
    originalText.match(STABLE_PLACEHOLDER_PATTERN) ?? [],
  );
  const addedPlaceholders = (redactedText.match(STABLE_PLACEHOLDER_PATTERN) ?? [])
    .filter((placeholder) => !originalPlaceholders.has(placeholder)).length;

  return addedRedactedMarkers + addedPlaceholders;
}

export function redactArbitraryText(
  text: string,
  settings: TerraformPlanRedactionSettings,
): { redactedText: string; replacementCount: number } {
  const detectedSecrets = settings.detectSecretLikeStrings
    ? detectSecretLikeString(text)
    : [];

  const redactedText = redactText(text, {
    scope: "export",
    settings,
  });

  const replacementCount = countRedactionReplacements(text, redactedText);

  return {
    redactedText,
    replacementCount:
      replacementCount > 0
        ? replacementCount
        : detectedSecrets.length > 0 && text !== redactedText
          ? 1
          : replacementCount,
  };
}
