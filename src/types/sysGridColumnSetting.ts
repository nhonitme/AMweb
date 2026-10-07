export type SysGridColumn = {
  ID: number
  GRID_ID: string
  FIELD_NAME: string
  /** Prefer setting.LABEL_TEXT when coalesced; otherwise sys_grid_column.LABEL_TEXT. */
  LABEL_TEXT?: string | null
  /** sys_grid_column.LABEL_TEXT kept for caption resolve after setting LABEL_TEXT misses translation. */
  COLUMN_LABEL_TEXT?: string | null
  /** Always from sys_grid_column.CAPTION (never setting.CAPTION). */
  CAPTION: string
  IS_VISIBLE: string
  VISIBLE_INDEX: number | null
  COLUMN_WIDTH: number | null
  IS_FIXED: string
  FIXED_POSITION?: string | null
  ALLOW_HIDING: string
  ALIGN?: string | null
  FORMAT_TYPE?: string | null
  SORT_ORDER?: string | null
  SORT_INDEX: number | null
}

export type SysGridColumnSetting = {
  ID: number
  TEMPLATE_ID: number
  GRID_ID: string
  FIELD_NAME: string
  LABEL_TEXT?: string | null
  CAPTION?: string | null
  IS_VISIBLE?: string | null
  VISIBLE_INDEX?: number | null
  COLUMN_WIDTH?: number | null
  IS_FIXED?: string | null
  FIXED_POSITION?: string | null
  ALLOW_HIDING?: string | null
  SORT_ORDER?: string | null
  SORT_INDEX?: number | null
}

export type SysGridColumnTemplate = {
  TEMPLATE_ID: number
  COMPANY_CD: string
  USER_ID: string
  GRID_ID: string
  TEMPLATE_NAME: string
  IS_DEFAULT_TEMPLATE: string
}

export type SysGridColumnBundle = {
  COLUMNS: SysGridColumn[]
  TEMPLATES: SysGridColumnTemplate[]
  SETTINGS: SysGridColumnSetting[]
}

export type SysGridColumnSettingSaveItem = {
  FIELD_NAME: string
  LABEL_TEXT?: string | null
  CAPTION?: string | null
  IS_VISIBLE?: string | null
  VISIBLE_INDEX?: number | null
  COLUMN_WIDTH?: number | null
  IS_FIXED?: string | null
  FIXED_POSITION?: string | null
  ALLOW_HIDING?: string | null
  SORT_ORDER?: string | null
  SORT_INDEX?: number | null
}

export type SysGridColumnSettingSaveRequest = {
  GRID_ID: string
  TEMPLATE_ID?: number
  TEMPLATE_NAME?: string
  IS_DEFAULT_TEMPLATE?: string
  COLUMNS: SysGridColumnSettingSaveItem[]
}

export type SysGridColumnResetRequest = {
  GRID_ID: string
}

export type GridColumnTemplateOption = {
  templateId: number
  templateName: string
  isDefaultTemplate: boolean
  isSystemTemplate: boolean
  columnCount: number
}

export type GridColumnSettingEditorItem = {
  columnName: string
  caption: string
  /** sys_grid_column_setting.LABEL_TEXT */
  labelText?: string | null
  /** sys_grid_column.LABEL_TEXT */
  columnLabelText?: string | null
  isVisible: boolean
  width: number | null
  fixedPosition: "none" | "left" | "right"
  visibleIndex: number | null
  allowHiding: boolean
  sortOrder: string
  sortIndex: number | null
  alignment?: string | null
  formatType?: string | null
}

export const SYSTEM_GRID_TEMPLATE_ID = 0
