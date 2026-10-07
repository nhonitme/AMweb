import { useMemo } from "react"

import { useSysCodes } from "@/lib/sysCodeContext"
import type { EInvoice } from "@/types/einvoice"

import {
  buildInvoiceStatusOptions,
  EINV_INVOICE_STATUS_CODE_TYPE,
  formatEInvoiceInvoiceStatusText,
  formatEInvoiceSignedLabel,
  isEInvoiceSigned,
} from "../einvoiceModel"
import { EInvoiceStatusTag, getEInvoiceInvoiceStatusTagTone, getEInvoiceSignedTagTone } from "./einvoiceTableUi"

type EInvoiceListStatusCellProps = {
  data: EInvoice | undefined
  t: (key: string, fallback: string) => string
}

/** Subscribes to SysCodeContext so picker/list grids refresh labels when codes load. */
export function EInvoiceListStatusCell({ data, t }: EInvoiceListStatusCellProps) {
  const { getCodesByType } = useSysCodes()
  const invoiceStatusOptions = useMemo(
    () => buildInvoiceStatusOptions(getCodesByType(EINV_INVOICE_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const signed = isEInvoiceSigned(data)
  const signedLabel = formatEInvoiceSignedLabel(
    data,
    t("IS_SIGNED", "Đã ký"),
    t("SIGNED_NO", "Chưa ký"),
  )
  const statusRaw = Number(data?.INVOICE_STATUS ?? 0)
  const statusLabel = formatEInvoiceInvoiceStatusText(statusRaw, invoiceStatusOptions)

  return (
    <div className="einvoice-table__status einvoice-table__status--stacked">
      <EInvoiceStatusTag label={signedLabel} tone={getEInvoiceSignedTagTone(signed)} />
      {statusLabel ? (
        <EInvoiceStatusTag label={statusLabel} tone={getEInvoiceInvoiceStatusTagTone(statusRaw)} />
      ) : null}
    </div>
  )
}
