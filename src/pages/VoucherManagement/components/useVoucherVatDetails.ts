import { useCallback, useEffect, useRef, useState } from "react"
import notify from "devextreme/ui/notify"

import type { ChitDetail, ChitInfo } from "@/types/voucher"

import {
  applyLocalVatToDetails,
  applyVoucherVatAmountPatch,
  canDismissVoucherVatPanel,
  createEmptyVoucherVatDetail,
  detailAmountToVatNumber,
  hasAnyVoucherVatInput,
  hasMeaningfulVoucherVatData,
  seedVoucherVatDetailFromChitDetail,
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
  /**
   * Persist one row's VAT draft onto voucher DETAILS (close panel / switch row).
   * Same gate as dismiss: only called after Ngày HĐ + số HĐ check passes.
   */
  onCommitVatRow?: (rowKey: string, nextDetails: ChitDetail[]) => void
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

type VatPartnerSnapshot = {
  sellerName: string
  taxCode: string
}

function trimPartnerText(value: unknown): string {
  if (value == null) {
    return ""
  }
  return String(value).trim()
}

function readVatPartnerSnapshot(detail: ChitDetail): VatPartnerSnapshot {
  return {
    sellerName: trimPartnerText(detail.VAT_COMPANY_ISSUE),
    taxCode: trimPartnerText(detail.VAT_COMPANY_TAXCD),
  }
}

function vatPartnersEqual(a: VatPartnerSnapshot | undefined, b: VatPartnerSnapshot): boolean {
  if (!a) {
    return false
  }
  return a.sellerName === b.sellerName && a.taxCode === b.taxCode
}

export function useVoucherVatDetails({
  visible,
  voucherValue,
  details,
  t,
  onCommitVatRow,
}: UseVoucherVatDetailsOptions): UseVoucherVatDetailsResult {
  const [vatByRowKey, setVatByRowKey] = useState<VoucherVatDetailsMap>({})
  const [dirtyVatRowKeys, setDirtyVatRowKeys] = useState<Set<string>>(() => new Set())
  const [activeVatRowKey, setActiveVatRowKey] = useState<string | null>(null)
  const prevVoucherValueRef = useRef<ChitInfo | null>(null)
  const prevDetailFcAmountsRef = useRef<Record<string, number | null>>({})
  const prevDetailVatPartnersRef = useRef<Record<string, VatPartnerSnapshot>>({})
  const vatRowKeysRef = useRef<Set<string>>(new Set())
  const activeVatRowKeyRef = useRef<string | null>(null)
  const vatByRowKeyRef = useRef<VoucherVatDetailsMap>({})
  const dirtyVatRowKeysRef = useRef<Set<string>>(new Set())
  const detailsRef = useRef(details)
  const onCommitVatRowRef = useRef(onCommitVatRow)

  const translate = useCallback(
    (key: string, fallback: string) => (t ? t(key, fallback) : fallback),
    [t],
  )

  useEffect(() => {
    detailsRef.current = details
  }, [details])

  useEffect(() => {
    onCommitVatRowRef.current = onCommitVatRow
  }, [onCommitVatRow])

  const commitVatRowDraft = useCallback((rowKey: string) => {
    const key = rowKey.trim()
    if (!key) {
      return
    }

    const isDirty = dirtyVatRowKeysRef.current.has(key)
    if (!isDirty) {
      return
    }

    const vat = vatByRowKeyRef.current[key]
    const vatMap: VoucherVatDetailsMap =
      vat && hasMeaningfulVoucherVatData(vat) ? { [key]: vat } : {}
    const nextDetails = applyLocalVatToDetails(
      detailsRef.current,
      vatMap,
      new Set([key]),
    )
    onCommitVatRowRef.current?.(key, nextDetails)
  }, [])

  const tryDismissActiveVatPanel = useCallback((): boolean => {
    const key = activeVatRowKeyRef.current
    if (!key) {
      return true
    }
    const vat = vatByRowKeyRef.current[key] ?? createEmptyVoucherVatDetail()
    if (!canDismissVoucherVatPanel(vat)) {
      notify(
        translate("MSG_VAT_Not_Input", "Thông tin VAT chưa điền đầy đủ"),
        "warning",
        3000,
      )
      return false
    }

    // Same as closing the panel: accept draft into DETAIL rows when dismiss is allowed.
    commitVatRowDraft(key)
    return true
  }, [commitVatRowDraft, translate])

  const resetVatState = useCallback(() => {
    setVatByRowKey({})
    setDirtyVatRowKeys(new Set())
    setActiveVatRowKey(null)
    prevDetailFcAmountsRef.current = {}
    prevDetailVatPartnersRef.current = {}
    vatRowKeysRef.current = new Set()
    vatByRowKeyRef.current = {}
    dirtyVatRowKeysRef.current = new Set()
    activeVatRowKeyRef.current = null
  }, [])

  useEffect(() => {
    vatRowKeysRef.current = new Set(Object.keys(vatByRowKey))
    vatByRowKeyRef.current = vatByRowKey
  }, [vatByRowKey])

  useEffect(() => {
    dirtyVatRowKeysRef.current = dirtyVatRowKeys
  }, [dirtyVatRowKeys])

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

    // Keep in-progress / committed dirty drafts when parent recreates `value` identity.
    setVatByRowKey((current) => {
      const dirty = dirtyVatRowKeysRef.current
      if (dirty.size === 0) {
        return seeded
      }
      const merged: VoucherVatDetailsMap = { ...seeded }
      for (const key of dirty) {
        if (Object.prototype.hasOwnProperty.call(current, key)) {
          merged[key] = current[key]
        } else {
          delete merged[key]
        }
      }
      return merged
    })
    setActiveVatRowKey(null)

    const fcSnapshot: Record<string, number | null> = {}
    const partnerSnapshot: Record<string, VatPartnerSnapshot> = {}
    for (const detail of voucherValue.DETAILS) {
      const rowKey = typeof detail.ROW_KEY === "string" ? detail.ROW_KEY.trim() : ""
      if (!rowKey) {
        continue
      }
      fcSnapshot[rowKey] = detailAmountToVatNumber(detail.FC_AMOUNT)
      partnerSnapshot[rowKey] = readVatPartnerSnapshot(detail)
    }
    prevDetailFcAmountsRef.current = fcSnapshot
    prevDetailVatPartnersRef.current = partnerSnapshot
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

  // When customer lookup updates VAT partner fields on a detail that has an open/local VAT draft,
  // mirror sellerName/taxCode into the panel draft. Do not mark dirty — DETAIL already holds values
  // for save; marking dirty alone could clear incomplete VAT on save.
  useEffect(() => {
    if (!visible) {
      return
    }

    const prevPartners = prevDetailVatPartnersRef.current
    const nextPartners: Record<string, VatPartnerSnapshot> = {}
    const patches: Array<{ rowKey: string } & VatPartnerSnapshot> = []

    for (const detail of details) {
      if (detail.ISDEL) {
        continue
      }
      const rowKey = typeof detail.ROW_KEY === "string" ? detail.ROW_KEY.trim() : ""
      if (!rowKey) {
        continue
      }

      const partner = readVatPartnerSnapshot(detail)
      nextPartners[rowKey] = partner

      if (vatPartnersEqual(prevPartners[rowKey], partner)) {
        continue
      }

      const shouldSync =
        rowKey === activeVatRowKeyRef.current || vatRowKeysRef.current.has(rowKey)
      if (!shouldSync) {
        continue
      }

      patches.push({ rowKey, ...partner })
    }

    prevDetailVatPartnersRef.current = nextPartners

    if (patches.length === 0) {
      return
    }

    setVatByRowKey((current) => {
      let next = current
      for (const item of patches) {
        const hasDraft = Object.prototype.hasOwnProperty.call(next, item.rowKey)
        if (!hasDraft && item.rowKey !== activeVatRowKeyRef.current) {
          continue
        }

        const previous = hasDraft
          ? next[item.rowKey]
          : createEmptyVoucherVatDetail()

        if (previous.sellerName === item.sellerName && previous.taxCode === item.taxCode) {
          continue
        }

        if (next === current) {
          next = { ...current }
        }
        next[item.rowKey] = {
          ...previous,
          sellerName: item.sellerName,
          taxCode: item.taxCode,
        }
      }
      return next
    })
  }, [details, visible])

  const hasVatData = useCallback(
    (rowKey: string | null | undefined) => {
      if (!rowKey) {
        return false
      }
      // Local draft wins — including intentional empty after reset (do not re-seed DETAIL).
      if (Object.prototype.hasOwnProperty.call(vatByRowKey, rowKey)) {
        return hasMeaningfulVoucherVatData(vatByRowKey[rowKey])
      }
      // After commit-to-details, local map may omit the key — fall back to detail fields.
      const detail = details.find((item) => !item.ISDEL && item.ROW_KEY === rowKey)
      return Boolean(detail && seedVoucherVatDetailFromChitDetail(detail))
    },
    [details, vatByRowKey],
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
      if (Object.prototype.hasOwnProperty.call(vatByRowKey, rowKey)) {
        return vatByRowKey[rowKey]
      }
      const detail = details.find((item) => !item.ISDEL && item.ROW_KEY === rowKey)
      return seedVoucherVatDetailFromChitDetail(detail ?? ({} as ChitDetail))
        ?? createEmptyVoucherVatDetail()
    },
    [details, vatByRowKey],
  )

  const openVatPanelForRow = useCallback((key: string) => {
    const detail = detailsRef.current.find((item) => !item.ISDEL && item.ROW_KEY === key)
    const fcAmount = detailAmountToVatNumber(detail?.FC_AMOUNT)

    setVatByRowKey((vatCurrent) => {
      const alreadyOpen = Object.prototype.hasOwnProperty.call(vatCurrent, key)
      let previous = alreadyOpen
        ? vatCurrent[key]
        : (detail ? seedVoucherVatDetailFromChitDetail(detail) : null)
          ?? createEmptyVoucherVatDetail()

      // Prefill FC from detail when draft has no FC yet.
      if (previous.fcAmount == null && fcAmount != null) {
        previous = applyVoucherVatAmountPatch(previous, { fcAmount })
        if (hasAnyVoucherVatInput(previous)) {
          setDirtyVatRowKeys((dirtyCurrent) => markDirty(dirtyCurrent, key))
          return { ...vatCurrent, [key]: previous }
        }
      }

      if (!alreadyOpen && hasAnyVoucherVatInput(previous)) {
        return { ...vatCurrent, [key]: previous }
      }

      return vatCurrent
    })

    // Keep ref in sync immediately so row-switch / FC sync in the same tick see the new row.
    activeVatRowKeyRef.current = key
    setActiveVatRowKey(key)
  }, [])

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
      activeVatRowKeyRef.current = null
      setActiveVatRowKey(null)
      return
    }

    // Switching rows: same dismiss gate + commit draft as close panel.
    if (current && !tryDismissActiveVatPanel()) {
      return
    }

    openVatPanelForRow(key)
  }, [openVatPanelForRow, tryDismissActiveVatPanel])

  const closeVatPanel = useCallback(() => {
    if (!tryDismissActiveVatPanel()) {
      return
    }
    activeVatRowKeyRef.current = null
    setActiveVatRowKey(null)
  }, [tryDismissActiveVatPanel])

  const updateVatDetail = useCallback((rowKey: string, patch: Partial<VoucherVatDetail>) => {
    const key = rowKey.trim()
    if (!key) {
      return
    }

    setDirtyVatRowKeys((current) => markDirty(current, key))

    setVatByRowKey((current) => {
      let previous: VoucherVatDetail
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        previous = current[key]
      } else {
        const detail = detailsRef.current.find((item) => !item.ISDEL && item.ROW_KEY === key)
        previous = (detail ? seedVoucherVatDetailFromChitDetail(detail) : null)
          ?? createEmptyVoucherVatDetail()
      }
      const merged = applyVoucherVatAmountPatch(previous, patch)

      // Keep an empty draft after reset so getVatDetail does not fall back to DETAIL seed.
      if (!hasAnyVoucherVatInput(merged)) {
        return { ...current, [key]: createEmptyVoucherVatDetail() }
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
