import { useContext, useEffect, useRef, useState } from "react"
import Button from "devextreme-react/button"
import DataGrid, { Column, Editing, KeyboardNavigation, Paging, Scrolling, RequiredRule, CustomRule, Toolbar } from "devextreme-react/data-grid"
import Popup from "devextreme-react/popup"
import type dxDataGrid from "devextreme/ui/data_grid"
import notify from "devextreme/ui/notify"
import AccountGridLookupCellEditor from "@/components/lookup/AccountGridLookupCellEditor"
import { LanguageContext } from "@/lib/i18nLoader"
import { createReviewRows, updateReviewAmount, type VatVoucherReviewDraft, type VatVoucherReviewRow } from "./vatVoucherReviewModel"

type Props = {
  drafts: VatVoucherReviewDraft[]
  cogsEnabled: boolean
  onApply: (posting: VatVoucherReviewRow[], cogs: VatVoucherReviewRow[]) => void
  onClose: () => void
}

export default function VatInOutBulkEditVoucherPopup({ drafts, cogsEnabled, onApply, onClose }: Props) {
  const { translate } = useContext(LanguageContext)
  const t = (key: string, fallback: string) => translate(key, fallback)
  const [tab, setTab] = useState<"posting" | "cogs">("posting")
  const activeTab = cogsEnabled ? tab : "posting"
  const [posting] = useState(() => createReviewRows(drafts, "posting"))
  const [cogs] = useState(() => createReviewRows(drafts, "cogs"))
  const postingGrid = useRef<dxDataGrid<VatVoucherReviewRow, string> | null>(null)
  const cogsGrid = useRef<dxDataGrid<VatVoucherReviewRow, string> | null>(null)
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void (activeTab === "posting" ? postingGrid : cogsGrid).current?.updateDimensions()
  }, [activeTab])

  const apply = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      for (const [key, grid] of [["posting", postingGrid.current], ["cogs", cogsGrid.current]] as const) {
        if (!grid) continue
        await grid.saveEditData()
        if (grid.hasEditData()) {
          setTab(key)
          return
        }
      }
      const postingRows = await postingGrid.current?.getDataSource().store().load()
      const cogsRows = await cogsGrid.current?.getDataSource().store().load()
      onApply(Array.isArray(postingRows) ? postingRows : posting, Array.isArray(cogsRows) ? cogsRows : cogs)
    } catch (error) {
      notify(error instanceof Error ? error.message : t("SAVE_FAILED", "Không cập nhật được bản nháp."), "error", 4000)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return <Popup visible title={t("VAT_REVIEW_VOUCHERS", "Kiểm tra chứng từ")} width="96vw" height="92vh"
    container="body" hideOnOutsideClick={false} dragEnabled={false} showCloseButton={!busy}
    onHiding={(event) => { if (busyRef.current) event.cancel = true; else onClose() }}>
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div role="tablist" className="flex gap-2 border-b">
        {([['cogs', t("INVENTORY_COGS", "Giá vốn")], ['posting', t("VAT_POSTING_TAB", "Hạch toán")]] as const).filter(([key]) => key !== "cogs" || cogsEnabled).map(([key, label]) =>
          <button key={key} type="button" role="tab" aria-selected={activeTab === key} disabled={busy}
            className={`border-b-2 px-4 py-2 ${activeTab === key ? "border-sky-600 text-sky-700" : "border-transparent"}`}
            onClick={() => setTab(key)}>{label}</button>)}
      </div>
      {(["posting", "cogs"] as const).filter((key) => key !== "cogs" || cogsEnabled).map((key) => <div key={key} role="tabpanel"
        className="min-h-0 flex-1" style={{ display: activeTab === key ? "flex" : "none", flexDirection: "column" }}>
          <DataGrid<VatVoucherReviewRow, string> dataSource={key === "posting" ? posting : cogs} keyExpr="reviewKey"
            height="100%" showBorders columnAutoWidth repaintChangesOnly
            onInitialized={(event) => { (key === "posting" ? postingGrid : cogsGrid).current = event.component ?? null }}
            onEditorPreparing={(event) => {
              if (event.parentType === "dataRow" && (event.row?.data?.locked || busyRef.current)) event.editorOptions.disabled = true
            }}
            onEditingStart={(event) => { if (event.data.locked || busyRef.current) event.cancel = true }}>
            <Editing mode="batch" allowUpdating={!busy} startEditAction="click" selectTextOnEditStart />
            <KeyboardNavigation enterKeyAction="moveFocus" enterKeyDirection="column" editOnKeyPress />
            <Toolbar visible={false} />
            <Paging enabled={false} />
            <Scrolling mode="virtual" />
            <Column dataField="invoiceLabel" caption={t("VAT_INVOICE_NUMBER", "Hóa đơn")} allowEditing={false} minWidth={220} fixed />
            <Column dataField="CUSTOMER_CD" caption={t("CUSTOMER_CD", "Mã khách hàng")} allowEditing={false} width={130} />
            <Column dataField="DETAIL_DESCRIPTION_VIET" caption={t("DESCRIPTION", "Diễn giải")} allowEditing={false} minWidth={230} />
            {(["DEBIT", "CREDIT"] as const).map((field) => <Column key={field} dataField={field}
              caption={t(field, field === "DEBIT" ? "TK Nợ" : "TK Có")} width={150}
              editCellRender={(cell) => <AccountGridLookupCellEditor value={cell.value} rowIndex={cell.rowIndex}
                grid={cell.component} setValue={cell.setValue} codeField={field} idField="ACC_ID"
                multilingualNameFieldPrefix={`${field}_NM`} focusNextColumnOnSelect />} />)}
            <Column dataField="ACC_ID" visible={false} />
            {(["DEBIT", "CREDIT"] as const).flatMap((field) => ["VIET", "ENG", "KOR", "CHINA"].map((language) =>
              <Column key={`${field}_${language}`} dataField={`${field}_NM_${language}`} visible={false} />))}
            <Column dataField="AMOUNT" caption={t("AMOUNT", "Số tiền")} dataType="number" format="#,##0.##" width={180}
              setCellValue={(data, value: number, current: VatVoucherReviewRow) => Object.assign(data, updateReviewAmount(current, value))}>
              <RequiredRule />
              <CustomRule message="Số tiền phải là số hợp lệ." validationCallback={(event) => typeof event.value === "number" && Number.isFinite(event.value)} />
            </Column>
            <Column dataField="FC_TYPE" caption={t("FC_TYPE", "Loại tiền")} allowEditing={false} width={100} />
            <Column dataField="FC_RATE" caption={t("FC_RATE", "Tỷ giá")} allowEditing={false} dataType="number" width={110} />
            <Column dataField="FC_AMOUNT" caption={t("FC_AMOUNT", "Nguyên tệ")} allowEditing={false} dataType="number" format="#,##0.##" width={160} />
          </DataGrid>
      </div>)}
      <div className="flex justify-end gap-3 border-t pt-3">
        <Button text={t("OK", "Đồng ý")} type="default" disabled={busy} onClick={() => void apply()} />
        <Button text={t("CANCEL", "Hủy")} disabled={busy} onClick={onClose} />
      </div>
    </div>
  </Popup>
}
