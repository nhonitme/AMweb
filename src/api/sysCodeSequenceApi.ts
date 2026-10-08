import axios from "./axiosClient";
import { getApiErrorMessage } from "./apiTypes";
import { buildCurrentCompanyBusinessCacheKey } from "@/lib/businessCacheKey";

export interface SysCodeSequence {
  ID: number;
  COMPANY_CD: string;
  OBJECT_TYPE: string;
  MENU_CODE: string;
  CODE_FIELD: string;
  PREFIX: string;
  SUFFIX: string;
  CODE_PATTERN: string;
  CURRENT_NO: number;
  NUMBER_LENGTH: number;
  RESET_TYPE: string;
  RESET_KEY: string;
  IS_USE: string;
}

export interface SysCodeSequenceRequest {
  COMPANY_CD?: string;
  ID?: number;
  OBJECT_TYPE: string;
  MENU_CODE?: string;
  CODE_FIELD?: string;
  PREFIX?: string;
  SUFFIX?: string;
  CODE_PATTERN?: string;
  CURRENT_NO?: number;
  NUMBER_LENGTH?: number;
  RESET_TYPE?: string;
  RESET_KEY?: string;
  IS_USE?: string;
}

export interface SysCodeSequencePreview {
  OBJECT_TYPE: string;
  MENU_CODE: string;
  CODE_FIELD: string;
  NEXT_CD?: string | null;
  PREFIX: string;
  SUFFIX: string;
  CODE_PATTERN: string;
  CURRENT_NO: number;
  NEXT_NO: number;
  NUMBER_LENGTH: number;
  RESET_TYPE: string;
  RESET_KEY: string;
}

interface ApiEnvelope<T> {
  Data?: T;
  data?: T;
  Message?: string;
  message?: string;
}

function unwrapResponse<T>(payload: ApiEnvelope<T> | T): T {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid API response");
  }

  const envelope = payload as ApiEnvelope<T>;
  return (envelope.Data ?? envelope.data ?? payload) as T;
}

const BASE_URL = "SysCodeSequence";
const PREVIEW_CACHE_TTL_MS = 30000;

type PreviewCacheEntry = {
  expiresAt: number;
  promise: Promise<SysCodeSequencePreview | null>;
};

const previewCache = new Map<string, PreviewCacheEntry>();

function normalizeObjectType(objectType: string): string {
  return objectType.trim().toUpperCase();
}

function normalizeContextValue(value: string): string {
  return value.trim().toUpperCase();
}

function formatLocalDateParam(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function normalizeBaseDateParam(baseDate?: string | Date | null | number): string | undefined {
  if (baseDate instanceof Date) {
    return formatLocalDateParam(baseDate)
  }

  if (typeof baseDate === "number") {
    const text = String(baseDate).trim()
    if (/^\d{8}$/.test(text)) {
      return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`
    }
    const parsed = new Date(baseDate)
    return Number.isNaN(parsed.getTime()) ? undefined : formatLocalDateParam(parsed)
  }

  if (typeof baseDate === "string" && baseDate.trim()) {
    const trimmed = baseDate.trim()
    if (/^\d{8}$/.test(trimmed)) {
      return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`
    }
    return trimmed
  }

  return undefined
}

function buildPreviewCacheKey(objectType: string, baseDateParam?: string): string {
  return buildCurrentCompanyBusinessCacheKey("sys-code-sequence-preview", {
    objectType: normalizeObjectType(objectType),
    baseDate: baseDateParam ?? "",
  });
}

function buildContextPreviewCacheKey(menuCode: string, codeField: string, baseDateParam?: string): string {
  return buildCurrentCompanyBusinessCacheKey("sys-code-sequence-preview-context", {
    menuCode: normalizeContextValue(menuCode),
    codeField: normalizeContextValue(codeField),
    baseDate: baseDateParam ?? "",
  });
}

function getCachedPreview(objectType: string, baseDateParam?: string): Promise<SysCodeSequencePreview | null> | null {
  const cacheKey = buildPreviewCacheKey(objectType, baseDateParam);
  const cached = previewCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    previewCache.delete(cacheKey);
    return null;
  }

  return cached.promise;
}

