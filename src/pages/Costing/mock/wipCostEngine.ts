/**
 * Engine tính chi phí dở dang — bám CONG_THUC_TINH_DO_DANG.md / frmCalculateProductProcess.
 *
 * Phương pháp chuẩn:
 * - PERCENT_COMPLETED: CLOSING = (BEFORE_154 + 621) × (100 − %) / 100
 * - CLOSING_WIP_QUANTITY: CLOSING = (BEFORE_154 + 621) / (Q + Qdd) × Qdd
 *
 * Chế độ đặc biệt (config, không hardcode company trong UI):
 * - incomplete_cost_SL_TP_SX
 * - incomplete_ValueChange_Calculated_ID2720
 */

import type { WipMethod } from "../types/productionCostingTypes";

/** Chế độ tính dở dang nâng cao (mục 7 tài liệu). */
export type IncompleteCostMode =
  | "STANDARD"
  | "incomplete_cost_SL_TP_SX"
  | "incomplete_ValueChange_Calculated_ID2720";

/**
 * Cấu hình hệ số / chế độ — mô hình hóa 0.8 / 0.7 / 0.5 bằng config,
 * không gắn companyCd vào component giao diện.
 */
export type IncompleteCostConfig = {
  mode: IncompleteCostMode;
  /** INCOMPLETE_Percent (p): 0.8 mặc định; preset mẫu có thể 0.7 / 0.5. */
  incompletePercent: number;
  /** Chữ số làm tròn khi tách 621/62N. */
  specialRoundDigit: number;
  /** Round CLOSING chuẩn theo IS_ROUND_INVENTORY. */
  isRoundInventory: boolean;
  /** Cho phép PRODUCT_REDUCE (SL TP SX). */
  enableProductReduce: boolean;
  /** ckbShowAll: Qdd=0 và Q≤0 → giữ CLOSING cũ. */
  showAllWhenQtyZero: boolean;
};

export const DEFAULT_INCOMPLETE_CONFIG: IncompleteCostConfig = {
  mode: "STANDARD",
  incompletePercent: 0.8,
  specialRoundDigit: 0,
  isRoundInventory: true,
  enableProductReduce: false,
  showAllWhenQtyZero: false,
};

/** Preset demo — user chủ động chọn; không auto theo COMPANY_CD. */
export const INCOMPLETE_CONFIG_PRESETS: Record<string, IncompleteCostConfig> = {
  standard: { ...DEFAULT_INCOMPLETE_CONFIG },
  sl_tp_sx_p08: {
    mode: "incomplete_cost_SL_TP_SX",
    incompletePercent: 0.8,
    specialRoundDigit: 0,
    isRoundInventory: true,
    enableProductReduce: true,
    showAllWhenQtyZero: false,
  },
  sl_tp_sx_p07: {
    mode: "incomplete_cost_SL_TP_SX",
    incompletePercent: 0.7,
    specialRoundDigit: 0,
    isRoundInventory: true,
    enableProductReduce: true,
    showAllWhenQtyZero: false,
  },
  id2720_p05: {
    mode: "incomplete_ValueChange_Calculated_ID2720",
    incompletePercent: 0.5,
    specialRoundDigit: 0,
    isRoundInventory: true,
    enableProductReduce: false,
    showAllWhenQtyZero: false,
  },
};

export function roundDigit(value: number, digit: number): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** Math.max(0, digit);
  return Math.round(value * f) / f;
}

/** Input một dòng thành phẩm trước khi tính. */
export type WipCalcInput = {
  productId: number;
  productCd: string;
  productName: string;
  departmentId: number;
  departmentCd: string;
  /** INCOMPLETE_QUANTITY_154 — SL dở dang đầu kỳ. */
  incompleteQtyOpening: number;
  /** 154 ĐK từ 621. */
  beforeAmountResult621: number;
  /** 154 ĐK từ 6212/622/627. */
  beforeAmountResult62N: number;
  /** Chi phí kỳ — nguồn (không gồm bút toán kết chuyển trùng). */
  amount621: number;
  amount6212: number;
  amount622: number;
  amount627: number;
  /** Phát sinh thẳng vào 154 (user nhập; cộng 1 lần vào TOTAL_AMOUNT_INCURRED). */
  amount154Direct: number;
  /** SL TP hoàn thành / nhập kho. */
  quantity: number;
  percentCompleted: number;
  closingIncompleteQty: number;
  /** Khi user điền tay CLOSING (phương pháp %) — null = tự tính. */
  closingAmountOverride: number | null;
  productReduce: number;
  /** Giá trị CLOSING trước đó (ShowAll). */
  previousClosing154: number;
};

