import { useCallback, useRef, useState } from "react"
import notify from "devextreme/ui/notify"

import { updateChit } from "@/api/voucherApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { useChitListInvalidate } from "@/hooks/queries/useChitListQuery"
import type { ChitInfo } from "@/types/voucher"
import { isPeriodLockVoucher, mapChitToApiPayload, normalizeChitRows } from "../chitUtils"
import { loadVoucherForDirectOpen } from "../voucherDirectOpen"
import type { AfterAccountingSave } from "../components/useRowInventoryEditor"

type Translate = (key: string, fallback: string) => string

export function useLinkedCogsVoucherPopup(t: Translate) {
  const invalidateChitLists = useChitListInvalidate()
  const [voucher, setVoucher] = useState<ChitInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const openInFlightRef = useRef(false)

  const open = useCallback((chitId: number): boolean => {
    if (!Number.isSafeInteger(chitId) || chitId <= 0) {
      return false
    }
    if (openInFlightRef.current || loading || voucher) {
      return true
    }

    openInFlightRef.current = true
    setLoading(true)
    void loadVoucherForDirectOpen("AR", "OT", chitId)
      .then((target) => {
        if (!target) {
          notify(t("SOURCE_VOUCHER_NOT_FOUND", "Không tìm thấy chứng từ nguồn"), "warning", 3000)
          return
        }
        setVoucher(target)
      })
      .catch((error: unknown) => {
        notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
      })
      .finally(() => {
        openInFlightRef.current = false
        setLoading(false)
      })

    return true
  }, [loading, t, voucher])

  const save = useCallback(async (record: ChitInfo, afterSave?: AfterAccountingSave) => {
    if (isPeriodLockVoucher(record)) {
      notify(t("PERIOD_LOCK_VOUCHER_READONLY", "Chứng từ khóa sổ tự động chỉ được xem, không thể sửa."), "warning", 3000)
      return
    }

    setLoading(true)
    let persistedVoucher: ChitInfo | null = null
    try {
      const result = await updateChit("AR", mapChitToApiPayload(record), "OT")
      const savedVoucher = normalizeChitRows(result.data ? [result.data] : [], "OT")[0]
      if (!savedVoucher) {
        throw new Error("Không nhận được phiếu giá vốn sau khi lưu")
      }
      savedVoucher.DETAILS = savedVoucher.DETAILS.map((detail) => ({
        ...detail,
        ROW_KEY: record.DETAILS.find((row) => Number(row.SORT) === Number(detail.SORT))?.ROW_KEY ?? detail.ROW_KEY,
      }))
      persistedVoucher = savedVoucher

      const keepEditorOpen = afterSave ? (await afterSave(savedVoucher, record)) === true : false
      await invalidateChitLists()
      notify(t("MSG_EDIT_SUCCESS", "Đã cập nhật thành công"), "success", 3000)
      setVoucher(keepEditorOpen ? savedVoucher : null)
    } catch (error) {
      if (persistedVoucher) {
        setVoucher(persistedVoucher)
      }
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3000)
    } finally {
      setLoading(false)
    }
  }, [invalidateChitLists, t])

  const close = useCallback((_inventoryId?: number): boolean => {
    if (loading) {
      return false
    }
    setVoucher(null)
    return true
  }, [loading])

  return { voucher, loading, open, save, close }
}
