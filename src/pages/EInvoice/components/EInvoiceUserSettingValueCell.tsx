import { useCallback, useEffect, useState, type ReactElement } from "react"
import type { ColumnCellTemplateData, ColumnEditCellTemplateData } from "devextreme/ui/data_grid"
import CheckBox from "devextreme-react/check-box"
import NumberBox from "devextreme-react/number-box"
import TextBox from "devextreme-react/text-box"

import CurrencyLookupCellEditor from "@/components/lookup/CurrencyLookupCellEditor"
import EinvPaymentMethodLookupCellEditor from "@/components/lookup/EinvPaymentMethodLookupCellEditor"
import EinvTchatLookupCellEditor, { formatEinvTchatDisplay } from "@/components/lookup/EinvTchatLookupCellEditor"
import { einvPaymentMethodLookupStore, type EinvPaymentMethodLookupItem } from "@/components/lookup/einvPaymentMethodLookupStore"
import { einvTchatLookupStore, type EinvTchatLookupItem } from "@/components/lookup/einvTchatLookupStore"
import { LookupGridCellEditor, consumeLookupCellOpen, type LookupOpenMode } from "@/components/lookup/LookupGridCellDisplay"
import VatRateLookupCellEditor from "@/components/lookup/VatRateLookupCellEditor"
import { vatRateLookupStore, type VatRateLookupItem } from "@/components/lookup/vatRateLookupStore"
import { currencyLookupStore, type CurrencyLookupItem } from "@/components/lookup/currencyLookupStore"
import { trimLookupText } from "@/components/lookup/lookupHelpers"
import { formatSysCodeOptionText, type SysCodeTranslate } from "@/lib/sysCodeUtils"
import type { EInvoiceUserSetting } from "@/types/einvoiceSetting"
import {
  getUserSettingEditorKind,
  isBooleanSettingValueTrue,
} from "../einvoiceUserSettingModel"

type GridKey = string | number
type TranslateFn = (key: string, fallback: string) => string

type UserSettingCellInfo = ColumnCellTemplateData<EInvoiceUserSetting, GridKey>
type UserSettingEditCellInfo = ColumnEditCellTemplateData<EInvoiceUserSetting, GridKey>

function renderBooleanTick(checked: boolean, title: string) {
  if (!checked) {
    return null
  }

  return (
    <span className="inline-flex w-full items-center justify-center text-green-600" title={title}>
      <i className="dx-icon dx-icon-check text-[18px] leading-none" />
    </span>
  )
}

function renderLookupEditor(children: ReactElement) {
  return <LookupGridCellEditor mode="edit">{children}</LookupGridCellEditor>
}

function resolveLookupDisplayText<TItem extends { CODE_CD?: string | null; CODE_NAME?: string | null }>(
  value: string | null | undefined,
  items: TItem[],
  translate?: SysCodeTranslate,
): string {
  const code = trimLookupText(value)
  if (!code) {
    return ""
  }

  const item = items.find((entry) => trimLookupText(entry.CODE_CD) === code)
  return item ? formatSysCodeOptionText(item, translate) : code
}

function useLookupItems<TItem>(store: { load: () => Promise<unknown> }, mapItems: (loaded: unknown) => TItem[]): TItem[] {
  const [items, setItems] = useState<TItem[]>([])

  useEffect(() => {
    let active = true
    void store.load().then((loaded) => {
      if (active) {
        setItems(mapItems(loaded))
      }
    })
    return () => {
      active = false
    }
  }, [mapItems, store])

  return items
}

function useUserSettingLookupItems() {
  const mapSysCodeItems = useCallback(<TItem,>(loaded: unknown) => (Array.isArray(loaded) ? loaded as TItem[] : []), [])
  const vatRateItems = useLookupItems<VatRateLookupItem>(vatRateLookupStore, mapSysCodeItems)
  const currencyItems = useLookupItems<CurrencyLookupItem>(currencyLookupStore, mapSysCodeItems)
  const lineTypeItems = useLookupItems<EinvTchatLookupItem>(einvTchatLookupStore, mapSysCodeItems)
  const paymentMethodItems = useLookupItems<EinvPaymentMethodLookupItem>(einvPaymentMethodLookupStore, mapSysCodeItems)
  return { vatRateItems, currencyItems, lineTypeItems, paymentMethodItems }
}

