import { previewSysCodeSequenceContext, previewSysCodeSequences } from "@/api/sysCodeSequenceApi"
import type { ChitType } from "@/types/voucher"

const voucherSequenceObjectTypeMap: Record<ChitType, string> = {
  RC: "RC",
  PM: "PM",
  DN: "DN",
  CN: "CN",
  PO: "PO",
  IR: "IR",
  IA: "IA",
  PS: "PS",
  PD: "PD",
  PR: "PR",
  SO: "SO",
  SD: "SD",
  SR: "SR",
  IO: "IO",
  CO: "CO",
  OT: "OT",
}

const voucherSequenceAliasMap: Record<string, ChitType> = {
  RECEIPT: "RC",
  RECEIPT_VOUCHER: "RC",
  PAYMENT: "PM",
  PAYMENT_VOUCHER: "PM",
  DEBIT_NOTE: "DN",
  DEBIT_NOTE_VOUCHER: "DN",
  CREDIT_NOTE: "CN",
  CREDIT_NOTE_VOUCHER: "CN",
  PURCHASE: "PO",
  PURCHASE_GOODS: "PO",
  PURCHASE_VOUCHER: "PO",
  PURCHASE_SERVICE: "PS",
  PURCHASE_SERVICE_VOUCHER: "PS",
  PURCHASE_DISCOUNT: "PD",
  PURCHASE_DISCOUNT_VOUCHER: "PD",
  PURCHASE_RETURN: "PR",
  PURCHASE_RETURN_VOUCHER: "PR",
  SALE: "SO",
  SALES: "SO",
  SALES_VOUCHER: "SO",
  SALES_DISCOUNT: "SD",
  SALES_DISCOUNT_VOUCHER: "SD",
  SALES_RETURN: "SR",
  SALES_RETURN_VOUCHER: "SR",
  OFFSET: "CO",
  OFFSET_VOUCHER: "CO",
  OTHER: "OT",
  OTHER_VOUCHER: "OT",
  INVENTORY_RECEIPT: "IR",
  INVENTORY_RECEIPT_VOUCHER: "IR",
  INVENTORY_ISSUE: "IO",
  INVENTORY_ISSUE_VOUCHER: "IO",
  INVENTORY_ADJUST: "IA",
  INVENTORY_ADJUSTMENT: "IA",
  INVENTORY_ADJUSTMENT_VOUCHER: "IA",
  TRANSFER: "IA",
  INVENTORY_TRANSFER: "IA",
  INVENTORY_TRANSFER_VOUCHER: "IA",
}

export async function getSequencePreviewCode(
  menuCode: string,
  codeField: string,
  baseDate?: string | number | Date | null,
): Promise<string> {
  const preview = await previewSysCodeSequenceContext(menuCode, codeField, baseDate)
  return preview?.NEXT_CD?.trim() ?? ""
}

export function getVoucherSequenceObjectType(chitType: ChitType | string | null | undefined): string {
  const normalized = typeof chitType === "string" ? chitType.trim().toUpperCase() : ""
  if (!normalized) {
    return ""
  }

  const aliasedChitType = voucherSequenceAliasMap[normalized]
  if (aliasedChitType) {
    return voucherSequenceObjectTypeMap[aliasedChitType]
  }

  return normalized
}

export async function getVoucherSequencePreviewCode(
  chitType: ChitType | string | null | undefined,
  baseDate?: string | number | Date | null,
): Promise<string> {
  const objectType = getVoucherSequenceObjectType(chitType)
  if (!objectType) {
    return ""
  }

  const preview = (await previewSysCodeSequences([objectType], baseDate))[0] ?? null
  return preview?.NEXT_CD?.trim() ?? ""
}

export async function getVoucherSequencePreviewCodes(
  chitTypes: Array<ChitType | string | null | undefined>,
  baseDate?: string | number | Date | null,
): Promise<Record<string, string>> {
  const objectTypes = Array.from(
    new Set(chitTypes.map(getVoucherSequenceObjectType).filter((item) => item.length > 0)),
  )
  const previews = await previewSysCodeSequences(objectTypes, baseDate)

  return previews.reduce<Record<string, string>>((result, preview) => {
    result[preview.OBJECT_TYPE.trim().toUpperCase()] = preview.NEXT_CD?.trim() ?? ""
    return result
  }, {})
}

export async function assignSequencePreviewCode<TRecord extends Record<string, unknown>>(
  record: TRecord,
  menuCode: string,
  fieldName: keyof TRecord,
  baseDate?: string | number | Date | null,
): Promise<string> {
  const currentValue = record[fieldName]
  if (typeof currentValue === "string" && currentValue.trim()) {
    return currentValue.trim()
  }

  const nextCode = await getSequencePreviewCode(menuCode, String(fieldName), baseDate)
  if (nextCode) {
    record[fieldName] = nextCode as TRecord[keyof TRecord]
  }

  return nextCode
}

export function getSequenceSubmitCode(value: unknown): string {
  const normalizedValue = typeof value === "string" ? value.trim() : ""
  return normalizedValue
}
