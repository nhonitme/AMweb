export type SysGridColumnSetting = {
  ID: number
  COMPANY_CD: string
  USER_ID: string
  SCREEN_CD: string
  GRID_ID: string
  COLUMN_NAME: string
  COLUMN_CAPTION: string
  IS_VISIBLE: string
  VISIBLE_INDEX: number | null
  COLUMN_WIDTH: number | null
  IS_FIXED: string
  FIXED_POSITION: string
  ALLOW_HIDING: string
  SORT_ORDER: string
  SORT_INDEX: number | null
  CREATE_BY: string
  CREATE_AT: string
  UPDATE_BY: string
  UPDATE_AT: string
  ISDEL: string
}

export type SysGridColumnSettingSaveItem = {
  COLUMN_NAME: string
  COLUMN_CAPTION?: string
  IS_VISIBLE?: string
  VISIBLE_INDEX?: number | null
  COLUMN_WIDTH?: number | null
  IS_FIXED?: string
  FIXED_POSITION?: string
  ALLOW_HIDING?: string
  SORT_ORDER?: string
  SORT_INDEX?: number | null
}

export type SysGridColumnSettingSaveRequest = {
  SCREEN_CD?: string
  GRID_ID?: string
  COLUMNS: SysGridColumnSettingSaveItem[]
}

export type GridColumnSettingEditorItem = {
  columnName: string
  caption: string
  isVisible: boolean
  width: number | null
  fixedPosition: "none" | "left" | "right"
  visibleIndex: number | null
  allowHiding: boolean
  sortOrder: string
  sortIndex: number | null
}
