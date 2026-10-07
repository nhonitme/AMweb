import { useCallback, useContext, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import DataGrid, { Column, Selection, type DataGridTypes } from "devextreme-react/data-grid"
import DropDownButton from "devextreme-react/drop-down-button"
import LoadPanel from "devextreme-react/load-panel"
import Popup from "devextreme-react/popup"
import notify from "devextreme/ui/notify"

import { DateRangeBox } from "@/components/toolbar/DateRangeBox"
import { LanguageContext } from "@/lib/i18nLoader"
import { formatYmdForDisplay } from "@/pages/Accounting/accountingDateUtils"
import type { InventoryAccountingReferenceOption } from "@/pages/VoucherManagement/components/chitEditorConstants"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import {
  autoMatchByAmount,
  type LinkAmountCandidate,
  type LinkAmountPair,
  type LinkDetailCandidate,
} from "../inventoryAccountingLinkUtils"

export type LinkVouchersPreviewPopupProps = {
  visible: boolean
  loading: boolean
  applying: boolean
  /** Left: unlinked inventory vouchers */
  inventoryCandidates: LinkAmountCandidate[]
  /** Right: free accounting detail lines of selected vouchers */
  detailCandidates: LinkDetailCandidate[]
  pairs: LinkAmountPair[]
  onPairsChange: (pairs: LinkAmountPair[]) => void
  counterpartOptions: InventoryAccountingReferenceOption[]
  selectedOptionKey: string
  onOptionKeyChange: (optionKey: string) => void
  /** When set (accounting list flow), show IR/IO counterpart label instead of warehouse-oriented hints. */
  inventoryType?: "IR" | "IO" | null
  fromDate?: Date | null
  toDate?: Date | null
  onFromDateChange?: (value: Date | null) => void
  onToDateChange?: (value: Date | null) => void
  onRangeSearch?: () => void
  onConfirm: () => void
  onClose: () => void
}

function formatAmount(value: number): string {
  return Number(value ?? 0).toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function LinkVouchersPreviewPopup({
  visible,
  loading,
  applying,
  inventoryCandidates,
  detailCandidates,
  pairs,
  onPairsChange,
  counterpartOptions,
  selectedOptionKey,
  onOptionKeyChange,
  inventoryType = null,
  fromDate = null,
  toDate = null,
  onFromDateChange,
  onToDateChange,
  onRangeSearch,
  onConfirm,
  onClose,
}: LinkVouchersPreviewPopupProps) {
  const { translate } = useContext(LanguageContext)
  const t = useCallback((key: string, fallback: string) => translate(key, fallback), [translate])

  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null)
  const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null)

  const selectedOption =
    counterpartOptions.find((option) => option.optionKey === selectedOptionKey) ?? counterpartOptions[0] ?? null

  const accountingCounterpartLabel = useMemo(() => {
    if (inventoryType === "IR") {
      return t("LINK_VOUCHERS_WITH_INPUT", "Liên kết với phiếu nhập kho")
    }
    if (inventoryType === "IO") {
      return t("LINK_VOUCHERS_WITH_OUTPUT", "Liên kết với phiếu xuất kho")
    }
    return null
  }, [inventoryType, t])

  const pairedInventoryIds = useMemo(() => new Set(pairs.map((pair) => pair.inventory.chitId)), [pairs])
  const pairedDetailIds = useMemo(() => new Set(pairs.map((pair) => pair.detail.chitDetailId)), [pairs])

  const availableInventory = useMemo(
    () => inventoryCandidates.filter((item) => !pairedInventoryIds.has(item.chitId)),
    [inventoryCandidates, pairedInventoryIds],
  )
  const availableDetails = useMemo(
    () => detailCandidates.filter((item) => !pairedDetailIds.has(item.chitDetailId)),
    [detailCandidates, pairedDetailIds],
  )

  const pairRows = useMemo(
    () =>
      pairs.map((pair, index) => ({
        ROW_KEY: `${pair.inventory.chitId}:${pair.detail.chitDetailId}:${index}`,
        INVENTORY_NO: pair.inventory.chitNo,
        ACCOUNTING_NO: pair.detail.chitNo,
        DEBIT: pair.detail.debit,
        CREDIT: pair.detail.credit,
        INVENTORY_AMOUNT: pair.inventory.amount,
        DETAIL_AMOUNT: pair.detail.amount,
      })),
    [pairs],
  )

  const handleInventorySelectionChanged = useCallback((event: DataGridTypes.SelectionChangedEvent) => {
    const row = (event.selectedRowsData?.[0] as LinkAmountCandidate | undefined) ?? null
    setSelectedInventoryId(row ? Number(row.chitId) : null)
  }, [])

  const handleDetailSelectionChanged = useCallback((event: DataGridTypes.SelectionChangedEvent) => {
    const row = (event.selectedRowsData?.[0] as LinkDetailCandidate | undefined) ?? null
    setSelectedDetailId(row ? Number(row.chitDetailId) : null)
  }, [])

  const handleAddManualPair = useCallback(() => {
    const inventory = availableInventory.find((item) => item.chitId === selectedInventoryId) ?? null
    const detail = availableDetails.find((item) => item.chitDetailId === selectedDetailId) ?? null
    if (!inventory || !detail) {
      notify(t("LINK_VOUCHERS_SELECT_BOTH", "Chọn 1 phiếu kho và 1 dòng chứng từ kế toán"), "warning", 2500)
      return
    }

    onPairsChange([
      ...pairs,
      {
        inventory,
        detail,
        amount: inventory.amount,
      },
    ])
    setSelectedInventoryId(null)
    setSelectedDetailId(null)
  }, [availableDetails, availableInventory, onPairsChange, pairs, selectedDetailId, selectedInventoryId, t])

  const handleAutoMap = useCallback(() => {
    const matched = autoMatchByAmount(availableInventory, availableDetails)
    if (matched.pairs.length === 0) {
      notify(
        t(
          "LINK_VOUCHERS_NO_AMOUNT_MATCH",
          "Không có phiếu kho và dòng chứng từ cùng số tiền để liên kết",
        ),
        "warning",
        2500,
      )
      return
    }
    onPairsChange([...pairs, ...matched.pairs])
    setSelectedInventoryId(null)
    setSelectedDetailId(null)
  }, [availableDetails, availableInventory, onPairsChange, pairs, t])

  const handleRemovePair = useCallback(
    (rowKey: string) => {
      const next = pairs.filter(
        (pair, index) => `${pair.inventory.chitId}:${pair.detail.chitDetailId}:${index}` !== rowKey,
      )
      onPairsChange(next)
    },
    [onPairsChange, pairs],
  )

  const selectedInventory = useMemo(
    () => availableInventory.find((item) => item.chitId === selectedInventoryId) ?? null,
    [availableInventory, selectedInventoryId],
  )
  const selectedDetail = useMemo(
    () => availableDetails.find((item) => item.chitDetailId === selectedDetailId) ?? null,
    [availableDetails, selectedDetailId],
  )
  const canAddPair = !loading && !applying && selectedInventory != null && selectedDetail != null

  const addPairHint = useMemo(() => {
    if (selectedInventory == null && selectedDetail == null) {
      return t(
        "LINK_VOUCHERS_HINT_SELECT_BOTH",
        "Chọn 1 phiếu kho bên trái và 1 dòng chứng từ bên phải, rồi bấm Thêm liên kết",
      )
    }
    if (selectedInventory == null) {
      return t("LINK_VOUCHERS_HINT_SELECT_INVENTORY", "Chọn thêm 1 phiếu kho bên trái")
    }
    if (selectedDetail == null) {
      return t("LINK_VOUCHERS_HINT_SELECT_DETAIL", "Chọn thêm 1 dòng chứng từ bên phải")
    }
    return ""
  }, [selectedDetail, selectedInventory, t])

  return (
    <Popup
      visible={visible}
      title={t("LINK_VOUCHERS", "Liên kết phiếu kho")}
      showTitle
      showCloseButton={!applying}
      dragEnabled
      width={1100}
      height={720}
      maxWidth="96vw"
      maxHeight="94vh"
      animation={POPUP_FADE_ANIMATION}
      onHiding={() => {
        if (!applying) {
          onClose()
        }
      }}
    >
      <div className="relative flex h-full flex-col gap-3 p-3">
        <LoadPanel visible={loading || applying} showPane showIndicator shading />

        <div className="flex flex-wrap items-center gap-2">
          {onRangeSearch ? (
            <>
              <DateRangeBox
                fromDate={fromDate}
                toDate={toDate}
                fromPlaceholder={t("MSG_FROMDATE", "From Date")}
                toPlaceholder={t("MSG_TODATE", "To Date")}
                labelMode="floating"
                onFromDateChange={onFromDateChange}
                onToDateChange={onToDateChange}
                onEnter={onRangeSearch}
                width={150}
                className="flex flex-nowrap gap-2"
              />
              <Button
                type="default"
                stylingMode="contained"
                icon="search"
                text={t("MSG_BTNSER", "Tìm kiếm")}
                hint={t("LINK_VOUCHERS_SEARCH_INVENTORY", "Tìm phiếu kho theo ngày")}
                disabled={loading || applying}
                onClick={onRangeSearch}
              />
            </>
          ) : null}

          {counterpartOptions.length > 1 && selectedOption ? (
            <DropDownButton
              stylingMode="outlined"
              text={
                accountingCounterpartLabel ??
                t(selectedOption.hintKey, selectedOption.hintFallback)
              }
              items={counterpartOptions.map((option) => ({
                ...option,
                label: t(option.hintKey, option.hintFallback),
              }))}
              displayExpr="label"
              keyExpr="optionKey"
              disabled={loading || applying}
              onItemClick={(event) => {
                const option = event.itemData as InventoryAccountingReferenceOption | undefined
                if (option) {
                  onOptionKeyChange(option.optionKey)
                }
              }}
            />
          ) : selectedOption ? (
            <div className="text-sm font-medium text-slate-700">
              {accountingCounterpartLabel ?? t(selectedOption.hintKey, selectedOption.hintFallback)}
            </div>
          ) : null}

          <Button
            text={t("LINK_VOUCHERS_ADD_PAIR", "Thêm liên kết")}
            icon="plus"
            type={canAddPair ? "success" : "normal"}
            stylingMode={canAddPair ? "contained" : "outlined"}
            hint={addPairHint || t("LINK_VOUCHERS_ADD_PAIR", "Thêm liên kết")}
            disabled={!canAddPair}
            onClick={handleAddManualPair}
          />
          <Button
            text={t("LINK_VOUCHERS_AUTO_MAP", "Ghép tự động theo số tiền")}
            icon="preferences"
            type="default"
            stylingMode="outlined"
            disabled={loading || applying || availableInventory.length === 0 || availableDetails.length === 0}
            onClick={handleAutoMap}
          />
          <div className="text-sm text-slate-600">
            {t("LINK_VOUCHERS_PAIR_COUNT", "Số liên kết")}: <strong>{pairs.length}</strong>
          </div>
        </div>

        {addPairHint ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            {addPairHint}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-[1.2] grid-cols-2 gap-3">
          <div
            className={`flex min-h-0 flex-col overflow-hidden rounded border ${
              selectedInventory ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"
            }`}
          >
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {t("LINK_VOUCHERS_UNLINKED_INVENTORY", "Phiếu kho chưa liên kết")}
              {selectedInventory ? (
                <span className="ml-2 font-normal text-emerald-700">
                  {t("LINK_VOUCHERS_HINT_SELECTED", "Đã chọn")}
                </span>
              ) : (
                <span className="ml-2 font-normal text-slate-500">
                  {t("LINK_VOUCHERS_HINT_CLICK_ROW", "Bấm 1 dòng để chọn")}
                </span>
              )}
            </div>
            <DataGrid
              dataSource={availableInventory}
              keyExpr="chitId"
              showBorders={false}
              columnAutoWidth
              height="100%"
              hoverStateEnabled
              selectedRowKeys={selectedInventoryId != null ? [selectedInventoryId] : []}
              onSelectionChanged={handleInventorySelectionChanged}
              noDataText={t("NO_DATA", "Không có dữ liệu")}
            >
              <Selection mode="single" />
              <Column dataField="chitNo" caption={t("CHIT_NO", "Voucher No")} />
              <Column
                dataField="chitYmd"
                caption={t("CHIT_YMD", "Ngày giao dịch")}
                width={120}
                customizeText={(cell) => formatYmdForDisplay(cell.value == null ? null : String(cell.value))}
              />
              <Column
                dataField="amount"
                caption={t("AMOUNT", "Amount")}
                dataType="number"
                format="#,##0.00"
                width={120}
                customizeText={(cell) => formatAmount(Number(cell.value ?? 0))}
              />
            </DataGrid>
          </div>

          <div
            className={`flex min-h-0 flex-col overflow-hidden rounded border ${
              selectedDetail ? "border-emerald-300 ring-1 ring-emerald-200" : "border-slate-200"
            }`}
          >
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {t("LINK_VOUCHERS_FREE_DETAILS", "Dòng chứng từ chưa liên kết")}
              {selectedDetail ? (
                <span className="ml-2 font-normal text-emerald-700">
                  {t("LINK_VOUCHERS_HINT_SELECTED", "Đã chọn")}
                </span>
              ) : (
                <span className="ml-2 font-normal text-slate-500">
                  {t("LINK_VOUCHERS_HINT_CLICK_ROW", "Bấm 1 dòng để chọn")}
                </span>
              )}
            </div>
            <DataGrid
              dataSource={availableDetails}
              keyExpr="chitDetailId"
              showBorders={false}
              columnAutoWidth
              height="100%"
              hoverStateEnabled
              selectedRowKeys={selectedDetailId != null ? [selectedDetailId] : []}
              onSelectionChanged={handleDetailSelectionChanged}
              noDataText={t("NO_DATA", "Không có dữ liệu")}
            >
              <Selection mode="single" />
              <Column dataField="chitNo" caption={t("CHIT_NO", "Voucher No")} width={120} />
              <Column dataField="debit" caption={t("DEBIT", "TK Nợ")} width={90} />
              <Column dataField="credit" caption={t("CREDIT", "TK Có")} width={90} />
              <Column
                dataField="chitYmd"
                caption={t("CHIT_YMD", "Ngày giao dịch")}
                width={120}
                customizeText={(cell) => formatYmdForDisplay(cell.value == null ? null : String(cell.value))}
              />
              <Column
                dataField="amount"
                caption={t("AMOUNT", "Amount")}
                dataType="number"
                format="#,##0.00"
                width={120}
                customizeText={(cell) => formatAmount(Number(cell.value ?? 0))}
              />
            </DataGrid>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            {t("LINK_VOUCHERS_PAIRS", "Kết quả liên kết")}
          </div>
          <DataGrid
            dataSource={pairRows}
            keyExpr="ROW_KEY"
            showBorders={false}
            columnAutoWidth
            height="100%"
            noDataText={t("LINK_VOUCHERS_NO_PAIRS", "Chưa có liên kết")}
          >
            <Column dataField="INVENTORY_NO" caption={t("INVENTORY_VOUCHER_NO", "Số phiếu kho")} />
            <Column dataField="ACCOUNTING_NO" caption={t("ACCOUNTING_VOUCHER_NO", "Số chứng từ")} width={120} />
            <Column dataField="DEBIT" caption={t("DEBIT", "TK Nợ")} width={90} />
            <Column dataField="CREDIT" caption={t("CREDIT", "TK Có")} width={90} />
            <Column
              dataField="INVENTORY_AMOUNT"
              caption={t("INVENTORY_AMOUNT", "Tiền phiếu kho")}
              dataType="number"
              format="#,##0.00"
              customizeText={(cell) => formatAmount(Number(cell.value ?? 0))}
            />
            <Column
              dataField="DETAIL_AMOUNT"
              caption={t("DETAIL_AMOUNT", "Tiền dòng")}
              dataType="number"
              format="#,##0.00"
              customizeText={(cell) => formatAmount(Number(cell.value ?? 0))}
            />
            <Column
              type="buttons"
              width={70}
              buttons={[
                {
                  hint: t("DELETE", "Xóa"),
                  icon: "trash",
                  onClick: (event) => {
                    const rowKey = String(event.row?.key ?? "")
                    if (rowKey) {
                      handleRemovePair(rowKey)
                    }
                  },
                },
              ]}
            />
          </DataGrid>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <Button
            text={t("LINK_VOUCHERS_CONFIRM", "Xác nhận liên kết")}
            type="default"
            stylingMode="contained"
            disabled={loading || applying || pairs.length === 0}
            onClick={onConfirm}
          />
          <Button text={t("CANCEL", "Hủy")} stylingMode="outlined" disabled={applying} onClick={onClose} />
        </div>
      </div>
    </Popup>
  )
}
