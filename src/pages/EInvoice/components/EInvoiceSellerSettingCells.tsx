import type { ColumnCellTemplateData } from "devextreme/ui/data_grid"
import type { EInvoiceSellerSetting } from "@/types/einvoiceSetting"
import { isEInvoiceHouseholdBusinessTaxCode } from "../einvoiceModel"

type SellerCellInfo = ColumnCellTemplateData<EInvoiceSellerSetting, number>
type TranslateFn = (key: string, fallback: string) => string

function trimText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function SummaryLine({ label, value }: { label: string; value: string | null | undefined }) {
  const text = trimText(value)
  if (!text) {
    return null
  }

  return (
    <div className="break-words">
      <span className="text-slate-500">{label}:</span> {text}
    </div>
  )
}

export function createEInvoiceSellerSettingCellRenderers(t: TranslateFn) {
  const renderSellerSummaryCell = ({ data }: SellerCellInfo) => {
    if (!data) {
      return null
    }

    const sellerName = trimText(data.SELLER_NM)
    const sellerCd = trimText(data.SELLER_CD)
    const taxCode = trimText(data.SELLER_TAX_CD)

    return (
      <div className="space-y-1 py-1 leading-tight">
        <div className="font-medium text-slate-900">{sellerName || "-"}</div>
        <div className="space-y-0.5 text-sm text-slate-700">
          <SummaryLine label={t("SELLER_CD", "Ma nguoi ban")} value={sellerCd || "-"} />
          <SummaryLine label={t("SELLER_TAX_CODE", "Mã số thuế")} value={taxCode || "-"} />
        </div>
      </div>
    )
  }

  const renderSellerAddressContactCell = ({ data }: SellerCellInfo) => {
    if (!data) {
      return null
    }

    const showBusinessLocation = isEInvoiceHouseholdBusinessTaxCode(data.SELLER_TAX_CD)

    return (
      <div className="space-y-0.5 py-1 text-sm leading-tight text-slate-700">
        <SummaryLine label={t("SELLER_ADDRESS", "Dia chi")} value={data.SELLER_ADDRESS} />
        {showBusinessLocation ? (
          <>
            <SummaryLine label={t("MDDKDOANH", "Mã địa điểm kinh doanh")} value={data.MDDKDOANH} />
            <SummaryLine label={t("TDDKDOANH", "Tên địa điểm kinh doanh")} value={data.TDDKDOANH} />
            <SummaryLine label={t("DCDDKDOANH", "Địa chỉ địa điểm kinh doanh")} value={data.DCDDKDOANH} />
          </>
        ) : null}
        <SummaryLine label={t("MCHANG", "Cua hang")} value={data.MCHANG} />
        <SummaryLine label={t("TCHANG", "Ten cua hang")} value={data.TCHANG} />
        <SummaryLine label={t("SDTHOAI", "Dien thoai")} value={data.SDTHOAI} />
        <SummaryLine label={t("DCTDTU", "Email")} value={data.DCTDTU} />
        <SummaryLine label={t("FAX", "Fax")} value={data.FAX} />
        <SummaryLine label={t("WEBSITE", "Website")} value={data.WEBSITE} />
      </div>
    )
  }

  const renderSellerInvoiceSymbolCell = ({ data }: SellerCellInfo) => {
    if (!data) {
      return null
    }

    const templateSymbol = trimText(data.KHMSHDON)
    const invoiceSymbol = trimText(data.KHHDON)
    const invoicePattern = `${templateSymbol}${invoiceSymbol}`
    const fromShdon = trimText(data.FROM_SHDON)
    const toShdon = trimText(data.TO_SHDON)
    const storeCode = trimText(data.MCHANG)
    const storeName = trimText(data.TCHANG)

    return (
      <div className="space-y-0.5 py-1 text-sm leading-tight text-slate-700">
        <SummaryLine label={t("THDON", "Ten HD")} value={data.THDON} />
        {invoicePattern ? (
          <SummaryLine label={t("INVOICE_TEMPLATE_SYMBOL_NO", "Ký hiệu mẫu số hóa đơn")} value={invoicePattern} />
        ) : null}
        {fromShdon || toShdon ? (
          <div className="space-y-0.5">
            <SummaryLine label={t("FROM_SHDON", "Tu so")} value={fromShdon || "1"} />
            <SummaryLine label={t("TO_SHDON", "Den so")} value={toShdon || "-"} />
          </div>
        ) : null}
        <SummaryLine
          label={t("USE_MULTI_TAX_RATE", "Thue suat")}
          value={
            Number(data.USE_MULTI_TAX_RATE ?? 0) === 1
              ? t("USE_MULTI_TAX_RATE_ON", "Chon tren luoi")
              : t("USE_MULTI_TAX_RATE_OFF", "Chon duoi tong")
          }
        />
        {storeCode || storeName ? (
          <div>
            <span className="text-slate-500">{t("MCHANG", "Cua hang")}:</span> {storeCode || "-"}
            {storeName ? ` - ${storeName}` : ""}
          </div>
        ) : null}
      </div>
    )
  }

  const renderSellerBankRepresentativeCell = ({ data }: SellerCellInfo) => {
    if (!data) {
      return null
    }

    return (
      <div className="space-y-0.5 py-1 text-sm leading-tight text-slate-700">
        <SummaryLine label={t("STKNHANG", "TK ngan hang")} value={data.STKNHANG} />
        <SummaryLine label={t("TNHANG", "Ngan hang")} value={data.TNHANG} />
      </div>
    )
  }

  return {
    renderSellerSummaryCell,
    renderSellerAddressContactCell,
    renderSellerInvoiceSymbolCell,
    renderSellerBankRepresentativeCell,
  }
}
