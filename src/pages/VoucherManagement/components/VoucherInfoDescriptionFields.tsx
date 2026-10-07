import { useEffect, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import TextBox from "devextreme-react/text-box"

import { isLangFieldVisible, useCompanyLangRevision } from "@/lib/companyLang"
import {
  readVoucherInfoDescriptionFields,
  writeVoucherInfoDescriptionFields,
  VOUCHER_INFO_DESCRIPTION_FIELDS,
  type VoucherInfoDescriptionField,
} from "@/lib/voucherInfoDescriptionPrefs"
import { createVoucherEditorOptions } from "../forms/documentFieldConfig"

const fieldFallbacks: Record<VoucherInfoDescriptionField, string> = {
  DESCRIPTION_VIET: "Diễn giải (VI)",
  DESCRIPTION_ENG: "Diễn giải (EN)",
  DESCRIPTION_KOR: "Diễn giải (KO)",
}

type VoucherInfoDescriptionFieldsProps = {
  companyCd: string
  readOnly?: boolean
  values: Partial<Record<VoucherInfoDescriptionField, string | null>>
  t: (key: string, fallback?: string) => string
  onChange: (field: VoucherInfoDescriptionField, value: string) => void
}

export function VoucherInfoDescriptionFields({
  companyCd,
  readOnly = false,
  values,
  t,
  onChange,
}: VoucherInfoDescriptionFieldsProps) {
  const companyLangRevision = useCompanyLangRevision()
  const [opened, setOpened] = useState<VoucherInfoDescriptionField[]>(() => readVoucherInfoDescriptionFields(companyCd))

  useEffect(() => {
    setOpened(readVoucherInfoDescriptionFields(companyCd))
  }, [companyCd])

  const available = useMemo(
    () => VOUCHER_INFO_DESCRIPTION_FIELDS.filter((field) => isLangFieldVisible(field)),
    [companyLangRevision],
  )
  const shown = available.filter((field) => opened.includes(field) || String(values[field] ?? "").trim())
  const nextField = available.find((field) => !shown.includes(field))

  const persist = (fields: VoucherInfoDescriptionField[]) => {
    const next = available.filter((field) => fields.includes(field))
    setOpened(next)
    writeVoucherInfoDescriptionFields(companyCd, next)
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {shown.map((field) => {
        return (
          <div key={field} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-xs font-medium text-slate-600">{t(field, fieldFallbacks[field])}</div>
              <TextBox
                readOnly={readOnly}
                value={values[field] ?? ""}
                onValueChanged={(event) => {
                  if (!event.event) {
                    return
                  }
                  onChange(field, String(event.value ?? ""))
                }}
                {...createVoucherEditorOptions()}
              />
            </div>
            {!readOnly && field !== "DESCRIPTION_VIET" ? (
              <Button
                hint={t("REMOVE_DESCRIPTION", "Bỏ dòng diễn giải")}
                icon="minus"
                stylingMode="text"
                onClick={() => {
                  persist(opened.filter((item) => item !== field))
                  onChange(field, "")
                }}
              />
            ) : null}
          </div>
        )
      })}

      {!readOnly && nextField ? (
        <Button
          hint={t("ADD_DESCRIPTION", "Thêm dòng diễn giải")}
          icon="plus"
          stylingMode="text"
          onClick={() => persist([...opened, nextField])}
        />
      ) : null}
    </div>
  )
}
