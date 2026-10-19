import type { OffsetHistory } from "@/api/debtOffsetApi"
import type { OffsetPanel, OffsetSearch } from "@/hooks/queries/debtOffsetQueries"
import { DEFAULT_CURRENCY_CODE } from "@/lib/currency"
import { DEFAULT_PAGE_SIZE } from "@/lib/paging"
import type { SelectedVoucher } from "./debtOffsetSelection"

export type OffsetMainTab = "MATCH" | "CLEARING"
export type OffsetViewKey = `${OffsetMainTab}:${OffsetPanel}`
export const offsetViewKeys: OffsetViewKey[] = ["MATCH:EXECUTE", "MATCH:HISTORY", "CLEARING:EXECUTE", "CLEARING:HISTORY"]
export type OffsetPaging = { pageIndex: number; pageSize: number }
export type OffsetViewState = {
  sources: SelectedVoucher[]
  debts: SelectedVoucher[]
  historySelected: OffsetHistory[]
  sourcePaging: OffsetPaging
  debtPaging: OffsetPaging
  historyPaging: OffsetPaging
}

export function createOffsetViewState(): OffsetViewState {
  return {
    sources: [], debts: [], historySelected: [],
    sourcePaging: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    debtPaging: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
    historyPaging: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
  }
}

export function createOffsetSearches(toYmd: string): Record<OffsetViewKey, OffsetSearch> {
  const search = (kind: "PAYMENT" | "CLEARING", panel: OffsetPanel): OffsetSearch => ({
    panel, currencyCodes: [DEFAULT_CURRENCY_CODE],
    filters: {
      kind, fromYmd: "", toYmd, customerIds: "ALL",
      currencyFilter: DEFAULT_CURRENCY_CODE, accCd: "", accCd1: "", accCd2: "",
    },
  })
  return {
    "MATCH:EXECUTE": search("PAYMENT", "EXECUTE"),
    "MATCH:HISTORY": search("PAYMENT", "HISTORY"),
    "CLEARING:EXECUTE": search("CLEARING", "EXECUTE"),
    "CLEARING:HISTORY": search("CLEARING", "HISTORY"),
  }
}

export function createOffsetViewStates(): Record<OffsetViewKey, OffsetViewState> {
  return {
    "MATCH:EXECUTE": createOffsetViewState(), "MATCH:HISTORY": createOffsetViewState(),
    "CLEARING:EXECUTE": createOffsetViewState(), "CLEARING:HISTORY": createOffsetViewState(),
  }
}
