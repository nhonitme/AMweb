import { useCallback, useContext, useMemo, useState } from "react"
import DataGrid, { Column, Scrolling, Selection, Summary, TotalItem } from "devextreme-react/data-grid"
import SelectBox from "devextreme-react/select-box"
import DateBox from "devextreme-react/date-box"
import NumberBox from "devextreme-react/number-box"
import Button from "devextreme-react/button"
import notify from "devextreme/ui/notify"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { customerLookupStore } from "@/components/lookup/customerLookupStore"
import { getApiErrorMessage } from "@/api/apiTypes"
import {
  deleteOffsetPair, loadOffsetAvailable, loadOffsetHistory, saveOffsetPair,
  type OffsetAvailable, type OffsetCurrency, type OffsetFilters, type OffsetHistory,
  type OffsetKind, type OffsetPairRequest, type OffsetVoucher,
} from "@/api/debtOffsetApi"

type MainTab = "MATCH" | "CLEARING"
type Panel = "EXECUTE" | "HISTORY"
type SelectedVoucher = OffsetVoucher & { OFFSET_AMOUNT: number; OFFSET_AMOUNT_FC: number }
type Pair = OffsetPairRequest

const kinds: Record<MainTab, { text: string; description: string }> = {
  MATCH: { text: "Đối trừ chứng từ", description: "Đối trừ thanh toán/thu tiền với công nợ" },
  CLEARING: { text: "Bù trừ 131 ↔ 331", description: "Bù trừ phải thu và phải trả cùng đối tượng" },
}
const currencyOptions: OffsetCurrency[] = ["VND", "USD", "EUR", "JPY", "KRW", "CNY"]
const formatMoney = "#,##0.##"
const ymd = (date: Date | null) => {
  if (!date || Number.isNaN(date.getTime())) return ""
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`
}
const dateLabel = (text?: string | null) => {
  const value = String(text ?? "").replace(/[^0-9]/g, "")
  if (value.length < 8) return text ?? ""
  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}`
}
const toKey = (row: OffsetVoucher) => `${row.CUSTOMER_ID}:${row.CHIT_ID}`
const normalize = (rows: OffsetVoucher[], selected: SelectedVoucher[]) => {
  const byKey = new Map(selected.map(row => [toKey(row), row]))
  return rows.map(row => ({
    ...row,
    ROW_KEY: toKey(row),
    OFFSET_AMOUNT: byKey.get(toKey(row))?.OFFSET_AMOUNT ?? 0,
    OFFSET_AMOUNT_FC: byKey.get(toKey(row))?.OFFSET_AMOUNT_FC ?? 0,
  }))
}
const decimals = (num: number) => Math.round(Math.max(0, num) * 100) / 100

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
  const { translate } = useContext(LanguageContext) as { translate?: (key: string, fallback?: string) => string }
  const t = useCallback((key: string, fallback: string) => translate?.(key, fallback) ?? fallback, [translate])
  const [mainTab, setMainTab] = useState<MainTab>("MATCH")
  const [subTab, setSubTab] = useState<Panel>("EXECUTE")
  const [matchKind, setMatchKind] = useState<"PAYMENT" | "COLLECT">("PAYMENT")
  const [fromDate, setFromDate] = useState<Date | null>(() => new Date(new Date().getFullYear(), 0, 1))
  const [toDate, setToDate] = useState<Date | null>(() => new Date())
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [currency, setCurrency] = useState<OffsetCurrency>("VND")
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [available, setAvailable] = useState<OffsetAvailable>({ SOURCES: [], DEBTS: [] })
  const [history, setHistory] = useState<OffsetHistory[]>([])
  const [sources, setSources] = useState<SelectedVoucher[]>([])
  const [debts, setDebts] = useState<SelectedVoucher[]>([])
  const [historySelected, setHistorySelected] = useState<OffsetHistory | null>(null)

  const kind: OffsetKind = mainTab === "CLEARING" ? "CLEARING" : matchKind
  const filters = useCallback((): OffsetFilters => ({
    kind, fromYmd: ymd(fromDate), toYmd: ymd(toDate),
    customerIds: customerId ? String(customerId) : "ALL",
    currencyFilter: currency === "VND" ? "VND" : `1|${currency}`,
  }), [kind, fromDate, toDate, customerId, currency])

  const reset = () => {
    setLoaded(false)
    setSources([])
    setDebts([])
    setHistorySelected(null)
    setAvailable({ SOURCES: [], DEBTS: [] })
    setHistory([])
  }
  const switchMain = (tab: MainTab) => { if (tab !== mainTab) { setMainTab(tab); reset() } }
  const switchSub = (tab: Panel) => { if (tab !== subTab) { setSubTab(tab); reset() } }

  const refresh = async () => {
    const params = filters()
    if (params.fromYmd.length !== 8 || params.toYmd.length !== 8 || params.fromYmd > params.toYmd) {
      notify(t("INVALID_DATE_RANGE", "Khoảng thời gian không hợp lệ"), "warning", 3000)
      return
    }
    setBusy(true)
    reset()
    try {
      if (subTab === "HISTORY") setHistory(await loadOffsetHistory(params))
      else setAvailable(await loadOffsetAvailable(params))
      setLoaded(true)
    } catch (error) {
      notify(getApiErrorMessage(error, "Không thể tải dữ liệu đối trừ"), "error", 5000)
    } finally {
      setBusy(false)
    }
  }

  const pairs = useMemo(() => createPairs(sources, debts, kind, currency), [sources, debts, kind, currency])
  const plannedAmount = useMemo(() => pairs.reduce((sum, pair) => sum + pair.amount, 0), [pairs])
  const plannedFc = useMemo(() => pairs.reduce((sum, pair) => sum + pair.amountFc, 0), [pairs])

  // A newly checked row defaults to its entire outstanding balance. Existing manual
  // edits survive checking/unchecking other rows. Unchecking clears that row's amount.
  const updateSelection = (side: "source" | "debt", selectedRows: OffsetVoucher[]) => {
    const setter = side === "source" ? setSources : setDebts
    setter(previous => {
      const existing = new Map(previous.map(row => [toKey(row), row]))
      if (previous.length === selectedRows.length &&
          selectedRows.every(row => existing.has(toKey(row)))) return previous
      return selectedRows.map(row => existing.get(toKey(row)) ?? ({
        ...row,
        OFFSET_AMOUNT: decimals(Number(row.REMAINAMOUNT) || 0),
        OFFSET_AMOUNT_FC: currency === "VND" ? 0 : decimals(Number(row.REMAINAMOUNT_FC) || 0),
      }))
    })
  }

  const updateAmount = (side: "source" | "debt", row: OffsetVoucher,
                        field: "OFFSET_AMOUNT" | "OFFSET_AMOUNT_FC", value: number) => {
    const setter = side === "source" ? setSources : setDebts
    const maximum = decimals(Number(field === "OFFSET_AMOUNT" ? row.REMAINAMOUNT : row.REMAINAMOUNT_FC) || 0)
    const nextAmount = Number.isFinite(value) ? decimals(Math.min(Math.max(value, 0), maximum)) : 0
    setter(previous => {
      const current = previous.find(item => toKey(item) === toKey(row))
      if (!current || current[field] === nextAmount) return previous
      return previous.map(item => toKey(item) === toKey(row)
        ? { ...item, [field]: nextAmount } : item)
    })
  }

  const save = async () => {
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
    if (!window.confirm(`Lưu ${pairs.length} cặp ${kind === "CLEARING" ? "bù trừ" : "đối trừ"}?`)) return
    setBusy(true)
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
      setBusy(false)
      await refresh()
    }
  }

  const undo = async () => {
    if (!historySelected) return
    const recordId = kind === "COLLECT"
      ? historySelected.CHITCOLLECT_ID
      : historySelected.CHITPAYMENT_ID
    if (!recordId || recordId <= 0) {
      notify("Không xác định được ID quan hệ cần hoàn tác", "warning", 4000)
      return
    }
    if (!window.confirm("Bỏ đối trừ/bù trừ của quan hệ đã chọn?")) return
    setBusy(true)
    try {
      await deleteOffsetPair(kind, recordId)
      notify("Đã hoàn tác thành công", "success", 3000)
      setHistorySelected(null)
      setHistory(await loadOffsetHistory(filters()))
    } catch (error) {
      notify(getApiErrorMessage(error, "Hoàn tác thất bại"), "error", 5000)
    } finally {
      setBusy(false)
    }
  }

  const sourceRows = useMemo(() => normalize(available.SOURCES, sources), [available.SOURCES, sources])
  const debtRows = useMemo(() => normalize(available.DEBTS, debts), [available.DEBTS, debts])

  const grid = (rows: OffsetVoucher[], side: "source" | "debt", title: string) => {
    const chosen = side === "source" ? sources : debts
    const chosenKeys = new Set(chosen.map(toKey))
    const numberCell = (field: "OFFSET_AMOUNT" | "OFFSET_AMOUNT_FC") => (cell: { data: OffsetVoucher }) => {
      const row = cell.data as SelectedVoucher
      return (
        <NumberBox
          width="100%" min={0}
          max={Math.max(0, Number(field === "OFFSET_AMOUNT" ? row.REMAINAMOUNT : row.REMAINAMOUNT_FC) || 0)}
          value={row[field]} format={formatMoney} showSpinButtons={false}
          disabled={busy || !chosenKeys.has(toKey(row))}
          onValueChanged={event => updateAmount(side, row, field, Number(event.value ?? 0))}
        />
      )
    }
    return (
      <div className="min-h-0 flex-1 overflow-hidden rounded border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-1.5 text-sm font-semibold">
          <span>{title}</span>
          <span className="font-normal text-gray-500">
            Đã chọn {chosen.length} / {rows.length} chứng từ
          </span>
        </div>
        <DataGrid
          dataSource={rows} keyExpr="ROW_KEY" height={310} showBorders rowAlternationEnabled
          showColumnLines allowColumnResizing columnAutoWidth={false}
          selectedRowKeys={chosen.map(toKey)}
          onSelectionChanged={event => updateSelection(side, event.selectedRowsData as OffsetVoucher[])}
          noDataText={loaded ? "Không có chứng từ chưa đối trừ" : "Chọn bộ lọc và nhấn Xem"}
        >
          <Scrolling mode="standard" showScrollbar="always" />
          <Selection mode="multiple" showCheckBoxesMode="always" selectByClick />
          <Column dataField="CUSTOMER_NM_VIET" caption={t("CUSTOMER", "Đối tượng")} width={180} />
          <Column dataField="CHIT_NO" caption={t("CHIT_NO", "Số chứng từ")} width={125}
            calculateDisplayValue={(row: OffsetVoucher) => row.CHIT_ID < 0 ? "Số dư đầu kỳ" : row.CHIT_NO ?? ""} />
          <Column dataField="CHIT_YMD" caption={t("DATE", "Ngày")} width={110}
            customizeText={e => dateLabel(String(e.value ?? ""))} />
          <Column dataField="DESCRIPTION_VIET" caption={t("DESCRIPTION", "Diễn giải")} minWidth={210} />
          <Column dataField="AMOUNT" caption={t("AMOUNT", "Số tiền")} width={150}
            alignment="right" format={formatMoney} />
          <Column dataField="REMAINAMOUNT" caption={t("REMAINAMOUNT", "Số tiền chưa đối trừ")} width={165}
            alignment="right" format={formatMoney} />
          <Column dataField="OFFSET_AMOUNT" caption={t("OFFSET_AMOUNT", "Số tiền đối trừ")} width={175}
            alignment="right" cellRender={numberCell("OFFSET_AMOUNT")} />
          <Column dataField="FC_AMOUNT" caption={t("AMOUNT_FC", "Số tiền ngoại tệ")} width={145}
            alignment="right" format={formatMoney} visible={currency !== "VND"} />
          <Column dataField="REMAINAMOUNT_FC" caption={t("REMAINAMOUNT_FC", "Chưa đối trừ NT")} width={155}
            alignment="right" format={formatMoney} visible={currency !== "VND"} />
          <Column dataField="OFFSET_AMOUNT_FC" caption={t("OFFSET_AMOUNT_FC", "Đối trừ NT")} width={155}
            alignment="right" visible={currency !== "VND"} cellRender={numberCell("OFFSET_AMOUNT_FC")} />
          <Summary>
            <TotalItem column="AMOUNT" summaryType="sum" valueFormat={formatMoney} />
            <TotalItem column="REMAINAMOUNT" summaryType="sum" valueFormat={formatMoney} />
            <TotalItem column="OFFSET_AMOUNT" summaryType="sum" valueFormat={formatMoney} />
            {currency !== "VND" && <TotalItem column="OFFSET_AMOUNT_FC" summaryType="sum" valueFormat={formatMoney} />}
          </Summary>
        </DataGrid>
      </div>
    )
  }

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-auto bg-gray-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t("DEBT_OFFSET", "Đối trừ & Bù trừ chứng từ")}</h2>
            <div className="text-xs text-gray-500">{kinds[mainTab].description}</div>
          </div>
          <div className="flex gap-1 rounded border bg-white p-1 text-sm">
            {(["MATCH", "CLEARING"] as MainTab[]).map(tab => (
              <button key={tab} type="button" onClick={() => switchMain(tab)}
                className={`rounded px-4 py-1.5 ${mainTab === tab ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}>
                {kinds[tab].text}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2">
          <div className="flex gap-1 text-xs">
            {(["EXECUTE", "HISTORY"] as Panel[]).map(tab => (
              <button type="button" key={tab} onClick={() => switchSub(tab)}
                className={`rounded px-3 py-1.5 ${subTab === tab ? "bg-slate-700 text-white" : "bg-gray-100 text-gray-700"}`}>
                {tab === "EXECUTE" ? t("EXECUTE", "Thực hiện") : t("HISTORY_UNDO", "Lịch sử & Bỏ")}
              </button>
            ))}
          </div>
          {mainTab === "MATCH" && <SelectBox items={[
            { value: "PAYMENT", text: "Thanh toán phải trả 331" },
            { value: "COLLECT", text: "Thu tiền phải thu 131" },
          ]} valueExpr="value" displayExpr="text" value={matchKind}
            onValueChanged={e => { setMatchKind(e.value); reset() }} width={205} />}
          <DateBox type="date" displayFormat="dd/MM/yyyy" value={fromDate} width={130}
            onValueChanged={e => { setFromDate(e.value ? new Date(e.value) : null); reset() }} />
          <span className="text-xs text-gray-500">—</span>
          <DateBox type="date" displayFormat="dd/MM/yyyy" value={toDate} width={130}
            onValueChanged={e => { setToDate(e.value ? new Date(e.value) : null); reset() }} />
          <SelectBox dataSource={customerLookupStore} valueExpr="CUSTOMER_ID" displayExpr="CUSTOMER_NM_VIET"
            value={customerId} showClearButton searchEnabled placeholder="Tất cả đối tượng" width={205}
            onValueChanged={e => { setCustomerId(e.value ?? null); reset() }} />
          <SelectBox items={currencyOptions} value={currency} width={95}
            onValueChanged={e => { setCurrency(e.value); reset() }} />
          <Button text={t("VIEW", "Xem")} icon="search" type="default" stylingMode="contained"
            disabled={busy} onClick={() => void refresh()} />
          {busy && <span className="text-xs text-blue-600">Đang xử lý...</span>}
        </div>
        {subTab === "EXECUTE" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-200 bg-white px-3 py-2">
              <div className="text-xs text-gray-600">
                Tick chứng từ để tự điền số tiền chưa đối trừ; có thể sửa trực tiếp ở cột <strong>Số tiền đối trừ</strong>.
                <span className="ml-3 font-semibold text-gray-800">
                  Sẽ ghi nhận: {plannedAmount.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} VND
                  {currency !== "VND" ? ` / ${plannedFc.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ${currency}` : ""}
                </span>
              </div>
              <Button text={t("SAVE", mainTab === "CLEARING" ? "Lưu bù trừ" : "Lưu đối trừ")}
                type="success" icon="save" disabled={busy || !pairs.length} onClick={() => void save()} />
            </div>
            {grid(sourceRows, "source", mainTab === "CLEARING" ? "Nguồn: Phải thu 131" : "Nguồn: Chứng từ thanh toán / thu")}
            {grid(debtRows, "debt", mainTab === "CLEARING" ? "Công nợ: Phải trả 331" : "Công nợ cần đối trừ")}
          </>
        ) : (
          <div className="min-h-0 flex-1 rounded border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2">
              <span className="text-sm font-semibold">{mainTab === "CLEARING" ? "Lịch sử bù trừ" : "Lịch sử đối trừ"}</span>
              <Button text={t("UNDO", "Bỏ đối trừ")} type="danger" icon="revert"
                disabled={busy || !historySelected} onClick={() => void undo()} />
            </div>
            <DataGrid dataSource={history} height={500} showBorders rowAlternationEnabled
              columnAutoWidth={false} keyExpr={kind === "COLLECT" ? "CHITCOLLECT_ID" : "CHITPAYMENT_ID"}
              selectedRowKeys={historySelected ? [kind === "COLLECT" ? historySelected.CHITCOLLECT_ID : historySelected.CHITPAYMENT_ID] : []}
              onSelectionChanged={e => setHistorySelected((e.selectedRowsData?.[0] as OffsetHistory | undefined) ?? null)}
              noDataText={loaded ? "Không có quan hệ trong khoảng thời gian" : "Chọn bộ lọc và nhấn Xem"}>
              <Scrolling mode="standard" showScrollbar="always" />
              <Selection mode="single" selectByClick showCheckBoxesMode="always" />
              <Column dataField="CUSTOMER_NM_VIET" caption="Đối tượng" width={190} />
              <Column dataField="CHIT_NO_PAY" caption="Chứng từ nguồn" width={145}
                calculateDisplayValue={(row: OffsetHistory) => row.CHIT_ID_PAY < 0 ? "Số dư đầu kỳ" : row.CHIT_NO_PAY ?? ""} />
              <Column dataField="CHIT_YMD_PAY" caption="Ngày nguồn" width={110}
                customizeText={e => dateLabel(String(e.value ?? ""))} />
              <Column dataField="CHIT_NO_DEBT" caption="Chứng từ công nợ" width={145}
                calculateDisplayValue={(row: OffsetHistory) => row.CHIT_ID_DEBT < 0 ? "Số dư đầu kỳ" : row.CHIT_NO_DEBT ?? ""} />
              <Column dataField="CHIT_YMD_DEBT" caption="Ngày công nợ" width={110}
                customizeText={e => dateLabel(String(e.value ?? ""))} />
              <Column dataField="PAYAMOUNT" caption="Tiền VND" width={155} alignment="right" format={formatMoney} />
              <Column dataField="PAYAMOUNT_FC" caption="Tiền ngoại tệ" width={145} alignment="right" format={formatMoney} visible={currency !== "VND"} />
              <Summary><TotalItem column="PAYAMOUNT" summaryType="sum" valueFormat={formatMoney} /></Summary>
            </DataGrid>
          </div>
        )}
      </div>
    </DxPage>
  )
}
