import { useMemo } from "react"
import Button from "devextreme-react/button"

import { useSysCodes } from "@/lib/sysCodeContext"
import type { EInvoiceErrorNotice } from "@/types/einvoiceErrorNotice"

import { truncateEInvoiceErrorMessage } from "../einvoiceModel"
import {
  buildEInvoiceMailStatusOptions,
  buildErrorNoticeSignStatusOptions,
  EINV_MAIL_STATUS_CODE_TYPE,
  EINV_SIGN_STATUS_CODE_TYPE,
  formatErrorNoticeMailStatusText,
  formatErrorNoticeSignedLabel,
  isErrorNoticeSigned,
} from "../einvoiceErrorNoticeModel"
import { EInvoiceStatusTag, getEInvoiceSignedTagTone } from "./einvoiceTableUi"

type EInvoiceErrorNoticeStatusCellProps = {
  data: EInvoiceErrorNotice | undefined
  t: (key: string, fallback: string) => string
  onShowTransmission: (row: EInvoiceErrorNotice) => void
}

/** Subscribes to SysCodeContext so DevExtreme cells refresh when codes load. */
export function EInvoiceErrorNoticeStatusCell({
  data,
  t,
  onShowTransmission,
}: EInvoiceErrorNoticeStatusCellProps) {
  const { getCodesByType } = useSysCodes()
  const signStatusOptions = useMemo(
    () => buildErrorNoticeSignStatusOptions(getCodesByType(EINV_SIGN_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const mailStatusOptions = useMemo(
    () => buildEInvoiceMailStatusOptions(getCodesByType(EINV_MAIL_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const signed = isErrorNoticeSigned(data)
  const signedLabel = formatErrorNoticeSignedLabel(data, signStatusOptions)
  const messageCode = typeof data?.MGDDTU === "string" ? data.MGDDTU.trim() : ""
  const errorMessage = typeof data?.ERROR_MESSAGE === "string" ? data.ERROR_MESSAGE.trim() : ""
  const mailSent = Number(data?.IS_MAIL ?? 0)

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="einvoice-table__status min-w-0">
        {signedLabel ? (
          <EInvoiceStatusTag label={signedLabel} tone={getEInvoiceSignedTagTone(signed)} />
        ) : null}
        {mailStatusOptions.length > 0 ? (
          <EInvoiceStatusTag
            label={formatErrorNoticeMailStatusText(mailSent, mailStatusOptions)}
            tone={mailSent === 1 ? "info" : "muted"}
          />
        ) : null}
        {messageCode ? <EInvoiceStatusTag label={messageCode} tone="muted" /> : null}
        {errorMessage ? (
          <EInvoiceStatusTag label={truncateEInvoiceErrorMessage(errorMessage)} tone="danger" />
        ) : null}
      </div>
      <Button
        icon="overflow"
        text="..."
        hint={t("DECL_TRANSMISSION_INFO", "Thông tin truyền nhận")}
        stylingMode="text"
        width={32}
        height={28}
        disabled={!data || Number(data.TBAO_ID ?? 0) <= 0}
        onClick={(event) => {
          event.event?.stopPropagation()
          if (data) {
            onShowTransmission(data)
          }
        }}
      />
    </div>
  )
}
