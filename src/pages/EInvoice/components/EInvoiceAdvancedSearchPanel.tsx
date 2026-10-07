import { useMemo, type ReactNode } from "react"
import { Button } from "devextreme-react/button"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"

import type { EInvoiceStatusOption, EInvoiceTchdonOption } from "../einvoiceModel"
import {
  EINVOICE_TEXT_MATCH_OPS,
  type EInvoiceAdvancedFilters,
  type EInvoiceFilterOption,
  type EInvoiceTextMatchOp,
} from "../einvoiceAdvancedSearch"

import "./EInvoiceAdvancedSearchPanel.css"

type Translate = (key: string, fallback: string) => string

type EInvoiceAdvancedSearchPanelProps = {
  visible: boolean
  value: EInvoiceAdvancedFilters
  invoiceStatusOptions: EInvoiceStatusOption[]
  tchdonOptions: EInvoiceTchdonOption[]
  cqtStatusOptions: EInvoiceFilterOption[]
  signStatusOptions: EInvoiceFilterOption[]
  mailStatusOptions: EInvoiceFilterOption[]
  t: Translate
  onChange: (next: EInvoiceAdvancedFilters) => void
  onSearch: () => void
  onReset: () => void
  onCollapse: () => void
}

function FormRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="einvoice-adv-search__row">
      <label className="einvoice-adv-search__label" title={label}>
        {label}
      </label>
      <div className="einvoice-adv-search__control">{children}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="einvoice-adv-search__section">
      <div className="einvoice-adv-search__section-title">{title}</div>
      <div className="einvoice-adv-search__section-body">{children}</div>
    </section>
  )
}

