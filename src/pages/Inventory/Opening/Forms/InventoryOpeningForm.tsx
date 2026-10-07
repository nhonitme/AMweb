import { useContext } from "react"
import { Form } from "devextreme-react/data-grid"
import { Item } from "devextreme-react/form"
import type dxForm from "devextreme/ui/form"
import { createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions"
import MasterLookupFormField from "@/components/lookup/MasterLookupFormField"
import { inventoryLookupStore } from "@/components/lookup/inventoryLookupStore"
import {
  renderSharedProductLookupPage,
  renderSharedUnitLookupPage,
  renderSharedWarehouseLookupPage,
} from "@/components/lookup/sharedMasterLookupPages"
import { warehouseLookupStore } from "@/components/lookup/warehouseLookupStore"
import { unitLookupStore } from "@/components/lookup/unitLookupStore"
import { filterActiveLangFields, pickLocalizedText } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import { useDecimalColumnFormats, type DecimalColumnFormat } from "@/hooks/useDecimalColumnFormats"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"
import type { Product } from "@/types/product"
import type { Unit } from "@/types/unit"
import type { StoreInfo } from "@/types/store"

function readLookupText(option: object, key: string): string {
  const value = (option as Record<string, unknown>)[key]
  return typeof value === "string" ? value.trim() : String(value ?? "").trim()
}

function selectNumberTextOnFocus(event: { event?: Event }) {
  const input = event.event?.target
  if (!(input instanceof HTMLInputElement)) return

  window.requestAnimationFrame(() => {
    if (document.activeElement === input) input.select()
  })
}

function createInventoryNumberEditorOptions(format: DecimalColumnFormat) {
  return createOutlinedEditorOptions(
    createNumberEditorOptions(format, {
      min: 0,
      onFocusIn: selectNumberTextOnFocus,
    }),
  )
}

type InventoryOpeningFormProps = {
  onFormInstance?: (form: dxForm) => void
}

export function InventoryOpeningForm({ onFormInstance }: InventoryOpeningFormProps) {
  const { translate } = useContext(LanguageContext) as {
    translate: (k: string, f?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const { getFormat } = useDecimalColumnFormats()
  const quantityFormat = getFormat("QUANTITY", "#,##0.###")
  const unitPriceFormat = getFormat("UNIT_PRICE_CC", "#,##0.00")
  const amountFormat = getFormat("AMOUNT_CC", "#,##0.00")
  const captureForm = (form: dxForm) => {
    onFormInstance?.(form)
    return null
  }

  return (
    <Form colCount={2}>
      <Item
        dataField="PRODUCT_ID"
        label={{ text: t("PRODUCT_CD", "Product Code") }}
        isRequired
        render={({ component }) => (
          <>
            {captureForm(component)}
            <MasterLookupFormField<Product>
              form={component}
              dataField="PRODUCT_ID"
              dataSource={inventoryLookupStore}
              valueExpr="PRODUCT_ID"
              getValue={(item) => item.PRODUCT_ID}
              onApplyItem={(item) => {
                component.updateData("PRODUCT_CD", item.PRODUCT_CD ?? "")
                component.updateData("PRODUCT_NM_VIET", item.PRODUCT_NM_VIET ?? "")
                component.updateData("PRODUCT_NM_ENG", item.PRODUCT_NM_ENG ?? "")
                component.updateData("PRODUCT_NM_KOR", item.PRODUCT_NM_KOR ?? "")
                component.updateData("PRODUCT_NM_CHINA", item.PRODUCT_NM_CHINA ?? "")
                if (item.UNIT_ID) {
                  component.updateData("UNIT_ID", item.UNIT_ID)
                  component.updateData("UNIT_CD", item.UNIT_CD ?? "")
                  component.updateData("UNIT_NM", item.UNIT_NM ?? "")
                }
              }}
              onClear={() => {
                component.updateData("PRODUCT_CD", "")
                component.updateData("PRODUCT_NM_VIET", "")
                component.updateData("PRODUCT_NM_ENG", "")
                component.updateData("PRODUCT_NM_KOR", "")
                component.updateData("PRODUCT_NM_CHINA", "")
              }}
              displayExpr={(option) => {
                if (!option) return ""
                const code = readLookupText(option, "PRODUCT_CD")
                const name = pickLocalizedText(option, "PRODUCT_NM")
                return code && name ? `${code} - ${name}` : code || name
              }}
              placeholder={t("SELECT", "Select")}
              popupTitle={t("PRODUCT_LIST", "Products")}
              buttonHint={t("SEARCH", "Open product list")}
              searchExpr={filterActiveLangFields(["PRODUCT_CD", "PRODUCT_NM_VIET", "PRODUCT_NM_ENG", "PRODUCT_NM_KOR", "PRODUCT_NM_CHINA"])}
              renderPopupContent={({ closePopup, onPick }) =>
                renderSharedProductLookupPage({ closePopup, onPick })
              }
            />
          </>
        )}
      />
      <Item
        dataField="UNIT_ID"
        label={{ text: t("UNIT_CD", "Unit") }}
        isRequired
        render={({ component }) => (
          <MasterLookupFormField<Unit>
            form={component}
            dataField="UNIT_ID"
            dataSource={unitLookupStore}
            valueExpr="UNIT_ID"
            getValue={(item) => item.UNIT_ID}
            onApplyItem={(item) => {
              component.updateData("UNIT_CD", item.UNIT_CD ?? "")
              component.updateData("UNIT_NM", item.UNIT_NM ?? "")
            }}
            onClear={() => {
              component.updateData("UNIT_CD", "")
              component.updateData("UNIT_NM", "")
            }}
            displayExpr={(option) => {
              if (!option) return ""
              const code = readLookupText(option, "UNIT_CD")
              const name = readLookupText(option, "UNIT_NM")
              return code && name ? `${code} - ${name}` : code || name
            }}
            placeholder={t("SELECT", "Select")}
            popupTitle={t("UNIT_LIST", "Units")}
            buttonHint={t("SEARCH", "Open unit list")}
            filterFocusField="UNIT_CD"
            searchExpr={["UNIT_CD", "UNIT_NM"]}
            renderPopupContent={({ closePopup, onPick }) =>
              renderSharedUnitLookupPage({ closePopup, onPick })
            }
          />
        )}
      />
      <Item
        dataField="STORE_ID"
        label={{ text: t("STORE_CD", "Store Code") }}
        isRequired
        render={({ component }) => (
          <MasterLookupFormField<StoreInfo>
            form={component}
            dataField="STORE_ID"
            dataSource={warehouseLookupStore}
            valueExpr="STORE_ID"
            getValue={(item) => item.STORE_ID}
            onApplyItem={(item) => {
              component.updateData("STORE_CD", item.STORE_CD ?? "")
              component.updateData("STORE_NM_VIET", item.STORE_NM_VIET ?? "")
              component.updateData("STORE_NM_ENG", item.STORE_NM_ENG ?? "")
              component.updateData("STORE_NM_KOR", item.STORE_NM_KOR ?? "")
              component.updateData("STORE_NM_CHINA", item.STORE_NM_CHINA ?? "")
            }}
            onClear={() => {
              component.updateData("STORE_CD", "")
              component.updateData("STORE_NM_VIET", "")
              component.updateData("STORE_NM_ENG", "")
              component.updateData("STORE_NM_KOR", "")
              component.updateData("STORE_NM_CHINA", "")
            }}
            displayExpr={(option) => {
              if (!option) return ""
              const code = readLookupText(option, "STORE_CD")
              const name = pickLocalizedText(option, "STORE_NM")
              return code && name ? `${code} - ${name}` : code || name
            }}
            placeholder={t("SELECT", "Select")}
            popupTitle={t("STORE_LIST", "Warehouses")}
            buttonHint={t("SEARCH", "Open warehouse list")}
            filterFocusField="STORE_CD"
            searchExpr={filterActiveLangFields(["STORE_CD", "STORE_NM_VIET", "STORE_NM_ENG", "STORE_NM_KOR", "STORE_NM_CHINA"])}
            renderPopupContent={({ closePopup, onPick }) =>
              renderSharedWarehouseLookupPage({ closePopup, onPick })
            }
          />
        )}
      />
      <Item
        dataField="QUANTITY"
        label={{ text: t("QUANTITY", "Quantity") }}
        editorType="dxNumberBox"
        isRequired
        editorOptions={createInventoryNumberEditorOptions(quantityFormat)}
      />
      <Item
        dataField="UNIT_PRICE_CC"
        label={{ text: t("UNIT_PRICE_CC", "Unit Price") }}
        editorType="dxNumberBox"
        isRequired
        editorOptions={createInventoryNumberEditorOptions(unitPriceFormat)}
      />
      <Item
        dataField="AMOUNT_CC"
        label={{ text: t("AMOUNT_CC", "Amount") }}
        editorType="dxNumberBox"
        editorOptions={createInventoryNumberEditorOptions(amountFormat)}
      />
    </Form>
  )
}
