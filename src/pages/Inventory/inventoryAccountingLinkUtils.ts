import { getInventoryLinkStatus, getInventoryLinkStatuses } from "@/api/inventoryLinkApi"
import { getInventoryVouchers, updateInventoryVoucher } from "@/api/inventoryVoucherApi"
import { getChits } from "@/api/voucherApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type {
  ChitInfo,
  ChitLedger,
  ChitType,
  InventoryInputApi,
  InventoryInputLine,
  InventoryInputType,
  InventoryOutputApi,
  InventoryOutputLine,
  InventoryVoucher,
} from "@/types/voucher"
import { getActiveChitDetails, normalizeChitRows } from "@/pages/VoucherManagement/chitUtils"
import type { InventoryAccountingReferenceOption } from "@/pages/VoucherManagement/components/chitEditorConstants"
import { loadInventoryVoucherForDirectOpen } from "@/pages/VoucherManagement/voucherDirectOpen"
import {
  formatInventoryDate,
  mapInventoryVoucherToApiPayload,
  normalizeInventoryVoucherApi,
  type InventoryVoucherType,
} from "./inventoryVoucherModel"

export type LinkAmountCandidate = {
  chitId: number
  chitNo: string
  chitYmd: string
  amount: number
  ledger: string
  chitType: string
}

/** Free accounting detail line available for linking to one inventory voucher. */
export type LinkDetailCandidate = {
  chitId: number
  chitNo: string
  chitYmd: string
  chitDetailId: number
  chitDetailCd: string
  debit: string
  credit: string
  amount: number
  ledger: string
  chitType: string
  sort: number
}

export type LinkAmountPair = {
  inventory: LinkAmountCandidate
  detail: LinkDetailCandidate
  amount: number
}

export type AutoMatchByAmountResult = {
  pairs: LinkAmountPair[]
  unmatchedInventory: LinkAmountCandidate[]
  unmatchedDetails: LinkDetailCandidate[]
}

export function applyAccountingDetailToInventoryLines<T extends InventoryInputLine | InventoryOutputLine>(
  lines: T[],
  chitDetailId: number | null,
  chitDetailCd: string,
): T[] {
  return lines.map((line) =>
    line.ISDEL
      ? line
      : {
          ...line,
          CHITDETAIL_ID: chitDetailId,
          CHITDETAIL_CD: chitDetailCd,
        },
  )
}

export function getLinkedChitDetailIdFromInventoryDraft(draft: InventoryVoucher, chitType: string): number {
  const lines = chitType === "IR" ? draft.INPUTS : draft.OUTPUTS
  for (const line of lines) {
    if (line.ISDEL) {
      continue
    }
    const detailId = Number(line.CHITDETAIL_ID ?? 0)
    if (Number.isFinite(detailId) && detailId > 0) {
      return detailId
    }
  }
  return 0
}

export function isInventoryVoucherUnlinked(draft: InventoryVoucher, chitType: string): boolean {
  const lines = chitType === "IR" ? draft.INPUTS : draft.OUTPUTS
  return !lines.some((line) => {
    if (line.ISDEL) {
      return false
    }
    return Number(line.CHITDETAIL_ID ?? 0) > 0 || String(line.CHITDETAIL_CD ?? "").trim().length > 0
  })
}

export function getInventoryTypeForAccountingChitType(chitType: ChitType | string): "IR" | "IO" | null {
  const normalized = String(chitType ?? "").trim().toUpperCase()
  if (normalized === "PO" || normalized === "PD" || normalized === "SR") {
    return "IR"
  }
  if (normalized === "SO" || normalized === "SD" || normalized === "PR") {
    return "IO"
  }
  return null
}

export function getInventoryLedgerForInventoryType(inventoryType: "IR" | "IO"): InventoryInputType {
  return inventoryType === "IR" ? "AP" : "AR"
}

export function getAccountingReferenceOptionsForInventory(
  inventoryType: "IR" | "IO",
  optionsByInventoryType: Partial<Record<"IR" | "IO", InventoryAccountingReferenceOption[]>>,
): InventoryAccountingReferenceOption[] {
  return optionsByInventoryType[inventoryType] ?? []
}

