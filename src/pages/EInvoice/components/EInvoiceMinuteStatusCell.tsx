import { useMemo } from "react"

import { useSysCodes } from "@/lib/sysCodeContext"
import type { EInvoiceMinute } from "@/types/einvoiceMinute"

import {
  buildEInvoiceMailStatusOptions,
  buildMinuteSignStatusOptions,
  buildMinuteTypeOptions,
  EINV_BBAN_TYPE_CODE_TYPE,
  EINV_MAIL_STATUS_CODE_TYPE,
  EINV_SIGN_STATUS_CODE_TYPE,
  formatMinuteBuyerSignStatusText,
  formatMinuteMailStatusText,
  formatMinuteStatusText,
  formatMinuteTypeText,
} from "../einvoiceMinuteModel"
import { EInvoiceStatusTag, getEInvoiceSignedTagTone } from "./einvoiceTableUi"

type EInvoiceMinuteStatusCellProps = {
  data: EInvoiceMinute | undefined
  t: (key: string, fallback: string) => string
}

/** Subscribes to SysCodeContext so DevExtreme cells refresh when codes load. */
export function EInvoiceMinuteStatusCell({ data, t }: EInvoiceMinuteStatusCellProps) {
  const { getCodesByType } = useSysCodes()
  const minuteTypeOptions = useMemo(
    () => buildMinuteTypeOptions(getCodesByType(EINV_BBAN_TYPE_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const minuteSignStatusOptions = useMemo(
    () => buildMinuteSignStatusOptions(getCodesByType(EINV_SIGN_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const minuteMailStatusOptions = useMemo(
    () => buildEInvoiceMailStatusOptions(getCodesByType(EINV_MAIL_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const typeLabel = formatMinuteTypeText(Number(data?.TCHDON ?? 0), minuteTypeOptions)
  const sellerSigned = Number(data?.IS_SIGNED ?? 0) === 1
  const buyerSigned = Number(data?.NMUA_IS_SIGNED ?? 0) === 1
  const mailSent = Number(data?.IS_MAIL ?? 0)
  const sellerLabel = formatMinuteStatusText(Number(data?.IS_SIGNED ?? 0), minuteSignStatusOptions)
  const buyerLabel = formatMinuteBuyerSignStatusText(Number(data?.NMUA_IS_SIGNED ?? 0), minuteSignStatusOptions)
  const mailLabel = formatMinuteMailStatusText(mailSent, minuteMailStatusOptions)

  return (
    <div className="einvoice-table__status">
      {typeLabel ? <EInvoiceStatusTag label={typeLabel} tone="info" /> : null}
      {sellerLabel ? (
        <EInvoiceStatusTag label={sellerLabel} tone={getEInvoiceSignedTagTone(sellerSigned)} />
      ) : null}
      {buyerLabel ? (
        <EInvoiceStatusTag label={buyerLabel} tone={getEInvoiceSignedTagTone(buyerSigned)} />
      ) : null}
      {mailLabel ? (
        <EInvoiceStatusTag label={mailLabel} tone={mailSent === 1 ? "info" : "muted"} />
      ) : null}
    </div>
  )
}
