import type { InventoryValuationMethodCode } from "@/types/inventoryValuation";

export type InventoryValuationMethodOption = {
  MethodCode: InventoryValuationMethodCode;
  MethodName: string;
};

export const INVENTORY_VALUATION_METHOD_CODES: readonly InventoryValuationMethodCode[] = [
  "PERIOD_END_AVG",
  "MOVING_AVG",
  "FIFO",
  "SPECIFIC",
];

export const INVENTORY_VALUATION_METHOD_MESSAGE_KEYS: Record<InventoryValuationMethodCode, string> = {
  PERIOD_END_AVG: "INV_VAL_METHOD_PERIOD_END_AVG",
  MOVING_AVG: "INV_VAL_METHOD_MOVING_AVG",
  FIFO: "INV_VAL_METHOD_FIFO",
  SPECIFIC: "INV_VAL_METHOD_SPECIFIC",
};

export const INVENTORY_VALUATION_METHOD_FALLBACKS: Record<InventoryValuationMethodCode, string> = {
  PERIOD_END_AVG: "Bình quân cuối kỳ",
  MOVING_AVG: "Bình quân tức thời",
  FIFO: "Nhập trước xuất trước",
  SPECIFIC: "Giá đích danh",
};

export function getInventoryValuationMethodLabel(
  methodCode: InventoryValuationMethodCode,
  translate?: (key: string, fallback: string) => string,
): string {
  const messageKey = INVENTORY_VALUATION_METHOD_MESSAGE_KEYS[methodCode];
  const fallback = INVENTORY_VALUATION_METHOD_FALLBACKS[methodCode] ?? methodCode;
  return translate ? translate(messageKey, fallback) : fallback;
}

export function buildInventoryValuationMethodOptions(
  translate: (key: string, fallback: string) => string,
): InventoryValuationMethodOption[] {
  return INVENTORY_VALUATION_METHOD_CODES.map((methodCode) => ({
    MethodCode: methodCode,
    MethodName: getInventoryValuationMethodLabel(methodCode, translate),
  }));
}

export function buildInventoryValuationYmd(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}
