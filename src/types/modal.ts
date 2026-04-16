export interface ColumnMapping {
  softwareColumn: string
  excelColumn: string
  required: boolean
  description: string
}

export type ExcelValue = string | number | boolean | null | undefined

export interface ValidationResult {
  rowIndex: number
  isValid: boolean
  errors: string[]
  data: Record<string, ExcelValue>
}

export interface ExcelData {
  [key: string]: ExcelValue
}

export interface PrintLanguage {
  code: "vi" | "en" | "ko"
  name: string
  flag: string
}

export interface CompanyInfo {
  name: string
  address: string
  taxCode: string
}

export interface ExcelImportConfig {
  templateName: string,
  moduleCd?: string
  columnMappings?: ColumnMapping[]
  uniqueColumn?: string
  validationRules?: Record<string, (value: ExcelValue, allRows: ExcelData[], existingData: any[]) => string[]>
}

export interface PrintConfig {
  title: {
    vi: string
    en: string
    ko: string
  }
  columns: {
    [key: string]: {
      vi: string
      en: string
      ko: string
    }
  }
  translations: Record<string, {
    vi: string
    en: string
    ko: string
  }>
}