export type WipCalcResult = {
  beforeAmount154: number;
  totalAmountIncurred: number;
  percentCompleted: number;
  closingIncompleteQty: number;
  amountResult621: number;
  amountResult62N: number;
  closingIncompleteAmount154: number;
  productReduce: number;
  totalCostPrice: number;
  unitCost: number;
  /** Q_ht — chỉ có ý nghĩa ở chế độ đặc biệt. */
  qHt: number;
  errors: string[];
};

function before154(input: WipCalcInput): number {
  return roundDigit(input.beforeAmountResult621 + input.beforeAmountResult62N, 0);
}

function totalIncurred(input: WipCalcInput, config: IncompleteCostConfig): number {
  const base =
    config.mode === "STANDARD"
      ? input.amount621 + input.amount6212 + input.amount622 + input.amount627
      : roundDigit(input.amount621 + input.amount6212 + input.amount622 + input.amount627, 0);
  // AMOUNT_154 phát sinh thẳng — cộng đúng 1 lần, không cộng bút toán kết chuyển Bước 3.
  return roundDigit(base + input.amount154Direct, 0);
}

/** CLOSING chuẩn theo % hoàn thành. */
export function calcClosingByPercent(
  beforeAmount154: number,
  amount621: number,
  percentCompleted: number,
  isRoundInventory: boolean,
): number {
  const raw = (beforeAmount154 + amount621) * ((100 - percentCompleted) / 100);
  return isRoundInventory ? roundDigit(raw, 0) : raw;
}

/** CLOSING chuẩn theo SL dở dang. */
export function calcClosingByQuantity(
  beforeAmount154: number,
  amount621: number,
  quantity: number,
  closingQty: number,
  opts: { showAllWhenQtyZero: boolean; previousClosing154: number; isRoundInventory: boolean },
): { closing: number; error?: string } {
  if (closingQty < 0) return { closing: 0, error: "Số lượng dở dang cuối kỳ không được âm." };
  if (closingQty > 0) {
    const denom = quantity + closingQty;
    if (denom === 0) return { closing: 0, error: "Tổng số lượng (Q + Qdd) = 0 — không chia được." };
    const raw = ((beforeAmount154 + amount621) / denom) * closingQty;
    return { closing: opts.isRoundInventory ? roundDigit(raw, 0) : raw };
  }
  // Qdd = 0
  if (opts.showAllWhenQtyZero && quantity <= 0) {
    return { closing: opts.previousClosing154 };
  }
  return { closing: 0 };
}

/** Tính ngược % từ CLOSING điền tay. */
export function reversePercentFromClosing(
  closing154: number,
  beforeAmount154: number,
  amount621: number,
): { percent: number; error?: string } {
  const base = beforeAmount154 + amount621;
  if (base === 0) {
    return { percent: 0, error: "ĐK 154 + 621 = 0 — không tính ngược % hoàn thành." };
  }
  const percent = 100 - (closing154 / base) * 100;
  if (!Number.isFinite(percent)) return { percent: 0, error: "Không tính được % hoàn thành." };
  return { percent: roundDigit(percent, 2) };
}

