import { queryOptions } from "@tanstack/react-query"
import {
  loadOffsetAvailable, loadOffsetHistory,
  type OffsetAvailable, type OffsetFilters, type OffsetHistory,
} from "@/api/debtOffsetApi"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"

export type OffsetPanel = "EXECUTE" | "HISTORY"
export type OffsetSearch = { panel: OffsetPanel; filters: OffsetFilters; currencyCodes: string[] }
export type OffsetViewData = { available: OffsetAvailable; history: OffsetHistory[] }

export const emptyOffsetAvailable: OffsetAvailable = { SOURCES: [], DEBTS: [] }
export const emptyOffsetHistory: OffsetHistory[] = []

async function loadView(search: OffsetSearch): Promise<OffsetViewData> {
  if (search.panel === "EXECUTE") {
    return { available: await loadOffsetAvailable(search.filters), history: emptyOffsetHistory }
  }
  if (search.currencyCodes.length <= 1) {
    return { available: emptyOffsetAvailable, history: await loadOffsetHistory(search.filters) }
  }
  const groups = await Promise.all(search.currencyCodes.map(code => loadOffsetHistory({
    ...search.filters, currencyFilter: code === "VND" ? "VND" : `1|${code}`,
  })))
  const seen = new Set<number>()
  const history = groups.flat().filter(row => {
    const id = search.filters.kind === "COLLECT" ? row.CHITCOLLECT_ID : row.CHITPAYMENT_ID
    if (id == null || id <= 0) return true
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  return { available: emptyOffsetAvailable, history }
}

export function debtOffsetQueryOptions(companyCd: string, userId: string, search: OffsetSearch) {
  const { kind, fromYmd, toYmd, customerIds, currencyFilter, accCd, accCd1, accCd2 } = search.filters
  return queryOptions({
    queryKey: queryKeys.transaction.debtOffset(companyCd, userId, search.panel,
      JSON.stringify([kind, fromYmd, toYmd, customerIds, currencyFilter, accCd, accCd1, accCd2]),
      [...search.currencyCodes].sort().join(",")),
    queryFn: () => loadView(search),
    staleTime: STALE_TIME.TRANSACTION,
  })
}
