/**
 * Bộ nhớ trạng thái G-K DEMO MODE (FE-01→FE-04).
 * FE-04: Mở lại → Tính lại → Ghi đè kết quả mới — không xóa dữ liệu về 0 khi mở lại.
 * Không ghi database / PeriodLock thật.
 */

import type {
  AllocateType,
  AllocationMethod,
  AllocationPoolRow,
  AllocationProductDetailRow,
  AllocationResultRow,
  CostAggregateRow,
  CostingCompareRow,
  CostingJobProgressState,
  CostingLogItem,
  CostingReopenInfo,
  CostingStepHistoryItem,
  CostingStepIndex,
  CostingStepMeta,
  CostingStepRunStatus,
  CostingWarning,
  CostObjectCandidate,
  CostSourceRow,
  IncompleteCostConfigView,
  PeriodMonthStatus,
  ProductionCostingOverview,
  ProfitLossCondition,
  ReceiptUpdateRow,
  SharedLockStepStatus,
  ValuationSaleRow,
  ValuationStatus,
  WipDetailRow,
  WipMethod,
} from "../types/productionCostingTypes";
import { COSTING_STEPS } from "../types/productionCostingTypes";
import {
  createDefaultAllocationPool,
  createDefaultAllocationProducts,
  MOCK_FA_PREPAID_ROWS,
  MOCK_ORPHAN_PRODUCT,
  MOCK_PRODUCTS,
  MOCK_SHARED_LABOR_622,
  MOCK_SHARED_OVERHEAD_627,
  type MockProductItem,
} from "./productionCostingMockData";
import {
  recalculatePoolFromReduction,
  refreshPoolDerivedFields,
  runAllocation,
  sumPoolByPrefix,
} from "./allocationEngine";
import {
  calculateWipRow,
  DEFAULT_INCOMPLETE_CONFIG,
  INCOMPLETE_CONFIG_PRESETS,
  roundDigit,
  type IncompleteCostConfig,
  type WipCalcInput,
} from "./wipCostEngine";

/** Input chỉnh sửa dở dang theo từng TP (giữ khi REOPENED). */
type WipRowState = {
  productId: number;
  percentCompleted: number;
  closingIncompleteQty: number;
  closingAmountOverride: number | null;
  amount154Direct: number;
  productReduce: number;
  beforeAmountResult621: number;
  beforeAmountResult62N: number;
  incompleteQtyOpening: number;
  previousClosing154: number;
};

const DEMO_USER = "Demo User";

/** Snapshot kết quả đã ghi nhận chính thức (giữ khi REOPENED). */
type PostedSnapshot = {
  allocationRateA01: number;
  allocateType: AllocateType;
  allocationPool: AllocationPoolRow[];
  allocationProducts: AllocationProductDetailRow[];
  wipRows: WipRowState[];
  wipMethod: WipMethod;
  incompletePresetKey: string;
  unitCosts: Record<string, number>;
  finishedCosts: Record<string, number>;
  periodCosts: Record<string, number>;
  amount622: Record<string, number>;
  amount627: Record<string, number>;
  cogsByProduct: Record<string, number>;
  voucherByStep: Record<number, string[]>;
};

type MockPeriodState = {
  companyCd: string;
  periodYm: string;
  activeStep: CostingStepIndex;
  stepStatuses: CostingStepRunStatus[];
  stepMetas: Array<CostingStepMeta | null>;
  /** @deprecated — không còn dùng tỷ lệ thủ công. */
  allocationRateA01: number;
  allocateType: AllocateType;
  is622_627_byDepartment: boolean;
  is6212: boolean;
  allocationNumberDigit: number;
  allocationPool: AllocationPoolRow[];
  /** Sản phẩm + tiêu thức; allocatedByAccount cập nhật sau preview/confirm. */
  allocationProducts: AllocationProductDetailRow[];
  allocationPreviewed: boolean;
  step3Checked: boolean;
  costPreviewed: boolean;
  step6Checked: boolean;
  wipRows: WipRowState[];
  selectedDepartmentIds: number[];
  allocationMethod: AllocationMethod;
  wipMethod: WipMethod;
  incompletePresetKey: string;
  incompleteConfig: IncompleteCostConfig;
  logs: CostingLogItem[];
  job: CostingJobProgressState;
  history: CostingStepHistoryItem[];
  compareRows: CostingCompareRow[];
  posted: PostedSnapshot | null;
  armWriteFailure: boolean;
  runCounters: number[];
};

function createDefaultWipRows(): WipRowState[] {
  const desiredClosings = [15_000_000, 12_000_000];
  return MOCK_PRODUCTS.map((p, i) => {
    const desired = desiredClosings[i] ?? 0;
    const b154 = p.beforeAmountResult621 + p.beforeAmountResult62N;
    const base = b154 + p.material621;
    const pct = base > 0 ? roundDigit(100 - (desired / base) * 100, 2) : 100;
    const ratio = (100 - pct) / 100;
    const qdd =
      ratio <= 0 || ratio >= 1
        ? 0
        : roundDigit((ratio * p.finishedQty) / (1 - ratio), 0);
    return {
      productId: p.productId,
      percentCompleted: pct,
      closingIncompleteQty: qdd,
      closingAmountOverride: null,
      amount154Direct: 0,
      productReduce: 0,
      beforeAmountResult621: p.beforeAmountResult621,
      beforeAmountResult62N: p.beforeAmountResult62N,
      incompleteQtyOpening: p.incompleteQtyOpening,
      previousClosing154: desired,
    };
  });
}

const listeners = new Set<() => void>();
let state: MockPeriodState = createInitialState("0001", "202610");

function emptyStatuses(): CostingStepRunStatus[] {
  return ["NOT_STARTED", "NOT_STARTED", "NOT_STARTED", "NOT_STARTED", "NOT_STARTED", "NOT_STARTED"];
}

function createInitialState(companyCd: string, periodYm: string): MockPeriodState {
  const is6212 = false;
  const pool = refreshPoolDerivedFields(createDefaultAllocationPool(is6212), companyCd);
  return {
    companyCd,
    periodYm,
    activeStep: 0,
    stepStatuses: emptyStatuses(),
    stepMetas: [null, null, null, null, null, null],
    allocationRateA01: 0,
    allocateType: 0,
    is622_627_byDepartment: false,
    is6212,
    allocationNumberDigit: 0,
    allocationPool: pool,
    allocationProducts: createDefaultAllocationProducts(),
    allocationPreviewed: false,
    step3Checked: false,
    costPreviewed: false,
    step6Checked: false,
    wipRows: createDefaultWipRows(),
    selectedDepartmentIds: MOCK_PRODUCTS.map((p) => p.departmentId),
    allocationMethod: "MAIN_MATERIAL",
    wipMethod: "PERCENT_COMPLETED",
    incompletePresetKey: "standard",
    incompleteConfig: { ...DEFAULT_INCOMPLETE_CONFIG },
    logs: [
      {
        at: nowTime(),
        message:
          "Đã mở G-K DEMO. Bước 2: frmAllocateCosts. Bước 4: dở dang theo % / SL (CONG_THUC_TINH_DO_DANG).",
      },
    ],
    job: { running: false, percent: 0, message: "" },
    history: [],
    compareRows: [],
    posted: null,
    armWriteFailure: false,
    runCounters: [0, 0, 0, 0, 0, 0],
  };
}

/** Chạy engine phân bổ trên pool/sản phẩm hiện tại. */
function computeAllocationProducts(
  pool = state.allocationPool,
  products = state.allocationProducts,
): AllocationProductDetailRow[] {
  return runAllocation(pool, products, {
    allocateType: state.allocateType,
    byDepartment: state.is622_627_byDepartment,
    numberDigit: state.is622_627_byDepartment ? 2 : state.allocationNumberDigit,
    companyCd: state.companyCd,
  });
}

function nowTime(): string {
  return new Date().toLocaleTimeString("vi-VN");
}

function nowStamp(): string {
  return new Date().toLocaleString("vi-VN");
}

function emit(): void {
  listeners.forEach((fn) => fn());
}

export function subscribeProductionCostingMock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProductionCostingMockSnapshot(): MockPeriodState {
  return state;
}

function addLog(message: string): void {
  state = {
    ...state,
    logs: [{ at: nowTime(), message }, ...state.logs].slice(0, 120),
  };
}

function isDone(i: number): boolean {
  return state.stepStatuses[i] === "DONE";
}

function isReopened(i: number): boolean {
  return state.stepStatuses[i] === "REOPENED";
}

function isActiveOrDone(i: number): boolean {
  return isDone(i) || isReopened(i);
}

/** doneFlags tương thích FE cũ. */
function doneFlags(): boolean[] {
  return state.stepStatuses.map((s) => s === "DONE");
}

