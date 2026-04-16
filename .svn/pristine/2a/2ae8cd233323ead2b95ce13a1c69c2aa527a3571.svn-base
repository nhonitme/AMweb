import type { UserInfo, UserInfoApi } from "@/types/userInfo"

const trimText = (value: string | undefined | null): string => (typeof value === "string" ? value.trim() : "")
const toFlag = (value: boolean): "1" | "0" => (value ? "1" : "0")
const toBool = (value: string | boolean | undefined | null): boolean => {
  if (typeof value === "boolean") {
    return value
  }

  const normalized = (value ?? "").toString().trim().toUpperCase()
  return normalized === "1" || normalized === "Y" || normalized === "TRUE" || normalized === "T"
}

export const normalizeUserInfo = (record: UserInfoApi): UserInfo => ({
  USER_PK_ID: typeof record.USER_PK_ID === "number" ? record.USER_PK_ID : null,
  COMPANY_CD: trimText(record.COMPANY_CD),
  USERID: trimText(record.USERID),
  PASSWD: "",
  USERNM: trimText(record.USERNM),
  USERLV: typeof record.USERLV === "number" && Number.isFinite(record.USERLV) ? record.USERLV : 1,
  USERLV_NAME: "",
  ISDEL: toBool(record.ISDEL),
  CREATE_BY: trimText(record.CREATE_BY),
  UPDATE_BY: trimText(record.UPDATE_BY),
})

export const normalizeUserInfoRows = (records: UserInfoApi[]): UserInfo[] => records.map(normalizeUserInfo)

export const mapUserInfoToApiPayload = (record: UserInfo): Partial<UserInfoApi> => ({
  USER_PK_ID: record.USER_PK_ID,
  COMPANY_CD: trimText(record.COMPANY_CD),
  USERID: trimText(record.USERID),
  PASSWD: trimText(record.PASSWD),
  USERNM: trimText(record.USERNM),
  USERLV: Number.isFinite(record.USERLV) ? record.USERLV : 1,
  ISDEL: toFlag(record.ISDEL),
})

export const createDefaultUserInfo = (companyCd: string): UserInfo => ({
  USER_PK_ID: null,
  COMPANY_CD: companyCd,
  USERID: "",
  PASSWD: "",
  USERNM: "",
  USERLV: 1,
  USERLV_NAME: "",
  ISDEL: false,
  CREATE_BY: "",
  UPDATE_BY: "",
})
