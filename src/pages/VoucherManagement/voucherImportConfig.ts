import type { ExcelImportConfig } from "@/types/modal"
import type { ChitLedger, ChitType } from "@/types/voucher"

type ExcelModuleConfigItem = {
  fallback: string
  key: string
  moduleCd: string
}

const excelModuleConfig: Record<ChitLedger, Partial<Record<ChitType, ExcelModuleConfigItem>>> = {
  AP: {
    PM: {
      key: "PAYMENT_VOUCHER",
      fallback: "Payment Voucher",
      moduleCd: "PaymentVoucherAp",
    },
    DN: {
      key: "DEBIT_NOTE",
      fallback: "Debit Note",
      moduleCd: "DebitNoteAp",
    },
    PO: {
      key: "PURCHASE_VOUCHER",
      fallback: "Purchase Voucher",
      moduleCd: "PurchaseVoucherAp",
    },
    PS: {
      key: "PURCHASE_SERVICE_VOUCHER",
      fallback: "Purchase Service Voucher",
      moduleCd: "PurchaseServiceVoucherAp",
    },
    CO: {
      key: "OFFSET_VOUCHER",
      fallback: "Offset Voucher",
      moduleCd: "OffsetVoucherAp",
    },
    OT: {
      key: "OTHER_VOUCHER",
      fallback: "Other Voucher",
      moduleCd: "OtherVoucherAp",
    },
  },
  AR: {
    RC: {
      key: "RECEIPT_VOUCHER",
      fallback: "Receipt Voucher",
      moduleCd: "ReceiptVoucherAr",
    },
    CN: {
      key: "CREDIT_NOTE",
      fallback: "Credit Note",
      moduleCd: "CreditNoteAr",
    },
    SO: {
      key: "SALES_VOUCHER",
      fallback: "Sales Voucher",
      moduleCd: "SalesVoucherAr",
    },
    CO: {
      key: "OFFSET_VOUCHER",
      fallback: "Offset Voucher",
      moduleCd: "OffsetVoucherAr",
    },
    OT: {
      key: "OTHER_VOUCHER",
      fallback: "Other Voucher",
      moduleCd: "OtherVoucherAr",
    },
  },
}

export function createVoucherImportConfig(
  ledger: ChitLedger,
  chitType: ChitType,
  translate: (key: string, fallback: string) => string,
): ExcelImportConfig | null {
  const config = excelModuleConfig[ledger][chitType]

  if (!config) {
    return null
  }

  const fileLabel = translate(config.key, config.fallback)
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase()

  return {
    templateName: `${fileLabel}_template.xlsx`,
    moduleCd: config.moduleCd,
  }
}

export default createVoucherImportConfig