/**
 * Khi chỉnh dữ liệu trên bước đang REOPENED: không xóa kết quả đã post của bước sau.
 * Chỉ xóa cờ preview của các bước sau nếu chúng chưa DONE.
 */
function invalidatePreviewsFrom(fromDoneIndex: number): void {
  state = {
    ...state,
    step3Checked: fromDoneIndex <= 2 ? false : state.step3Checked,
    costPreviewed: fromDoneIndex <= 3 ? false : state.costPreviewed,
    step6Checked: fromDoneIndex <= 5 ? false : state.step6Checked,
    allocationPreviewed: fromDoneIndex <= 1 ? false : state.allocationPreviewed,
    compareRows: [],
  };
}

/**
 * Kết quả phân bổ dạng cũ (tương thích).
 * Hiển thị số đã tính khi preview/DONE/REOPENED; chưa preview thì 0.
 */
function buildAllocationRows(): AllocationResultRow[] {
  const show = state.allocationPreviewed || isDone(1) || (isReopened(1) && state.allocationPreviewed);
  const details = show ? state.allocationProducts : state.allocationProducts;
  const totalBasis = details.reduce(
    (s, r) => s + (state.allocateType === 0 ? r.amountQuantity : r.quantity),
    0,
  );
  return details.map((row) => {
    const basis = state.allocateType === 0 ? row.amountQuantity : row.quantity;
    const ratePercent = totalBasis > 0 ? Math.round((basis / totalBasis) * 1000) / 10 : 0;
    const alloc622 = show ? row.amount622 : 0;
    const alloc627 = show ? row.amount627 : 0;
    return {
      departmentId: row.departmentId,
      productCd: row.productCd,
      productName: row.productName,
      ratePercent,
      direct622: 0,
      direct627: 0,
      alloc622,
      alloc627,
      adjustment: 0,
      total: alloc622 + alloc627,
    };
  });
}

/** Lấy 622/627 từ Bước 2 (posted/DONE/preview) — không cộng bút toán kết chuyển Bước 3. */
function resolveAllocated622627(productCd: string): { amount622: number; amount627: number } {
  const postedMap622 = state.posted?.amount622 ?? {};
  const postedMap627 = state.posted?.amount627 ?? {};
  const liveRow = state.allocationProducts.find((d) => d.productCd === productCd);
  if (isDone(1) && liveRow) return { amount622: liveRow.amount622, amount627: liveRow.amount627 };
  if (postedMap622[productCd] != null) {
    return { amount622: postedMap622[productCd], amount627: postedMap627[productCd] ?? 0 };
  }
  if (state.allocationPreviewed && liveRow) {
    return { amount622: liveRow.amount622, amount627: liveRow.amount627 };
  }
  return { amount622: 0, amount627: 0 };
}

function buildWipCalcInput(item: MockProductItem, wip: WipRowState): WipCalcInput {
  const { amount622, amount627 } = resolveAllocated622627(item.productCd);
  return {
    productId: item.productId,
    productCd: item.productCd,
    productName: item.productName,
    departmentId: item.departmentId,
    departmentCd: item.departmentCd,
    incompleteQtyOpening: wip.incompleteQtyOpening,
    beforeAmountResult621: wip.beforeAmountResult621,
    beforeAmountResult62N: wip.beforeAmountResult62N,
    amount621: item.material621,
    amount6212: item.amount6212Period,
    amount622,
    amount627,
    amount154Direct: wip.amount154Direct,
    quantity: item.finishedQty,
    percentCompleted: wip.percentCompleted,
    closingIncompleteQty: wip.closingIncompleteQty,
    closingAmountOverride: wip.closingAmountOverride,
    productReduce: wip.productReduce,
    previousClosing154: wip.previousClosing154,
  };
}

function buildWipDetailRows(): WipDetailRow[] {
  return MOCK_PRODUCTS.map((item, index) => {
    const wip = state.wipRows[index] ?? createDefaultWipRows()[index];
    const input = buildWipCalcInput(item, wip);
    const calc = calculateWipRow(input, state.wipMethod, state.incompleteConfig);
    return {
      productId: item.productId,
      productCd: item.productCd,
      productName: item.productName,
      departmentId: item.departmentId,
      departmentCd: item.departmentCd,
      incompleteQtyOpening: wip.incompleteQtyOpening,
      beforeAmountResult621: wip.beforeAmountResult621,
      beforeAmountResult62N: wip.beforeAmountResult62N,
      beforeAmount154: calc.beforeAmount154,
      amount621: item.material621,
      amount6212: item.amount6212Period,
      amount622: input.amount622,
      amount627: input.amount627,
      amount154Direct: wip.amount154Direct,
      totalAmountIncurred: calc.totalAmountIncurred,
      quantity: item.finishedQty,
      percentCompleted: calc.percentCompleted,
      closingIncompleteQty: calc.closingIncompleteQty,
      amountResult621: calc.amountResult621,
      amountResult62N: calc.amountResult62N,
      closingIncompleteAmount154: calc.closingIncompleteAmount154,
      productReduce: calc.productReduce,
      totalCostPrice: calc.totalCostPrice,
      unitCost: calc.unitCost,
      qHt: calc.qHt,
      errors: calc.errors,
    };
  });
}

/**
 * Tập hợp chi phí bước 3/4 — nguồn 621/622/627 từ Bước 2; dở dang theo engine Bước 4.
 * Không cộng trùng giá trị đã kết chuyển ở Bước 3.
 */
function buildAggregateRows(): CostAggregateRow[] {
  const details = buildWipDetailRows();
  return details.map((d) => ({
    departmentId: d.departmentId,
    productId: d.productId,
    productCd: d.productCd,
    productName: d.productName,
    amount621: d.amount621,
    amount6212: d.amount6212,
    amount622: d.amount622,
    amount627: d.amount627,
    amount154Direct: d.amount154Direct,
    periodCost: d.totalAmountIncurred,
    openingWip: d.beforeAmount154,
    closingWip: d.closingIncompleteAmount154,
    finishedQty: d.quantity,
    finishedCost: d.totalCostPrice,
    unitCost: d.unitCost,
  }));
}

function buildReceiptRows(aggregates: CostAggregateRow[]): ReceiptUpdateRow[] {
  const byProduct = new Map(aggregates.map((r) => [r.productCd, r]));
  const rows: ReceiptUpdateRow[] = [];
  const posted = state.posted;
  const step4Done = isDone(3);
  const step4Reopened = isReopened(3);

  for (const item of MOCK_PRODUCTS) {
    const agg = byProduct.get(item.productCd);
    const postedUnit = posted?.unitCosts[item.productCd] ?? 0;
    // Giữ đơn giá đã post khi REOPENED; chỉ hiện đơn giá mới khi đã tính thử / DONE.
    let displayUnit = 0;
    if (step4Done && agg) displayUnit = agg.unitCost;
    else if (step4Reopened && state.costPreviewed && agg) displayUnit = agg.unitCost;
    else if ((step4Reopened || step4Done) && postedUnit) displayUnit = postedUnit;
    else if (state.costPreviewed && agg) displayUnit = agg.unitCost;

    for (const receipt of item.receipts) {
      const oldAmount = postedUnit * receipt.qty;
      const newAmount = displayUnit * receipt.qty;
      rows.push({
        inputId: receipt.inputId,
        inventoryNo: receipt.inventoryNo,
        receiptDate: receipt.receiptDate,
        productCd: item.productCd,
        qty: receipt.qty,
        oldUnitPrice: postedUnit,
        oldAmount,
        newUnitPrice: displayUnit,
        newAmount,
        deltaAmount: newAmount - oldAmount,
        posted: step4Done || (Boolean(postedUnit) && !step4Reopened),
        finishedCost: agg?.finishedCost ?? 0,
        finishedQty: item.finishedQty,
      });
    }
  }
  return rows;
}

function incompleteConfigView(): IncompleteCostConfigView {
  return {
    mode: state.incompleteConfig.mode,
    incompletePercent: state.incompleteConfig.incompletePercent,
    enableProductReduce: state.incompleteConfig.enableProductReduce,
    presetKey: state.incompletePresetKey,
  };
}

function calcAvgCogs(item: MockProductItem, periodInUnit: number): number {
  const openingValue = item.openingQty * item.openingUnitCost;
  const periodInValue = item.finishedQty * periodInUnit;
  const totalQty = item.openingQty + item.finishedQty;
  const avgUnit = totalQty > 0 ? (openingValue + periodInValue) / totalQty : 0;
  return item.soldQty * avgUnit;
}