function setCachedPreview(
  objectType: string,
  baseDateParam: string | undefined,
  promise: Promise<SysCodeSequencePreview | null>,
): void {
  previewCache.set(buildPreviewCacheKey(objectType, baseDateParam), {
    expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS,
    promise,
  });
}

function removeCachedPreview(objectType: string, baseDateParam?: string): void {
  previewCache.delete(buildPreviewCacheKey(objectType, baseDateParam));
}

function getCachedContextPreview(
  menuCode: string,
  codeField: string,
  baseDateParam?: string,
): Promise<SysCodeSequencePreview | null> | null {
  const cacheKey = buildContextPreviewCacheKey(menuCode, codeField, baseDateParam);
  const cached = previewCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    previewCache.delete(cacheKey);
    return null;
  }

  return cached.promise;
}

function setCachedContextPreview(
  menuCode: string,
  codeField: string,
  baseDateParam: string | undefined,
  promise: Promise<SysCodeSequencePreview | null>,
): void {
  previewCache.set(buildContextPreviewCacheKey(menuCode, codeField, baseDateParam), {
    expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS,
    promise,
  });
}

function removeCachedContextPreview(menuCode: string, codeField: string, baseDateParam?: string): void {
  previewCache.delete(buildContextPreviewCacheKey(menuCode, codeField, baseDateParam));
}

function getPreviewParams(objectType: string, baseDateParam?: string): Record<string, string> {
  const params: Record<string, string> = {
    objectType: normalizeObjectType(objectType),
  };

  if (baseDateParam) {
    params.baseDate = baseDateParam;
  }

  return params;
}

function getContextPreviewParams(menuCode: string, codeField: string, baseDateParam?: string): Record<string, string> {
  const params: Record<string, string> = {
    menuCode: normalizeContextValue(menuCode),
    codeField: normalizeContextValue(codeField),
  };

  if (baseDateParam) {
    params.baseDate = baseDateParam;
  }

  return params;
}

function getBatchPreviewParams(objectTypes: string[], baseDateParam?: string): Record<string, string> {
  const params: Record<string, string> = {
    objectTypes: objectTypes.map(normalizeObjectType).join(","),
  };

  if (baseDateParam) {
    params.baseDate = baseDateParam;
  }

  return params;
}

export async function getSysCodeSequences(objectType?: string): Promise<SysCodeSequence[]> {
  const params: Record<string, string> = {};
  if (objectType?.trim()) params.objectType = objectType.trim();

  try {
    const response = await axios.get<ApiEnvelope<SysCodeSequence[]>>(BASE_URL, { params });
    return unwrapResponse(response.data) || [];
  } catch (err: unknown) {
    const message = getApiErrorMessage(err, "Failed to load code sequences");
    throw new Error(message);
  }
}

export async function previewSysCodeSequence(
  objectType: string,
  baseDate?: string | number | Date | null,
): Promise<SysCodeSequencePreview | null> {
  const normalizedObjectType = normalizeObjectType(objectType);
  if (!normalizedObjectType) {
    return null;
  }

  const baseDateParam = normalizeBaseDateParam(baseDate);
  const cached = getCachedPreview(normalizedObjectType, baseDateParam);
  if (cached) {
    return cached;
  }

  const promise = (async (): Promise<SysCodeSequencePreview | null> => {
    try {
      const response = await axios.get<ApiEnvelope<SysCodeSequencePreview | null>>(`${BASE_URL}/preview`, {
        params: getPreviewParams(normalizedObjectType, baseDateParam),
      });
      return unwrapResponse(response.data) ?? null;
    } catch (err: unknown) {
      removeCachedPreview(normalizedObjectType, baseDateParam);
      const message = getApiErrorMessage(err, "Failed to preview code sequence");
      throw new Error(message);
    }
  })();

  setCachedPreview(normalizedObjectType, baseDateParam, promise);
  return promise;
}

