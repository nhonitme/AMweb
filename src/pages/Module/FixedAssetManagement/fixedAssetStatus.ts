import { isSysCodeActive, isSysCodeDeleted, type SysCode } from '@/api/sysCodeService'
import { getSysCodeCd, getSysCodeName, type SysCodeTranslate } from '@/lib/sysCodeUtils'

import type { FixedAssetStatus } from '@/types/fixedAsset'

export const FA_STATUS_CODE_TYPE = 'FA_STATUS'
export const FA_STATUS_FILTER_ALL_VALUE = ''
export const FA_FILTER_ALL_VALUE = FA_STATUS_FILTER_ALL_VALUE

export type FixedAssetListFilters = {
  status: string
  accCd: string
}

export const createEmptyFixedAssetListFilters = (): FixedAssetListFilters => ({
  status: FA_FILTER_ALL_VALUE,
  accCd: FA_FILTER_ALL_VALUE,
})

export const DEFAULT_FIXED_ASSET_STATUS: FixedAssetStatus = 'IN_USE'

export const FIXED_ASSET_STATUS_VALUES = [
  'NOT_IN_USE',
  'IN_USE',
  'SUSPENDED',
  'SOLD',
] as const satisfies readonly FixedAssetStatus[]

const LEGACY_STATUS_MAP: Record<string, FixedAssetStatus> = {
  USING: 'IN_USE',
  STOP: 'SUSPENDED',
  FINISHED: 'SOLD',
}

export const getActiveFaStatusCodes = (codes: SysCode[]): SysCode[] =>
  codes.filter((item) => isSysCodeActive(item.IS_ACTIVE) && !isSysCodeDeleted(item.ISDEL))

export const normalizeFixedAssetStatus = (status: unknown): FixedAssetStatus => {
  const raw = typeof status === 'string' ? status.trim().toUpperCase() : ''
  if (!raw) return DEFAULT_FIXED_ASSET_STATUS
  if ((FIXED_ASSET_STATUS_VALUES as readonly string[]).includes(raw)) {
    return raw as FixedAssetStatus
  }
  return LEGACY_STATUS_MAP[raw] ?? DEFAULT_FIXED_ASSET_STATUS
}

export const isFixedAssetStatusDepreciable = (status: unknown): boolean =>
  normalizeFixedAssetStatus(status) === 'IN_USE'

const FA_STATUS_NAME_FALLBACKS: Record<FixedAssetStatus, string> = {
  NOT_IN_USE: 'Chưa sử dụng',
  IN_USE: 'Đang sử dụng',
  SUSPENDED: 'Tạm ngưng',
  SOLD: 'Đã thanh lý',
}

export const getFaStatusMessageKey = (status: unknown): string =>
  normalizeFixedAssetStatus(status)

export const getFaStatusDisplayText = (
  status: unknown,
  translate: SysCodeTranslate,
  statusCodes: readonly SysCode[] = [],
): string => {
  const code = normalizeFixedAssetStatus(status)
  const matched = statusCodes.find((item) => getSysCodeCd(item).toUpperCase() === code)
  const codeName = matched ? getSysCodeName(matched) : ''
  const fallback = codeName || FA_STATUS_NAME_FALLBACKS[code] || code

  const byStatusKey = translate(getFaStatusMessageKey(code), '').trim()
  if (byStatusKey) {
    return byStatusKey
  }

  if (codeName) {
    const byName = translate(codeName, '').trim()
    if (byName && byName.toUpperCase() !== codeName.toUpperCase()) {
      return byName
    }
  }

  return fallback
}

export const createFaStatusDisplayExpr = (
  translate: SysCodeTranslate,
  statusCodes: readonly SysCode[],
) => (item: SysCode | string | null | undefined): string => {
  if (item == null || item === '') {
    return ''
  }

  if (typeof item === 'string') {
    return getFaStatusDisplayText(item, translate, statusCodes)
  }

  return getFaStatusDisplayText(getSysCodeCd(item), translate, statusCodes)
}

export const normalizeFixedAssetStatusFilter = (status: unknown): string | undefined => {
  const raw = typeof status === 'string' ? status.trim().toUpperCase() : ''
  if (!raw) return undefined
  return normalizeFixedAssetStatus(raw)
}
