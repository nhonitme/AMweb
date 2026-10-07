import CheckBox from "devextreme-react/check-box"
import Form, { GroupItem, Item as FormItem } from "devextreme-react/form"
import NumberBox from "devextreme-react/number-box"

import { DEFAULT_CURRENCY_CODE } from "@/lib/currency"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"
import { EINV_KEY } from "../einvoiceI18n"
import type { EInvoiceFormData } from "./EInvoiceEditorTypes"
import EInvoiceVatRateLookup from "./EInvoiceVatRateLookup"

type EInvoiceTotalsSectionVm = {
  [key: string]: any
  formData: EInvoiceFormData
}

type EInvoiceTotalsSectionProps = {
  vm: EInvoiceTotalsSectionVm
}

export default function EInvoiceTotalsSection({ vm }: EInvoiceTotalsSectionProps) {
  const {
    t,
    formData,
    isWarehouseForm,
    isReadOnly,
    handleFieldDataChanged,
    withoutTaxRate,
    useMultiTaxRate,
    getHeaderNumberFormat,
    moneyFallbackPrecision,
    headerTaxRate,
    handleHeaderTaxRateChange,
    isSalesForm,
    nq204ReductionActive,
    handleNq204ReductionToggle,
    handleNq204ReductionAmountChange,
    isForeignCurrency,
    vndMoneyFallbackPrecision,
    isHeaderCommercialDiscountReadOnly,
  } = vm

  const isCommercialDiscountFieldReadOnly = isReadOnly || isHeaderCommercialDiscountReadOnly

  return (
    <section className="einvoice-editor__section einvoice-editor__section--totals">
      <div className="einvoice-editor__section-title">{t("TOTALS", "Tổng cộng")}</div>
      <div className="einvoice-editor__section-body">
        <div className="einvoice-editor__totals-panel am-einvoice-editor-form">
          <div className="[&_.dx-field-item]:!pb-2 [&_.dx-field-item-content]:!flex-1 [&_.dx-field-item-content]:!w-full [&_.dx-form-group-caption]:!text-right [&_.dx-texteditor]:!w-full">
          {!isWarehouseForm ? (
            <Form
              formData={formData}
              labelLocation="left"
              alignItemLabels={true}
              readOnly={isReadOnly}
              onFieldDataChanged={handleFieldDataChanged}
              showColonAfterLabel={false}
            >
              <GroupItem caption={t("TOTALS", "Totals")} colCount={1}>
                {!withoutTaxRate ? (
                  <FormItem
                    dataField="TGTCTHUE"
                    editorType="dxNumberBox"
                    label={{ text: t("TGTCTHUE", "Before tax") }}
                    editorOptions={createNumberEditorOptions(getHeaderNumberFormat("TGTCTHUE", moneyFallbackPrecision), { readOnly: isReadOnly, width: "100%" })}
                  />
                ) : null}
                {!withoutTaxRate && !useMultiTaxRate ? (
                  <FormItem
                    label={{ text: t("TSUAT", "Tax rate") }}
                    render={() => (
                      <EInvoiceVatRateLookup
                        value={headerTaxRate}
                        onChange={handleHeaderTaxRateChange}
                        readOnly={isReadOnly}
                        placeholder={t("VAT_RATE_SELECT", "Select tax rate")}
                        popupTitle={t("VAT_RATE_SELECT", "Select tax rate")}
                        buttonHint={t("VAT_RATE_LOOKUP", "Open tax rate list")}
                      />
                    )}
                  />
                ) : null}
                <FormItem
                  dataField="TTCKTMAI"
                  editorType="dxNumberBox"
                  label={{ text: t("TTCKTMAI", "Commercial discount") }}
                  editorOptions={createNumberEditorOptions(getHeaderNumberFormat("TTCKTMAI", moneyFallbackPrecision), {
                    readOnly: isCommercialDiscountFieldReadOnly,
                    width: "100%",
                  })}
                />
                <FormItem
                  dataField="CKTMAI_GCHU"
                  editorType="dxTextBox"
                  label={{ text: t("CKTMAI_GCHU", "Commercial discount note") }}
                  editorOptions={{
                    readOnly: isCommercialDiscountFieldReadOnly,
                    width: "100%",
                    maxLength: 1000,
                    placeholder: isCommercialDiscountFieldReadOnly ? undefined : t("CKTMAI_GCHU_DEFAULT", "Chiết khấu thương mại"),
                  }}
                />
                {!withoutTaxRate ? (
                  <FormItem
                    label={{ text: t("TAXABLE_AMOUNT", "Taxable amount") }}
                    render={() => (
                      <NumberBox
                        value={Math.max(Number(formData.TGTCTHUE ?? 0) - Number(formData.TTCKTMAI ?? 0), 0) || null}
                        format={getHeaderNumberFormat("TGTKCTHUE", moneyFallbackPrecision)}
                        useMaskBehavior={true}
                        readOnly={true}
                        width="100%"
                        elementAttr={{ class: "am-einvoice-readonly-field" }}
                      />
                    )}
                  />
                ) : null}
                {!withoutTaxRate ? (
                  <FormItem
                    dataField="TGTTTHUE"
                    editorType="dxNumberBox"
                    label={{ text: t("TGTTTHUE", "Tax amount") }}
                    editorOptions={createNumberEditorOptions(getHeaderNumberFormat("TGTTTHUE", moneyFallbackPrecision), { width: "100%", readOnly: isReadOnly })}
                  />
                ) : null}
                {isSalesForm ? (
                  <FormItem
                    label={{ visible: false }}
                    render={() => (
                      <div className="flex flex-col gap-2">
                        <CheckBox
                          text={t(
                            EINV_KEY.NQ204_CHECKBOX,
                            "Nghi quyet 204/2025/QH15 giam thue gia tri gia tang",
                          )}
                          value={nq204ReductionActive}
                          readOnly={isReadOnly}
                          onValueChanged={(event) => handleNq204ReductionToggle(Boolean(event.value))}
                        />
                        {nq204ReductionActive ? (
                          <NumberBox
                            label={t("TGTKHAC", "Reduction amount")}
                            labelMode="floating"
                            value={Number(formData.TGTKHAC ?? 0) || null}
                            format={getHeaderNumberFormat("TGTKHAC", moneyFallbackPrecision)}
                            useMaskBehavior={true}
                            readOnly={isReadOnly}
                            width="100%"
                            min={0}
                            onValueChanged={(event) => handleNq204ReductionAmountChange(event.value)}
                          />
                        ) : null}
                      </div>
                    )}
                  />
                ) : null}
                <FormItem
                  dataField="TGTTTBSO"
                  editorType="dxNumberBox"
                  label={{ text: t("TGTTTBSO", "Payment amount") }}
                  editorOptions={createNumberEditorOptions(getHeaderNumberFormat("TGTTTBSO", moneyFallbackPrecision), { readOnly: isReadOnly, width: "100%" })}
                />
                {!withoutTaxRate && isForeignCurrency ? (
                  <FormItem
                    dataField="TGTCTHUE_VND"
                    editorType="dxNumberBox"
                    label={{ text: t("TGTCTHUE_VND", "Before tax VND") }}
                    editorOptions={createNumberEditorOptions(getHeaderNumberFormat("TGTCTHUE_VND", vndMoneyFallbackPrecision, DEFAULT_CURRENCY_CODE), {
                      readOnly: isReadOnly,
                      width: "100%",
                    })}
                  />
                ) : null}
                {!withoutTaxRate && isForeignCurrency ? (
                  <FormItem
                    dataField="TGTTTHUE_VND"
                    editorType="dxNumberBox"
                    label={{ text: t("TGTTTHUE_VND", "Tax VND") }}
                    editorOptions={createNumberEditorOptions(getHeaderNumberFormat("TGTTTHUE_VND", vndMoneyFallbackPrecision, DEFAULT_CURRENCY_CODE), {
                      readOnly: isReadOnly,
                      width: "100%",
                    })}
                  />
                ) : null}
                {isForeignCurrency ? (
                  <FormItem
                    dataField="TTCKTMAI_VND"
                    editorType="dxNumberBox"
                    label={{ text: t("TTCKTMAI_VND", "Discount VND") }}
                    editorOptions={createNumberEditorOptions(getHeaderNumberFormat("TTCKTMAI_VND", vndMoneyFallbackPrecision, DEFAULT_CURRENCY_CODE), {
                      readOnly: isCommercialDiscountFieldReadOnly,
                      width: "100%",
                    })}
                  />
                ) : null}
                {isForeignCurrency ? (
                  <FormItem
                    dataField="TGTTTBSO_VND"
                    editorType="dxNumberBox"
                    label={{ text: t("TGTTTBSO_VND", "Payment VND") }}
                    editorOptions={createNumberEditorOptions(getHeaderNumberFormat("TGTTTBSO_VND", vndMoneyFallbackPrecision, DEFAULT_CURRENCY_CODE), {
                      readOnly: isReadOnly,
                      width: "100%",
                    })}
                  />
                ) : null}
                <FormItem
                  dataField="TGTTTBCHU"
                  editorType="dxTextBox"
                  label={{ text: t("TGTTTBCHU", "Amount in words") }}
                  editorOptions={{ width: "100%", readOnly: isReadOnly }}
                />
              </GroupItem>
            </Form>
          ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
