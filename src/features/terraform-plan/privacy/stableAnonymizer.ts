import type {
  StableAnonymizer,
  StablePlaceholderCategory,
} from "@/features/terraform-plan/privacy/redactionTypes";

const categoryPrefixes: Record<StablePlaceholderCategory, string> = {
  account: "account",
  domain: "domain",
  ip: "ip",
  module: "module",
  resource: "resource",
  secret: "secret",
};

function formatCounter(value: number): string {
  return String(value).padStart(3, "0");
}

export function createStableAnonymizer(): StableAnonymizer {
  const categoryMaps = new Map<StablePlaceholderCategory, Map<string, string>>();
  const categoryCounts = new Map<StablePlaceholderCategory, number>();

  return {
    anonymize(category, originalValue) {
      const normalizedValue = originalValue.trim();
      const existingCategoryMap = categoryMaps.get(category) ?? new Map<string, string>();
      const existingValue = existingCategoryMap.get(normalizedValue);

      if (existingValue) {
        return existingValue;
      }

      const nextCount = (categoryCounts.get(category) ?? 0) + 1;
      const nextValue = `${categoryPrefixes[category]}_${formatCounter(nextCount)}`;

      existingCategoryMap.set(normalizedValue, nextValue);
      categoryMaps.set(category, existingCategoryMap);
      categoryCounts.set(category, nextCount);

      return nextValue;
    },
  };
}
