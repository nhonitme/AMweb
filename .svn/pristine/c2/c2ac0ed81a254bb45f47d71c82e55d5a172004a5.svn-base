import { useContext } from "react"
import { AsyncRule, Column, Lookup, RequiredRule } from "devextreme-react/data-grid"

import { checkUserIdExists } from "@/api/userInfoApi"
import { LanguageContext } from "@/lib/i18nLoader"
import { resolveGridValidationRowId } from "@/utils/gridValidation"
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
  { key: "USERLV", caption: "User Level" },
]

export const userInfoFieldGroups = {
  account: ["USERID", "PASSWD", "USERNM", "USERLV"],
} as const

type UserValidationEvent = {
  data?: {
    USER_PK_ID?: number | null
  }
  value: unknown
  row?: {
    key?: number | string
    data?: {
      USER_PK_ID?: number | null
    }
  }
}

const validateUserId = async (event: UserValidationEvent) => {
  const userId = String(event.value ?? "").trim()

  if (!userId) {
    return true
  }

  try {
    const userPkId = resolveGridValidationRowId(event, "USER_PK_ID")
    const exists = await checkUserIdExists(userPkId, userId)
    return { isValid: !exists }
  } catch {
    return {
      isValid: false,
      message: "Khong kiem tra duoc du lieu",
    }
  }
}

export function UserInfoColumns({ userLevelCodes = [] }: UserInfoColumnsProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  return (
    <>
      <Column dataField="USERID" caption={t("USERID", "User ID")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "USERID khong duoc de trong")} />
        <AsyncRule message={t("MsgEqualCode", "USERID da ton tai")} validationCallback={validateUserId} />
      </Column>

      <Column dataField="USERNM" caption={t("USERNM", "User Name")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "USERNM khong duoc de trong")} />
      </Column>

      <Column dataField="USERLV" caption={t("USERLV", "User Level")}>
        <Lookup
          dataSource={userLevelCodes}
          displayExpr={(item: SysCode) => {
            const rawName = (item?.CODE_NAME ?? "") as string
            return rawName ? t(rawName, rawName) : ""
          }}
          valueExpr={(item: SysCode) => {
            const code = item?.CODE_CD
            if (code === undefined || code === null) return ""
            const numeric = Number(code)
            return Number.isNaN(numeric) ? code : numeric
          }}
        />
      </Column>
    </>
  )
}

export default UserInfoColumns