export function useEInvoiceUserSettingValueCellRenderers(t: TranslateFn) {
  const { vatRateItems, currencyItems, lineTypeItems, paymentMethodItems } = useUserSettingLookupItems()

  const renderBooleanEditor = useCallback(
    (cellInfo: UserSettingEditCellInfo) => (
      <div className="flex h-full w-full items-center justify-center">
        <CheckBox
          value={isBooleanSettingValueTrue(cellInfo.data?.SETTING_VALUE)}
          onValueChanged={(event) => {
            cellInfo.component.cellValue(
              cellInfo.row.rowIndex,
              "SETTING_VALUE",
              event.value ? "true" : "false",
            )
          }}
        />
      </div>
    ),
    [],
  )

  const renderNumberEditor = useCallback((cellInfo: UserSettingEditCellInfo) => {
    const numericValue = Number(cellInfo.data?.SETTING_VALUE ?? 0)
    return (
      <NumberBox
        value={Number.isFinite(numericValue) ? numericValue : 0}
        showSpinButtons={true}
        stylingMode="outlined"
        onValueChanged={(event) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, "SETTING_VALUE", String(event.value ?? 0))
        }}
      />
    )
  }, [])

  const renderStringEditor = useCallback((cellInfo: UserSettingEditCellInfo) => (
    <TextBox
      value={cellInfo.data?.SETTING_VALUE ?? ""}
      onValueChanged={(event) => {
        cellInfo.component.cellValue(cellInfo.row.rowIndex, "SETTING_VALUE", event.value ?? "")
      }}
    />
  ), [])

  const renderVatEditor = useCallback(
    (cellInfo: UserSettingEditCellInfo, autoOpen?: LookupOpenMode | null) => (
      <VatRateLookupCellEditor
        value={cellInfo.data?.SETTING_VALUE ?? ""}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(value) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, "SETTING_VALUE", value ?? "")
        }}
        taxRateField="SETTING_VALUE"
        taxRateFieldCaption={t("TSUAT", "Tax rate")}
        taxRateNameCaption={t("CODE_NAME", "Name")}
        placeholder={t("VAT_RATE_SELECT", "Select tax rate")}
        popupTitle={t("VAT_RATE_SELECT", "Select tax rate")}
        buttonHint={t("VAT_RATE_LOOKUP", "Open tax rate list")}
        autoOpen={autoOpen}
      />
    ),
    [t],
  )

  const renderCurrencyEditor = useCallback(
    (cellInfo: UserSettingEditCellInfo, autoOpen?: LookupOpenMode | null) => (
      <CurrencyLookupCellEditor
        value={cellInfo.data?.SETTING_VALUE ?? ""}
        rowData={cellInfo.data ?? {}}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(value) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, "SETTING_VALUE", value ?? "")
        }}
        currencyCdField="SETTING_VALUE"
        currencyCdFieldCaption={t("CURRENCY_CD", "Currency code")}
        currencyNmFieldCaption={t("CURRENCY_NM", "Currency name")}
        placeholder={t("CURRENCY_SELECT", "Select currency")}
        popupTitle={t("CURRENCY_SELECT", "Select currency")}
        buttonHint={t("CURRENCY_LOOKUP", "Open currency list")}
        autoOpen={autoOpen}
      />
    ),
    [t],
  )

  const renderLineTypeEditor = useCallback(
    (cellInfo: UserSettingEditCellInfo, autoOpen?: LookupOpenMode | null) => (
      <EinvTchatLookupCellEditor
        value={cellInfo.data?.SETTING_VALUE ?? "1"}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(value) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, "SETTING_VALUE", value == null ? "1" : String(value))
        }}
        tchatField="SETTING_VALUE"
        tchatFieldCaption={t("TCHAT", "Line type")}
        tchatNameCaption={t("CODE_NAME", "Name")}
        placeholder={t("TCHAT_SELECT", "Select line type")}
        popupTitle={t("TCHAT_SELECT", "Select line type")}
        buttonHint={t("TCHAT_LOOKUP", "Open line type list")}
        autoOpen={autoOpen}
      />
    ),
    [t],
  )

  const renderPaymentEditor = useCallback(
    (cellInfo: UserSettingEditCellInfo, autoOpen?: LookupOpenMode | null) => (
      <EinvPaymentMethodLookupCellEditor
        value={cellInfo.data?.SETTING_VALUE ?? ""}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(value) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, "SETTING_VALUE", value ?? "")
        }}
        paymentMethodField="SETTING_VALUE"
        paymentMethodFieldCaption={t("HTTTOAN", "Payment method")}
        paymentMethodNameCaption={t("CODE_NAME", "Name")}
        placeholder={t("PAYMENT_METHOD_SELECT", "Select payment method")}
        popupTitle={t("PAYMENT_METHOD_SELECT", "Select payment method")}
        buttonHint={t("PAYMENT_METHOD_LOOKUP", "Open payment method list")}
        autoOpen={autoOpen}
      />
    ),
    [t],
  )

  const renderValueEditor = useCallback(
    (cellInfo: UserSettingEditCellInfo) => {
      if (!cellInfo.data) {
        return null
      }

      const editorKind = getUserSettingEditorKind(cellInfo.data)
      if (editorKind === "boolean") {
        return renderBooleanEditor(cellInfo)
      }
      if (editorKind === "number") {
        return renderNumberEditor(cellInfo)
      }
      if (editorKind === "vat") {
        return renderLookupEditor(renderVatEditor(cellInfo, consumeLookupCellOpen(cellInfo, "SETTING_VALUE")))
      }
      if (editorKind === "currency") {
        return renderLookupEditor(renderCurrencyEditor(cellInfo, consumeLookupCellOpen(cellInfo, "SETTING_VALUE")))
      }
      if (editorKind === "payment") {
        return renderLookupEditor(renderPaymentEditor(cellInfo, consumeLookupCellOpen(cellInfo, "SETTING_VALUE")))
      }
      if (editorKind === "lineType") {
        return renderLookupEditor(renderLineTypeEditor(cellInfo, consumeLookupCellOpen(cellInfo, "SETTING_VALUE")))
      }
      return renderStringEditor(cellInfo)
    },
    [
      renderBooleanEditor,
      renderCurrencyEditor,
      renderLineTypeEditor,
      renderNumberEditor,
      renderPaymentEditor,
      renderStringEditor,
      renderVatEditor,
    ],
  )

  const renderValueCell = useCallback(
    (cellInfo: UserSettingCellInfo) => {
      const row = cellInfo.data
      if (!row) {
        return null
      }

      const editorKind = getUserSettingEditorKind(row)
      let displayText = row.SETTING_VALUE ?? ""

      if (editorKind === "boolean") {
        return (
          <div className="flex h-full w-full items-center justify-center">
            {renderBooleanTick(isBooleanSettingValueTrue(row.SETTING_VALUE), t("YES", "Yes"))}
          </div>
        )
      }

      if (editorKind === "vat") {
        displayText = resolveLookupDisplayText(row.SETTING_VALUE, vatRateItems, t)
      } else if (editorKind === "currency") {
        displayText = resolveLookupDisplayText(row.SETTING_VALUE, currencyItems, t)
      } else if (editorKind === "payment") {
        displayText = resolveLookupDisplayText(row.SETTING_VALUE, paymentMethodItems, t)
      } else if (editorKind === "lineType") {
        displayText = formatEinvTchatDisplay(row.SETTING_VALUE, lineTypeItems, t)
      }

      if (editorKind === "vat" || editorKind === "currency" || editorKind === "payment" || editorKind === "lineType") {
        return (
          <LookupGridCellEditor
            mode="display"
            cellInfo={{
              ...cellInfo,
              text: displayText,
              displayValue: displayText,
              value: row.SETTING_VALUE ?? "",
            }}
            dataField="SETTING_VALUE"
          />
        )
      }

      return <span>{displayText}</span>
    },
    [currencyItems, lineTypeItems, paymentMethodItems, t, vatRateItems],
  )

  return {
    renderValueCell,
    renderValueEditor,
  }
}
