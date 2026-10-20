import { useContext } from "react"
import { LanguageContext } from "@/lib/i18nLoader"
import type { ExcelImportConfig } from "@/types/modal"

export function useProductMaterialAllImportConfig(): ExcelImportConfig {
  const { translate } = useContext(LanguageContext)
  return {
    moduleCd: "ProductMaterialInfoAll",
    templateName: translate?.("PRODUCT_MATERIAL_IMPORT_ALL", "Import tất cả thành phẩm") ?? "ProductMaterialInfoAll",
  }
}
