import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import DataGrid, { Column, Paging } from "devextreme-react/data-grid"
import type dxDataGrid from "devextreme/ui/data_grid"
import Button from "devextreme-react/button"
import TextBox from "devextreme-react/text-box"
import Popup from "devextreme-react/popup"
import SelectBox from "devextreme-react/select-box"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"

import DxPage from "@/dx/DxPage"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import { exportToExcel } from "@/lib/excelUtils"
import { useCurrentMenuExportName } from "@/hooks/useCurrentMenuExportName"
import type { ColumnConfig } from "@/types/table"
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup"
import { useProductMaterialAllImportConfig } from "./ProductMaterialImportConfig"
import { getProducts } from "@/api/productApi"
import {
  deleteProductMaterial,
  getProductMaterialSummary,
  getProductMaterials,
  saveProductMaterial,
} from "@/api/productMaterialApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { getCurrentCompanyCd } from "@/lib/login"
import { LanguageContext } from "@/lib/i18nLoader"
import type { Product } from "@/types/product"
import type { ProductMaterialRow } from "@/types/productMaterial"

const PRODUCT_DIVISION_FILTER = "155"
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 })
const matchText = (input: string) => input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

function readLoadedRows(result: unknown): ProductMaterialRow[] | null {
  if (Array.isArray(result)) return result as ProductMaterialRow[]
  if (result && typeof result === "object" && Array.isArray((result as { data?: unknown }).data)) {
    return (result as { data: ProductMaterialRow[] }).data
  }
  return null
}

