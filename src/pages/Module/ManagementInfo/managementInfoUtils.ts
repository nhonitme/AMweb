import type { ManagementInfo, ManagementInfoApi } from "@/types/managementInfo"

const trimText = (value: string | Date | undefined | null): string => {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return typeof value === "string" ? value.trim() : ""
}

const toFlag = (value: boolean): "1" | "0" => (value ? "1" : "0")

const toBool = (value: string | boolean | undefined | null): boolean => {
  if (typeof value === "boolean") {
    return value
  }

  const normalized = (value ?? "").toString().trim().toUpperCase()
  return normalized === "1" || normalized === "Y" || normalized === "T" || normalized === "TRUE"
}

export const normalizeManagementInfo = (record: ManagementInfoApi): ManagementInfo => ({
  MG_ID: typeof record.MG_ID === "number" ? record.MG_ID : null,
  COMPANY_CD: trimText(record.COMPANY_CD),
  MG_CD: trimText(record.MG_CD),
  MG_DESC_KOR: trimText(record.MG_DESC_KOR),
  MG_DESC_ENG: trimText(record.MG_DESC_ENG),
  MG_DESC_VIET: trimText(record.MG_DESC_VIET),
  ISDEL: toBool(record.ISDEL),
  CREATE_BY: trimText(record.CREATE_BY),
  UPDATE_BY: trimText(record.UPDATE_BY),
  MG_CD_ROOT: trimText(record.MG_CD_ROOT),
})

export const normalizeManagementInfoRows = (records: ManagementInfoApi[]): ManagementInfo[] =>
  records.map(normalizeManagementInfo)

export const mapManagementInfoToApiPayload = (record: ManagementInfo): Partial<ManagementInfoApi> => ({
  MG_ID: record.MG_ID,
  COMPANY_CD: trimText(record.COMPANY_CD),
  MG_CD: trimText(record.MG_CD),
  MG_DESC_KOR: trimText(record.MG_DESC_KOR),
  MG_DESC_ENG: trimText(record.MG_DESC_ENG),
  MG_DESC_VIET: trimText(record.MG_DESC_VIET),
  ISDEL: toFlag(record.ISDEL),
  CREATE_BY: trimText(record.CREATE_BY),
  UPDATE_BY: trimText(record.UPDATE_BY),
  MG_CD_ROOT: trimText(record.MG_CD_ROOT),
})

export const createDefaultManagementInfo = (companyCd: string, userId: string): ManagementInfo => ({
  MG_ID: null,
  COMPANY_CD: companyCd,
  MG_CD: "",
  MG_DESC_KOR: "",
  MG_DESC_ENG: "",
  MG_DESC_VIET: "",
  ISDEL: false,
  CREATE_BY: userId,
  UPDATE_BY: userId,
  MG_CD_ROOT: "",
})
