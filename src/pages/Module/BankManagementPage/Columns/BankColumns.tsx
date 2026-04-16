import { useContext } from "react"
import { AsyncRule, Column, RequiredRule } from "devextreme-react/data-grid"

import { checkBankCdExists } from "@/api/bankInfoApi"
import { LanguageContext } from "@/lib/i18nLoader"
import { resolveGridValidationRowId } from "@/utils/gridValidation"

type BankValidationEvent = {
  data?: {
    BANK_ID?: number | null
  }
  value: unknown
  row?: {
    key?: number | string
    data?: {
      BANK_ID?: number | null
    }
  }
}

const validateBankCd = async (event: BankValidationEvent) => {
  const bankCd = String(event.value ?? "").trim()

  if (!bankCd) {
    return true
  }

  try {
    const bankId = resolveGridValidationRowId(event, "BANK_ID")
    const exists = await checkBankCdExists(bankId, bankCd)
    return { isValid: !exists }
  } catch {
    return {
      isValid: false,
      message: "Khong kiem tra duoc du lieu",
    }
  }
}

export function BankColumns() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  return (
    <>
      <Column dataField="BANK_CD" caption={t("BANK_CD", "Bank Code")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "BANK_CD khong duoc de trong")} />
        <AsyncRule message={t("MsgEqualCode", "BANK_CD da ton tai")} validationCallback={validateBankCd} />
      </Column>

      <Column dataField="BANK_NM" caption={t("BANK_NM", "Bank Name")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "BANK_NM khong duoc de trong")} />
      </Column>

      <Column dataField="ACC_CD" caption={t("ACC_CD", "Account Code")} />
      <Column dataField="PASSBOOK_NM" caption={t("PASSBOOK_NM", "Account Name")} />
      <Column dataField="ACCOUNT_NUM" caption={t("ACCOUNT_NUM", "Account Number")} />
      <Column dataField="CITAD_CODE" caption={t("CITAD_CODE", "Citad Code")} />
      <Column dataField="REMARK" caption={t("REMARK", "Remark")} />
    </>
  )
}

export default BankColumns
