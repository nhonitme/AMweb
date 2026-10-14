export type InventoryPriceFlow = "IN" | "OUT"

export type InventoryPriceUpdateRow = {
  PRODUCT_CD: string
  PRODUCT_NAME: string
  MOVEMENT_COUNT: number
  TOTAL_QUANTITY: number
  CURRENT_PRICE_MIN: number
  CURRENT_PRICE_MAX: number
  CURRENT_AMOUNT: number
  NEW_UNIT_PRICE: number | null
}

export type InventoryPriceUpdateFilter = {
  STORE_CD: string
  FROM_YMD: string
  TO_YMD: string
}

export type InventoryPriceUpdateBatch = InventoryPriceUpdateFilter & {
  ROWS: InventoryPriceUpdateRow[]
}
