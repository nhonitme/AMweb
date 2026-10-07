import type { ColumnCellTemplateData, ColumnEditCellTemplateData } from "devextreme/ui/data_grid"
import CheckBox from "devextreme-react/check-box"
import type {
  EInvoiceDecimalCurrencyScope,
  EInvoiceDecimalSetting,
  EInvoiceTemplateSetting,
} from "@/types/einvoiceSetting"

type TemplateCellInfo = ColumnCellTemplateData<EInvoiceTemplateSetting, number>
type DecimalCellInfo = ColumnCellTemplateData<EInvoiceDecimalSetting, number>
type DecimalEditCellInfo = ColumnEditCellTemplateData<EInvoiceDecimalSetting, number>
type TranslateFn = (key: string, fallback: string) => string

export type DecimalCurrencyScopeOption = {
  value: EInvoiceDecimalCurrencyScope
  text: string
}

function isFlagOn(value: unknown): boolean {
  return Number(value ?? 0) === 1
}

function normalizeDecimalScale(value: unknown): number {
  const numeric = Math.trunc(Number(value ?? 0))
  if (!Number.isFinite(numeric)) {
    return 0
  }

  return Math.max(0, Math.min(12, numeric))
}

export function formatDecimalScaleExample(scale: unknown): string {
  const precision = normalizeDecimalScale(scale)
  if (precision <= 0) {
    return "1.234"
  }

  const fraction = "560000000000".slice(0, precision)
  return `1.234,${fraction}`
}

export function createDecimalCurrencyScopeOptions(t: TranslateFn): DecimalCurrencyScopeOption[] {
  return [
    { value: "ANY", text: t("CURRENCY_SCOPE_ANY", "Tất cả") },
    { value: "VND", text: t("CURRENCY_SCOPE_VND", "VND") },
    { value: "FC", text: t("CURRENCY_SCOPE_FC", "Ngoại tệ") },
  ]
}

function renderFlagCheckBox(checked: boolean, title: string, readOnly = true) {
  return (
    <div className="flex w-full items-center justify-center" title={title}>
      <CheckBox
        value={checked}
        readOnly={readOnly}
        focusStateEnabled={!readOnly}
        hoverStateEnabled={!readOnly}
      />
    </div>
  )
}

export function createEInvoiceTemplateSettingCellRenderers(t: TranslateFn) {
  const renderTemplateMultiTaxRateCell = ({ data }: TemplateCellInfo) => {
    if (!data) {
      return null
    }

    const enabled = isFlagOn(data.USE_MULTI_TAX_RATE)
    return renderFlagCheckBox(
      enabled,
      enabled ? t("USE_MULTI_TAX_RATE_ON", "Có") : t("USE_MULTI_TAX_RATE_OFF", "Không"),
    )
  }

  const renderTemplateIsDefaultCell = ({ data }: TemplateCellInfo) => {
    if (!data) {
      return null
    }

    const isDefault = isFlagOn(data.XSL_IS_DEFAULT)
    return renderFlagCheckBox(
      isDefault,
      isDefault ? t("IS_DEFAULT", "Mặc định") : t("NOT_DEFAULT", "Không mặc định"),
    )
  }

  const renderTemplateStatusCell = ({ data }: TemplateCellInfo) => {
    if (!data) {
      return null
    }

    const published = isFlagOn(data.XSL_IS_ACTIVE)
    return renderFlagCheckBox(
      published,
      published ? t("PUBLISHED", "Phát hành") : t("DRAFT", "Nháp"),
    )
  }

  return {
    renderTemplateMultiTaxRateCell,
    renderTemplateIsDefaultCell,
    renderTemplateStatusCell,
  }
}

export function createEInvoiceDecimalSettingCellRenderers(t: TranslateFn) {
  const renderDecimalActiveCell = ({ data }: DecimalCellInfo) => {
    if (!data) {
      return null
    }

    const active = isFlagOn(data.IS_ACTIVE)
    return renderFlagCheckBox(
      active,
      active ? t("IS_ACTIVE_ON", "Đang dùng") : t("IS_ACTIVE_OFF", "Không dùng"),
    )
  }

  const renderDecimalActiveEditor = (cellInfo: DecimalEditCellInfo) => {
    const active = isFlagOn(cellInfo.value ?? cellInfo.data?.IS_ACTIVE)
    return (
      <div className="flex w-full items-center justify-center">
        <CheckBox
          value={active}
          onValueChanged={(event) => {
            cellInfo.setValue?.(event.value ? 1 : 0)
          }}
        />
      </div>
    )
  }

  const renderDecimalExampleCell = ({ data }: DecimalCellInfo) => {
    if (!data) {
      return null
    }

    const example = formatDecimalScaleExample(data.DECIMAL_SCALE)
    return (
      <span className="einvoice-decimal-example" title={example}>
        {example}
      </span>
    )
  }

  return {
    renderDecimalActiveCell,
    renderDecimalActiveEditor,
    renderDecimalExampleCell,
  }
}
