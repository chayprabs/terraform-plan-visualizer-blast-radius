import type { CostImpactState } from "@/features/terraform-plan/cost/costTypes";
import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import type { TerraformPlanUrlState } from "@/features/terraform-plan/state/urlState";
import {
  redactTerraformPlan,
  redactTerraformValue,
} from "@/features/terraform-plan/privacy/redactTerraformPlan";
import { createStableAnonymizer } from "@/features/terraform-plan/privacy/stableAnonymizer";
import {
  DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  type TerraformPlanRedactionSettings,
} from "@/features/terraform-plan/privacy/redactionTypes";
import type { PlanRiskLevel } from "@/features/terraform-plan/risk/riskTypes";
import { getTextSizeBytes } from "@/features/terraform-plan/worker/workerMessages";

export type ThemePreference = "dark" | "light" | "system";

export interface TerraformPlanLocalPreferences {
  redactionSettings: TerraformPlanRedactionSettings;
  rememberHistory: boolean;
  theme: ThemePreference;
}

export interface LocalHistoryEntry {
  contentSignature: string;
  hasRestorablePlan: boolean;
  highRiskFindingCount: number;
  id: string;
  riskLevel: PlanRiskLevel;
  riskScore: number;
  sourceName: string;
  storedAt: string;
  totalChanges: number;
}

export interface RestorableHistorySession {
  costImpactState?: CostImpactState;
  planJson: string;
  sourceName: string;
  urlState?: TerraformPlanUrlState;
}

interface StoredLocalHistoryEntry extends LocalHistoryEntry {
  costImpactState?: CostImpactState;
  redactedPlanJson?: string;
  urlState?: TerraformPlanUrlState;
}

export const DEFAULT_TERRAFORM_PLAN_LOCAL_PREFERENCES: TerraformPlanLocalPreferences =
  {
    redactionSettings: DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
    rememberHistory: false,
    theme: "system",
  };

/** URL share links may only enable stricter redaction flags, never weaken saved prefs. */
export function mergeRedactionSettings(
  saved: TerraformPlanRedactionSettings,
  fromUrl: TerraformPlanRedactionSettings,
): TerraformPlanRedactionSettings {
  return {
    maskTerraformSensitiveValues: true,
    detectSecretLikeStrings:
      saved.detectSecretLikeStrings || fromUrl.detectSecretLikeStrings,
    anonymizeResourceNamesInExports:
      saved.anonymizeResourceNamesInExports ||
      fromUrl.anonymizeResourceNamesInExports,
    maskCloudAccountIdsInExports:
      saved.maskCloudAccountIdsInExports || fromUrl.maskCloudAccountIdsInExports,
    maskDomainNamesInExports:
      saved.maskDomainNamesInExports || fromUrl.maskDomainNamesInExports,
    maskIpAddressesInExports:
      saved.maskIpAddressesInExports || fromUrl.maskIpAddressesInExports,
  };
}

export const MAX_LOCAL_HISTORY_ENTRIES = 20;
export const MAX_RESTORABLE_PLAN_BYTES = 10 * 1024 * 1024;

const LOCAL_PREFERENCES_KEY = "terraform-plan-local-preferences:v1";
const LOCAL_HISTORY_KEY = "terraform-plan-local-history:v2";
const LEGACY_LOCAL_HISTORY_KEY = "terraform-plan-local-history:v1";
const INDEXED_DB_NAME = "terraform-plan-history";
const INDEXED_DB_STORE = "history";
const INDEXED_DB_VERSION = 1;

function canUseDomStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

function mergePreferences(
  value: Partial<TerraformPlanLocalPreferences> | null | undefined,
): TerraformPlanLocalPreferences {
  return {
    redactionSettings: {
      ...DEFAULT_TERRAFORM_PLAN_LOCAL_PREFERENCES.redactionSettings,
      ...(value?.redactionSettings ?? {}),
      maskTerraformSensitiveValues: true,
    },
    rememberHistory:
      value?.rememberHistory ??
      DEFAULT_TERRAFORM_PLAN_LOCAL_PREFERENCES.rememberHistory,
    theme: value?.theme ?? DEFAULT_TERRAFORM_PLAN_LOCAL_PREFERENCES.theme,
  };
}

