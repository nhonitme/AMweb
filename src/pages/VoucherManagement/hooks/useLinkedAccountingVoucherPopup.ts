import { useCallback, useRef, useState } from "react"
import notify from "devextreme/ui/notify"

import { getApiErrorMessage } from "@/api/apiTypes"
import { updateChit } from "@/api/voucherApi"
import { useChitListInvalidate } from "@/hooks/queries/useChitListQuery"
import type { ChitInfo, ChitLedger, ChitType } from "@/types/voucher"
import { isPeriodLockVoucher, mapChitToApiPayload, normalizeChitRows } from "../chitUtils"
import { loadVoucherForDirectOpen } from "../voucherDirectOpen"
import type { AfterAccountingSave } from "../components/useRowInventoryEditor"

type Translate = (key: string, fallback: string) => string

interface LinkedVoucher {
  ledger: ChitLedger
  chitType: ChitType
  value: ChitInfo
}

export function useLinkedAccountingVoucherPopup(t: Translate) {
  const invalidateChitLists = useChitListInvalidate()
  const [linkedVoucher, setLinkedVoucher] = useState<LinkedVoucher | null>(null)
  const [loading, setLoading] = useState(false)
  const openInFlightRef = useRef(false)

  const open = useCallback((ledger: ChitLedger, chitType: ChitType, chitId: number): boolean => {
    if (!Number.isSafeInteger(chitId) || chitId <= 0) {
      return false
    }
    if (openInFlightRef.current || loading || linkedVoucher) {
      return true
    }

    openInFlightRef.current = true
    setLoading(true)
    void loadVoucherForDirectOpen(ledger, chitType, chitId)
      .then((target) => {
        if (!target) {
          notify(t("SOURCE_VOUCHER_NOT_FOUND", "Không tìm thấy chứng từ nguồn"), "warning", 3000)
          return
        }
        setLinkedVoucher({ ledger, chitType, value: target })
      })
      .catch((error: unknown) => {
        notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
      })
      .finally(() => {
        openInFlightRef.current = false
        setLoading(false)
      })

    return true
  }, [linkedVoucher, loading, t])

  const save = useCallback(async (record: ChitInfo, afterSave?: AfterAccountingSave) => {
    const current = linkedVoucher
    if (!current) return
    if (isPeriodLockVoucher(record)) {
      notify(t("PERIOD_LOCK_VOUCHER_READONLY", "Chứng từ khóa sổ tự động chỉ được xem, không thể sửa."), "warning", 3000)
      return
    }

    setLoading(true)
    let persistedVoucher: ChitInfo | null = null
    try {
      const result = await updateChit(current.ledger, mapChitToApiPayload(record), current.chitType)
      const savedVoucher = normalizeChitRows(result.data ? [result.data] : [], current.chitType)[0]
      if (!savedVoucher) {
        throw new Error("Không nhận được chứng từ sau khi lưu")
      }
      savedVoucher.DETAILS = savedVoucher.DETAILS.map((detail) => ({
        ...detail,
        ROW_KEY: record.DETAILS.find((row) => Number(row.SORT) === Number(detail.SORT))?.ROW_KEY ?? detail.ROW_KEY,
      }))
      persistedVoucher = savedVoucher

      const keepEditorOpen = afterSave ? (await afterSave(savedVoucher, record)) === true : false
      await invalidateChitLists()
      notify(t("MSG_EDIT_SUCCESS", "Đã cập nhật thành công"), "success", 3000)
      setLinkedVoucher(keepEditorOpen ? { ...current, value: savedVoucher } : null)
    } catch (error) {
      if (persistedVoucher) {
        setLinkedVoucher({ ...current, value: persistedVoucher })
      }
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3000)
    } finally {
      setLoading(false)
    }
  }, [invalidateChitLists, linkedVoucher, t])

  const close = useCallback((): boolean => {
    if (loading) return false
    setLinkedVoucher(null)
    return true
  }, [linkedVoucher, loading])

  return { voucher: linkedVoucher?.value ?? null, ledger: linkedVoucher?.ledger ?? null, chitType: linkedVoucher?.chitType ?? null, loading, open, save, close }
}
