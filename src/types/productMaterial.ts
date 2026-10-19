export interface ProductMaterialRow {
  MATERIAL_ID: number
  COMPANY_CD: string
  PRODUCT_ID: number
  MATERIAL_PRODUCT_ID: number
  MATERIAL_PRODUCT_CD: string
  MATERIAL_PRODUCT_NM: string
  UNIT_NM: string | null
  QUANTITY: number
}

export interface ProductMaterialSummary {
  PRODUCT_ID: number
  MATERIAL_COUNT: number
}

export interface ProductMaterialSave {
  PRODUCT_ID: number
  MATERIAL_PRODUCT_ID: number
  QUANTITY: number
}