function buildValuationRows(aggregates: CostAggregateRow[]): ValuationSaleRow[] {
  const byProduct = new Map(aggregates.map((r) => [r.productCd, r]));
  const posted = state.posted;
  return MOCK_PRODUCTS.map((item) => {
    const agg = byProduct.get(item.productCd);
    // Đơn giá nhập dùng giá đã post nếu bước 4 chưa DONE lại (REOPENED và chưa confirm).
    const periodInUnit =
      isDone(3) && agg
        ? agg.unitCost
        : posted?.unitCosts[item.productCd] ?? (isDone(3) || state.costPreviewed ? agg?.unitCost ?? 0 : 0);
    const proposed = calcAvgCogs(item, periodInUnit);
    const naive = item.soldQty * periodInUnit;
    const postedCogs = posted?.cogsByProduct[item.productCd] ?? 0;

    return {
      saleNo: item.saleNo,
      productCd: item.productCd,
      productName: item.productName,
      openingQty: item.openingQty,
      openingUnitCost: item.openingUnitCost,
      periodInQty: item.finishedQty,
      periodInUnitCost: periodInUnit,
      soldQty: item.soldQty,
      currentCogs: isDone(4) ? proposed : postedCogs,
      proposedCogs: isDone(3) || Boolean(posted?.unitCosts[item.productCd]) ? proposed : 0,
      method: "Bình quân gia quyền (mock)",
      status: isDone(4)
        ? "RECONCILED"
        : item.soldQty === 0
          ? "NO_MOVEMENTS"
          : `Chênh lệch so với nhân đơn giá kỳ: ${Math.round(naive - proposed).toLocaleString("vi-VN")}`,
    };
  });
}

function buildSourceRows(): CostSourceRow[] {
  const shared: CostSourceRow[] = [
    {
      chitDetailId: 9001,
      accountCd: "622",
      voucherNo: "PC-1026-088",
      voucherDate: "05/10/2026",
      departmentId: 0,
      departmentCd: "(Dùng chung)",
      amount: MOCK_SHARED_LABOR_622,
      isDirect: false,
    },
    {
      chitDetailId: 9002,
      accountCd: "627",
      voucherNo: "PC-1026-089",
      voucherDate: "06/10/2026",
      departmentId: 0,
      departmentCd: "(Dùng chung)",
      amount: MOCK_SHARED_OVERHEAD_627,
      isDirect: false,
    },
  ];
  const direct: CostSourceRow[] = MOCK_PRODUCTS.flatMap((item, idx) => [
    {
      chitDetailId: 9100 + idx * 2,
      accountCd: "622",
      voucherNo: `PC-D-${item.productCd}`,
      voucherDate: "10/10/2026",
      departmentId: item.departmentId,
      departmentCd: item.departmentCd,
      amount: item.directLabor622,
      isDirect: true,
    },
    {
      chitDetailId: 9101 + idx * 2,
      accountCd: "627",
      voucherNo: `PC-O-${item.productCd}`,
      voucherDate: "10/10/2026",
      departmentId: item.departmentId,
      departmentCd: item.departmentCd,
      amount: item.directOverhead627,
      isDirect: true,
    },
  ]);
  return [...direct, ...shared];
}

function buildObjects(): CostObjectCandidate[] {
  const selected = new Set(state.selectedDepartmentIds);
  const rows: CostObjectCandidate[] = MOCK_PRODUCTS.map((item) => ({
    departmentId: item.departmentId,
    departmentCd: item.departmentCd,
    departmentName: item.departmentName,
    productId: item.productId,
    productCd: item.productCd,
    productName: item.productName,
    finishedQty: item.finishedQty,
    receiptCount: item.receipts.length,
    hasWarning: false,
    warningText: "",
    selected: selected.has(item.departmentId),
  }));
  rows.push({
    departmentId: 0,
    departmentCd: "(Thiếu)",
    departmentName: "—",
    productId: MOCK_ORPHAN_PRODUCT.productId,
    productCd: MOCK_ORPHAN_PRODUCT.productCd,
    productName: MOCK_ORPHAN_PRODUCT.productName,
    finishedQty: 0,
    receiptCount: 0,
    hasWarning: true,
    warningText: "Sản phẩm nhóm 155 chưa gắn DEPARTMENT_ID",
    selected: false,
  });
  return rows;
}

function buildWarnings(objects: CostObjectCandidate[]): CostingWarning[] {
  const warnings: CostingWarning[] = [];
  for (const obj of objects) {
    if (obj.hasWarning) {
      warnings.push({
        id: `warn-${obj.productId}`,
        level: "error",
        message: obj.warningText,
        productId: obj.productId ?? undefined,
      });
    }
  }
  if (!isDone(0) && !isReopened(0)) {
    warnings.push({
      id: "info-step1",
      level: "info",
      message: "Chưa khóa TSCĐ/CPTT (bước 1). Có thể chạy kiểm tra đầu vào trước.",
    });
  }
  const reopened = state.stepStatuses
    .map((s, i) => (s === "REOPENED" ? i + 1 : 0))
    .filter(Boolean);
  if (reopened.length) {
    warnings.push({
      id: "warn-reopened",
      level: "warn",
      message: `Đang mở lại bước: ${reopened.join(", ")}. Cần tính lại và xác nhận ghi đè trước khi khóa bước 6.`,
    });
  }
  return warnings;
}

function monthStatus(): PeriodMonthStatus {
  if (isDone(5)) return "LOCKED";
  if (isDone(0) || isDone(2) || isReopened(0) || isReopened(2)) return "PARTIAL";
  return "OPEN";
}

function valuationStatus(): ValuationStatus {
  if (isDone(4)) return "RECONCILED";
  if (!isDone(3) && !state.posted?.unitCosts) return "NOT_CHECKED";
  const hasSale = MOCK_PRODUCTS.some((p) => p.soldQty > 0);
  return hasSale ? "CALCULATED" : "NO_MOVEMENTS";
}

function lockStatus(doneIndex: number): SharedLockStepStatus {
  if (state.stepStatuses[doneIndex] === "PROCESSING") return "PROCESSING";
  if (state.stepStatuses[doneIndex] === "ERROR") return "ERROR";
  return isDone(doneIndex) ? "DONE" : "OPEN";
}

function buildProfitLossConditions(): ProfitLossCondition[] {
  const anyReopened = state.stepStatuses.some((s) => s === "REOPENED" || s === "PROCESSING" || s === "ERROR");
  return [
    { id: "c1", label: "B-I bước 1 (FA_PREPAID_LOCK) đã DONE", ok: isDone(0) },
    { id: "c2", label: "G-K đã phân bổ 622/627", ok: isDone(1) },
    { id: "c3", label: "B-I bước 2 (COGS_SUMMARY) đã DONE — G-K thực hiện", ok: isDone(2) },
    { id: "c4", label: "G-K đã ghi nhận giá thành 155/154", ok: isDone(3) },
    { id: "c5", label: "Giá vốn thành phẩm đã đối chiếu", ok: isDone(4) },
    { id: "c6", label: "Không còn bước REOPENED / PROCESSING / ERROR", ok: !anyReopened },
    { id: "c7", label: "Có quyền khóa sổ bước 3 (giả lập)", ok: true },
  ];
}

