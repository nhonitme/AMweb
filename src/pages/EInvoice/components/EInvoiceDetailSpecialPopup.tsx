import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import Form, { Item as FormItem } from "devextreme-react/form"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import notify from "devextreme/ui/notify"

import type { EinvLhhdtrungLookupItem } from "@/components/lookup/einvLhhdtrungLookupStore"
import { formatEinvLhhdtrungDisplay } from "@/components/lookup/EinvLhhdtrungLookupCellEditor"
import { LanguageContext } from "@/lib/i18nLoader"
import { createSysCodeDisplayExpr, createSysCodeValueExpr } from "@/lib/sysCodeUtils"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { EInvoiceDetailSpecialInfo } from "@/types/einvoice"
import {
  applyEInvoiceDetailSpecialLhhdtrung,
  createDefaultEInvoiceDetailSpecial,
  hasEInvoiceDetailSpecialData,
  parseSpecialExtraJson,
  stringifySpecialExtraJson,
} from "../einvoiceModel"
import { fieldRequiredMessage } from "../einvoiceI18n"

type SpecialDraft = EInvoiceDetailSpecialInfo & {
  LTSAN?: string
  TTTSAN?: string
  XXU?: string
  SGCNATKTHUAT?: string
  SSPKTCLXXUONG?: string
  MNSXUAT?: string
  TLTSDKY?: string
  NSXUAT?: string
  TTMAI?: string
  TNHIEU?: string
  KLXE?: string
  TTLVHCSUAT?: string
  TTAI?: string
  SCNGOI?: string
  SBKSOAT?: string
  DDI?: string
  DDEN?: string
  THHVCHUYEN?: string
  TTTDAT?: string
  TTTSGLTDAT?: string
}

interface EInvoiceDetailSpecialPopupProps {
  visible: boolean
  invoiceId: number
  detailId: number
  companyCd: string
  lineLabel?: string
  special: EInvoiceDetailSpecialInfo | null | undefined
  lhhdtrungOptions: EinvLhhdtrungLookupItem[]
  readOnly?: boolean
  onClose: () => void
  onSave: (special: EInvoiceDetailSpecialInfo) => void
}

const TYPE1_EXTRA_KEYS = [
  "LTSan", "TTTSan", "XXu", "SGCNATKThuat", "SSPKTCLXXuong", "MNSXuat", "TLTSDKy",
  "NSXuat", "TTMai", "TNHieu", "KLXe", "TTLVHCSUat", "TTai", "SCNgoi", "SBKSoat",
] as const

function createDraft(
  special: EInvoiceDetailSpecialInfo | null | undefined,
  invoiceId: number,
  detailId: number,
  companyCd: string,
): SpecialDraft {
  const base = special
    ? { ...special }
    : createDefaultEInvoiceDetailSpecial(invoiceId, detailId, companyCd)
  const extra = parseSpecialExtraJson(base.EXTRA_JSON)
  return {
    ...base,
    LTSAN: extra.LTSan ?? "",
    TTTSAN: extra.TTTSan ?? "",
    XXU: extra.XXu ?? "",
    SGCNATKTHUAT: extra.SGCNATKThuat ?? "",
    SSPKTCLXXUONG: extra.SSPKTCLXXuong ?? "",
    MNSXUAT: extra.MNSXuat ?? "",
    TLTSDKY: extra.TLTSDKy ?? "",
    NSXUAT: extra.NSXuat ?? "",
    TTMAI: extra.TTMai ?? "",
    TNHIEU: extra.TNHieu ?? "",
    KLXE: extra.KLXe ?? "",
    TTLVHCSUAT: extra.TTLVHCSUat ?? "",
    TTAI: extra.TTai ?? "",
    SCNGOI: extra.SCNgoi ?? "",
    SBKSOAT: extra.SBKSoat ?? "",
    DDI: extra.DDi ?? "",
    DDEN: extra.DDen ?? "",
    THHVCHUYEN: extra.THHVChuyen ?? "",
    TTTDAT: extra.TTTDat ?? "",
    TTTSGLTDAT: extra.TTTSGLTDat ?? "",
  }
}

