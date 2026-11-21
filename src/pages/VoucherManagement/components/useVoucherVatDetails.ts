import { useCallback, useEffect, useRef, useState } from "react"

import type { ChitDetail, ChitInfo } from "@/types/voucher"

import {
  computeVoucherVatTotal,
  createEmptyVoucherVatDetail,
  hasMeaningfulVoucherVatData,
  seedVoucherVatDetailsMap,
  type VoucherVatDetail,
  type VoucherVatDetailsMap,
} from "./voucherVatTypes"

export type UseVoucherVatDetailsOptions = {
  visible: boolean
  /** Same voucher `value` object identity used by ChitEditorPopup sync. */
  voucherValue: ChitInfo
  details: readonly ChitDetail[]
}

export type UseVoucherVatDetailsResult = {
  vatByRowKey: VoucherVatDetailsMap
  activeVatRowKey: string | null
  isVatPanelOpen: boolean
  hasVatData: (rowKey: string | null | undefined) => boolean
  isVatActive: (rowKey: string | null | undefined) => boolean
  getVatDetail: (rowKey: string | null | undefined) => VoucherVatDetail
  toggleVatPanel: (rowKey: string) => void
  closeVatPanel: () => void
  updateVatDetail: (rowKey: string, patch: Partial<VoucherVatDetail>) => void
  resetVatState: () => void
}

export function useVoucherVatDetails({
  visible,
  voucherValue,
  details,
}: UseVoucherVatDetailsOptions): UseVoucherVatDetailsResult {
  const [vatByRowKey, setVatByRowKey] = useState<VoucherVatDetailsMap>({})
  const [activeVatRowKey, setActiveVatRowKey] = useState<string | null>(null)
  const prevVoucherValueRef = useRef<ChitInfo | null>(null)

  const resetVatState = useCallback(() => {
    setVatByRowKey({})
    setActiveVatRowKey(null)
  }, [])

  useEffect(() => {
    if (!visible) {
      resetVatState()
      prevVoucherValueRef.current = null
      return
    }

    if (prevVoucherValueRef.current === voucherValue) {
      return
    }

    prevVoucherValueRef.current = voucherValue
    setVatByRowKey(seedVoucherVatDetailsMap(voucherValue.DETAILS))
    setActiveVatRowKey(null)
  }, [resetVatState, visible, voucherValue])

  // Close panel if the active detail row was soft-deleted / removed.
  useEffect(() => {
    if (!activeVatRowKey) {
      return
    }
    const stillExists = details.some(
      (detail) => !detail.ISDEL && detail.ROW_KEY === activeVatRowKey,
    )
    if (!stillExists) {
      setActiveVatRowKey(null)
    }
  }, [activeVatRowKey, details])

  const hasVatData = useCallback(
    (rowKey: string | null | undefined) =>
      Boolean(rowKey && hasMeaningfulVoucherVatData(vatByRowKey[rowKey])),
    [vatByRowKey],
  )

  const isVatActive = useCallback(
    (rowKey: string | null | undefined) => Boolean(rowKey && activeVatRowKey === rowKey),
    [activeVatRowKey],
  )

  const getVatDetail = useCallback(
    (rowKey: string | null | undefined): VoucherVatDetail => {
      if (!rowKey) {
        return createEmptyVoucherVatDetail()
      }
      return vatByRowKey[rowKey] ?? createEmptyVoucherVatDetail()
    },
    [vatByRowKey],
  )

  const toggleVatPanel = useCallback((rowKey: string) => {
    const key = rowKey.trim()
    if (!key) {
      return
    }
    setActiveVatRowKey((current) => (current === key ? null : key))
  }, [])

  const closeVatPanel = useCallback(() => {
    setActiveVatRowKey(null)
  }, [])

  const updateVatDetail = useCallback((rowKey: string, patch: Partial<VoucherVatDetail>) => {
    const key = rowKey.trim()
    if (!key) {
      return
    }

    setVatByRowKey((current) => {
      const previous = current[key] ?? createEmptyVoucherVatDetail()
      const merged: VoucherVatDetail = { ...previous, ...patch }

      const goodsChanged = Object.prototype.hasOwnProperty.call(patch, "goodsAmount")
      const taxChanged = Object.prototype.hasOwnProperty.call(patch, "taxAmount")
      const totalExplicit = Object.prototype.hasOwnProperty.call(patch, "totalAmount")
      if ((goodsChanged || taxChanged) && !totalExplicit) {
        merged.totalAmount = computeVoucherVatTotal(merged.goodsAmount, merged.taxAmount)
      }

      if (!hasMeaningfulVoucherVatData(merged)) {
        if (!(key in current)) {
          return current
        }
        const next = { ...current }
        delete next[key]
        return next
      }

      return { ...current, [key]: merged }
    })
  }, [])

  return {
    vatByRowKey,
    activeVatRowKey,
    isVatPanelOpen: Boolean(activeVatRowKey),
    hasVatData,
    isVatActive,
    getVatDetail,
    toggleVatPanel,
    closeVatPanel,
    updateVatDetail,
    resetVatState,
  }
}
