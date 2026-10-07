import type { ReactNode } from "react"

import { filterActiveLangFields, pickLocalizedText } from "@/lib/companyLang"
import type { CustomerExt } from "@/types/customerExt"
import { firstLookupText, trimLookupText } from "./lookupHelpers"

export function getCustomerLookupName(
  item?: Partial<CustomerExt> | Record<string, unknown> | null,
  preferredNameField = "CUSTOMER_NM_VIET",
): string {
  if (!item) {
    return ""
  }

  return pickLocalizedText(item, "CUSTOMER_NM") || firstLookupText((item as Record<string, unknown>)[preferredNameField])
}

export function buildCustomerLookupSearchExpr(
  preferredNameField = "CUSTOMER_NM_VIET",
  includeTaxCode = false,
): string[] {
  return filterActiveLangFields(Array.from(
    new Set(
      [
        "CUSTOMER_CD",
        preferredNameField,
        "CUSTOMER_NM_VIET",
        "CUSTOMER_NM_ENG",
        "CUSTOMER_NM_KOR",
        "CUSTOMER_NM_CHINA",
        includeTaxCode ? "TAX_CD" : null,
      ].filter((field): field is string => Boolean(field)),
    ),
  ))
}

export function renderCustomerLookupItem(
  item: CustomerExt | null,
  options: {
    preferredNameField?: string
    taxCodeCaption: string
    addressCaption: string
  },
): ReactNode {
  if (!item) {
    return null
  }

  const customerCd = trimLookupText(item.CUSTOMER_CD)
  const customerName = getCustomerLookupName(item, options.preferredNameField)
  const taxCd = trimLookupText(item.TAX_CD)
  const address = trimLookupText(item.ADDRESS)

  return (
    <div className="flex flex-col gap-1 py-2 leading-tight">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-slate-900">{customerCd || "-"}</span>
        <span className="text-slate-600">{customerName || "-"}</span>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span>{`${options.taxCodeCaption}: ${taxCd || "-"}`}</span>
        <span>{`${options.addressCaption}: ${address || "-"}`}</span>
      </div>
    </div>
  )
}
