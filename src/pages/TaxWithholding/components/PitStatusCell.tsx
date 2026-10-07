import { useContext } from "react"
import type { PitDocument } from "../types"
import { EInvoiceStatusTag } from "@/pages/EInvoice/components/einvoiceTableUi"
import { LanguageContext } from "@/lib/i18nLoader"

export default function PitStatusCell({ row }: { row: PitDocument }) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  return (
    <div className="einvoice-table__status-stack">
      <EInvoiceStatusTag
        label={row.IS_SIGNED ? t("SIGNED", "Đã ký") : t("UNSIGNED", "Chưa ký")}
        tone={row.IS_SIGNED ? "ok" : "warn"}
      />
      {row.IS_SIGNED ? (
        row.CQT_STATUS === 2 ? (
          <EInvoiceStatusTag label={t("CQT_STATUS_ACCEPTED", "CQT chấp nhận")} tone="ok" />
        ) : row.CQT_STATUS === 3 ? (
          <EInvoiceStatusTag label={t("CQT_STATUS_REJECTED", "CQT không chấp nhận")} tone="danger" />
        ) : row.QUEUED ? (
          <EInvoiceStatusTag label={t("CQT_STATUS_WAITING", "Chờ phản hồi CQT")} tone="info" />
        ) : (
          <EInvoiceStatusTag label={t("MTT_WAIT_SEND", "Chờ gửi CQT")} tone="muted" />
        )
      ) : null}
      {row.ERROR_MESSAGE ? <EInvoiceStatusTag label={row.ERROR_MESSAGE} tone="danger" /> : null}
    </div>
  )
}
