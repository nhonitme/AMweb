import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { createSysCodeSelectBoxEditorOptions } from "@/components/forms/sysCodeSelectBoxOptions"
import { createSysCodeDisplayExpr } from "@/lib/sysCodeUtils"
import BaseLookupCellEditor from "@/components/lookup/BaseLookupCellEditor"
import AccountSelectBox from "@/components/lookup/AccountSelectBox"
import ProductGroupLookupCellEditor from "@/components/lookup/ProductGroupLookupCellEditor"
import UnitLookupCellEditor from "@/components/lookup/UnitLookupCellEditor"
import WarehouseLookupCellEditor from "@/components/lookup/WarehouseLookupCellEditor"
import { renderSharedProductGroupLookupPage, renderSharedUnitLookupPage, renderSharedWarehouseLookupPage } from "@/components/lookup/sharedMasterLookupPages"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import SelectBox from "devextreme-react/select-box"
import notify from "devextreme/ui/notify"
import DataGrid, { Column, Editing, Lookup, Pager, Paging, Scrolling, Selection } from "devextreme-react/data-grid"

import { getApiErrorMessage } from "@/api/apiTypes"
import { getCustomerExts } from "@/api/customerExtApi"
import { getProducts } from "@/api/productApi"
import { getGdtInvoiceDetail } from "@/api/gdtImportApi"
import { checkCodeExists } from "@/api/lookupApi"
import { getAcclistLookupStore } from "@/components/lookup/AcclistLookupStore"
import { productGroupLookupStore } from "@/components/lookup/productGroupLookupStore"
import { unitLookupStore } from "@/components/lookup/unitLookupStore"
import { warehouseLookupStore } from "@/components/lookup/warehouseLookupStore"
import { getCurrentCompanyCd } from "@/lib/login"
import { getSequencePreviewCode, getSequencePreviewCodes } from "@/lib/codeSequence"
import { clearSysCodeSequencePreviewCache } from "@/api/sysCodeSequenceApi"
import { pickLocalizedText } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import { useSysCodes } from "@/lib/sysCodeContext"
import { useCustomerExtMutations } from "@/hooks/queries/master/masterDataQueries"
import { useProductMutations } from "@/hooks/queries/master/useProductListQuery"
import { createDefaultCustomerExt, mapCustomerExtToApiPayload, normalizeCustomerExt } from "@/pages/Module/CustomerManagementPage/customerExtUtils"
import type { CustomerExtApi } from "@/types/customerExt"
import type { Product } from "@/types/product"
import type { ProductKind } from "@/types/productKind"
import type { StoreInfo } from "@/types/store"
import type { Unit } from "@/types/unit"
import type { etcData } from "@/types/etcData"
import type { VatInvoiceRow, VatInvoiceType } from "./vatInvoiceVoucherDraft"
import { mapVatInvoiceInventoryJsonRows } from "./VatInvoiceInventoryJsonGrid"

type Kind = "customer" | "product"
type CustomerSeed = { name: string; taxCode: string; address: string }
type CustomerDraft = CustomerSeed & {
  key: string
  CUSTOMER_CD: string
  CATEGORY_CD: string
  CUSTOMER_TYPE: string
  CUSTOMER_NM_VIET: string
  TAX_CD: string
  ADDRESS: string
  selected: boolean
}
type ExistingCustomer = CustomerSeed & {
  key: string
  CUSTOMER_CD: string
  CATEGORY_CD: string
  CUSTOMER_TYPE: string
}
type CustomerGridRow = {
  key: string
  CUSTOMER_CD: string
  CATEGORY_CD: string
  CUSTOMER_TYPE: string
  CUSTOMER_NM_VIET: string
  TAX_CD: string
  ADDRESS: string
  isExisting: boolean
  selected: boolean
}
type ProductCandidate = {
  key: string
  PRODUCT_CD: string
  PRODUCT_NM_VIET: string
  INVOICE_UNIT: string
  PRODUCT_KIND_ID: number | null
  UNIT_ID: number | null
  STORE_ID: number | null
  DIVISION: string | null
  EXISTING_PRODUCT_CD: string
  selected: boolean
}
type Props = {
  visible: boolean
  kind: Kind | null
  invoiceType: VatInvoiceType
  invoices: VatInvoiceRow[]
  onClose: () => void
}

function normalizeKey(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase()
}

function customerMatches(seed: CustomerSeed, existing: CustomerExtApi): boolean {
  const seedTax = normalizeKey(seed.taxCode)
  const existingTax = normalizeKey(existing.TAX_CD)
  if (seedTax) return Boolean(existingTax) && seedTax === existingTax
  return normalizeKey(seed.name) === normalizeKey(existing.CUSTOMER_NM_VIET)
}

function getCustomerSeeds(invoices: VatInvoiceRow[], invoiceType: VatInvoiceType): CustomerSeed[] {
  const unique: CustomerSeed[] = []
  for (const invoice of invoices) {
    const seed = {
      name: (invoiceType === "BUY" ? invoice.nbten : invoice.nmten)?.trim() ?? "",
      taxCode: (invoiceType === "BUY" ? invoice.nbmst : invoice.nmmst)?.trim() ?? "",
      address: (invoiceType === "BUY" ? invoice.nbdchi : invoice.nmdchi)?.trim() ?? "",
    }
    if (!seed.name && !seed.taxCode) continue
    const duplicate = unique.some((existing) => customerMatches(seed, {
      TAX_CD: existing.taxCode,
      CUSTOMER_NM_VIET: existing.name,
      ADDRESS: existing.address,
    }))
    if (!duplicate) unique.push(seed)
  }
  return unique
}