export function EInvoiceAdvancedSearchPanel({
  visible,
  value,
  invoiceStatusOptions,
  tchdonOptions,
  cqtStatusOptions,
  signStatusOptions,
  mailStatusOptions,
  t,
  onChange,
  onSearch,
  onReset,
  onCollapse,
}: EInvoiceAdvancedSearchPanelProps) {
  const textOpOptions = useMemo(
    () =>
      EINVOICE_TEXT_MATCH_OPS.map((item) => ({
        value: item.value,
        text:
          item.value === "startsWith"
            ? t("MATCH_STARTS_WITH", item.text)
            : item.value === "equals"
              ? t("MATCH_EQUALS", item.text)
              : t("MATCH_CONTAINS", item.text),
      })),
    [t],
  )

  const cqtOptions = useMemo(() => cqtStatusOptions, [cqtStatusOptions])

  const signOptions = useMemo(() => signStatusOptions, [signStatusOptions])

  const mailOptions = useMemo(
    () => [
      { value: null as number | null, text: t("ALL", "Tất cả") },
      ...mailStatusOptions.map((item) => ({
        value: item.value as number | null,
        text: item.text,
      })),
    ],
    [mailStatusOptions, t],
  )

  const invoiceStatusData = useMemo(
    () => [
      { value: null as number | null, text: t("ALL", "Tất cả") },
      ...invoiceStatusOptions.map((o) => ({ value: o.value as number | null, text: o.text })),
    ],
    [invoiceStatusOptions, t],
  )

  const tchdonData = useMemo(
    () => [
      { value: null as number | null, text: t("ALL", "Tất cả") },
      ...tchdonOptions.map((o) => ({ value: o.value as number | null, text: o.text })),
    ],
    [t, tchdonOptions],
  )

  const cqtData = useMemo(
    () => [
      { value: null as number | null, text: t("ALL", "Tất cả") },
      ...cqtOptions.map((o) => ({ value: o.value as number | null, text: o.text })),
    ],
    [cqtOptions, t],
  )

  const signData = useMemo(
    () => [
      { value: null as number | null, text: t("ALL", "Tất cả") },
      ...signOptions.map((o) => ({ value: o.value as number | null, text: o.text })),
    ],
    [signOptions, t],
  )

  if (!visible) {
    return null
  }

  const patch = (partial: Partial<EInvoiceAdvancedFilters>) => onChange({ ...value, ...partial })

  return (
    <div className="einvoice-adv-search">
      <div className="einvoice-adv-search__header">
        <div className="einvoice-adv-search__title">
          {t("ADVANCED_SEARCH", "Tìm kiếm nâng cao")}
        </div>
        <button
          type="button"
          className="einvoice-adv-search__collapse"
          onClick={onCollapse}
        >
          {t("COLLAPSE", "Thu gọn")}
        </button>
      </div>

      <div className="einvoice-adv-search__body">
        <Section title={t("INVOICE_INFO", "Thông tin hóa đơn")}>
          <FormRow label={t("KHHDON", "Ký hiệu HĐ")}>
            <div className="einvoice-adv-search__split">
              <SelectBox
                width={108}
                height={28}
                dataSource={textOpOptions}
                displayExpr="text"
                valueExpr="value"
                value={value.khhdonOp}
                stylingMode="outlined"
                onValueChanged={(e) => patch({ khhdonOp: (e.value as EInvoiceTextMatchOp) ?? "contains" })}
              />
              <TextBox
                height={28}
                value={value.khhdon}
                stylingMode="outlined"
                showClearButton
                placeholder={t("ENTER_KHHDON", "Nhập ký hiệu")}
                onValueChanged={(e) => patch({ khhdon: String(e.value ?? "") })}
                onEnterKey={onSearch}
              />
            </div>
          </FormRow>

          <FormRow label={t("SHDON", "Số hóa đơn")}>
            <div className="einvoice-adv-search__split einvoice-adv-search__split--range">
              <TextBox
                height={28}
                value={value.shdonFrom}
                stylingMode="outlined"
                showClearButton
                placeholder={t("FROM_NO", "Từ số")}
                onValueChanged={(e) => patch({ shdonFrom: String(e.value ?? "") })}
                onEnterKey={onSearch}
              />
              <span className="einvoice-adv-search__range-sep">~</span>
              <TextBox
                height={28}
                value={value.shdonTo}
                stylingMode="outlined"
                showClearButton
                placeholder={t("TO_NO", "Đến số")}
                onValueChanged={(e) => patch({ shdonTo: String(e.value ?? "") })}
                onEnterKey={onSearch}
              />
            </div>
          </FormRow>

          <FormRow label={t("TCHDON", "Loại hóa đơn")}>
            <SelectBox
              height={28}
              dataSource={tchdonData}
              displayExpr="text"
              valueExpr="value"
              value={value.tchdon}
              stylingMode="outlined"
              showClearButton
              onValueChanged={(e) => patch({ tchdon: e.value === null || e.value === undefined ? null : Number(e.value) })}
            />
          </FormRow>
        </Section>

        <Section title={t("BUYER_INFO", "Người mua")}>
          <FormRow label={t("NMUA_TEN", "Tên người mua")}>
            <div className="einvoice-adv-search__split">
              <SelectBox
                width={108}
                height={28}
                dataSource={textOpOptions}
                displayExpr="text"
                valueExpr="value"
                value={value.nmuaTenOp}
                stylingMode="outlined"
                onValueChanged={(e) => patch({ nmuaTenOp: (e.value as EInvoiceTextMatchOp) ?? "contains" })}
              />
              <TextBox
                height={28}
                value={value.nmuaTen}
                stylingMode="outlined"
                showClearButton
                placeholder={t("ENTER_BUYER_NAME", "Nhập tên")}
                onValueChanged={(e) => patch({ nmuaTen: String(e.value ?? "") })}
                onEnterKey={onSearch}
              />
            </div>
          </FormRow>

          <FormRow label={t("NMUA_MST", "MST người mua")}>
            <div className="einvoice-adv-search__split">
              <SelectBox
                width={108}
                height={28}
                dataSource={textOpOptions}
                displayExpr="text"
                valueExpr="value"
                value={value.nmuaMstOp}
                stylingMode="outlined"
                onValueChanged={(e) => patch({ nmuaMstOp: (e.value as EInvoiceTextMatchOp) ?? "startsWith" })}
              />
              <TextBox
                height={28}
                value={value.nmuaMst}
                stylingMode="outlined"
                showClearButton
                placeholder={t("ENTER_BUYER_TAX", "Nhập MST")}
                onValueChanged={(e) => patch({ nmuaMst: String(e.value ?? "") })}
                onEnterKey={onSearch}
              />
            </div>
          </FormRow>
        </Section>

        <Section title={t("STATUS_INFO", "Trạng thái")}>
          <FormRow label={t("INVOICE_STATUS", "Trạng thái HĐ")}>
            <SelectBox
              height={28}
              dataSource={invoiceStatusData}
              displayExpr="text"
              valueExpr="value"
              value={value.invoiceStatus}
              stylingMode="outlined"
              showClearButton
              onValueChanged={(e) => patch({ invoiceStatus: e.value === null || e.value === undefined ? null : Number(e.value) })}
            />
          </FormRow>

          <FormRow label={t("CQT_STATUS", "Trạng thái CQT")}>
            <SelectBox
              height={28}
              dataSource={cqtData}
              displayExpr="text"
              valueExpr="value"
              value={value.cqtStatus}
              stylingMode="outlined"
              showClearButton
              onValueChanged={(e) => patch({ cqtStatus: e.value === null || e.value === undefined ? null : Number(e.value) })}
            />
          </FormRow>

          <FormRow label={t("IS_SIGNED", "Trạng thái ký")}>
            <SelectBox
              height={28}
              dataSource={signData}
              displayExpr="text"
              valueExpr="value"
              value={value.isSigned}
              stylingMode="outlined"
              showClearButton
              onValueChanged={(e) => patch({ isSigned: e.value === null || e.value === undefined ? null : Number(e.value) })}
            />
          </FormRow>

          <FormRow label={t("MAIL_STATUS", "Gửi email")}>
            <SelectBox
              height={28}
              dataSource={mailOptions}
              displayExpr="text"
              valueExpr="value"
              value={value.mailStatus}
              stylingMode="outlined"
              showClearButton
              onValueChanged={(e) => patch({ mailStatus: e.value === null || e.value === undefined ? null : Number(e.value) })}
            />
          </FormRow>
        </Section>
      </div>

      <div className="einvoice-adv-search__footer">
        <Button
          stylingMode="outlined"
          icon="clear"
          text={t("RESET", "Đặt lại")}
          height={30}
          onClick={onReset}
        />
        <Button
          type="default"
          stylingMode="contained"
          icon="search"
          text={t("MSG_BTNSER", "Tìm kiếm")}
          height={30}
          onClick={onSearch}
        />
      </div>
    </div>
  )
}
