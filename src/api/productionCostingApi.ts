/**
 * Client G-K â€” chá»‰ gá»i /api/production-cost vÃ  PeriodLock.
 * KhÃ´ng giá»¯ sá»‘ liá»‡u káº¿ toÃ¡n máº«u. Tráº¡ng thÃ¡i bÆ°á»›c láº¥y láº¡i tá»« GET sau khi ghi.
 */

import axios from "./axiosClient";
import { getPeriodLockProgress, startPeriodLock } from "./periodLockApi";
import {
  applyObjectSelection,
  assembleOverview,
  buildReopenInfo,
  emptyOverview,
  mapCogsRows,
  mapDetailRows,
  mapPoolRows,
  mapWip,
  mapAggregate,
  mapReceipts,
  num,
  text,
} from "@/pages/Costing/productionCostingMap";
import type {
  AllocateType,
  CostingReopenInfo,
  CostingStepHistoryItem,
  CostingStepIndex,
  ProductionCostingOverview,
  WipMethod,
  WipPatchFields,
} from "@/pages/Costing/types/productionCostingTypes";

const BASE = "/api/production-cost";

type Rec = Record<string, unknown>;

type SessionState = {
  companyCd: string;
  periodYm: string;
  activeStep: CostingStepIndex;
  overview: ProductionCostingOverview | null;
};

const session: SessionState = {
  companyCd: "",
  periodYm: "",
  activeStep: 0,
  overview: null,
};

const pendingOps = new Map<string, string>();
/** Khóa dòng đang ghi lựa chọn — chặn tick trùng cùng DEPARTMENT_ID+PRODUCT_ID. */
const pendingObjectSelection = new Set<string>();

