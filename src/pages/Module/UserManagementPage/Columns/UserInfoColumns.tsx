import { useContext } from "react"
import { Column, Lookup } from "devextreme-react/data-grid"

import { LanguageContext } from "@/lib/i18nLoader"
import { createSysCodeDisplayExpr, createSysCodeValueExpr } from "@/lib/sysCodeUtils"
import type { SysCode } from "@/api/sysCodeService"

export type UserInfoField = {
  key: string
  caption: string
}

export type UserInfoColumnsProps = {
  userLevelCodes?: SysCode[]
}

export const userInfoFields: UserInfoField[] = [
  { key: "USERID", caption: "User ID" },
  { key: "PASSWD", caption: "Password" },
  { key: "USERNM", caption: "User Name" },
  { key: "EMAIL", caption: "Email" },
  { key: "MOBILE_NO", caption: "Mobile" },
  { key: "AVATAR_URL", caption: "Ảnh đại diện" },
  { key: "USERLV", caption: "User Level" },
  { key: "ROLE_CODE", caption: "Role" },
  { key: "DEFAULT_YN", caption: "Default" },
  { key: "IS_ACTIVE", caption: "Active" },
]

export const userInfoFieldGroups = {
  account: ["USERID", "PASSWD", "USERNM", "EMAIL", "MOBILE_NO", "AVATAR_URL"],
  company: ["USERLV", "DEFAULT_YN", "IS_ACTIVE"],
} as const

export function UserInfoColumns({ userLevelCodes = [] }: UserInfoColumnsProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const sysCodeDisplayExpr = createSysCodeDisplayExpr(t)

  return (
    <>
      <Column dataField="USERID" caption={t("USERID", "User ID")} width={120} />
      <Column dataField="USERNM" caption={t("USERNM", "User Name")} minWidth={140} />
      <Column dataField="USERLV" caption={t("USERLV", "User Level")} width={120}>
        <Lookup
          dataSource={userLevelCodes}
          displayExpr={sysCodeDisplayExpr}
          valueExpr={createSysCodeValueExpr("number")}
        />
      </Column>
      <Column dataField="IS_ACTIVE" caption={t("IS_ACTIVE", "Active")} dataType="boolean" width={80} />
    </>
  )
}

export default UserInfoColumns
