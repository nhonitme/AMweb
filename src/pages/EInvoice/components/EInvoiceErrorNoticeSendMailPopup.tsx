import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import TextBox from "devextreme-react/text-box"

import { LanguageContext } from "@/lib/i18nLoader"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { EInvoiceErrorNotice } from "@/types/einvoiceErrorNotice"
import { isValidBuyerEmailList, normalizeBuyerEmailList } from "../einvoiceModel"
import { formatErrorNoticeDisplayNo } from "../einvoiceErrorNoticeModel"

export type EInvoiceErrorNoticeSendMailItem = {
  tbaoId: number
  displayNo: string
  toEmail: string
}

export type EInvoiceErrorNoticeSendMailRequest = {
  items: EInvoiceErrorNoticeSendMailItem[]
}

type SendMailRow = {
  tbaoId: number
  displayNo: string
  toEmail: string
}

type EInvoiceErrorNoticeSendMailPopupProps = {
  visible: boolean
  notices: EInvoiceErrorNotice[]
  loading?: boolean
  onClose: () => void
  onConfirm: (request: EInvoiceErrorNoticeSendMailRequest) => void
}

function buildRows(notices: EInvoiceErrorNotice[]): SendMailRow[] {
  return notices.map((notice) => ({
    tbaoId: Number(notice.TBAO_ID ?? 0),
    displayNo: formatErrorNoticeDisplayNo(notice),
    toEmail: "",
  }))
}

export default function EInvoiceErrorNoticeSendMailPopup({
  visible,
  notices,
  loading = false,
  onClose,
  onConfirm,
}: EInvoiceErrorNoticeSendMailPopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const [rows, setRows] = useState<SendMailRow[]>([])

  useEffect(() => {
    if (!visible) {
      return
    }

    setRows(buildRows(notices))
  }, [notices, visible])

  const updateRowEmail = useCallback((tbaoId: number, toEmail: string) => {
    setRows((current) => current.map((row) => (row.tbaoId === tbaoId ? { ...row, toEmail } : row)))
  }, [])

  const canSubmit = useMemo(
    () =>
      rows.length > 0 &&
      rows.every((row) => row.tbaoId > 0 && row.toEmail.trim() && isValidBuyerEmailList(row.toEmail)),
    [rows],
  )

  const handleConfirm = useCallback(() => {
    onConfirm({
      items: rows
        .filter((row) => row.tbaoId > 0)
        .map((row) => ({
          tbaoId: row.tbaoId,
          displayNo: row.displayNo,
          toEmail: normalizeBuyerEmailList(row.toEmail),
        })),
    })
  }, [onConfirm, rows])

  const isBatch = rows.length > 1

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      dragEnabled={false}
      hideOnOutsideClick={!loading}
      showCloseButton={!loading}
      width={isBatch ? 720 : 520}
      height="auto"
      maxHeight="min(680px, 92vh)"
      title={t("SEND_MAIL_TBAO_TITLE", "Gửi mail thông báo sai sót")}
      animation={POPUP_FADE_ANIMATION}
    >
      <ToolbarItem
        toolbar="bottom"
        location="after"
        widget="dxButton"
        options={{
          text: t("SEND_MAIL", "Gửi mail"),
          icon: "email",
          type: "default",
          stylingMode: "contained",
          disabled: loading || !canSubmit,
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

      <div className="flex max-h-[min(560px,78vh)] flex-col gap-4 p-1">
        <div className="shrink-0 text-xs text-slate-500">
          {t(
            "SEND_MAIL_MULTI_EMAIL_HINT",
            "Nhập nhiều email cách nhau bởi dấu chấm phẩy.",
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div>{t("SO", "Số thông báo")}</div>
              <div>{t("NMUA_DCTDTU", "Email")}</div>
            </div>

            {rows.map((row) => {
              const invalid = row.toEmail.trim().length > 0 && !isValidBuyerEmailList(row.toEmail)

              return (
                <div
                  key={row.tbaoId}
                  className="grid grid-cols-[160px_minmax(0,1fr)] gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0"
                >
                  <div className="pt-2 text-sm font-medium text-slate-800">{row.displayNo || "-"}</div>
                  <div>
                    <TextBox
                      value={row.toEmail}
                      onValueChanged={(event) => updateRowEmail(row.tbaoId, String(event.value ?? ""))}
                      disabled={loading}
                      placeholder={t("SEND_MAIL_EMAIL_PLACEHOLDER", "Nhập email người nhận")}
                    />
                    {invalid ? (
                      <div className="mt-1 text-xs text-red-600">
                        {t("INVALID_EMAIL", "Email is invalid")}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex shrink-0 items-center gap-2 text-sm text-slate-500">
            <i className="dx-icon-refresh animate-spin" />
            {t("SEND_MAIL_SENDING", "Sending email...")}
          </div>
        ) : null}
      </div>
    </Popup>
  )
}
