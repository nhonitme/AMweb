import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import TextBox from "devextreme-react/text-box"

import { LanguageContext } from "@/lib/i18nLoader"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { EInvoice } from "@/types/einvoice"
import { formatEInvoiceDisplayNo, isValidBuyerEmailList, normalizeBuyerEmailList } from "../einvoiceModel"

type EInvoiceEditMailPopupProps = {
  visible: boolean
  invoice: EInvoice | null
  loading?: boolean
  onClose: () => void
  onConfirm: (invoice: EInvoice, toEmail: string) => void
}

export default function EInvoiceEditMailPopup({
  visible,
  invoice,
  loading = false,
  onClose,
  onConfirm,
}: EInvoiceEditMailPopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const [toEmail, setToEmail] = useState("")

  useEffect(() => {
    if (!visible) {
      return
    }

    setToEmail(String(invoice?.NMUA_DCTDTU ?? "").trim())
  }, [invoice, visible])

  const normalizedEmail = useMemo(() => normalizeBuyerEmailList(toEmail), [toEmail])
  const isInvalid = toEmail.trim().length > 0 && !isValidBuyerEmailList(toEmail)
  const canSubmit = !!invoice && !loading && !isInvalid
  const displayNo = invoice ? formatEInvoiceDisplayNo(invoice) || String(invoice.SHDON ?? "").trim() : ""

  const handleConfirm = useCallback(() => {
    if (!invoice || isInvalid) {
      return
    }

    onConfirm(invoice, normalizedEmail)
  }, [invoice, isInvalid, normalizedEmail, onConfirm])

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      dragEnabled={false}
      hideOnOutsideClick={!loading}
      showCloseButton={!loading}
      width={520}
      height="auto"
      title={t("EDIT_MAIL", "Sửa mail")}
      animation={POPUP_FADE_ANIMATION}
    >
      <ToolbarItem
        toolbar="bottom"
        location="after"
        widget="dxButton"
        options={{
          text: t("SAVE", "Lưu"),
          icon: "save",
          type: "default",
          stylingMode: "contained",
          disabled: !canSubmit,
          onClick: handleConfirm,
        }}
      />
      <ToolbarItem
        toolbar="bottom"
        location="after"
        widget="dxButton"
        options={{
          text: t("CANCEL", "Cancel"),
          stylingMode: "outlined",
          disabled: loading,
          onClick: onClose,
        }}
      />

      <div className="flex flex-col gap-3 p-1">
        <div className="text-sm font-medium text-slate-800">{displayNo || "-"}</div>
        <div className="text-xs text-slate-500">
          {t("SEND_MAIL_MULTI_EMAIL_HINT", "Nhập nhiều email cách nhau bởi dấu chấm phẩy.")}
        </div>
        <TextBox
          value={toEmail}
          showClearButton={true}
          disabled={loading}
          placeholder={t("SEND_MAIL_EMAIL_PLACEHOLDER", "Nhập email người nhận")}
          onValueChanged={(event) => setToEmail(String(event.value ?? ""))}
        />
        {isInvalid ? (
          <div className="text-xs text-red-600">{t("INVALID_EMAIL", "Email is invalid")}</div>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <i className="dx-icon-refresh animate-spin" />
            {t("SAVING", "Đang lưu...")}
          </div>
        ) : null}
      </div>
    </Popup>
  )
}
