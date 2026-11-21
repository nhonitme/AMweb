import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import DateBox from "devextreme-react/date-box"
import NumberBox from "devextreme-react/number-box"
import SelectBox from "devextreme-react/select-box"
import TextArea from "devextreme-react/text-area"
import TextBox from "devextreme-react/text-box"

import type { SysCode } from "@/api/sysCodeService"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import { formatSysCodeOptionText, getSysCodeCd } from "@/lib/sysCodeUtils"
import type { ChitDateValue } from "@/types/voucher"

import type { VoucherVatDetail } from "./voucherVatTypes"
import "./VatDetailPanel.css"

export type VatDetailPanelProps = {
  rowKey: string
  rowLabel?: string
  value: VoucherVatDetail
  readOnly?: boolean
  onChange: (patch: Partial<VoucherVatDetail>) => void
  onClose: () => void
}

type FieldProps = {
  label: string
  className?: string
  children: ReactNode
}

function VatField({ label, className = "", children }: FieldProps) {
  return (
    <div className={`voucher-vat-detail-panel__field ${className}`.trim()}>
      <label className="voucher-vat-detail-panel__label">{label}</label>
      {children}
    </div>
  )
}

function parseTaxRatePercent(code: string): number | null {
  const trimmed = code.trim()
  if (!trimmed) {
    return null
  }
  const match = trimmed.replace(",", ".").match(/-?\d+(\.\d+)?/)
  if (!match) {
    return null
  }
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

export default function VatDetailPanel({
  rowKey,
  rowLabel,
  value,
  readOnly = false,
  onChange,
  onClose,
}: VatDetailPanelProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const [moreOpen, setMoreOpen] = useState(false)
  const [taxRateOptions, setTaxRateOptions] = useState<SysCode[]>([])

  useEffect(() => {
    let cancelled = false
    void getCachedSysCodes("VAT_RATE")
      .then((items) => {
        if (!cancelled) {
          setTaxRateOptions(items)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTaxRateOptions([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const editorOptions = useMemo(
    () => ({
      stylingMode: "outlined" as const,
      height: 28,
      readOnly,
    }),
    [readOnly],
  )

  const title = rowLabel
    ? `${t("VAT_INFO", "Thông tin VAT")} · ${rowLabel}`
    : t("VAT_INFO", "Thông tin VAT")

  return (
    <section className="voucher-vat-detail-panel" aria-label={title} data-vat-row-key={rowKey}>
      <header className="voucher-vat-detail-panel__header">
        <h3 className="voucher-vat-detail-panel__title">{title}</h3>
        <button
          type="button"
          className="voucher-vat-detail-panel__close"
          title={t("CLOSE", "Đóng")}
          aria-label={t("CLOSE", "Đóng")}
          onClick={onClose}
        >
          <span className="dx-icon dx-icon-close" aria-hidden />
        </button>
      </header>

      <div className="voucher-vat-detail-panel__body">
        <VatField label={t("VAT_INVOICE_DATE", "Ngày hóa đơn")}>
          <DateBox
            value={value.invoiceDate as Date | string | number | null}
            type="date"
            displayFormat="dd/MM/yyyy"
            useMaskBehavior
            showClearButton={!readOnly}
            {...editorOptions}
            onValueChanged={(event) => {
              onChange({ invoiceDate: (event.value ?? null) as ChitDateValue })
            }}
          />
        </VatField>

        <VatField label={t("VAT_INVOICE_NO", "Số hóa đơn")}>
          <TextBox
            value={value.invoiceNo}
            showClearButton={!readOnly}
            {...editorOptions}
            onValueChanged={(event) => {
              onChange({ invoiceNo: String(event.value ?? "") })
            }}
          />
        </VatField>

        <VatField label={t("VAT_INVOICE_SYMBOL", "Ký hiệu hóa đơn")}>
          <TextBox
            value={value.invoiceSymbol}
            showClearButton={!readOnly}
            {...editorOptions}
            onValueChanged={(event) => {
              onChange({ invoiceSymbol: String(event.value ?? "") })
            }}
          />
        </VatField>

        <VatField label={t("VAT_TAX_CODE", "Mã số thuế")}>
          <TextBox
            value={value.taxCode}
            showClearButton={!readOnly}
            {...editorOptions}
            onValueChanged={(event) => {
              onChange({ taxCode: String(event.value ?? "") })
            }}
          />
        </VatField>

        <VatField label={t("VAT_SELLER_NAME", "Tên người bán")} className="voucher-vat-detail-panel__field--span-2">
          <TextBox
            value={value.sellerName}
            showClearButton={!readOnly}
            {...editorOptions}
            onValueChanged={(event) => {
              onChange({ sellerName: String(event.value ?? "") })
            }}
          />
        </VatField>

        <VatField
          label={t("VAT_INFO_TYPE", "Loại ghi chú / hàng hóa dịch vụ")}
          className="voucher-vat-detail-panel__field--span-2"
        >
          <TextBox
            value={value.infoType}
            showClearButton={!readOnly}
            {...editorOptions}
            onValueChanged={(event) => {
              onChange({ infoType: String(event.value ?? "") })
            }}
          />
        </VatField>

        <VatField label={t("VAT_GOODS_AMOUNT", "Giá trị hàng hóa, dịch vụ")}>
          <NumberBox
            value={value.goodsAmount}
            format="#,##0.##"
            showClearButton={!readOnly}
            {...editorOptions}
            onValueChanged={(event) => {
              onChange({ goodsAmount: event.value == null ? null : Number(event.value) })
            }}
          />
        </VatField>

        <VatField label={t("VAT_TAX_RATE", "Thuế suất (%)")}>
          <SelectBox
            dataSource={taxRateOptions}
            value={value.taxRateCode || null}
            valueExpr="CODE_CD"
            displayExpr={(item: SysCode | null) => formatSysCodeOptionText(item, t)}
            searchEnabled
            showClearButton={!readOnly}
            acceptCustomValue
            {...editorOptions}
            onValueChanged={(event) => {
              const code = getSysCodeCd(
                typeof event.value === "object" && event.value
                  ? (event.value as SysCode)
                  : { CODE_CD: event.value },
              )
              const fromList = taxRateOptions.find((item) => getSysCodeCd(item) === code)
              const percent = fromList
                ? parseTaxRatePercent(getSysCodeCd(fromList))
                : parseTaxRatePercent(code)
              onChange({
                taxRateCode: code,
                taxRate: percent,
              })
            }}
            onCustomItemCreating={(event) => {
              const code = String(event.text ?? "").trim()
              event.customItem = code
                ? { CODE_CD: code, CODE_NAME: code }
                : null
            }}
          />
        </VatField>

        <VatField label={t("VAT_TAX_AMOUNT", "Tiền thuế GTGT")}>
          <NumberBox
            value={value.taxAmount}
            format="#,##0.##"
            showClearButton={!readOnly}
            {...editorOptions}
            onValueChanged={(event) => {
              onChange({ taxAmount: event.value == null ? null : Number(event.value) })
            }}
          />
        </VatField>

        <VatField label={t("VAT_TOTAL_AMOUNT", "Tổng tiền")}>
          <NumberBox
            value={value.totalAmount}
            format="#,##0.##"
            readOnly
            stylingMode="outlined"
            height={28}
          />
        </VatField>

        <div className="voucher-vat-detail-panel__more">
          <button
            type="button"
            className="voucher-vat-detail-panel__more-toggle"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((current) => !current)}
          >
            <span
              className={`dx-icon ${moreOpen ? "dx-icon-chevrondown" : "dx-icon-chevronright"}`}
              aria-hidden
            />
            {t("VAT_MORE_INFO", "Thông tin mở rộng")}
          </button>

          {moreOpen ? (
            <div className="voucher-vat-detail-panel__more-grid">
              <VatField label={t("VAT_FC_AMOUNT", "FC số tiền")}>
                <NumberBox
                  value={value.fcAmount}
                  format="#,##0.##"
                  showClearButton={!readOnly}
                  {...editorOptions}
                  onValueChanged={(event) => {
                    onChange({ fcAmount: event.value == null ? null : Number(event.value) })
                  }}
                />
              </VatField>

              <VatField label={t("VAT_CUSTOMS_EXCHANGE_RATE", "Tỷ giá hải quan")}>
                <NumberBox
                  value={value.customsExchangeRate}
                  format="#,##0.######"
                  showClearButton={!readOnly}
                  {...editorOptions}
                  onValueChanged={(event) => {
                    onChange({
                      customsExchangeRate: event.value == null ? null : Number(event.value),
                    })
                  }}
                />
              </VatField>

              <VatField label={t("VAT_INVOICE_TEMPLATE_SYMBOL", "Ký hiệu mẫu hóa đơn")}>
                <TextBox
                  value={value.invoiceTemplateSymbol}
                  showClearButton={!readOnly}
                  {...editorOptions}
                  onValueChanged={(event) => {
                    onChange({ invoiceTemplateSymbol: String(event.value ?? "") })
                  }}
                />
              </VatField>

              <VatField label={t("VAT_INQUIRY_AT", "Tra cứu tại")}>
                <TextBox
                  value={value.inquiryAt}
                  showClearButton={!readOnly}
                  {...editorOptions}
                  onValueChanged={(event) => {
                    onChange({ inquiryAt: String(event.value ?? "") })
                  }}
                />
              </VatField>

              <VatField label={t("VAT_INQUIRY_CODE", "Mã tra cứu")}>
                <TextBox
                  value={value.inquiryCode}
                  showClearButton={!readOnly}
                  {...editorOptions}
                  onValueChanged={(event) => {
                    onChange({ inquiryCode: String(event.value ?? "") })
                  }}
                />
              </VatField>

              <VatField
                label={t("VAT_DETAIL_NOTE", "Ghi chú chi tiết")}
                className="voucher-vat-detail-panel__field--span-2"
              >
                <TextArea
                  value={value.detailNote}
                  height={56}
                  readOnly={readOnly}
                  stylingMode="outlined"
                  onValueChanged={(event) => {
                    onChange({ detailNote: String(event.value ?? "") })
                  }}
                />
              </VatField>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
