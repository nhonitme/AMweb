export interface InventoryOpening {
  INPUT_ID: number
  INPUT_CD?: string
  TRANSFER_ID?: number
  TRANSFER_CD?: string
  TRANSFER_NO?: string
  TRANSFER_YMD?: string
  COMPANY_CD?: string
  PRODUCT_ID?: number | null
  PRODUCT_CD: string
  PRODUCT_NM_VIET?: string
  PRODUCT_NM_ENG?: string
  PRODUCT_NM_KOR?: string
  PRODUCT_NM_CHINA?: string
  STORE_ID?: number | null
  STORE_CD: string
  STORE_NM_VIET?: string
  STORE_NM_ENG?: string
  STORE_NM_KOR?: string
  STORE_NM_CHINA?: string
  UNIT_ID?: number | null
  UNIT_CD?: string
  UNIT_NM?: string
  QUANTITY: number
  UNIT_PRICE_CC: number
  AMOUNT_CC: number
  SUMMARY?: string
  INVENTORY_YMD?: string
  STATE?: string
  SORT?: number
}

export type InventoryOpeningRequest = Partial<InventoryOpening>

export type InventoryOpeningNameField =
  | "PRODUCT_NM_VIET"
  | "PRODUCT_NM_ENG"
  | "PRODUCT_NM_KOR"
  | "PRODUCT_NM_CHINA"
  | "STORE_NM_VIET"
  | "STORE_NM_ENG"
  | "STORE_NM_KOR"
  | "STORE_NM_CHINA"

export function getInventoryOpeningProductNameField(lang?: string | null): InventoryOpeningNameField {
  switch (String(lang ?? "").trim().toUpperCase()) {
    case "ENG":
      return "PRODUCT_NM_ENG"
    case "KOR":
      return "PRODUCT_NM_KOR"
    case "CHN":
    case "CHINA":
    case "THA":
      return "PRODUCT_NM_CHINA"
    default:
      return "PRODUCT_NM_VIET"
  }
}

export function getInventoryOpeningStoreNameField(lang?: string | null): InventoryOpeningNameField {
  switch (String(lang ?? "").trim().toUpperCase()) {
    case "ENG":
      return "STORE_NM_ENG"
    case "KOR":
      return "STORE_NM_KOR"
    case "CHN":
    case "CHINA":
    case "THA":
      return "STORE_NM_CHINA"
    default:
      return "STORE_NM_VIET"
  }
}

export function getInventoryOpeningLocalizedName(
  row: Partial<InventoryOpening> | null | undefined,
  field: InventoryOpeningNameField,
  fallbackCode?: string,
): string {
  const value = String(row?.[field] ?? "").trim()
  if (value) return value
  return String(fallbackCode ?? "").trim()
}
