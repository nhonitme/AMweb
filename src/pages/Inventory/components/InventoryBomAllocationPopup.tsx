import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import DataGrid, { Column, Editing, Lookup, Selection } from "devextreme-react/data-grid"
import type dxDataGrid from "devextreme/ui/data_grid"
import SelectBox from "devextreme-react/select-box"
import NumberBox from "devextreme-react/number-box"
import Button from "devextreme-react/button"
import notify from "devextreme/ui/notify"
import * as XLSX from "xlsx"
import { getProducts } from "@/api/productApi"
import { getStoreInfos } from "@/api/storeAPI"
import { getProductMaterials } from "@/api/productMaterialApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import EditorActionToolbar from "@/components/toolbar/EditorActionToolbar"
import { LanguageContext } from "@/lib/i18nLoader"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { Product } from "@/types/product"
import type { StoreInfo } from "@/types/store"
import type { InventoryBomFinishedRow, InventoryBomMaterialRow, InventoryBomSnapshot, InventoryOutputLine } from "@/types/voucher"
import "./InventoryBomAllocationPopup.css"

interface Props {
  companyCd: string
  visible: boolean
  disabled?: boolean
  initial?: InventoryBomSnapshot | null
  currentOutputs: InventoryOutputLine[]
  onClose: () => void
  onConfirm: (snapshot: InventoryBomSnapshot) => void
}

const newKey = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
const qty = (value: unknown): number => Number(value ?? 0)

