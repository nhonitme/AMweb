import { useEffect, useMemo, useState } from "react"
import type { EInvoiceDecimalSetting, EInvoiceTemplateSetting } from "@/types/einvoiceSetting"

import { fetchEInvoiceDecimalDemoPreviewHtml } from "../einvoiceSellerPreviewViewer"

type TranslateFn = (key: string, fallback: string) => string

type EInvoiceDecimalDemoPreviewProps = {
  template: EInvoiceTemplateSetting | null
  /** True when settings are "cấu hình chung" and no active GTGT/sales template exists. */
  missingActiveTemplate: boolean
  currencyScope: "VND" | "FC"
  decimalSettings: EInvoiceDecimalSetting[]
  t: TranslateFn
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function positiveId(value: unknown): number {
  const numeric = Math.trunc(Number(value ?? 0))
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

function buildSettingsSignature(settings: EInvoiceDecimalSetting[]): string {
  return settings
    .map(
      (row) =>
        `${row.SETTING_ID}:${row.FIELD_NAME}:${row.CURRENCY_SCOPE}:${row.DECIMAL_SCALE}:${row.ROUND_MODE}:${row.IS_ACTIVE}`,
    )
    .join("|")
}

export default function EInvoiceDecimalDemoPreview({
  template,
  missingActiveTemplate,
  currencyScope,
  decimalSettings,
  t,
}: EInvoiceDecimalDemoPreviewProps) {
  const [previewHtml, setPreviewHtml] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const sellerId = positiveId(template?.SELLER_ID)
  const xslId = positiveId(template?.XSL_ID)
  const currencyCode = currencyScope === "FC" ? "USD" : "VND"
  const settingsSignature = useMemo(() => buildSettingsSignature(decimalSettings), [decimalSettings])

  const templateTitle = useMemo(() => {
    if (!template) {
      return t("DECIMAL_COMMON_CONFIG", "Cấu hình chung")
    }

    const identity = [normalizeText(template.KHMSHDON), normalizeText(template.KHHDON)].filter(Boolean).join(" / ")
    return identity || normalizeText(template.XSL_TEMPLATE_NM) || t("INVOICE_TEMPLATE_SETTING", "Mẫu hóa đơn")
  }, [t, template])

  useEffect(() => {
    let cancelled = false
    let timerId = 0

    if (missingActiveTemplate || !template || sellerId <= 0 || xslId <= 0) {
      setPreviewHtml("")
      setLoading(false)
      setError("")
      return
    }

    setLoading(true)
    setError("")

    timerId = window.setTimeout(() => {
      void fetchEInvoiceDecimalDemoPreviewHtml(sellerId, {
        xslId,
        currencyCode,
        decimalSettings: decimalSettings.map((row) => ({ ...row, IS_ACTIVE: 1 })),
      })
        .then((html) => {
          if (cancelled) {
            return
          }

          if (!html.trim()) {
            setPreviewHtml("")
            setError(t("DECIMAL_PREVIEW_EMPTY", "Không tải được bản xem trước mẫu hóa đơn."))
            return
          }

          setPreviewHtml(html)
        })
        .catch((fetchError) => {
          if (cancelled) {
            return
          }

          setPreviewHtml("")
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : t("DECIMAL_PREVIEW_EMPTY", "Không tải được bản xem trước mẫu hóa đơn."),
          )
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
          }
        })
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(timerId)
    }
  }, [currencyCode, decimalSettings, missingActiveTemplate, sellerId, settingsSignature, t, template, xslId])

  if (missingActiveTemplate || !template) {
    return (
      <div className="einvoice-decimal-demo einvoice-decimal-demo--empty">
        <div className="einvoice-decimal-demo__empty-card">
          <div className="einvoice-decimal-demo__title">
            {t("DECIMAL_NO_ACTIVE_TEMPLATE_TITLE", "Chưa có mẫu hóa đơn")}
          </div>
          <p className="einvoice-decimal-demo__empty-text">
            {t(
              "DECIMAL_NO_ACTIVE_TEMPLATE",
              "Chưa có mẫu hóa đơn GTGT hoặc bán hàng đang phát hành để xem demo. Hãy phát hành một mẫu ở tab Mẫu hóa đơn.",
            )}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="einvoice-decimal-demo">
      <div className="einvoice-decimal-demo__header">
        <div className="min-w-0 flex-1">
          <div className="einvoice-decimal-demo__title">{templateTitle}</div>
          <div className="einvoice-decimal-demo__meta">
            {normalizeText(template.SELLER_NM) || t("DEMO_SELLER", "Người bán")}
            {" · "}
            {currencyCode}
          </div>
        </div>
      </div>

      <div className="einvoice-decimal-demo__frame-wrap">
        {loading ? (
          <div className="einvoice-decimal-demo__status">
            {t("DECIMAL_PREVIEW_LOADING", "Đang tải mẫu hóa đơn...")}
          </div>
        ) : null}
        {!loading && error ? (
          <div className="einvoice-decimal-demo__status einvoice-decimal-demo__status--error">
            {error}
          </div>
        ) : null}
        {!loading && !error && previewHtml ? (
          <iframe
            title={t("DECIMAL_DEMO_TITLE", "Demo mẫu hóa đơn")}
            srcDoc={previewHtml}
            className="einvoice-decimal-demo__iframe"
          />
        ) : null}
      </div>
    </div>
  )
}
