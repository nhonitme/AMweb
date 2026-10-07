import type { languages, MessageLanguageKey } from "@/types/languages";
import { normalizeMessageLanguageKey } from "@/utils/language";
import {
  readGlobalStorageItem,
  writeGlobalStorageItem,
} from "@/lib/globalStorageCache";
import axios from "./axiosClient";

import API_BASE_URL from "../config/apiConfig";

const API_URL = `${API_BASE_URL}/Language`;
const LANGUAGE_CACHE_NAMESPACE = "language-labels";

interface LanguageCacheOptions {
  forceRefresh?: boolean;
}

function unwrapArray<T>(json: unknown): T[] {
  if (json && typeof json === "object" && "Data" in json) {
    const data = json.Data;
    return Array.isArray(data) ? (data as T[]) : [];
  }

  throw new Error("API response format invalid");
}

export async function getLanguages(): Promise<languages[]> {
  const resp = await axios.get(API_URL);
  return unwrapArray<languages>(resp.data);
}

export async function getLanguage(lang: string, options?: LanguageCacheOptions): Promise<Record<string, string>> {
  const code: MessageLanguageKey = normalizeMessageLanguageKey(lang);
  if (options?.forceRefresh !== true) {
    const cached = readGlobalStorageItem<Record<string, string>>(LANGUAGE_CACHE_NAMESPACE, code);
    if (cached) {
      return cached;
    }
  }

  const list = await getLanguages();
  const map: Record<string, string> = {};
  for (const item of list) {
    const translatedValue = item[code];
    map[item.KEY] = translatedValue ?? "";
  }

  writeGlobalStorageItem(LANGUAGE_CACHE_NAMESPACE, code, map);

  return map;
}
