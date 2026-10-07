import type { ExcelImportConfig } from "@/types/modal"
import { useContext } from "react"
import { LanguageContext } from "@/lib/i18nLoader"

type TranslateFn = (key: string, fallback?: string) => string

export const createInventoryOpeningImportConfig = (translate?: TranslateFn): ExcelImportConfig => {
  const t: TranslateFn = (k, f) => (translate ? translate(k, f) : (f ?? k))
  return {
    moduleCd: "InventoryOpening",
    // Base name only — BaseExcelImportPopup appends _timestamp.xlsx
    templateName: t("INVENTORY_OPENING", "InventoryOpening"),
  }
}

export const useInventoryOpeningImportConfig = (): ExcelImportConfig => {
  const { translate } = useContext(LanguageContext)
  return createInventoryOpeningImportConfig(translate)
}
