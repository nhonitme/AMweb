import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import DataGrid, { Column, Editing, Lookup, Selection } from "devextreme-react/data-grid"
import type dxDataGrid from "devextreme/ui/data_grid"
import SelectBox from "devextreme-react/select-box"
import NumberBox from "devextreme-react/number-box"
import Button from "devextreme-react/button"
import notify from "devextreme/ui/notify"
import * as XLSX from "xlsx"
import type { ClientExcelImportContext, ExcelImportResponse } from "@/api/excelApi"
import { getLatestInputStoresByProductIds } from "@/api/inventoryVoucherApi"
import { getProducts } from "@/api/productApi"
import { getStoreInfos } from "@/api/storeAPI"
import { getProductMaterials } from "@/api/productMaterialApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup"
import { disableBuiltInPopupEscape, usePopupEscapeLayer } from "@/components/popup/popupEscapeStack"
import EditorActionToolbar from "@/components/toolbar/EditorActionToolbar"
import { LanguageContext } from "@/lib/i18nLoader"
import { createPopupShortcutWrapperAttr, usePopupShortcutScopeId } from "@/lib/popupShortcutScope"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { Product } from "@/types/product"
import type { StoreInfo } from "@/types/store"
import type { InventoryBomFinishedRow, InventoryBomMaterialRow, InventoryBomSnapshot } from "@/types/voucher"
import "./InventoryBomAllocationPopup.css"

interface Props {
  companyCd: string
  visible: boolean
  disabled?: boolean
  initial?: InventoryBomSnapshot | null
  onClose: () => void
  onConfirm: (snapshot: InventoryBomSnapshot) => void
}

const newKey = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
const qty = (value: unknown): number => Number(value ?? 0)

