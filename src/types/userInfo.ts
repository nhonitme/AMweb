export type UserInfoText = string | null | undefined

export interface UserInfoApi {
  USER_PK_ID?: number | null
  USER_COMPANY_ID?: number | null
  COMPANY_CD?: UserInfoText
  USERID?: UserInfoText
  PASSWD?: UserInfoText
  USERNM?: UserInfoText
  EMAIL?: UserInfoText
  MOBILE_NO?: UserInfoText
  AVATAR_URL?: UserInfoText
  USERLV?: number | null
  ROLE_CODE?: UserInfoText
  DEFAULT_YN?: UserInfoText
  IS_ACTIVE?: UserInfoText
  ISDEL?: UserInfoText
}

export interface UserInfo {
  USER_PK_ID: number | null
  USER_COMPANY_ID: number | null
  COMPANY_CD: string
  USERID: string
  PASSWD: string
  USERNM: string
  EMAIL: string
  MOBILE_NO: string
  AVATAR_URL: string
  USERLV: number
  USERLV_NAME?: string
  ROLE_CODE: string
  DEFAULT_YN: boolean
  IS_ACTIVE: boolean
  ISDEL: boolean
}

export interface DeleteUserInfosRequest {
  UserPkIds: number[]
}
