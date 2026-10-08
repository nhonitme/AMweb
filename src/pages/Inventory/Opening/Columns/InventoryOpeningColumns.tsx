import React, { useContext, useMemo } from "react"
import { Column } from "devextreme-react/data-grid"
import type { InventoryOpening } from "@/types/inventoryOpening"
import {
  getInventoryOpeningProductNameField,
  getInventoryOpeningStoreNameField,
} from "@/types/inventoryOpening"
import type { Product } from "@/types/product"
import type { StoreInfo } from "@/types/store"
import type { Unit } from "@/types/unit"
import { LanguageContext } from "@/lib/i18nLoader"
import { normalizeMessageLanguageKey } from "@/utils/language"
import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function calcAmount(quantity: unknown, unitPrice: unknown): number {
  return toNumber(quantity) * toNumber(unitPrice)
}

export const InventoryOpeningColumns: React.FC = () => {
  const { lang } = useContext(LanguageContext) as {
    lang: string
  }
  const langKey = normalizeMessageLanguageKey(lang)
  const productNameField = useMemo(() => getInventoryOpeningProductNameField(langKey), [langKey])
  const storeNameField = useMemo(() => getInventoryOpeningStoreNameField(langKey), [langKey])
  const { getFormat } = useDecimalColumnFormats()
  const quantityFormat = getFormat("QUANTITY", "#,##0.###")
  const unitPriceFormat = getFormat("UNIT_PRICE_CC", "#,##0.00")
  const amountFormat = getFormat("AMOUNT_CC", "#,##0.00")

  return (
    <>
      <Column dataField="INPUT_ID" />
      <Column dataField="TRANSFER_ID" />
      <Column dataField="PRODUCT_ID"        setCellValue={(newData: InventoryOpening, value: number) => {
          newData.PRODUCT_ID = value
        }}
      >
        
      </Column>
      <Column dataField="PRODUCT_CD" allowEditing={false} />
      <Column dataField="PRODUCT_NM_VIET" allowEditing={false} />
      {/* visible={productNameField === "PRODUCT_NM_VIET"} /> */}
      <Column dataField="PRODUCT_NM_ENG" allowEditing={false} />
      {/* visible={productNameField === "PRODUCT_NM_ENG"} /> */}
      <Column dataField="PRODUCT_NM_KOR" allowEditing={false} />
      {/* visible={productNameField === "PRODUCT_NM_KOR"} /> */}
      <Column dataField="PRODUCT_NM_CHINA" allowEditing={false} />
      {/* visible={productNameField === "PRODUCT_NM_CHINA"} /> */}
      <Column dataField="STORE_ID"        setCellValue={(newData: InventoryOpening, value: number) => {
          newData.STORE_ID = value
        }}
      >
        
      </Column>
      <Column dataField="STORE_CD" allowEditing={false} />
      <Column dataField="STORE_NM_VIET" allowEditing={false} />
      {/* visible={storeNameField === "STORE_NM_VIET"} /> */}
      <Column dataField="STORE_NM_ENG" allowEditing={false} />
      {/* visible={storeNameField === "STORE_NM_ENG"} /> */}
      <Column dataField="STORE_NM_KOR" allowEditing={false} />
      {/* visible={storeNameField === "STORE_NM_KOR"} /> */}
      <Column dataField="STORE_NM_CHINA" allowEditing={false} />
      {/* visible={storeNameField === "STORE_NM_CHINA"} /> */}
      <Column dataField="UNIT_ID" />
      <Column dataField="UNIT_CD" allowEditing={false} />
      <Column dataField="UNIT_NM" visible={true} allowEditing={false} />
      <Column
        dataField="QUANTITY"
        dataType="number"
        format={quantityFormat}
        editorOptions={createNumberEditorOptions(quantityFormat)}
        setCellValue={(newData: InventoryOpening, value: number, currentRowData: InventoryOpening) => {
          newData.QUANTITY = toNumber(value)
          // Recalc amount from qty/price; never reverse-calc qty/price from amount.
          newData.AMOUNT_CC = calcAmount(value, currentRowData?.UNIT_PRICE_CC ?? newData.UNIT_PRICE_CC)
        }}
      >
        
      </Column>
      <Column
        dataField="UNIT_PRICE_CC"
        dataType="number"
        format={unitPriceFormat}
        editorOptions={createNumberEditorOptions(unitPriceFormat)}
        setCellValue={(newData: InventoryOpening, value: number, currentRowData: InventoryOpening) => {
          newData.UNIT_PRICE_CC = toNumber(value)
          newData.AMOUNT_CC = calcAmount(currentRowData?.QUANTITY ?? newData.QUANTITY, value)
        }}
      >
        
      </Column>
      <Column
        dataField="AMOUNT_CC"
        dataType="number"
        format={amountFormat}
        editorOptions={createNumberEditorOptions(amountFormat)}
        setCellValue={(newData: InventoryOpening, value: number) => {
          // Manual amount only — do not change QUANTITY / UNIT_PRICE_CC.
          newData.AMOUNT_CC = toNumber(value)
        }}
      />
      <Column dataField="SUMMARY" visible={true} />
    </>
  )
}

export function applyProductLookup(row: InventoryOpening, product: Product | null | undefined) {
  if (!product) return
  row.PRODUCT_ID = product.PRODUCT_ID
  row.PRODUCT_CD = product.PRODUCT_CD
  row.PRODUCT_NM_VIET = product.PRODUCT_NM_VIET || ""
  row.PRODUCT_NM_ENG = product.PRODUCT_NM_ENG || ""
  row.PRODUCT_NM_KOR = product.PRODUCT_NM_KOR || ""
  row.PRODUCT_NM_CHINA = product.PRODUCT_NM_CHINA || ""
  if (product.UNIT_ID) {
    row.UNIT_ID = product.UNIT_ID
    row.UNIT_CD = product.UNIT_CD
    row.UNIT_NM = product.UNIT_NM
  }
}

export function applyStoreLookup(row: InventoryOpening, store: StoreInfo | null | undefined) {
  if (!store) return
  row.STORE_ID = store.STORE_ID
  row.STORE_CD = store.STORE_CD
  row.STORE_NM_VIET = store.STORE_NM_VIET || ""
  row.STORE_NM_ENG = store.STORE_NM_ENG || ""
  row.STORE_NM_KOR = store.STORE_NM_KOR || ""
  row.STORE_NM_CHINA = store.STORE_NM_CHINA || ""
}

export function applyUnitLookup(row: InventoryOpening, unit: Unit | null | undefined) {
  if (!unit) return
  row.UNIT_ID = unit.UNIT_ID
  row.UNIT_CD = unit.UNIT_CD
  row.UNIT_NM = unit.UNIT_NM
}
