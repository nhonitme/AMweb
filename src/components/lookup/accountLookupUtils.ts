import { filterActiveLangFields, getLangFieldBase, pickLocalizedText } from '@/lib/companyLang'
import type { etcData } from '@/types/etcData'
import type { AcclistInfo } from '@/types/acclist'

import { getAcclistLookupStore } from './AcclistLookupStore'
import { firstLookupText, toLookupNumber, trimLookupText } from './lookupHelpers'
import { getCurrentDataLanguageSuffix, type DataLanguageSuffix } from '@/utils/language'

export type AccountLookupItem = Partial<AcclistInfo> & Partial<etcData>
export type AccountNameSuffix = DataLanguageSuffix

export const ACCOUNT_LOOKUP_SEARCH_FIELDS = [
  'CD',
  'ACC_CD',
  'NM_VIET',
  'NM_ENG',
  'NM_KOR',
  'NM_CHINA',
  'ACCTITLE_NM_VIET',
  'ACCTITLE_NM_ENG',
  'ACCTITLE_NM_KOR',
  'ACCTITLE_NM_CHINA',
] as const

export function buildAccountLookupSearchExpr(
  lookupCodeField = 'CD',
  lookupNameField?: string,
): string[] {
  return filterActiveLangFields(Array.from(
    new Set(
      [lookupCodeField, lookupNameField, ...ACCOUNT_LOOKUP_SEARCH_FIELDS]
        .filter((field): field is string => Boolean(field)),
    ),
  ))
}

export function getAccountLookupCode(
  item?: AccountLookupItem | null,
  lookupCodeField = 'CD',
): string {
  if (!item) {
    return ''
  }

  return firstLookupText(
    item[lookupCodeField as keyof AccountLookupItem],
    item.CD,
    item.ACC_CD,
  )
}

export function getAccountLookupName(
  item?: AccountLookupItem | null,
  lookupNameField?: string,
): string {
  if (!item) {
    return ''
  }

  const preferredBase = getLangFieldBase(lookupNameField)
  if (preferredBase) {
    const preferred = pickLocalizedText(item, preferredBase)
    if (preferred) {
      return preferred
    }
  }

  return pickLocalizedText(item, 'NM') || pickLocalizedText(item, 'ACCTITLE_NM')
}

export function getAccountLookupNameBySuffix(
  item?: AccountLookupItem | null,
  suffix: AccountNameSuffix = getCurrentDataLanguageSuffix(),
): string {
  if (!item) {
    return ''
  }

  switch (suffix) {
    case 'ENG':
      return firstLookupText(item.NM_ENG, item.ACCTITLE_NM_ENG)
    case 'KOR':
      return firstLookupText(item.NM_KOR, item.ACCTITLE_NM_KOR)
    case 'CHN':
      return firstLookupText(item.NM_CHINA, item.ACCTITLE_NM_CHINA)
    case 'VIET':
    default:
      return firstLookupText(item.NM_VIET, item.ACCTITLE_NM_VIET)
  }
}

export function getAccountLookupNames(item?: AccountLookupItem | null) {
  return {
    VIET: getAccountLookupNameBySuffix(item, 'VIET'),
    ENG: getAccountLookupNameBySuffix(item, 'ENG'),
    KOR: getAccountLookupNameBySuffix(item, 'KOR'),
    CHN: getAccountLookupNameBySuffix(item, 'CHN'),
  }
}

export function getLocalizedAccountNameFromRow(
  row: Record<string, unknown> | undefined,
  nameFieldPrefix: string,
): string {
  return pickLocalizedText(row, nameFieldPrefix)
}

export function getMultilingualAccountNameFieldNames(nameFieldPrefix: string) {
  return {
    viet: `${nameFieldPrefix}_VIET`,
    eng: `${nameFieldPrefix}_ENG`,
    kor: `${nameFieldPrefix}_KOR`,
    china: `${nameFieldPrefix}_CHINA`,
  } as const
}

export function getAccountLookupId(item?: AccountLookupItem | null): number | null {
  if (!item) {
    return null
  }

  return toLookupNumber(item.ACC_ID ?? item.ID)
}