export default function InventoryBomAllocationPopup({
  companyCd, visible, disabled = false, initial, onClose, onConfirm,
}: Props) {
  const { translate } = useContext(LanguageContext)
  const t = useCallback((key: string, fallback: string) => translate(key, fallback), [translate])
  const finishedGridRef = useRef<dxDataGrid | null>(null)
  const materialGridRef = useRef<dxDataGrid | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [materialProducts, setMaterialProducts] = useState<Product[]>([])
  const [finished, setFinished] = useState<InventoryBomFinishedRow[]>([])
  const [materials, setMaterials] = useState<InventoryBomMaterialRow[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [finishedQuantity, setFinishedQuantity] = useState(1)
  const [selectedFinishedKeys, setSelectedFinishedKeys] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [requiresRecalculation, setRequiresRecalculation] = useState(false)
  const [importVisible, setImportVisible] = useState(false)

  useEffect(() => {
    if (!visible) {
      setImportVisible(false)
      return
    }
    setFinished((initial?.FINISHED ?? []).map(row => ({ ...row })))
    setMaterials((initial?.MATERIALS ?? []).map(row => ({ ...row })))
    setSelectedFinishedKeys([])
    setRequiresRecalculation(false)
    setImportVisible(false)
    let cancelled = false
    void Promise.all([getProducts("155"), getProducts("152"), getStoreInfos()])
      .then(([list, rawMaterials, result]) => {
        if (!cancelled) { setProducts(list); setMaterialProducts(rawMaterials); setStores(result.data) }
      })
      .catch(error => { if (!cancelled) notify(getApiErrorMessage(error, "Không đọc được danh mục thành phẩm/kho"), "error", 4500) })
    return () => { cancelled = true }
  }, [visible, initial])

  const materialProductsById = useMemo(() => new Map(materialProducts.map(p => [p.PRODUCT_ID, p])), [materialProducts])
  const productsById = useMemo(() => new Map(products.map(p => [p.PRODUCT_ID, p])), [products])
  const productsByCode = useMemo(() => new Map(products.map(p => [p.PRODUCT_CD.trim().toUpperCase(), p])), [products])
  const storesById = useMemo(() => new Map(stores.map(s => [s.STORE_ID, s])), [stores])
  const controlsDisabled = busy || disabled

  const addFinished = useCallback((product: Product, amount: number) => {
    if (!(amount > 0) || !Number.isFinite(amount)) throw new Error("Số lượng thành phẩm phải lớn hơn 0.")
    setFinished(rows => [...rows, {
      CLIENT_KEY: newKey("FIN"), FINISHED_PRODUCT_ID: product.PRODUCT_ID,
      PRODUCT_CD: product.PRODUCT_CD, PRODUCT_NM_VIET: product.PRODUCT_NM_VIET,
      UNIT_CD: product.UNIT_CD ?? "", FINISHED_QUANTITY: amount, SORT: rows.length + 1,
    }])
    setRequiresRecalculation(true)
  }, [])

  const addSelected = () => {
    const product = productsById.get(Number(selectedProductId))
    if (!product) return notify(t("SELECT_PRODUCT", "Chọn thành phẩm"), "warning", 2500)
    try { addFinished(product, finishedQuantity) }
    catch (error) { notify(getApiErrorMessage(error, "Số lượng không hợp lệ"), "warning", 3000) }
  }

  const handleDownloadTemplate = useCallback(() => {
    const sheet = XLSX.utils.aoa_to_sheet([["PRODUCT_CD", "QUANTITY"]])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "Finished")
    XLSX.writeFile(book, "BOM_Finished_Template.xlsx")
  }, [])

  const handleImportFile = useCallback(async (file: File, context: ClientExcelImportContext): Promise<ExcelImportResponse> => {
    const book = XLSX.read(await file.arrayBuffer(), { type: "array" })
    const sheetName = context.sheetName || book.SheetNames[0]
    const sheet = book.Sheets[sheetName] ?? book.Sheets[book.SheetNames[0]]
    if (!sheet) {
      return {
        success: false,
        totalRows: 0,
        successRows: 0,
        warningRows: 0,
        errorRows: 1,
        message: t("IMPORT_EMPTY_FILE", "File Excel không có sheet dữ liệu"),
      }
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" })
    const next: InventoryBomFinishedRow[] = []
    const errorRows: NonNullable<ExcelImportResponse["rows"]> = []
    let dataRowCount = 0

    for (let i = 0; i < rows.length; i++) {
      const [codeRaw, amountRaw] = rows[i] ?? []
      const code = String(codeRaw ?? "").trim().toUpperCase()
      if (!code) continue
      if (i === 0 && ["PRODUCT_CD", "MA_TP", "MÃ THÀNH PHẨM", "MÃ TP"].includes(code)) continue

      dataRowCount += 1
      const product = productsByCode.get(code)
      if (!product) {
        errorRows.push({
          rowNo: i + 1,
          status: "ERROR",
          message: `${t("PRODUCT_NOT_FOUND", "Không tìm thấy thành phẩm")} ${code}`,
          sheetName,
        })
        continue
      }

      const amount = typeof amountRaw === "string"
        ? Number(amountRaw.trim().replace(/,/g, ""))
        : Number(amountRaw)
      if (!Number.isFinite(amount) || amount <= 0) {
        errorRows.push({
          rowNo: i + 1,
          status: "ERROR",
          message: t("BOM_INVALID_QUANTITY", "Số lượng thành phẩm phải lớn hơn 0"),
          sheetName,
        })
        continue
      }

      next.push({
        CLIENT_KEY: newKey("FIN"),
        FINISHED_PRODUCT_ID: product.PRODUCT_ID,
        PRODUCT_CD: product.PRODUCT_CD,
        PRODUCT_NM_VIET: product.PRODUCT_NM_VIET,
        UNIT_CD: product.UNIT_CD ?? "",
        FINISHED_QUANTITY: amount,
        SORT: next.length + 1,
      })
    }

    if (!next.length) {
      return {
        success: false,
        totalRows: dataRowCount,
        successRows: 0,
        warningRows: 0,
        errorRows: Math.max(errorRows.length, 1),
        message: t("BOM_IMPORT_NO_VALID_ROWS", "Không có thành phẩm hợp lệ trong Excel"),
        rows: errorRows,
        sheetName,
      }
    }

    setFinished(current => [...current, ...next.map((row, index) => ({ ...row, SORT: current.length + index + 1 }))])
    setRequiresRecalculation(true)

    return {
      success: true,
      totalRows: dataRowCount,
      successRows: next.length,
      warningRows: 0,
      errorRows: errorRows.length,
      message: errorRows.length
        ? t("BOM_IMPORT_PARTIAL", "Đã nạp các dòng hợp lệ; có dòng lỗi cần kiểm tra")
        : t("IMPORT_SUCCESS", "Đã tải danh sách thành phẩm"),
      rows: errorRows,
      sheetName,
    }
  }, [productsByCode, t])

  const deleteSelectedFinished = () => {
    const keys = new Set(selectedFinishedKeys)
    setFinished(rows => rows.filter(row => !keys.has(row.CLIENT_KEY)))
    // Cascade: drop Grid 2 rows tied to the deleted finished products.
    setMaterials(rows => rows.filter(row => !keys.has(row.FINISHED_CLIENT_KEY)))
    setSelectedFinishedKeys([])
  }

  const calculate = async () => {
    if (!finished.length) return notify(t("BOM_NO_FINISHED", "Chưa có thành phẩm"), "warning", 2500)
    if (finished.some(row => !(qty(row.FINISHED_QUANTITY) > 0)))
      return notify(t("BOM_INVALID_QUANTITY", "Số lượng thành phẩm phải lớn hơn 0"), "warning", 2500)
    setBusy(true)
    try {
      const keys = [...new Set(finished.map(row => row.FINISHED_PRODUCT_ID))]
      const result = await Promise.all(keys.map(async productId => [productId, await getProductMaterials(productId)] as const))
      const byProduct = new Map(result)
      const materialProductIds = [...new Set(
        result.flatMap(([, defs]) => defs.map(def => Number(def.MATERIAL_PRODUCT_ID))).filter(id => id > 0),
      )]
      // One batch lookup: latest inbound STORE_ID per material product (no per-row query).
      const latestStores = await getLatestInputStoresByProductIds(materialProductIds)
      const storeIdByProductId = new Map(latestStores.map(row => [Number(row.PRODUCT_ID), Number(row.STORE_ID)]))
      let sort = 0, missing = 0, missingStore = 0
      const next: InventoryBomMaterialRow[] = []
      finished.forEach(fin => {
        const definitions = byProduct.get(fin.FINISHED_PRODUCT_ID) ?? []
        if (!definitions.length) missing++
        definitions.forEach(def => {
          const total = Number((qty(fin.FINISHED_QUANTITY) * qty(def.QUANTITY)).toFixed(6))
          const storeId = storeIdByProductId.get(Number(def.MATERIAL_PRODUCT_ID)) ?? null
          if (!(Number(storeId) > 0)) missingStore++
          next.push({
            CLIENT_KEY: newKey("MAT"), FINISHED_CLIENT_KEY: fin.CLIENT_KEY,
            MATERIAL_PRODUCT_ID: def.MATERIAL_PRODUCT_ID,
            MATERIAL_PRODUCT_CD: def.MATERIAL_PRODUCT_CD,
            MATERIAL_PRODUCT_NM: def.MATERIAL_PRODUCT_NM,
            UNIT_CD: materialProductsById.get(def.MATERIAL_PRODUCT_ID)?.UNIT_CD ?? "",
            STORE_ID: storeId,
            BOM_QUANTITY: qty(def.QUANTITY), CALCULATED_QUANTITY: total,
            CONFIRMED_QUANTITY: total, OUTPUT_ID: null, OUTPUT_CLIENT_KEY: "",
            SORT: ++sort,
          })
        })
      })
      setMaterials(next)
      setRequiresRecalculation(false)
      if (missing) notify(`${missing} thành phẩm chưa khai báo định mức. Vui lòng kiểm tra Grid 1.`, "warning", 5000)
      else if (missingStore) notify(t("BOM_MISSING_INPUT_STORE", "Một số NVL chưa có lịch sử nhập kho để gán mã kho. Vui lòng chọn kho trên Grid 2."), "warning", 5000)
    } catch (error) { notify(getApiErrorMessage(error, "Không tính được định mức"), "error", 4500) }
    finally { setBusy(false) }
  }

  const confirmAllocation = async () => {
    // Commit any active DevExtreme cell editor before reading the snapshot.
    await finishedGridRef.current?.saveEditData()
    await materialGridRef.current?.saveEditData()
    const finalFinished = (finishedGridRef.current?.getDataSource()?.items() ?? finished) as InventoryBomFinishedRow[]
    const finalMaterials = (materialGridRef.current?.getDataSource()?.items() ?? materials) as InventoryBomMaterialRow[]
    if (requiresRecalculation) return notify(t("BOM_RECALCULATE", "Danh sách đã thay đổi, cần Tính lại trước khi xác nhận"), "warning", 4000)
    if (!finalFinished.length || !finalMaterials.length) return notify(t("BOM_EMPTY", "Chưa có kết quả định mức"), "warning", 2500)
    if (finalMaterials.some(m => !finalFinished.some(f => f.CLIENT_KEY === m.FINISHED_CLIENT_KEY)))
      return notify("Dòng nguyên vật liệu không có thành phẩm tương ứng", "error", 3000)
    const confirmed = finalMaterials.filter(m => qty(m.CONFIRMED_QUANTITY) > 0)
    if (!confirmed.length) return notify("Không có nguyên vật liệu có số lượng xuất hợp lệ", "warning", 3000)
    if (confirmed.some(m => !(qty(m.STORE_ID) > 0) || !storesById.has(Number(m.STORE_ID))))
      return notify("Vui lòng chọn kho xuất cho mọi dòng NVL cần xuất", "warning", 4000)
    onConfirm({
      FINISHED: finalFinished.map((row, i) => ({ ...row, SORT: i + 1 })),
      MATERIALS: finalMaterials.map((row, i) => {
        const store = storesById.get(Number(row.STORE_ID))
        const materialProduct = materialProductsById.get(row.MATERIAL_PRODUCT_ID)
        return { ...row, STORE_CD: store?.STORE_CD ?? "", STORE_NM_VIET: store?.STORE_NM_VIET ?? "",
          UNIT_ID: materialProduct?.UNIT_ID ?? null, UNIT_CD: materialProduct?.UNIT_CD ?? row.UNIT_CD, SORT: i + 1 }
      }),
    })
  }

  const popupShortcutScopeId = usePopupShortcutScopeId("inventory-bom-allocation")
  const handleClose = useCallback(() => {
    if (!busy) onClose()
  }, [busy, onClose])

  usePopupEscapeLayer(
    visible,
    handleClose,
    () => document.querySelector<HTMLElement>(`[data-popup-shortcut-scope="${popupShortcutScopeId}"]`),
  )

  return (
    <Popup
      visible={visible}
      onShown={(event) => {
        disableBuiltInPopupEscape(event.component)
      }}
      title={t("BOM_ALLOCATION", "Phân bổ nguyên vật liệu theo thành phẩm")}
      showTitle
      showCloseButton={false}
      onHiding={(event) => {
        if (busy) {
          event.cancel = true
          return
        }
        onClose()
      }}
      hideOnOutsideClick={!busy}
      dragEnabled={false}
      resizeEnabled={false}
      deferRendering={false}
      width="100vw"
      height="100vh"
      maxWidth="100vw"
      maxHeight="100vh"
      container="body"
      position={{ my: "center", at: "center", of: window }}
      animation={POPUP_FADE_ANIMATION}
      wrapperAttr={{
        class: "inventory-bom-allocation-popup editor-mode--edit",
        ...createPopupShortcutWrapperAttr(popupShortcutScopeId),
      }}
    >
      <ToolbarItem
        toolbar="top"
        location="after"
        render={() => (
          <div className="inventory-bom-allocation-title-actions flex items-center gap-1 rounded-lg bg-white shadow-sm">
            <Button
              icon="close"
              stylingMode="text"
              disabled={busy}
              hint={t("CANCEL", "Cancel")}
              onClick={handleClose}
            />
          </div>
        )}
      />
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#f3f4f6]">
        <div className="flex flex-shrink-0 flex-col gap-3 border-b border-[#dce0e5] bg-white px-4 py-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="inventory-bom-allocation-field-label">{t("FINISHED_PRODUCT", "Thành phẩm")}</label>
              <SelectBox
                dataSource={products}
                searchEnabled
                searchExpr={["PRODUCT_CD", "PRODUCT_NM_VIET"]}
                valueExpr="PRODUCT_ID"
                displayExpr={(item: Product) => item ? `${item.PRODUCT_CD} - ${item.PRODUCT_NM_VIET}` : ""}
                value={selectedProductId}
                onValueChanged={e => setSelectedProductId(e.value ?? null)}
                disabled={controlsDisabled}
                stylingMode="outlined"
                width={320}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="inventory-bom-allocation-field-label">{t("QUANTITY", "Số lượng")}</label>
              <NumberBox
                value={finishedQuantity}
                min={0.000001}
                showSpinButtons
                onValueChanged={e => setFinishedQuantity(Number(e.value ?? 0))}
                disabled={controlsDisabled}
                stylingMode="outlined"
                width={140}
              />
            </div>
            <Button
              text={t("ADD", "Thêm")}
              icon="plus"
              type="default"
              stylingMode="contained"
              elementAttr={{ class: "inventory-bom-allocation-toolbar-btn" }}
              onClick={addSelected}
              disabled={controlsDisabled}
            />
            <div className="ml-auto flex flex-wrap items-end gap-2">
              <Button
                text={t("BOM_EDIT_DEFINITION", "Cập nhật định mức")}
                icon="edit"
                type="normal"
                stylingMode="outlined"
                elementAttr={{ class: "inventory-bom-allocation-toolbar-btn" }}
                onClick={() => window.open(`/app/${encodeURIComponent(companyCd)}/cost/material-product`, "_blank", "noopener,noreferrer")}
              />
              <Button
                text={t("CALCULATE", "Tính lại")}
                icon="refresh"
                type="normal"
                stylingMode="outlined"
                elementAttr={{ class: "inventory-bom-allocation-toolbar-btn" }}
                onClick={() => void calculate()}
                disabled={controlsDisabled}
              />
              <Button
                text={t("IMPORT_EXCEL", "Import Excel")}
                icon="xlsxfile"
                type="normal"
                stylingMode="outlined"
                elementAttr={{ class: "inventory-bom-allocation-toolbar-btn" }}
                disabled={controlsDisabled}
                onClick={() => setImportVisible(true)}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
          <div className="flex min-h-0 flex-[2] flex-col overflow-hidden bg-white p-3">
            <div className="mb-2 flex flex-shrink-0 flex-wrap items-center gap-2">
              <div className="inventory-bom-allocation-section-title">
                {t("BOM_FINISHED_GRID", "Grid 1 – Thành phẩm")}
                <span className="ml-2 font-normal text-[#9da5b1]">({finished.length})</span>
              </div>
              <div className="ml-auto">
                <Button
                  text={t("DELETE_SELECTED", "Xóa đã chọn")}
                  icon="trash"
                  stylingMode="outlined"
                  disabled={controlsDisabled || !selectedFinishedKeys.length}
                  onClick={deleteSelectedFinished}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <DataGrid
                dataSource={finished}
                keyExpr="CLIENT_KEY"
                height="100%"
                showBorders
                columnAutoWidth
                onInitialized={e => { finishedGridRef.current = e.component }}
                selectedRowKeys={selectedFinishedKeys}
                onSelectionChanged={e => setSelectedFinishedKeys(e.selectedRowKeys.map(String))}
                onRowUpdated={e => {
                  setFinished(rows => rows.map(row => row.CLIENT_KEY === e.key ? { ...e.data } : row))
                  setRequiresRecalculation(true)
                }}
              >
                <Selection mode="multiple" showCheckBoxesMode="always" />
                <Editing mode="cell" allowUpdating={!controlsDisabled} />
                <Column dataField="PRODUCT_CD" caption={t("PRODUCT_CD", "Mã thành phẩm")} allowEditing={false} />
                <Column dataField="PRODUCT_NM_VIET" caption={t("PRODUCT_NM", "Tên thành phẩm")} allowEditing={false} />
                <Column dataField="UNIT_CD" caption={t("UNIT_CD", "ĐVT")} allowEditing={false} width={90} />
                <Column dataField="FINISHED_QUANTITY" caption={t("QUANTITY", "Số lượng")} dataType="number" width={140} />
              </DataGrid>
            </div>
          </div>

          <div className="flex min-h-0 flex-[3] flex-col overflow-hidden bg-white p-3">
            <div className="mb-2 flex flex-shrink-0 flex-wrap items-center gap-2">
              <div className="inventory-bom-allocation-section-title">
                {t("BOM_MATERIAL_GRID", "Grid 2 – Định mức nguyên vật liệu")}
                <span className="ml-2 font-normal text-[#9da5b1]">({materials.length})</span>
              </div>
              {requiresRecalculation ? (
                <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {t("BOM_RECALCULATE", "Cần Tính lại")}
                </span>
              ) : null}
            </div>
            <div className="min-h-0 flex-1">
              <DataGrid
                dataSource={materials}
                keyExpr="CLIENT_KEY"
                height="100%"
                showBorders
                columnAutoWidth
                onInitialized={e => { materialGridRef.current = e.component }}
                onRowUpdating={e => {
                  if ("BOM_QUANTITY" in e.newData) {
                    const parent = finished.find(f => f.CLIENT_KEY === e.oldData.FINISHED_CLIENT_KEY)
                    const calculated = Number((qty(parent?.FINISHED_QUANTITY) * qty(e.newData.BOM_QUANTITY)).toFixed(6))
                    e.newData.CALCULATED_QUANTITY = calculated
                    e.newData.CONFIRMED_QUANTITY = calculated
                  }
                }}
                onRowUpdated={e => setMaterials(rows => rows.map(row => row.CLIENT_KEY === e.key ? { ...e.data } : row))}
              >
                <Editing mode="cell" allowUpdating={!controlsDisabled} />
                <Column
                  dataField="FINISHED_CLIENT_KEY"
                  caption={t("FINISHED_PRODUCT", "Thành phẩm")}
                  calculateDisplayValue={(row: InventoryBomMaterialRow) => finished.find(f => f.CLIENT_KEY === row.FINISHED_CLIENT_KEY)?.PRODUCT_CD ?? ""}
                  allowEditing={false}
                  width={140}
                />
                <Column dataField="MATERIAL_PRODUCT_CD" caption={t("MATERIAL_PRODUCT_CD", "Mã NVL")} allowEditing={false} width={140} />
                <Column dataField="MATERIAL_PRODUCT_NM" caption={t("MATERIAL_PRODUCT_NM", "Tên NVL")} allowEditing={false} />
                <Column dataField="UNIT_CD" caption={t("UNIT_CD", "ĐVT")} allowEditing={false} width={90} />
                <Column dataField="STORE_ID" caption={t("STORE_CD", "Kho xuất")} width={120}>
                  <Lookup dataSource={stores} valueExpr="STORE_ID" displayExpr="STORE_CD" />
                </Column>
                <Column dataField="BOM_QUANTITY" caption={t("BOM_QUANTITY", "Định mức / TP")} dataType="number" width={130} />
                <Column dataField="CALCULATED_QUANTITY" caption={t("CALCULATED_QUANTITY", "Số lượng tính")} dataType="number" allowEditing={false} width={130} />
                <Column dataField="CONFIRMED_QUANTITY" caption={t("CONFIRMED_QUANTITY", "Số lượng xác nhận")} dataType="number" width={150} />
              </DataGrid>
            </div>
          </div>
        </div>

        <EditorActionToolbar
          mode="edit"
          className="inventory-bom-allocation-footer border-t border-gray-200 bg-white px-4 py-3"
          busy={busy}
          actions={[
            {
              key: "save",
              text: t("CONFIRM", "Xác nhận"),
              icon: "check",
              disabled: controlsDisabled || requiresRecalculation,
              onClick: () => { void confirmAllocation() },
            },
            {
              key: "close",
              text: t("CANCEL", "Hủy"),
              onClick: handleClose,
            },
          ]}
        />
      </div>

      <BaseExcelImportPopup
        visible={importVisible}
        onClose={() => setImportVisible(false)}
        title={t("BOM_IMPORT_TITLE", "Import thành phẩm từ Excel")}
        description={t("BOM_IMPORT_DESC", "Cột PRODUCT_CD và QUANTITY. Tải file mẫu trong form import.")}
        onImportFile={handleImportFile}
        onDownloadTemplate={handleDownloadTemplate}
        templateFileName="BOM_Finished_Template"
        onImported={() => setImportVisible(false)}
        closeAfterSuccess
        importMode="client"
        showTemplateDownload
        showSheetSelector
        popupContainer="body"
      />
    </Popup>
  )
}
