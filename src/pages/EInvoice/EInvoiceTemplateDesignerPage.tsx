import { useMemo } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"

import DxPage from "@/dx/DxPage"
import { useEInvoiceSettingSellersQuery } from "@/hooks/queries/useEInvoiceSettingQueries"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"

import EInvoiceTemplateDesignerPopup from "./components/EInvoiceTemplateDesignerPopup"

function positiveId(value: unknown) {
  const numeric = Math.trunc(Number(value ?? 0))
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

function templateLabel(row: {
  SELLER_NM?: string | null
  KHMSHDON?: string | null
  KHHDON?: string | null
  XSL_TEMPLATE_NM?: string | null
  XSL_ID?: number
  SELLER_ID?: number
}) {
  const identity = [String(row.KHMSHDON ?? "").trim(), String(row.KHHDON ?? "").trim()].filter(Boolean).join(" / ")
  const summary = [identity, String(row.SELLER_NM ?? "").trim()].filter(Boolean).join(" - ")
  const name = String(row.XSL_TEMPLATE_NM ?? "").trim()
  if (name) return `${summary || row.XSL_ID} (${name})`
  return summary || String(row.XSL_ID ?? row.SELLER_ID ?? "")
}

export default function EInvoiceTemplateDesignerPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const companyCd = getCurrentCompanyCd()
  const xslId = positiveId(searchParams.get("xslId"))
  const sellerId = positiveId(searchParams.get("sellerId"))
  const { data: sellerData } = useEInvoiceSettingSellersQuery()

  const templates = useMemo(
    () =>
      (sellerData ?? [])
        .map(row => ({
          XSL_ID: positiveId(row.XSL_ID),
          SELLER_ID: positiveId(row.SELLER_ID),
          LABEL: templateLabel(row),
        }))
        .filter(row => row.XSL_ID > 0)
        .sort((left, right) => left.LABEL.localeCompare(right.LABEL)),
    [sellerData],
  )

  return (
    <DxPage>
      <div className="h-full min-h-0">
        <EInvoiceTemplateDesignerPopup
          xslId={xslId}
          sellerId={sellerId}
          templates={templates}
          onTemplateChange={(nextXslId, nextSellerId) => {
            const next = new URLSearchParams(searchParams)
            if (nextXslId > 0) next.set("xslId", String(nextXslId))
            else next.delete("xslId")
            if (nextSellerId > 0) next.set("sellerId", String(nextSellerId))
            else next.delete("sellerId")
            const nextSearch = next.toString()
            // Do not use setSearchParams here: with scoped Routes (/app/{company} stripped),
            // relative search navigation can drop the company prefix, then App remounts
            // /app/{company}/... without query.
            navigate(
              {
                pathname: buildAppPath(companyCd, "/einvoice/setting/designer"),
                search: nextSearch ? `?${nextSearch}` : "",
                hash: location.hash,
              },
              { replace: true },
            )
          }}
        />
      </div>
    </DxPage>
  )
}