function pushHistory(item: Omit<CostingStepHistoryItem, "id" | "runNo"> & { stepIndex: 1 | 2 | 3 | 4 | 5 | 6 }): void {
  const idx = item.stepIndex - 1;
  const runNo = (state.runCounters[idx] ?? 0) + (item.action === "EXECUTE" || item.action === "CONFIRM" ? 1 : 0);
  const counters = [...state.runCounters];
  if (item.action === "EXECUTE" || item.action === "CONFIRM") counters[idx] = runNo;
  const full: CostingStepHistoryItem = {
    id: `H-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    runNo: counters[idx] || 1,
    ...item,
  };
  state = {
    ...state,
    runCounters: counters,
    history: [full, ...state.history].slice(0, 200),
  };
}

function markStepDone(doneIndex: number, vouchers: string[], summaryBefore: string, summaryAfter: string): void {
  const statuses = [...state.stepStatuses] as CostingStepRunStatus[];
  statuses[doneIndex] = "DONE";
  const metas = [...state.stepMetas];
  const prev = metas[doneIndex];
  const runId = `RUN-${state.companyCd}-${state.periodYm}-S${doneIndex + 1}-${Date.now()}`;
  metas[doneIndex] = {
    completedBy: DEMO_USER,
    completedAt: nowStamp(),
    reopenBy: prev?.reopenBy ?? "",
    reopenAt: prev?.reopenAt ?? "",
    reopenReason: prev?.reopenReason ?? "",
    runId,
    voucherRefs: vouchers,
  };
  state = { ...state, stepStatuses: statuses, stepMetas: metas, compareRows: [] };
  pushHistory({
    stepIndex: (doneIndex + 1) as 1 | 2 | 3 | 4 | 5 | 6,
    action: "CONFIRM",
    status: "DONE",
    resultBefore: summaryBefore,
    resultAfter: summaryAfter,
    difference: summaryBefore === summaryAfter ? "0" : "Đã ghi đè",
    userName: DEMO_USER,
    at: nowStamp(),
    reason: prev?.reopenReason ? `Ghi đè sau mở lại: ${prev.reopenReason}` : "Xác nhận hoàn thành",
    runId,
    voucherRefs: vouchers.join(", "),
  });
}

function capturePostedFromCurrent(): PostedSnapshot {
  const aggregates = buildAggregateRows();
  const unitCosts: Record<string, number> = {};
  const finishedCosts: Record<string, number> = {};
  const periodCosts: Record<string, number> = {};
  const amount622: Record<string, number> = {};
  const amount627: Record<string, number> = {};
  for (const row of aggregates) {
    unitCosts[row.productCd] = row.unitCost;
    finishedCosts[row.productCd] = row.finishedCost;
    periodCosts[row.productCd] = row.periodCost;
    amount622[row.productCd] = row.amount622;
    amount627[row.productCd] = row.amount627;
  }
  // Ưu tiên số phân bổ từ allocationProducts khi đã tính.
  for (const p of state.allocationProducts) {
    if (state.allocationPreviewed || isDone(1)) {
      amount622[p.productCd] = p.amount622;
      amount627[p.productCd] = p.amount627;
    }
  }
  const cogsByProduct: Record<string, number> = {};
  for (const item of MOCK_PRODUCTS) {
    cogsByProduct[item.productCd] = calcAvgCogs(item, unitCosts[item.productCd] ?? 0);
  }
  const voucherByStep: Record<number, string[]> = {
    1: state.posted?.voucherByStep[1] ?? ["FA-DEMO-001"],
    2: state.posted?.voucherByStep[2] ?? ["ALLOC-DEMO-001"],
    3: state.posted?.voucherByStep[3] ?? ["XFER-154-DEMO-001"],
    4: state.posted?.voucherByStep[4] ?? MOCK_PRODUCTS.flatMap((p) => p.receipts.map((r) => r.inventoryNo)),
    5: state.posted?.voucherByStep[5] ?? MOCK_PRODUCTS.map((p) => p.saleNo),
    6: state.posted?.voucherByStep[6] ?? ["PL-DEMO-001"],
  };
  return {
    allocationRateA01: state.allocationRateA01,
    allocateType: state.allocateType,
    allocationPool: state.allocationPool.map((r) => ({ ...r })),
    allocationProducts: state.allocationProducts.map((r) => ({
      ...r,
      allocatedByAccount: { ...r.allocatedByAccount },
    })),
    wipRows: state.wipRows.map((r) => ({ ...r })),
    wipMethod: state.wipMethod,
    incompletePresetKey: state.incompletePresetKey,
    unitCosts,
    finishedCosts,
    periodCosts,
    amount622,
    amount627,
    cogsByProduct,
    voucherByStep,
  };
}

function buildCompareForStep(stepIndex1Based: number): CostingCompareRow[] {
  const posted = state.posted;
  if (!posted) return [];
  const aggregates = buildAggregateRows();

  if (stepIndex1Based === 2) {
    const old622 = Object.values(posted.amount622).reduce((a, b) => a + b, 0);
    const old627 = Object.values(posted.amount627).reduce((a, b) => a + b, 0);
    const neu = computeAllocationProducts();
    const neu622 = neu.reduce((a, r) => a + r.amount622, 0);
    const neu627 = neu.reduce((a, r) => a + r.amount627, 0);
    const rows: CostingCompareRow[] = [
      {
        id: "c622",
        indicator: "Tổng phân bổ 622*",
        oldValue: old622,
        newValue: neu622,
        delta: neu622 - old622,
      },
      {
        id: "c627",
        indicator: "Tổng phân bổ 627*",
        oldValue: old627,
        newValue: neu627,
        delta: neu627 - old627,
      },
      {
        id: "ctype",
        indicator: "allocate_type (0=NVL, 1=TPNK)",
        oldValue: posted.allocateType,
        newValue: state.allocateType,
        delta: state.allocateType - posted.allocateType,
      },
    ];
    for (const p of neu) {
      const oldA = posted.amount622[p.productCd] ?? 0;
      rows.push({
        id: `p622-${p.productCd}`,
        indicator: `${p.productCd} — PB 622`,
        oldValue: oldA,
        newValue: p.amount622,
        delta: p.amount622 - oldA,
      });
    }
    void aggregates;
    return rows;
  }

  if (stepIndex1Based === 3) {
    const oldPeriod = Object.values(posted.periodCosts).reduce((a, b) => a + b, 0);
    const neuPeriod = aggregates.reduce((a, r) => a + r.periodCost, 0);
    return [
      { id: "p621", indicator: "Chi phí 621", oldValue: aggregates.reduce((a, r) => a + r.amount621, 0), newValue: aggregates.reduce((a, r) => a + r.amount621, 0), delta: 0 },
      {
        id: "p622",
        indicator: "Chi phí 622",
        oldValue: Object.values(posted.amount622).reduce((a, b) => a + b, 0),
        newValue: aggregates.reduce((a, r) => a + r.amount622, 0),
        delta: aggregates.reduce((a, r) => a + r.amount622, 0) - Object.values(posted.amount622).reduce((a, b) => a + b, 0),
      },
      {
        id: "p627",
        indicator: "Chi phí 627",
        oldValue: Object.values(posted.amount627).reduce((a, b) => a + b, 0),
        newValue: aggregates.reduce((a, r) => a + r.amount627, 0),
        delta: aggregates.reduce((a, r) => a + r.amount627, 0) - Object.values(posted.amount627).reduce((a, b) => a + b, 0),
      },
      { id: "ptot", indicator: "Tổng kết chuyển → 154", oldValue: oldPeriod, newValue: neuPeriod, delta: neuPeriod - oldPeriod },
    ];
  }

  if (stepIndex1Based === 4) {
    return aggregates.map((r) => {
      const oldU = posted.unitCosts[r.productCd] ?? 0;
      const oldF = posted.finishedCosts[r.productCd] ?? 0;
      return {
        id: `u-${r.productCd}`,
        indicator: `${r.productCd} — Đơn giá / Giá thành`,
        oldValue: oldU,
        newValue: r.unitCost,
        delta: r.unitCost - oldU,
      };
    }).concat(
      aggregates.map((r) => ({
        id: `f-${r.productCd}`,
        indicator: `${r.productCd} — Tổng giá thành`,
        oldValue: posted.finishedCosts[r.productCd] ?? 0,
        newValue: r.finishedCost,
        delta: r.finishedCost - (posted.finishedCosts[r.productCd] ?? 0),
      })),
    );
  }

  if (stepIndex1Based === 5) {
    return MOCK_PRODUCTS.map((item) => {
      const unit = posted.unitCosts[item.productCd] ?? 0;
      const neu = calcAvgCogs(item, isDone(3) ? (aggregates.find((a) => a.productCd === item.productCd)?.unitCost ?? unit) : unit);
      const oldV = posted.cogsByProduct[item.productCd] ?? 0;
      return {
        id: `v-${item.productCd}`,
        indicator: `${item.productCd} — Giá vốn xuất`,
        oldValue: oldV,
        newValue: neu,
        delta: neu - oldV,
      };
    });
  }

  return [];
}

export function buildOverview(): ProductionCostingOverview {
  const aggregates = buildAggregateRows();
  const objects = buildObjects();
  const warnings = buildWarnings(objects);
  const allocationRows = buildAllocationRows();
  const showAllocation = state.allocationPreviewed || isDone(1) || isReopened(1);

  return {
    companyCd: state.companyCd,
    periodYm: state.periodYm,
    demoMode: true,
    monthStatus: monthStatus(),
    faPrepaidStatus: lockStatus(0),
    allocationStatus: isDone(1)
      ? "CONFIRMED"
      : state.allocationPreviewed
        ? "PREVIEWED"
        : isReopened(1)
          ? "STALE"
          : "NOT_STARTED",
    cogsSummaryStatus: lockStatus(2),
    costRunStatus: isDone(3) ? "POSTED" : state.costPreviewed ? "CALCULATED" : "DRAFT",
    valuationStatus: valuationStatus(),
    profitLossStatus: lockStatus(5),
    activeStep: state.activeStep,
    doneFlags: doneFlags(),
    stepStatuses: [...state.stepStatuses],
    stepMetas: [...state.stepMetas],
    stepHistory: [...state.history],
    compareRows: [...state.compareRows],
    armWriteFailure: state.armWriteFailure,
    stats: {
      objectCount: MOCK_PRODUCTS.length,
      productCount: MOCK_PRODUCTS.length + 1,
      receiptCount: MOCK_PRODUCTS.reduce((n, p) => n + p.receipts.length, 0),
      warningCount: warnings.filter((w) => w.level !== "info").length,
      doneStepCount: state.stepStatuses.filter((s) => s === "DONE").length,
    },
    warnings,
    objects,
    logs: state.logs,
    job: state.job,
    allocationRateA01: state.allocationRateA01,
    allocationPreviewed: state.allocationPreviewed,
    step3Checked: state.step3Checked,
    costPreviewed: state.costPreviewed,
    step6Checked: state.step6Checked,
    hasPostedCosting: Boolean(state.posted?.unitCosts && Object.keys(state.posted.unitCosts).length),
    hasPostedValuation: Boolean(state.posted?.cogsByProduct && Object.values(state.posted.cogsByProduct).some((v) => v > 0) && (isDone(4) || isReopened(4) || Boolean(state.posted))),
    sharedLabor: sumPoolByPrefix(state.allocationPool, "622"),
    sharedOverhead: sumPoolByPrefix(state.allocationPool, "627"),
    faRows: MOCK_FA_PREPAID_ROWS,
    sourceRows: buildSourceRows(),
    allocationRows: showAllocation
      ? allocationRows
      : allocationRows.map((r) => ({ ...r, alloc622: 0, alloc627: 0, total: 0 })),
    allocationPoolRows: state.allocationPool.map((r) => ({ ...r })),
    allocationProductRows: (state.allocationPreviewed || isDone(1)
      ? state.allocationProducts
      : state.allocationProducts
    ).map((r) => ({
      ...r,
      allocatedByAccount: { ...r.allocatedByAccount },
      amount622: state.allocationPreviewed || isDone(1) ? r.amount622 : 0,
      amount627: state.allocationPreviewed || isDone(1) ? r.amount627 : 0,
    })),
    allocateType: state.allocateType,
    is622_627_byDepartment: state.is622_627_byDepartment,
    is6212: state.is6212,
    allocationNumberDigit: state.allocationNumberDigit,
    aggregateRows: aggregates,
    wipDetailRows: buildWipDetailRows(),
    receiptRows: buildReceiptRows(aggregates),
    valuationRows: buildValuationRows(aggregates),
    profitLossConditions: buildProfitLossConditions(),
    wipMethod: state.wipMethod,
    incompleteConfig: incompleteConfigView(),
    allocationMethod: state.allocateType === 0 ? "MAIN_MATERIAL" : "FINISHED_QTY",
  };
}

export function mockSetPeriod(companyCd: string, periodYm: string): ProductionCostingOverview {
  state = createInitialState(companyCd, periodYm);
  addLog(`Chọn kỳ ${periodYm} / công ty ${companyCd} (DEMO). Trạng thái đã đặt lại — không lẫn kỳ cũ.`);
  emit();
  return buildOverview();
}

export function mockResetDemo(): ProductionCostingOverview {
  state = createInitialState(state.companyCd, state.periodYm);
  addLog("Đã đặt lại dữ liệu giả lập.");
  emit();
  return buildOverview();
}

export function mockSetActiveStep(step: CostingStepIndex): ProductionCostingOverview {
  state = { ...state, activeStep: step };
  emit();
  return buildOverview();
}

export function mockToggleObject(departmentId: number, selected: boolean): ProductionCostingOverview {
  if (departmentId <= 0) return buildOverview();
  const set = new Set(state.selectedDepartmentIds);
  if (selected) set.add(departmentId);
  else set.delete(departmentId);
  state = { ...state, selectedDepartmentIds: [...set] };
  emit();
  return buildOverview();
}

/** Guard tiến tới: bước trước phải DONE (không chấp nhận REOPENED). */
export function mockCanRunStep(stepIndex1Based: number): { ok: boolean; message: string } {
  if (stepIndex1Based <= 1) return { ok: true, message: "" };
  const prev = stepIndex1Based - 2;
  if (!isDone(prev)) {
    const st = state.stepStatuses[prev];
    if (st === "REOPENED") {
      return {
        ok: false,
        message: `Bước ${stepIndex1Based - 1} đang REOPENED. Vui lòng tính lại và xác nhận ghi đè trước.`,
      };
    }
    return { ok: false, message: `Vui lòng hoàn thành bước ${stepIndex1Based - 1} trước.` };
  }
  return { ok: true, message: "" };
}

/** Cho phép chạy khi NOT_STARTED hoặc REOPENED; chặn khi DONE/PROCESSING. */
function ensureExecutable(doneIndex: number, label: string): void {
  const st = state.stepStatuses[doneIndex];
  if (st === "DONE") {
    throw new Error(`${label} đang DONE. Hãy mở lại bước trước khi thực hiện lại.`);
  }
  if (st === "PROCESSING") {
    throw new Error(`${label} đang PROCESSING — không chạy trùng.`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withFakeJob(message: string, work: () => void): Promise<ProductionCostingOverview> {
  state = { ...state, job: { running: true, percent: 30, message } };
  emit();
  await delay(220);
  state = { ...state, job: { running: true, percent: 70, message } };
  emit();
  await delay(180);
  work();
  state = { ...state, job: { running: false, percent: 100, message: "Hoàn tất (DEMO)" } };
  emit();
  await delay(80);
  state = { ...state, job: { running: false, percent: 0, message: "" } };
  emit();
  return buildOverview();
}

function assertWriteOrThrow(): void {
  if (state.armWriteFailure) {
    state = { ...state, armWriteFailure: false };
    addLog("Mô phỏng lỗi ghi nhận — không cập nhật một phần (DEMO).");
    throw new Error("Ghi nhận thất bại (mô phỏng DEMO). Dữ liệu cũ được giữ nguyên.");
  }
}

// ——— FE-04: Mở lại bước ———

export function mockGetReopenInfo(stepIndex1Based: 1 | 2 | 3 | 4 | 5 | 6): CostingReopenInfo {
  const def = COSTING_STEPS[stepIndex1Based - 1];
  const idx = stepIndex1Based - 1;
  const status = state.stepStatuses[idx];
  const meta = state.stepMetas[idx];
  const blocking: CostingReopenInfo["blockingDependents"] = [];
  for (let i = idx + 1; i < 6; i += 1) {
    const st = state.stepStatuses[i];
    if (st === "DONE" || st === "PROCESSING") {
      blocking.push({
        stepIndex: i + 1,
        title: COSTING_STEPS[i].titleFallback,
        status: st,
      });
    }
  }
  const canReopen = status === "DONE" && blocking.length === 0;
  let blockReason = "";
  if (status !== "DONE") {
    blockReason = `Bước ${stepIndex1Based} không ở trạng thái DONE (hiện tại: ${status}).`;
  } else if (blocking.length) {
    blockReason = `Không thể mở lại bước ${stepIndex1Based} vì bước ${blocking
      .map((b) => b.stepIndex)
      .join(", ")} đã hoàn thành. Vui lòng mở lại các bước phụ thuộc theo thứ tự ngược.`;
  }

  const related =
    state.posted?.voucherByStep[stepIndex1Based] ??
    meta?.voucherRefs ??
    [`(Chưa có chứng từ mock cho bước ${stepIndex1Based})`];

  return {
    stepIndex: stepIndex1Based,
    stepCode: def.code,
    stepTitle: def.titleFallback,
    companyCd: state.companyCd,
    periodYm: state.periodYm,
    currentStatus: status,
    completedBy: meta?.completedBy ?? "—",
    completedAt: meta?.completedAt ?? "—",
    relatedResults: related,
    blockingDependents: blocking,
    canReopen,
    blockReason,
    warnings: [
      "Mở lại không xóa dữ liệu và không đưa đơn giá về 0.",
      "Kết quả cũ được giữ đến khi xác nhận ghi đè kết quả mới.",
      "Các bước dùng engine B-I sẽ cần hoàn tác thật ở giai đoạn backend.",
    ],
  };
}

export function mockReopenStep(
  stepIndex1Based: 1 | 2 | 3 | 4 | 5 | 6,
  reason: string,
): ProductionCostingOverview {
  const info = mockGetReopenInfo(stepIndex1Based);
  if (!reason.trim()) throw new Error("Vui lòng nhập lý do mở lại.");
  if (!info.canReopen) throw new Error(info.blockReason || "Không thể mở lại bước này.");

  const idx = stepIndex1Based - 1;
  const statuses = [...state.stepStatuses] as CostingStepRunStatus[];
  statuses[idx] = "REOPENED";
  const metas = [...state.stepMetas];
  const prev = metas[idx];
  metas[idx] = {
    completedBy: prev?.completedBy ?? DEMO_USER,
    completedAt: prev?.completedAt ?? nowStamp(),
    reopenBy: DEMO_USER,
    reopenAt: nowStamp(),
    reopenReason: reason.trim(),
    runId: prev?.runId ?? "",
    voucherRefs: prev?.voucherRefs ?? [],
  };

  // Giữ posted snapshot; chỉ reset cờ kiểm tra/preview của chính bước này.
  state = {
    ...state,
    stepStatuses: statuses,
    stepMetas: metas,
    activeStep: stepIndex1Based as CostingStepIndex,
    allocationPreviewed: stepIndex1Based === 2 ? false : state.allocationPreviewed,
    step3Checked: stepIndex1Based === 3 ? false : state.step3Checked,
    costPreviewed: stepIndex1Based === 4 ? false : state.costPreviewed,
    step6Checked: stepIndex1Based === 6 ? false : state.step6Checked,
    compareRows: [],
  };

  pushHistory({
    stepIndex: stepIndex1Based,
    action: "REOPEN",
    status: "REOPENED",
    resultBefore: "DONE",
    resultAfter: "REOPENED (giữ số liệu cũ)",
    difference: "0 (không xóa)",
    userName: DEMO_USER,
    at: nowStamp(),
    reason: reason.trim(),
    runId: prev?.runId ?? "",
    voucherRefs: (prev?.voucherRefs ?? []).join(", "),
  });
  addLog(`Đã mở lại bước ${stepIndex1Based}. Lý do: ${reason.trim()}. Số liệu cũ được giữ.`);
  emit();
  return buildOverview();
}

export function mockSetArmWriteFailure(armed: boolean): ProductionCostingOverview {
  state = { ...state, armWriteFailure: armed };
  emit();
  return buildOverview();
}

export function mockGetStepHistory(stepIndex1Based?: number): CostingStepHistoryItem[] {
  if (!stepIndex1Based) return [...state.history];
  return state.history.filter((h) => h.stepIndex === stepIndex1Based);
}

// ——— Các thao tác bước (hỗ trợ REOPENED + ghi đè) ———

export async function mockRunFaPrepaidLock(): Promise<ProductionCostingOverview> {
  const guard = mockCanRunStep(1);
  if (!guard.ok) throw new Error(guard.message);
  ensureExecutable(0, "Khóa TSCĐ/CPTT");
  const before = state.stepStatuses[0];
  return withFakeJob("Đang gọi engine B-I FA_PREPAID_LOCK (mô phỏng)…", () => {
    assertWriteOrThrow();
    const snap = state.posted ?? capturePostedFromCurrent();
    snap.voucherByStep[1] = ["FA-DEMO-001"];
    state = { ...state, posted: snap };
    markStepDone(0, ["FA-DEMO-001"], before, "DONE");
    state = { ...state, activeStep: 2 };
    addLog("B-I engine: FA_PREPAID_LOCK → DONE (DEMO — không ghi DB).");
  });
}

export function mockPreviewAllocation(): ProductionCostingOverview {
  const guard = mockCanRunStep(2);
  if (!guard.ok) throw new Error(guard.message);
  ensureExecutable(1, "Phân bổ");
  const totalBasis = state.allocationProducts.reduce(
    (s, r) => s + (state.allocateType === 0 ? r.amountQuantity : r.quantity),
    0,
  );
  if (totalBasis === 0) {
    throw new Error("Tổng tiêu thức = 0 — không phân bổ được (ΣT ≠ 0).");
  }
  const computed = computeAllocationProducts();
  const compare = isReopened(1) || state.posted ? buildCompareForStep(2) : [];
  // Gán kết quả tính thử vào state nhưng chưa DONE.
  state = {
    ...state,
    allocationProducts: computed,
    allocationPreviewed: true,
    compareRows: compare,
  };
  const sum622 = computed.reduce((s, r) => s + r.amount622, 0);
  const sum627 = computed.reduce((s, r) => s + r.amount627, 0);
  pushHistory({
    stepIndex: 2,
    action: "PREVIEW",
    status: state.stepStatuses[1],
    resultBefore: state.posted
      ? `type=${state.posted.allocateType}; 622=${Object.values(state.posted.amount622).reduce((a, b) => a + b, 0)}`
      : "—",
    resultAfter: `type=${state.allocateType}; 622=${sum622}; 627=${sum627}`,
    difference: "Chưa ghi đè",
    userName: DEMO_USER,
    at: nowStamp(),
    reason: `Tính thử phân bổ allocate_type=${state.allocateType}`,
    runId: "",
    voucherRefs: "",
  });
  addLog(
    `Tính thử phân bổ type=${state.allocateType} (${state.allocateType === 0 ? "NVL N621/C152" : "SL TP N155/C154"}). 622=${sum622.toLocaleString("vi-VN")}, 627=${sum627.toLocaleString("vi-VN")} — chưa ghi đè.`,
  );
  emit();
  return buildOverview();
}

export function mockConfirmAllocation(): ProductionCostingOverview {
  const guard = mockCanRunStep(2);
  if (!guard.ok) throw new Error(guard.message);
  ensureExecutable(1, "Phân bổ");
  if (!state.allocationPreviewed) throw new Error("Hãy xem trước phân bổ trước khi xác nhận.");
  assertWriteOrThrow();
  const before = state.posted
    ? `type=${state.posted.allocateType}`
    : "Chưa có";
  // Đảm bảo products đã có số phân bổ mới nhất trước khi capture.
  const computed = computeAllocationProducts();
  state = { ...state, allocationProducts: computed };
  const snap = capturePostedFromCurrent();
  snap.voucherByStep[2] = ["ALLOC-DEMO-001"];
  snap.amount622 = Object.fromEntries(computed.map((p) => [p.productCd, p.amount622]));
  snap.amount627 = Object.fromEntries(computed.map((p) => [p.productCd, p.amount627]));
  state = { ...state, posted: snap, allocationPreviewed: false, activeStep: 3 };
  markStepDone(
    1,
    ["ALLOC-DEMO-001"],
    before,
    `type=${state.allocateType}; ghi đè pool+chi tiết TP`,
  );
  addLog(
    "G-K: xác nhận phân bổ 622/627 theo công thức tài liệu — ghi đè kết quả cũ, không cộng dồn (DEMO).",
  );
  emit();
  return buildOverview();
}

/** Đổi phương pháp allocate_type (0=NVL, 1=TPNK). */
export function mockSetAllocateType(allocateType: AllocateType): ProductionCostingOverview {
  if (isDone(1)) throw new Error("Phân bổ đã xác nhận — mở lại bước 2 trước khi đổi phương pháp.");
  state = {
    ...state,
    allocateType,
    allocationMethod: allocateType === 0 ? "MAIN_MATERIAL" : "FINISHED_QTY",
    allocationPreviewed: false,
    compareRows: [],
  };
  invalidatePreviewsFrom(2);
  addLog(`Chọn allocate_type=${allocateType} (${allocateType === 0 ? "NVL chính N621/C152" : "SL TP nhập kho N155/C154"}).`);
  emit();
  return buildOverview();
}

/** @deprecated — giữ API cũ, không còn dùng tỷ lệ thủ công. */
export function mockSetAllocationRate(_rate: number): ProductionCostingOverview {
  throw new Error(
    "Đã chuyển sang công thức frmAllocateCosts. Dùng đổi allocate_type / sửa reduction thay vì tỷ lệ thủ công.",
  );
}

/** Sửa reduction trên một dòng pool → tính lại P_A và (nếu đã preview) tính lại phân bổ. */
export function mockSetPoolReduction(poolRowId: string, reduction: number): ProductionCostingOverview {
  if (isDone(1)) throw new Error("Phân bổ đã xác nhận — mở lại bước 2 trước khi sửa reduction.");
  if (!Number.isFinite(reduction) || reduction < 0) throw new Error("Điều chỉnh giảm không hợp lệ.");
  const pool = state.allocationPool.map((r) =>
    r.id === poolRowId ? { ...r, reduction } : r,
  );
  const refreshed = recalculatePoolFromReduction(pool);
  let products = state.allocationProducts;
  let previewed = false;
  if (state.allocationPreviewed) {
    products = runAllocation(refreshed, state.allocationProducts, {
      allocateType: state.allocateType,
      byDepartment: state.is622_627_byDepartment,
      numberDigit: state.is622_627_byDepartment ? 2 : state.allocationNumberDigit,
      companyCd: state.companyCd,
    });
    previewed = true;
  }
  state = {
    ...state,
    allocationPool: refreshed,
    allocationProducts: products,
    allocationPreviewed: previewed,
    step3Checked: false,
    costPreviewed: false,
    step6Checked: false,
    compareRows: [],
  };
  if (previewed) {
    state = {
      ...state,
      compareRows: isReopened(1) || state.posted ? buildCompareForStep(2) : [],
    };
  }
  addLog(`Sửa reduction dòng ${poolRowId} = ${reduction.toLocaleString("vi-VN")} → tính lại pool/phân bổ.`);
  emit();
  return buildOverview();
}

/** Bật/tắt phân bổ theo DEPARTMENT_CD. */
export function mockSetByDepartment(enabled: boolean): ProductionCostingOverview {
  if (isDone(1)) throw new Error("Phân bổ đã xác nhận — mở lại bước 2 trước.");
  state = {
    ...state,
    is622_627_byDepartment: enabled,
    allocationNumberDigit: enabled ? 2 : 0,
    allocationPreviewed: false,
    compareRows: [],
  };
  invalidatePreviewsFrom(2);
  addLog(`is622_627_byDepartment = ${enabled ? 1 : 0}.`);
  emit();
  return buildOverview();
}

/** Bật/tắt đưa TK 6212 vào pool. */
export function mockSetInclude6212(enabled: boolean): ProductionCostingOverview {
  if (isDone(1)) throw new Error("Phân bổ đã xác nhận — mở lại bước 2 trước.");
  const pool = refreshPoolDerivedFields(createDefaultAllocationPool(enabled), state.companyCd);
  state = {
    ...state,
    is6212: enabled,
    allocationPool: pool,
    allocationPreviewed: false,
    compareRows: [],
  };
  invalidatePreviewsFrom(2);
  addLog(`is6212 = ${enabled ? 1 : 0} — tải lại pool.`);
  emit();
  return buildOverview();
}

export function mockCheckStep3(): ProductionCostingOverview {
  const guard = mockCanRunStep(3);
  if (!guard.ok) throw new Error(guard.message);
  ensureExecutable(2, "Khóa chi phí");
  state = { ...state, step3Checked: true };
  addLog("Kiểm tra điều kiện khóa chi phí sản xuất: hợp lệ (DEMO).");
  emit();
  return buildOverview();
}

export async function mockLockCogsTo154(): Promise<ProductionCostingOverview> {
  const guard = mockCanRunStep(3);
  if (!guard.ok) throw new Error(guard.message);
  ensureExecutable(2, "Khóa chi phí");
  if (!state.step3Checked) throw new Error("Chạy kiểm tra điều kiện trước khi khóa.");
  return withFakeJob("Đang kết chuyển EXP_TO_154_ONLY (mô phỏng)…", () => {
    assertWriteOrThrow();
    // Ghi đè cùng mã chứng từ mock — không tạo trùng.
    const vouchers = ["XFER-154-DEMO-001"];
    const before = state.posted?.voucherByStep[3]?.join(",") ?? "—";
    const snap = capturePostedFromCurrent();
    snap.voucherByStep[3] = vouchers;
    state = { ...state, posted: snap, step3Checked: false, activeStep: 4 };
    markStepDone(2, vouchers, before, vouchers.join(","));
    addLog("G-K: COGS_SUMMARY → DONE, ghi đè chứng từ XFER-154-DEMO-001 (không trùng).");
  });
}

/** @deprecated — chuyển sang mockPatchWipRow (điền tay CLOSING khi phương pháp %). */
export function mockSetClosingWip(productIndex: number, amount: number): ProductionCostingOverview {
  const row = state.wipRows[productIndex];
  if (!row) throw new Error("Không tìm thấy thành phẩm.");
  return mockPatchWipRow(row.productId, { closingIncompleteAmount154: amount });
}

export function mockSetWipMethod(method: WipMethod): ProductionCostingOverview {
  if (isDone(3)) throw new Error("Đã ghi nhận giá thành — mở lại bước 4 trước khi đổi phương pháp dở dang.");
  // Khi đổi phương pháp: bỏ override tay, giữ % và SL đã có.
  const wipRows = state.wipRows.map((r) => ({ ...r, closingAmountOverride: null }));
  state = {
    ...state,
    wipMethod: method,
    wipRows,
    costPreviewed: false,
    compareRows: [],
  };
  invalidatePreviewsFrom(4);
  addLog(
    method === "PERCENT_COMPLETED"
      ? "Chọn phương pháp dở dang: Theo % hoàn thành (NVL chính)."
      : "Chọn phương pháp dở dang: Theo SL dở dang cuối kỳ (NVL chính).",
  );
  emit();
  return buildOverview();
}

/** Chọn preset cấu hình đặc biệt (standard / SL_TP_SX / ID2720) — không gắn COMPANY_CD trên UI. */
export function mockSetIncompletePreset(presetKey: string): ProductionCostingOverview {
  if (isDone(3)) throw new Error("Đã ghi nhận giá thành — mở lại bước 4 trước.");
  const cfg = INCOMPLETE_CONFIG_PRESETS[presetKey];
  if (!cfg) throw new Error(`Preset không hợp lệ: ${presetKey}`);
  state = {
    ...state,
    incompletePresetKey: presetKey,
    incompleteConfig: { ...cfg },
    costPreviewed: false,
    compareRows: [],
  };
  invalidatePreviewsFrom(4);
  addLog(`Cấu hình dở dang preset=${presetKey}, mode=${cfg.mode}, p=${cfg.incompletePercent}.`);
  emit();
  return buildOverview();
}

export type WipPatchFields = {
  percentCompleted?: number;
  closingIncompleteQty?: number;
  closingIncompleteAmount154?: number;
  amount154Direct?: number;
  productReduce?: number;
  beforeAmountResult621?: number;
  beforeAmountResult62N?: number;
  incompleteQtyOpening?: number;
};

/** Sửa một dòng dở dang — tính lại theo phương pháp đang chọn. */
export function mockPatchWipRow(productId: number, patch: WipPatchFields): ProductionCostingOverview {
  if (isDone(3)) throw new Error("Đã ghi nhận giá thành — mở lại bước 4 trước khi sửa dở dang.");
  const idx = state.wipRows.findIndex((r) => r.productId === productId);
  if (idx < 0) throw new Error("Không tìm thấy thành phẩm.");
  const current = state.wipRows[idx];
  const next: WipRowState = { ...current };

  if (patch.percentCompleted != null) {
    if (!Number.isFinite(patch.percentCompleted) || patch.percentCompleted < 0 || patch.percentCompleted > 100) {
      throw new Error("% hoàn thành phải trong khoảng 0–100.");
    }
    next.percentCompleted = patch.percentCompleted;
    next.closingAmountOverride = null;
  }
  if (patch.closingIncompleteQty != null) {
    if (!Number.isFinite(patch.closingIncompleteQty) || patch.closingIncompleteQty < 0) {
      throw new Error("Số lượng dở dang cuối kỳ không hợp lệ (không âm).");
    }
    next.closingIncompleteQty = patch.closingIncompleteQty;
  }
  if (patch.closingIncompleteAmount154 != null) {
    if (!Number.isFinite(patch.closingIncompleteAmount154) || patch.closingIncompleteAmount154 < 0) {
      throw new Error("Dở dang cuối kỳ (giá trị) không hợp lệ.");
    }
    if (state.wipMethod !== "PERCENT_COMPLETED" && state.incompleteConfig.mode === "STANDARD") {
      throw new Error("Điền tay dở dang CK chỉ hỗ trợ khi chọn phương pháp % hoàn thành.");
    }
    next.closingAmountOverride = patch.closingIncompleteAmount154;
    next.previousClosing154 = patch.closingIncompleteAmount154;
  }
  if (patch.amount154Direct != null) {
    if (!Number.isFinite(patch.amount154Direct) || patch.amount154Direct < 0) {
      throw new Error("Giá trị 154 phát sinh thẳng không hợp lệ.");
    }
    next.amount154Direct = patch.amount154Direct;
  }
  if (patch.productReduce != null) {
    if (!state.incompleteConfig.enableProductReduce) {
      throw new Error("PRODUCT_REDUCE chỉ dùng khi bật cấu hình SL TP SX.");
    }
    if (!Number.isFinite(patch.productReduce) || patch.productReduce < 0) {
      throw new Error("Điều chỉnh giảm không hợp lệ.");
    }
    next.productReduce = patch.productReduce;
  }
  if (patch.beforeAmountResult621 != null) next.beforeAmountResult621 = patch.beforeAmountResult621;
  if (patch.beforeAmountResult62N != null) next.beforeAmountResult62N = patch.beforeAmountResult62N;
  if (patch.incompleteQtyOpening != null) next.incompleteQtyOpening = patch.incompleteQtyOpening;

  // Validate ngay bằng engine
  const item = MOCK_PRODUCTS[idx];
  const probe = calculateWipRow(buildWipCalcInput(item, next), state.wipMethod, state.incompleteConfig);
  if (probe.errors.length) {
    // Cho phép lưu % ngoài khoảng đã chặn ở trên; các lỗi khác chặn khi patch closing/qty
    const hard = probe.errors.filter(
      (e) =>
        e.includes("lớn hơn tổng") ||
        e.includes("không được âm") ||
        e.includes("= 0 — không chia") ||
        e.includes("ngoài [0, 100]"),
    );
    if (hard.length && patch.closingIncompleteAmount154 != null) {
      throw new Error(hard[0]);
    }
  }

  // Đồng bộ % suy ra khi điền tay CLOSING
  if (patch.closingIncompleteAmount154 != null && state.wipMethod === "PERCENT_COMPLETED") {
    next.percentCompleted = probe.percentCompleted;
  }

  const wipRows = state.wipRows.map((r, i) => (i === idx ? next : r));
  state = { ...state, wipRows, costPreviewed: false, compareRows: [] };
  invalidatePreviewsFrom(4);
  addLog(`Sửa dở dang ${item.productCd} — tính lại theo ${state.wipMethod}.`);
  emit();
  return buildOverview();
}

export function mockPreviewCosting(): ProductionCostingOverview {
  const guard = mockCanRunStep(4);
  if (!guard.ok) throw new Error(guard.message);
  ensureExecutable(3, "Tính giá thành");
  const details = buildWipDetailRows();
  for (const row of details) {
    if (row.errors.length) throw new Error(row.errors[0]);
    if (row.closingIncompleteAmount154 < 0) {
      throw new Error(`Dở dang cuối kỳ ${row.productCd} không hợp lệ.`);
    }
    if (row.quantity <= 0 && row.totalCostPrice !== 0 && state.incompleteConfig.mode === "STANDARD") {
      throw new Error(`SL hoàn thành ${row.productCd} = 0 — không chia đơn giá.`);
    }
  }
  if (state.selectedDepartmentIds.length === 0) {
    throw new Error("Chưa chọn đối tượng hợp lệ để tính giá thành.");
  }
  if (state.armWriteFailure) {
    state = { ...state, armWriteFailure: false };
    addLog("Tính thử thất bại (mô phỏng) — giữ kết quả cũ, trạng thái REOPENED.");
    emit();
    throw new Error("Tính thử thất bại (mô phỏng DEMO). Kết quả cũ được giữ nguyên.");
  }
  const aggregates = buildAggregateRows();
  const compare = isReopened(3) || state.posted ? buildCompareForStep(4) : [];
  // Cập nhật previousClosing để ShowAll / lần sau
  const wipRows = state.wipRows.map((r, i) => ({
    ...r,
    previousClosing154: details[i]?.closingIncompleteAmount154 ?? r.previousClosing154,
    percentCompleted: details[i]?.percentCompleted ?? r.percentCompleted,
    closingAmountOverride: null,
  }));
  state = { ...state, wipRows, costPreviewed: true, compareRows: compare };
  pushHistory({
    stepIndex: 4,
    action: "PREVIEW",
    status: state.stepStatuses[3],
    resultBefore: state.posted
      ? Object.entries(state.posted.unitCosts)
          .map(([k, v]) => `${k}:${Math.round(v)}`)
          .join("; ")
      : "—",
    resultAfter: aggregates.map((r) => `${r.productCd}:${Math.round(r.unitCost)}`).join("; "),
    difference: "Chưa ghi đè",
    userName: DEMO_USER,
    at: nowStamp(),
    reason: `Tính thử giá thành (${state.wipMethod})`,
    runId: "",
    voucherRefs: "",
  });
  addLog(
    `Tính thử giá thành method=${state.wipMethod} preset=${state.incompletePresetKey} (DEMO — chưa ghi đè).`,
  );
  emit();
  return buildOverview();
}

export async function mockPostCosting(): Promise<ProductionCostingOverview> {
  const guard = mockCanRunStep(4);
  if (!guard.ok) throw new Error(guard.message);
  ensureExecutable(3, "Ghi nhận giá thành");
  if (!state.costPreviewed) throw new Error("Hãy tính thử trước khi xác nhận.");
  return withFakeJob("Đang cập nhật INPUT_ID / 155/154 (mô phỏng ghi đè)…", () => {
    assertWriteOrThrow();
    const before = state.posted
      ? Object.entries(state.posted.unitCosts)
          .map(([k, v]) => `${k}:${Math.round(v)}`)
          .join("; ")
      : "—";
    const snap = capturePostedFromCurrent();
    // Giữ nguyên danh sách phiếu NK — ghi đè đơn giá, không thêm phiếu.
    snap.voucherByStep[4] = MOCK_PRODUCTS.flatMap((p) => p.receipts.map((r) => r.inventoryNo));
    const after = Object.entries(snap.unitCosts)
      .map(([k, v]) => `${k}:${Math.round(v)}`)
      .join("; ");
    state = { ...state, posted: snap, costPreviewed: false, activeStep: 5 };
    markStepDone(3, snap.voucherByStep[4], before, after);
    addLog("G-K: ghi đè giá NK TP theo INPUT_ID (không cộng dồn, không tạo phiếu mới).");
  });
}

export function mockPreviewValuation(): ProductionCostingOverview {
  const guard = mockCanRunStep(5);
  if (!guard.ok) throw new Error(guard.message);
  ensureExecutable(4, "Đối chiếu giá xuất");
  const compare = buildCompareForStep(5);
  state = { ...state, compareRows: compare };
  pushHistory({
    stepIndex: 5,
    action: "PREVIEW",
    status: state.stepStatuses[4],
    resultBefore: "Giá vốn cũ",
    resultAfter: "Giá vốn thử (BQGQ)",
    difference: "Chưa ghi đè",
    userName: DEMO_USER,
    at: nowStamp(),
    reason: "Tính thử giá xuất",
    runId: "",
    voucherRefs: "",
  });
  addLog("Tính thử giá xuất (DEMO — chưa ghi đè 632/155).");
  emit();
  return buildOverview();
}

export async function mockConfirmValuation(): Promise<ProductionCostingOverview> {
  const guard = mockCanRunStep(5);
  if (!guard.ok) throw new Error(guard.message);
  ensureExecutable(4, "Đối chiếu giá xuất");
  return withFakeJob("Đang ghi đè giá xuất theo BQGQ (mô phỏng)…", () => {
    assertWriteOrThrow();
    const before = state.posted
      ? Object.entries(state.posted.cogsByProduct)
          .map(([k, v]) => `${k}:${Math.round(v)}`)
          .join("; ")
      : "—";
    const snap = capturePostedFromCurrent();
    snap.voucherByStep[5] = MOCK_PRODUCTS.map((p) => p.saleNo);
    const after = Object.entries(snap.cogsByProduct)
      .map(([k, v]) => `${k}:${Math.round(v)}`)
      .join("; ");
    state = { ...state, posted: snap, activeStep: 6, compareRows: [] };
    markStepDone(4, snap.voucherByStep[5], before, after);
    addLog("G-K: ghi đè giá vốn 632/155 theo chứng từ C-A cũ (không tạo trùng).");
  });
}

export function mockCheckStep6(): ProductionCostingOverview {
  const guard = mockCanRunStep(6);
  if (!guard.ok) throw new Error(guard.message);
  ensureExecutable(5, "Khóa lãi/lỗ");
  const conditions = buildProfitLossConditions();
  if (conditions.some((c) => !c.ok)) {
    throw new Error("Chưa đủ điều kiện khóa sổ cuối kỳ (có thể còn bước REOPENED).");
  }
  state = { ...state, step6Checked: true };
  addLog("Kiểm tra điều kiện khóa cuối kỳ: hợp lệ (DEMO).");
  emit();
  return buildOverview();
}

export async function mockLockProfitLoss(): Promise<ProductionCostingOverview> {
  const guard = mockCanRunStep(6);
  if (!guard.ok) throw new Error(guard.message);
  ensureExecutable(5, "Khóa lãi/lỗ");
  if (!state.step6Checked) throw new Error("Chạy kiểm tra điều kiện trước khi khóa.");
  if (state.stepStatuses.some((s) => s === "REOPENED" || s === "PROCESSING" || s === "ERROR")) {
    throw new Error("Không cho hoàn thành bước 6 khi còn bước REOPENED / PROCESSING / ERROR.");
  }
  return withFakeJob("Đang gọi engine B-I PROFIT_LOSS_REPORT (mô phỏng)…", () => {
    assertWriteOrThrow();
    const vouchers = ["PL-DEMO-001"];
    const snap = state.posted ?? capturePostedFromCurrent();
    snap.voucherByStep[6] = vouchers;
    state = { ...state, posted: snap, step6Checked: false };
    markStepDone(5, vouchers, "OPEN", "LOCKED (mock)");
    addLog("B-I engine: PROFIT_LOSS_REPORT → DONE. Kỳ LOCKED chỉ trong mock store.");
  });
}

export function getMockProducts(): MockProductItem[] {
  return MOCK_PRODUCTS;
}