function draftToSpecial(draft: SpecialDraft): EInvoiceDetailSpecialInfo {
  const lhhdtrung = Number(draft.LHHDTRUNG ?? 0)
  const extraValues: Record<string, string> = {}

  if (lhhdtrung === 1) {
    extraValues.LTSan = draft.LTSAN ?? ""
    extraValues.TTTSan = draft.TTTSAN ?? ""
    extraValues.XXu = draft.XXU ?? ""
    extraValues.SGCNATKThuat = draft.SGCNATKTHUAT ?? ""
    extraValues.SSPKTCLXXuong = draft.SSPKTCLXXUONG ?? ""
    extraValues.MNSXuat = draft.MNSXUAT ?? ""
    extraValues.TLTSDKy = draft.TLTSDKY ?? ""
    extraValues.NSXuat = draft.NSXUAT ?? ""
    extraValues.TTMai = draft.TTMAI ?? ""
    extraValues.TNHieu = draft.TNHIEU ?? ""
    extraValues.KLXe = draft.KLXE ?? ""
    extraValues.TTLVHCSUat = draft.TTLVHCSUAT ?? ""
    extraValues.TTai = draft.TTAI ?? ""
    extraValues.SCNgoi = draft.SCNGOI ?? ""
    extraValues.SBKSoat = draft.SBKSOAT ?? ""
  } else if (lhhdtrung === 2) {
    extraValues.DDi = draft.DDI ?? ""
    extraValues.DDen = draft.DDEN ?? ""
  } else if (lhhdtrung === 3) {
    extraValues.THHVChuyen = draft.THHVCHUYEN ?? ""
  } else if (lhhdtrung === 4) {
    extraValues.TTTDat = draft.TTTDAT ?? ""
    extraValues.TTTSGLTDat = draft.TTTSGLTDAT ?? ""
  }

  return {
    SPECIAL_ID: draft.SPECIAL_ID,
    INVOICE_ID: draft.INVOICE_ID,
    DETAIL_ID: draft.DETAIL_ID,
    COMPANY_CD: draft.COMPANY_CD,
    LHHDTRUNG: draft.LHHDTRUNG,
    SKHUNG: draft.SKHUNG,
    SMAY: draft.SMAY,
    BKSPT_VCHUYEN: draft.BKSPT_VCHUYEN,
    TNG_HANG: draft.TNG_HANG,
    DCNG_HANG: draft.DCNG_HANG,
    MSTNG_HANG: draft.MSTNG_HANG,
    MDDNG_HANG: draft.MDDNG_HANG,
    EXTRA_JSON: stringifySpecialExtraJson(extraValues),
  }
}