export async function previewSysCodeSequenceContext(
  menuCode: string,
  codeField: string,
  baseDate?: string | number | Date | null,
): Promise<SysCodeSequencePreview | null> {
  const normalizedMenuCode = normalizeContextValue(menuCode);
  const normalizedCodeField = normalizeContextValue(codeField);
  if (!normalizedMenuCode || !normalizedCodeField) {
    return null;
  }

  const baseDateParam = normalizeBaseDateParam(baseDate);
  const cached = getCachedContextPreview(normalizedMenuCode, normalizedCodeField, baseDateParam);
  if (cached) {
    return cached;
  }

  const promise = (async (): Promise<SysCodeSequencePreview | null> => {
    try {
      const response = await axios.get<ApiEnvelope<SysCodeSequencePreview | null>>(`${BASE_URL}/preview/context`, {
        params: getContextPreviewParams(normalizedMenuCode, normalizedCodeField, baseDateParam),
      });
      return unwrapResponse(response.data) ?? null;
    } catch (err: unknown) {
      removeCachedContextPreview(normalizedMenuCode, normalizedCodeField, baseDateParam);
      const message = getApiErrorMessage(err, "Failed to preview code sequence");
      throw new Error(message);
    }
  })();

  setCachedContextPreview(normalizedMenuCode, normalizedCodeField, baseDateParam, promise);
  return promise;
}

export async function previewSysCodeSequences(
  objectTypes: string[],
  baseDate?: string | number | Date | null,
): Promise<SysCodeSequencePreview[]> {
  const normalizedObjectTypes = Array.from(
    new Set(objectTypes.map(normalizeObjectType).filter((item) => item.length > 0)),
  );

  if (normalizedObjectTypes.length === 0) {
    return [];
  }

  const baseDateParam = normalizeBaseDateParam(baseDate);
  const cachedResults = new Map<string, Promise<SysCodeSequencePreview | null>>();
  const missingObjectTypes: string[] = [];

  for (const objectType of normalizedObjectTypes) {
    const cached = getCachedPreview(objectType, baseDateParam);
    if (cached) {
      cachedResults.set(objectType, cached);
    } else {
      missingObjectTypes.push(objectType);
    }
  }

  if (missingObjectTypes.length > 0) {
    const batchPromise = (async (): Promise<Map<string, SysCodeSequencePreview>> => {
      try {
        const response = await axios.get<ApiEnvelope<SysCodeSequencePreview[]>>(`${BASE_URL}/previews`, {
          params: getBatchPreviewParams(missingObjectTypes, baseDateParam),
        });
        const previews = unwrapResponse(response.data) ?? [];
        return new Map(
          previews
            .filter((item) => typeof item.OBJECT_TYPE === "string" && item.OBJECT_TYPE.trim().length > 0)
            .map((item) => [normalizeObjectType(item.OBJECT_TYPE), item]),
        );
      } catch (err: unknown) {
        for (const objectType of missingObjectTypes) {
          removeCachedPreview(objectType, baseDateParam);
        }

        const message = getApiErrorMessage(err, "Failed to preview code sequences");
        throw new Error(message);
      }
    })();

    for (const objectType of missingObjectTypes) {
      const itemPromise = batchPromise.then((items) => items.get(objectType) ?? null);
      cachedResults.set(objectType, itemPromise);
      setCachedPreview(objectType, baseDateParam, itemPromise);
    }
  }

  const results = await Promise.all(normalizedObjectTypes.map((objectType) => cachedResults.get(objectType)));
  return results.filter((item): item is SysCodeSequencePreview => item !== null && item !== undefined);
}

export function clearSysCodeSequencePreviewCache(): void {
  previewCache.clear();
}

export async function createSysCodeSequence(payload: SysCodeSequenceRequest): Promise<void> {
  try {
    await axios.post<ApiEnvelope<unknown>>(BASE_URL, payload);
    clearSysCodeSequencePreviewCache();
  } catch (err: unknown) {
    const message = getApiErrorMessage(err, "Failed to create code sequence");
    throw new Error(message);
  }
}

export async function updateSysCodeSequence(id: number, payload: SysCodeSequenceRequest): Promise<void> {
  try {
    await axios.put<ApiEnvelope<unknown>>(`${BASE_URL}/${id}`, payload);
    clearSysCodeSequencePreviewCache();
  } catch (err: unknown) {
    const message = getApiErrorMessage(err, "Failed to update code sequence");
    throw new Error(message);
  }
}

export async function deleteSysCodeSequence(id: number): Promise<void> {
  try {
    await axios.delete<ApiEnvelope<unknown>>(`${BASE_URL}/${id}`);
    clearSysCodeSequencePreviewCache();
  } catch (err: unknown) {
    const message = getApiErrorMessage(err, "Failed to delete code sequence");
    throw new Error(message);
  }
}
