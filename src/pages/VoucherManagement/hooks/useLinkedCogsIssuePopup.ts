import { useCallback, useRef, useState } from "react"
import notify from "devextreme/ui/notify"

import { updateInventoryVoucher } from "@/api/inventoryVoucherApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { useInventoryVoucherListInvalidate } from "@/hooks/queries/useInventoryVoucherListQuery"
import { getCurrentCompanyCd } from "@/lib/login"
import type { InventoryVoucher } from "@/types/voucher"
import { mapInventoryVoucherToApiPayload, normalizeInventoryVoucherApi } from "@/pages/Inventory/inventoryVoucherModel"
import { loadInventoryVoucherForDirectOpen } from "../voucherDirectOpen"

type Translate = (key: string, fallback: string) => string

export function useLinkedCogsIssuePopup(t: Translate) {
  const invalidateInventoryLists = useInventoryVoucherListInvalidate()
  const [voucher, setVoucher] = useState<InventoryVoucher | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const openInFlightRef = useRef(false)

  const open = useCallback((inventoryId: number): boolean => {
    if (!Number.isSafeInteger(inventoryId) || inventoryId <= 0) return false
    if (openInFlightRef.current || loading || voucher) return true

    openInFlightRef.current = true
    setLoading(true)
    void loadInventoryVoucherForDirectOpen("AR", "IO", inventoryId)
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

  const save = useCallback(async (record: InventoryVoucher) => {
    setLoading(true)
    try {
      const response = await updateInventoryVoucher("AR", "IO", mapInventoryVoucherToApiPayload(record))
      const saved = normalizeInventoryVoucherApi(response.data, "IO", getCurrentCompanyCd())
      await invalidateInventoryLists()
      setVoucher(saved)
      setRefreshVersion(version => version + 1)
      notify(t("MSG_EDIT_SUCCESS", "Đã cập nhật thành công"), "success", 3000)
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3000)
    } finally {
      setLoading(false)
    }
  }, [invalidateInventoryLists, t])

  const close = useCallback((): boolean => {
    if (loading) return false
    setVoucher(null)
    return true
  }, [loading])

  return { voucher, loading, open, save, close, refreshVersion }
}
