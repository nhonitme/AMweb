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
  DEP_NAME_KOR: trimText(record.DEP_NAME_KOR),
  DEP_NAME_ENG: trimText(record.DEP_NAME_ENG),
  DEP_NAME_VIET: trimText(record.DEP_NAME_VIET),
  DEP_NAME_CHINA: trimText(record.DEP_NAME_CHINA),
  UPDATE_BY: trimText(record.UPDATE_BY),
  CREATE_BY: trimText(record.CREATE_BY),
  ISDEL: toBool(record.ISDEL),
})

export const normalizeDepartmentInfoRows = (records: DepartmentInfoApi[]): DepartmentInfo[] => records.map(normalizeDepartmentInfo)

export const mapDepartmentInfoToApiPayload = (record: DepartmentInfo): Partial<DepartmentInfoApi> => ({
  DEPARTMENT_ID: record.DEPARTMENT_ID,
  COMPANY_CD: trimText(record.COMPANY_CD),
  DEPARTMENT_CD: trimText(record.DEPARTMENT_CD),
  DEP_NAME_KOR: trimText(record.DEP_NAME_KOR),
  DEP_NAME_ENG: trimText(record.DEP_NAME_ENG),
  DEP_NAME_VIET: trimText(record.DEP_NAME_VIET),
  DEP_NAME_CHINA: trimText(record.DEP_NAME_CHINA),
  UPDATE_BY: trimText(record.UPDATE_BY),
  CREATE_BY: trimText(record.CREATE_BY),
  ISDEL: toFlag(record.ISDEL),
})

export const createDefaultDepartmentInfo = (companyCd: string, userId: string): DepartmentInfo => ({
  DEPARTMENT_ID: null,
  COMPANY_CD: companyCd,
  DEPARTMENT_CD: "",
  DEP_NAME_KOR: "",
  DEP_NAME_ENG: "",
  DEP_NAME_VIET: "",
  DEP_NAME_CHINA: "",
  UPDATE_BY: userId,
  CREATE_BY: userId,
  ISDEL: false,
})
