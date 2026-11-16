import type { UserInfo, UserInfoApi } from "@/types/userInfo"

/** Smaller USERLV = higher privilege (10 ADMIN … 40 VIEW). */
export const DEFAULT_USER_LEVEL = 40
export const VALID_USER_LEVELS = [10, 20, 30, 40] as const

const trimText = (value: string | undefined | null): string => (typeof value === "string" ? value.trim() : "")
const toFlag = (value: boolean): "1" | "0" => (value ? "1" : "0")
const toBool = (value: string | boolean | undefined | null): boolean => {
  if (typeof value === "boolean") {
    return value
  }

  const normalized = (value ?? "").toString().trim().toUpperCase()
  return normalized === "1" || normalized === "Y" || normalized === "TRUE" || normalized === "T"
}

export const isValidUserLevel = (value: unknown): value is number =>
  typeof value === "number" && VALID_USER_LEVELS.includes(value as (typeof VALID_USER_LEVELS)[number])

// Keep invalid response values visible as invalid; never remap them to a valid role.
export const normalizeUserLevel = (value: number | null | undefined): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0

export const deriveRoleCode = (userLevel: number | null | undefined): string => {
  switch (userLevel) {
    case 10: return "ADMIN"
    case 20: return "MANAGER"
    case 30: return "STAFF"
    case 40: return "VIEW"
    default: throw new Error("USERLV: 10 ADMIN, 20 MANAGER, 30 STAFF, 40 VIEW")
  }
}

export const normalizeUserInfo = (record: UserInfoApi): UserInfo => {
  const userLevel = normalizeUserLevel(record.USERLV)

  return {
    USER_PK_ID: typeof record.USER_PK_ID === "number" ? record.USER_PK_ID : null,
    USER_COMPANY_ID: typeof record.USER_COMPANY_ID === "number" ? record.USER_COMPANY_ID : null,
    COMPANY_CD: trimText(record.COMPANY_CD),
    USERID: trimText(record.USERID),
    PASSWD: "",
    USERNM: trimText(record.USERNM),
    EMAIL: trimText(record.EMAIL),
    MOBILE_NO: trimText(record.MOBILE_NO),
    AVATAR_URL: trimText(record.AVATAR_URL),
    USERLV: userLevel,
    USERLV_NAME: isValidUserLevel(userLevel) ? "" : "USERLV không hợp lệ",
    ROLE_CODE: isValidUserLevel(userLevel) ? deriveRoleCode(userLevel) : "",
    DEFAULT_YN: toBool(record.DEFAULT_YN),
    IS_ACTIVE: record.IS_ACTIVE === undefined || record.IS_ACTIVE === null ? true : toBool(record.IS_ACTIVE),
    ISDEL: toBool(record.ISDEL),
  }
}

export const normalizeUserInfoRows = (records: UserInfoApi[]): UserInfo[] => records.map(normalizeUserInfo)

export const mapUserInfoToApiPayload = (record: UserInfo): Partial<UserInfoApi> => {
  const userLevel = normalizeUserLevel(record.USERLV)

  return {
    USER_PK_ID: record.USER_PK_ID,
    USER_COMPANY_ID: record.USER_COMPANY_ID,
    USERID: trimText(record.USERID),
    PASSWD: trimText(record.PASSWD),
    USERNM: trimText(record.USERNM),
    EMAIL: trimText(record.EMAIL),
    MOBILE_NO: trimText(record.MOBILE_NO),
    AVATAR_URL: trimText(record.AVATAR_URL),
    USERLV: userLevel,
    ROLE_CODE: deriveRoleCode(userLevel),
    DEFAULT_YN: toFlag(record.DEFAULT_YN),
    IS_ACTIVE: toFlag(record.IS_ACTIVE),
    ISDEL: toFlag(record.ISDEL),
  }
}

export const createDefaultUserInfo = (companyCd: string): UserInfo => ({
  USER_PK_ID: null,
  USER_COMPANY_ID: null,
  COMPANY_CD: companyCd,
  USERID: "",
  PASSWD: "",
  USERNM: "",
  EMAIL: "",
  MOBILE_NO: "",
  AVATAR_URL: "",
  USERLV: DEFAULT_USER_LEVEL,
  USERLV_NAME: "",
  ROLE_CODE: deriveRoleCode(DEFAULT_USER_LEVEL),
  DEFAULT_YN: false,
  IS_ACTIVE: true,
  ISDEL: false,
})
