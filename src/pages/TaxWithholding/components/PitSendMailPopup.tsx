import { useState } from "react"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import TextBox from "devextreme-react/text-box"
import { isValidBuyerEmailList, normalizeBuyerEmailList } from "@/pages/EInvoice/einvoiceModel"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { PitDocument } from "../types"
import { pitDocumentLabel } from "../pitRowActions"

export default function PitSendMailPopup({ row, loading, t, onClose, onConfirm }: {
  row: PitDocument
  loading: boolean
  t: (key: string, fallback: string) => string
  onClose: () => void
  onConfirm: (toEmail: string) => void
}) {
  const [toEmail, setToEmail] = useState(row.KIND === "certificate" ? row.NNT_DCTDTU ?? "" : "")
  const valid = Boolean(toEmail.trim()) && toEmail.length <= 1000 && isValidBuyerEmailList(toEmail)
  return (
    <Popup
      visible
      title={t("PIT_SEND_MAIL_TITLE", "Gửi mail chứng từ khấu trừ thuế")}
      width="min(620px, 96vw)"
      height="auto"
      maxHeight="90vh"
      dragEnabled={false}
      showCloseButton={!loading}
      hideOnOutsideClick={!loading}
      onHiding={() => { if (!loading) onClose() }}
      animation={POPUP_FADE_ANIMATION}
    >
      <ToolbarItem toolbar="bottom" location="after" widget="dxButton" options={{
        text: t("SEND_MAIL", "Gửi mail"), icon: "email", type: "default", stylingMode: "contained",
        disabled: loading || !valid, onClick: () => { if (!loading && valid) onConfirm(normalizeBuyerEmailList(toEmail)) },
      }} />
      <ToolbarItem toolbar="bottom" location="after" widget="dxButton" options={{
        text: t("CANCEL", "Hủy"), stylingMode: "outlined", disabled: loading, onClick: onClose,
      }} />
      <div className="flex flex-col gap-4 p-1">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-800">
          {pitDocumentLabel(row)}
        </div>
        <TextBox
          label={t("TO_EMAIL", "Email nhận")}
          labelMode="floating"
          value={toEmail}
          valueChangeEvent="input"
          maxLength={1000}
          disabled={loading}
          onValueChanged={(event) => setToEmail(String(event.value ?? ""))}
          isValid={!toEmail.trim() || valid}
        />
        <div className="text-xs text-slate-500">
          {t("SEND_MAIL_MULTI_EMAIL_HINT", "Nhập nhiều email cách nhau bởi dấu chấm phẩy.")}
        </div>
        <div className="text-xs text-slate-500">
          {t("PIT_MAIL_RECIPIENT_HINT", "Kiểm tra người nhận trước khi gửi. Email này chỉ áp dụng cho lần gửi, không thay đổi chứng từ đã ký. Có thể gửi lại bằng thao tác này.")}
        </div>
        {toEmail.trim() && !valid ? <div role="alert" className="text-xs text-red-600">{t("INVALID_EMAIL", "Email không hợp lệ")}</div> : null}
        {loading ? <div role="status" className="text-sm text-slate-500">{t("SEND_MAIL_SENDING", "Đang gửi mail...")}</div> : null}
      </div>
    </Popup>
  )
}
