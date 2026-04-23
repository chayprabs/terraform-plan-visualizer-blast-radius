import type { NormalizedPlan } from "@/features/terraform-plan/domain/normalizedPlanTypes";
import { redactTerraformValue } from "@/features/terraform-plan/privacy/redactTerraformPlan";
import { createStableAnonymizer } from "@/features/terraform-plan/privacy/stableAnonymizer";
import {
  DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
  type TerraformPlanRedactionSettings,
} from "@/features/terraform-plan/privacy/redactionTypes";
import type { PlanRiskLevel } from "@/features/terraform-plan/risk/riskTypes";

export type ThemePreference = "dark" | "light" | "system";

export interface TerraformPlanLocalPreferences {
  redactionSettings: TerraformPlanRedactionSettings;
  rememberHistory: boolean;
  theme: ThemePreference;
}

export interface LocalHistoryEntry {
  highRiskFindingCount: number;
  id: string;
  riskLevel: PlanRiskLevel;
  riskScore: number;
  sourceName: string;
  storedAt: string;
  totalChanges: number;
}

export const DEFAULT_TERRAFORM_PLAN_LOCAL_PREFERENCES: TerraformPlanLocalPreferences =
  {
    redactionSettings: DEFAULT_TERRAFORM_PLAN_REDACTION_SETTINGS,
    rememberHistory: false,
    theme: "system",
  };

const LOCAL_PREFERENCES_KEY = "terraform-plan-local-preferences:v1";
const LOCAL_HISTORY_KEY = "terraform-plan-local-history:v1";
const INDEXED_DB_NAME = "terraform-plan-history";
const INDEXED_DB_STORE = "history";

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

async function openHistoryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, 1);

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

async function listHistoryEntriesFromIndexedDb(): Promise<LocalHistoryEntry[]> {
  const database = await openHistoryDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(INDEXED_DB_STORE, "readonly");
    const request = transaction.objectStore(INDEXED_DB_STORE).getAll();

    request.onsuccess = () => {
      resolve((request.result as LocalHistoryEntry[]).sort((left, right) =>
        right.storedAt.localeCompare(left.storedAt),
      ));
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

async function saveHistoryEntryToIndexedDb(entry: LocalHistoryEntry): Promise<void> {
  const database = await openHistoryDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(INDEXED_DB_STORE, "readwrite");

    transaction.objectStore(INDEXED_DB_STORE).put(entry);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ?? new Error("Failed to save local history entry."),
      );
    };
  });
}

async function deleteHistoryEntryFromIndexedDb(id: string): Promise<void> {
  const database = await openHistoryDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(INDEXED_DB_STORE, "readwrite");

    transaction.objectStore(INDEXED_DB_STORE).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ?? new Error("Failed to delete local history entry."),
      );
    };
  });
}

async function clearHistoryFromIndexedDb(): Promise<void> {
  const database = await openHistoryDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(INDEXED_DB_STORE, "readwrite");

    transaction.objectStore(INDEXED_DB_STORE).clear();
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ?? new Error("Failed to clear local history."),
      );
    };
  });
}

function listHistoryEntriesFromLocalStorage(): LocalHistoryEntry[] {
  return [...(readLocalStorageJson<LocalHistoryEntry[]>(LOCAL_HISTORY_KEY) ?? [])].sort(
    (left, right) => right.storedAt.localeCompare(left.storedAt),
  );
}

function saveHistoryEntryToLocalStorage(entry: LocalHistoryEntry): void {
  const existingEntries = listHistoryEntriesFromLocalStorage().filter(
    (existingEntry) => existingEntry.id !== entry.id,
  );

  writeLocalStorageJson(LOCAL_HISTORY_KEY, [entry, ...existingEntries]);
}

function deleteHistoryEntryFromLocalStorage(id: string): void {
  const nextEntries = listHistoryEntriesFromLocalStorage().filter(
    (entry) => entry.id !== id,
  );

  writeLocalStorageJson(LOCAL_HISTORY_KEY, nextEntries);
}

function clearHistoryFromLocalStorage(): void {
  removeLocalStorageKey(LOCAL_HISTORY_KEY);
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

export function createLocalHistoryEntry(
  normalizedPlan: NormalizedPlan,
  sourceName: string | undefined,
  settings: TerraformPlanRedactionSettings,
): LocalHistoryEntry {
  const anonymizer = createStableAnonymizer();
  const entry = {
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
  };

  return redactTerraformValue(entry, {
    anonymizer,
    scope: "export",
    settings,
  }) as LocalHistoryEntry;
}

export async function listLocalHistoryEntries(): Promise<LocalHistoryEntry[]> {
  if (canUseIndexedDb()) {
    try {
      return await listHistoryEntriesFromIndexedDb();
    } catch {
      return listHistoryEntriesFromLocalStorage();
    }
  }

  return listHistoryEntriesFromLocalStorage();
}

export async function saveLocalHistoryEntry(
  entry: LocalHistoryEntry,
): Promise<void> {
  if (canUseIndexedDb()) {
    try {
      await saveHistoryEntryToIndexedDb(entry);
      return;
    } catch {
      saveHistoryEntryToLocalStorage(entry);
      return;
    }
  }

  saveHistoryEntryToLocalStorage(entry);
}

export async function deleteLocalHistoryEntry(id: string): Promise<void> {
  if (canUseIndexedDb()) {
    try {
      await deleteHistoryEntryFromIndexedDb(id);
      return;
    } catch {
      deleteHistoryEntryFromLocalStorage(id);
      return;
    }
  }

  deleteHistoryEntryFromLocalStorage(id);
}

export async function clearLocalHistory(): Promise<void> {
  if (canUseIndexedDb()) {
    try {
      await clearHistoryFromIndexedDb();
      return;
    } catch {
      clearHistoryFromLocalStorage();
      return;
    }
  }

  clearHistoryFromLocalStorage();
}
