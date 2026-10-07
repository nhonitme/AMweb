import type { ExcelImportConfig } from "@/types/modal"
import type { ChitType, InventoryInputType } from "@/types/voucher"

type ExcelModuleConfigItem = {
  fallback: string
  key: string
  moduleCd: string
}

const apChitExcelModuleConfig: Partial<Record<ChitType, ExcelModuleConfigItem>> = {
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
  PD: {
    key: "PURCHASE_DISCOUNT",
    fallback: "Purchase Discount",
    moduleCd: "PurchaseDiscountVoucherAp",
  },
  PR: {
    key: "PURCHASE_RETURN",
    fallback: "Purchase Return",
    moduleCd: "PurchaseReturnVoucherAp",
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
  IR: {
    key: "INVENTORY_RECEIPT_VOUCHER",
    fallback: "Inventory Receipt Voucher",
    moduleCd: "InventoryReceiptVoucherAp",
  },
}

const arChitExcelModuleConfig: Partial<Record<ChitType, ExcelModuleConfigItem>> = {
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
  SD: {
    key: "SALES_DISCOUNT",
    fallback: "Sales Discount",
    moduleCd: "SalesDiscountVoucherAr",
  },
  SR: {
    key: "SALES_RETURN",
    fallback: "Sales Return",
    moduleCd: "SalesReturnVoucherAr",
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
  IO: {
    key: "INVENTORY_ISSUE_VOUCHER",
    fallback: "Inventory Issue Voucher",
    moduleCd: "InventoryIssueVoucherAr",
  },
}

const invExcelModuleConfig: Partial<Record<ChitType, ExcelModuleConfigItem>> = {
  IA: {
    key: "INVENTORY_ADJUSTMENT_VOUCHER",
    fallback: "Inventory Adjustment Voucher",
    moduleCd: "InventoryAdjustVoucherInv",
  },
}

const excelModuleConfig: Record<InventoryInputType, Partial<Record<ChitType, ExcelModuleConfigItem>>> = {
  AP: apChitExcelModuleConfig,
  AR: arChitExcelModuleConfig,
  INV: invExcelModuleConfig,
}

export function createVoucherImportConfig(
  ledger: InventoryInputType,
  chitType: ChitType,
  translate: (key: string, fallback: string) => string,
): ExcelImportConfig | null {
  const config = excelModuleConfig[ledger]?.[chitType]

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
