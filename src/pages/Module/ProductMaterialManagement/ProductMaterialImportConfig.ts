import { useContext } from "react"
import { LanguageContext } from "@/lib/i18nLoader"
import type { ExcelImportConfig } from "@/types/modal"

export function useProductMaterialImportConfig(): ExcelImportConfig {
  const { translate } = useContext(LanguageContext)
  return {
    moduleCd: "ProductMaterialInfo",
    templateName: translate?.("PRODUCT_MATERIAL", "Khai bao nguyen vat lieu") ?? "ProductMaterialInfo",
  }
}
