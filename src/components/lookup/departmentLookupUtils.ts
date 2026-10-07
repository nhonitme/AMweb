import { pickLocalizedText } from '@/lib/companyLang'
import type { DepartmentInfo } from '@/types/departmentInfo'
import { getCurrentDataLanguageSuffix, type DataLanguageSuffix } from '@/utils/language'

import { departmentLookupStore } from './departmentLookupStore'
import { firstLookupText, toLookupNumber, trimLookupText } from './lookupHelpers'

export type DepartmentNameSuffix = DataLanguageSuffix

export function getDepartmentLookupNameBySuffix(
  item?: Partial<DepartmentInfo> | null,
  suffix: DepartmentNameSuffix = getCurrentDataLanguageSuffix(),
): string {
  if (!item) {
    return ''
  }

  switch (suffix) {
    case 'ENG':
      return firstLookupText(item.DEP_NAME_ENG)
    case 'KOR':
      return firstLookupText(item.DEP_NAME_KOR)
    case 'CHN':
      return firstLookupText(item.DEP_NAME_CHINA)
    case 'VIET':
    default:
      return firstLookupText(item.DEP_NAME_VIET)
  }
}

export function getDepartmentLookupNames(item?: Partial<DepartmentInfo> | null) {
  return {
    VIET: getDepartmentLookupNameBySuffix(item, 'VIET'),
    ENG: getDepartmentLookupNameBySuffix(item, 'ENG'),
    KOR: getDepartmentLookupNameBySuffix(item, 'KOR'),
    CHN: getDepartmentLookupNameBySuffix(item, 'CHN'),
  }
}

export function getLocalizedDepartmentNameFromRow(row: Record<string, unknown> | undefined): string {
  return pickLocalizedText(row, 'DEP_NAME')
}

export function formatDepartmentDisplay(code: unknown, name: unknown): string {
  const departmentCd = trimLookupText(code)
  const departmentNm = trimLookupText(name)

  if (departmentCd && departmentNm) {
    return `${departmentCd} - ${departmentNm}`
  }

  return departmentCd || departmentNm
}

export async function findDepartmentLookupItemById(
  departmentId: number | string | null | undefined,
): Promise<Partial<DepartmentInfo> | null> {
  const normalizedId = toLookupNumber(departmentId)
  if (!normalizedId || normalizedId <= 0) {
    return null
  }

  try {
    const item = (await departmentLookupStore.byKey(normalizedId)) as Partial<DepartmentInfo> | null
    return item ?? null
  } catch {
    return null
  }
}

export async function findDepartmentLookupItemByCode(
  departmentCode: string | null | undefined,
): Promise<Partial<DepartmentInfo> | null> {
  const normalizedCode = trimLookupText(departmentCode)
  if (!normalizedCode) {
    return null
  }

  try {
    const rows = (await departmentLookupStore.load()) as Partial<DepartmentInfo>[]
    return (
      rows.find((item) => trimLookupText(item.DEPARTMENT_CD) === normalizedCode) ?? null
    )
  } catch {
    return null
  }
}
