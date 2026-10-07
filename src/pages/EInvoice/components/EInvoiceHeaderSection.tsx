import { memo, useEffect, useMemo, useState } from "react"
import Form, { GroupItem, Item as FormItem } from "devextreme-react/form"
import SelectBox from "devextreme-react/select-box"

import { createDateBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"
import { currencyLookupStore } from "@/components/lookup/currencyLookupStore"
import { getEInvoiceRateFallbackPrecision } from "../einvoiceDecimalSettings"
import { formatEInvoiceSellerOption } from "../einvoiceModel"
import EInvoiceBuyerCustomerLookup from "./BuyerCustomerLookup"
import TaxCodeLookupField from "@/components/forms/TaxCodeLookupField"
import { formatCurrencyOption } from "./EInvoiceEditorHelpers"
import type { EInvoiceFormData } from "./EInvoiceEditorTypes"
import EInvoicePaymentMethodLookup from "./EInvoicePaymentMethodLookup"
import EInvoiceRelatedInvoicePanel from "./EInvoiceRelatedInvoicePanel"

type EInvoiceHeaderSectionVm = {
  [key: string]: any
  formData: EInvoiceFormData
}

type EInvoiceHeaderSectionProps = {
  vm: EInvoiceHeaderSectionVm
}

function hasBuyerExtendedFieldValue(value: unknown): boolean {
  return String(value ?? "").trim().length > 0
}

function headerVmUnchanged(prev: EInvoiceHeaderSectionVm, next: EInvoiceHeaderSectionVm) {
  return (
    prev.formData === next.formData &&
    prev.relatedTchdon === next.relatedTchdon &&
    prev.requiresRelatedInvoice === next.requiresRelatedInvoice &&
    prev.isReadOnly === next.isReadOnly &&
    prev.isWarehouseForm === next.isWarehouseForm &&
    prev.isWarehouseConsignment === next.isWarehouseConsignment &&
    prev.isWarehouseInternal === next.isWarehouseInternal &&
    prev.isForeignCurrency === next.isForeignCurrency &&
    prev.canEditInvoiceDate === next.canEditInvoiceDate &&
    prev.cashRegister === next.cashRegister &&
    prev.bkeSummary === next.bkeSummary &&
    prev.sellerOptions === next.sellerOptions &&
    prev.tchdonOptions === next.tchdonOptions &&
    prev.currentInvoiceId === next.currentInvoiceId &&
    prev.companyCd === next.companyCd
  )
}

function EInvoiceHeaderSection({ vm }: EInvoiceHeaderSectionProps) {
  const {
    t,
    cashRegister = false,
    tchdonOptions,
    relatedTchdon,
    tchdonValueExpr,
    tchdonDisplayExpr,
    isReadOnly,
    handleTchdonChange,
    requiresRelatedInvoice,
    formData,
    companyCd,
    currentInvoiceId,
    handleRelatedInvoiceChange,
    handleOpenBke,
    bkeSummary,
    handleFieldDataChanged,
    isWarehouseForm,
    handleBuyerCustomerChange,
    handleBuyerTaxLookupApply,
    isWarehouseConsignment,
    isWarehouseInternal,
    sellerOptions,
    canEditInvoiceDate,
    isForeignCurrency,
    getHeaderNumberFormat,
    handlePaymentMethodChange,
  } = vm

  const hasBuyerExtendedData = useMemo(
    () =>
      hasBuyerExtendedFieldValue(formData.NMUA_HVTNMHANG) ||
      hasBuyerExtendedFieldValue(formData.NMUA_STKNHANG) ||
      hasBuyerExtendedFieldValue(formData.NMUA_TNHANG) ||
      hasBuyerExtendedFieldValue(formData.NMUA_SDTHOAI) ||
      hasBuyerExtendedFieldValue(formData.NMUA_MDVQHNSACH) ||
      hasBuyerExtendedFieldValue(formData.NMUA_CCCDAN) ||
      hasBuyerExtendedFieldValue(formData.NMUA_SHCHIEU),
    [
      formData.NMUA_CCCDAN,
      formData.NMUA_HVTNMHANG,
      formData.NMUA_MDVQHNSACH,
      formData.NMUA_SDTHOAI,
      formData.NMUA_SHCHIEU,
      formData.NMUA_STKNHANG,
      formData.NMUA_TNHANG,
    ],
  )

  const [buyerExtendedOpen, setBuyerExtendedOpen] = useState(false)

  useEffect(() => {
    if (hasBuyerExtendedData) {
      setBuyerExtendedOpen(true)
    }
  }, [hasBuyerExtendedData])

  return (
    <>
      <section className="einvoice-editor__section">
        <div className="einvoice-editor__section-title">{t("EINV_TCHDON", "Tính chất hóa đơn")}</div>
        <div className="einvoice-editor__section-body einvoice-editor__section-body--compact">
          <div className="einvoice-editor__inline-row">
            <div className="einvoice-editor__field w-full min-w-[200px] sm:w-56 sm:shrink-0">
              <div className="einvoice-editor__field-label">{t("EINV_TCHDON", "Tính chất hóa đơn")}</div>
              <SelectBox
                dataSource={tchdonOptions}
                value={relatedTchdon}
                valueExpr={tchdonValueExpr}
                displayExpr={tchdonDisplayExpr}
                searchEnabled={true}
                showClearButton={false}
                readOnly={isReadOnly}
                disabled={tchdonOptions.length === 0}
                onValueChanged={(event) => handleTchdonChange(event.value as number | null)}
              />
            </div>
            {requiresRelatedInvoice ? (
              <div className="einvoice-editor__field min-w-[320px] flex-1">
                <div className="einvoice-editor__field-label">{t("RELATED_INVOICE", "Related invoice")}</div>
                <EInvoiceRelatedInvoicePanel
                  related={formData.RELATED}
                  tchdon={relatedTchdon}
                  companyCd={companyCd}
                  invoiceId={currentInvoiceId}
                  readOnly={isReadOnly}
                  bkeSummary={bkeSummary}
                  onChange={handleRelatedInvoiceChange}
                  onOpenBke={handleOpenBke}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="einvoice-editor__section">
        <div className="einvoice-editor__section-title">{t("INVOICE_INFO", "Thông tin hóa đơn")}</div>
        <div className="einvoice-editor__section-body am-einvoice-editor-form">
          <Form
            formData={formData}
            labelLocation="top"
            readOnly={isReadOnly}
            onFieldDataChanged={handleFieldDataChanged}
            showColonAfterLabel={false}
          >
            <GroupItem colCount={4} colCountByScreen={{ xs: 1, sm: 1, md: 4, lg: 4 }}>
              <GroupItem
                caption={isWarehouseForm ? t("RECEIVER", "Receiver") : t("BUYER", "Buyer")}
                colSpan={3}
                colCount={3}
                colCountByScreen={{ xs: 1, sm: 2, md: 3, lg: 3 }}
              >
                {!isWarehouseForm ? (
                  <FormItem
                    label={{ text: t("CUSTOMER", "Customer") }}
                    colSpan={3}
                    render={() => (
                      <EInvoiceBuyerCustomerLookup
                        value={formData.BUYER_CUSTOMER_ID > 0 ? formData.BUYER_CUSTOMER_ID : null}
                        onChange={handleBuyerCustomerChange}
                        readOnly={isReadOnly}
                        placeholder={t("CustomerSelect", "Select customer")}
                        popupTitle={t("CustomerSelect", "Select customer")}
                        buttonHint={t("LIST_CUSTOMER", "Open customer list")}
                      />
                    )}
                  />
                ) : null}
                <FormItem
                  dataField="NMUA_TEN"
                  editorType="dxTextBox"
                  label={{ text: isWarehouseForm ? t("NMUA_TEN", "Receiver name") : t("NMUA_TEN", "Buyer name") }}
                />
                <FormItem
                  label={{ text: t("NMUA_MST", "Tax code") }}
                  render={() => (
                    <TaxCodeLookupField
                      value={formData.NMUA_MST}
                      readOnly={isReadOnly}
                      onValueChange={(nextValue) => handleFieldDataChanged({ dataField: "NMUA_MST", value: nextValue })}
                      onLookupApply={handleBuyerTaxLookupApply}
                    />
                  )}
                />
                <FormItem
                  dataField="NMUA_DCHI"
                  editorType="dxTextBox"
                  label={{ text: isWarehouseForm ? t("NMUA_DCHI_WAREHOUSE", "Receive warehouse") : t("NMUA_DCHI", "Address") }}
                  colSpan={3}
                />
                {!isWarehouseForm ? (
                  <>
                    <FormItem
                      dataField="NMUA_DCTDTU"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_DCTDTU", "Email") }}
                      editorOptions={{ mode: "email" }}
                      colSpan={3}
                    />
                    <FormItem
                      colSpan={3}
                      label={{ visible: false }}
                      render={() => (
                        <button
                          type="button"
                          className="einvoice-editor__buyer-toggle"
                          onClick={() => setBuyerExtendedOpen((open) => !open)}
                          aria-expanded={buyerExtendedOpen}
                        >
                          <span
                            className={`einvoice-editor__buyer-toggle-icon ${buyerExtendedOpen ? "is-open" : ""}`}
                            aria-hidden="true"
                          >
                            ▶
                          </span>
                          {t("BUYER_EXTENDED_INFO", "Thông tin mở rộng")}
                        </button>
                      )}
                    />
                    <FormItem
                      dataField="NMUA_HVTNMHANG"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_HVTNMHANG", "Buyer person") }}
                      visible={buyerExtendedOpen}
                    />
                    <FormItem
                      dataField="NMUA_MTINH"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_MTINH", "Mã tỉnh (MTinh)") }}
                      editorOptions={{ maxLength: 2 }}
                      visible={buyerExtendedOpen}
                    />
                    <FormItem
                      dataField="NMUA_TTINH"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_TTINH", "Tên tỉnh (TTinh)") }}
                      editorOptions={{ maxLength: 50 }}
                      visible={buyerExtendedOpen}
                    />
                    <FormItem
                      dataField="NMUA_MXA"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_MXA", "Mã xã (MXa)") }}
                      editorOptions={{ maxLength: 5 }}
                      visible={buyerExtendedOpen}
                    />
                    <FormItem
                      dataField="NMUA_TXA"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_TXA", "Tên xã (TXa)") }}
                      editorOptions={{ maxLength: 50 }}
                      visible={buyerExtendedOpen}
                    />
                    <FormItem
                      dataField="NMUA_STKNHANG"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_STKNHANG", "Bank account") }}
                      visible={buyerExtendedOpen}
                    />
                    <FormItem
                      dataField="NMUA_TNHANG"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_TNHANG", "Bank name") }}
                      visible={buyerExtendedOpen}
                    />
                    <FormItem
                      dataField="NMUA_SDTHOAI"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_SDTHOAI", "Phone") }}
                      visible={buyerExtendedOpen}
                    />
                    <FormItem
                      dataField="NMUA_MDVQHNSACH"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_MDVQHNSACH", "Budget unit code") }}
                      visible={buyerExtendedOpen}
                    />
                    <FormItem
                      dataField="NMUA_CCCDAN"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_CCCDAN", "ID card") }}
                      visible={buyerExtendedOpen}
                    />
                    <FormItem
                      dataField="NMUA_SHCHIEU"
                      editorType="dxTextBox"
                      label={{ text: t("NMUA_SHCHIEU", "Passport") }}
                      visible={buyerExtendedOpen}
                    />
                  </>
                ) : (
                  <FormItem
                    dataField="NMUA_HVTNMHANG"
                    editorType="dxTextBox"
                    label={{ text: t("HVTNNHANG", "Receiver person") }}
                    colSpan={3}
                  />
                )}
                {isWarehouseForm ? (
                  <>
                    <FormItem
                      dataField="NBAN_DCHI"
                      editorType="dxTextBox"
                      label={{ text: t("NBAN_DCHI", "Export warehouse") }}
                      colSpan={3}
                    />
                    {isWarehouseConsignment ? (
                      <>
                        <FormItem
                          dataField="HDKTSo"
                          editorType="dxTextBox"
                          label={{ text: t("HDKTSo", "Contract no.") }}
                          isRequired={true}
                        />
                        <FormItem
                          dataField="HDKTNgay"
                          editorType="dxDateBox"
                          label={{ text: t("HDKTNgay", "Contract date") }}
                          isRequired={true}
                          editorOptions={createDateBoxEditorOptions({
                            dateSerializationFormat: "yyyy-MM-dd",
                            readOnly: isReadOnly,
                            disabled: isReadOnly,
                            openOnFieldClick: !isReadOnly,
                          })}
                        />
                      </>
                    ) : null}
                    {isWarehouseInternal ? (
                      <FormItem
                        dataField="LDDNBo"
                        editorType="dxTextBox"
                        label={{ text: t("LDDNBo", "Internal dispatch order") }}
                        colSpan={3}
                        isRequired={true}
                      />
                    ) : null}
                    <FormItem dataField="HVTNXHang" editorType="dxTextBox" label={{ text: t("HVTNXHang", "Exporter") }} />
                    <FormItem
                      dataField="TNVChuyen"
                      editorType="dxTextBox"
                      label={{ text: t("TNVChuyen", "Transporter") }}
                      isRequired={true}
                    />
                    <FormItem dataField="HDSo" editorType="dxTextBox" label={{ text: t("HDSo", "Transport doc no.") }} />
                    <FormItem
                      dataField="PTVChuyen"
                      editorType="dxTextBox"
                      label={{ text: t("PTVChuyen", "Transport means") }}
                      colSpan={3}
                      isRequired={true}
                    />
                  </>
                ) : null}
              </GroupItem>

              <GroupItem caption={t("HEADER", "Header")} colSpan={1} colCount={1}>
                <FormItem
                  dataField="TEMPLATE_XSL_ID"
                  editorType="dxSelectBox"
                  label={{ text: t("TEMPLATE", "Mau HD") }}
                  isRequired={true}
                  editorOptions={{
                    dataSource: sellerOptions,
                    valueExpr: "XSL_ID",
                    displayExpr: formatEInvoiceSellerOption,
                    searchEnabled: true,
                    showClearButton: false,
                    disabled: sellerOptions.length === 0,
                  }}
                />
                <FormItem
                  dataField="NLAP"
                  editorType="dxDateBox"
                  label={{ text: cashRegister ? "Ngày lập (tự chốt khi ký)" : t("NLAP", "Invoice date") }}
                  editorOptions={createDateBoxEditorOptions({
                    dateSerializationFormat: "yyyy-MM-dd",
                    readOnly: !canEditInvoiceDate,
                    disabled: !canEditInvoiceDate,
                    openOnFieldClick: canEditInvoiceDate,
                    max: new Date(),
                  })}
                />
                <FormItem
                  dataField="DVTTE"
                  editorType="dxSelectBox"
                  label={{ text: t("DVTTE", "Currency") }}
                  editorOptions={{
                    dataSource: currencyLookupStore,
                    valueExpr: "CODE_CD",
                    displayExpr: (item: { CODE_CD?: string | null; CODE_NAME?: string | null } | null) =>
                      formatCurrencyOption(item, t),
                    searchEnabled: true,
                    showClearButton: false,
                  }}
                />
                {isForeignCurrency && (
                  <FormItem
                    dataField="TGIA"
                    editorType="dxNumberBox"
                    label={{ text: t("TGIA", "Rate") }}
                    isRequired={true}
                    editorOptions={createNumberEditorOptions(getHeaderNumberFormat("TGIA", getEInvoiceRateFallbackPrecision()), { min: 0.000001 })}
                  />
                )}
                {!isWarehouseForm ? (
                  <FormItem
                    label={{ text: t("HTTTOAN", "Payment method") }}
                    render={() => (
                      <EInvoicePaymentMethodLookup
                        value={formData.HTTTOAN}
                        onChange={handlePaymentMethodChange}
                        readOnly={isReadOnly}
                        placeholder={t("PAYMENT_METHOD_SELECT", "Select payment method")}
                        popupTitle={t("PAYMENT_METHOD_SELECT", "Select payment method")}
                        buttonHint={t("PAYMENT_METHOD_LOOKUP", "Open payment method list")}
                      />
                    )}
                  />
                ) : null}
              </GroupItem>
            </GroupItem>
          </Form>
        </div>
      </section>
    </>
  )
}

export default memo(EInvoiceHeaderSection, (prev, next) => headerVmUnchanged(prev.vm, next.vm))