export function getAccountingReferenceOptionForChitType(
  chitType: ChitType | string,
  optionsByInventoryType: Partial<Record<"IR" | "IO", InventoryAccountingReferenceOption[]>>,
): InventoryAccountingReferenceOption | null {
  const normalized = String(chitType ?? "").trim().toUpperCase() as ChitType
  const inventoryType = getInventoryTypeForAccountingChitType(normalized)
  if (!inventoryType) {
    return null
  }
  return (
    getAccountingReferenceOptionsForInventory(inventoryType, optionsByInventoryType).find(
      (option) => option.chitType === normalized,
    ) ?? null
  )
}

export function toLinkAmountCandidateFromInventory(
  voucher: InventoryVoucher,
  ledger: string,
): LinkAmountCandidate | null {
  const chitId = Number(voucher.CHIT_ID ?? 0)
  if (!(chitId > 0)) {
    return null
  }
  return {
    chitId,
    chitNo: String(voucher.CHIT_NO ?? "").trim(),
    chitYmd: String(voucher.CHIT_YMD ?? "").trim(),
    amount: Number(voucher.AMOUNT ?? 0),
    ledger,
    chitType: String(voucher.CHIT_TYPE ?? "").trim().toUpperCase(),
  }
}

function compareInventoryCandidates(a: LinkAmountCandidate, b: LinkAmountCandidate): number {
  const ymd = String(a.chitYmd).localeCompare(String(b.chitYmd))
  if (ymd !== 0) {
    return ymd
  }
  return String(a.chitNo).localeCompare(String(b.chitNo))
}

function compareDetailCandidates(a: LinkDetailCandidate, b: LinkDetailCandidate): number {
  const ymd = String(a.chitYmd).localeCompare(String(b.chitYmd))
  if (ymd !== 0) {
    return ymd
  }
  const no = String(a.chitNo).localeCompare(String(b.chitNo))
  if (no !== 0) {
    return no
  }
  return (a.sort || 0) - (b.sort || 0)
}

function amountKey(amount: number): string {
  return Number(amount).toFixed(6)
}

/** Pair FIFO by equal AMOUNT (inventory header ↔ accounting detail line). */
export function autoMatchByAmount(
  inventoryCandidates: LinkAmountCandidate[],
  detailCandidates: LinkDetailCandidate[],
): AutoMatchByAmountResult {
  const inventoryByAmount = new Map<string, LinkAmountCandidate[]>()
  const detailByAmount = new Map<string, LinkDetailCandidate[]>()

  for (const item of [...inventoryCandidates].sort(compareInventoryCandidates)) {
    const key = amountKey(item.amount)
    const bucket = inventoryByAmount.get(key) ?? []
    bucket.push(item)
    inventoryByAmount.set(key, bucket)
  }

  for (const item of [...detailCandidates].sort(compareDetailCandidates)) {
    const key = amountKey(item.amount)
    const bucket = detailByAmount.get(key) ?? []
    bucket.push(item)
    detailByAmount.set(key, bucket)
  }

  const pairs: LinkAmountPair[] = []
  const unmatchedInventory: LinkAmountCandidate[] = []
  const unmatchedDetails: LinkDetailCandidate[] = []
  const allKeys = new Set([...inventoryByAmount.keys(), ...detailByAmount.keys()])

  for (const key of allKeys) {
    const left = inventoryByAmount.get(key) ?? []
    const right = detailByAmount.get(key) ?? []
    const pairCount = Math.min(left.length, right.length)
    for (let index = 0; index < pairCount; index += 1) {
      pairs.push({
        inventory: left[index],
        detail: right[index],
        amount: left[index].amount,
      })
    }
    unmatchedInventory.push(...left.slice(pairCount))
    unmatchedDetails.push(...right.slice(pairCount))
  }

  pairs.sort((a, b) => compareInventoryCandidates(a.inventory, b.inventory))
  unmatchedInventory.sort(compareInventoryCandidates)
  unmatchedDetails.sort(compareDetailCandidates)

  return { pairs, unmatchedInventory, unmatchedDetails }
}