function operationId(key: string): string {
  const existing = pendingOps.get(key);
  if (existing) return existing;
  const raw = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${key}`;
  const id = raw.replace(/-/g, "");
  const value = id.length >= 8 ? id : id.padEnd(8, "0");
  pendingOps.set(key, value);
  return value;
}

function clearOp(key: string) {
  pendingOps.delete(key);
}

function objectSelectionLockKey(departmentId: number, productId: number): string {
  return `${departmentId}:${productId}`;
}

function applySelectionToSession(
  updates: Array<{ departmentId: number; productId: number; selected: boolean }>,
): ProductionCostingOverview {
  const current = session.overview;
  if (!current) {
    throw new Error("Chưa tải overview G-K.");
  }
  const next = applyObjectSelection(current, updates);
  session.overview = next;
  return next;
}

/** Snapshot overview đang giữ trên client (sau các lần patch lựa chọn / reload). */
export function getProductionCostingSessionOverview(): ProductionCostingOverview | null {
  return session.overview;
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "Data" in payload) {
    return (payload as { Data: T }).Data;
  }
  return payload as T;
}

function apiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { Message?: string; message?: string } | undefined;
    return new Error(data?.Message || data?.message || error.message);
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function get<T>(path: string, params: Record<string, unknown>): Promise<T> {
  try {
    const response = await axios.get(`${BASE}${path}`, { params });
    return unwrap<T>(response.data);
  } catch (error) {
    throw apiError(error);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  try {
    const response = await axios.post(`${BASE}${path}`, body);
    return unwrap<T>(response.data);
  } catch (error) {
    throw apiError(error);
  }
}

async function put<T>(path: string, body: unknown): Promise<T> {
  try {
    const response = await axios.put(`${BASE}${path}`, body);
    return unwrap<T>(response.data);
  } catch (error) {
    throw apiError(error);
  }
}

function requireIdentity() {
  const overview = session.overview;
  if (!overview?.runId || !overview.runVersion) {
    throw new Error(overview?.statusMessage || "Ká»³ chÆ°a cÃ³ RUN. HÃ£y khá»Ÿi táº¡o ká»³ trÆ°á»›c khi ghi.");
  }
  return {
    PeriodYm: overview.periodYm,
    RunId: overview.runId,
    RunVersion: overview.runVersion,
  };
}

export async function reloadProductionCosting(): Promise<ProductionCostingOverview> {
  const companyCd = session.companyCd;
  const periodYm = session.periodYm;
  if (!companyCd || !periodYm) {
    throw new Error("ChÆ°a chá»n cÃ´ng ty hoáº·c ká»³.");
  }

  const period = await get<Rec>("/period", { periodYm });
  const run = (period.CurrentRun as Rec | null) ?? null;
  const runId = num(run?.RunId) || undefined;
  const runVersion = num(run?.RunVersion) || undefined;
  const query = { periodYm, runId, runVersion };
  const [stepsRes, objectsRes, poolRes, detailRes, wipRes, receiptRes, historyRes, compareRes] = await Promise.all([
    get<Rec>("/steps", query),
    get<Rec>("/objects", query),
    get<Rec>("/allocation/pool", query),
    get<Rec>("/allocation/detail", query),
    get<Rec>("/wip", query),
    get<Rec>("/receipts", query),
    get<Rec>("/history", query),
    runVersion && runVersion > 1
      ? get<Rec>("/comparison", {
          periodYm,
          baseRunId: runId,
          baseRunVersion: runVersion - 1,
          compareRunId: runId,
          compareRunVersion: runVersion,
        }).catch(() => ({ Lines: [] }))
      : Promise.resolve({ Lines: [] }),
  ]);

  const overview = assembleOverview({
    companyCd,
    periodYm,
    activeStep: session.activeStep,
    period,
    steps: (stepsRes.Steps as Rec[]) ?? [],
    objects: (objectsRes.Items as Rec[]) ?? [],
    sourceReceiptCount: num(objectsRes.SourceReceiptCount),
    prerequisiteValidation: objectsRes.PrerequisiteValidation,
    pool: (poolRes.Items as Rec[]) ?? [],
    detail: (detailRes.Items as Rec[]) ?? [],
    wip: (wipRes.Items as Rec[]) ?? [],
    receipts: (receiptRes.Items as Rec[]) ?? [],
    history: (historyRes.Items as Rec[]) ?? [],
    compare: (compareRes.Lines as Rec[]) ?? [],
    run,
  });
  session.overview = overview;
  return overview;
}

export async function getProductionCostingOverview(companyCd: string, periodYm: string): Promise<ProductionCostingOverview> {
  session.companyCd = companyCd;
  session.periodYm = periodYm;
  return reloadProductionCosting();
}

export async function setProductionCostingPeriod(companyCd: string, periodYm: string): Promise<ProductionCostingOverview> {
  session.companyCd = companyCd;
  session.periodYm = periodYm;
  pendingOps.clear();
  pendingObjectSelection.clear();
  return reloadProductionCosting();
}

export type EnsurePeriodResult = {
  overview: ProductionCostingOverview;
  message: string;
  syncedObjectCount: number;
};

export type SyncObjectsResult = {
  overview: ProductionCostingOverview;
  syncedCount: number;
};

export async function ensureProductionCostingPeriod(): Promise<EnsurePeriodResult> {
  const result = await post<{
    Message?: string;
    SyncedObjectCount?: number;
  }>("/period/ensure", { PeriodYm: session.periodYm });
  // Sau khởi tạo lại kỳ: về bước 0 và tiến độ 0/6; xóa state RUN cũ trên client.
  session.activeStep = 0;
  pendingOps.clear();
  pendingObjectSelection.clear();
  const overview = await reloadProductionCosting();
  return {
    overview,
    message: text(result?.Message),
    syncedObjectCount: num(result?.SyncedObjectCount),
  };
}

export async function syncProductionCostObjects(): Promise<SyncObjectsResult> {
  const identity = requireIdentity();
  const syncedCount = await post<number>("/objects/sync-receipts", identity);
  return {
    overview: await reloadProductionCosting(),
    syncedCount: typeof syncedCount === "number" ? syncedCount : num(syncedCount),
  };
}

export async function setProductionCostingActiveStep(step: CostingStepIndex): Promise<ProductionCostingOverview> {
  session.activeStep = step;
  // Mở lại Bước 00 → làm mới kết quả kiểm tra từ backend (không giữ Đạt cũ).
  if (step === 0) {
    return reloadProductionCosting();
  }
  if (!session.overview) return emptyOverview(session.companyCd, session.periodYm, "");
  const next = { ...session.overview, activeStep: step };
  session.overview = next;
  return next;
}

/**
 * Tick/bỏ tick một dòng: 1 PUT /objects/selection, cập nhật state local.
 * Không gọi reloadProductionCosting().
 */
export async function toggleProductionCostObject(
  departmentId: number,
  productId: number,
  selected: boolean,
): Promise<ProductionCostingOverview> {
  if (departmentId <= 0 || productId <= 0) {
    throw new Error("Không chọn được TP thiếu DEPARTMENT_ID hoặc PRODUCT_ID.");
  }
  const lockKey = objectSelectionLockKey(departmentId, productId);
  if (pendingObjectSelection.has(lockKey)) {
    throw new Error("Đang cập nhật lựa chọn dòng này. Vui lòng đợi.");
  }

  const identity = requireIdentity();
  pendingObjectSelection.add(lockKey);
  try {
    await put("/objects/selection", {
      ...identity,
      DepartmentId: departmentId,
      ProductId: productId,
      Selected: selected,
    });
    return applySelectionToSession([{ departmentId, productId, selected }]);
  } finally {
    pendingObjectSelection.delete(lockKey);
  }
}

export type ProductionCostObjectSelectionItem = {
  departmentId: number;
  productId: number;
  selected: boolean;
};

/**
 * Chọn hàng loạt đối tượng hợp lệ: 1 PUT /objects/selection (Items), cập nhật state local.
 * Không gọi reloadProductionCosting().
 */
export async function updateProductionCostObjectSelections(
  items: ProductionCostObjectSelectionItem[],
): Promise<ProductionCostingOverview> {
  const normalized = items
    .filter((item) => item.departmentId > 0 && item.productId > 0)
    .map((item) => ({
      departmentId: item.departmentId,
      productId: item.productId,
      selected: item.selected,
    }));
  if (normalized.length === 0) {
    if (!session.overview) throw new Error("Chưa tải overview G-K.");
    return session.overview;
  }

  const lockKeys = normalized.map((item) => objectSelectionLockKey(item.departmentId, item.productId));
  if (lockKeys.some((key) => pendingObjectSelection.has(key))) {
    throw new Error("Đang cập nhật lựa chọn đối tượng. Vui lòng đợi thao tác trước hoàn tất.");
  }

  const identity = requireIdentity();
  for (const key of lockKeys) pendingObjectSelection.add(key);
  try {
    await put("/objects/selection", {
      ...identity,
      Items: normalized.map((item) => ({
        DepartmentId: item.departmentId,
        ProductId: item.productId,
        Selected: item.selected,
      })),
    });
    return applySelectionToSession(normalized);
  } finally {
    for (const key of lockKeys) pendingObjectSelection.delete(key);
  }
}

async function runPeriodLock(step: "FA_PREPAID_LOCK" | "PROFIT_LOSS_REPORT"): Promise<ProductionCostingOverview> {
  const year = Number(session.periodYm.slice(0, 4));
  const started = await startPeriodLock({
    Year: year,
    // B-I resolves FromPeriodYm from its authoritative locked-period milestones.
    // It may process earlier unclosed months; never imply this is single-period.
    FromPeriodYm: "",
    ToPeriodYm: session.periodYm,
    Steps: [step],
    TargetStepCode: step,
    Options: {
      CogsSummary: { TransferRules: "154_TO_155" },
      ProfitLossReport: { BalanceMethod: "BALANCE_ACCOUNT" },
    },
  });
  const jobId = started.data.JobId;
  let percent = 0;
  let message = "Äang cháº¡y PeriodLock.";
  let completed = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const progress = await getPeriodLockProgress(jobId);
    percent = progress.data.Percent ?? 0;
    message = progress.data.Message || progress.data.CurrentStepName || message;
    const status = progress.data.Status;
    if (status === "ERROR") throw new Error(message || "PeriodLock bÃ¡o lá»—i.");
    // KhÃ´ng suy diá»…n thÃ nh cÃ´ng chá»‰ vÃ¬ Percent=100.
    if (status === "DONE") {
      completed = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  if (!completed) {
    throw new Error(`PeriodLock chÆ°a xÃ¡c nháº­n DONE cho ká»³ ${session.periodYm}. ${message} Kiá»ƒm tra láº¡i tiáº¿n Ä‘á»™ job trÆ°á»›c khi thao tÃ¡c tiáº¿p.`);
  }
  const overview = await reloadProductionCosting();
  overview.job = { running: false, percent, message };
  session.overview = overview;
  return overview;
}

export async function runProductionCostingStep1(): Promise<ProductionCostingOverview> {
  const overview = await runPeriodLock("FA_PREPAID_LOCK");
  if (overview.stepStatuses[0] !== "DONE") {
    throw new Error(overview.job.message || "PeriodLock chÆ°a ghi nháº­n FA_PREPAID_LOCK = DONE.");
  }
  return overview;
}

export async function setAllocateType(allocateType: AllocateType): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  await put("/run/config", { ...identity, AllocateType: allocateType });
  return reloadProductionCosting();
}

export async function setPoolReduction(poolRowId: string, reduction: number): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  const [accountCd, departmentId] = poolRowId.split(":");
  await put("/allocation/reduction", {
    ...identity,
    AccountCd: accountCd,
    DepartmentId: Number(departmentId || 0),
    Reduction: reduction,
  });
  return reloadProductionCosting();
}

export async function setAllocationByDepartment(enabled: boolean): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  await put("/run/config", { ...identity, ByDepartment: enabled });
  return reloadProductionCosting();
}

export async function setAllocationInclude6212(enabled: boolean): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  await put("/run/config", { ...identity, Include6212: enabled });
  return reloadProductionCosting();
}

export async function previewAllocation(): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  const result = await post<Rec>("/allocation/preview", identity);
  const overview = await reloadProductionCosting();
  const pool = mapPoolRows((result.Pool as Rec[]) ?? []);
  const details = mapDetailRows((result.Details as Rec[]) ?? []);
  const next = {
    ...overview,
    allocationPoolRows: pool.length > 0 ? pool : overview.allocationPoolRows,
    allocationProductRows: details.length > 0 ? details : overview.allocationProductRows,
    allocationPreviewed: true,
    sharedLabor: num(result.Total622),
    sharedOverhead: num(result.Total627),
    statusMessage: text(result.Message),
  };
  session.overview = next;
  return next;
}

async function confirmGkStep(path: string, opKey: string, stepIndex: 1 | 2 | 3 | 4 | 5 | 6): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  const result = await post<Rec>(path, { ...identity, OperationId: operationId(opKey) });
  const overview = await reloadProductionCosting();
  const noop = text(result.IdempotencyAction) === "NoopAlreadyWritten";
  if (overview.stepStatuses[stepIndex - 1] !== "DONE" && !noop) {
    throw new Error(text(result.Message) || "Backend chÆ°a chuyá»ƒn bÆ°á»›c sang DONE.");
  }
  clearOp(opKey);
  overview.statusMessage = text(result.Message);
  session.overview = overview;
  return overview;
}

export function confirmAllocation(): Promise<ProductionCostingOverview> {
  return confirmGkStep("/allocation/confirm", "b2", 2);
}

export async function checkCostTransferPreconditions(): Promise<ProductionCostingOverview> {
  const overview = await reloadProductionCosting();
  if (overview.stepStatuses[1] !== "DONE") {
    throw new Error("B2 chÆ°a DONE trÃªn DB. KhÃ´ng káº¿t chuyá»ƒn.");
  }
  return { ...overview, step3Checked: true };
}

export function lockCostTransferTo154(): Promise<ProductionCostingOverview> {
  return confirmGkStep("/transfer/confirm", "b3", 3);
}

export async function setWipMethod(method: WipMethod): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  await put("/run/config", { ...identity, WipMethod: method });
  return reloadProductionCosting();
}

export async function setIncompleteCostPreset(presetKey: string): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  const preset = presetKey.startsWith("sl_tp")
    ? { IncompleteMode: "incomplete_cost_SL_TP_SX", IncompletePercent: presetKey.includes("p07") ? 0.7 : presetKey.includes("p05") ? 0.5 : 0.8 }
    : presetKey.includes("2720")
      ? { IncompleteMode: "incomplete_ValueChange_Calculated_ID2720", IncompletePercent: 0.5 }
      : { IncompleteMode: "STANDARD", IncompletePercent: 0.8 };
  await put("/run/config", { ...identity, ...preset });
  return reloadProductionCosting();
}

export async function patchWipRow(productId: number, patch: WipPatchFields): Promise<ProductionCostingOverview> {
  if (patch.amount154Direct != null || patch.closingIncompleteAmount154 != null || patch.beforeAmountResult621 != null || patch.beforeAmountResult62N != null) {
    throw new Error("154 trá»±c tiáº¿p vÃ  sá»‘ Ä‘áº§u ká»³ láº¥y tá»« sá»• cÃ¡i / ká»³ trÆ°á»›c. Chá»‰ lÆ°u % hoÃ n thÃ nh, sá»‘ lÆ°á»£ng dá»Ÿ dang, giáº£m trá»« vÃ  SL Ä‘áº§u ká»³.");
  }
  const identity = requireIdentity();
  const row = session.overview?.wipDetailRows.find((item) => item.productId === productId);
  await put("/wip/adjustment", {
    ...identity,
    ProductId: productId,
    DepartmentId: row?.departmentId ?? 0,
    PercentCompleted: patch.percentCompleted,
    ClosingIncompleteQty: patch.closingIncompleteQty,
    ProductReduce: patch.productReduce,
    IncompleteQtyOpening: patch.incompleteQtyOpening,
  });
  return reloadProductionCosting();
}

export async function previewCostingRun(): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  const result = await post<Rec>("/cost-calc/preview", identity);
  const overview = await reloadProductionCosting();
  const items = mapWip((result.Items as Rec[]) ?? []);
  const receipts = mapReceipts((result.ReceiptPreps as Rec[]) ?? []);
  const next = {
    ...overview,
    wipDetailRows: items.length > 0 ? items : overview.wipDetailRows,
    aggregateRows: items.length > 0 ? mapAggregate(items) : overview.aggregateRows,
    receiptRows: receipts.length > 0 ? receipts : overview.receiptRows,
    costPreviewed: true,
    statusMessage: text(result.Message),
  };
  session.overview = next;
  return next;
}

export function postCostingRun(): Promise<ProductionCostingOverview> {
  return confirmGkStep("/cost-calc/confirm", "b4", 4);
}

export async function previewValuation(): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  const result = await post<Rec>("/valuation/preview", identity);
  const overview = await reloadProductionCosting();
  const next = {
    ...overview,
    valuationRows: mapCogsRows((result.Cogs632Preview as Rec[]) ?? []),
    receiptRows: Array.isArray(result.ReceiptPreps) && (result.ReceiptPreps as Rec[]).length > 0
      ? mapReceipts(result.ReceiptPreps as Rec[])
      : overview.receiptRows,
    statusMessage: text(result.Message),
  };
  session.overview = next;
  return next;
}

export async function confirmValuation(): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  const result = await post<Rec>("/valuation/confirm", { ...identity, OperationId: operationId("b5") });
  const overview = await reloadProductionCosting();
  const noop = text(result.IdempotencyAction) === "NoopAlreadyWritten";
  if (overview.stepStatuses[4] !== "DONE" && !noop) {
    throw new Error(text(result.Message) || "Backend chÆ°a ghi nháº­n VALUATION = DONE.");
  }
  clearOp("b5");
  overview.valuationRows = mapCogsRows((result.Cogs632Preview as Rec[]) ?? []);
  overview.statusMessage = text(result.Message);
  session.overview = overview;
  return overview;
}

export async function checkProfitLossPreconditions(): Promise<ProductionCostingOverview> {
  const overview = await reloadProductionCosting();
  if (overview.profitLossConditions.some((row) => !row.ok)) {
    throw new Error("ChÆ°a Ä‘á»§ bÆ°á»›c 1â€“5 DONE trÃªn DB.");
  }
  return { ...overview, step6Checked: true };
}

export async function lockProfitLoss(): Promise<ProductionCostingOverview> {
  const overview = await runPeriodLock("PROFIT_LOSS_REPORT");
  if (overview.stepStatuses[5] !== "DONE") {
    throw new Error(overview.job.message || "PeriodLock chÆ°a ghi nháº­n PROFIT_LOSS_REPORT = DONE.");
  }
  return overview;
}

export async function getReopenInfo(stepIndex: 1 | 2 | 3 | 4 | 5 | 6): Promise<CostingReopenInfo> {
  const overview = await reloadProductionCosting();
  return buildReopenInfo(overview, stepIndex);
}

export async function reopenCostingStep(stepIndex: 1 | 2 | 3 | 4 | 5 | 6, reason: string): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  const codes = ["", "FA_PREPAID_LOCK", "COST_ALLOCATION", "EXP_TO_154_ONLY", "COST_CALC", "VALUATION", "PROFIT_LOSS_REPORT"];
  const result = await post<Rec>("/reopen/confirm", {
    ...identity,
    OperationId: operationId(`reopen-${stepIndex}`),
    ReopenDryRun: {
      RunId: identity.RunId,
      CurrentRunVersion: identity.RunVersion,
      RequestedRunVersion: identity.RunVersion,
      TargetStepCode: codes[stepIndex],
      Reason: reason,
      OperationId: operationId(`reopen-${stepIndex}`),
      HasPermission: false,
      StepStatuses: {},
    },
  });
  const overview = await reloadProductionCosting();
  if (text(result.IdempotencyAction) !== "NoopAlreadyWritten" && result.Persisted !== true) {
    throw new Error(text(result.Message) || "Backend chÆ°a ghi REOPEN.");
  }
  clearOp(`reopen-${stepIndex}`);
  overview.statusMessage = text(result.Message);
  session.overview = overview;
  return overview;
}

export async function getCostingStepHistory(stepIndex?: 1 | 2 | 3 | 4 | 5 | 6): Promise<CostingStepHistoryItem[]> {
  const overview = session.overview ?? (await reloadProductionCosting());
  if (!stepIndex) return overview.stepHistory;
  return overview.stepHistory.filter((row) => row.stepIndex === stepIndex);
}