export default function EInvoiceDetailSpecialPopup({
  visible,
  invoiceId,
  detailId,
  companyCd,
  lineLabel = "",
  special,
  lhhdtrungOptions,
  readOnly = false,
  onClose,
  onSave,
}: EInvoiceDetailSpecialPopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const [draft, setDraft] = useState<SpecialDraft>(() => createDraft(special, invoiceId, detailId, companyCd))

  useEffect(() => {
    if (!visible) {
      return
    }

    setDraft(createDraft(special, invoiceId, detailId, companyCd))
  }, [companyCd, detailId, invoiceId, special, visible])

  const lhhdtrung = Number(draft.LHHDTRUNG ?? 0)
  const isUsedVehicle = String(draft.TTTSAN ?? "") === "1"
  const isImported = String(draft.XXU ?? "") === "1"
  const isDomestic = String(draft.XXU ?? "") === "0"
  const isCar = String(draft.LTSAN ?? "") === "1"
  const lhhdtrungDisplayExpr = useMemo(() => createSysCodeDisplayExpr(t), [t])
  const lhhdtrungValueExpr = useMemo(() => createSysCodeValueExpr("number"), [])

  const updateDraftField = useCallback((field: keyof SpecialDraft, value: unknown) => {
    setDraft((current) => ({
      ...current,
      [field]: typeof value === "number" ? value : String(value ?? "").trim(),
    }))
  }, [])

  const handleLhhdtrungChanged = useCallback(
    (event: { value?: unknown }) => {
      const parsed = Number(event.value ?? 0)
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 4) {
        setDraft(createDraft(null, invoiceId, detailId, companyCd))
        return
      }

      setDraft((current) => {
        const next = applyEInvoiceDetailSpecialLhhdtrung(current, parsed)
        return createDraft(next, invoiceId, detailId, companyCd)
      })
    },
    [companyCd, detailId, invoiceId],
  )

  const handleSave = useCallback(() => {
    if (readOnly) {
      onClose()
      return
    }

    if (lhhdtrung < 1 || lhhdtrung > 4) {
      notify(fieldRequiredMessage(t, "LHHDTRUNG", "Loại HHDV đặc trưng"), "warning", 3000)
      return
    }

    if (lhhdtrung === 1) {
      if (!String(draft.SKHUNG ?? "").trim() || !String(draft.SMAY ?? "").trim()) {
        notify(t("SPECIAL_TYPE1_SKHUNG_SMAY_REQUIRED", "SKhung và SMay là bắt buộc (Phụ lục XV)"), "warning", 4000)
        return
      }
      if (!String(draft.LTSAN ?? "").trim() || !String(draft.TTTSAN ?? "").trim() || !String(draft.XXU ?? "").trim()) {
        notify(t("SPECIAL_TYPE1_CORE_REQUIRED", "LTSan, TTTSan, XXu là bắt buộc"), "warning", 4000)
        return
      }
      if (isImported && !String(draft.SGCNATKTHUAT ?? "").trim()) {
        notify(t("SPECIAL_TYPE1_IMPORT_REQUIRED", "SGCNATKThuat bắt buộc với xe nhập khẩu"), "warning", 4000)
        return
      }
      if (isDomestic && !String(draft.SSPKTCLXXUONG ?? "").trim()) {
        notify(t("SPECIAL_TYPE1_DOMESTIC_REQUIRED", "SSPKTCLXXuong bắt buộc với xe SX/lắp ráp trong nước"), "warning", 4000)
        return
      }
      if (isUsedVehicle) {
        const usedRequired = [
          draft.MNSXUAT, draft.TLTSDKY, draft.NSXUAT, draft.TTMAI, draft.TNHIEU,
          draft.KLXE, draft.TTLVHCSUAT, draft.SCNGOI, draft.SBKSOAT,
        ]
        if (usedRequired.some((v) => !String(v ?? "").trim()) || (isCar && !String(draft.TTAI ?? "").trim())) {
          notify(t("SPECIAL_TYPE1_USED_REQUIRED", "Thiếu chỉ tiêu bắt buộc với xe đã qua sử dụng"), "warning", 4000)
          return
        }
      }
    }

    const specialPayload = draftToSpecial(draft)
    if (!hasEInvoiceDetailSpecialData(specialPayload)) {
      notify(fieldRequiredMessage(t, "SPECIAL_POPUP_TITLE", "Hàng hóa/dịch vụ đặc trưng"), "warning", 3500)
      return
    }

    onSave(specialPayload)
    onClose()
  }, [draft, isCar, isDomestic, isImported, isUsedVehicle, lhhdtrung, onClose, onSave, readOnly, t])

  const popupTitle = t("SPECIAL_POPUP_TITLE", "Hàng hóa/dịch vụ đặc trưng")
  const subtitle = lineLabel.trim().length > 0
    ? t("SPECIAL_POPUP_LINE", "Dòng: {0}").replace("{0}", lineLabel)
    : ""

  void TYPE1_EXTRA_KEYS

  return (
    <Popup
      visible={visible}
      title={popupTitle}
      showTitle={true}
      showCloseButton={false}
      dragEnabled={false}
      resizeEnabled={false}
      hideOnOutsideClick={false}
      width="min(720px, 96vw)"
      height="auto"
      maxHeight="min(860px, 94vh)"
      animation={POPUP_FADE_ANIMATION}
      onHiding={onClose}
    >
      <ToolbarItem
        toolbar="top"
        location="after"
        render={() => <Button icon="close" stylingMode="text" hint={t("CANCEL", "Cancel")} onClick={onClose} />}
      />

      <div className="flex flex-col gap-4 p-4">
        {subtitle ? <div className="text-sm text-slate-500">{subtitle}</div> : null}

        <Form
          formData={draft}
          labelLocation="top"
          readOnly={readOnly}
          onFieldDataChanged={(event) => {
            if (!event.dataField || event.dataField === "LHHDTRUNG") {
              return
            }

            updateDraftField(event.dataField as keyof SpecialDraft, event.value)
          }}
          showColonAfterLabel={false}
          colCount={2}
        >
          <FormItem
            dataField="LHHDTRUNG"
            editorType="dxSelectBox"
            colSpan={2}
            label={{ text: t("LHHDTRUNG", "Loại HHDV đặc trưng") }}
            editorOptions={{
              dataSource: lhhdtrungOptions,
              valueExpr: lhhdtrungValueExpr,
              displayExpr: lhhdtrungDisplayExpr,
              searchEnabled: true,
              showClearButton: false,
              onValueChanged: handleLhhdtrungChanged,
            }}
          />

          {lhhdtrung === 1 ? (
            <>
              <FormItem dataField="SKHUNG" editorType="dxTextBox" label={{ text: t("SKHUNG", "Số khung (SKhung) *") }} editorOptions={{ maxLength: 50 }} />
              <FormItem dataField="SMAY" editorType="dxTextBox" label={{ text: t("SMAY", "Số máy (SMay) *") }} editorOptions={{ maxLength: 50 }} />
              <FormItem
                dataField="LTSAN"
                editorType="dxSelectBox"
                label={{ text: t("LTSAN", "Loại tài sản (LTSan) *") }}
                editorOptions={{
                  dataSource: [
                    { value: "1", text: "1 - Ô tô" },
                    { value: "2", text: "2 - Mô tô xe máy" },
                  ],
                  valueExpr: "value",
                  displayExpr: "text",
                }}
              />
              <FormItem
                dataField="TTTSAN"
                editorType="dxSelectBox"
                label={{ text: t("TTTSAN", "Tình trạng tài sản (TTTSan) *") }}
                editorOptions={{
                  dataSource: [
                    { value: "0", text: "0 - Chưa qua sử dụng" },
                    { value: "1", text: "1 - Đã qua sử dụng" },
                  ],
                  valueExpr: "value",
                  displayExpr: "text",
                }}
              />
              <FormItem
                dataField="XXU"
                editorType="dxSelectBox"
                label={{ text: t("XXU", "Xuất xứ (XXu) *") }}
                editorOptions={{
                  dataSource: [
                    { value: "0", text: "0 - SX/lắp ráp trong nước" },
                    { value: "1", text: "1 - Nhập khẩu" },
                  ],
                  valueExpr: "value",
                  displayExpr: "text",
                }}
              />
              {isImported ? (
                <FormItem dataField="SGCNATKTHUAT" colSpan={2} editorType="dxTextBox" label={{ text: t("SGCNATKTHUAT", "Số GCN AT ATKT & BVMT (SGCNATKThuat) *") }} editorOptions={{ maxLength: 255 }} />
              ) : null}
              {isDomestic ? (
                <FormItem dataField="SSPKTCLXXUONG" colSpan={2} editorType="dxTextBox" label={{ text: t("SSPKTCLXXUONG", "Seri phiếu KTCL xuất xưởng (SSPKTCLXXuong) *") }} editorOptions={{ maxLength: 255 }} />
              ) : null}
              {isUsedVehicle ? (
                <>
                  <FormItem dataField="MNSXUAT" editorType="dxTextBox" label={{ text: t("MNSXUAT", "Mã nước SX (MNSXuat) *") }} editorOptions={{ maxLength: 2 }} />
                  <FormItem dataField="NSXUAT" editorType="dxTextBox" label={{ text: t("NSXUAT", "Năm sản xuất (NSXuat) *") }} editorOptions={{ maxLength: 4 }} />
                  <FormItem dataField="TLTSDKY" colSpan={2} editorType="dxTextBox" label={{ text: t("TLTSDKY", "Tên loại TS đăng ký (TLTSDKy) *") }} editorOptions={{ maxLength: 255 }} />
                  <FormItem dataField="TTMAI" colSpan={2} editorType="dxTextBox" label={{ text: t("TTMAI", "Tên thương mại (TTMai) *") }} editorOptions={{ maxLength: 400 }} />
                  <FormItem dataField="TNHIEU" editorType="dxTextBox" label={{ text: t("TNHIEU", "Tên nhãn hiệu (TNHieu) *") }} editorOptions={{ maxLength: 255 }} />
                  <FormItem dataField="KLXE" editorType="dxTextBox" label={{ text: t("KLXE", "Kiểu loại xe (KLXe) *") }} editorOptions={{ maxLength: 50 }} />
                  <FormItem dataField="TTLVHCSUAT" editorType="dxTextBox" label={{ text: t("TTLVHCSUAT", "Thể tích/Công suất (TTLVHCSUat) *") }} editorOptions={{ maxLength: 10 }} />
                  {isCar ? (
                    <FormItem dataField="TTAI" editorType="dxTextBox" label={{ text: t("TTAI", "Trọng tải (TTai) *") }} editorOptions={{ maxLength: 12 }} />
                  ) : null}
                  <FormItem dataField="SCNGOI" editorType="dxTextBox" label={{ text: t("SCNGOI", "Số người cho phép chở (SCNgoi) *") }} editorOptions={{ maxLength: 4 }} />
                  <FormItem dataField="SBKSOAT" editorType="dxTextBox" label={{ text: t("SBKSOAT", "Số biển kiểm soát (SBKSoat) *") }} editorOptions={{ maxLength: 20 }} />
                </>
              ) : null}
            </>
          ) : null}

          {lhhdtrung === 2 ? (
            <>
              <FormItem dataField="BKSPT_VCHUYEN" colSpan={2} editorType="dxTextBox" label={{ text: t("BKSPT_VCHUYEN", "Biển KS PTVC (BKSPTVChuyen)") }} editorOptions={{ maxLength: 50 }} />
              <FormItem dataField="DDI" editorType="dxTextBox" label={{ text: t("DDI", "Điểm đi (DDi)") }} editorOptions={{ maxLength: 255 }} />
              <FormItem dataField="DDEN" editorType="dxTextBox" label={{ text: t("DDEN", "Điểm đến (DDen)") }} editorOptions={{ maxLength: 255 }} />
            </>
          ) : null}

          {lhhdtrung === 3 ? (
            <>
              <FormItem dataField="THHVCHUYEN" colSpan={2} editorType="dxTextBox" label={{ text: t("THHVCHUYEN", "Tên HH vận chuyển (THHVChuyen)") }} editorOptions={{ maxLength: 255 }} />
              <FormItem dataField="TNG_HANG" colSpan={2} editorType="dxTextBox" label={{ text: t("TNG_HANG", "Tên người gửi (TNGHang) *") }} editorOptions={{ maxLength: 255 }} />
              <FormItem dataField="DCNG_HANG" colSpan={2} editorType="dxTextBox" label={{ text: t("DCNG_HANG", "Địa chỉ người gửi (DCNGHang) *") }} editorOptions={{ maxLength: 255 }} />
              <FormItem dataField="MSTNG_HANG" editorType="dxTextBox" label={{ text: t("MSTNG_HANG", "MST người gửi (MSTNGHang) *") }} editorOptions={{ maxLength: 14 }} />
              <FormItem dataField="MDDNG_HANG" editorType="dxTextBox" label={{ text: t("MDDNG_HANG", "Số ĐD người gửi (MDDNGHang) *") }} editorOptions={{ maxLength: 12 }} />
            </>
          ) : null}

          {lhhdtrung === 4 ? (
            <>
              <FormItem dataField="TTTDAT" colSpan={2} editorType="dxTextArea" label={{ text: t("TTTDAT", "Thông tin thửa đất (TTTDat)") }} editorOptions={{ maxLength: 400, height: 80 }} />
              <FormItem dataField="TTTSGLTDAT" colSpan={2} editorType="dxTextArea" label={{ text: t("TTTSGLTDAT", "TS gắn liền với đất (TTTSGLTDat)") }} editorOptions={{ maxLength: 400, height: 80 }} />
            </>
          ) : null}
        </Form>

        {lhhdtrung >= 1 && lhhdtrung <= 4 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {formatEinvLhhdtrungDisplay(lhhdtrung, lhhdtrungOptions, t)}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <Button text={t("CANCEL", "Cancel")} stylingMode="outlined" onClick={onClose} />
          {!readOnly ? (
            <Button text={t("OK", "OK")} type="default" stylingMode="contained" onClick={handleSave} />
          ) : null}
        </div>
      </div>
    </Popup>
  )
}
