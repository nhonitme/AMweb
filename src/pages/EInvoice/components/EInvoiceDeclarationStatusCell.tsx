import { useMemo } from "react"
import Button from "devextreme-react/button"

import { useSysCodes } from "@/lib/sysCodeContext"
import type { EInvoiceDeclaration } from "@/types/einvoiceDeclaration"

import {
  buildTkhaiCqtStatusOptions,
  EINV_TKHAI_CQT_STATUS_CODE_TYPE,
  formatDeclarationCqtStatusText,
  formatDeclarationSignedLabel,
  isDeclarationSigned,
} from "../einvoiceDeclarationModel"
import { EInvoiceStatusTag, getEInvoiceSignedTagTone } from "./einvoiceTableUi"

type EInvoiceDeclarationStatusCellProps = {
  data: EInvoiceDeclaration | undefined
  t: (key: string, fallback: string) => string
  onShowTransmission: (row: EInvoiceDeclaration) => void
}

/** Subscribes to SysCodeContext so DevExtreme cells refresh when codes load. */
export function EInvoiceDeclarationStatusCell({
  data,
  t,
  onShowTransmission,
}: EInvoiceDeclarationStatusCellProps) {
  const { getCodesByType } = useSysCodes()
  const cqtStatusOptions = useMemo(
    () => buildTkhaiCqtStatusOptions(getCodesByType(EINV_TKHAI_CQT_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const signed = isDeclarationSigned(data)
  const signedLabel = formatDeclarationSignedLabel(
    data,
    t("IS_SIGNED", "Signed"),
    t("SIGNED_NO", "Not signed"),
  )
  const cqtStatus = Number(data?.CQT_STATUS ?? 0)
  const statusLabel = formatDeclarationCqtStatusText(cqtStatus, cqtStatusOptions)
  const isStatusError = cqtStatus === 3 || cqtStatus === 4

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="einvoice-table__status min-w-0">
        <EInvoiceStatusTag label={signedLabel} tone={getEInvoiceSignedTagTone(signed)} />
        {statusLabel ? (
          <EInvoiceStatusTag label={statusLabel} tone={isStatusError ? "danger" : "muted"} />
        ) : null}
      </div>
      <Button
        icon="overflow"
        text="..."
        hint={t("DECL_TRANSMISSION_INFO", "Thông tin truyền nhận")}
        stylingMode="text"
        width={32}
        height={28}
        disabled={!data || Number(data.TKHAI_ID ?? 0) <= 0}
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
