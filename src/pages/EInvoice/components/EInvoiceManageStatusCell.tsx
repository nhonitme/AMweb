import { useCallback, useMemo } from "react"
import DropDownButton from "devextreme-react/drop-down-button"

import { useSysCodes } from "@/lib/sysCodeContext"
import type { EInvoice } from "@/types/einvoice"

import {
  buildEInvoiceMailStatusOptions,
  buildEInvoiceTchdonOptions,
  buildInvoiceStatusOptions,
  EINV_INVOICE_STATUS_CODE_TYPE,
  EINV_MAIL_STATUS_CODE_TYPE,
  EINV_TCHDON_CODE_TYPE,
  formatEInvoiceInvoiceStatusText,
  formatEInvoiceMailStatusText,
  formatEInvoiceSignedLabel,
  formatEInvoiceTchdonStatusText,
  isEInvoiceSigned,
} from "../einvoiceModel"
import {
  EInvoiceStatusTag,
  getEInvoiceInvoiceStatusTagTone,
  getEInvoiceMailTagTone,
  getEInvoiceSignedTagTone,
} from "./einvoiceTableUi"

type EInvoiceManageStatusCellProps = {
  data: EInvoice | undefined
  t: (key: string, fallback: string) => string
  onAction: (row: EInvoice | undefined, actionKey: string | undefined) => void
}

/**
 * Status cell as a real React subscriber of SysCodeContext.
 * DevExtreme cellRender closures stay stale after first paint; this component
 * re-renders when sys-codes arrive so labels are not stuck as "" / raw codes.
 */
export function EInvoiceManageStatusCell({ data, t, onAction }: EInvoiceManageStatusCellProps) {
  const { getCodesByType } = useSysCodes()

  const invoiceStatusOptions = useMemo(
    () => buildInvoiceStatusOptions(getCodesByType(EINV_INVOICE_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const tchdonOptions = useMemo(
    () => buildEInvoiceTchdonOptions(getCodesByType(EINV_TCHDON_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const mailStatusOptions = useMemo(
    () => buildEInvoiceMailStatusOptions(getCodesByType(EINV_MAIL_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const signed = isEInvoiceSigned(data)
  const signedLabel = formatEInvoiceSignedLabel(
    data,
    t("IS_SIGNED", "Đã ký"),
    t("SIGNED_NO", "Chưa ký"),
  )
  const statusRaw = Number(data?.INVOICE_STATUS ?? 0)
  const tchdonRaw = Number(data?.TCHDON ?? 0)
  const mailRaw = Number(data?.MAIL_STATUS ?? 0)
  const statusLabel = formatEInvoiceInvoiceStatusText(statusRaw, invoiceStatusOptions)
  const tchdonLabel = formatEInvoiceTchdonStatusText(tchdonRaw, tchdonOptions)
  const mailStatusLabel = signed ? formatEInvoiceMailStatusText(mailRaw, mailStatusOptions) : ""

  const actionItems = signed
    ? [
        { key: "edit-mail", text: t("EDIT_MAIL", "Sửa mail"), icon: "email" },
        { key: "mail-history", text: t("MAIL_HISTORY", "Lịch sử gửi mail"), icon: "clock" },
        { key: "transmission-history", text: t("DECL_TRANSMISSION_INFO", "Thông tin truyền nhận"), icon: "overflow" },
      ]
    : []

  const handleItemClick = useCallback(
    (event: { event?: { stopPropagation?: () => void }; itemData?: { key?: string } }) => {
      event.event?.stopPropagation?.()
      onAction(data, event.itemData?.key)
    },
    [data, onAction],
  )

  return (
    <div className="flex items-start gap-1">
      <div className="einvoice-table__status einvoice-table__status--stacked min-w-0">
        <EInvoiceStatusTag label={signedLabel} tone={getEInvoiceSignedTagTone(signed)} />
        {statusLabel ? (
          <EInvoiceStatusTag label={statusLabel} tone={getEInvoiceInvoiceStatusTagTone(statusRaw)} />
        ) : null}
        {tchdonLabel ? <EInvoiceStatusTag label={tchdonLabel} tone="info" /> : null}
        {mailStatusLabel ? (
          <EInvoiceStatusTag label={mailStatusLabel} tone={getEInvoiceMailTagTone(mailRaw)} />
        ) : null}
      </div>
      {actionItems.length > 0 ? (
        <DropDownButton
          icon="overflow"
          hint={t("MORE_ACTIONS", "Thao tác")}
          stylingMode="text"
          width={28}
          height={26}
          showArrowIcon={false}
          items={actionItems}
          displayExpr="text"
          keyExpr="key"
          dropDownOptions={{ width: 220 }}
          disabled={!data || Number(data.INVOICE_ID ?? 0) <= 0}
          onButtonClick={(event) => {
            event.event?.stopPropagation()
          }}
          onItemClick={handleItemClick}
        />
      ) : null}
    </div>
  )
}
