import { memo, useContext, useMemo, useState } from "react"
import notify from "devextreme/ui/notify"
import { getApiErrorMessage } from "@/api/apiTypes"
import { useQuery } from "@tanstack/react-query"
import { getProducts } from "@/api/productApi"
import { getCurrentCompanyCd } from "@/lib/login"
import { LanguageContext } from "@/lib/i18nLoader"
import type { Product } from "@/types/product"

function EInvoicePosProducts({ disabled, onSelect }: {
  disabled: boolean
  onSelect: (product: Product) => Promise<void>
}) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState(false)
  const companyCd = getCurrentCompanyCd()
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["einvoice-pos-products", companyCd], queryFn: getProducts,
    enabled: Boolean(companyCd), staleTime: 60000,
  })
  const products = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("vi")
    return data.filter(p => `${p.PRODUCT_CD} ${p.PRODUCT_NM_VIET}`.toLocaleLowerCase("vi").includes(term)).slice(0, 60)
  }, [data, search])
  const select = async (product: Product) => {
    if (disabled || adding) return
    setAdding(true)
    try { await onSelect(product) } catch (error) { notify(getApiErrorMessage(error, "Không thể thêm hàng hóa"), "error", 3000) } finally { setAdding(false) }
  }
  return <section className="einvoice-pos-products">
    <h2>{t("SELECT_PRODUCT", "Chọn hàng hóa")}</h2>
    <input
      aria-label={t("POS_SEARCH_PRODUCT", "Tìm hàng hóa POS")}
      placeholder={t("POS_SEARCH_HINT", "Tìm mã hoặc tên hàng hóa…")}
      value={search}
      onChange={e => setSearch(e.target.value)} onKeyDown={e => {
        if (e.key === "Enter" && products.length === 1) { e.preventDefault(); void select(products[0]) }
      }} />
    {isLoading && <p>{t("LOADING_PRODUCTS", "Đang tải hàng hóa…")}</p>}
    {isError && (
      <button type="button" onClick={() => void refetch()}>
        {t("PRODUCTS_LOAD_RETRY", "Không tải được hàng hóa. Thử lại")}
      </button>
    )}
    {!isLoading && !isError && products.length === 0 && <p>Không tìm thấy hàng hóa.</p>}
    <div className="einvoice-pos-products__items">{products.map(product =>
      <button type="button" key={product.PRODUCT_ID} disabled={disabled || adding} onClick={() => void select(product)}>
        <strong>{product.PRODUCT_NM_VIET || product.PRODUCT_CD}</strong>
        <span>{product.PRODUCT_CD} · {product.UNIT_NM || product.UNIT_CD}</span>
      </button>)}</div>
  </section>
}

export default memo(EInvoicePosProducts)
