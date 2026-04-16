import type { Customer } from "@/types/customer";

export interface ColumnConfig {
  id: string
  dataField: string
  displayName: string
  width: number
  visible: boolean
  pinned: boolean
  originalOrder: number
}

export interface BaseTableItem {
  id: string
  [key: string]: any
}

export interface TablePageProps<T extends BaseTableItem> {
  title: string
  description?: string
  columns: ColumnConfig[]
  data: T[]
  onImport?: (data: any[], method: "add" | "update" | "overwrite") => void
  onPrint?: (lang: "vi" | "en" | "ko") => void
  onAdd?: (newItem: T) => Promise<{ success: boolean; message: string }>
  onEdit?: (item: T) => Promise<{ success: boolean; message: string }>
  onDelete?: (id: string) => void
  onBulkDelete?: (ids: string[]) => void
  onRefresh?: () => Promise<void>
  onExport?: () => void
  searchFields?: string[]
  enableTreeView?: boolean
  parentField?: string
  childrenField?: string
  companyInfo?: {
    name: string
    address: string
    taxCode: string
  }
  isInitialLoading?: boolean
  excelImportConfig?: import("@/types/modal").ExcelImportConfig
  printConfig?: import("@/types/modal").PrintConfig
  formConfig?: import("@/types/form").FormConfig
  deleteConfig?: import("@/types/form").DeleteConfig
  bulkDeleteConfig?: import("@/types/form").DeleteConfig
}
