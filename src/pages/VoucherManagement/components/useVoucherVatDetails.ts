import { useCallback, useEffect, useRef, useState } from "react"
import notify from "devextreme/ui/notify"

import type { ChitDetail, ChitInfo } from "@/types/voucher"

import {
  applyVoucherVatAmountPatch,
  canDismissVoucherVatPanel,
  createEmptyVoucherVatDetail,
  detailAmountToVatNumber,
  hasAnyVoucherVatInput,
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
  t?: (key: string, fallback: string) => string
}

export type UseVoucherVatDetailsResult = {
  vatByRowKey: VoucherVatDetailsMap
  dirtyVatRowKeys: ReadonlySet<string>
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

function markDirty(current: Set<string>, key: string): Set<string> {
  if (current.has(key)) {
    return current
  }
  const next = new Set(current)
  next.add(key)
  return next
}

function amountsEqual(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) {
    return true
  }
  if (a == null || b == null) {
    return false
  }
  return a === b
}

export function useVoucherVatDetails({
  visible,
  voucherValue,
  details,
  t,
}: UseVoucherVatDetailsOptions): UseVoucherVatDetailsResult {
  const [vatByRowKey, setVatByRowKey] = useState<VoucherVatDetailsMap>({})
  const [dirtyVatRowKeys, setDirtyVatRowKeys] = useState<Set<string>>(() => new Set())
  const [activeVatRowKey, setActiveVatRowKey] = useState<string | null>(null)
  const prevVoucherValueRef = useRef<ChitInfo | null>(null)
  const prevDetailFcAmountsRef = useRef<Record<string, number | null>>({})
  const vatRowKeysRef = useRef<Set<string>>(new Set())
  const activeVatRowKeyRef = useRef<string | null>(null)
  const vatByRowKeyRef = useRef<VoucherVatDetailsMap>({})

  const translate = useCallback(
    (key: string, fallback: string) => (t ? t(key, fallback) : fallback),
    [t],
  )

  const tryDismissActiveVatPanel = useCallback((): boolean => {
    const key = activeVatRowKeyRef.current
    if (!key) {
      return true
    }
    const vat = vatByRowKeyRef.current[key] ?? createEmptyVoucherVatDetail()
    if (canDismissVoucherVatPanel(vat)) {
      return true
    }
    notify(
      translate("MSG_VAT_Not_Input", "Thông tin VAT chưa điền đầy đủ"),
      "warning",
      3000,
    )
    return false
  }, [translate])

  const resetVatState = useCallback(() => {
    setVatByRowKey({})
    setDirtyVatRowKeys(new Set())
    setActiveVatRowKey(null)
    prevDetailFcAmountsRef.current = {}
    vatRowKeysRef.current = new Set()
    vatByRowKeyRef.current = {}
    activeVatRowKeyRef.current = null
  }, [])

  useEffect(() => {
    vatRowKeysRef.current = new Set(Object.keys(vatByRowKey))
    vatByRowKeyRef.current = vatByRowKey
  }, [vatByRowKey])

  useEffect(() => {
    activeVatRowKeyRef.current = activeVatRowKey
  }, [activeVatRowKey])

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
    const seeded = seedVoucherVatDetailsMap(voucherValue.DETAILS)
    setVatByRowKey(seeded)
    setDirtyVatRowKeys(new Set())
    setActiveVatRowKey(null)

    const fcSnapshot: Record<string, number | null> = {}
    for (const detail of voucherValue.DETAILS) {
      const rowKey = typeof detail.ROW_KEY === "string" ? detail.ROW_KEY.trim() : ""
      if (!rowKey) {
        continue
      }
      fcSnapshot[rowKey] = detailAmountToVatNumber(detail.FC_AMOUNT)
    }
    prevDetailFcAmountsRef.current = fcSnapshot
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

  // When FC_AMOUNT changes on a detail row that has VAT (or open panel), mirror into VAT FC số tiền.
  useEffect(() => {
    if (!visible) {
      return
    }

    const prevFcAmounts = prevDetailFcAmountsRef.current
    const nextFcAmounts: Record<string, number | null> = {}
    const patches: Array<{ rowKey: string; fcAmount: number | null }> = []

    for (const detail of details) {
      if (detail.ISDEL) {
        continue
      }
      const rowKey = typeof detail.ROW_KEY === "string" ? detail.ROW_KEY.trim() : ""
      if (!rowKey) {
        continue
      }

      const fcAmount = detailAmountToVatNumber(detail.FC_AMOUNT)
      nextFcAmounts[rowKey] = fcAmount

      const previousFc = Object.prototype.hasOwnProperty.call(prevFcAmounts, rowKey)
        ? prevFcAmounts[rowKey]
        : undefined
      const fcChanged = previousFc === undefined || !amountsEqual(previousFc, fcAmount)
      if (!fcChanged) {
        continue
      }

      const shouldSync =
        rowKey === activeVatRowKeyRef.current || vatRowKeysRef.current.has(rowKey)
      if (!shouldSync) {
        continue
      }

      patches.push({ rowKey, fcAmount })
    }

    prevDetailFcAmountsRef.current = nextFcAmounts

    if (patches.length === 0) {
      return
    }

    setDirtyVatRowKeys((current) => {
      let next = current
      for (const item of patches) {
        next = markDirty(next, item.rowKey)
      }
      return next
    })

    setVatByRowKey((current) => {
      let next = current
      for (const item of patches) {
        const previous = next[item.rowKey] ?? createEmptyVoucherVatDetail()
        const merged = applyVoucherVatAmountPatch(previous, { fcAmount: item.fcAmount })
        if (!hasAnyVoucherVatInput(merged)) {
          if (!(item.rowKey in next)) {
            continue
          }
          if (next === current) {
            next = { ...current }
          }
          delete next[item.rowKey]
          continue
        }
        if (next === current) {
          next = { ...current }
        }
        next[item.rowKey] = merged
      }
      return next
    })
  }, [details, visible])

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

    const current = activeVatRowKeyRef.current
    if (current === key) {
      if (!tryDismissActiveVatPanel()) {
        return
      }
      setActiveVatRowKey(null)
      return
    }

    // Switching rows also dismisses the current panel — block if incomplete.
    if (current && !tryDismissActiveVatPanel()) {
      return
    }

    // Prefill FC số tiền from detail FC_AMOUNT when opening an empty/incomplete VAT draft.
    const detail = details.find((item) => !item.ISDEL && item.ROW_KEY === key)
    const fcAmount = detailAmountToVatNumber(detail?.FC_AMOUNT)

    setVatByRowKey((vatCurrent) => {
      const previous = vatCurrent[key] ?? createEmptyVoucherVatDetail()
      if (previous.fcAmount != null || fcAmount == null) {
        return vatCurrent
      }

      const merged = applyVoucherVatAmountPatch(previous, { fcAmount })
      if (!hasAnyVoucherVatInput(merged)) {
        return vatCurrent
      }

      setDirtyVatRowKeys((dirtyCurrent) => markDirty(dirtyCurrent, key))
      return { ...vatCurrent, [key]: merged }
    })

    setActiveVatRowKey(key)
  }, [details, tryDismissActiveVatPanel])

  const closeVatPanel = useCallback(() => {
    if (!tryDismissActiveVatPanel()) {
      return
    }
    setActiveVatRowKey(null)
  }, [tryDismissActiveVatPanel])

  const updateVatDetail = useCallback((rowKey: string, patch: Partial<VoucherVatDetail>) => {
    const key = rowKey.trim()
    if (!key) {
      return
    }

    setDirtyVatRowKeys((current) => markDirty(current, key))

    setVatByRowKey((current) => {
      const previous = current[key] ?? createEmptyVoucherVatDetail()
      const merged = applyVoucherVatAmountPatch(previous, patch)

      if (!hasAnyVoucherVatInput(merged)) {
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
    dirtyVatRowKeys,
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
