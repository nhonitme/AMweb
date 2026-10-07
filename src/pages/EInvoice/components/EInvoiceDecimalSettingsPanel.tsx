import { useCallback, useMemo, useRef, useState } from "react"
import NumberBox from "devextreme-react/number-box"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"

import { getApiErrorMessage } from "@/api/apiTypes"
import { saveEInvoiceDecimalSetting } from "@/api/einvoiceSettingApi"
import type { EInvoiceDecimalCurrencyScope, EInvoiceDecimalSetting } from "@/types/einvoiceSetting"

import { resolveConfigCaption } from "@/utils/resolveConfigCaption"

import { formatDecimalScaleExample } from "./EInvoiceTemplateSettingCells"

type TranslateFn = (key: string, fallback: string) => string

type TemplateOption = {
  value: number
  text: string
}

type EInvoiceDecimalSettingsPanelProps = {
  templateOptions: TemplateOption[]
  selectedTemplateId: number
  onSelectedTemplateIdChange: (xslId: number) => void
  currencyScope: "VND" | "FC"
  onCurrencyScopeChange: (scope: "VND" | "FC") => void
  rows: EInvoiceDecimalSetting[]
  onRowsChange: (rows: EInvoiceDecimalSetting[]) => void
  companyCd: string
  onSaved: () => Promise<void> | void
  t: TranslateFn
}

function normalizeCurrencyScope(value: unknown): EInvoiceDecimalCurrencyScope {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : ""
  return normalized === "VND" || normalized === "FC" ? normalized : "ANY"
}

function clampScale(value: unknown): number {
  const numeric = Math.trunc(Number(value ?? 0))
  if (!Number.isFinite(numeric)) {
    return 0
  }
  return Math.max(0, Math.min(12, numeric))
}

function matchesKeyword(row: EInvoiceDecimalSetting, keyword: string): boolean {
  if (!keyword) {
    return true
  }
  const haystack = `${row.FIELD_NAME} ${row.CAPTION ?? ""} ${row.LABEL_TEXT ?? ""}`.toLowerCase()
  return haystack.includes(keyword)
}

