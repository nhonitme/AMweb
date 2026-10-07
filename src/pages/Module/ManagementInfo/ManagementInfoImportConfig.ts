import { useContext } from "react"

import { LanguageContext } from "@/lib/i18nLoader"
import type { ExcelImportConfig } from "@/types/modal"

type TranslateFn = (key: string, fallback?: string) => string

export const createManagementInfoImportConfig = (translate?: TranslateFn): ExcelImportConfig => {
  const t: TranslateFn = (key, fallback) => (translate ? translate(key, fallback) : fallback ?? key)

  return {
    moduleCd: "ManagementInfo",
    templateName: `${t("ManagementInfo", "Management Info")}_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`,
  }
}

export const useManagementInfoImportConfig = (): ExcelImportConfig => {
  const context = useContext(LanguageContext) as {
    translate?: TranslateFn
  }

  return createManagementInfoImportConfig(context.translate)
}
