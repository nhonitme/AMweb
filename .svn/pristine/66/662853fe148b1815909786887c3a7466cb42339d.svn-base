import type { languages } from "@/types/languages";
import { convertLangToCode } from '@/utils/language';
import axios from "./axiosClient";

import API_BASE_URL from "../config/apiConfig";

const API_URL = `${API_BASE_URL}/Language`;

function unwrapArray<T>(json: unknown): T[] {
  if (json && typeof json === "object" && "Data" in json) {
    const data = json.Data;
    return Array.isArray(data) ? (data as T[]) : [];
  }

  throw new Error("API response format invalid");
}

// GET
export async function getLanguages(): Promise<languages[]> {
  const resp = await axios.get(API_URL);
  return unwrapArray<languages>(resp.data);
}

const STORAGE_KEY_PREFIX = "amnote_labels_";

function getLanguageStorageKey(lang: string) {
  return `${STORAGE_KEY_PREFIX}${convertLangToCode(lang) || lang}`;
}

export async function getLanguage(lang: string): Promise<Record<string, string>> {
  const code = convertLangToCode(lang) || lang;
  const storageKey = getLanguageStorageKey(code);

  const cached = localStorage.getItem(storageKey);
  if (cached) {
    try {
      return JSON.parse(cached) as Record<string, string>;
    } catch {
      // fall back to fetching if cache is invalid
    }
  }

  const list = await getLanguages();
  const map: Record<string, string> = {};
  for (const item of list) {
    // @ts-ignore
    const v = (item as any)[code];
    map[item.KEY] = v ?? "";
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(map));
  } catch {
    // ignore storage issues
  }

  return map;
}

export function clearLanguageCache(lang: string) {
  const storageKey = getLanguageStorageKey(lang);
  localStorage.removeItem(storageKey);
}
