import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import TextBox from "devextreme-react/text-box"

import { getEInvoice } from "@/api/einvoiceApi"
import { LanguageContext } from "@/lib/i18nLoader"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { EInvoiceMinute } from "@/types/einvoiceMinute"
import { isValidBuyerEmailList, normalizeBuyerEmailList } from "../einvoiceModel"
import { formatMinuteDisplayNo } from "../einvoiceMinuteModel"

export type EInvoiceMinuteSendMailItem = {
  bbanId: number
  sbban: string
  toEmail: string
}

export type EInvoiceMinuteSendMailRequest = {
  items: EInvoiceMinuteSendMailItem[]
}

type SendMailRow = {
  bbanId: number
  sbban: string
  toEmail: string
}

type EInvoiceMinuteSendMailPopupProps = {
  visible: boolean
  minutes: EInvoiceMinute[]
  loading?: boolean
  onClose: () => void
  onConfirm: (request: EInvoiceMinuteSendMailRequest) => void
}

function buildRows(minutes: EInvoiceMinute[]): SendMailRow[] {
  return minutes.map((minute) => ({
    bbanId: Number(minute.BBAN_ID ?? 0),
    sbban: formatMinuteDisplayNo(minute) || String(minute.SBBAN ?? "").trim(),
    toEmail: "",
  }))
}

async function resolveBuyerEmail(minute: EInvoiceMinute): Promise<string> {
  const refInvoiceId = Number(minute.REF_INVOICE_ID ?? minute.INVOICE_ID ?? 0)
  if (!Number.isFinite(refInvoiceId) || refInvoiceId <= 0) {
    return ""
  }

  try {
    const response = await getEInvoice(refInvoiceId)
    return String(response.data?.NMUA_DCTDTU ?? "").trim()
  } catch {
    return ""
  }
}

export default function EInvoiceMinuteSendMailPopup({
  visible,
  minutes,
  loading = false,
  onClose,
  onConfirm,
}: EInvoiceMinuteSendMailPopupProps) {
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

    let cancelled = false
    const initialRows = buildRows(minutes)
    setRows(initialRows)

    void (async () => {
      const enrichedRows = await Promise.all(
        minutes.map(async (minute, index) => {
          const toEmail = await resolveBuyerEmail(minute)
          return {
            ...initialRows[index],
            toEmail,
          }
        }),
      )

      if (!cancelled) {
        setRows(enrichedRows)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [minutes, visible])

  const updateRowEmail = useCallback((bbanId: number, toEmail: string) => {
    setRows((current) => current.map((row) => (row.bbanId === bbanId ? { ...row, toEmail } : row)))
  }, [])

  const canSubmit = useMemo(
    () =>
      rows.length > 0 &&
      rows.every((row) => row.bbanId > 0 && row.toEmail.trim() && isValidBuyerEmailList(row.toEmail)),
    [rows],
  )

  const handleConfirm = useCallback(() => {
    onConfirm({
      items: rows
        .filter((row) => row.bbanId > 0)
        .map((row) => ({
          bbanId: row.bbanId,
          sbban: row.sbban,
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
      title={t("SEND_MAIL_BBAN_TITLE", "Gửi mail biên bản")}
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
            <div className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div>{t("SBBAN", "Số biên bản")}</div>
              <div>{t("NMUA_DCTDTU", "Email")}</div>
            </div>

            {rows.map((row) => {
              const invalid = row.toEmail.trim().length > 0 && !isValidBuyerEmailList(row.toEmail)

              return (
                <div
                  key={row.bbanId}
                  className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0"
                >
                  <div className="pt-2 text-sm font-medium text-slate-800">{row.sbban || "-"}</div>
                  <div>
                    <TextBox
                      value={row.toEmail}
                      onValueChanged={(event) => updateRowEmail(row.bbanId, String(event.value ?? ""))}
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
