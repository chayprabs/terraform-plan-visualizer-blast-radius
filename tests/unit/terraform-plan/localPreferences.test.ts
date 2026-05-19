import { beforeEach, describe, expect, it } from "vitest";
import { normalizeTerraformPlan } from "@/features/terraform-plan/domain/normalizeTerraformPlan";
import { riskyPlan } from "@/features/terraform-plan/fixtures/samplePlans";
import {
  applyThemePreference,
  clearLocalHistory,
  createLocalHistoryEntry,
  deleteLocalHistoryEntry,
  getLocalHistoryRestorablePlan,
  listLocalHistoryEntries,
  loadLocalPreferences,
  saveLocalHistoryEntry,
} from "@/features/terraform-plan/state/localPreferences";

describe("localPreferences", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: undefined,
    });
    await clearLocalHistory();
  });

  it("defaults local history to off and applies persisted theme overrides locally", () => {
    const preferences = loadLocalPreferences();

    expect(preferences.rememberHistory).toBe(false);

    applyThemePreference("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    applyThemePreference("system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("stores redacted summaries, restorable plan JSON, and supports delete and clear operations", async () => {
    const entry = createLocalHistoryEntry(
      normalizeTerraformPlan(riskyPlan),
      "plan-ghp_abcdefghijklmnopqrstuvwxyz123456.json",
      {
        anonymizeResourceNamesInExports: false,
        detectSecretLikeStrings: true,
        maskCloudAccountIdsInExports: true,
        maskDomainNamesInExports: false,
        maskIpAddressesInExports: false,
        maskTerraformSensitiveValues: true,
      },
    );

    expect(entry.sourceName).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz123456");
    expect(entry.totalChanges).toBeGreaterThan(0);
    expect(entry.redactedPlanJson).toBeTruthy();
    expect(entry.contentSignature).toContain("plan-[redacted]");

    await saveLocalHistoryEntry(entry);

    const listed = await listLocalHistoryEntries();

    expect(listed).toHaveLength(1);
    expect(listed[0]?.hasRestorablePlan).toBe(true);

    const restored = await getLocalHistoryRestorablePlan(entry.id);

    expect(restored?.sourceName).toBe(entry.sourceName);
    expect(restored?.planJson).toContain('"format_version"');

    await deleteLocalHistoryEntry(entry.id);
    expect(await listLocalHistoryEntries()).toHaveLength(0);

    await saveLocalHistoryEntry(entry);
    await clearLocalHistory();
    expect(await listLocalHistoryEntries()).toHaveLength(0);
  });
});