function calcSpecialSlTpSx(input: WipCalcInput, config: IncompleteCostConfig): {
  amountResult621: number;
  amountResult62N: number;
  qHt: number;
} {
  const p = config.incompletePercent;
  const d = config.specialRoundDigit;
  const Q = input.quantity;
  const Qdd = input.closingIncompleteQty;
  const Qdk = input.incompleteQtyOpening;
  const hasDk = Qdk > 0;
  const hasCk = Qdd > 0;

  if (!hasDk && !hasCk) {
    return { amountResult621: 0, amountResult62N: 0, qHt: Q };
  }

  if (hasDk && hasCk) {
    const qHt = Q + Qdk - Qdd;
    const denom621 = qHt + Qdd;
    const amountResult621 =
      denom621 === 0
        ? 0
        : roundDigit(((input.beforeAmountResult621 + input.amount621) / denom621) * Qdd, d);
    const denom62N = qHt + Qdd * p;
    const amountResult62N =
      denom62N === 0
        ? 0
        : roundDigit(
            ((input.beforeAmountResult62N + input.amount6212 + input.amount622 + input.amount627) /
              denom62N) *
              Qdd *
              p,
            d,
          );
    return { amountResult621, amountResult62N, qHt };
  }

  // Không ĐK, có CK
  const qHt = Q - Qdd;
  const amountResult621 = Q === 0 ? 0 : roundDigit((input.amount621 / Q) * Qdd, d);
  const denom62N = qHt + p * Qdd;
  const amountResult62N =
    denom62N === 0
      ? 0
      : roundDigit(
          ((before154(input) + input.amount6212 + input.amount622 + input.amount627) / denom62N) *
            Qdd *
            p,
          d,
        );
  return { amountResult621, amountResult62N, qHt };
}

function calcSpecialId2720(input: WipCalcInput, config: IncompleteCostConfig): {
  amountResult621: number;
  amountResult62N: number;
  qHt: number;
} {
  const p = config.incompletePercent; // thường 0.5
  const d = config.specialRoundDigit;
  const Q = input.quantity;
  const Qdd = input.closingIncompleteQty;
  const denom621 = Q + Qdd;
  const amountResult621 =
    denom621 === 0
      ? 0
      : roundDigit(((input.beforeAmountResult621 + input.amount621) / denom621) * Qdd, d);
  const denom62N = Q + Qdd * p;
  const amountResult62N =
    denom62N === 0
      ? 0
      : roundDigit(
          ((input.beforeAmountResult62N + input.amount6212 + input.amount622 + input.amount627) /
            denom62N) *
            Qdd *
            p,
          d,
        );
  return { amountResult621, amountResult62N, qHt: Q };
}

/**
 * Tính một dòng dở dang / giá thành theo phương pháp + config.
 */
