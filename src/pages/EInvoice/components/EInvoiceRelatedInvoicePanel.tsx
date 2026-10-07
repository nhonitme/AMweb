import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import DateBox from "devextreme-react/date-box"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"

import { createDateBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import { LanguageContext } from "@/lib/i18nLoader"
import { formatYmdForDisplay } from "@/pages/Accounting/accountingDateUtils"
import { createSysCodeDisplayExpr, createSysCodeValueExpr } from "@/lib/sysCodeUtils"
import type { SysCodeInfo } from "@/types/common"
import type { EInvoice, EInvoiceRelatedInfo } from "@/types/einvoice"
import {
  buildEInvoiceRelatedFromSourceInvoice,
  createDefaultEInvoiceRelated,
  isEInvoiceMultiRelatedInvoice,
  resolveEInvoiceRelatedInvoiceType,
} from "../einvoiceModel"
import EInvoiceInvoiceSelectPopup from "./EInvoiceInvoiceSelectPopup"

type EInvoiceRelatedInvoicePanelProps = {
  related: EInvoiceRelatedInfo | null
  tchdon: number
  companyCd: string
  invoiceId: number
  readOnly?: boolean
  bkeSummary?: string | null
  onChange: (related: EInvoiceRelatedInfo | null, options?: { sourceInvoiceId?: number | null }) => void
  onOpenBke?: () => void
}

type RelatedFieldKey = "KHMSHDCLQUAN" | "KHHDCLQUAN" | "SHDCLQUAN" | "MSTCLQUAN" | "SBKCLQUAN"

const compactFieldClass = "min-w-0 shrink-0"
const LDDCTTHE_CODE_TYPE = "EINV_LDDCTTHE"

function parseRelatedInvoiceDate(value: string | null | undefined): Date | null {
  const text = String(value ?? "").trim()
  if (!text) {
    return null
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatRelatedInvoiceDate(value: Date | null): string {
  if (!value) {
    return ""
  }

  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function EInvoiceRelatedInvoicePanel({
  related,
  tchdon,
  companyCd,
  invoiceId,
  readOnly = false,
  bkeSummary = null,
  onChange,
  onOpenBke,
}: EInvoiceRelatedInvoicePanelProps) {
  const [pickerVisible, setPickerVisible] = useState(false)
  const [lddcttheOptions, setLddcttheOptions] = useState<SysCodeInfo[]>([])

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const isMulti = useMemo(() => isEInvoiceMultiRelatedInvoice(tchdon), [tchdon])
  const isExternal = useMemo(() => Number(related?.IS_EXTERNAL ?? 0) === 1, [related?.IS_EXTERNAL])
  const relatedDate = useMemo(() => parseRelatedInvoiceDate(related?.NLHDCLQUAN), [related?.NLHDCLQUAN])
  const bangKeDate = useMemo(() => parseRelatedInvoiceDate(related?.NBKCLQUAN), [related?.NBKCLQUAN])
  const relatedDateBoxOptions = useMemo(
    () =>
      createDateBoxEditorOptions({
        dateSerializationFormat: "yyyy-MM-dd",
        openOnFieldClick: !readOnly,
        readOnly,
        disabled: readOnly,
      }),
    [readOnly],
  )
  const lddcttheDisplayExpr = useMemo(() => createSysCodeDisplayExpr(t), [t])
  const lddcttheValueExpr = useMemo(() => createSysCodeValueExpr("number"), [])

  useEffect(() => {
    if (isMulti) {
      return
    }
    void getCachedSysCodes(LDDCTTHE_CODE_TYPE).then(setLddcttheOptions)
  }, [isMulti])

  const ensureRelated = useCallback((): EInvoiceRelatedInfo => {
    return related ?? createDefaultEInvoiceRelated(invoiceId, companyCd)
  }, [companyCd, invoiceId, related])

  const handleOpenPicker = useCallback(() => {
    if (!readOnly && !isExternal && !isMulti) {
      setPickerVisible(true)
    }
  }, [isExternal, isMulti, readOnly])

  const handleClosePicker = useCallback(() => {
    setPickerVisible(false)
  }, [])

  const handleSelectInvoice = useCallback(
    (invoices: EInvoice[]) => {
      const source = invoices[0]
      if (!source) {
        return
      }

      onChange(buildEInvoiceRelatedFromSourceInvoice(source, tchdon, invoiceId, companyCd, related), {
        sourceInvoiceId: Number(source.INVOICE_ID ?? 0) > 0 ? Number(source.INVOICE_ID) : null,
      })
      setPickerVisible(false)
    },
    [companyCd, invoiceId, onChange, related, tchdon],
  )

  const handleExternalToggle = useCallback(
    (checked: boolean) => {
      const current = ensureRelated()
      if (checked) {
        onChange({
          ...current,
          TCHDON: tchdon,
          IS_EXTERNAL: 1,
        }, { sourceInvoiceId: null })
        return
      }

      onChange({
        ...current,
        TCHDON: tchdon,
        IS_EXTERNAL: 0,
        LHDCLQUAN: null,
        KHMSHDCLQUAN: "",
        KHHDCLQUAN: "",
        SHDCLQUAN: "",
        NLHDCLQUAN: "",
      }, { sourceInvoiceId: null })
    },
    [ensureRelated, onChange, tchdon],
  )

  const handleFieldChange = useCallback(
    (field: RelatedFieldKey, value: string) => {
      const current = ensureRelated()
      const next: EInvoiceRelatedInfo = {
        ...current,
        TCHDON: tchdon,
        [field]: value,
      }

      if (field === "KHMSHDCLQUAN" || field === "KHHDCLQUAN" || field === "SHDCLQUAN") {
        next.IS_EXTERNAL = 1
      }

      if (field === "KHMSHDCLQUAN") {
        next.LHDCLQUAN = resolveEInvoiceRelatedInvoiceType(value)
      }

      onChange(next, Number(next.IS_EXTERNAL ?? 0) === 1 ? { sourceInvoiceId: null } : undefined)
    },
    [ensureRelated, onChange, tchdon],
  )

  const handleDateChange = useCallback(
    (value: Date | null) => {
      const current = ensureRelated()
      onChange({
        ...current,
        TCHDON: tchdon,
        IS_EXTERNAL: 1,
        NLHDCLQUAN: formatRelatedInvoiceDate(value),
      }, { sourceInvoiceId: null })
    },
    [ensureRelated, onChange, tchdon],
  )

  const handleBangKeDateChange = useCallback(
    (value: Date | null) => {
      const current = ensureRelated()
      onChange({
        ...current,
        TCHDON: tchdon,
        NBKCLQUAN: formatRelatedInvoiceDate(value),
      })
    },
    [ensureRelated, onChange, tchdon],
  )

  const handleLddcttheChange = useCallback(
    (value: number | null) => {
      const current = ensureRelated()
      onChange({
        ...current,
        TCHDON: tchdon,
        LDDCTTHE: value,
      })
    },
    [ensureRelated, onChange, tchdon],
  )

  const handleGchuChange = useCallback(
    (value: string) => {
      const current = ensureRelated()
      onChange({
        ...current,
        TCHDON: tchdon,
        GCHU: value,
      }, Number(current.IS_EXTERNAL ?? 0) === 1 ? { sourceInvoiceId: null } : undefined)
    },
    [ensureRelated, onChange, tchdon],
  )

  const editableFieldProps = isExternal && !readOnly
    ? {
        readOnly: false as const,
      }
    : {
        readOnly: true as const,
      }

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {isMulti ? (
          <div className="text-xs text-slate-500">
            {t("RELATED_MULTI_HINT", "Điều chỉnh/thay thế nhiều hóa đơn: bắt buộc Số/Ngày bảng kê (01/BK-ĐCTT). Chi tiết hóa đơn nằm trên bảng kê.")}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <CheckBox
              text={t("EXTERNAL_INVOICE", "Hóa đơn ngoài hệ thống")}
              value={isExternal}
              readOnly={readOnly}
              onValueChanged={(event) => handleExternalToggle(Boolean(event.value))}
            />
          </div>
        )}

        {isMulti ? (
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className={`${compactFieldClass} w-[180px]`}>
              <TextBox
                value={related?.SBKCLQUAN ?? ""}
                label={t("SBKCLQUAN", "Số bảng kê có liên quan")}
                labelMode="floating"
                readOnly={readOnly}
                maxLength={50}
                onValueChanged={!readOnly
                  ? (event) => handleFieldChange("SBKCLQUAN", String(event.value ?? ""))
                  : undefined}
              />
            </div>
            <div className={`${compactFieldClass} w-[140px]`}>
              <DateBox
                value={bangKeDate}
                label={t("NBKCLQUAN", "Ngày bảng kê có liên quan")}
                labelMode="floating"
                {...relatedDateBoxOptions}
                onValueChanged={(event) => handleBangKeDateChange(event.value instanceof Date ? event.value : null)}
              />
            </div>
            {onOpenBke ? (
              <Button
                icon="detailslayout"
                text={t("OPEN_BKE", "Bảng kê chi tiết")}
                stylingMode="outlined"
                hint={bkeSummary ?? undefined}
                onClick={onOpenBke}
              />
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <div className={`${compactFieldClass} w-[72px]`}>
                <TextBox
                  value={related?.KHMSHDCLQUAN ?? ""}
                  label={t("KHMSHDCLQUAN", "Ký hiệu mẫu số hóa đơn có liên quan")}
                  labelMode="floating"
                  {...editableFieldProps}
                  onValueChanged={isExternal && !readOnly
                    ? (event) => handleFieldChange("KHMSHDCLQUAN", String(event.value ?? ""))
                    : undefined}
                />
              </div>
              <div className={`${compactFieldClass} w-[108px]`}>
                <TextBox
                  value={related?.KHHDCLQUAN ?? ""}
                  label={t("KHHDCLQUAN", "Ký hiệu hóa đơn có liên quan")}
                  labelMode="floating"
                  {...editableFieldProps}
                  onValueChanged={isExternal && !readOnly
                    ? (event) => handleFieldChange("KHHDCLQUAN", String(event.value ?? ""))
                    : undefined}
                />
              </div>
              <div className={`${compactFieldClass} w-[88px]`}>
                <TextBox
                  value={related?.SHDCLQUAN ?? ""}
                  label={t("SHDCLQUAN", "Số hóa đơn có liên quan")}
                  labelMode="floating"
                  {...editableFieldProps}
                  onValueChanged={isExternal && !readOnly
                    ? (event) => handleFieldChange("SHDCLQUAN", String(event.value ?? ""))
                    : undefined}
                />
              </div>
              <div className={`${compactFieldClass} w-[124px]`}>
                {isExternal ? (
                  <DateBox
                    value={relatedDate}
                    label={t("NLHDCLQUAN", "Ngày lập hóa đơn có liên quan")}
                    labelMode="floating"
                    {...relatedDateBoxOptions}
                    onValueChanged={(event) => handleDateChange(event.value instanceof Date ? event.value : null)}
                  />
                ) : (
                  <TextBox
                    value={formatYmdForDisplay(related?.NLHDCLQUAN)}
                    readOnly={true}
                    label={t("NLHDCLQUAN", "Ngày lập hóa đơn có liên quan")}
                    labelMode="floating"
                  />
                )}
              </div>
              {!isExternal ? (
                <Button
                  icon="search"
                  text={t("SELECT", "Select")}
                  stylingMode="outlined"
                  disabled={readOnly}
                  onClick={handleOpenPicker}
                />
              ) : null}
            </div>

            <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <div className={`${compactFieldClass} min-w-[220px] flex-1`}>
                <SelectBox
                  value={related?.LDDCTTHE ?? null}
                  dataSource={lddcttheOptions}
                  valueExpr={lddcttheValueExpr}
                  displayExpr={lddcttheDisplayExpr}
                  label={t("LDDCTTHE", "Lý do điều chỉnh/thay thế")}
                  labelMode="floating"
                  searchEnabled={true}
                  showClearButton={true}
                  readOnly={readOnly}
                  onValueChanged={(event) => {
                    const raw = event.value
                    const parsed = raw === null || raw === undefined || raw === "" ? null : Number(raw)
                    handleLddcttheChange(Number.isFinite(parsed as number) ? (parsed as number) : null)
                  }}
                />
              </div>
              <div className={`${compactFieldClass} w-[160px]`}>
                <TextBox
                  value={related?.MSTCLQUAN ?? ""}
                  label={t("MSTCLQUAN", "Mã số thuế có liên quan")}
                  labelMode="floating"
                  readOnly={readOnly}
                  maxLength={14}
                  onValueChanged={!readOnly
                    ? (event) => handleFieldChange("MSTCLQUAN", String(event.value ?? ""))
                    : undefined}
                />
              </div>
            </div>
          </>
        )}

        <TextBox
          value={related?.GCHU ?? ""}
          readOnly={readOnly}
          label={t("GCHU", "Note")}
          labelMode="floating"
          onValueChanged={(event) => handleGchuChange(String(event.value ?? ""))}
        />
      </div>

      {pickerVisible ? (
        <EInvoiceInvoiceSelectPopup
          visible={pickerVisible}
          companyCd={companyCd}
          excludeInvoiceId={invoiceId}
          isSigned={1}
          selectionMode="single"
          onClose={handleClosePicker}
          onSelect={handleSelectInvoice}
        />
      ) : null}
    </>
  )
}