function readLocalStorageJson<T>(key: string): T | null {
  if (!canUseDomStorage()) {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);

    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeLocalStorageJson<T>(key: string, value: T): void {
  if (!canUseDomStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures and keep the experience local-only.
  }
}

function removeLocalStorageKey(key: string): void {
  if (!canUseDomStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function toPublicHistoryEntry(entry: StoredLocalHistoryEntry): LocalHistoryEntry {
  return {
    contentSignature: entry.contentSignature,
    hasRestorablePlan: Boolean(entry.redactedPlanJson),
    highRiskFindingCount: entry.highRiskFindingCount,
    id: entry.id,
    riskLevel: entry.riskLevel,
    riskScore: entry.riskScore,
    sourceName: entry.sourceName,
    storedAt: entry.storedAt,
    totalChanges: entry.totalChanges,
  };
}

function buildContentSignature(
  normalizedPlan: NormalizedPlan,
  sourceName: string | undefined,
): string {
  return [
    sourceName ?? "plan.json",
    normalizedPlan.timestamp ?? "",
    normalizedPlan.summary.totalResourceChanges,
    normalizedPlan.riskReport?.score ?? 0,
    normalizedPlan.resourceChanges.length,
  ].join(":");
}

function buildRedactedPlanJson(
  normalizedPlan: NormalizedPlan,
  settings: TerraformPlanRedactionSettings,
): string | undefined {
  const anonymizer = createStableAnonymizer();
  const redactedPlan = redactTerraformPlan(normalizedPlan.raw, {
    anonymizer,
    scope: "export",
    settings,
  });
  const planJson = JSON.stringify(redactedPlan, null, 2);

  if (getTextSizeBytes(planJson) > MAX_RESTORABLE_PLAN_BYTES) {
    return undefined;
  }

  return planJson;
}

async function openHistoryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(INDEXED_DB_STORE)) {
        database.createObjectStore(INDEXED_DB_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open local history database."));
  });
}

async function listStoredHistoryEntriesFromIndexedDb(): Promise<
  StoredLocalHistoryEntry[]
> {
  const database = await openHistoryDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(INDEXED_DB_STORE, "readonly");
    const request = transaction.objectStore(INDEXED_DB_STORE).getAll();

    request.onsuccess = () => {
      resolve(
        (request.result as StoredLocalHistoryEntry[]).sort((left, right) =>
          right.storedAt.localeCompare(left.storedAt),
        ),
      );
      database.close();
    };
    request.onerror = () => {
      database.close();
      reject(
        request.error ?? new Error("Failed to read local history entries."),
      );
    };
  });
}

async function getStoredHistoryEntryFromIndexedDb(
  id: string,
): Promise<StoredLocalHistoryEntry | null> {
  const database = await openHistoryDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(INDEXED_DB_STORE, "readonly");
    const request = transaction.objectStore(INDEXED_DB_STORE).get(id);

    request.onsuccess = () => {
      resolve((request.result as StoredLocalHistoryEntry | undefined) ?? null);
      database.close();
    };
    request.onerror = () => {
      database.close();
      reject(
        request.error ?? new Error("Failed to read local history entry."),
      );
    };
  });
}

async function replaceIndexedDbHistoryEntries(
  entries: StoredLocalHistoryEntry[],
): Promise<void> {
  const database = await openHistoryDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(INDEXED_DB_STORE, "readwrite");
    const store = transaction.objectStore(INDEXED_DB_STORE);

    store.clear();
    for (const entry of entries) {
      store.put(entry);
    }

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ?? new Error("Failed to update local history entries."),
      );
    };
  });
}

function listStoredHistoryEntriesFromLocalStorage(): StoredLocalHistoryEntry[] {
  return [
    ...(readLocalStorageJson<StoredLocalHistoryEntry[]>(LOCAL_HISTORY_KEY) ?? []),
  ].sort((left, right) => right.storedAt.localeCompare(left.storedAt));
}

function replaceLocalStorageHistoryEntries(
  entries: StoredLocalHistoryEntry[],
): void {
  writeLocalStorageJson(LOCAL_HISTORY_KEY, entries);
}

async function listStoredHistoryEntries(): Promise<StoredLocalHistoryEntry[]> {
  if (canUseIndexedDb()) {
    try {
      return await listStoredHistoryEntriesFromIndexedDb();
    } catch {
      return listStoredHistoryEntriesFromLocalStorage();
    }
  }

  return listStoredHistoryEntriesFromLocalStorage();
}

async function replaceStoredHistoryEntries(
  entries: StoredLocalHistoryEntry[],
): Promise<void> {
  if (canUseIndexedDb()) {
    try {
      await replaceIndexedDbHistoryEntries(entries);
      return;
    } catch {
      replaceLocalStorageHistoryEntries(entries);
      return;
    }
  }

  replaceLocalStorageHistoryEntries(entries);
}

export function loadLocalPreferences(): TerraformPlanLocalPreferences {
  return mergePreferences(
    readLocalStorageJson<Partial<TerraformPlanLocalPreferences>>(
      LOCAL_PREFERENCES_KEY,
    ),
  );
}

