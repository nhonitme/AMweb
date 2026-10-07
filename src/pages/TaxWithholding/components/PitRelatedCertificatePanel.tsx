import { useCallback, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import DateBox from "devextreme-react/date-box"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"

import { createDateBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"
import { formatYmdForDisplay } from "@/pages/Accounting/accountingDateUtils"
import type { PitDocument, PitField } from "../types"
import PitCertificateSelectPopup from "./PitCertificateSelectPopup"

const SYSTEM_RELATED_TYPE = "8"

type RelatedIdentityKey = "LHCTLQUAN" | "KHMSCTCLQUAN" | "KHCTCLQUAN" | "SCTCLQUAN" | "NLCTCLQUAN"

function toDateText(value: string | Date | null | undefined) {
  if (!value) return ""
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ""
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
  }
  const text = String(value).trim()
  if (!text) return ""
  return text.slice(0, 10)
}

function parseRelatedDate(value: string | null | undefined): Date | null {
  const text = toDateText(value)
  if (!text) return null
  const parsed = new Date(`${text}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function relatedFieldsFromPitCertificate(row: PitDocument, formCode: string) {
  return {
    LHCTLQUAN: SYSTEM_RELATED_TYPE,
    KHMSCTCLQUAN: formCode,
    KHCTCLQUAN: (row.SERIES || row.DATA?.Fields?.KHCTU || "").trim(),
    SCTCLQUAN: row.DOC_NO != null && row.DOC_NO > 0 ? String(row.DOC_NO) : "",
    NLCTCLQUAN: toDateText(row.DOC_DATE) || toDateText(row.DATA?.Fields?.NLAP),
  }
}

type Props = {
  fields: Record<string, string>
  formCode: string
  relatedFields: PitField[]
  excludeDocumentId?: number
  readOnly?: boolean
  busy?: boolean
  t: (key: string, fallback: string) => string
  onPatch: (patch: Record<string, string>) => void
  onPickerVisibleChange?: (open: boolean) => void
}

export default function PitRelatedCertificatePanel({
  fields,
  formCode,
  relatedFields,
  excludeDocumentId = 0,
  readOnly = false,
  busy = false,
  t,
  onPatch,
  onPickerVisibleChange,
}: Props) {
  const [pickerVisible, setPickerVisible] = useState(false)
  const [isExternal, setIsExternal] = useState(false)
  const typeOptions = useMemo(
    () => relatedFields.find((field) => field.Key === "LHCTLQUAN")?.Options?.filter((option) => option.Value !== "") ?? [],
    [relatedFields],
  )
  const relatedDate = useMemo(() => parseRelatedDate(fields.NLCTCLQUAN), [fields.NLCTCLQUAN])
  const dateBoxOptions = useMemo(
    () =>
      createDateBoxEditorOptions({
        dateSerializationFormat: "yyyy-MM-dd",
        openOnFieldClick: !readOnly && isExternal,
        readOnly: readOnly || !isExternal,
        disabled: readOnly || busy || !isExternal,
      }),
    [busy, isExternal, readOnly],
  )
  const fieldDisabled = readOnly || busy
  const identityReadOnly = fieldDisabled || !isExternal

  const setPickerOpen = useCallback(
    (open: boolean) => {
      setPickerVisible(open)
      onPickerVisibleChange?.(open)
    },
    [onPickerVisibleChange],
  )

  const handleFieldChange = useCallback(
    (key: RelatedIdentityKey | "GCHU", value: string) => {
      onPatch({ [key]: value })
    },
    [onPatch],
  )

  const handleSelect = useCallback(
    (row: PitDocument) => {
      const patch = relatedFieldsFromPitCertificate(row, formCode)
      if (!patch.KHCTCLQUAN || !patch.SCTCLQUAN || !patch.NLCTCLQUAN) {
        notify("Chứng từ đã chọn chưa có ký hiệu, số hoặc ngày lập.", "warning", 4000)
        return
      }
      setIsExternal(false)
      onPatch(patch)
      setPickerOpen(false)
    },
    [formCode, onPatch, setPickerOpen],
  )

  return (
    <>
      <div className="pit-related-panel">
        <div className="pit-related-panel__line">
          <div className="pit-related-panel__check">
            <CheckBox
              text={t("EXTERNAL_CERTIFICATE", "Ngoài hệ thống")}
              value={isExternal}
              readOnly={fieldDisabled}
              onValueChanged={(event) => {
                const checked = Boolean(event.value)
                setIsExternal(checked)
                if (!checked) {
                  onPatch({
                    LHCTLQUAN: "",
                    KHMSCTCLQUAN: "",
                    KHCTCLQUAN: "",
                    SCTCLQUAN: "",
                    NLCTCLQUAN: "",
                  })
                }
              }}
            />
          </div>
          <TextBox
            value={fields.KHMSCTCLQUAN ?? ""}
            label={t("FORM_NO", "Mẫu số") + " *"}
            labelMode="floating"
            readOnly={identityReadOnly}
            maxLength={11}
            onValueChanged={!identityReadOnly ? (event) => handleFieldChange("KHMSCTCLQUAN", String(event.value ?? "")) : undefined}
          />
          <TextBox
            value={fields.KHCTCLQUAN ?? ""}
            label={t("SERIES", "Ký hiệu") + " *"}
            labelMode="floating"
            readOnly={identityReadOnly}
            maxLength={9}
            onValueChanged={!identityReadOnly ? (event) => handleFieldChange("KHCTCLQUAN", String(event.value ?? "")) : undefined}
          />
          <TextBox
            value={fields.SCTCLQUAN ?? ""}
            label={t("NO", "Số") + " *"}
            labelMode="floating"
            readOnly={identityReadOnly}
            maxLength={8}
            onValueChanged={!identityReadOnly ? (event) => handleFieldChange("SCTCLQUAN", String(event.value ?? "")) : undefined}
          />
          {isExternal ? (
            <DateBox
              value={relatedDate}
              label={t("DOC_DATE", "Ngày lập") + " *"}
              labelMode="floating"
              {...dateBoxOptions}
              onValueChanged={(event) =>
                handleFieldChange(
                  "NLCTCLQUAN",
                  event.value instanceof Date ? toDateText(event.value) : toDateText(event.value as string | null),
                )
              }
            />
          ) : (
            <TextBox
              value={formatYmdForDisplay(fields.NLCTCLQUAN)}
              readOnly
              label={t("DOC_DATE", "Ngày lập") + " *"}
              labelMode="floating"
            />
          )}
          <SelectBox
            value={fields.LHCTLQUAN || null}
            dataSource={typeOptions}
            valueExpr="Value"
            displayExpr="Label"
            label={t("TYPE", "Loại") + " *"}
            labelMode="floating"
            showClearButton={!identityReadOnly}
            disabled={identityReadOnly}
            onValueChanged={!identityReadOnly ? (event) => handleFieldChange("LHCTLQUAN", String(event.value ?? "")) : undefined}
          />
          {!isExternal ? (
            <div className="pit-related-panel__pick">
              <Button
                icon="search"
                text={t("SELECT", "Chọn")}
                stylingMode="outlined"
                disabled={fieldDisabled}
                onClick={() => setPickerOpen(true)}
              />
            </div>
          ) : (
            <div />
          )}
        </div>
        <TextBox
          value={fields.GCHU ?? ""}
          readOnly={fieldDisabled}
          label={t("NOTE", "Ghi chú")}
          labelMode="floating"
          maxLength={255}
          onValueChanged={!fieldDisabled ? (event) => handleFieldChange("GCHU", String(event.value ?? "")) : undefined}
        />
      </div>

      {pickerVisible ? (
        <PitCertificateSelectPopup
          visible={pickerVisible}
          excludeDocumentId={excludeDocumentId}
          t={t}
          onClose={() => setPickerOpen(false)}
          onSelect={handleSelect}
        />
      ) : null}
    </>
  )
}
