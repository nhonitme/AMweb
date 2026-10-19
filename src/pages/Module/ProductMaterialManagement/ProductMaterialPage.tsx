import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import DataGrid, { Column, Paging } from "devextreme-react/data-grid"
import Popup from "devextreme-react/popup"
import SelectBox from "devextreme-react/select-box"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"
import { FileDown, FileUp, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import * as XLSX from "xlsx"

import DxPage from "@/dx/DxPage"
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

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 6 })
const matchText = (input: string) => input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
const parseQuantity = (value: unknown): number => {
  if (typeof value === "number") return value
  return Number(String(value ?? "").trim().replace(",", "."))
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
  const fileRef = useRef<HTMLInputElement>(null)

  const refreshProducts = useCallback(async () => {
    setLoadingProducts(true)
    try {
      const [catalog, summary] = await Promise.all([getProducts(), getProductMaterialSummary()])
      const sorted = [...catalog].sort((a, b) => a.PRODUCT_CD.localeCompare(b.PRODUCT_CD))
      const nextCounts: Record<number, number> = {}
      summary.forEach((item) => { nextCounts[item.PRODUCT_ID] = item.MATERIAL_COUNT })
      setProducts(sorted)
      setCounts(nextCounts)
      setSelectedId((current) => sorted.some((item) => item.PRODUCT_ID === current)
        ? current : (sorted[0]?.PRODUCT_ID ?? 0))
    } catch (error) {
      notify(getApiErrorMessage(error, "Không tải được danh mục sản phẩm"), "error", 4000)
    } finally {
      setLoadingProducts(false)
    }
  }, [])

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
        if (active) notify(getApiErrorMessage(error, "Không tải được danh sách NVL"), "error", 4000)
      })
      .finally(() => { if (active) setLoadingDetails(false) })
    return () => { active = false }
  }, [selectedId, companyCd])

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
      notify("Vui lòng chọn nguyên vật liệu và nhập số lượng lớn hơn 0", "warning", 3000)
      return
    }
    if (quantity > 999999999999.999999) {
      notify("Số lượng vượt giới hạn DECIMAL(18,6)", "warning", 3000)
      return
    }
    if (materials.some((row) =>
      row.MATERIAL_PRODUCT_ID === materialProductId && row.MATERIAL_ID !== editId)) {
      notify("Nguyên vật liệu này đã được khai báo cho thành phẩm", "warning", 3000)
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
      notify(t("MSG_EDIT_SUCCESS", "Lưu nguyên vật liệu thành công"), "success", 2500)
    } catch (error) {
      notify(getApiErrorMessage(error, "Lưu nguyên vật liệu thất bại"), "error", 4000)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row: ProductMaterialRow) {
    const ok = await confirm(
      "Xóa NVL " + row.MATERIAL_PRODUCT_CD + " khỏi thành phẩm này?",
      "Xác nhận xóa",
    )
    if (!ok) return
    setSaving(true)
    try {
      await deleteProductMaterial(row.MATERIAL_ID)
      await refreshCurrent()
      notify(t("MSG_DELETE_SUCCESS", "Xóa nguyên vật liệu thành công"), "success", 2500)
    } catch (error) {
      notify(getApiErrorMessage(error, "Xóa nguyên vật liệu thất bại"), "error", 4000)
    } finally {
      setSaving(false)
    }
  }

  function handleExport() {
    if (!product) return
    const data = materials.map((row) => ({
      "MÃ NVL": row.MATERIAL_PRODUCT_CD,
      "TÊN NGUYÊN VẬT LIỆU": row.MATERIAL_PRODUCT_NM,
      "ĐVT": row.UNIT_NM ?? "",
      "SỐ LƯỢNG": row.QUANTITY,
    }))
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.json_to_sheet(data.length ? data : [{ "MÃ NVL": "", "SỐ LƯỢNG": "" }])
    XLSX.utils.book_append_sheet(workbook, sheet, "NguyenVatLieu")
    XLSX.writeFile(workbook, "NVL_" + product.PRODUCT_CD + ".xlsx")
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !selectedId) return
    setSaving(true)
    let inserted = 0
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!worksheet) throw new Error("File Excel không có dữ liệu")
      const source = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" })
      const codes = new Map(products.map((item) => [item.PRODUCT_CD.trim().toLowerCase(), item]))
      const existing = new Set(materials.map((item) => item.MATERIAL_PRODUCT_ID))
      const rows: { materialId: number; qty: number }[] = []
      for (const [index, raw] of source.entries()) {
        const normalized = Object.fromEntries(
          Object.entries(raw).map(([key, value]) => [matchText(key.trim()).toUpperCase(), value]),
        )
        const rawCode = normalized["MA NVL"] ?? normalized["MATERIAL_PRODUCT_CD"] ?? normalized["PRODUCT_CD"]
        const code = String(rawCode ?? "").trim().toLowerCase()
        const qty = parseQuantity(normalized["SO LUONG"] ?? normalized["QUANTITY"])
        const material = codes.get(code)
        if (!material) throw new Error("Dòng " + (index + 2) + ": Mã NVL không tồn tại: " + code)
        if (material.PRODUCT_ID === selectedId)
          throw new Error("Dòng " + (index + 2) + ": Thành phẩm không thể là NVL của chính nó")
        if (!Number.isFinite(qty) || qty <= 0 || qty > 999999999999.999999)
          throw new Error("Dòng " + (index + 2) + ": Số lượng không hợp lệ")
        if (existing.has(material.PRODUCT_ID))
          throw new Error("Dòng " + (index + 2) + ": Mã NVL bị trùng: " + code)
        existing.add(material.PRODUCT_ID)
        rows.push({ materialId: material.PRODUCT_ID, qty: Number(qty.toFixed(6)) })
      }
      if (!rows.length) throw new Error("Không có dòng dữ liệu hợp lệ")
      if (!window.confirm("Thêm " + rows.length + " nguyên vật liệu vào thành phẩm đang chọn?")) return
      // Validate all rows first; then import sequentially to avoid flooding the API.
      for (const item of rows) {
        await saveProductMaterial(0, {
          PRODUCT_ID: selectedId,
          MATERIAL_PRODUCT_ID: item.materialId,
          QUANTITY: item.qty,
        })
        inserted++
      }
      notify("Đã nhập " + inserted + " nguyên vật liệu", "success", 3000)
    } catch (error) {
      notify(getApiErrorMessage(error, "Lỗi nhập Excel") +
        (inserted ? " (đã lưu " + inserted + " dòng trước khi xảy ra lỗi)" : ""), "error", 5000)
    } finally {
      try { await refreshCurrent() } catch { /* keep existing rows if refresh fails */ }
      setSaving(false)
    }
  }

  return (
    <DxPage>
      <div className="flex h-full min-h-[540px] flex-col gap-3 bg-slate-50 p-3 lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col rounded-xl border border-slate-200 bg-white lg:w-[310px]">
          <div className="border-b border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Danh sách thành phẩm</h2>
              <span className="text-xs text-slate-400">{products.length} sản phẩm</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input className="w-full min-w-0 bg-transparent text-sm outline-none"
                value={search} onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm mã / tên thành phẩm..." />
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {visibleProducts.map((item) => (
              <button key={item.PRODUCT_ID} disabled={saving}
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
                    {(counts[item.PRODUCT_ID] ?? 0) > 0 ? "Có NVL" : "Chưa có"}
                  </span>
                </div>
              </button>
            ))}
            {!loadingProducts && visibleProducts.length === 0 &&
              <div className="p-4 text-center text-sm text-slate-400">Không tìm thấy sản phẩm</div>}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Thành phẩm đang chọn</p>
              <h1 className="text-lg font-bold text-slate-800">
                {product ? product.PRODUCT_CD + "  " + product.PRODUCT_NM_VIET : "Chưa chọn thành phẩm"}
              </h1>
              <p className="mt-1 text-xs text-slate-400">ĐVT: {product?.UNIT_NM ?? "—"} · Số NVL: {materials.length}</p>
            </div>
            <button onClick={() => void refreshProducts()} disabled={saving || loadingProducts}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium">
              <RefreshCw size={14} /> Làm mới
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Danh sách nguyên vật liệu cấu thành</h2>
                <p className="text-xs text-slate-400">Số lượng NVL cần dùng cho một đơn vị thành phẩm</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button disabled={!selectedId || saving} onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700">
                  <FileUp size={14} /> Nhập Excel
                </button>
                <button disabled={!selectedId || saving} onClick={handleExport}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-blue-700">
                  <FileDown size={14} /> Xuất Excel
                </button>
                <button disabled={!selectedId || saving} onClick={openAdd}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  <Plus size={14} /> Thêm NVL
                </button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(event) => void handleImport(event)} />
              </div>
            </div>

            <div className="min-h-[360px] flex-1">
              <DataGrid dataSource={materials} keyExpr="MATERIAL_ID"
                showBorders columnAutoWidth={false} rowAlternationEnabled
                noDataText={loadingDetails ? "Đang tải nguyên vật liệu..." : "Chưa khai báo nguyên vật liệu"}
                height="100%" width="100%">
                <Paging defaultPageSize={30} />
                <Column caption="#" width={52} alignment="center"
                  cellRender={(cell) => cell.rowIndex + 1} />
                <Column dataField="MATERIAL_PRODUCT_CD" caption="Mã NVL" minWidth={115} />
                <Column dataField="MATERIAL_PRODUCT_NM" caption="Nguyên vật liệu" minWidth={220} />
                <Column dataField="UNIT_NM" caption="ĐVT" width={100} alignment="center" />
                <Column dataField="QUANTITY" caption="Số lượng định mức" width={160} alignment="right"
                  cellRender={(cell) => numberFormat.format(Number(cell.value) || 0)} />
                <Column caption="Thao tác" width={100} alignment="center" allowSorting={false}
                  cellRender={(cell) => (
                    <div className="flex items-center justify-center gap-3">
                      <button title="Sửa" disabled={saving}
                        onClick={() => openEdit(cell.data as ProductMaterialRow)} className="text-blue-600">
                        <Pencil size={15} />
                      </button>
                      <button title="Xóa" disabled={saving}
                        onClick={() => void handleDelete(cell.data as ProductMaterialRow)} className="text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )} />
              </DataGrid>
            </div>
            <div className="mt-3 rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
              Tổng: {materials.length} nguyên vật liệu
            </div>
          </div>
        </section>

        <Popup visible={popupOpen} showTitle title={editId ? "Sửa nguyên vật liệu" : "Thêm nguyên vật liệu"}
          width={540} height="auto" dragEnabled={false} closeOnOutsideClick={!saving}
          onHiding={() => { if (!saving) setPopupOpen(false) }}>
          <form className="space-y-4 p-2" onSubmit={(event) => {
            event.preventDefault()
            void handleSave()
          }}>
            <div>
              <label className="mb-1 block text-sm font-medium">Nguyên vật liệu <span className="text-red-500">*</span></label>
              <SelectBox dataSource={materialOptions} valueExpr="PRODUCT_ID" displayExpr="DISPLAY"
                searchEnabled searchExpr={["PRODUCT_CD", "PRODUCT_NM_VIET"]}
                placeholder="Tìm mã hoặc tên NVL" value={materialProductId || null}
                onValueChanged={(event) => setMaterialProductId(Number(event.value ?? 0))}
                disabled={saving} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Số lượng định mức <span className="text-red-500">*</span></label>
              <input type="number" min="0.000001" max="999999999999.999999" step="0.000001"
                value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}
                disabled={saving} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" disabled={saving} onClick={() => setPopupOpen(false)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm">Hủy</button>
              <button type="submit" disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </form>
        </Popup>
      </div>
    </DxPage>
  )
}

export default function ProductMaterialPage() {
  const companyCd = getCurrentCompanyCd()
  return <ProductMaterialContent key={companyCd} />
}