export function saveLocalPreferences(
  preferences: TerraformPlanLocalPreferences,
): TerraformPlanLocalPreferences {
  const mergedPreferences = mergePreferences(preferences);

  writeLocalStorageJson(LOCAL_PREFERENCES_KEY, mergedPreferences);

  return mergedPreferences;
}

export function applyThemePreference(theme: ThemePreference): void {
  if (typeof document === "undefined") {
    return;
  }

  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
}

export interface CreateLocalHistoryEntryOptions {
  costImpactState?: CostImpactState;
  sourceName?: string;
  urlState?: TerraformPlanUrlState;
}

export function createLocalHistoryEntry(
  normalizedPlan: NormalizedPlan,
  sourceName: string | undefined,
  settings: TerraformPlanRedactionSettings,
  options: CreateLocalHistoryEntryOptions = {},
): StoredLocalHistoryEntry {
  const anonymizer = createStableAnonymizer();
  const contentSignature = buildContentSignature(normalizedPlan, sourceName);
  const redactedPlanJson = buildRedactedPlanJson(normalizedPlan, settings);
  const entry = {
    contentSignature,
    highRiskFindingCount: normalizedPlan.riskReport?.highRiskFindingCount ?? 0,
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    riskLevel: normalizedPlan.riskReport?.level ?? "low",
    riskScore: normalizedPlan.riskReport?.score ?? 0,
    sourceName: sourceName ?? "plan.json",
    storedAt: new Date().toISOString(),
    totalChanges: normalizedPlan.summary.totalResourceChanges,
    redactedPlanJson,
    costImpactState: options.costImpactState,
    urlState: options.urlState,
  };

  return redactTerraformValue(entry, {
    anonymizer,
    scope: "export",
    settings,
  }) as StoredLocalHistoryEntry;
}

async function getStoredHistoryEntryById(
  id: string,
): Promise<StoredLocalHistoryEntry | null> {
  if (canUseIndexedDb()) {
    try {
      return await getStoredHistoryEntryFromIndexedDb(id);
    } catch {
      return (
        listStoredHistoryEntriesFromLocalStorage().find(
          (storedEntry) => storedEntry.id === id,
        ) ?? null
      );
    }
  }

  return (
    listStoredHistoryEntriesFromLocalStorage().find(
      (storedEntry) => storedEntry.id === id,
    ) ?? null
  );
}

export async function getLocalHistoryRestorableSession(
  id: string,
): Promise<RestorableHistorySession | null> {
  const entry = await getStoredHistoryEntryById(id);

  if (!entry?.redactedPlanJson) {
    return null;
  }

  return {
    costImpactState: entry.costImpactState,
    planJson: entry.redactedPlanJson,
    sourceName: entry.sourceName,
    urlState: entry.urlState,
  };
}

export async function getLocalHistoryRestorablePlan(
  id: string,
): Promise<{ planJson: string; sourceName: string } | null> {
  const session = await getLocalHistoryRestorableSession(id);

  if (!session) {
    return null;
  }

  return {
    planJson: session.planJson,
    sourceName: session.sourceName,
  };
}

function migrateLegacyLocalStorageHistory(): StoredLocalHistoryEntry[] {
  const legacy =
    readLocalStorageJson<StoredLocalHistoryEntry[]>(LEGACY_LOCAL_HISTORY_KEY) ??
    [];

  if (legacy.length === 0) {
    return [];
  }

  removeLocalStorageKey(LEGACY_LOCAL_HISTORY_KEY);

  return legacy;
}

export async function listLocalHistoryEntries(): Promise<LocalHistoryEntry[]> {
  let entries = await listStoredHistoryEntries();

  if (entries.length === 0 && canUseDomStorage()) {
    const legacyEntries = migrateLegacyLocalStorageHistory();

    if (legacyEntries.length > 0) {
      await replaceStoredHistoryEntries(legacyEntries);
      entries = legacyEntries;
    }
  }

  return entries.map(toPublicHistoryEntry);
}

export async function saveLocalHistoryEntry(
  entry: StoredLocalHistoryEntry,
): Promise<void> {
  const existingEntries = await listStoredHistoryEntries();
  const withoutDuplicates = existingEntries.filter(
    (existingEntry) =>
      existingEntry.id !== entry.id &&
      existingEntry.contentSignature !== entry.contentSignature,
  );
  const nextEntries = [entry, ...withoutDuplicates].slice(
    0,
    MAX_LOCAL_HISTORY_ENTRIES,
  );

  await replaceStoredHistoryEntries(nextEntries);
}

export async function deleteLocalHistoryEntry(id: string): Promise<void> {
  const nextEntries = (await listStoredHistoryEntries()).filter(
    (entry) => entry.id !== id,
  );

  await replaceStoredHistoryEntries(nextEntries);
}

export async function clearLocalHistory(): Promise<void> {
  await replaceStoredHistoryEntries([]);
}
