import type { DepartmentInfo, DepartmentInfoApi } from "@/types/departmentInfo"

const trimText = (value: string | undefined | null): string => (typeof value === "string" ? value.trim() : "")
const toFlag = (value: boolean): "1" | "0" => (value ? "1" : "0")
const toBool = (value: string | boolean | undefined | null): boolean => {
  if (typeof value === "boolean") return value
  const v = (value ?? "").toString().trim().toUpperCase()
  return v === "1" || v === "Y" || v === "T" || v === "TRUE"
}

export const normalizeDepartmentInfo = (record: DepartmentInfoApi): DepartmentInfo => ({
  DEPARTMENT_ID: record.DEPARTMENT_ID ?? null,
  COMPANY_CD: trimText(record.COMPANY_CD),
  DEPARTMENT_CD: trimText(record.DEPARTMENT_CD),
  PARENT_CD: trimText(record.PARENT_CD),
  DEP_NAME_KOR: trimText(record.DEP_NAME_KOR),
  DEP_NAME_ENG: trimText(record.DEP_NAME_ENG),
  DEP_NAME_VIET: trimText(record.DEP_NAME_VIET),
  DEP_NAME_CHINA: trimText(record.DEP_NAME_CHINA),
  ISDEL: toBool(record.ISDEL),
})

export const normalizeDepartmentInfoRows = (records: DepartmentInfoApi[]): DepartmentInfo[] => records.map(normalizeDepartmentInfo)

export const DEPARTMENT_TREE_ROOT_ID = 0

export type DepartmentTreeRow = DepartmentInfo & {
  PARENT_ID: number
}

const readDepartmentId = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null

const isInsideParentCycle = (id: number, parentIdById: Map<number, number>): boolean => {
  const seen = new Set<number>()
  let current = parentIdById.get(id) ?? DEPARTMENT_TREE_ROOT_ID

  while (current !== DEPARTMENT_TREE_ROOT_ID) {
    if (current === id) return true
    if (seen.has(current)) return false
    seen.add(current)
    current = parentIdById.get(current) ?? DEPARTMENT_TREE_ROOT_ID
  }

  return false
}

export const attachDepartmentParentIds = (rows: DepartmentInfo[]): DepartmentTreeRow[] => {
  const idByCode = new Map<string, number>()
  for (const row of rows) {
    const id = readDepartmentId(row.DEPARTMENT_ID)
    if (id != null && row.DEPARTMENT_CD) {
      idByCode.set(row.DEPARTMENT_CD, id)
    }
  }

  const parentIdById = new Map<number, number>()
  for (const row of rows) {
    const id = readDepartmentId(row.DEPARTMENT_ID)
    if (id == null) continue
    const parentId = row.PARENT_CD ? idByCode.get(row.PARENT_CD) : undefined
    parentIdById.set(
      id,
      parentId != null && parentId !== id ? parentId : DEPARTMENT_TREE_ROOT_ID,
    )
  }

  return rows.map((row) => {
    const id = readDepartmentId(row.DEPARTMENT_ID)
    const parentId =
      id != null && !isInsideParentCycle(id, parentIdById)
        ? parentIdById.get(id) ?? DEPARTMENT_TREE_ROOT_ID
        : DEPARTMENT_TREE_ROOT_ID

    return {
      ...row,
      PARENT_ID: parentId,
    }
  })
}

export const mapDepartmentInfoToApiPayload = (record: DepartmentInfo): Partial<DepartmentInfoApi> => ({
  DEPARTMENT_ID: record.DEPARTMENT_ID,
  COMPANY_CD: trimText(record.COMPANY_CD),
  DEPARTMENT_CD: trimText(record.DEPARTMENT_CD),
  PARENT_CD: trimText(record.PARENT_CD),
  DEP_NAME_KOR: trimText(record.DEP_NAME_KOR),
  DEP_NAME_ENG: trimText(record.DEP_NAME_ENG),
  DEP_NAME_VIET: trimText(record.DEP_NAME_VIET),
  DEP_NAME_CHINA: trimText(record.DEP_NAME_CHINA),
  ISDEL: toFlag(record.ISDEL),
})

export const createDefaultDepartmentInfo = (companyCd: string): DepartmentInfo => ({
  DEPARTMENT_ID: null,
  COMPANY_CD: companyCd,
  DEPARTMENT_CD: "",
  PARENT_CD: "",
  DEP_NAME_KOR: "",
  DEP_NAME_ENG: "",
  DEP_NAME_VIET: "",
  DEP_NAME_CHINA: "",
  ISDEL: false,
})
