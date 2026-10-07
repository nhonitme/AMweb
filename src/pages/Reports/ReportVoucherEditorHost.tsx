import { forwardRef, useCallback, useContext, useImperativeHandle, useMemo, useState } from "react"
import LoadPanel from "devextreme-react/load-panel"
import notify from "devextreme/ui/notify"

import { getApiErrorMessage } from "@/api/apiTypes"
import { updateChit } from "@/api/voucherApi"
import { LanguageContext } from "@/lib/i18nLoader"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import type { ChitInfo, ChitLedger, ChitType } from "@/types/voucher"
import ChitEditorPopup from "@/pages/VoucherManagement/components/ChitEditorPopup"
import {
  getChitTypeLabel,
  getVoucherRouteByChitType,
  isPeriodLockVoucher,
  mapChitToApiPayload,
} from "@/pages/VoucherManagement/chitUtils"
import { loadVoucherForDirectOpen } from "@/pages/VoucherManagement/voucherDirectOpen"
import { getVoucherPdfReportCode } from "@/pages/VoucherManagement/voucherPdfReportCodes"

const AR_CHIT_TYPES = new Set<ChitType>(["RC", "CN", "SO", "SD", "SR", "CO", "OT"])
const AP_CHIT_TYPES = new Set<ChitType>(["PM", "DN", "PO", "PS", "PD", "PR"])

export type ReportVoucherEditorHostHandle = {
  open: (ledger: ChitLedger, chitType: ChitType | null, chitId: number) => Promise<boolean>
}

type ReportVoucherEditorHostProps = {
  onSaved?: () => void | Promise<void>
}

export function resolveAccountingLedger(
  chitType: string | null | undefined,
  moduleCd?: string | null,
): { ledger: ChitLedger; chitType: ChitType | null } | null {
  const normalizedType = String(chitType ?? "").trim().toUpperCase() as ChitType
  const hasType = AR_CHIT_TYPES.has(normalizedType) || AP_CHIT_TYPES.has(normalizedType)
  const normalizedModule = String(moduleCd ?? "").trim().toUpperCase()
  const ledgerFromModule = normalizedModule === "AR" || normalizedModule === "AP" ? normalizedModule : null
  const ledgerFromType = hasType ? (AR_CHIT_TYPES.has(normalizedType) ? "AR" : "AP") : null
  const ledger = ledgerFromModule ?? ledgerFromType
  if (!ledger) {
    return null
  }

  return {
    ledger,
    chitType: hasType ? normalizedType : null,
  }
}

const LEDGER_CHIT_TYPES: Record<ChitLedger, ChitType[]> = {
  AR: ["RC", "CN", "SO", "SD", "SR", "CO", "OT"],
  AP: ["PO", "PM", "DN", "PS", "PD", "PR"],
}

async function loadAccountingVoucher(
  ledger: ChitLedger,
  chitType: ChitType | null,
  chitId: number,
): Promise<ChitInfo | null> {
  if (chitType) {
    return loadVoucherForDirectOpen(ledger, chitType, chitId)
  }

  for (const candidate of LEDGER_CHIT_TYPES[ledger]) {
    const targetRow = await loadVoucherForDirectOpen(ledger, candidate, chitId)
    if (targetRow) {
      return targetRow
    }
  }

  return null
}

export const ReportVoucherEditorHost = forwardRef<ReportVoucherEditorHostHandle, ReportVoucherEditorHostProps>(
  function ReportVoucherEditorHost({ onSaved }, ref) {
    const { translate } = useContext(LanguageContext) as {
      translate?: (key: string, fallback?: string) => string
    }
    const t = useCallback(
      (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
      [translate],
    )

    const [visible, setVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [ledger, setLedger] = useState<ChitLedger>("AR")
    const [chitType, setChitType] = useState<ChitType>("RC")
    const [editingRow, setEditingRow] = useState<ChitInfo | null>(null)
    const [editorReadOnly, setEditorReadOnly] = useState(false)

    const voucherLabel = useMemo(() => getChitTypeLabel(chitType, t), [chitType, t])
    const printReportCode = useMemo(() => getVoucherPdfReportCode(chitType), [chitType])
    const screenCd = useMemo(() => {
      const route = getVoucherRouteByChitType(chitType)
      return route ? buildAppPath(getCurrentCompanyCd(), route) : undefined
    }, [chitType])

    const open = useCallback(
      async (nextLedger: ChitLedger, nextChitType: ChitType | null, chitId: number): Promise<boolean> => {
        setLoading(true)
        try {
          const targetRow = await loadAccountingVoucher(nextLedger, nextChitType, chitId)
          if (!targetRow) {
            notify(t("SOURCE_VOUCHER_NOT_FOUND", "Không tìm thấy chứng từ nguồn"), "warning", 3000)
            return false
          }

          const resolvedType = (targetRow.CHIT_TYPE as ChitType | undefined) ?? nextChitType ?? "OT"
          setLedger(nextLedger)
          setChitType(resolvedType)
          setEditingRow(targetRow)
          setEditorReadOnly(isPeriodLockVoucher(targetRow))
          setVisible(true)
          return true
        } catch (error) {
          console.error("[ReportVoucherEditorHost] Open voucher failed", error)
          notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
          return false
        } finally {
          setLoading(false)
        }
      },
      [t],
    )

    useImperativeHandle(ref, () => ({ open }), [open])

    const handleClose = useCallback(() => {
      if (loading) {
        return
      }

      setVisible(false)
    }, [loading])

    const handleSave = useCallback(
      async (record: ChitInfo) => {
        if (isPeriodLockVoucher(record)) {
          notify(
            t("PERIOD_LOCK_VOUCHER_READONLY", "Chứng từ khóa sổ tự động chỉ được xem, không thể sửa."),
            "warning",
            3000,
          )
          return
        }

        setLoading(true)
        try {
          await updateChit(ledger, mapChitToApiPayload(record), chitType)
          notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000)
          setVisible(false)
          await onSaved?.()
        } catch (error) {
          console.error("[ReportVoucherEditorHost] Save voucher failed", error)
          notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 4000)
        } finally {
          setLoading(false)
        }
      },
      [chitType, ledger, onSaved, t],
    )

    return (
      <>
        <LoadPanel
          visible={loading && !visible}
          showIndicator={true}
          showPane={true}
          shading={true}
          shadingColor="rgba(0, 0, 0, 0.15)"
        />
        {visible && editingRow ? (
          <ChitEditorPopup
            visible={visible}
            value={editingRow}
            ledger={ledger}
            chitType={chitType}
            voucherLabel={voucherLabel}
            isUpdate={true}
            readOnly={editorReadOnly}
            loading={loading}
            screenCd={screenCd}
            printReportCode={printReportCode}
            onClose={handleClose}
            onSave={handleSave}
          />
        ) : null}
      </>
    )
  },
)