function ProductMaterialContent() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback(
    (key: string, fallback: string) => translate?.(key, fallback) ?? fallback,
    [translate],
  )
  const companyCd = getCurrentCompanyCd()
  const exportName = useCurrentMenuExportName()
  const [products, setProducts] = useState<Product[]>([])
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [selectedId, setSelectedId] = useState(0)
  const [materials, setMaterials] = useState<ProductMaterialRow[]>([])
  const [search, setSearch] = useState("")
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [saving, setSaving] = useState(false)
  const [popupOpen, setPopupOpen] = useState(false)
  const [editId, setEditId] = useState(0)
  const [materialProductId, setMaterialProductId] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const gridRef = useRef<dxDataGrid | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const importAllConfig = useProductMaterialAllImportConfig()

  const refreshProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const [catalog, summary] = await Promise.all([
        getProducts(PRODUCT_DIVISION_FILTER),
        getProductMaterialSummary(),
      ])
      const sorted = [...catalog].sort((a, b) => a.PRODUCT_CD.localeCompare(b.PRODUCT_CD))
      const nextCounts: Record<number, number> = {}
      summary.forEach((item) => { nextCounts[item.PRODUCT_ID] = item.MATERIAL_COUNT })
      setProducts(sorted)
      setCounts(nextCounts)
      setSelectedId((current) => sorted.some((item) => item.PRODUCT_ID === current)
        ? current : (sorted[0]?.PRODUCT_ID ?? 0))
    } catch (error) {
      notify(getApiErrorMessage(error, t("PM_LOAD_PRODUCTS_FAILED", "Không tải được danh mục sản phẩm")), "error", 4000)
    } finally {
      setLoadingProducts(false)
    }
  }, [t])

  useEffect(() => { void refreshProducts() }, [refreshProducts, companyCd])

  useEffect(() => {
    let active = true
    if (!selectedId) {
      setMaterials([])
      return
    }
    setMaterials([])
    setLoadingDetails(true)
    void getProductMaterials(selectedId)
      .then((rows) => { if (active) setMaterials(rows) })
      .catch((error) => {
        if (active) notify(getApiErrorMessage(error, t("PM_LOAD_MATERIAL_FAILED", "Không tải được danh sách NVL")), "error", 4000)
      })
      .finally(() => { if (active) setLoadingDetails(false) })
    return () => { active = false }
  }, [selectedId, companyCd, t])

  const refreshCurrent = useCallback(async () => {
    if (!selectedId) return
    const [rows, summary] = await Promise.all([
      getProductMaterials(selectedId), getProductMaterialSummary(),
    ])
    setMaterials(rows)
    const nextCounts: Record<number, number> = {}
    summary.forEach((item) => { nextCounts[item.PRODUCT_ID] = item.MATERIAL_COUNT })
    setCounts(nextCounts)
  }, [selectedId])

  const product = useMemo(
    () => products.find((item) => item.PRODUCT_ID === selectedId),
    [products, selectedId],
  )

  const visibleProducts = useMemo(() => {
    const key = matchText(search.trim())
    return products.filter((item) => !key || matchText(
      item.PRODUCT_CD + " " + item.PRODUCT_NM_VIET,
    ).includes(key))
  }, [products, search])

  const materialOptions = useMemo(
    () => products.filter((item) => item.PRODUCT_ID !== selectedId).map((item) => ({
      ...item,
      DISPLAY: item.PRODUCT_CD + " - " + item.PRODUCT_NM_VIET,
    })),
    [products, selectedId],
  )

  function openAdd() {
    if (!selectedId) return
    setEditId(0)
    setMaterialProductId(0)
    setQuantity(1)
    setPopupOpen(true)
  }

  function openEdit(row: ProductMaterialRow) {
    setEditId(row.MATERIAL_ID)
    setMaterialProductId(row.MATERIAL_PRODUCT_ID)
    setQuantity(Number(row.QUANTITY))
    setPopupOpen(true)
  }

  async function handleSave() {
    if (!selectedId || !materialProductId || !Number.isFinite(quantity) || quantity <= 0) {
      notify(t("PM_VALIDATE_REQUIRED", "Vui lòng chọn nguyên vật liệu và nhập số lượng lớn hơn 0"), "warning", 3000)
      return
    }
    if (quantity > 999999999999.999999) {
      notify(t("PM_VALIDATE_LIMIT", "Số lượng vượt giới hạn DECIMAL(18,6)"), "warning", 3000)
      return
    }
    if (materials.some((row) =>
      row.MATERIAL_PRODUCT_ID === materialProductId && row.MATERIAL_ID !== editId)) {
      notify(t("PM_DUPLICATE_DECLARATION", "Nguyên vật liệu này đã được khai báo cho thành phẩm"), "warning", 3000)
      return
    }
    setSaving(true)
    try {
      await saveProductMaterial(editId, {
        PRODUCT_ID: selectedId,
        MATERIAL_PRODUCT_ID: materialProductId,
        QUANTITY: Number(quantity.toFixed(6)),
      })
      await refreshCurrent()
      setPopupOpen(false)
      notify(t("PM_SAVE_OK", "Lưu nguyên vật liệu thành công"), "success", 2500)
    } catch (error) {
      notify(getApiErrorMessage(error, t("PM_SAVE_FAILED", "Lưu nguyên vật liệu thất bại")), "error", 4000)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: ProductMaterialRow) {
    const ok = await confirm(
      t("PM_CONFIRM_DELETE", "Xóa NVL {0} khỏi thành phẩm này?").replace("{0}", row.MATERIAL_PRODUCT_CD),
      t("PM_DELETE_CONFIRM_TITLE", "Xác nhận xóa"),
    )
    if (!ok) return
    setSaving(true)
    try {
      await deleteProductMaterial(row.MATERIAL_ID)
      await refreshCurrent()
      notify(t("PM_DELETE_OK", "Xóa nguyên vật liệu thành công"), "success", 2500)
    } catch (error) {
      notify(getApiErrorMessage(error, t("PM_DELETE_FAILED", "Xóa nguyên vật liệu thất bại")), "error", 4000)
    } finally {
      setSaving(false)
    }
  }

  const handleExport = useCallback(async () => {
    if (!product) return

    const grid = gridRef.current
    const exportColumns: ColumnConfig[] = (grid?.getVisibleColumns() ?? []).flatMap((column, index) => {
      const dataField = typeof column.dataField === "string" ? column.dataField.trim() : ""
      if (!dataField) return []
      const width = typeof column.width === "number" && Number.isFinite(column.width) ? column.width : 120
      return [{
        id: dataField,
        dataField,
        displayName: typeof column.caption === "string" && column.caption.trim() ? column.caption : dataField,
        width,
        visible: column.visible !== false,
        pinned: Boolean(column.fixed),
        originalOrder: index,
      }]
    })

    if (exportColumns.length === 0) {
      notify(t("NO_COLUMNS_TO_EXPORT", "Không có cột hiển thị để xuất"), "warning", 2500)
      return
    }

    let rows = materials
    const dataSource = grid?.getDataSource()
    if (dataSource) {
      try {
        const loaded = await dataSource.store().load({
          filter: grid?.getCombinedFilter(true) || undefined,
          sort: dataSource.sort() || undefined,
        })
        rows = readLoadedRows(loaded) ?? materials
      } catch {
        rows = materials
      }
    }

    if (rows.length === 0) {
      notify(t("NO_DATA_TO_EXPORT", "Không có dữ liệu để xuất"), "warning", 2500)
      return
    }

    const excelRows = rows.map((row) => {
      const item: Record<string, unknown> = {}
      for (const column of exportColumns) {
        item[column.dataField] = row[column.dataField as keyof ProductMaterialRow] ?? ""
      }
      return item
    })

    const productCode = product.PRODUCT_CD.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    let fileName = "NVL_" + productCode + ".xlsx"
    let sheetName = "NguyenVatLieu"
    try {
      const menuFileName = exportName.fileName("xlsx")
      fileName = productCode
        ? menuFileName.replace(/\.xlsx$/i, () => "_" + productCode + ".xlsx")
        : menuFileName
      sheetName = exportName.sheetName()
    } catch {
      fileName = "NVL_" + productCode + ".xlsx"
    }

    try {
      await exportToExcel(excelRows, exportColumns, fileName, sheetName)
    } catch (error) {
      notify(getApiErrorMessage(error, t("EXPORT_FAILED", "Xuất Excel thất bại")), "error", 4000)
    }
  }, [exportName, materials, product, t])

  function openImport() {
    if (saving || popupOpen || importOpen) return
    setImportOpen(true)
  }

  return (
    <DxPage>
      <div className="flex h-full min-h-[540px] flex-col gap-3 bg-slate-50 p-3 lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col rounded-xl border border-slate-200 bg-white lg:w-[310px]">
          <div className="border-b border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">{t("PM_PRODUCT_LIST", "Danh sách thành phẩm")}</h2>
              <span className="text-xs text-slate-400">{t("PM_PRODUCT_COUNT", "{0} sản phẩm").replace("{0}", String(products.length))}</span>
            </div>
            <TextBox
              stylingMode="outlined"
              mode="search"
              placeholder={t("PM_SEARCH_PRODUCT", "Tìm mã / tên thành phẩm...")}
              value={search}
              showClearButton
              onValueChanged={(event) => setSearch(String(event.value ?? ""))}
            />
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {visibleProducts.map((item) => (
              <button key={item.PRODUCT_ID} disabled={saving || importOpen}
                onClick={() => setSelectedId(item.PRODUCT_ID)}
                className={"w-full rounded-lg border p-3 text-left transition " +
                  (item.PRODUCT_ID === selectedId
                    ? "border-blue-200 bg-blue-50"
                    : "border-transparent hover:bg-slate-50")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{item.PRODUCT_NM_VIET}</div>
                    <div className="mt-1 text-xs text-slate-400">{item.PRODUCT_CD} · {item.UNIT_NM ?? ""}</div>
                  </div>
                  <span className={"shrink-0 rounded px-1.5 py-0.5 text-[10px] " +
                    ((counts[item.PRODUCT_ID] ?? 0) > 0
                      ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400")}>
                    {(counts[item.PRODUCT_ID] ?? 0) > 0
                      ? t("PM_HAS_MATERIAL", "Có NVL")
                      : t("PM_NO_MATERIAL", "Chưa có")}
                  </span>
                </div>
              </button>
            ))}
            {!loadingProducts && visibleProducts.length === 0 &&
              <div className="p-4 text-center text-sm text-slate-400">{t("PM_PRODUCT_NOT_FOUND", "Không tìm thấy sản phẩm")}</div>}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("PM_SELECTED_PRODUCT", "Thành phẩm đang chọn")}</p>
            <h1 className="text-lg font-bold text-slate-800">
              {product ? product.PRODUCT_CD + "  " + product.PRODUCT_NM_VIET : t("PM_NO_PRODUCT_SELECTED", "Chưa chọn thành phẩm")}
            </h1>
            <p className="mt-1 text-xs text-slate-400">{t("PM_PRODUCT_UNIT_AND_COUNT", "ĐVT: {0} · Số NVL: {1}")
              .replace("{0}", product?.UNIT_NM ?? "—").replace("{1}", String(materials.length))}</p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <GridToolbar
                gridRef={gridRef}
                onAdd={openAdd}
                onRefresh={() => { void refreshProducts(); void refreshCurrent() }}
                onImport={openImport}
                onExportXlsx={handleExport}
                showDelete={false}
                showColumnChooser={false}
                showExportPdf={false}
                showSearch={false}
                importDisabled={saving || popupOpen || importOpen}
                exportXlsxDisabled={!selectedId || saving || loadingDetails}
                shortcutsEnabled={!popupOpen && !importOpen}
              />
            </div>

            <div className="min-h-[360px] flex-1">
              <DataGrid dataSource={materials} keyExpr="MATERIAL_ID"
                onInitialized={(event) => { gridRef.current = event.component ?? null }}
                showBorders columnAutoWidth={false} rowAlternationEnabled
                noDataText={loadingDetails
                  ? t("PM_MATERIAL_LOADING", "Đang tải nguyên vật liệu...")
                  : t("PM_MATERIAL_NOT_CONFIGURED", "Chưa khai báo nguyên vật liệu")}
                height="100%" width="100%">
                <Paging defaultPageSize={30} />
                <Column caption={t("PM_SEQUENCE", "STT")} width={52} alignment="center"
                  cellRender={(cell) => cell.rowIndex + 1} />
                <Column dataField="MATERIAL_PRODUCT_CD" caption={t("PM_MATERIAL_CODE", "Mã NVL")} width={200} />
                <Column dataField="MATERIAL_PRODUCT_NM" caption={t("PM_MATERIAL_NAME", "Nguyên vật liệu")}/>
                <Column dataField="UNIT_NM" caption={t("PM_UNIT", "ĐVT")} width={100} alignment="center" />
                <Column dataField="QUANTITY" caption={t("PM_QUANTITY", "Số lượng định mức")} width={160} alignment="right"
                  cellRender={(cell) => numberFormat.format(Number(cell.value) || 0)} />
                <Column caption={t("PM_ACTIONS", "Thao tác")} width={100} alignment="center" allowSorting={false}
                  cellRender={(cell) => (
                    <div className="flex items-center justify-center gap-3">
                      <Button icon="edit" hint={t("lblEdit", "Sửa")}
                        stylingMode="text" disabled={saving}
                        onClick={() => openEdit(cell.data as ProductMaterialRow)} />
                      <Button icon="trash" hint={t("lblDelete", "Xóa")}
                        stylingMode="text" type="danger" disabled={saving}
                        onClick={() => void handleDelete(cell.data as ProductMaterialRow)} />
                    </div>
                  )} />
              </DataGrid>
            </div>
          </div>
        </section>

        <Popup visible={popupOpen} showTitle title={editId ? t("PM_POPUP_EDIT", "Sửa nguyên vật liệu") : t("PM_POPUP_ADD", "Thêm nguyên vật liệu")}
          width={540} height="auto" dragEnabled={false} closeOnOutsideClick={!saving}
          onHiding={() => { if (!saving) setPopupOpen(false) }}>
          <form className="space-y-4 p-2" onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("PM_MATERIAL_NAME", "Nguyên vật liệu")} <span className="text-red-500">*</span></label>
              <SelectBox dataSource={materialOptions} valueExpr="PRODUCT_ID" displayExpr="DISPLAY"
                searchEnabled searchExpr={["PRODUCT_CD", "PRODUCT_NM_VIET"]}
                placeholder={t("PM_SEARCH_MATERIAL", "Tìm mã hoặc tên NVL")} value={materialProductId || null}
                onValueChanged={(event) => setMaterialProductId(Number(event.value ?? 0))}
                disabled={saving} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("PM_QUANTITY", "Số lượng định mức")} <span className="text-red-500">*</span></label>
              <input type="number" min="0.000001" max="999999999999.999999" step="0.000001"
                value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}
                disabled={saving} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button text={t("lblCancel", "Hủy")} stylingMode="outlined" type="normal"
                disabled={saving} onClick={() => setPopupOpen(false)} />
              <Button text={saving ? t("PM_SAVING", "Đang lưu...") : t("lblSave", "Lưu")}
                stylingMode="contained" type="default" disabled={saving}
                useSubmitBehavior />
            </div>
          </form>
        </Popup>
        <BaseExcelImportPopup
          visible={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={(result) => {
            if (result.success) {
              void refreshCurrent()
              void refreshProducts()
            }
          }}
          title={t("PRODUCT_MATERIAL_IMPORT_ALL", "Import tất cả thành phẩm")}
          moduleCd={importAllConfig.moduleCd}
          templateFileName={importAllConfig.templateName}
          params={{ lang: localStorage.getItem("lang") ?? undefined }}
        />
      </div>
    </DxPage>
  )
}

export default function ProductMaterialPage() {
  const companyCd = getCurrentCompanyCd()
  return <ProductMaterialContent key={companyCd} />
}