export default function InventoryBomAllocationPopup({
  companyCd, visible, disabled = false, initial, currentOutputs, onClose, onConfirm,
}: Props) {
  const { translate } = useContext(LanguageContext)
  const t = useCallback((key: string, fallback: string) => translate(key, fallback), [translate])
  const finishedGridRef = useRef<dxDataGrid | null>(null)
  const materialGridRef = useRef<dxDataGrid | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [materialProducts, setMaterialProducts] = useState<Product[]>([])
  const [finished, setFinished] = useState<InventoryBomFinishedRow[]>([])
  const [materials, setMaterials] = useState<InventoryBomMaterialRow[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [finishedQuantity, setFinishedQuantity] = useState(1)
  const [selectedFinishedKeys, setSelectedFinishedKeys] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [requiresRecalculation, setRequiresRecalculation] = useState(false)

  useEffect(() => {
    if (!visible) return
    setFinished((initial?.FINISHED ?? []).map(row => ({ ...row })))
    setMaterials((initial?.MATERIALS ?? []).map(row => ({ ...row })))
    setSelectedFinishedKeys([])
    setRequiresRecalculation(false)
    const storeId = initial?.MATERIALS.find(row => Number(row.STORE_ID) > 0)?.STORE_ID
      ?? currentOutputs.find(row => !row.ISDEL && Number(row.STORE_ID) > 0)?.STORE_ID
    setSelectedStoreId(storeId ?? null)
    let cancelled = false
    void Promise.all([getProducts("155"), getProducts("152"), getStoreInfos()])
      .then(([list, rawMaterials, result]) => {
        if (!cancelled) { setProducts(list); setMaterialProducts(rawMaterials); setStores(result.data) }
      })
      .catch(error => { if (!cancelled) notify(getApiErrorMessage(error, "Không đọc được danh mục thành phẩm/kho"), "error", 4500) })
    return () => { cancelled = true }
    // currentOutputs is intentionally captured only when opening (never reset while editing).
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const importExcel = async (file: File) => {
    try {
      const book = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const sheet = book.Sheets[book.SheetNames[0]]
      if (!sheet) throw new Error("File Excel không có dữ liệu")
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" })
      const next: InventoryBomFinishedRow[] = []
      for (let i = 0; i < rows.length; i++) {
        const [codeRaw, amountRaw] = rows[i] ?? []
        const code = String(codeRaw ?? "").trim().toUpperCase()
        if (!code) continue
        if (i === 0 && ["PRODUCT_CD", "MA_TP", "MÃ THÀNH PHẨM", "MÃ TP"].includes(code)) continue
        const product = productsByCode.get(code)
        if (!product) throw new Error(`Dòng ${i + 1}: Không tìm thấy thành phẩm ${code}`)
        const amount = typeof amountRaw === "string"
          ? Number(amountRaw.trim().replace(/,/g, "")) : Number(amountRaw)
        if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Dòng ${i + 1}: Số lượng không hợp lệ`)
        next.push({
          CLIENT_KEY: newKey("FIN"), FINISHED_PRODUCT_ID: product.PRODUCT_ID,
          PRODUCT_CD: product.PRODUCT_CD, PRODUCT_NM_VIET: product.PRODUCT_NM_VIET,
          UNIT_CD: product.UNIT_CD ?? "", FINISHED_QUANTITY: amount, SORT: next.length + 1,
        })
      }
      if (!next.length) throw new Error("Không có thành phẩm hợp lệ trong Excel")
      setFinished(rows => [...rows, ...next.map((r, i) => ({ ...r, SORT: rows.length + i + 1 }))])
      setRequiresRecalculation(true)
      notify(t("IMPORT_SUCCESS", "Đã tải danh sách thành phẩm"), "success", 2500)
    } catch (error) { notify(getApiErrorMessage(error, "Không đọc được file Excel"), "error", 4500) }
  }

  const downloadTemplate = () => {
    const sheet = XLSX.utils.aoa_to_sheet([["PRODUCT_CD", "QUANTITY"]])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "Finished")
    XLSX.writeFile(book, "BOM_Finished_Template.xlsx")
  }

  const deleteSelectedFinished = () => {
    const keys = new Set(selectedFinishedKeys)
    setFinished(rows => rows.filter(row => !keys.has(row.CLIENT_KEY)))
    setSelectedFinishedKeys([])
    setRequiresRecalculation(true)
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
      let sort = 0, missing = 0
      const next: InventoryBomMaterialRow[] = []
      finished.forEach(fin => {
        const definitions = byProduct.get(fin.FINISHED_PRODUCT_ID) ?? []
        if (!definitions.length) missing++
        definitions.forEach(def => {
          const total = Number((qty(fin.FINISHED_QUANTITY) * qty(def.QUANTITY)).toFixed(6))
          next.push({
            CLIENT_KEY: newKey("MAT"), FINISHED_CLIENT_KEY: fin.CLIENT_KEY,
            MATERIAL_PRODUCT_ID: def.MATERIAL_PRODUCT_ID,
            MATERIAL_PRODUCT_CD: def.MATERIAL_PRODUCT_CD,
            MATERIAL_PRODUCT_NM: def.MATERIAL_PRODUCT_NM,
            UNIT_CD: materialProductsById.get(def.MATERIAL_PRODUCT_ID)?.UNIT_CD ?? "",
            STORE_ID: selectedStoreId,
            BOM_QUANTITY: qty(def.QUANTITY), CALCULATED_QUANTITY: total,
            CONFIRMED_QUANTITY: total, OUTPUT_ID: null, OUTPUT_CLIENT_KEY: "",
            SORT: ++sort,
          })
        })
      })
      setMaterials(next)
      setRequiresRecalculation(false)
      if (missing) notify(`${missing} thành phẩm chưa khai báo định mức. Vui lòng kiểm tra Grid 1.`, "warning", 5000)
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

  return (
    <Popup
      visible={visible}
      title={t("BOM_ALLOCATION", "Phân bổ nguyên vật liệu theo thành phẩm")}
      showTitle
      showCloseButton
      onHiding={onClose}
      hideOnOutsideClick={false}
      dragEnabled
      width="92vw"
      height="88vh"
      maxWidth="1500px"
      container="body"
      animation={POPUP_FADE_ANIMATION}
      wrapperAttr={{ class: "inventory-bom-allocation-popup" }}
    >
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#f3f4f6]">
        <div className="flex flex-shrink-0 flex-col gap-3 border-b border-[#dce0e5] bg-white px-4 py-3">
          <div className="flex flex-wrap items-end gap-2">
            <SelectBox
              dataSource={products}
              searchEnabled
              searchExpr={["PRODUCT_CD", "PRODUCT_NM_VIET"]}
              valueExpr="PRODUCT_ID"
              displayExpr={(item: Product) => item ? `${item.PRODUCT_CD} - ${item.PRODUCT_NM_VIET}` : ""}
              value={selectedProductId}
              onValueChanged={e => setSelectedProductId(e.value ?? null)}
              disabled={controlsDisabled}
              label={t("FINISHED_PRODUCT", "Thành phẩm")}
              labelMode="floating"
              stylingMode="outlined"
              width={320}
            />
            <NumberBox
              value={finishedQuantity}
              min={0.000001}
              showSpinButtons
              onValueChanged={e => setFinishedQuantity(Number(e.value ?? 0))}
              disabled={controlsDisabled}
              label={t("QUANTITY", "Số lượng")}
              labelMode="floating"
              stylingMode="outlined"
              width={140}
            />
            <Button
              text={t("ADD", "Thêm")}
              icon="plus"
              type="default"
              stylingMode="contained"
              onClick={addSelected}
              disabled={controlsDisabled}
            />
            <SelectBox
              dataSource={stores}
              valueExpr="STORE_ID"
              displayExpr="STORE_CD"
              searchEnabled
              value={selectedStoreId}
              onValueChanged={e => setSelectedStoreId(e.value ?? null)}
              disabled={controlsDisabled}
              label={t("STORE_CD", "Kho xuất NVL")}
              labelMode="floating"
              stylingMode="outlined"
              width={180}
            />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                text={t("BOM_EDIT_DEFINITION", "Cập nhật định mức")}
                icon="edit"
                stylingMode="outlined"
                onClick={() => window.open(`/app/${encodeURIComponent(companyCd)}/cost/material-product`, "_blank", "noopener,noreferrer")}
              />
              <Button
                text={t("CALCULATE", "Tính lại")}
                icon="refresh"
                type="default"
                stylingMode="outlined"
                onClick={() => void calculate()}
                disabled={controlsDisabled}
              />
              <Button
                text={t("EXPORT_TEMPLATE", "File mẫu")}
                icon="xlsxfile"
                stylingMode="outlined"
                onClick={downloadTemplate}
              />
              <Button
                text={t("IMPORT_EXCEL", "Tải Excel")}
                icon="upload"
                stylingMode="outlined"
                disabled={controlsDisabled}
                onClick={() => importInputRef.current?.click()}
              />
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={controlsDisabled}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) void importExcel(file)
                  e.target.value = ""
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          <div className="flex min-h-0 flex-[2] flex-col overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-sm font-semibold text-slate-700">
                {t("BOM_FINISHED_GRID", "Grid 1 – Thành phẩm")}
                <span className="ml-2 font-normal text-slate-500">({finished.length})</span>
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
            <div className="min-h-0 flex-1 p-2">
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

          <div className="flex min-h-0 flex-[3] flex-col overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-sm font-semibold text-slate-700">
                {t("BOM_MATERIAL_GRID", "Grid 2 – Định mức nguyên vật liệu")}
                <span className="ml-2 font-normal text-slate-500">({materials.length})</span>
              </div>
              {requiresRecalculation ? (
                <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {t("BOM_RECALCULATE", "Cần Tính lại")}
                </span>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 p-2">
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

        <div className="inventory-bom-allocation-footer flex flex-shrink-0 items-center justify-end gap-3 border-t bg-white px-4 py-3">
          <Button
            text={t("CANCEL", "Hủy")}
            icon="close"
            stylingMode="outlined"
            onClick={onClose}
            disabled={busy}
          />
          <Button
            text={t("CONFIRM", "Xác nhận")}
            icon="check"
            type="default"
            stylingMode="contained"
            elementAttr={{ class: "inventory-bom-allocation-confirm-btn" }}
            disabled={controlsDisabled || requiresRecalculation}
            onClick={() => { void confirmAllocation() }}
          />
        </div>
      </div>
    </Popup>
  )
}
