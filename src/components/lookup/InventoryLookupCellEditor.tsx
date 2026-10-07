import { useCallback } from "react"
import { filterActiveLangFields, pickLocalizedText } from "@/lib/companyLang"
import type { Product } from "@/types/product"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { inventoryLookupStore } from "./inventoryLookupStore"
import { getAcclistLookupStore } from "./AcclistLookupStore"
import type { etcData } from "@/types/etcData"
import notify from "devextreme/ui/notify"
import { renderSharedProductLookupPage } from "./sharedMasterLookupPages"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import {
  hasLookupRowField,
  restoreLookupGridCellFocus,
  type LookupGridCellValueHost,
  setLookupGridCellValue,
  toLookupNumber,
  trimLookupText,
} from "./lookupHelpers"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData: Record<string, unknown>
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: string | number | null) => void
  valueMode?: "id" | "code"
  productIdField?: string
  productCdField?: string
  productNmField?: string
  productGroupIdField?: string
  productGroupCdField?: string
  productGroupNmField?: string
  unitIdField?: string
  unitCdField?: string
  unitNmField?: string
  warehouseIdField?: string
  warehouseCdField?: string
  warehouseNmField?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  autoOpen?: LookupOpenMode | null
  useCogsAccounts?: boolean
}

export default function InventoryLookupCellEditor({
  dataSource = inventoryLookupStore,
  value,
  rowData,
  rowIndex,
  grid,
  setValue,
  valueMode = "id",
  productIdField = "PRODUCT_ID",
  productCdField = "PRODUCT_CD",
  productNmField = "PRODUCT_NM_VIET",
  productGroupIdField = "PRODUCT_KIND_ID",
  productGroupCdField = "PRODUCT_KIND_CD",
  productGroupNmField = "PRODUCTKIND_NM_VIET",
  unitIdField = "UNIT_ID",
  unitCdField = "UNIT_CD",
  unitNmField = "UNIT_NM",
  warehouseIdField = "STORE_ID",
  warehouseCdField = "STORE_CD",
  warehouseNmField = "STORE_NM_VIET",
  placeholder = "Chọn vật tư",
  popupTitle = "Chọn vật tư",
  buttonHint = "Mở danh sách vật tư",
  autoOpen,
  useCogsAccounts = false,
}: Props) {
  const getProductName = useCallback(
    (item?: Partial<Product> | null) => pickLocalizedText(item, "PRODUCT_NM"),
    [],
  )

  const displayExpr = useCallback(
    (item: Product | null) => {
      const productCd = trimLookupText(item?.PRODUCT_CD)
      const productName = getProductName(item)

      if (productCd && productName) {
        return `${productCd} - ${productName}`
      }

      return productCd || productName
    },
    [getProductName],
  )

  const applyProduct = useCallback(
    async (product: Product) => {
      try {
      let debitAccount = ""
      const creditAccount = trimLookupText(product.DIVISION)
      if (useCogsAccounts) {
        const accounts = await getAcclistLookupStore().load() as etcData[]
        const children = accounts.filter(account => account.CD.startsWith("632") && account.CD !== "632")
          .sort((left, right) => left.CD.localeCompare(right.CD))
        if (!creditAccount.startsWith("156")) throw new Error(`Hàng ${product.PRODUCT_CD}: tài khoản DIVISION phải thuộc 156.`)
        if (!accounts.some(account => account.CD === creditAccount)) throw new Error(`Tài khoản ${creditAccount} của hàng ${product.PRODUCT_CD} không có trong lookup.`)
        debitAccount = children.length ? children[0].CD : "632"
      }
      const productId = toLookupNumber(product.PRODUCT_ID)
      const productCd = trimLookupText(product.PRODUCT_CD)

      if (import.meta.env.DEV) {
        console.debug("[inventory-lookup] apply product", {
          rowIndex, productId, productCd,
          storeId: product.STORE_ID, storeCd: product.STORE_CD,
        })
      }

      setValue(valueMode === "code" ? productCd || null : productId)
      setLookupGridCellValue(grid, rowIndex, productIdField, productId)
      setLookupGridCellValue(grid, rowIndex, productCdField, productCd)
      setLookupGridCellValue(grid, rowIndex, productNmField, trimLookupText(product.PRODUCT_NM_VIET))
      if (useCogsAccounts) {
        setLookupGridCellValue(grid, rowIndex, "COGS_DEBIT", debitAccount)
        setLookupGridCellValue(grid, rowIndex, "COGS_CREDIT", creditAccount)
      }

      if (hasLookupRowField(rowData, productGroupIdField)) {
        setLookupGridCellValue(grid, rowIndex, productGroupIdField, toLookupNumber(product.PRODUCT_KIND_ID))
      }

      if (hasLookupRowField(rowData, productGroupCdField)) {
        setLookupGridCellValue(grid, rowIndex, productGroupCdField, trimLookupText(product.PRODUCT_KIND_CD))
      }

      if (hasLookupRowField(rowData, productGroupNmField)) {
        setLookupGridCellValue(grid, rowIndex, productGroupNmField, trimLookupText(product.PRODUCTKIND_NM_VIET))
      }

      if (hasLookupRowField(rowData, unitIdField)) {
        setLookupGridCellValue(grid, rowIndex, unitIdField, toLookupNumber(product.UNIT_ID))
      }

      if (hasLookupRowField(rowData, unitCdField)) {
        setLookupGridCellValue(grid, rowIndex, unitCdField, trimLookupText(product.UNIT_CD))
      }

      if (hasLookupRowField(rowData, unitNmField)) {
        setLookupGridCellValue(grid, rowIndex, unitNmField, trimLookupText(product.UNIT_NM))
      }

      if (hasLookupRowField(rowData, warehouseIdField)) {
        setLookupGridCellValue(grid, rowIndex, warehouseIdField, toLookupNumber(product.STORE_ID))
      }

      if (hasLookupRowField(rowData, warehouseCdField)) {
        setLookupGridCellValue(grid, rowIndex, warehouseCdField, trimLookupText(product.STORE_CD))
      }

      if (hasLookupRowField(rowData, warehouseNmField)) {
        setLookupGridCellValue(grid, rowIndex, warehouseNmField, trimLookupText(product.STORE_NM_VIET))
      }
      restoreLookupGridCellFocus(grid, rowIndex, productCdField)
      } catch (error) {
        notify(error instanceof Error ? error.message : String(error), "error", 5000)
      }
    },
    [
      grid,
      productCdField,
      productGroupCdField,
      productGroupIdField,
      productGroupNmField,
      productIdField,
      productNmField,
      rowData,
      rowIndex,
      setValue,
      unitCdField,
      unitIdField,
      unitNmField,
      valueMode,
      warehouseIdField,
      warehouseCdField,
      warehouseNmField,
      useCogsAccounts,
    ],
  )

  const clearProduct = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, productIdField, null)
    setLookupGridCellValue(grid, rowIndex, productCdField, "")
    setLookupGridCellValue(grid, rowIndex, productNmField, "")

    if (hasLookupRowField(rowData, productGroupIdField)) {
      setLookupGridCellValue(grid, rowIndex, productGroupIdField, null)
    }

    if (hasLookupRowField(rowData, productGroupCdField)) {
      setLookupGridCellValue(grid, rowIndex, productGroupCdField, "")
    }

    if (hasLookupRowField(rowData, productGroupNmField)) {
      setLookupGridCellValue(grid, rowIndex, productGroupNmField, "")
    }

    if (hasLookupRowField(rowData, unitIdField)) {
      setLookupGridCellValue(grid, rowIndex, unitIdField, null)
    }

    if (hasLookupRowField(rowData, unitCdField)) {
      setLookupGridCellValue(grid, rowIndex, unitCdField, "")
    }

    if (hasLookupRowField(rowData, unitNmField)) {
      setLookupGridCellValue(grid, rowIndex, unitNmField, "")
    }

    if (hasLookupRowField(rowData, warehouseIdField)) {
      setLookupGridCellValue(grid, rowIndex, warehouseIdField, null)
    }

    if (hasLookupRowField(rowData, warehouseCdField)) {
      setLookupGridCellValue(grid, rowIndex, warehouseCdField, "")
    }

    if (hasLookupRowField(rowData, warehouseNmField)) {
      setLookupGridCellValue(grid, rowIndex, warehouseNmField, "")
    }
    restoreLookupGridCellFocus(grid, rowIndex, productCdField)
  }, [
    grid,
    productCdField,
    productGroupCdField,
    productGroupIdField,
    productGroupNmField,
    productIdField,
    productNmField,
    rowData,
    rowIndex,
    setValue,
    unitCdField,
    unitIdField,
    unitNmField,
    warehouseIdField,
    warehouseCdField,
    warehouseNmField,
  ])

  return (
    <BaseLookupCellEditor<Product & Record<string, unknown>>
      dataSource={dataSource}
      value={value}
      valueExpr={valueMode === "code" ? "PRODUCT_CD" : "PRODUCT_ID"}
      displayExpr={displayExpr}
      searchExpr={filterActiveLangFields(["PRODUCT_CD", "PRODUCT_NM_VIET", "PRODUCT_NM_ENG", "PRODUCT_NM_KOR", "PRODUCT_NM_CHINA", "PRODUCTKIND_NM_VIET", "PRODUCTKIND_NM_ENG", "PRODUCTKIND_NM_KOR", "PRODUCTKIND_NM_CHINA", "UNIT_NM", "STORE_NM_VIET", "STORE_NM_ENG", "STORE_NM_KOR", "STORE_NM_CHINA"])}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      autoOpen={autoOpen}
      grid={grid}
      rowIndex={rowIndex}
      navigateField={productCdField}
      onApply={applyProduct}
      onClear={clearProduct}
      renderPopupContent={({ closePopup }) =>
        renderSharedProductLookupPage({ closePopup, onPick: applyProduct })
      }
    />
  )
}
