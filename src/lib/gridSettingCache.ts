import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login"

export type GridSettingScope = {
  companyCd: string
  userId: string
}

export function normalizeGridSettingText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function normalizeGridSettingKey(value: unknown): string {
  return normalizeGridSettingText(value).toUpperCase()
}

export function getCurrentGridSettingScope(): GridSettingScope | null {
  const companyCd = normalizeGridSettingText(getCurrentCompanyCd())
  const userId = normalizeGridSettingText(getCurrentUserId())

  if (!companyCd || !userId) {
    return null
  }

  return { companyCd, userId }
}

export function asGridSettingArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

export function asTemplateArray<T>(value: T[] | null | undefined): T[] {
  return asGridSettingArray(value)
}
