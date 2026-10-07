import { getInventoryVouchers } from "@/api/inventoryVoucherApi"
import { getChits } from "@/api/voucherApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { ChitInfo, ChitLedger, ChitType, InventoryInputType, InventoryVoucher } from "@/types/voucher"
import { normalizeInventoryVoucherApi, type InventoryVoucherType } from "@/pages/Inventory/inventoryVoucherModel"

import { normalizeChitRows } from "./chitUtils"

export async function loadVoucherForDirectOpen(
  ledger: ChitLedger,
  chitType: ChitType,
  chitId: number,
): Promise<ChitInfo | null> {
  if (!Number.isFinite(chitId) || chitId <= 0) {
    return null
  }

  const response = await getChits(ledger, chitType, {
    chitId,
    INCLUDE_DETAILS: true,
    pageNumber: 1,
    pageSize: 1,
  })

  return normalizeChitRows(response.data || [], chitType)[0] ?? null
}

export async function loadInventoryVoucherForDirectOpen(
  ledger: InventoryInputType,
  chitType: InventoryVoucherType,
  chitId: number,
): Promise<InventoryVoucher | null> {
  if (!Number.isFinite(chitId) || chitId <= 0) {
    return null
  }

  const result = await getInventoryVouchers(ledger, chitType, {
    chitId,
    pageNumber: 1,
    pageSize: 1,
  })

  const companyCd = getCurrentCompanyCd()
  return result.data.map((item) => normalizeInventoryVoucherApi(item, chitType, companyCd))[0] ?? null
}
