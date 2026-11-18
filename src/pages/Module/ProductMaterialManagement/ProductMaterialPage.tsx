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
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup"
import { useProductMaterialAllImportConfig } from "./ProductMaterialImportConfig"
import {
  useProductMaterialMutations,
  useProductMaterialsQuery,
  useProductMaterialSummaryQuery,
  useProductsByDivisionQuery,
} from "@/hooks/queries/useProductMaterialQueries"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import { getApiErrorMessage } from "@/api/apiTypes"
import { getCurrentCompanyCd } from "@/lib/login"
import { LanguageContext } from "@/lib/i18nLoader"
import type { ProductMaterialRow } from "@/types/productMaterial"

const PRODUCT_DIVISION_FILTER = "155"
const MATERIAL_DIVISION_FILTER = "152"
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 })
const matchText = (input: string) => input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()

function ProductMaterialContent() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback(
    (key: string, fallback: string) => translate?.(key, fallback) ?? fallback,
    [translate],
  )
  const [selectedId, setSelectedId] = useState(0)
  const [search, setSearch] = useState("")
  const [popupOpen, setPopupOpen] = useState(false)
  const [editId, setEditId] = useState(0)
  const [materialProductId, setMaterialProductId] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const gridRef = useRef<dxDataGrid | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const importAllConfig = useProductMaterialAllImportConfig()

  const {
    data: products = [],
    isLoading: loadingProductCatalog,
    isFetching: fetchingProductCatalog,
    isError: productsError,
    error: productsLoadError,
    refetch: refetchProducts,
  } = useProductsByDivisionQuery(PRODUCT_DIVISION_FILTER)

  const {
    data: materialCatalog = [],
    isLoading: loadingMaterialCatalog,
    isFetching: fetchingMaterialCatalog,
    isError: materialCatalogError,
    error: materialCatalogLoadError,
    refetch: refetchMaterialCatalog,
  } = useProductsByDivisionQuery(MATERIAL_DIVISION_FILTER)

  const {
    data: summary = [],
    isLoading: loadingSummary,
    isFetching: fetchingSummary,
    isError: summaryError,
    error: summaryLoadError,
    refetch: refetchSummary,
  } = useProductMaterialSummaryQuery()

  const {
    data: materials = [],
    isLoading: loadingDetails,
    isFetching: fetchingDetails,
    isError: materialsError,
    error: materialsLoadError,
  } = useProductMaterialsQuery(selectedId)

  const { saveMutation, deleteMutation, invalidate } = useProductMaterialMutations()
  const saving = saveMutation.isPending || deleteMutation.isPending
  const loadingProducts = loadingProductCatalog || loadingMaterialCatalog || loadingSummary
    || fetchingProductCatalog || fetchingMaterialCatalog || fetchingSummary
  const loadingMaterialDetails = loadingDetails || fetchingDetails

  useMasterListLoadError(
    productsError || materialCatalogError || summaryError,
    productsLoadError ?? materialCatalogLoadError ?? summaryLoadError,
    t,
    "Failed to load product material catalogs",
  )
  useMasterListLoadError(
    materialsError,
    materialsLoadError,
    t,
    "Failed to load product materials",
  )

  useEffect(() => {
    setSelectedId((current) =>
      products.some((item) => item.PRODUCT_ID === current)
        ? current
        : (products[0]?.PRODUCT_ID ?? 0),
    )
  }, [products])

  const refreshProducts = useCallback(async () => {
    await Promise.all([
      refetchProducts(),
      refetchMaterialCatalog(),
      refetchSummary(),
    ])
  }, [refetchMaterialCatalog, refetchProducts, refetchSummary])

  const refreshCurrent = useCallback(async () => {
    if (!selectedId) {
      await refetchSummary()
      return
    }
    await invalidate(selectedId)
  }, [invalidate, refetchSummary, selectedId])

  const counts = useMemo(() => {
    const nextCounts: Record<number, number> = {}
    summary.forEach((item) => { nextCounts[item.PRODUCT_ID] = item.MATERIAL_COUNT })
    return nextCounts
  }, [summary])

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
    () => materialCatalog.filter((item) => item.PRODUCT_ID !== selectedId).map((item) => ({
      ...item,
      DISPLAY: item.PRODUCT_CD + " - " + item.PRODUCT_NM_VIET,
    })),
    [materialCatalog, selectedId],
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
    try {
      await saveMutation.mutateAsync({
        materialId: editId,
        payload: {
          PRODUCT_ID: selectedId,
          MATERIAL_PRODUCT_ID: materialProductId,
          QUANTITY: Number(quantity.toFixed(6)),
        },
      })
      setPopupOpen(false)
      notify(t("PM_SAVE_OK", "Lưu nguyên vật liệu thành công"), "success", 2500)
    } catch (error) {
      notify(getApiErrorMessage(error, t("PM_SAVE_FAILED", "Lưu nguyên vật liệu thất bại")), "error", 4000)
    }
  }

  async function handleDelete(row: ProductMaterialRow) {
    const ok = await confirm(
      t("PM_CONFIRM_DELETE", "Xóa NVL {0} khỏi thành phẩm này?").replace("{0}", row.MATERIAL_PRODUCT_CD),
      t("PM_DELETE_CONFIRM_TITLE", "Xác nhận xóa"),
    )
    if (!ok) return
    try {
      await deleteMutation.mutateAsync({
        materialId: row.MATERIAL_ID,
        productId: selectedId,
      })
      notify(t("PM_DELETE_OK", "Xóa nguyên vật liệu thành công"), "success", 2500)
    } catch (error) {
      notify(getApiErrorMessage(error, t("PM_DELETE_FAILED", "Xóa nguyên vật liệu thất bại")), "error", 4000)
    }
  }

  function openImport() {
    if (saving || popupOpen || importOpen) return
    setImportOpen(true)
  }

  return (
    <DxPage>
      <div className="relative flex h-full min-h-[540px] flex-col gap-3 bg-slate-50 p-3 lg:flex-row">
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
                      ? t("PM_HAS_MATERIAL", "Có NVL") + ` ${counts[item.PRODUCT_ID]}`
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
              {product ? product.PRODUCT_CD + " - " + product.PRODUCT_NM_VIET : t("PM_NO_PRODUCT_SELECTED", "Chưa chọn thành phẩm")}
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
                showDelete={false}
                showColumnChooser={false}
                showExportPdf={false}
                showSearch={false}
                importDisabled={saving || popupOpen || importOpen}
                shortcutsEnabled={!popupOpen && !importOpen}
              />
            </div>

            <div className="min-h-[360px] flex-1">
              <DataGrid dataSource={materials} keyExpr="MATERIAL_ID"
                onInitialized={(event) => { gridRef.current = event.component ?? null }}
                showBorders columnAutoWidth={false} rowAlternationEnabled
                loadPanel={{ enabled: loadingMaterialDetails }}
                noDataText={loadingMaterialDetails
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

        {/* DevExtreme Popup's root widget stays at its JSX location even with container="body".
            Keep popup roots out of the flex layout to prevent page width shifting when
            dx-state-invisible (display: none) is removed on show. The visible overlay
            is still rendered in document.body by DevExtreme. */}
        <div className="absolute left-0 top-0 h-0 w-0">
        <Popup container="body" visible={popupOpen} showTitle title={editId ? t("PM_POPUP_EDIT", "Sửa nguyên vật liệu") : t("PM_POPUP_ADD", "Thêm nguyên vật liệu")}
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
          popupContainer="body"
          visible={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={(result) => {
            if (result.success) {
              void invalidate(selectedId || undefined)
              void refreshProducts()
            }
          }}
          title={t("PRODUCT_MATERIAL_IMPORT_ALL", "Import tất cả thành phẩm")}
          moduleCd={importAllConfig.moduleCd}
          templateFileName={importAllConfig.templateName}
          params={{ lang: localStorage.getItem("lang") ?? undefined }}
        />
        </div>
      </div>
    </DxPage>
  )
}

export default function ProductMaterialPage() {
  const companyCd = getCurrentCompanyCd()
  return <ProductMaterialContent key={companyCd} />
}
