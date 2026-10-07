export type UserProfileText = string | null | undefined

export interface UserProfileApi {
  USER_PK_ID?: number | null
  USER_DETAIL_ID?: number | null
  COMPANY_CD?: UserProfileText
  USERID?: UserProfileText
  USERNM?: UserProfileText
  USERLV?: number | null
  EMPLOYEE_CD?: UserProfileText
  EMPLOYEE_NM?: UserProfileText
  EMPLOYEE_NM_ENG?: UserProfileText
  DEPARTMENT_ID?: number | null
  DEPARTMENT_CD?: UserProfileText
  POSITION_ID?: number | null
  POSITION_CD?: UserProfileText
  BRANCH_ID?: number | null
  BRANCH_CD?: UserProfileText
  EMAIL?: UserProfileText
  MOBILE_NO?: UserProfileText
  TEL_NO?: UserProfileText
  ADDRESS?: UserProfileText
  BIRTHDAY?: UserProfileText
  GENDER?: UserProfileText
  AVATAR_URL?: UserProfileText
  SIGN_IMAGE_URL?: UserProfileText
  NOTE?: UserProfileText
  IS_ACTIVE?: UserProfileText
  ISDEL?: UserProfileText
  UPDATE_BY?: UserProfileText
  CREATE_BY?: UserProfileText
  CREATED_AT?: UserProfileText
  UPDATED_AT?: UserProfileText
}

export interface UserProfile {
  USER_PK_ID: number | null
  USER_DETAIL_ID: number | null
  COMPANY_CD: string
  USERID: string
  USERNM: string
  USERLV: number | null
  EMPLOYEE_CD: string
  EMPLOYEE_NM: string
  EMPLOYEE_NM_ENG: string
  DEPARTMENT_ID: number | null
  DEPARTMENT_CD: string
  POSITION_ID: number | null
  POSITION_CD: string
  BRANCH_ID: number | null
  BRANCH_CD: string
  EMAIL: string
  MOBILE_NO: string
  TEL_NO: string
  ADDRESS: string
  BIRTHDAY: string | null
  GENDER: string
  AVATAR_URL: string
  SIGN_IMAGE_URL: string
  NOTE: string
  IS_ACTIVE: boolean
  ISDEL: boolean
  UPDATE_BY: string
  CREATE_BY: string
  CREATED_AT: string | null
  UPDATED_AT: string | null
}

export interface ChangeUserPasswordPayload {
  CURRENT_PASSWORD: string
  NEW_PASSWORD: string
  CONFIRM_PASSWORD: string
}
