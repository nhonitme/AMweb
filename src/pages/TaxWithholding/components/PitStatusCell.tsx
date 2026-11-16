import { useContext } from "react"
import DropDownButton from "devextreme-react/drop-down-button"
import type { PitDocument } from "../types"
import type { PitRowAction } from "../pitRowActions"
import { EInvoiceStatusTag } from "@/pages/EInvoice/components/einvoiceTableUi"
import { LanguageContext } from "@/lib/i18nLoader"

export default function PitStatusCell({ row, disabled = false, onAction }: {
  row: PitDocument
  disabled?: boolean
  onAction?: (row: PitDocument, action: PitRowAction) => void
}) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const unsignedHint = t("PIT_MAIL_SIGNED_REQUIRED", "Chỉ gửi mail chứng từ đã ký")
  const actionItems: { key: PitRowAction; text: string; icon: string; disabled?: boolean; hint?: string }[] = [
    { key: "transmission-history", text: t("DECL_TRANSMISSION_INFO", "Thông tin truyền nhận"), icon: "overflow" },
    { key: "send-mail", text: t("SEND_MAIL", "Gửi mail"), icon: "email", disabled: !row.IS_SIGNED, hint: !row.IS_SIGNED ? unsignedHint : undefined },
    { key: "mail-history", text: t("MAIL_HISTORY", "Lịch sử gửi mail"), icon: "clock" },
    { key: "print", text: t("PRINT", "In"), icon: "print" },
    { key: "download-xml", text: t("DOWNLOAD_XML", "Tải XML"), icon: "download" },
  ]

  return (
    <div className="flex items-start gap-1">
      <div className="einvoice-table__status einvoice-table__status--stacked min-w-0">
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
      {onAction ? <span onDoubleClick={(event) => event.stopPropagation()}><DropDownButton
        icon="overflow"
        hint={t("MORE_ACTIONS", "Thao tác")}
        stylingMode="text"
        width={28}
        height={26}
        showArrowIcon={false}
        items={actionItems}
        displayExpr="text"
        keyExpr="key"
        itemRender={(item: typeof actionItems[number]) => (
          <div className="flex items-center gap-2" title={item.hint}>
            <i className={`dx-icon dx-icon-${item.icon}`} />
            <span>{item.text}</span>
          </div>
        )}
        dropDownOptions={{ width: 220 }}
        disabled={disabled || row.DOCUMENT_ID <= 0}
        onButtonClick={(event) => event.event?.stopPropagation()}
        onItemClick={(event) => {
          event.event?.stopPropagation()
          const item = event.itemData as typeof actionItems[number]
          if (!item.disabled) onAction(row, item.key)
        }}
      /></span> : null}
    </div>
  )
}
