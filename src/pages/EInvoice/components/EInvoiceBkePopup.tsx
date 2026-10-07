import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import DateBox from "devextreme-react/date-box"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import TextArea from "devextreme-react/text-area"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"

import { getEInvoice, getNextEInvoiceBkeNo } from "@/api/einvoiceApi"
import { createDateBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"
import { LanguageContext } from "@/lib/i18nLoader"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { EInvoice, EInvoiceBkeDetail, EInvoiceBkeInfo, EInvoiceBkeReason } from "@/types/einvoice"
import { fieldRequiredMessage } from "../einvoiceI18n"
import {
  buildEInvoiceBkeDetailsFromSourceInvoice,
  createDefaultEInvoiceBkeReason,
  isEInvoiceEligibleForBkeSource,
  normalizeEInvoice,
  resolveEInvoiceBkeTchdon,
  syncEInvoiceBkeWithRelated,
} from "../einvoiceModel"
import EInvoiceBkeDetailGridSection from "./EInvoiceBkeDetailGridSection"
import EInvoiceInvoiceSelectPopup from "./EInvoiceInvoiceSelectPopup"

type EInvoiceBkePopupProps = {
  visible: boolean
  invoice: EInvoice
  readOnly?: boolean
  onClose: () => void
  onSave: (bke: EInvoiceBkeInfo) => void
}

function parseDate(value: string | null | undefined): Date | null {
  const text = String(value ?? "").trim()
  if (!text) return null
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(value: Date | null): string {
  if (!value) return ""
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function EInvoiceBkePopup({
  visible,
  invoice,
  readOnly = false,
  onClose,
  onSave,
}: EInvoiceBkePopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const [draft, setDraft] = useState<EInvoiceBkeInfo>(() =>
    syncEInvoiceBkeWithRelated(invoice.BKE_INFO, invoice.RELATED, invoice),
  )
  const [pickerVisible, setPickerVisible] = useState(false)
  const [selectingInvoices, setSelectingInvoices] = useState(false)

  useEffect(() => {
    if (!visible) return
    setDraft(syncEInvoiceBkeWithRelated(invoice.BKE_INFO, invoice.RELATED, invoice))
  }, [invoice, visible])

  const bangKeDate = useMemo(() => parseDate(draft.NBKE), [draft.NBKE])
  const bangKeDateBoxOptions = useMemo(
    () =>
      createDateBoxEditorOptions({
        dateSerializationFormat: "yyyy-MM-dd",
        openOnFieldClick: !readOnly,
        readOnly,
        disabled: readOnly,
      }),
    [readOnly],
  )
  const detailRows = useMemo(
    () => draft.DETAILS.filter((detail) => detail.ISDEL !== 1),
    [draft.DETAILS],
  )
  const reasonRows = useMemo(
    () => draft.REASONS.filter((reason) => reason.ISDEL !== 1),
    [draft.REASONS],
  )

  const updateDraft = useCallback((patch: Partial<EInvoiceBkeInfo>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }, [])

  const handleReasonChange = useCallback((index: number, value: string) => {
    setDraft((current) => {
      const reasons = current.REASONS.filter((reason) => reason.ISDEL !== 1).map((reason, reasonIndex) =>
        reasonIndex === index ? { ...reason, LDO: value } : reason,
      )
      return { ...current, REASONS: reasons }
    })
  }, [])

  const handleAddReason = useCallback(() => {
    setDraft((current) => {
      const reasons = current.REASONS.filter((reason) => reason.ISDEL !== 1)
      return {
        ...current,
        REASONS: [...reasons, createDefaultEInvoiceBkeReason(reasons.length + 1, current.BKE_ID)],
      }
    })
  }, [])

  const handleRemoveReason = useCallback((index: number) => {
    setDraft((current) => {
      const reasons = current.REASONS.filter((reason) => reason.ISDEL !== 1).filter((_, reasonIndex) => reasonIndex !== index)
      return {
        ...current,
        REASONS: reasons.length > 0 ? reasons : [createDefaultEInvoiceBkeReason(1, current.BKE_ID)],
      }
    })
  }, [])

  const handleDetailsChange = useCallback((details: EInvoiceBkeDetail[]) => {
    setDraft((current) => ({ ...current, DETAILS: details }))
  }, [])

  const handleSelectInvoices = useCallback(async (invoices: EInvoice[]) => {
    const buyerTaxCd = String(invoice.NMUA_MST ?? "").trim()
    const eligible = invoices.filter((source) => isEInvoiceEligibleForBkeSource(source, buyerTaxCd))
    const rejected = invoices.length - eligible.length
    if (rejected > 0) {
      notify(
        t(
          "BKE_SOURCE_MUST_SIGNED_SAME_BUYER",
          "Chỉ chọn hóa đơn đã ký và cùng MST người mua với hóa đơn hiện tại",
        ),
        "warning",
        4500,
      )
    }
    if (eligible.length === 0) {
      return
    }

    setSelectingInvoices(true)
    try {
      const hydrated = await Promise.all(
        eligible.map(async (source) => {
          const invoiceId = Number(source.INVOICE_ID ?? 0)
          if (invoiceId <= 0) {
            return source
          }
          if ((source.DETAILS ?? []).some((detail) => detail.ISDEL !== 1)) {
            return source
          }
          try {
            const response = await getEInvoice(invoiceId)
            return normalizeEInvoice(response.data, invoice.COMPANY_CD)
          } catch {
            return source
          }
        }),
      )

      setDraft((current) => {
        const existing = current.DETAILS.filter((detail) => detail.ISDEL !== 1)
        const existingRefIds = new Set(
          existing
            .map((detail) => Number(detail.REF_INVOICE_ID ?? 0))
            .filter((id) => id > 0),
        )
        const appended: EInvoiceBkeDetail[] = []
        hydrated.forEach((source) => {
          const refId = Number(source.INVOICE_ID ?? 0)
          if (refId > 0 && existingRefIds.has(refId)) {
            return
          }
          if (refId > 0) {
            existingRefIds.add(refId)
          }
          appended.push(
            ...buildEInvoiceBkeDetailsFromSourceInvoice(
              source,
              existing.length + appended.length + 1,
              current.BKE_ID,
            ),
          )
        })
        return {
          ...current,
          DETAILS: [...existing, ...appended],
          MSTNMUA: buyerTaxCd,
          NMUA: String(invoice.NMUA_TEN ?? "").trim() || current.NMUA,
          DCNMUA: String(invoice.NMUA_DCHI ?? "").trim() || current.DCNMUA,
        }
      })
      setPickerVisible(false)
    } finally {
      setSelectingInvoices(false)
    }
  }, [invoice.COMPANY_CD, invoice.NMUA_DCHI, invoice.NMUA_MST, invoice.NMUA_TEN, t])

  const handleSave = useCallback(() => {
    const synced = syncEInvoiceBkeWithRelated(draft, invoice.RELATED, invoice)
    const next = {
      ...synced,
      TCHDON: resolveEInvoiceBkeTchdon(invoice.RELATED?.TCHDON),
      SBKE: String(synced.SBKE ?? "").trim(),
      NBKE: formatDate(bangKeDate) || formatDate(parseDate(synced.NBKE)),
      REASONS: reasonRows
        .map((reason, index) => ({ ...reason, SORT_ORDER: index + 1, LDO: String(reason.LDO ?? "").trim() }))
        .filter((reason) => reason.LDO.length > 0),
      DETAILS: detailRows.map((detail, index) => ({
        ...detail,
        STT: detail.STT ?? index + 1,
        KHMSHDON: String(detail.KHMSHDON ?? "").trim().slice(0, 1),
      })),
    }

    if (!next.SBKE || !next.NBKE) {
      notify(fieldRequiredMessage(t, "RELATED_BANG_KE", "Số/Ngày bảng kê"), "warning", 4000)
      return
    }
    if (next.REASONS.length === 0) {
      notify(fieldRequiredMessage(t, "BKE_LDO", "Lý do bảng kê"), "warning", 4000)
      return
    }
    if (next.DETAILS.length === 0) {
      notify(fieldRequiredMessage(t, "BKE_DETAIL", "Chi tiết bảng kê"), "warning", 4000)
      return
    }
    const missingForm = next.DETAILS.find((detail) => !String(detail.KHMSHDON ?? "").trim())
    if (missingForm) {
      notify(fieldRequiredMessage(t, "KHMSHDON", "Ký hiệu mẫu số HĐ"), "warning", 4000)
      return
    }
    const missingRef = next.DETAILS.find((detail) => !(Number(detail.REF_INVOICE_ID ?? 0) > 0))
    if (missingRef) {
      notify(
        t("BKE_DETAIL_MUST_SELECT_SIGNED", "Chi tiết bảng kê phải chọn từ hóa đơn đã ký trong hệ thống"),
        "warning",
        4500,
      )
      return
    }

    onSave(next)
  }, [bangKeDate, detailRows, draft, invoice, onSave, reasonRows, t])

  return (
    <>
      <Popup
        visible={visible}
        dragEnabled={false}
        showCloseButton={true}
        title={t("BKE_01_BK_DCTT", "Bảng kê thay thế, điều chỉnh")}
        width="96vw"
        maxWidth={1280}
        height="90vh"
        animation={POPUP_FADE_ANIMATION}
        onHiding={onClose}
      >
        <ToolbarItem
          widget="dxButton"
          toolbar="bottom"
          location="after"
          options={{
            text: t("CANCEL", "Cancel"),
            stylingMode: "outlined",
            onClick: onClose,
          }}
        />
        {!readOnly ? (
          <ToolbarItem
            widget="dxButton"
            toolbar="bottom"
            location="after"
            options={{
              text: t("OK", "OK"),
              type: "default",
              disabled: selectingInvoices,
              onClick: handleSave,
            }}
          />
        ) : null}

        <div className="flex h-full flex-col gap-3 overflow-hidden p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-end gap-1">
              <div className="w-[180px]">
                <TextBox
                  value={draft.SBKE}
                  label={t("SBKE", "Số bảng kê")}
                  labelMode="floating"
                  readOnly={readOnly}
                  maxLength={50}
                  onValueChanged={!readOnly ? (event) => updateDraft({ SBKE: String(event.value ?? "") }) : undefined}
                />
              </div>
              {!readOnly ? (
                <Button
                  icon="refresh"
                  stylingMode="outlined"
                  hint={t("RELOAD_BKE_NO", "Tải lại số bảng kê")}
                  onClick={async () => {
                    try {
                      const year = bangKeDate?.getFullYear() || new Date().getFullYear()
                      const next = await getNextEInvoiceBkeNo(year)
                      updateDraft({ SBKE: next, NBKE: draft.NBKE || formatDate(new Date()) })
                    } catch {
                      notify(t("GEN_BKE_NO_FAIL", "Không lấy được số bảng kê"), "error", 3000)
                    }
                  }}
                />
              ) : null}
            </div>
            <div className="w-[140px]">
              <DateBox
                value={bangKeDate}
                label={t("NBKE", "Ngày bảng kê")}
                labelMode="floating"
                {...bangKeDateBoxOptions}
                onValueChanged={(event) => updateDraft({ NBKE: formatDate(event.value instanceof Date ? event.value : null) })}
              />
            </div>
            <div className="min-w-[220px] flex-1">
              <TextBox
                value={draft.TBKE}
                label={t("TBKE", "Tên bảng kê")}
                labelMode="floating"
                readOnly={readOnly}
                onValueChanged={!readOnly ? (event) => updateDraft({ TBKE: String(event.value ?? "") }) : undefined}
              />
            </div>
            <div className="min-w-[160px]">
              <TextBox
                value={draft.MSTNMUA}
                label={t("MSTNMUA", "MST người mua")}
                labelMode="floating"
                readOnly={true}
              />
            </div>
            <div className="min-w-[220px] flex-1">
              <TextBox
                value={draft.NMUA}
                label={t("NMUA", "Người mua")}
                labelMode="floating"
                readOnly={true}
              />
            </div>
            <CheckBox
              text={t("TCTCNHANG", "Tổ chức tài chính, ngân hàng")}
              value={draft.TCTCNHANG === 1}
              readOnly={readOnly}
              onValueChanged={!readOnly ? (event) => updateDraft({ TCTCNHANG: event.value ? 1 : 0 }) : undefined}
            />
          </div>

          <div className="flex flex-col gap-2 rounded border border-slate-200 p-2">
            <div className="flex items-center justify-between">
                            <div className="text-sm font-medium">{t("BKE_REASONS", "Lý do thay thế/điều chỉnh")}</div>
              {!readOnly ? (
                <Button icon="plus" stylingMode="text" hint={t("ADD", "Add")} onClick={handleAddReason} />
              ) : null}
            </div>
            {reasonRows.map((reason: EInvoiceBkeReason, index) => (
              <div key={`bke-reason-${index}`} className="flex items-start gap-2">
                <div className="flex-1">
                  <TextArea
                    value={reason.LDO}
                    readOnly={readOnly}
                    autoResizeEnabled={true}
                    minHeight={48}
                    maxHeight={96}
                    onValueChanged={!readOnly ? (event) => handleReasonChange(index, String(event.value ?? "")) : undefined}
                  />
                </div>
                {!readOnly ? (
                  <Button icon="trash" stylingMode="text" onClick={() => handleRemoveReason(index)} />
                ) : null}
              </div>
            ))}
          </div>

          <div className="min-h-0 flex-1">
            <EInvoiceBkeDetailGridSection
              rows={detailRows}
              readOnly={readOnly || selectingInvoices}
              currencyCode={invoice.DVTTE}
              t={t}
              onChange={handleDetailsChange}
              onSelectInvoices={() => {
                if (!String(invoice.NMUA_MST ?? "").trim()) {
                  notify(
                    t(
                      "BKE_REQUIRES_BUYER_MST",
                      "Vui lòng chọn người mua (MST) trước khi chọn hóa đơn đã ký",
                    ),
                    "warning",
                    4000,
                  )
                  return
                }
                setPickerVisible(true)
              }}
            />
          </div>
        </div>
      </Popup>

      {pickerVisible ? (
        <EInvoiceInvoiceSelectPopup
          visible={pickerVisible}
          companyCd={invoice.COMPANY_CD}
          excludeInvoiceId={invoice.INVOICE_ID}
          isSigned={1}
          nmuaMst={String(invoice.NMUA_MST ?? "").trim() || null}
          selectionMode="multiple"
          onClose={() => setPickerVisible(false)}
          onSelect={(rows) => {
            void handleSelectInvoices(rows)
          }}
        />
      ) : null}
    </>
  )
}