export function formatAccountDisplay(code: unknown, name: unknown): string {
  const accountCd = trimLookupText(code)
  const accountNm = trimLookupText(name)

  if (accountCd && accountNm) {
    return `${accountCd} - ${accountNm}`
  }

  return accountCd || accountNm
}

const accountDisplayNameCache = new Map<string, string>()

function buildAccountDisplayCacheKey(accountCd: string, suffix: AccountNameSuffix): string {
  return `${suffix}|${accountCd}`
}

export function rememberAccountDisplayName(
  accountCd: string,
  name: string,
  suffix: AccountNameSuffix = getCurrentDataLanguageSuffix(),
): void {
  const normalizedCode = trimLookupText(accountCd)
  const normalizedName = trimLookupText(name)

  if (!normalizedCode || !normalizedName) {
    return
  }

  accountDisplayNameCache.set(buildAccountDisplayCacheKey(normalizedCode, suffix), normalizedName)
}

export function rememberAccountDisplayNames(
  accountCd: string,
  item?: AccountLookupItem | null,
): void {
  if (!item) {
    return
  }

  const names = getAccountLookupNames(item)
  rememberAccountDisplayName(accountCd, names.VIET, 'VIET')
  rememberAccountDisplayName(accountCd, names.ENG, 'ENG')
  rememberAccountDisplayName(accountCd, names.KOR, 'KOR')
  rememberAccountDisplayName(accountCd, names.CHN, 'CHN')
}

export function rememberAccountDisplayNamesFromRow(
  accountCd: string,
  row: Record<string, unknown> | undefined,
  nameFieldPrefix: string,
): void {
  if (!row) {
    return
  }

  rememberAccountDisplayName(accountCd, trimLookupText(row[`${nameFieldPrefix}_VIET`]), 'VIET')
  rememberAccountDisplayName(accountCd, trimLookupText(row[`${nameFieldPrefix}_ENG`]), 'ENG')
  rememberAccountDisplayName(accountCd, trimLookupText(row[`${nameFieldPrefix}_KOR`]), 'KOR')
  rememberAccountDisplayName(accountCd, trimLookupText(row[`${nameFieldPrefix}_CHINA`]), 'CHN')
}

export function recallAccountDisplayName(
  accountCd: string,
  suffix: AccountNameSuffix = getCurrentDataLanguageSuffix(),
): string {
  return accountDisplayNameCache.get(buildAccountDisplayCacheKey(trimLookupText(accountCd), suffix)) ?? ''
}

export function resolveAccountDisplayText(
  accountCd: unknown,
  nameFromRow: unknown,
  suffix: AccountNameSuffix = getCurrentDataLanguageSuffix(),
): string {
  const code = trimLookupText(accountCd)
  const rowName = trimLookupText(nameFromRow)
  const resolvedName = rowName || recallAccountDisplayName(code, suffix)

  if (rowName) {
    rememberAccountDisplayName(code, rowName, suffix)
  }

  return formatAccountDisplay(code, resolvedName)
}

export function findAccountLookupItemInRows(
  rows: AccountLookupItem[],
  accountCd: string,
  lookupCodeField = 'CD',
): AccountLookupItem | null {
  const normalizedCode = trimLookupText(accountCd)
  if (!normalizedCode) {
    return null
  }

  return rows.find((item) => getAccountLookupCode(item, lookupCodeField) === normalizedCode) ?? null
}

export async function findAccountLookupItemByCode(
  accountCd: string,
  lookupCodeField = 'CD',
): Promise<AccountLookupItem | null> {
  const normalizedCode = trimLookupText(accountCd)
  if (!normalizedCode) {
    return null
  }

  try {
    const rows = (await getAcclistLookupStore().load()) as AccountLookupItem[]
    return findAccountLookupItemInRows(rows, normalizedCode, lookupCodeField)
  } catch {
    return null
  }
}

export function accountMatchesSearchText(item: AccountLookupItem, searchText: string): boolean {
  const normalizedSearch = trimLookupText(searchText).toLowerCase()
  if (!normalizedSearch) {
    return true
  }

  return ACCOUNT_LOOKUP_SEARCH_FIELDS.some((field) => {
    const value = item[field as keyof AccountLookupItem]
    return trimLookupText(value).toLowerCase().includes(normalizedSearch)
  })
}
