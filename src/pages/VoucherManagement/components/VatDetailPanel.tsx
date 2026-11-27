import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { confirm } from "devextreme/ui/dialog"
import DateBox from "devextreme-react/date-box"
import NumberBox from "devextreme-react/number-box"
import SelectBox from "devextreme-react/select-box"
import TextArea from "devextreme-react/text-area"
import TextBox from "devextreme-react/text-box"

import type { SysCode } from "@/api/sysCodeService"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import { formatSysCodeOptionText, getSysCodeCd } from "@/lib/sysCodeUtils"
import type { ChitDateValue, ChitType } from "@/types/voucher"

import {
  createVoucherDateBoxEditorOptions,
  createVoucherEditorOptions,
} from "../forms/documentFieldConfig"
import {
  createEmptyVoucherVatDetail,
  getVatCategoryCodeType,
  hasAnyVoucherVatInput,
  matchVatRateCodeFromOptions,
  parseVatCategoryLinkedRateCode,
  resolveVatRatePercent,
  stripVatCategoryRateToken,
  suggestVatDirectionForChitType,
  type VatDirection,
  type VoucherVatDetail,
} from "./voucherVatTypes"
import "./VatDetailPanel.css"

export type VatDetailPanelProps = {
  rowKey: string
  rowLabel?: string
  value: VoucherVatDetail
  chitType?: ChitType | string | null
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

function sortSysCodes(items: SysCode[]): SysCode[] {
  return [...items].sort((a, b) => {
    const sortA = Number(a.SORT_ORDER ?? 0)
    const sortB = Number(b.SORT_ORDER ?? 0)
    if (sortA !== sortB) {
      return sortA - sortB
    }
    return getSysCodeCd(a).localeCompare(getSysCodeCd(b))
  })
}

export default function VatDetailPanel({
  rowKey,
  rowLabel,
  value,
  chitType,
  readOnly = false,
  onChange,
  onClose,
}: VatDetailPanelProps) {
  const { lang, translate } = useContext(LanguageContext) as {
    lang?: string
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const suggestedDirection = useMemo(
    () => suggestVatDirectionForChitType(chitType),
    [chitType],
  )
  const effectiveDirection: VatDirection | null = value.direction ?? suggestedDirection

  const [moreOpen, setMoreOpen] = useState(false)
  /** Bump to remount DevExtreme editors after reset (they keep stale internal values). */
  const [editorNonce, setEditorNonce] = useState(0)
  const [taxRateOptions, setTaxRateOptions] = useState<SysCode[]>([])
  const [categoryOptions, setCategoryOptions] = useState<SysCode[]>([])

  useEffect(() => {
    let cancelled = false
    void getCachedSysCodes("VAT_RATE_CA")
      .then((items) => {
        if (!cancelled) {
          setTaxRateOptions(sortSysCodes(items))
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

  useEffect(() => {
    let cancelled = false
    const codeType = getVatCategoryCodeType(effectiveDirection)
    if (!codeType) {
      setCategoryOptions([])
      return () => {
        cancelled = true
      }
    }

    void getCachedSysCodes(codeType)
      .then((items) => {
        if (!cancelled) {
          setCategoryOptions(sortSysCodes(items))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryOptions([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [effectiveDirection])

  const taxRateDisplayOptions = useMemo(
    () =>
      taxRateOptions.map((item) => ({
        ...item,
        CODE_NAME: t(item.CODE_NAME, item.NOTE || item.CODE_NAME),
      })),
    [t, taxRateOptions],
  )

  const categoryDisplayOptions = useMemo(() => {
    const mapped = categoryOptions.map((item) => {
      const noteLabel = stripVatCategoryRateToken(item.NOTE || "")
      return {
        ...item,
        CODE_NAME: t(item.CODE_NAME, noteLabel || item.CODE_NAME),
        // Keep raw NOTE for RATE parse; strip only the visible label above.
      }
    })

    const currentInfoType = value.infoType.trim()
    if (
      currentInfoType
      && !mapped.some((item) => getSysCodeCd(item) === currentInfoType)
    ) {
      mapped.unshift({
        CODE_CD: currentInfoType,
        CODE_NAME: `${currentInfoType} (${t("VAT_INFO_TYPE_LEGACY", "mã cũ — không còn trong danh mục")})`,
        NOTE: currentInfoType,
        SORT_ORDER: -1,
      } as SysCode)
    }

    return mapped
  }, [categoryOptions, t, value.infoType])

  const resolveLinkedTaxRatePatch = useCallback(
    (categoryNote: unknown): Partial<VoucherVatDetail> => {
      const linkedRate = parseVatCategoryLinkedRateCode(categoryNote)
      if (!linkedRate) {
        // No [[RATE:...]] token (e.g. "Không lên bảng kê") → clear tax rate.
        return {
          taxRateCode: "",
          taxRate: null,
        }
      }

      const taxRateCode = matchVatRateCodeFromOptions(linkedRate, taxRateOptions)
      if (!taxRateCode) {
        return {
          taxRateCode: "",
          taxRate: null,
        }
      }

      return {
        taxRateCode,
        taxRate: resolveVatRatePercent(taxRateCode, value.taxRate),
      }
    },
    [taxRateOptions, value.taxRate],
  )

  const taxRateDisplayExpr = useCallback(
    (item: SysCode | null) => formatSysCodeOptionText(item),
    [],
  )
  const categoryDisplayExpr = useCallback(
    (item: SysCode | null) => formatSysCodeOptionText(item),
    [],
  )

  const editorOptions = useMemo(
    () => createVoucherEditorOptions({ stylingMode: "outlined" as const, readOnly }),
    [readOnly],
  )
  const dateEditorOptions = useMemo(
    () =>
      createVoucherDateBoxEditorOptions({
        stylingMode: "outlined" as const,
        readOnly,
        showClearButton: !readOnly,
      }),
    [readOnly],
  )
  const totalAmountEditorOptions = useMemo(
    () =>
      createVoucherEditorOptions({
        stylingMode: "outlined" as const,
        format: "#,##0.##",
        readOnly: true,
      }),
    [],
  )
  const noteEditorOptions = useMemo(
    () => createVoucherEditorOptions({ stylingMode: "outlined" as const, height: 56, readOnly }),
    [readOnly],
  )

  const isKhacRate = value.taxRateCode.trim().toUpperCase() === "KHAC"
  const partnerTaxLabel =
    effectiveDirection === "SELL"
      ? t("buyerTaxCode", "Mã số thuế người mua")
      : t("sellerTaxCode", "Mã số thuế người bán")
  const partnerNameLabel =
    effectiveDirection === "SELL"
      ? t("BUYER_NM", "Tên người mua")
      : t("SELLER_NM", "Tên người bán")
  const infoTypeLabel =
    effectiveDirection === "SELL"
      ? t("VAT_SELL_CATEGORY", "Phân loại bảng kê Bán ra")
      : t("VAT_BUY_CATEGORY", "Phân loại bảng kê Mua vào")

  const title = rowLabel
    ? `${t("VAT_INFO1", "Thông tin VAT")} · ${rowLabel}`
    : t("VAT_INFO1", "Thông tin VAT")

  const handleDirectionChange = useCallback(
    async (next: VatDirection) => {
      if (readOnly || next === value.direction) {
        return
      }

      const switchingExistingDirection = Boolean(value.direction) && value.direction !== next
      const hasInfoType = Boolean(value.infoType.trim())
      if (switchingExistingDirection && hasInfoType) {
        const confirmed = await confirm(
          t(
            "VAT_DIRECTION_CHANGE_CONFIRM",
            "Đổi chiều VAT sẽ xóa Ghi chú / Phân loại bảng kê hiện tại. Tiếp tục?",
          ),
          t("MSG_CONFIRM", "Xác nhận"),
        )
        if (!confirmed) {
          return
        }
      }

      onChange({
        direction: next,
        ...(switchingExistingDirection ? { infoType: "" } : {}),
      })
    },
    [onChange, readOnly, t, value.direction, value.infoType],
  )

  const handleReset = useCallback(async () => {
    if (readOnly) {
      return
    }
    if (!hasAnyVoucherVatInput(value)) {
      onChange(createEmptyVoucherVatDetail())
      setEditorNonce((current) => current + 1)
      return
    }
    const confirmed = await confirm(
      t("VAT_RESET_CONFIRM", "Xóa trống toàn bộ thông tin VAT của dòng này?"),
      t("MSG_CONFIRM", "Xác nhận"),
    )
    if (!confirmed) {
      return
    }
    onChange(createEmptyVoucherVatDetail())
    setEditorNonce((current) => current + 1)
  }, [onChange, readOnly, t, value])

  return (
    <section className="voucher-vat-detail-panel" aria-label={title} data-vat-row-key={rowKey}>
      <header className="voucher-vat-detail-panel__header">
        <div className="voucher-vat-detail-panel__header-main">
          <h3 className="voucher-vat-detail-panel__title">{title}</h3>
          <div className="voucher-vat-detail-panel__direction" role="group" aria-label={t("VAT_DIRECTION", "Chiều VAT")}>
            <button
              type="button"
              className={`voucher-vat-detail-panel__direction-btn${effectiveDirection === "BUY" ? " is-active" : ""}`}
              disabled={readOnly}
              aria-pressed={effectiveDirection === "BUY"}
              onClick={() => {
                void handleDirectionChange("BUY")
              }}
            >
              {t("VAT_DIRECTION_BUY", "Mua vào")}
            </button>
            <button
              type="button"
              className={`voucher-vat-detail-panel__direction-btn${effectiveDirection === "SELL" ? " is-active" : ""}`}
              disabled={readOnly}
              aria-pressed={effectiveDirection === "SELL"}
              onClick={() => {
                void handleDirectionChange("SELL")
              }}
            >
              {t("VAT_DIRECTION_SELL", "Bán ra")}
            </button>
          </div>
        </div>
        <div className="voucher-vat-detail-panel__header-actions">
          <button
            type="button"
            className="voucher-vat-detail-panel__reset"
            title={t("MSG_RESET1", "Xóa trống")}
            aria-label={t("MSG_RESET1", "Xóa trống")}
            disabled={readOnly}
            onClick={() => {
              void handleReset()
            }}
          >
            <span className="dx-icon dx-icon-revert" aria-hidden />
            <span className="voucher-vat-detail-panel__reset-text">{t("MSG_RESET1", "Xóa trống")}</span>
          </button>
          <button
            type="button"
            className="voucher-vat-detail-panel__close"
            title={t("CLOSE", "Đóng")}
            aria-label={t("CLOSE", "Đóng")}
            onClick={onClose}
          >
            <span className="dx-icon dx-icon-close" aria-hidden />
          </button>
        </div>
      </header>

      <div className="voucher-vat-detail-panel__body" key={`vat-editors-${rowKey}-${editorNonce}`}>
        {/* Row 1: Ngày | Số | Ký hiệu mẫu | Ký hiệu */}
        <VatField label={t("VAT_INVOICE_DATE", "Ngày hóa đơn")}>
          <DateBox
            value={value.invoiceDate as Date | string | number | null}
            {...dateEditorOptions}
            onValueChanged={(event) => {
              onChange({
                invoiceDate: (event.value ?? null) as ChitDateValue,
                ...(value.direction ? {} : { direction: suggestedDirection }),
              })
            }}
          />
        </VatField>

        <VatField label={t("VAT_INVOICE_NO", "Số hóa đơn")}>
          <TextBox
            value={value.invoiceNo}
            showClearButton={!readOnly}
            {...editorOptions}
            onValueChanged={(event) => {
              onChange({
                invoiceNo: String(event.value ?? ""),
                ...(value.direction ? {} : { direction: suggestedDirection }),
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

        {/* Row 2: Tên (dưới Ngày) | MST (dưới Số) | Ghi chú (span 2 = mẫu + ký hiệu) */}
        <VatField label={partnerNameLabel}>
          <TextBox
            value={value.sellerName}
            showClearButton={!readOnly}
            {...editorOptions}
            onValueChanged={(event) => {
              onChange({ sellerName: String(event.value ?? "") })
            }}
          />
        </VatField>

        <VatField label={partnerTaxLabel}>
          <TextBox
            value={value.taxCode}
            showClearButton={!readOnly}
            {...editorOptions}
            onValueChanged={(event) => {
              onChange({ taxCode: String(event.value ?? "") })
            }}
          />
        </VatField>

        <VatField
          label={infoTypeLabel}
          className="voucher-vat-detail-panel__field--span-2"
        >
          <SelectBox
            key={`vat-info-type-${effectiveDirection ?? "none"}-${lang ?? "VIET"}`}
            dataSource={categoryDisplayOptions}
            value={value.infoType || null}
            valueExpr="CODE_CD"
            displayExpr={categoryDisplayExpr}
            searchEnabled
            searchExpr={["CODE_CD", "CODE_NAME", "NOTE"]}
            showClearButton={!readOnly}
            acceptCustomValue={false}
            disabled={readOnly || !effectiveDirection}
            {...editorOptions}
            onValueChanged={(event) => {
              const code = getSysCodeCd(
                typeof event.value === "object" && event.value
                  ? (event.value as SysCode)
                  : { CODE_CD: event.value },
              )
              // Prefer raw catalog NOTE (keeps [[RATE:10%]]); display options may only change CODE_NAME.
              const sourceNote =
                (typeof event.value === "object" && event.value
                  ? (event.value as SysCode).NOTE
                  : undefined)
                ?? categoryOptions.find((item) => getSysCodeCd(item) === code)?.NOTE
                ?? categoryDisplayOptions.find((item) => getSysCodeCd(item) === code)?.NOTE
              onChange({
                infoType: code,
                ...resolveLinkedTaxRatePatch(sourceNote),
                ...(value.direction ? {} : { direction: effectiveDirection }),
              })
            }}
          />
        </VatField>

        <VatField label={t("VAT_TAX_RATE", "Thuế suất")}>
          <SelectBox
            key={`vat-tax-rate-${lang ?? "VIET"}`}
            dataSource={taxRateDisplayOptions}
            value={value.taxRateCode || null}
            valueExpr="CODE_CD"
            displayExpr={taxRateDisplayExpr}
            searchEnabled
            searchExpr={["CODE_CD", "CODE_NAME", "NOTE"]}
            showClearButton={!readOnly}
            acceptCustomValue={false}
            {...editorOptions}
            onValueChanged={(event) => {
              const code = getSysCodeCd(
                typeof event.value === "object" && event.value
                  ? (event.value as SysCode)
                  : { CODE_CD: event.value },
              )
              const percent = resolveVatRatePercent(code, value.taxRate)
              onChange({
                taxRateCode: code,
                taxRate: percent,
                ...(value.direction ? {} : { direction: effectiveDirection }),
              })
            }}
          />
        </VatField>

        {isKhacRate ? (
          <VatField label={t("VAT_TAX_RATE_OTHER", "Thuế suất khác (%)")}>
            <NumberBox
              value={value.taxRate}
              format="#,##0.####"
              showClearButton={!readOnly}
              {...editorOptions}
              onValueChanged={(event) => {
                onChange({
                  taxRate: event.value == null ? null : Number(event.value),
                })
              }}
            />
          </VatField>
        ) : null}

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
          <NumberBox value={value.totalAmount} {...totalAmountEditorOptions} />
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
                  format="#,##0.########"
                  showClearButton={!readOnly}
                  {...editorOptions}
                  onValueChanged={(event) => {
                    onChange({
                      customsExchangeRate: event.value == null ? null : Number(event.value),
                    })
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
                  {...noteEditorOptions}
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
