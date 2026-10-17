import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useQueries, useQueryClient } from "@tanstack/react-query"
import { ReportToolbar } from "@/components/toolbar/ReportToolbar"
import { EtcType } from "@/api/systemApi"
import Button from "devextreme-react/button"
import LoadPanel from "devextreme-react/load-panel"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { customerLookupStore } from "@/components/lookup/customerLookupStore"
import type { CustomerExt } from "@/types/customerExt"
import { normalizeCurrencyCodes } from "@/lib/currency"
import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login"
import { queryKeys } from "@/lib/query/queryKeys"
import { debtOffsetQueryOptions, emptyOffsetAvailable, emptyOffsetHistory, type OffsetPanel } from "@/hooks/queries/debtOffsetQueries"
import { createOffsetSearches, createOffsetViewState, createOffsetViewStates, offsetViewKeys,
  type OffsetMainTab, type OffsetViewKey, type OffsetViewState, type OffsetPaging } from "./debtOffsetViewState"
import DebtOffsetVoucherGrid from "./DebtOffsetVoucherGrid"
import DebtOffsetHistoryGrid from "./DebtOffsetHistoryGrid"
import { decimals, hasOffsetPairs, selectVouchers, toKey, type SelectedVoucher } from "./debtOffsetSelection"
import { getApiErrorMessage } from "@/api/apiTypes"
import {
  deleteOffsetPair, saveOffsetPair,
  type OffsetCurrency, type OffsetFilters, type OffsetHistory,
  type OffsetKind, type OffsetPairRequest, type OffsetVoucher,
} from "@/api/debtOffsetApi"

type MainTab = OffsetMainTab
type Panel = OffsetPanel
type Pair = OffsetPairRequest

const kinds: Record<MainTab, { text: string; description: string }> = {
  MATCH: { text: "btnDebt", description: "Đối trừ thanh toán/thu tiền với công nợ" },
  CLEARING: { text: "btnClearing", description: "Bù trừ phải thu và phải trả cùng đối tượng" },
}
const currencyOptions: OffsetCurrency[] = ["VND", "USD", "EUR", "JPY", "KRW", "CNY"]
const supportedCurrency = (code: string): code is OffsetCurrency =>
  currencyOptions.some(currencyCode => currencyCode === code)

const toCurrencyFilter = (code: string) => code === "VND" ? "VND" : `1|${code}`

