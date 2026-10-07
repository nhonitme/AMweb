import { useCallback } from "react"
import { filterActiveLangFields, pickLocalizedText } from "@/lib/companyLang"
import type { ProductKind } from "@/types/productKind"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { productGroupLookupStore } from "./productGroupLookupStore"
import { renderSharedProductGroupLookupPage } from "./sharedMasterLookupPages"
import {
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
  productGroupIdField?: string
  productGroupCdField?: string
  productGroupNmField?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
}

export default function ProductGroupLookupCellEditor({
  dataSource = productGroupLookupStore,
  value,
  rowIndex,
  grid,
  setValue,
  valueMode = "id",
  productGroupIdField = "PRODUCT_KIND_ID",
  productGroupCdField = "PRODUCT_KIND_CD",
  productGroupNmField = "PRODUCTKIND_NM_VIET",
  placeholder = "Chọn nhóm vật tư",
  popupTitle = "Chọn nhóm vật tư",
  buttonHint = "Mở danh sách nhóm vật tư",
}: Props) {
  const getProductGroupName = useCallback(
    (item?: Partial<ProductKind> | null) =>
      pickLocalizedText(item, "PRODUCTKIND_NM"),
    [],
  )

  const displayExpr = useCallback(
    (item: ProductKind | null) => {
      const productGroupCd = trimLookupText(item?.PRODUCT_KIND_CD)
      const productGroupName = getProductGroupName(item)

      if (productGroupCd && productGroupName) {
        return `${productGroupCd} - ${productGroupName}`
      }

      return productGroupCd || productGroupName
    },
    [getProductGroupName],
  )

  const applyProductGroup = useCallback(
    (productGroup: ProductKind) => {
      const productGroupId = toLookupNumber(productGroup.PRODUCT_KIND_ID)
      const productGroupCd = trimLookupText(productGroup.PRODUCT_KIND_CD)

      setValue(valueMode === "code" ? productGroupCd || null : productGroupId)
      setLookupGridCellValue(grid, rowIndex, productGroupIdField, productGroupId)
      setLookupGridCellValue(grid, rowIndex, productGroupCdField, productGroupCd)
      setLookupGridCellValue(grid, rowIndex, productGroupNmField, getProductGroupName(productGroup))
      restoreLookupGridCellFocus(grid, rowIndex, productGroupCdField)
    },
    [getProductGroupName, grid, productGroupCdField, productGroupIdField, productGroupNmField, rowIndex, setValue, valueMode],
  )

  const clearProductGroup = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, productGroupIdField, null)
    setLookupGridCellValue(grid, rowIndex, productGroupCdField, "")
    setLookupGridCellValue(grid, rowIndex, productGroupNmField, "")
    restoreLookupGridCellFocus(grid, rowIndex, productGroupCdField)
  }, [grid, productGroupCdField, productGroupIdField, productGroupNmField, rowIndex, setValue])

  return (
    <BaseLookupCellEditor<ProductKind>
      dataSource={dataSource}
      value={value}
      valueExpr={valueMode === "code" ? "PRODUCT_KIND_CD" : "PRODUCT_KIND_ID"}
      displayExpr={displayExpr}
      filterFocusField="PRODUCT_KIND_CD"
      searchExpr={filterActiveLangFields(["PRODUCT_KIND_CD", "PRODUCTKIND_NM_VIET", "PRODUCTKIND_NM_ENG", "PRODUCTKIND_NM_KOR", "PRODUCTKIND_NM_CHINA"])}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      onApply={applyProductGroup}
      onClear={clearProductGroup}
      renderPopupContent={({ closePopup }) =>
        renderSharedProductGroupLookupPage({ closePopup, onPick: applyProductGroup })
      }
    />
  )
}