export function calculateWipRow(
  input: WipCalcInput,
  method: WipMethod,
  config: IncompleteCostConfig = DEFAULT_INCOMPLETE_CONFIG,
): WipCalcResult {
  const errors: string[] = [];
  let percentCompleted = input.percentCompleted;
  let closingIncompleteQty = input.closingIncompleteQty;
  const b154 = before154(input);
  const incurred = totalIncurred(input, config);

  if (method === "PERCENT_COMPLETED") {
    if (percentCompleted < 0 || percentCompleted > 100) {
      errors.push(`% hoàn thành ${input.productCd} phải trong [0, 100].`);
      percentCompleted = 0;
    }
  } else if (method === "CLOSING_WIP_QUANTITY") {
    if (closingIncompleteQty < 0) {
      errors.push(`SL dở dang cuối kỳ ${input.productCd} không được âm.`);
    }
  }

  let amountResult621 = 0;
  let amountResult62N = 0;
  let closing = 0;
  let qHt = input.quantity;
  let productReduce = config.enableProductReduce ? input.productReduce : 0;

  if (config.mode === "incomplete_cost_SL_TP_SX") {
    // Chế độ đặc biệt yêu cầu tiêu thức SL
    const special = calcSpecialSlTpSx(
      { ...input, closingIncompleteQty: Math.max(0, closingIncompleteQty) },
      config,
    );
    amountResult621 = special.amountResult621;
    amountResult62N = special.amountResult62N;
    closing = roundDigit(amountResult621 + amountResult62N, 0);
    qHt = special.qHt;
  } else if (config.mode === "incomplete_ValueChange_Calculated_ID2720") {
    const special = calcSpecialId2720(
      { ...input, closingIncompleteQty: Math.max(0, closingIncompleteQty) },
      config,
    );
    amountResult621 = special.amountResult621;
    amountResult62N = special.amountResult62N;
    closing = roundDigit(amountResult621 + amountResult62N, 0);
    qHt = special.qHt;
  } else if (method === "PERCENT_COMPLETED") {
    if (input.closingAmountOverride != null && Number.isFinite(input.closingAmountOverride)) {
      closing = config.isRoundInventory
        ? roundDigit(input.closingAmountOverride, 0)
        : input.closingAmountOverride;
      const rev = reversePercentFromClosing(closing, b154, input.amount621);
      if (rev.error) errors.push(rev.error);
      else percentCompleted = rev.percent;
      if (percentCompleted < 0 || percentCompleted > 100) {
        errors.push(`% hoàn thành suy ra ngoài [0, 100] cho ${input.productCd}.`);
      }
    } else {
      closing = calcClosingByPercent(b154, input.amount621, percentCompleted, config.isRoundInventory);
    }
    // Chuẩn: không tách 621/62N — gán toàn bộ vào 621 phần cho hiển thị
    amountResult621 = closing;
    amountResult62N = 0;
  } else {
    const qtyRes = calcClosingByQuantity(b154, input.amount621, input.quantity, closingIncompleteQty, {
      showAllWhenQtyZero: config.showAllWhenQtyZero,
      previousClosing154: input.previousClosing154,
      isRoundInventory: config.isRoundInventory,
    });
    if (qtyRes.error) errors.push(qtyRes.error);
    closing = qtyRes.closing;
    amountResult621 = closing;
    amountResult62N = 0;
  }

  if (closing < 0) errors.push(`Dở dang cuối kỳ ${input.productCd} âm.`);
  const maxCost = b154 + incurred;
  if (closing > maxCost + 0.0001) {
    errors.push(`Dở dang cuối kỳ ${input.productCd} lớn hơn tổng chi phí hợp lệ.`);
  }

  let totalCostPrice: number;
  if (config.mode === "incomplete_ValueChange_Calculated_ID2720") {
    totalCostPrice = roundDigit(
      input.beforeAmountResult621 + input.beforeAmountResult62N + incurred - closing,
      0,
    );
  } else if (config.mode === "incomplete_cost_SL_TP_SX") {
    totalCostPrice = roundDigit(b154 + incurred - closing - productReduce, 0);
  } else {
    totalCostPrice = roundDigit(b154 + incurred - closing, 0);
  }

  if (totalCostPrice < 0) {
    errors.push(`Tổng giá thành ${input.productCd} âm — dữ liệu không hợp lệ.`);
  }

  const divisor =
    config.mode === "incomplete_cost_SL_TP_SX" || config.mode === "incomplete_ValueChange_Calculated_ID2720"
      ? qHt
      : input.quantity;

  let unitCost = 0;
  if (divisor > 0) {
    unitCost = totalCostPrice / divisor;
  } else if (totalCostPrice !== 0) {
    errors.push(`SL hoàn thành ${input.productCd} = 0 — không chia đơn giá.`);
  }

  return {
    beforeAmount154: b154,
    totalAmountIncurred: incurred,
    percentCompleted,
    closingIncompleteQty,
    amountResult621,
    amountResult62N,
    closingIncompleteAmount154: closing,
    productReduce,
    totalCostPrice,
    unitCost,
    qHt,
    errors,
  };
}

/** Hai công thức tương đương khi % = Q/(Q+Qdd)*100. */
export function verifyEquivalenceExample(): { ok: boolean; detail: string } {
  const base = {
    productId: 1,
    productCd: "SP-A",
    productName: "A",
    departmentId: 1,
    departmentCd: "D1",
    incompleteQtyOpening: 0,
    beforeAmountResult621: 2_000_000,
    beforeAmountResult62N: 0,
    amount621: 8_000_000,
    amount6212: 0,
    amount622: 2_000_000,
    amount627: 2_000_000,
    amount154Direct: 0,
    quantity: 80,
    percentCompleted: 80,
    closingIncompleteQty: 20,
    closingAmountOverride: null,
    productReduce: 0,
    previousClosing154: 0,
  };
  const byPct = calculateWipRow(base, "PERCENT_COMPLETED");
  const byQty = calculateWipRow(base, "CLOSING_WIP_QUANTITY");
  const ok =
    byPct.closingIncompleteAmount154 === 2_000_000 &&
    byQty.closingIncompleteAmount154 === 2_000_000 &&
    byPct.totalCostPrice === 12_000_000 &&
    byQty.totalCostPrice === 12_000_000;
  return {
    ok,
    detail: `pct closing=${byPct.closingIncompleteAmount154} total=${byPct.totalCostPrice}; qty closing=${byQty.closingIncompleteAmount154} total=${byQty.totalCostPrice}`,
  };
}