const ymd = (date: Date | null) => {
  if (!date || Number.isNaN(date.getTime())) return ""
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`
}
// History relation IDs: COLLECT uses CHITCOLLECT_ID; PAYMENT/CLEARING use CHITPAYMENT_ID.
// The clearing delete procedure handles its mirror atomically.
const historyRelationId = (row: OffsetHistory, kind: OffsetKind): number | undefined =>
  kind === "COLLECT" ? row.CHITCOLLECT_ID : row.CHITPAYMENT_ID

const historyRowIdentity = (row: OffsetHistory) =>
  `${row.CHITPAYMENT_ID ?? ""}:${row.CHITCOLLECT_ID ?? ""}`

// Pair allocation remains internal. The editable amount now lives in the two voucher grids.
// Never combine different customers, and never allocate more than either selected amount.
function createPairs(sources: SelectedVoucher[], debts: SelectedVoucher[], kind: OffsetKind, currency: OffsetCurrency): Pair[] {
  const pairs: Pair[] = []
  const remaining = new Map(debts.map(row => [toKey(row), {
    local: decimals(row.OFFSET_AMOUNT),
    fc: decimals(row.OFFSET_AMOUNT_FC),
  }]))
  for (const source of sources) {
    let local = decimals(source.OFFSET_AMOUNT)
    let fc = decimals(source.OFFSET_AMOUNT_FC)
    for (const debt of debts) {
      if (debt.CUSTOMER_ID !== source.CUSTOMER_ID) continue
      const available = remaining.get(toKey(debt))
      if (!available) continue
      if (currency === "VND" ? local <= 0 || available.local <= 0 : fc <= 0 || available.fc <= 0) continue

      const takeFc = currency === "VND" ? 0 : decimals(Math.min(fc, available.fc))
      const takeLocal = currency === "VND"
        ? decimals(Math.min(local, available.local))
        : decimals(Math.min(local, available.local, fc > 0 ? local * takeFc / fc : 0))
      if (takeLocal <= 0 && takeFc <= 0) continue
      pairs.push({
        kind, customerId: source.CUSTOMER_ID,
        sourceChitId: source.CHIT_ID, debtChitId: debt.CHIT_ID,
        amount: takeLocal, amountFc: takeFc, currency,
      })
      local = decimals(local - takeLocal)
      fc = decimals(fc - takeFc)
      available.local = decimals(available.local - takeLocal)
      available.fc = decimals(available.fc - takeFc)
    }
  }
  return pairs
}

export default function DebtOffsetPage() {
  const companyCd = getCurrentCompanyCd()
  const userId = getCurrentUserId()
  return <DebtOffsetContent key={`${companyCd}:${userId}`} companyCd={companyCd} userId={userId} />
}

function DebtOffsetContent({ companyCd, userId }: { companyCd: string; userId: string }) {
  const { translate } = useContext(LanguageContext) as { translate?: (key: string, fallback?: string) => string }
  const t = useCallback((key: string, fallback: string) => translate?.(key, fallback) ?? fallback, [translate])
  const format = useCallback((key: string, fallback: string, ...args: string[]) => {
    const translated = t(key, fallback)
    // Legacy translations may contain only the label, without the {0}/{1} placeholders.
    // Use the complete fallback template so the selected/total counts never disappear.
    const template = args.every((_, index) => translated.includes(`{${index}}`))
      ? translated : fallback
    return args.reduce((value, arg, index) => value.replace(`{${index}}`, arg), template)
  }, [t])
  const [mainTab, setMainTab] = useState<MainTab>("MATCH")
  const [subTab, setSubTab] = useState<Panel>("EXECUTE")
  const [matchAccountCodes, setMatchAccountCodes] = useState<string[]>([])
  const [clearingAccount1Codes, setClearingAccount1Codes] = useState<string[]>([])
  const [clearingAccount2Codes, setClearingAccount2Codes] = useState<string[]>([])
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date(new Date().getFullYear(), 0, 1))
  const [fromDateEnabled, setFromDateEnabled] = useState(false)
  const [toDate, setToDate] = useState<Date | null>(() => new Date())
  const [customerCodes, setCustomerCodes] = useState<string[]>([])
  // Default to VND on this screen; users can still clear or select other currencies.
  const [currencyCodes, setCurrencyCodes] = useState<string[]>(["VND"])
  const queryClient = useQueryClient()
  const [mutating, setMutating] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [searches, setSearches] = useState(() => createOffsetSearches(ymd(toDate)))
  const [viewStates, setViewStates] = useState(createOffsetViewStates)
  const [visited, setVisited] = useState<OffsetViewKey[]>(["MATCH:EXECUTE"])
  // A new Search/Undo resets checkbox state without controlling every click.
  const historyGridEpoch = useRef<Record<OffsetViewKey, number>>({
    "MATCH:EXECUTE": 0, "MATCH:HISTORY": 0,
    "CLEARING:EXECUTE": 0, "CLEARING:HISTORY": 0,
  })
  const viewKey: OffsetViewKey = `${mainTab}:${subTab}`
  const queries = useQueries({
    queries: offsetViewKeys.map(key => ({
      ...debtOffsetQueryOptions(companyCd, userId, searches[key]),
      enabled: Boolean(companyCd) && visited.includes(key),
    })),
  })
  const activeQuery = queries[offsetViewKeys.indexOf(viewKey)]
  const busy = mutating || preparing || activeQuery.isFetching
  const available = activeQuery.data?.available ?? emptyOffsetAvailable
  const history = activeQuery.data?.history ?? emptyOffsetHistory
  const currentSearch = searches[viewKey]
  const { sources, debts, historySelected, sourcePaging, debtPaging, historyPaging } = viewStates[viewKey]

  const updateView = useCallback((update: (previous: OffsetViewState) => OffsetViewState) => {
    setViewStates(previous => {
      const next = update(previous[viewKey])
      return next === previous[viewKey] ? previous : { ...previous, [viewKey]: next }
    })
  }, [viewKey])
  const setHistorySelected = useCallback((rows: OffsetHistory[]) => {
    updateView(previous => {
      const existing = previous.historySelected
      if (existing.length === rows.length) {
        const keys = new Set(existing.map(historyRowIdentity))
        if (rows.every(row => keys.has(historyRowIdentity(row)))) return previous
      }
      return { ...previous, historySelected: rows }
    })
  }, [updateView])
  const lastLoadError = useRef<unknown>(null)
  const notifyLoadError = useCallback((error: unknown) => {
    if (lastLoadError.current === error) return
    lastLoadError.current = error
    notify(getApiErrorMessage(error, "Không thể tải dữ liệu đối trừ"), "error", 5000)
  }, [])
  useEffect(() => {
    if (activeQuery.error) notifyLoadError(activeQuery.error)
  }, [activeQuery.error, notifyLoadError])

  // The selected account replaces the old "Loại đối trừ" dropdown:
  // 131* => receivables collection, 331* => payables payment.
  const selectedMatchAccount = matchAccountCodes[0]?.trim() ?? ""
  const selectedAccount1 = clearingAccount1Codes[0]?.trim() ?? ""
  const selectedAccount2 = clearingAccount2Codes[0]?.trim() ?? ""
  const filterKind: OffsetKind = mainTab === "CLEARING" ? "CLEARING"
    : selectedMatchAccount.startsWith("131") ? "COLLECT" : "PAYMENT"
  // Saving an allocation needs one currency because the relation tables do not persist FC_TYPE.
  const selectedCurrency = currencyCodes.length === 1 && supportedCurrency(currencyCodes[0])
    ? currencyCodes[0]
    : null
  // Allocation always uses the filters that produced this view's rows, not draft toolbar values.
  const kind = currentSearch.filters.kind
  const historySelectedKeys = useMemo(
    () => historySelected.map(row => historyRelationId(row, kind))
      .filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0),
    [historySelected, kind],
  )
  const appliedCurrencies = currentSearch.currencyCodes
  const activeCurrency = appliedCurrencies.length === 1 && supportedCurrency(appliedCurrencies[0])
    ? appliedCurrencies[0] : null
  const currency: OffsetCurrency = activeCurrency ?? "VND"
  const showForeignCurrency = appliedCurrencies.length !== 1 || appliedCurrencies[0] !== "VND"

  // Both lookups use the same stores and code fields as GL / book / ar-summary.
  // The offset stored procedures filter by CUSTOMER_ID, so selected CUSTOMER_CD values
  // must be resolved before requesting data, never passed as IDs by mistake.
  const filters = useCallback(async (): Promise<OffsetFilters> => {
    let customerIds = "ALL"
    if (customerCodes.length > 0) {
      const loaded: unknown = await customerLookupStore.load()
      if (!Array.isArray(loaded)) throw new Error("Không thể tải danh sách mã khách hàng")
      const customers = loaded as CustomerExt[]
      const ids = new Set<number>()
      for (const customerCd of customerCodes) {
        const customer = customers.find(item => item.CUSTOMER_CD.trim() === customerCd.trim())
        if (!customer?.CUSTOMER_ID || customer.CUSTOMER_ID <= 0) {
          throw new Error(`Không tìm thấy CUSTOMER_ID cho mã khách hàng ${customerCd}`)
        }
        ids.add(customer.CUSTOMER_ID)
      }
      customerIds = Array.from(ids).join(",")
    }
    return {
      kind: filterKind, fromYmd: fromDateEnabled ? ymd(fromDate) : "", toYmd: ymd(toDate),
      customerIds, currencyFilter: selectedCurrency ? toCurrencyFilter(selectedCurrency) : "",
      accCd: mainTab === "MATCH" ? selectedMatchAccount : "",
      accCd1: mainTab === "CLEARING" ? selectedAccount1 : "",
      accCd2: mainTab === "CLEARING" ? selectedAccount2 : "",
    }
  }, [filterKind, mainTab, selectedMatchAccount, selectedAccount1, selectedAccount2,
      fromDateEnabled, fromDate, toDate, customerCodes, selectedCurrency])

  const visitView = (tab: MainTab, panel: Panel) => {
    const key: OffsetViewKey = `${tab}:${panel}`
    if (mutating || preparing || key === viewKey) return
    if (!visited.includes(key)) {
      const sibling: OffsetViewKey = `${tab}:${panel === "EXECUTE" ? "HISTORY" : "EXECUTE"}`
      const hasSibling = visited.includes(sibling)
      const base = hasSibling ? searches[sibling] : currentSearch
      const currencies = panel === "EXECUTE" && base.currencyCodes.length !== 1 ? ["VND"] : [...base.currencyCodes]
      const nextFilters = hasSibling ? { ...base.filters } : {
        ...base.filters, kind: searches[key].filters.kind, accCd: "", accCd1: "", accCd2: "",
      }
      nextFilters.currencyFilter = currencies.length === 1 ? toCurrencyFilter(currencies[0]) : ""
      setSearches(previous => ({ ...previous, [key]: { panel, filters: nextFilters, currencyCodes: currencies } }))
    }
    setVisited(previous => previous.includes(key) ? previous : [...previous, key])
    setMainTab(tab)
    setSubTab(panel)
  }
  const switchMain = (tab: MainTab) => visitView(tab, subTab)
  const switchSub = (tab: Panel) => visitView(mainTab, tab)

  const updatePaging = useCallback((side: "source" | "debt" | "history", paging: OffsetPaging) => {
    const field = side === "source" ? "sourcePaging" : side === "debt" ? "debtPaging" : "historyPaging"
    updateView(previous => previous[field].pageIndex === paging.pageIndex && previous[field].pageSize === paging.pageSize
      ? previous : { ...previous, [field]: paging })
  }, [updateView])
  const updateHistoryPaging = useCallback((paging: OffsetPaging) =>
    updatePaging("history", paging), [updatePaging])

  const refreshAfterMutation = async () => {
    for (const key of offsetViewKeys) historyGridEpoch.current[key] += 1
    setViewStates(createOffsetViewStates())
    await queryClient.invalidateQueries({ queryKey: queryKeys.transaction.debtOffsetRoot(companyCd, userId) })
  }

  const refresh = async () => {
    if (mainTab === "MATCH" && selectedMatchAccount &&
        !selectedMatchAccount.startsWith("131") && !selectedMatchAccount.startsWith("331")) {
      notify("Đối trừ chỉ hỗ trợ tài khoản 131* hoặc 331*", "warning", 4000)
      return
    }
    if (mainTab === "CLEARING" && subTab === "EXECUTE" &&
        ((selectedAccount1 && !selectedAccount1.startsWith("131")) ||
         (selectedAccount2 && !selectedAccount2.startsWith("331")))) {
      notify("Bù trừ yêu cầu tài khoản phải thu 131* và phải trả 331*", "warning", 4000)
      return
    }
    const fromYmd = fromDateEnabled ? ymd(fromDate) : ""
    const toYmd = ymd(toDate)
    if ((fromDateEnabled && (fromYmd.length !== 8 || fromYmd > toYmd)) || toYmd.length !== 8) {
      notify(t("INVALID_DATE_RANGE", "Khoảng thời gian không hợp lệ"), "warning", 3000)
      return
    }
    const unsupported = currencyCodes.filter(code => !supportedCurrency(code))
    if (unsupported.length > 0) {
      notify(`Loại tiền chưa hỗ trợ trong đối trừ/bù trừ: ${unsupported.join(", ")}`, "warning", 4000)
      return
    }
    if (subTab === "EXECUTE" && !selectedCurrency) {
      notify("Chọn đúng một loại tiền để thực hiện đối trừ/bù trừ", "warning", 4000)
      return
    }
    setPreparing(true)
    try {
      const nextSearch = { panel: subTab, filters: await filters(), currencyCodes: [...currencyCodes] }
      if (subTab === "HISTORY") historyGridEpoch.current[viewKey] += 1
      setSearches(previous => ({ ...previous, [viewKey]: nextSearch }))
      setViewStates(previous => ({ ...previous, [viewKey]: createOffsetViewState() }))
      // An explicit Search always refreshes, including when these exact filters are cached.
      await queryClient.fetchQuery({ ...debtOffsetQueryOptions(companyCd, userId, nextSearch), staleTime: 0 })
    } catch (error) {
      notifyLoadError(error)
    } finally {
      setPreparing(false)
    }
  }

  const canSave = useMemo(() => hasOffsetPairs(sources, debts, currency), [sources, debts, currency])

  // A newly checked row defaults to its entire outstanding balance. Existing manual
  // edits survive checking/unchecking other rows. Unchecking clears that row's amount.
  const updateSelection = useCallback((side: "source" | "debt", selectedRows: OffsetVoucher[]) => {
    const field = side === "source" ? "sources" : "debts"
    updateView(previous => {
      const selected = selectVouchers(previous[field], selectedRows, currency)
      return selected === previous[field] ? previous : { ...previous, [field]: selected }
    })
  }, [currency, updateView])

  const updateAmount = useCallback((side: "source" | "debt", row: OffsetVoucher,
                        field: "OFFSET_AMOUNT" | "OFFSET_AMOUNT_FC", value: number) => {
    const sideField = side === "source" ? "sources" : "debts"
    const maximum = decimals(Number(field === "OFFSET_AMOUNT" ? row.REMAINAMOUNT : row.REMAINAMOUNT_FC) || 0)
    const nextAmount = Number.isFinite(value) ? decimals(Math.min(Math.max(value, 0), maximum)) : 0
    updateView(previous => {
      const current = previous[sideField].find(item => toKey(item) === toKey(row))
      if (!current || current[field] === nextAmount) return previous
      return { ...previous, [sideField]: previous[sideField].map(item => toKey(item) === toKey(row)
        ? { ...item, [field]: nextAmount } : item) }
    })
  }, [updateView])

  const save = async () => {
    if (!activeCurrency) return
    const pairs = createPairs(sources, debts, kind, currency)
    if (!pairs.length) return
    const sourceBalances = new Map(sources.map(row => [toKey(row), row]))
    const debtBalances = new Map(debts.map(row => [toKey(row), row]))
    const sourceSums = new Map<string, { amount: number; fc: number }>()
    const debtSums = new Map<string, { amount: number; fc: number }>()
    for (const pair of pairs) {
      if (pair.amount < 0 || pair.amountFc < 0 || (pair.amount === 0 && pair.amountFc === 0) ||
          (currency === "VND" && pair.amountFc !== 0)) {
        notify("Số tiền phân bổ không hợp lệ", "warning", 4000)
        return
      }
      for (const [map, id] of [[sourceSums, pair.sourceChitId], [debtSums, pair.debtChitId]] as const) {
        const key = `${pair.customerId}:${id}`
        const current = map.get(key) ?? { amount: 0, fc: 0 }
        map.set(key, { amount: current.amount + pair.amount, fc: current.fc + pair.amountFc })
      }
    }
    for (const [map, balances] of [[sourceSums, sourceBalances], [debtSums, debtBalances]] as const) {
      for (const [key, sum] of map) {
        const row = balances.get(key)
        if (!row || sum.amount > Number(row.REMAINAMOUNT) + 0.005 ||
            sum.fc > Number(row.REMAINAMOUNT_FC) + 0.005 ||
            sum.amount > row.OFFSET_AMOUNT + 0.005 ||
            sum.fc > row.OFFSET_AMOUNT_FC + 0.005) {
          notify("Tổng tiền phân bổ vượt quá số dư chứng từ", "warning", 4000)
          return
        }
      }
    }
    const confirmed = await confirm(
      `Lưu ${pairs.length} cặp ${kind === "CLEARING" ? "bù trừ" : "đối trừ"}?`,
      t("CONFIRM", "Xác nhận"),
    )
    if (!confirmed) return
    setMutating(true)
    let success = 0
    try {
      // Each API request handles ONE pair. Clearing mirrors are atomic in the SQL procedure.
      for (const pair of pairs) {
        await saveOffsetPair(pair)
        success += 1
      }
      notify(`Đã lưu ${success} cặp thành công`, "success", 3000)
    } catch (error) {
      notify(`Đã lưu ${success}/${pairs.length} cặp. ${getApiErrorMessage(error, "Lưu thất bại")}`, "error", 7000)
    } finally {
      try {
        await refreshAfterMutation()
      } finally {
        setMutating(false)
      }
    }
  }

  const undo = async () => {
    if (!historySelected.length || busy) return
    const recordIds: number[] = []
    const seen = new Set<number>()
    for (const row of historySelected) {
      const id = historyRelationId(row, kind)
      if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
        notify("Không xác định được ID quan hệ cần hoàn tác", "warning", 4000)
        return
      }
      if (!seen.has(id)) {
        seen.add(id)
        recordIds.push(id)
      }
    }
    const label = kind === "CLEARING" ? "bù trừ" : "đối trừ"
    const confirmed = await confirm(
      `Bỏ ${recordIds.length} quan hệ ${label} đã chọn?`,
      t("CONFIRM", "Xác nhận"),
    )
    if (!confirmed) return
    setMutating(true)
    let success = 0
    try {
      // One API request deletes one relation; clearing also deletes the mirror atomically.
      for (const recordId of recordIds) {
        await deleteOffsetPair(kind, recordId)
        success += 1
      }
      notify(`Đã bỏ ${success} quan hệ ${label} thành công`, "success", 3000)
    } catch (error) {
      notify(`Đã bỏ ${success}/${recordIds.length} quan hệ ${label}. ${getApiErrorMessage(error, "Hoàn tác thất bại")}`, "error", 7000)
    } finally {
      try {
        // Refresh even on partial success to reconcile selected rows.
        await refreshAfterMutation()
      } finally {
        setMutating(false)
      }
    }
  }

  const grid = (rows: OffsetVoucher[], side: "source" | "debt", title: string) => {
    const chosen = side === "source" ? sources : debts
    return (
      <div className="flex min-h-[200px] min-w-0 flex-1 flex-col overflow-hidden rounded border border-gray-200 bg-white">
        <div className="flex min-h-[40px] items-center justify-between gap-3 border-b bg-gray-50 px-3 py-1.5 text-sm font-semibold">
          <span>{title}</span>
          <div className="flex shrink-0 items-center justify-end gap-3">
            <span className="font-normal text-gray-500">              
              {format("SELECTED_VOUCHER_COUNT", "Đã chọn {0} / {1} chứng từ", String(chosen.length), String(rows.length))}
            </span>
            {side === "source" && (
              <Button text={t("SAVE", mainTab === "CLEARING" ?  t("SAVE_CLEARED", "Lưu bù trừ") : t("SAVE_OFFSET", "Lưu đối trừ"))}
                type="success" icon="save" disabled={busy || !activeCurrency || !canSave} onClick={() => void save()} />
            )}
          </div>
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <DebtOffsetVoucherGrid key={`${viewKey}:${side}`} mode={mainTab} rows={rows} selected={chosen} side={side} busy={busy}
            showForeignCurrency={showForeignCurrency} onSelectionChange={updateSelection}
            onAmountChange={updateAmount} paging={side === "source" ? sourcePaging : debtPaging}
            onPagingChange={updatePaging} t={t} />
        </div>
      </div>
    )
  }

  return (
    <DxPage>
      <LoadPanel visible={busy} showIndicator showPane shading shadingColor="rgba(0, 0, 0, 0.15)" />
      <div className={`flex h-full min-h-0 min-w-0 w-full flex-col gap-2 bg-gray-50 px-3 pb-3 pt-0 ${subTab === "HISTORY" ? "overflow-hidden" : "overflow-auto"}`}>
        <div className="flex-shrink-0">
          <ReportToolbar
            variant="flat"
            fromDate={fromDate}
            toDate={toDate}
            optionalFromDateEnabled={fromDateEnabled}
            optionalFromDateLabel={t("USE_FROM_DATE", "Lọc từ ngày")}
            onOptionalFromDateEnabledChange={setFromDateEnabled}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            customerCodes={customerCodes}
            onCustomerCodesChange={setCustomerCodes}
            currencyCodes={currencyCodes}
            onCurrencyCodesChange={values => setCurrencyCodes(normalizeCurrencyCodes(values))}
            accountCodes={mainTab === "MATCH" ? matchAccountCodes
              : subTab === "EXECUTE" ? clearingAccount1Codes : undefined}
            accountPlaceholder={mainTab === "CLEARING" ? t("ACCOUNT_CODE", "Mã tài khoản") + " 131" : undefined}
            accountLookupSingleSelect
            accountFilterEtcType={mainTab === "MATCH"
              ? EtcType.cbxDebtOffsetAccount
              : EtcType.cbxDebtClearingReceivableAccount}
            onAccountCodesChange={mainTab === "MATCH"
              ? values => setMatchAccountCodes(values.slice(0, 1))
              : subTab === "EXECUTE"
                ? values => setClearingAccount1Codes(values.slice(0, 1))
                : undefined}
            secondaryAccountCodes={mainTab === "CLEARING" && subTab === "EXECUTE"
              ? clearingAccount2Codes : undefined}
            secondaryAccountFilterEtcType={EtcType.cbxDebtClearingPayableAccount}
            secondaryAccountPlaceholder={t("ACCOUNT_CODE", "Mã tài khoản") + " 331"}
            onSecondaryAccountCodesChange={mainTab === "CLEARING" && subTab === "EXECUTE"
              ? values => setClearingAccount2Codes(values.slice(0, 1))
              : undefined}
            onSearch={() => { if (!busy) void refresh() }}
            showSearch
            showQuickSearch={false}
            showRefresh={false}
            showPrint={false}
            showExportPdf={false}
            showExportExcel={false}
            shortcutsEnabled={false}
            trailingActions={
              <>
                <div className="flex shrink-0 flex-nowrap gap-1 rounded border bg-white p-1 text-xs">
                  {(["EXECUTE", "HISTORY"] as Panel[]).map(tab => (
                    <button type="button" key={tab} onClick={() => switchSub(tab)}
                      className={`whitespace-nowrap rounded px-3 py-1.5 ${subTab === tab ? "bg-slate-700 text-white" : "bg-gray-100 text-gray-700"}`}>
                      {tab === "EXECUTE" ? t("EXECUTE", "Thực hiện") : (mainTab === "CLEARING" ? t("btnClearingDebt", "Bỏ đối trừ") : t("btnDebtCleaning", "Bỏ bù trừ"))}
                    </button>
                  ))}
                </div>
                <div className="flex shrink-0 flex-nowrap gap-1 rounded border bg-white p-1 text-sm">
                  {(["MATCH", "CLEARING"] as MainTab[]).map(tab => (
                    <button key={tab} type="button" onClick={() => switchMain(tab)}
                      className={`whitespace-nowrap rounded px-4 py-1.5 ${mainTab === tab ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}>
                      {t(kinds[tab].text,"")}
                    </button>
                  ))}
                </div>
              </>
            }
          />
        </div>
        {subTab === "EXECUTE" ? (
          <>
            {grid(available.SOURCES, "source", mainTab === "CLEARING" ? t("131Voucher", "Phải thu 131") : t("PaymentVouchers", "Chứng từ thanh toán / thu"))}
            {grid(available.DEBTS, "debt", mainTab === "CLEARING" ? t("331Voucher", "Công nợ: Phải trả 331") : t("LiabilitiesVoucher", "Công nợ cần đối trừ"))}
          </>
        ) : (
          <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden rounded border border-gray-200 bg-white">
            <div className="flex shrink-0 items-center justify-between border-b bg-gray-50 px-3 py-2">
              <span className="text-sm font-semibold">
                {mainTab === "CLEARING" ? t("OFFSET_HISTORY", "Lịch sử bù trừ") : t("Clearing_HISTORY", "Lịch sử đối trừ")}
                <span className="ml-2 text-xs font-normal text-gray-500">                  
                   {format("SELECTED_VOUCHER_COUNT", "Đã chọn {0} / {1} chứng từ", String(historySelected.length), String(history.length))}
                </span>
              </span>
              <Button text={t("UNDO", "Bỏ đối trừ")} type="danger" icon="revert"
                disabled={busy || historySelected.length === 0} onClick={() => void undo()} />
            </div>
            <div className="min-h-0 min-w-0 w-full flex-1 overflow-hidden">
              <DebtOffsetHistoryGrid
                key={`${viewKey}:${historyGridEpoch.current[viewKey]}`}
                history={history}
                kind={kind}
                showForeignCurrency={showForeignCurrency}
                historyPaging={historyPaging}
                initialSelectedRowKeys={historySelectedKeys}
                onSelectionChange={setHistorySelected}
                onPagingChange={updateHistoryPaging}
                t={t}
              />
            </div>
          </div>
        )}
      </div>
    </DxPage>
  )
}
