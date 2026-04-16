import { useContext } from "react"

import { LanguageContext } from "@/lib/i18nLoader"
import type { ExcelImportConfig } from "@/types/modal"

type TranslateFn = (key: string, fallback?: string) => string

export const createManagementInfoImportConfig = (translate?: TranslateFn): ExcelImportConfig => {
  const t: TranslateFn = (key, fallback) => (translate ? translate(key, fallback) : fallback ?? key)

  return {
    moduleCd: "ManagementInfo",
    templateName: `${t("ManagementInfo", "Management Info")}_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`,
    uniqueColumn: "MG_CD",
    columnMappings: [
      {
        softwareColumn: "MG_CD",
        excelColumn: "MG_CD",
        required: true,
        description: t("MG_CD", "Management Code"),
      },
      {
        softwareColumn: "MG_DESC_KOR",
        excelColumn: "MG_DESC_KOR",
        required: false,
        description: t("MG_DESC_KOR", "Tên quản lý (KOR)"),
      },
      {
        softwareColumn: "MG_DESC_ENG",
        excelColumn: "MG_DESC_ENG",
        required: false,
          description: t("MG_DESC_ENG", "Tên quản lý (ENG)"),
      },
      {
        softwareColumn: "MG_DESC_VIET",
        excelColumn: "MG_DESC_VIET",
        required: false,
          description: t("MG_DESC_VIET", "Tên quản lý (VIET)"),
      },
      {
        softwareColumn: "MG_CD_ROOT",
        excelColumn: "MG_CD_ROOT",
        required: false,
        description: t("MG_CD_ROOT", "Mã quản lý gốc"),
      },
    ],
  }
}

export const useManagementInfoImportConfig = (): ExcelImportConfig => {
  const context = useContext(LanguageContext) as {
    translate?: TranslateFn
  }

  return createManagementInfoImportConfig(context.translate)
}