export function verifyDocPercentExample(): { ok: boolean; detail: string } {
  const r = calculateWipRow(
    {
      productId: 1,
      productCd: "SP-A",
      productName: "A",
      departmentId: 1,
      departmentCd: "D1",
      incompleteQtyOpening: 0,
      beforeAmountResult621: 2_000_000,
      beforeAmountResult62N: 0,
      amount621: 8_000_000,
      amount6212: 0,
      amount622: 2_000_000,
      amount627: 2_000_000,
      amount154Direct: 0,
      quantity: 100,
      percentCompleted: 80,
      closingIncompleteQty: 0,
      closingAmountOverride: null,
      productReduce: 0,
      previousClosing154: 0,
    },
    "PERCENT_COMPLETED",
  );
  const ok = r.closingIncompleteAmount154 === 2_000_000 && r.totalCostPrice === 12_000_000;
  return { ok, detail: `closing=${r.closingIncompleteAmount154} total=${r.totalCostPrice}` };
}

export function verifyDocQtyExample(): { ok: boolean; detail: string } {
  const r = calculateWipRow(
    {
      productId: 1,
      productCd: "SP-A",
      productName: "A",
      departmentId: 1,
      departmentCd: "D1",
      incompleteQtyOpening: 0,
      beforeAmountResult621: 2_000_000,
      beforeAmountResult62N: 0,
      amount621: 8_000_000,
      amount6212: 0,
      amount622: 2_000_000,
      amount627: 2_000_000,
      amount154Direct: 0,
      quantity: 80,
      percentCompleted: 0,
      closingIncompleteQty: 20,
      closingAmountOverride: null,
      productReduce: 0,
      previousClosing154: 0,
    },
    "CLOSING_WIP_QUANTITY",
  );
  const ok = r.closingIncompleteAmount154 === 2_000_000 && r.totalCostPrice === 12_000_000;
  return { ok, detail: `closing=${r.closingIncompleteAmount154} total=${r.totalCostPrice}` };
}

export function verifyReversePercent(): { ok: boolean; detail: string } {
  const rev = reversePercentFromClosing(2_000_000, 2_000_000, 8_000_000);
  const ok = Math.abs(rev.percent - 80) < 0.01;
  return { ok, detail: `percent=${rev.percent}` };
}

export function verifyNoDoubleCount154(): { ok: boolean; detail: string } {
  const without = calculateWipRow(
    {
      productId: 1,
      productCd: "X",
      productName: "X",
      departmentId: 1,
      departmentCd: "D1",
      incompleteQtyOpening: 0,
      beforeAmountResult621: 0,
      beforeAmountResult62N: 0,
      amount621: 5_000_000,
      amount6212: 0,
      amount622: 3_000_000,
      amount627: 2_000_000,
      amount154Direct: 0,
      quantity: 100,
      percentCompleted: 100,
      closingIncompleteQty: 0,
      closingAmountOverride: null,
      productReduce: 0,
      previousClosing154: 0,
    },
    "PERCENT_COMPLETED",
  );
  const withDirect = calculateWipRow(
    {
      productId: 1,
      productCd: "X",
      productName: "X",
      departmentId: 1,
      departmentCd: "D1",
      incompleteQtyOpening: 0,
      beforeAmountResult621: 0,
      beforeAmountResult62N: 0,
      amount621: 5_000_000,
      amount6212: 0,
      amount622: 3_000_000,
      amount627: 2_000_000,
      amount154Direct: 1_000_000,
      quantity: 100,
      percentCompleted: 100,
      closingIncompleteQty: 0,
      closingAmountOverride: null,
      productReduce: 0,
      previousClosing154: 0,
    },
    "PERCENT_COMPLETED",
  );
  // Không cộng trùng: incurred = 10M + 1M direct = 11M, không phải 10M + transfer
  const ok =
    without.totalAmountIncurred === 10_000_000 &&
    withDirect.totalAmountIncurred === 11_000_000 &&
    withDirect.totalCostPrice === 11_000_000;
  return {
    ok,
    detail: `without=${without.totalAmountIncurred}; withDirect=${withDirect.totalAmountIncurred}`,
  };
}