export default function VatInOutQuickBatchCreatePopup({ visible, kind, invoiceType, invoices, onClose }: Props) {
  const { translate, lang } = useContext(LanguageContext) as { translate?: (key: string, fallback?: string) => string; lang?: string }
  const t = useCallback((key: string, fallback: string) => translate ? translate(key, fallback) : fallback, [translate])
  const { getCodesByType } = useSysCodes()
  const { createMutation: createCustomer } = useCustomerExtMutations(lang ?? "VIET")
  const { createMutation: createProduct } = useProductMutations()
  const [loading, setLoading] = useState(false)
  const [masterLoaded, setMasterLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [productDetailsLoaded, setProductDetailsLoaded] = useState(false)
  const [customerDrafts, setCustomerDrafts] = useState<CustomerDraft[]>([])
  const [existingCustomers, setExistingCustomers] = useState<ExistingCustomer[]>([])
  const [bulkCategory, setBulkCategory] = useState("")
  const [bulkCustomerType, setBulkCustomerType] = useState("")
  const [productCandidates, setProductCandidates] = useState<ProductCandidate[]>([])
  const [productKinds, setProductKinds] = useState<ProductKind[]>([])
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [accounts, setAccounts] = useState<etcData[]>([])
  const [bulkProductKind, setBulkProductKind] = useState<number | null>(null)
  const [bulkUnit, setBulkUnit] = useState<number | null>(null)
  const [bulkStore, setBulkStore] = useState<number | null>(null)
  const [bulkDivision, setBulkDivision] = useState<string | null>(null)
  const [createdCount, setCreatedCount] = useState(0)
  const [failedItems, setFailedItems] = useState<string[]>([])
  const productLoadStarted = useRef(false)
  const categoryOptions = useMemo(() => getCodesByType("CATEGORY_CD") ?? [], [getCodesByType])
  const customerTypeOptions = useMemo(() => getCodesByType("CUSTOMER_TYPE") ?? [], [getCodesByType])
  const customerGridRows = useMemo<CustomerGridRow[]>(() => [
    ...existingCustomers.map((row) => ({
      key: row.key,
      CUSTOMER_CD: row.CUSTOMER_CD,
      CATEGORY_CD: row.CATEGORY_CD,
      CUSTOMER_TYPE: row.CUSTOMER_TYPE,
      CUSTOMER_NM_VIET: row.name,
      TAX_CD: row.taxCode,
      ADDRESS: row.address,
      isExisting: true,
      selected: false,
    })),
    ...customerDrafts.map((row) => ({ ...row, isExisting: false })),
  ], [customerDrafts, existingCustomers])
  const missingProductCandidates = useMemo(() => productCandidates.filter((candidate) => !candidate.EXISTING_PRODUCT_CD), [productCandidates])
  const selectedCustomerDrafts = useMemo(() => customerDrafts.filter((row) => row.selected), [customerDrafts])
  const selectedProductCandidates = useMemo(() => missingProductCandidates.filter((row) => row.selected), [missingProductCandidates])

  useEffect(() => {
    if (!visible || !kind) return
    let cancelled = false
    productLoadStarted.current = false
    setLoading(true)
    setProductDetailsLoaded(false)
    setMasterLoaded(false)
    setError("")
    setCreatedCount(0)
    setFailedItems([])
    setCustomerDrafts([])
    setExistingCustomers([])
    setBulkCategory("")
    setBulkCustomerType("")
    setProductCandidates([])
    setBulkProductKind(null)
    setBulkUnit(null)
    setBulkStore(null)
    setBulkDivision(null)
    const productLookupsPromise = kind === "product"
      ? Promise.all([
        productGroupLookupStore.load() as Promise<ProductKind[]>,
        warehouseLookupStore.load() as Promise<StoreInfo[]>,
        getAcclistLookupStore().load() as Promise<etcData[]>,
      ])
      : Promise.resolve([[], [], []] as [ProductKind[], StoreInfo[], etcData[]])
    void Promise.all([
      getProducts(),
      getCustomerExts(undefined, lang ?? "VIET"),
      unitLookupStore.load() as Promise<Unit[]>,
      productLookupsPromise,
    ])
      .then(async ([products, customers, loadedUnits, [loadedProductKinds, loadedStores, loadedAccounts]]) => {
        if (cancelled) return
        setAllProducts(products)
        setUnits(loadedUnits)
        setProductKinds(loadedProductKinds)
        setStores(loadedStores)
        setAccounts(loadedAccounts)
        if (kind === "customer") {
          const seeds = getCustomerSeeds(invoices, invoiceType)
          const existingMatches = seeds.flatMap((seed) => {
            const existing = customers.data.find((customer) => customerMatches(seed, customer))
            return existing ? [{
              ...seed,
              key: seed.taxCode ? `tax:${normalizeKey(seed.taxCode)}` : `name:${normalizeKey(seed.name)}|${normalizeKey(seed.address)}`,
              CUSTOMER_CD: existing.CUSTOMER_CD ?? "",
              CATEGORY_CD: existing.CATEGORY_CD ?? "",
              CUSTOMER_TYPE: existing.CUSTOMER_TYPE ?? "",
            }] : []
          })
          const candidates = seeds.filter((seed) => !customers.data.some((customer) => customerMatches(seed, customer)))
          const codes = candidates.length ? await getSequencePreviewCodes("MD_CUSTOMER", "CUSTOMER_CD", candidates.length).catch(() => []) : []
          if (cancelled) return
          setExistingCustomers(existingMatches)
          setCustomerDrafts(candidates.map((seed, index) => ({
            ...seed,
            key: seed.taxCode ? `tax:${normalizeKey(seed.taxCode)}` : `name:${normalizeKey(seed.name)}|${normalizeKey(seed.address)}`,
            CUSTOMER_CD: codes[index] ?? "",
            CATEGORY_CD: "",
            CUSTOMER_TYPE: "",
            CUSTOMER_NM_VIET: seed.name,
            TAX_CD: seed.taxCode,
            ADDRESS: seed.address,
            selected: false,
          })))
        }
        setMasterLoaded(true)
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(getApiErrorMessage(cause, t("LOAD_FAILED", "Không tải được danh mục hiện có.")))
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [invoiceType, invoices, kind, lang, t, visible])

  useEffect(() => {
    if (!visible || kind !== "product" || error || !masterLoaded || productLoadStarted.current) return
    productLoadStarted.current = true
    let cancelled = false
    let completed = false
    setLoading(true)
    const invoiceKeys = invoices.map((invoice) => invoice.mhdon).filter(Boolean)
    void Promise.allSettled(invoiceKeys.map((key) => getGdtInvoiceDetail(invoiceType, key)))
      .then(async (results) => {
        if (cancelled) return
        const unique = new Map<string, ProductCandidate>()
        let parsedRows = 0
        let skippedNoName = 0
        let duplicateRows = 0
        for (const result of results) {
          if (result.status === "rejected") continue
          for (const row of mapVatInvoiceInventoryJsonRows(result.value)) {
            const name = String(row.name ?? "").trim()
            const unitName = String(row.unit ?? "").trim()
            if (!name) {
              skippedNoName += 1
              continue
            }
            parsedRows += 1
            const key = `${normalizeKey(name)}|${normalizeKey(unitName)}`
            const unit = units.find((item) => normalizeKey(item.UNIT_CD) === normalizeKey(unitName))
              ?? units.find((item) => normalizeKey(item.UNIT_NM) === normalizeKey(unitName))
            if (!unique.has(key)) unique.set(key, {
              key,
              PRODUCT_CD: "",
              PRODUCT_NM_VIET: name,
              INVOICE_UNIT: unitName,
              PRODUCT_KIND_ID: null,
              UNIT_ID: unit?.UNIT_ID ?? null,
              STORE_ID: null,
              DIVISION: null,
              EXISTING_PRODUCT_CD: "",
              selected: false,
            })
            else duplicateRows += 1
          }
        }
        const uniqueCandidates = [...unique.values()]
        const candidates = uniqueCandidates.map((candidate) => {
          const existing = allProducts.find((product) => {
          const productUnit = units.find((unit) => Number(unit.UNIT_ID) === Number(product.UNIT_ID))
          return normalizeKey(product.PRODUCT_NM_VIET) === normalizeKey(candidate.PRODUCT_NM_VIET)
            && (candidate.UNIT_ID ? Number(product.UNIT_ID) === candidate.UNIT_ID : normalizeKey(product.UNIT_CD ?? productUnit?.UNIT_CD) === normalizeKey(candidate.INVOICE_UNIT)
              || normalizeKey(product.UNIT_NM ?? productUnit?.UNIT_NM) === normalizeKey(candidate.INVOICE_UNIT))
          })
          return { ...candidate, EXISTING_PRODUCT_CD: existing?.PRODUCT_CD ?? "" }
        })
        const newCandidates = candidates.filter((candidate) => !candidate.EXISTING_PRODUCT_CD)
        const codes = newCandidates.length ? await getSequencePreviewCodes("MD_INVENTORY", "PRODUCT_CD", newCandidates.length).catch(() => []) : []
        if (cancelled) return
        let codeIndex = 0
        setProductCandidates(candidates.map((candidate) => ({ ...candidate, PRODUCT_CD: candidate.EXISTING_PRODUCT_CD || codes[codeIndex++] || "" })))
        setProductDetailsLoaded(true)
        completed = true
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(getApiErrorMessage(cause, t("LOAD_FAILED", "Không tải được chi tiết hóa đơn để lọc sản phẩm.")))
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => {
      cancelled = true
      if (!completed) {
        productLoadStarted.current = false
      }
    }
  }, [allProducts, error, invoiceType, invoices, kind, masterLoaded, t, units, visible])

  const saveCustomers = useCallback(async () => {
    if (selectedCustomerDrafts.length === 0) {
      notify(t("MSG_MUST_ITEM", "Hãy tick chọn ít nhất một khách hàng cần tạo."), "warning", 2500)
      return
    }
    if (selectedCustomerDrafts.some((row) => !row.CUSTOMER_CD.trim() || !row.CATEGORY_CD || !row.CUSTOMER_TYPE || !row.CUSTOMER_NM_VIET.trim())) {
      notify(t("MSG_MUST_ITEM", "Hãy nhập mã, tên, nhóm và loại khách hàng cho tất cả các dòng."), "warning", 2500)
      return
    }
    const duplicateCustomers = selectedCustomerDrafts.some((row, index) => selectedCustomerDrafts.slice(0, index).some((previous) => customerMatches({
      name: row.CUSTOMER_NM_VIET,
      taxCode: row.TAX_CD,
      address: row.ADDRESS,
    }, {
      CUSTOMER_NM_VIET: previous.CUSTOMER_NM_VIET,
      TAX_CD: previous.TAX_CD,
      ADDRESS: previous.ADDRESS,
    })))
    if (duplicateCustomers) {
      notify(t("MSG_CODE_EXISTS", "Có khách hàng bị trùng trong danh sách. Hãy rà soát trước khi tạo."), "warning", 3000)
      return
    }
    setSaving(true)
    const failures: string[] = []
    const savedKeys = new Set<string>()
    const usedCodes = new Set<string>()
    let count = 0
    try {
      for (const row of selectedCustomerDrafts) {
        try {
          const code = row.CUSTOMER_CD.trim() || await getSequencePreviewCode("MD_CUSTOMER", "CUSTOMER_CD")
          if (!code || usedCodes.has(normalizeKey(code)) || await checkCodeExists("customer", code)) throw new Error(t("MSG_CODE_EXISTS", "Mã khách hàng trống hoặc đã tồn tại."))
          usedCodes.add(normalizeKey(code))
          const base = createDefaultCustomerExt(getCurrentCompanyCd())
          const response = await createCustomer.mutateAsync(mapCustomerExtToApiPayload({
            ...base,
            CUSTOMER_CD: code,
            CATEGORY_CD: row.CATEGORY_CD,
            CUSTOMER_TYPE: row.CUSTOMER_TYPE,
            CUSTOMER_NM_VIET: row.CUSTOMER_NM_VIET.trim(),
            TAX_CD: row.TAX_CD.trim(),
            ADDRESS: row.ADDRESS.trim(),
          }))
          if (!response.data || response.data.CUSTOMER_ID == null) throw new Error(response.message || t("INSERT_FAILED", "Không tạo được khách hàng."))
          const normalized = normalizeCustomerExt(response.data)
          clearSysCodeSequencePreviewCache()
          savedKeys.add(row.key)
          count += 1
        } catch (cause) { failures.push(`${row.CUSTOMER_NM_VIET}: ${getApiErrorMessage(cause, t("INSERT_FAILED", "Lỗi tạo khách hàng."))}`) }
      }
    } finally {
      setSaving(false)
      setCustomerDrafts((current) => current.filter((row) => !savedKeys.has(row.key)))
      setCreatedCount(count)
      setFailedItems(failures)
      if (count > 0) notify(t("MSG_INSERT_SUCCESS", `Đã tạo ${count} khách hàng.`).replace("{0}", String(count)), "success", 3000)
      if (failures.length > 0) notify(t("INSERT_FAILED", `Có ${failures.length} khách hàng chưa tạo được.`), "warning", 4000)
    }
  }, [createCustomer, selectedCustomerDrafts, t])

  const saveProducts = useCallback(async () => {
    if (selectedProductCandidates.length === 0) {
      notify(t("MSG_MUST_ITEM", "Hãy tick chọn ít nhất một sản phẩm cần tạo."), "warning", 2500)
      return
    }
    const unresolved = selectedProductCandidates.filter((item) => !item.UNIT_ID)
    if (unresolved.length) {
      notify(t("MSG_MUST_ITEM", "Hãy chọn đơn vị tính cho tất cả sản phẩm trước khi tạo."), "warning", 3000)
      return
    }
    const identities = selectedProductCandidates.map((item) => `${normalizeKey(item.PRODUCT_NM_VIET)}|${item.UNIT_ID}`)
    if (new Set(identities).size !== identities.length) {
      notify(t("MSG_CODE_EXISTS", "Có sản phẩm bị trùng tên và đơn vị tính. Hãy rà soát trước khi tạo."), "warning", 3000)
      return
    }
    setSaving(true)
    const failures: string[] = []
    let count = 0
    try {
      const known = new Set(allProducts.map((product) => `${normalizeKey(product.PRODUCT_NM_VIET)}|${Number(product.UNIT_ID)}`))
      const usedCodes = new Set<string>()
      const savedKeys = new Set<string>()
      for (const candidate of selectedProductCandidates) {
        if (candidate.EXISTING_PRODUCT_CD) continue
        const identity = `${normalizeKey(candidate.PRODUCT_NM_VIET)}|${candidate.UNIT_ID}`
        if (known.has(identity)) continue
        try {
          const code = candidate.PRODUCT_CD.trim() || await getSequencePreviewCode("MD_INVENTORY", "PRODUCT_CD")
          if (!code || usedCodes.has(normalizeKey(code)) || await checkCodeExists("product", code)) throw new Error(t("MSG_CODE_EXISTS", "Mã sản phẩm trống hoặc đã tồn tại."))
          usedCodes.add(normalizeKey(code))
          const response = await createProduct.mutateAsync({
            COMPANY_CD: getCurrentCompanyCd(),
            PRODUCT_CD: code,
            PRODUCT_NM_VIET: candidate.PRODUCT_NM_VIET.trim(),
            PRODUCT_NM_ENG: "",
            PRODUCT_NM_KOR: "",
            PRODUCT_NM_CHINA: "",
            PRODUCT_KIND_ID: candidate.PRODUCT_KIND_ID,
            UNIT_ID: candidate.UNIT_ID,
            STORE_ID: candidate.STORE_ID,
            DIVISION: candidate.DIVISION,
            SUMMARY: "",
          })
          const createdProduct = response.Data
          if (response.Success === false || !createdProduct?.PRODUCT_ID) throw new Error(response.Message || t("INSERT_FAILED", "Không tạo được sản phẩm."))
          clearSysCodeSequencePreviewCache()
          known.add(identity)
          setAllProducts((current) => [...current, createdProduct])
          savedKeys.add(candidate.key)
          count += 1
        } catch (cause) { failures.push(`${candidate.PRODUCT_NM_VIET}: ${getApiErrorMessage(cause, t("INSERT_FAILED", "Lỗi tạo sản phẩm."))}`) }
      }
      setProductCandidates((current) => current.filter((candidate) => !savedKeys.has(candidate.key)))
    } finally {
      setSaving(false)
      setCreatedCount(count)
      setFailedItems(failures)
      if (count > 0) notify(t("MSG_INSERT_SUCCESS", `Đã tạo ${count} sản phẩm.`), "success", 3000)
      if (failures.length > 0) notify(t("INSERT_FAILED", `Có ${failures.length} sản phẩm chưa tạo được.`), "warning", 4000)
    }
  }, [allProducts, createProduct, selectedProductCandidates, t])

  const title = kind === "customer" ? t("VAT_QUICK_CREATE_CUSTOMER", "Tạo nhanh khách hàng") : t("VAT_QUICK_CREATE_PRODUCT", "Tạo nhanh sản phẩm")
  return (
    <Popup
      visible={visible}
      title={title}
      showTitle
      showCloseButton
      fullScreen
      wrapperAttr={{ class: "vat-quick-create-popup" }}
      dragEnabled={false}
      hideOnOutsideClick={!saving}
      onHiding={() => {
        onClose()
      }}
    >
      <ToolbarItem
        toolbar="bottom"
        location="after"
        widget="dxButton"
        options={{
          text: saving ? t("SAVING", "Đang lưu...") : t("SAVE", "Lưu"),
          icon: "save",
          type: "default",
          stylingMode: "contained",
          disabled: loading || saving || Boolean(error) || (kind === "customer" ? selectedCustomerDrafts.length === 0 : selectedProductCandidates.length === 0),
          onClick: () => void (kind === "customer" ? saveCustomers() : saveProducts()),
        }}
      />
      <ToolbarItem
        toolbar="bottom"
        location="after"
        widget="dxButton"
        options={{
          text: t("CLOSE", "Đóng"),
          icon: "close",
          stylingMode: "outlined",
          disabled: saving,
          onClick: onClose,
        }}
      />
      <div className="flex h-full min-h-0 flex-col gap-3 p-3">
        {loading && <div className="text-sm text-slate-500">{t("LOADING", "Đang tải và lọc dữ liệu...")}</div>}
        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!loading && !error && kind === "customer" && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {customerGridRows.length === 0 ? <div className="rounded border border-slate-200 p-4 text-sm text-emerald-700">Không có khách hàng cần xử lý.</div> : <>
              {customerDrafts.length > 0 && <div className="flex shrink-0 flex-wrap items-end gap-2">
                <SelectBox
                  {...createSysCodeSelectBoxEditorOptions(categoryOptions, t("CATEGORY_CD", "Mã phân loại"), t)}
                  value={bulkCategory || null}
                  stylingMode="outlined"
                  label={t("CATEGORY_CD", "Mã phân loại")}
                  labelMode="floating"
                  width={250}
                  disabled={saving}
                  onValueChanged={(event) => {
                    const value = String(event.value ?? "")
                    setBulkCategory(value)
                    setCustomerDrafts((current) => current.map((row) => ({ ...row, CATEGORY_CD: value })))
                  }}
                />
                <SelectBox
                  {...createSysCodeSelectBoxEditorOptions(customerTypeOptions, t("CUSTOMER_TYPE", "Loại khách hàng"), t)}
                  value={bulkCustomerType || null}
                  stylingMode="outlined"
                  label={t("CUSTOMER_TYPE", "Loại khách hàng")}
                  labelMode="floating"
                  width={250}
                  disabled={saving}
                  onValueChanged={(event) => {
                    const value = String(event.value ?? "")
                    setBulkCustomerType(value)
                    setCustomerDrafts((current) => current.map((row) => ({ ...row, CUSTOMER_TYPE: value })))
                  }}
                />
              </div>}
              <DataGrid<CustomerGridRow, string>
                dataSource={customerGridRows}
                keyExpr="key"
                height="100%"
                showBorders
                showRowLines
                showColumnLines
                columnAutoWidth={false}
                allowColumnResizing
                className="min-h-0 flex-1"
                onSelectionChanged={(event) => {
                  const selectableKeys = new Set(customerGridRows.filter((row) => !row.isExisting).map((row) => row.key))
                  const selectedKeys = (event.selectedRowKeys as string[]).filter((key) => selectableKeys.has(key))
                  const selected = new Set(selectedKeys)
                  setCustomerDrafts((current) => {
                    let changed = false
                    const next = current.map((row) => {
                      const isSelected = selected.has(row.key)
                      if (row.selected === isSelected) return row
                      changed = true
                      return { ...row, selected: isSelected }
                    })
                    return changed ? next : current
                  })
                }}
                onEditingStart={(event) => { if (event.data.isExisting) event.cancel = true }}
                onRowPrepared={(event) => {
                  if (event.rowType === "data" && event.data?.isExisting) {
                    event.rowElement.style.backgroundColor = "#eff6ff"
                    event.rowElement.querySelectorAll<HTMLElement>("td").forEach((cell) => { cell.style.backgroundColor = "#eff6ff" })
                  }
                }}
                onRowUpdating={(event) => {
                  if (event.oldData.isExisting) {
                    event.cancel = true
                    return
                  }
                  setCustomerDrafts((current) => current.map((row) => row.key === String(event.key) ? { ...row, ...(event.newData as Partial<CustomerDraft>) } : row))
                  event.cancel = true
                }}
              >
                <Paging enabled={false} />
                <Pager visible={false} />
                <Selection mode={saving ? "none" : "multiple"} showCheckBoxesMode="always" selectAllMode="allPages" />
                <Scrolling mode="standard" useNative />
                <Editing mode="cell" allowUpdating={!saving} allowAdding={false} allowDeleting={false} />
                <Column
                  type="buttons"
                  width={56}
                  buttons={[{
                    hint: t("REMOVE_FROM_LIST", "Loại khỏi danh sách tạo"),
                    icon: "trash",
                    visible: (event) => !event.row?.data?.isExisting,
                    onClick: (event) => {
                      const key = String(event.row?.key ?? "")
                      if (key) setCustomerDrafts((current) => current.filter((row) => row.key !== key))
                    },
                  }]}
                />
                <Column dataField="CUSTOMER_CD" caption={t("CUSTOMER_CD", "Mã khách hàng")} minWidth={150} />
                <Column dataField="CATEGORY_CD" caption={t("CATEGORY_CD", "Nhóm khách hàng")} minWidth={170} editCellRender={(cell) => <SelectBox {...createSysCodeSelectBoxEditorOptions(categoryOptions, undefined, t)} value={cell.value ?? null} disabled={saving} onValueChanged={(event) => cell.setValue(event.value == null ? "" : String(event.value))} />}>
                  <Lookup dataSource={categoryOptions} valueExpr="CODE_CD" displayExpr={createSysCodeDisplayExpr(t)} />
                </Column>
                <Column dataField="CUSTOMER_TYPE" caption={t("CUSTOMER_TYPE", "Loại khách hàng")} minWidth={170} editCellRender={(cell) => <SelectBox {...createSysCodeSelectBoxEditorOptions(customerTypeOptions, undefined, t)} value={cell.value ?? null} disabled={saving} onValueChanged={(event) => cell.setValue(event.value == null ? "" : String(event.value))} />}>
                  <Lookup dataSource={customerTypeOptions} valueExpr="CODE_CD" displayExpr={createSysCodeDisplayExpr(t)} />
                </Column>
                <Column dataField="CUSTOMER_NM_VIET" caption={t("CUSTOMER_NM_VIET", "Tên khách hàng")} minWidth={260} />
                <Column dataField="TAX_CD" caption={t("TAX_CD", "Mã số thuế")} minWidth={150} />
                <Column dataField="ADDRESS" caption={t("ADDRESS", "Địa chỉ")} minWidth={320} />
              </DataGrid>
            </>}
          </div>
        )}
        {!loading && !error && kind === "product" && !productDetailsLoaded && <div className="text-sm text-slate-500">{t("LOADING", "Đang tải và lọc dữ liệu...")}</div>}
        {!loading && !error && kind === "product" && productDetailsLoaded && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {productCandidates.length === 0 ? <div className="rounded border border-slate-200 p-4 text-sm text-emerald-700">Không có sản phẩm cần xử lý.</div> : <>
              {missingProductCandidates.length > 0 && <div className="flex shrink-0 flex-wrap items-end gap-2">
                <div className="w-[220px]">
                  <div className="mb-1 text-xs text-slate-500">{t("PRODUCTKIND_NM", "Nhóm sản phẩm")}</div>
                  <BaseLookupCellEditor<ProductKind>
                    dataSource={productKinds}
                    value={bulkProductKind}
                    valueExpr="PRODUCT_KIND_ID"
                    displayExpr={(item) => item ? `${item.PRODUCT_KIND_CD} - ${pickLocalizedText(item, "PRODUCTKIND_NM")}` : ""}
                    searchExpr={["PRODUCT_KIND_CD", "PRODUCTKIND_NM_VIET"]}
                    filterFocusField="PRODUCT_KIND_CD"
                    placeholder={t("PRODUCTKIND_NM", "Nhóm sản phẩm")}
                    popupTitle={t("PRODUCTKIND_NM", "Nhóm sản phẩm")}
                    disabled={saving}
                    onApply={(item) => {
                      const value = Number(item.PRODUCT_KIND_ID)
                      setBulkProductKind(value)
                      setProductCandidates((current) => current.map((row) => row.EXISTING_PRODUCT_CD ? row : ({ ...row, PRODUCT_KIND_ID: value })))
                    }}
                    onClear={() => {
                      setBulkProductKind(null)
                      setProductCandidates((current) => current.map((row) => row.EXISTING_PRODUCT_CD ? row : ({ ...row, PRODUCT_KIND_ID: null })))
                    }}
                    renderPopupContent={({ closePopup }) => renderSharedProductGroupLookupPage({ closePopup, onPick: (item) => {
                      const value = Number(item.PRODUCT_KIND_ID)
                      setBulkProductKind(value)
                      setProductCandidates((current) => current.map((row) => row.EXISTING_PRODUCT_CD ? row : ({ ...row, PRODUCT_KIND_ID: value })))
                    } })}
                  />
                </div>
                <div className="w-[220px]">
                  <div className="mb-1 text-xs text-slate-500">{t("UNIT_NM", "Đơn vị tính")}</div>
                  <BaseLookupCellEditor<Unit>
                    dataSource={units}
                    value={bulkUnit}
                    valueExpr="UNIT_ID"
                    displayExpr={(item) => item ? `${item.UNIT_CD} - ${item.UNIT_NM}` : ""}
                    searchExpr={["UNIT_CD", "UNIT_NM"]}
                    filterFocusField="UNIT_CD"
                    placeholder={t("UNIT_NM", "Đơn vị tính")}
                    popupTitle={t("UNIT_NM", "Đơn vị tính")}
                    disabled={saving}
                    onApply={(item) => {
                      const value = Number(item.UNIT_ID)
                      setBulkUnit(value)
                      setProductCandidates((current) => current.map((row) => row.EXISTING_PRODUCT_CD ? row : ({ ...row, UNIT_ID: value })))
                    }}
                    onClear={() => {
                      setBulkUnit(null)
                      setProductCandidates((current) => current.map((row) => row.EXISTING_PRODUCT_CD ? row : ({ ...row, UNIT_ID: null })))
                    }}
                    renderPopupContent={({ closePopup }) => renderSharedUnitLookupPage({ closePopup, onPick: (item) => {
                      const value = Number(item.UNIT_ID)
                      setBulkUnit(value)
                      setProductCandidates((current) => current.map((row) => row.EXISTING_PRODUCT_CD ? row : ({ ...row, UNIT_ID: value })))
                    } })}
                  />
                </div>
                <div className="w-[220px]">
                  <div className="mb-1 text-xs text-slate-500">{t("STORE_NM_VIET", "Kho")}</div>
                  <BaseLookupCellEditor<StoreInfo>
                    dataSource={stores}
                    value={bulkStore}
                    valueExpr="STORE_ID"
                    displayExpr={(item) => item ? `${item.STORE_CD} - ${pickLocalizedText(item, "STORE_NM")}` : ""}
                    searchExpr={["STORE_CD", "STORE_NM_VIET"]}
                    filterFocusField="STORE_CD"
                    placeholder={t("STORE_NM_VIET", "Kho")}
                    popupTitle={t("STORE_NM_VIET", "Kho")}
                    disabled={saving}
                    onApply={(item) => {
                      const value = Number(item.STORE_ID)
                      setBulkStore(value)
                      setProductCandidates((current) => current.map((row) => row.EXISTING_PRODUCT_CD ? row : ({ ...row, STORE_ID: value })))
                    }}
                    onClear={() => {
                      setBulkStore(null)
                      setProductCandidates((current) => current.map((row) => row.EXISTING_PRODUCT_CD ? row : ({ ...row, STORE_ID: null })))
                    }}
                    renderPopupContent={({ closePopup }) => renderSharedWarehouseLookupPage({ closePopup, onPick: (item) => {
                      const value = Number(item.STORE_ID)
                      setBulkStore(value)
                      setProductCandidates((current) => current.map((row) => row.EXISTING_PRODUCT_CD ? row : ({ ...row, STORE_ID: value })))
                    } })}
                  />
                </div>
                <div className="w-[240px]">
                  <div className="mb-1 text-xs text-slate-500">{t("DIVISION_CD", "Tài khoản hạch toán")}</div>
                  <AccountSelectBox value={bulkDivision} disabled={saving} onValueChanged={(value) => {
                    setBulkDivision(value)
                    setProductCandidates((current) => current.map((row) => row.EXISTING_PRODUCT_CD ? row : ({ ...row, DIVISION: value })))
                  }} />
                </div>
              </div>}
              <DataGrid<ProductCandidate, string>
                dataSource={productCandidates}
                keyExpr="key"
                height="100%"
                showBorders
                showRowLines
                showColumnLines
                columnAutoWidth={false}
                allowColumnResizing
                className="min-h-0 flex-1"
                onSelectionChanged={(event) => {
                  const selectableKeys = new Set(productCandidates.filter((row) => !row.EXISTING_PRODUCT_CD).map((row) => row.key))
                  const selectedKeys = (event.selectedRowKeys as string[]).filter((key) => selectableKeys.has(key))
                  const selected = new Set(selectedKeys)
                  setProductCandidates((current) => {
                    let changed = false
                    const next = current.map((row) => {
                      const isSelected = selected.has(row.key)
                      if (row.selected === isSelected) return row
                      changed = true
                      return { ...row, selected: isSelected }
                    })
                    return changed ? next : current
                  })
                }}
                onEditingStart={(event) => { if (event.data.EXISTING_PRODUCT_CD) event.cancel = true }}
                onRowPrepared={(event) => {
                  if (event.rowType === "data" && event.data?.EXISTING_PRODUCT_CD) {
                    event.rowElement.style.backgroundColor = "#eff6ff"
                    event.rowElement.querySelectorAll<HTMLElement>("td").forEach((cell) => { cell.style.backgroundColor = "#eff6ff" })
                  }
                }}
                onRowUpdating={(event) => {
                  if (event.oldData.EXISTING_PRODUCT_CD) {
                    event.cancel = true
                    return
                  }
                  setProductCandidates((current) => current.map((row) => row.key === String(event.key) ? { ...row, ...(event.newData as Partial<ProductCandidate>) } : row))
                  event.cancel = true
                }}
              >
                <Paging enabled={false} />
                <Pager visible={false} />
                <Selection mode={saving ? "none" : "multiple"} showCheckBoxesMode="always" selectAllMode="allPages" />
                <Scrolling mode="standard" useNative />
                <Editing mode="cell" allowUpdating={!saving} allowAdding={false} allowDeleting={false} />
                <Column
                  type="buttons"
                  width={56}
                  buttons={[{
                    hint: t("REMOVE_FROM_LIST", "Loại khỏi danh sách tạo"),
                    icon: "trash",
                    visible: (event) => !event.row?.data?.EXISTING_PRODUCT_CD,
                    onClick: (event) => {
                      const key = String(event.row?.key ?? "")
                      if (key) setProductCandidates((current) => current.filter((candidate) => candidate.key !== key))
                    },
                  }]}
                />
                <Column dataField="PRODUCT_CD" caption={t("PRODUCT_CD", "Mã sản phẩm *")} minWidth={150} />
                <Column dataField="PRODUCT_NM_VIET" caption={t("PRODUCT_NM_VIET", "Tên sản phẩm/dịch vụ *")} minWidth={300} />
                <Column dataField="INVOICE_UNIT" caption={t("INVOICE_UNIT", "ĐVT hóa đơn")} minWidth={140} />
                <Column dataField="PRODUCT_KIND_ID" caption={t("PRODUCTKIND_NM", "Nhóm sản phẩm")} minWidth={200} editCellRender={(cell) => <ProductGroupLookupCellEditor value={cell.value ?? null} rowData={cell.data} rowIndex={cell.rowIndex} grid={{}} setValue={(value) => cell.setValue(value)} />}>
                  <Lookup dataSource={productKinds} valueExpr="PRODUCT_KIND_ID" displayExpr={(item: ProductKind | null) => item ? `${item.PRODUCT_KIND_CD} - ${pickLocalizedText(item, "PRODUCTKIND_NM")}` : ""} />
                </Column>
                <Column dataField="UNIT_ID" caption={t("UNIT_NM", "Đơn vị tính *")} minWidth={200} editCellRender={(cell) => <UnitLookupCellEditor value={cell.value ?? null} rowData={cell.data} rowIndex={cell.rowIndex} grid={{}} setValue={(value) => cell.setValue(value)} />}>
                  <Lookup dataSource={units} valueExpr="UNIT_ID" displayExpr={(unit: Unit | null) => unit ? `${unit.UNIT_CD} - ${unit.UNIT_NM}` : ""} />
                </Column>
                <Column dataField="STORE_ID" caption={t("STORE_NM_VIET", "Kho")} minWidth={200} editCellRender={(cell) => <WarehouseLookupCellEditor value={cell.value ?? null} rowData={cell.data} rowIndex={cell.rowIndex} grid={{}} setValue={(value) => cell.setValue(value)} />}>
                  <Lookup dataSource={stores} valueExpr="STORE_ID" displayExpr={(item: StoreInfo | null) => item ? `${item.STORE_CD} - ${pickLocalizedText(item, "STORE_NM")}` : ""} />
                </Column>
                <Column dataField="DIVISION" caption={t("DIVISION_CD", "Tài khoản hạch toán")} minWidth={220} editCellRender={(cell) => <AccountSelectBox value={cell.value ?? null} disabled={saving} onValueChanged={(value) => cell.setValue(value)} />}>
                  <Lookup dataSource={accounts} valueExpr="CD" displayExpr={(item: etcData | null) => item ? `${item.CD} - ${pickLocalizedText(item, "NM") || pickLocalizedText(item, "ACCTITLE_NM")}` : ""} />
                </Column>
              </DataGrid>
            </>}
          </div>
        )}
        {createdCount > 0 && <div className="text-sm text-emerald-700">Đã tạo thành công: {createdCount}</div>}
        {failedItems.length > 0 && <div className="max-h-24 overflow-auto rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{failedItems.map((item) => <div key={item}>{item}</div>)}</div>}
      </div>
    </Popup>
  )
}

