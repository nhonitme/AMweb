import { getCompanyDecimalFieldSettings } from "@/api/companyDecimalSettingApi";
import { getCurrentCompanyCd } from "@/lib/login";

export type DecimalSettingRule = {
  FIELD_NAME: string;
  SETTING_TYPE: string;
  DECIMAL_PLACES: number;
  ROUNDING_MODE: string;
  USE_THOUSAND_SEPARATOR: string;
  IS_ACTIVE: string;
};

const STORAGE_KEY = "decimal-setting-cache";
let decimalSettingsCachePromise: Promise<DecimalSettingRule[]> | null = null;
let decimalSettingsCacheCompanyCd = "";
let decimalSettingsCacheRevision = 0;
const decimalSettingSubscribers = new Set<() => void>();

function getStorageKey(companyCd: string): string {
  return `${STORAGE_KEY}-${companyCd}`;
}

function normalizeRule(rule: Partial<DecimalSettingRule>): DecimalSettingRule {
  return {
    FIELD_NAME: String(rule.FIELD_NAME ?? "").trim().toUpperCase(),
    SETTING_TYPE: String(rule.SETTING_TYPE ?? "").trim().toUpperCase(),
    DECIMAL_PLACES: Number(rule.DECIMAL_PLACES ?? 0),
    ROUNDING_MODE: String(rule.ROUNDING_MODE ?? "ROUND").trim().toUpperCase(),
    USE_THOUSAND_SEPARATOR: String(rule.USE_THOUSAND_SEPARATOR ?? "1") === "1" ? "1" : "0",
    IS_ACTIVE: String(rule.IS_ACTIVE ?? "1") === "1" ? "1" : "0",
  };
}

function normalizeRules(rules: Partial<DecimalSettingRule>[]): DecimalSettingRule[] {
  return rules
    .map(normalizeRule)
    .filter((rule) => rule.FIELD_NAME.length > 0 && rule.SETTING_TYPE.length > 0 && rule.IS_ACTIVE === "1");
}

function publishDecimalSettingUpdate(): void {
  decimalSettingSubscribers.forEach((subscriber) => {
    try {
      subscriber();
    } catch (error) {
      console.error("decimalSettingCache subscriber error", error);
    }
  });
}

export function subscribeDecimalSettingUpdates(handler: () => void): () => void {
  decimalSettingSubscribers.add(handler);
  return () => {
    decimalSettingSubscribers.delete(handler);
  };
}

export async function loadDecimalSettings(forceRefresh = false): Promise<DecimalSettingRule[]> {
  const companyCd = getCurrentCompanyCd();

  if (!forceRefresh && decimalSettingsCachePromise && decimalSettingsCacheCompanyCd === companyCd) {
    return decimalSettingsCachePromise;
  }

  const storageKey = getStorageKey(companyCd);

  if (!forceRefresh && typeof window !== "undefined") {
    const cached = window.sessionStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Partial<DecimalSettingRule>[];
        const normalized = normalizeRules(parsed);
        decimalSettingsCacheCompanyCd = companyCd;
        decimalSettingsCachePromise = Promise.resolve(normalized);
        return normalized;
      } catch {
        window.sessionStorage.removeItem(storageKey);
      }
    }
  }

  const requestRevision = decimalSettingsCacheRevision;
  decimalSettingsCacheCompanyCd = companyCd;
  decimalSettingsCachePromise = getCompanyDecimalFieldSettings(companyCd)
    .then((items) => {
      const normalized = normalizeRules(items);
      if (
        typeof window !== "undefined" &&
        requestRevision === decimalSettingsCacheRevision &&
        decimalSettingsCacheCompanyCd === companyCd
      ) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(normalized));
      }

      return normalized;
    })
    .catch((error) => {
      if (requestRevision === decimalSettingsCacheRevision && decimalSettingsCacheCompanyCd === companyCd) {
        decimalSettingsCachePromise = null;
      }

      throw error;
    });

  return decimalSettingsCachePromise;
}

export function clearDecimalSettingsCache(publish = true): void {
  const companyCd = getCurrentCompanyCd();
  decimalSettingsCacheRevision += 1;
  decimalSettingsCacheCompanyCd = companyCd;
  decimalSettingsCachePromise = null;

  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(getStorageKey(companyCd));
  }

  if (publish) {
    publishDecimalSettingUpdate();
  }
}

export async function refreshDecimalSettingsCache(): Promise<DecimalSettingRule[]> {
  clearDecimalSettingsCache(false);
  const rules = await loadDecimalSettings(true);
  publishDecimalSettingUpdate();
  return rules;
}

export function buildDecimalFormat(setting: DecimalSettingRule): string {
  const useGrouping = setting.USE_THOUSAND_SEPARATOR === "1";
  const precision = Number.isFinite(setting.DECIMAL_PLACES) ? setting.DECIMAL_PLACES : 0;
  const decimalPart = precision > 0 ? `.${"0".repeat(precision)}` : "";

  if (setting.SETTING_TYPE === "PERCENT") {
    const pattern = `0${decimalPart}%`;
    return useGrouping ? `#,##${pattern}` : pattern;
  }

  const numberPattern = `0${decimalPart}`;
  return useGrouping ? `#,##${numberPattern}` : numberPattern;
}

export function buildDecimalSettingMap(rules: DecimalSettingRule[]): Record<string, DecimalSettingRule> {
  return rules.reduce<Record<string, DecimalSettingRule>>((acc, rule) => {
    const fieldName = rule.FIELD_NAME.trim().toUpperCase();
    if (fieldName) {
      acc[fieldName] = rule;
    }

    return acc;
  }, {});
}

export function resolveDecimalSetting(rules: DecimalSettingRule[], fieldName: string): DecimalSettingRule | null {
  const normalizedField = String(fieldName ?? "").trim().toUpperCase();
  if (!normalizedField) {
    return null;
  }

  const exactField = rules.find((rule) => rule.FIELD_NAME === normalizedField);
  if (exactField) {
    return exactField;
  }

  return rules.find((rule) => rule.SETTING_TYPE === normalizedField) ?? null;
}