export async function resolveFreeAccountingDetail(
  option: InventoryAccountingReferenceOption,
  source: Pick<ChitInfo, "CHIT_ID">,
  currentLinkedDetailId = 0,
): Promise<{ CHITDETAIL_ID: number; CHITDETAIL_CD: string } | null> {
  const sourceChitId = Number(source.CHIT_ID ?? 0)
  if (!Number.isFinite(sourceChitId) || sourceChitId <= 0) {
    return null
  }

  const [fullResponse, status] = await Promise.all([
    getChits(option.ledger, option.chitType, {
      chitId: sourceChitId,
      INCLUDE_DETAILS: true,
      pageNumber: 1,
      pageSize: 1,
    }),
    getInventoryLinkStatus(option.ledger, option.chitType, sourceChitId),
  ])

  const fullVoucher = normalizeChitRows(fullResponse.data || [], option.chitType)[0] ?? null
  const details = getActiveChitDetails(fullVoucher?.DETAILS ?? [])
  if (details.length === 0) {
    return null
  }

  const linkedDetailIds = new Set(
    (status?.LINKED_CHITDETAIL_IDS ?? [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0),
  )

  const preferred =
    details.find((detail) => {
      const detailId = Number(detail.CHITDETAIL_ID ?? 0)
      return detailId > 0 && detailId === currentLinkedDetailId
    }) ??
    details.find((detail) => {
      const detailId = Number(detail.CHITDETAIL_ID ?? 0)
      return detailId > 0 && !linkedDetailIds.has(detailId)
    }) ??
    null

  if (!preferred) {
    return null
  }

  const detailId = Number(preferred.CHITDETAIL_ID ?? 0)
  const detailCd = String(preferred.CHITDETAIL_CD ?? "").trim()
  if (!(detailId > 0) || !detailCd) {
    return null
  }

  return { CHITDETAIL_ID: detailId, CHITDETAIL_CD: detailCd }
}

const linkListPageSize = 100
const linkStatusChunkSize = 100

function chunkIds(ids: number[], chunkSize: number): number[][] {
  const chunks: number[][] = []
  for (let index = 0; index < ids.length; index += chunkSize) {
    chunks.push(ids.slice(index, index + chunkSize))
  }
  return chunks
}

function toFreeDetailCandidates(
  vouchers: ChitInfo[],
  linkedByChitId: Map<number, Set<number>>,
  fullyLinkedChitIds: Set<number>,
  ledger: ChitLedger,
  chitType: ChitType,
): LinkDetailCandidate[] {
  const result: LinkDetailCandidate[] = []
  for (const voucher of vouchers) {
    const chitId = Number(voucher.CHIT_ID ?? 0)
    if (!(chitId > 0) || fullyLinkedChitIds.has(chitId)) {
      continue
    }

    const linkedIds = linkedByChitId.get(chitId) ?? new Set<number>()
    const details = getActiveChitDetails(voucher.DETAILS ?? [])
    details.forEach((detail, index) => {
      const detailId = Number(detail.CHITDETAIL_ID ?? 0)
      const detailCd = String(detail.CHITDETAIL_CD ?? "").trim()
      if (!(detailId > 0) || !detailCd || linkedIds.has(detailId)) {
        return
      }
      result.push({
        chitId,
        chitNo: String(voucher.CHIT_NO ?? "").trim(),
        chitYmd: String(voucher.CHIT_YMD ?? "").trim(),
        chitDetailId: detailId,
        chitDetailCd: detailCd,
        debit: String(detail.DEBIT ?? "").trim(),
        credit: String(detail.CREDIT ?? "").trim(),
        amount: Number(detail.AMOUNT ?? 0),
        ledger,
        chitType: String(voucher.CHIT_TYPE ?? chitType).trim().toUpperCase(),
        sort: Number(detail.SORT ?? index + 1),
      })
    })
  }

  return result.sort(compareDetailCandidates)
}

/** Load free CHITDETAIL lines from selected accounting vouchers (1 detail ↔ 1 inventory). */
export async function loadFreeAccountingDetailsFromSelectedVouchers(params: {
  ledger: ChitLedger
  chitType: ChitType
  selected: ChitInfo[]
}): Promise<LinkDetailCandidate[]> {
  const selectedIds = params.selected
    .map((row) => Number(row.CHIT_ID ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0)

  if (selectedIds.length === 0) {
    return []
  }

  const statuses = await getInventoryLinkStatuses(params.ledger, params.chitType, selectedIds)
  const linkedByChitId = new Map<number, Set<number>>()
  const fullyLinkedChitIds = new Set<number>()
  statuses.forEach((status) => {
    const chitId = Number(status.CHIT_ID ?? 0)
    if (!(chitId > 0)) {
      return
    }
    linkedByChitId.set(
      chitId,
      new Set(
        (status.LINKED_CHITDETAIL_IDS ?? [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    )
    if (String(status.INVENTORY_STATUS ?? "").trim().toUpperCase() === "FULL") {
      fullyLinkedChitIds.add(chitId)
    }
  })

  const fullVouchers = await Promise.all(
    selectedIds.map(async (chitId) => {
      const response = await getChits(params.ledger, params.chitType, {
        chitId,
        INCLUDE_DETAILS: true,
        pageNumber: 1,
        pageSize: 1,
      })
      return normalizeChitRows(response.data || [], params.chitType)[0] ?? null
    }),
  )

  return toFreeDetailCandidates(
    fullVouchers.filter((voucher): voucher is ChitInfo => voucher != null),
    linkedByChitId,
    fullyLinkedChitIds,
    params.ledger,
    params.chitType,
  )
}

/** Load unlinked accounting detail lines in a date range. Already-linked vouchers/lines are omitted. */
export async function loadFreeAccountingDetailsInDateRange(params: {
  ledger: ChitLedger
  chitType: ChitType
  fromYmd?: string
  toYmd?: string
  pageSize?: number
}): Promise<LinkDetailCandidate[]> {
  const pageSize = params.pageSize ?? linkListPageSize
  const firstResponse = await getChits(params.ledger, params.chitType, {
    fromYmd: params.fromYmd,
    toYmd: params.toYmd,
    INCLUDE_DETAILS: true,
    pageNumber: 1,
    pageSize,
  })
  const pageResponses = [firstResponse]
  for (let page = 2; page <= firstResponse.totalPages; page += 1) {
    pageResponses.push(
      await getChits(params.ledger, params.chitType, {
        fromYmd: params.fromYmd,
        toYmd: params.toYmd,
        INCLUDE_DETAILS: true,
        pageNumber: page,
        pageSize,
      }),
    )
  }

  const vouchers = normalizeChitRows(
    pageResponses.flatMap((response) => response.data || []),
    params.chitType,
  )
  const ids = vouchers
    .map((item) => Number(item.CHIT_ID ?? 0))
    .filter((id) => Number.isFinite(id) && id > 0)

  const linkedByChitId = new Map<number, Set<number>>()
  const fullyLinkedChitIds = new Set<number>()
  if (ids.length > 0) {
    const statusChunks = await Promise.all(
      chunkIds(ids, linkStatusChunkSize).map(async (chunk) => {
        try {
          return await getInventoryLinkStatuses(params.ledger, params.chitType, chunk)
        } catch {
          // Link-status is a nice-to-have filter; skip when the user lacks
          // the inventory-link permission (e.g. AR_SALES) for this chit type.
          return []
        }
      }),
    )
    statusChunks.flat().forEach((status) => {
      const chitId = Number(status.CHIT_ID ?? 0)
      if (!(chitId > 0)) {
        return
      }
      linkedByChitId.set(
        chitId,
        new Set(
          (status.LINKED_CHITDETAIL_IDS ?? [])
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      )
      if (String(status.INVENTORY_STATUS ?? "").trim().toUpperCase() === "FULL") {
        fullyLinkedChitIds.add(chitId)
      }
    })
  }

  return toFreeDetailCandidates(vouchers, linkedByChitId, fullyLinkedChitIds, params.ledger, params.chitType)
}

export async function loadUnlinkedInventoryCandidates(params: {
  inventoryType: "IR" | "IO"
  fromYmd?: string
  toYmd?: string
  pageSize?: number
}): Promise<LinkAmountCandidate[]> {
  const ledger = getInventoryLedgerForInventoryType(params.inventoryType)
  const pageSize = params.pageSize ?? linkListPageSize
  const firstResponse = await getInventoryVouchers(ledger, params.inventoryType, {
    fromYmd: params.fromYmd,
    toYmd: params.toYmd,
    pageNumber: 1,
    pageSize,
  })
  const pageResponses = [firstResponse]
  for (let page = 2; page <= firstResponse.totalPages; page += 1) {
    pageResponses.push(
      await getInventoryVouchers(ledger, params.inventoryType, {
        fromYmd: params.fromYmd,
        toYmd: params.toYmd,
        pageNumber: page,
        pageSize,
      }),
    )
  }

  const companyCd = getCurrentCompanyCd()
  const rows = pageResponses
    .flatMap((response) => response.data || [])
    .map((item) => normalizeInventoryVoucherApi(item, params.inventoryType, companyCd))

  return rows
    .filter((row) => isInventoryVoucherUnlinked(row, params.inventoryType))
    .map((row) => toLinkAmountCandidateFromInventory(row, ledger))
    .filter((item): item is LinkAmountCandidate => item != null)
}

export async function applyInventoryAccountingLinkPair(params: {
  inventoryLedger: InventoryInputType
  inventoryChitType: InventoryVoucherType
  inventoryChitId: number
  chitDetailId: number
  chitDetailCd: string
}): Promise<InventoryVoucher> {
  const detailId = Number(params.chitDetailId)
  const detailCd = String(params.chitDetailCd ?? "").trim()
  if (!(detailId > 0) || !detailCd) {
    throw new Error("Accounting detail is required")
  }

  const inventory = await loadInventoryVoucherForDirectOpen(
    params.inventoryLedger,
    params.inventoryChitType,
    params.inventoryChitId,
  )
  if (!inventory) {
    throw new Error("Inventory voucher not found")
  }

  const stamped: InventoryVoucher =
    params.inventoryChitType === "IR"
      ? {
          ...inventory,
          INPUTS: applyAccountingDetailToInventoryLines(inventory.INPUTS, detailId, detailCd),
          OUTPUTS: [],
        }
      : {
          ...inventory,
          INPUTS: [],
          OUTPUTS: applyAccountingDetailToInventoryLines(inventory.OUTPUTS, detailId, detailCd),
        }

  const payload = mapInventoryVoucherToApiPayload({
    ...stamped,
    CHIT_YMD: formatInventoryDate(stamped.CHIT_YMD),
  })
  const response = await updateInventoryVoucher(params.inventoryLedger, params.inventoryChitType, payload)
  return normalizeInventoryVoucherApi(response.data, params.inventoryChitType, getCurrentCompanyCd())
}

export function isLinkableAccountingChitType(chitType: ChitType | string): boolean {
  return getInventoryTypeForAccountingChitType(chitType) != null
}

export type LinkedInventoryTarget = {
  chitId: number
  chitType: string
  chitNo: string
}

type InventoryLinkSourceLine = Pick<
  InventoryInputApi & InventoryOutputApi,
  "CHITDETAIL_ID" | "INVENTORY_ID" | "CHIT_TYPE" | "INVENTORY_CD"
>

/** Distinct inventory vouchers keyed by accounting CHITDETAIL_ID. */
export function buildLinkedInventoryByDetailId(
  lines: readonly InventoryLinkSourceLine[],
): Record<number, LinkedInventoryTarget[]> {
  const result: Record<number, LinkedInventoryTarget[]> = {}

  for (const line of lines) {
    const detailId = Number(line.CHITDETAIL_ID ?? 0)
    const chitId = Number(line.INVENTORY_ID ?? 0)
    const chitType = String(line.CHIT_TYPE ?? "").trim().toUpperCase()
    const chitNo = String(line.INVENTORY_CD ?? "").trim()
    if (!(detailId > 0) || !(chitId > 0) || !chitType) {
      continue
    }

    const existing = result[detailId] ?? []
    if (existing.some((item) => item.chitId === chitId)) {
      continue
    }

    existing.push({ chitId, chitType, chitNo: chitNo || String(chitId) })
    result[detailId] = existing
  }

  return result
}

export function areLinkedInventoryMapsEqual(
  left: Record<number, LinkedInventoryTarget[]>,
  right: Record<number, LinkedInventoryTarget[]>,
): boolean {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  for (const key of leftKeys) {
    const detailId = Number(key)
    const leftTargets = left[detailId] ?? []
    const rightTargets = right[detailId] ?? []
    if (leftTargets.length !== rightTargets.length) {
      return false
    }

    for (let index = 0; index < leftTargets.length; index += 1) {
      const a = leftTargets[index]
      const b = rightTargets[index]
      if (!a || !b || a.chitId !== b.chitId || a.chitType !== b.chitType || a.chitNo !== b.chitNo) {
        return false
      }
    }
  }

  return true
}

export type { ChitLedger }
