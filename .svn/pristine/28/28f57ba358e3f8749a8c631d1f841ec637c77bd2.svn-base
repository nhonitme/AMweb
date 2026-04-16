export interface ColumnMapping {
  softwareColumn: string
  excelColumn: string
  required: boolean
  description: string
}

export interface ValidationResult {
  rowIndex: number
  isValid: boolean
  errors: string[]
  data: Record<string, any>
}

export interface ExcelData {
  [key: string]: any
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
  templateName: string
  columnMappings: ColumnMapping[]
  validationRules?: {
    [key: string]: (value: any, allData: any[], existingData: any[]) => string[]
  }
  sampleData?: any[][]
  instructions?: string[]
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
  translations: {
    vi: any
    en: any
    ko: any
  }
}