export default function EInvoiceDecimalSettingsPanel({
  templateOptions,
  selectedTemplateId,
  onSelectedTemplateIdChange,
  currencyScope,
  onCurrencyScopeChange,
  rows,
  onRowsChange,
  companyCd,
  onSaved,
  t,
}: EInvoiceDecimalSettingsPanelProps) {
  const [keyword, setKeyword] = useState("")
  const [savingId, setSavingId] = useState(0)
  const saveTimersRef = useRef<Map<number, number>>(new Map())

  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    return rows
      .filter((row) => {
        const scope = normalizeCurrencyScope(row.CURRENCY_SCOPE)
        return scope === currencyScope || scope === "ANY"
      })
      .filter((row) => matchesKeyword(row, normalizedKeyword))
      .slice()
      .sort((left, right) => {
        if (left.SORT_ORDER !== right.SORT_ORDER) {
          return left.SORT_ORDER - right.SORT_ORDER
        }
        return resolveConfigCaption(left, t).localeCompare(resolveConfigCaption(right, t)) || left.SETTING_ID - right.SETTING_ID
      })
  }, [currencyScope, keyword, rows, t])

  const persistRow = useCallback(
    async (row: EInvoiceDecimalSetting) => {
      setSavingId(row.SETTING_ID)
      try {
        const payload: EInvoiceDecimalSetting = {
          ...row,
          COMPANY_CD: companyCd,
          XSL_ID: selectedTemplateId > 0 ? selectedTemplateId : Math.max(0, Number(row.XSL_ID) || 0),
          IS_ACTIVE: 1,
        }
        // Settings inherited from system/other company need a company-local copy.
        if (row.COMPANY_CD !== companyCd || Number(row.XSL_ID) !== Number(payload.XSL_ID)) {
          payload.SETTING_ID = 0
        }
        await saveEInvoiceDecimalSetting(payload)
        await onSaved()
      } catch (error) {
        notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 4000)
      } finally {
        setSavingId(0)
      }
    },
    [companyCd, onSaved, selectedTemplateId, t],
  )

  const schedulePersist = useCallback(
    (row: EInvoiceDecimalSetting) => {
      const existing = saveTimersRef.current.get(row.SETTING_ID)
      if (existing) {
        window.clearTimeout(existing)
      }

      const timerId = window.setTimeout(() => {
        saveTimersRef.current.delete(row.SETTING_ID)
        void persistRow(row)
      }, 450)

      saveTimersRef.current.set(row.SETTING_ID, timerId)
    },
    [persistRow],
  )

  const patchRow = useCallback(
    (settingId: number, patch: Partial<EInvoiceDecimalSetting>, persist = true) => {
      const nextRows = rows.map((row) => {
        if (row.SETTING_ID !== settingId) {
          return row
        }
        return {
          ...row,
          ...patch,
          DECIMAL_SCALE:
            patch.DECIMAL_SCALE !== undefined ? clampScale(patch.DECIMAL_SCALE) : row.DECIMAL_SCALE,
          IS_ACTIVE: 1,
        }
      })
      onRowsChange(nextRows)

      const updated = nextRows.find((row) => row.SETTING_ID === settingId)
      if (persist && updated) {
        schedulePersist(updated)
      }
    },
    [onRowsChange, rows, schedulePersist],
  )

  return (
    <div className="einvoice-decimal-editor">
      <SelectBox
        width="100%"
        dataSource={templateOptions}
        value={selectedTemplateId}
        valueExpr="value"
        displayExpr="text"
        searchEnabled
        showClearButton={false}
        stylingMode="outlined"
        onValueChanged={(event) => {
          onSelectedTemplateIdChange(Math.max(0, Math.trunc(Number(event.value ?? 0))))
        }}
      />

      <div className="einvoice-decimal-currency-toggle" role="group" aria-label={t("CURRENCY_SCOPE", "Tiền tệ")}>
        <button
          type="button"
          className={`einvoice-decimal-scope-btn${currencyScope === "VND" ? " is-active" : ""}`}
          onClick={() => onCurrencyScopeChange("VND")}
        >
          VND
        </button>
        <button
          type="button"
          className={`einvoice-decimal-scope-btn${currencyScope === "FC" ? " is-active" : ""}`}
          onClick={() => onCurrencyScopeChange("FC")}
        >
          {t("CURRENCY_SCOPE_FC", "Ngoại tệ")}
        </button>
      </div>

      <TextBox
        value={keyword}
        stylingMode="outlined"
        mode="search"
        placeholder={t("QUICK_SEARCH", "Tìm trường...")}
        valueChangeEvent="input"
        onValueChanged={(event) => setKeyword(String(event.value ?? ""))}
        width="100%"
      />

      <div className="einvoice-decimal-editor__list">
        {filteredRows.length === 0 ? (
          <div className="einvoice-decimal-editor__empty">
            {t("DECIMAL_NO_ROWS", "Không có cấu hình cho phạm vi này.")}
          </div>
        ) : (
          filteredRows.map((row) => {
            const scope = normalizeCurrencyScope(row.CURRENCY_SCOPE)
            const isSaving = savingId === row.SETTING_ID
            return (
              <div key={row.SETTING_ID} className={`einvoice-decimal-editor__row${isSaving ? " is-saving" : ""}`}>
                <div className="einvoice-decimal-editor__name">
                  <div className="einvoice-decimal-editor__title">{resolveConfigCaption(row, t)}</div>
                  {scope === "ANY" ? (
                    <div className="einvoice-decimal-editor__badge">
                      {t("CURRENCY_SCOPE_ANY", "Tất cả")}
                    </div>
                  ) : null}
                </div>
                <div className="einvoice-decimal-editor__controls">
                  <NumberBox
                    value={row.DECIMAL_SCALE}
                    min={0}
                    max={12}
                    showSpinButtons
                    stylingMode="outlined"
                    width={88}
                    onValueChanged={(event) => {
                      if (event.event == null) {
                        return
                      }
                      patchRow(row.SETTING_ID, { DECIMAL_SCALE: clampScale(event.value) })
                    }}
                  />
                  <span className="einvoice-decimal-editor__example" title={t("DECIMAL_EXAMPLE", "Ví dụ")}>
                    {formatDecimalScaleExample(row.DECIMAL_SCALE)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
