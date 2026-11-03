/**
 * Client G-K — chỉ gọi /api/production-cost và PeriodLock.
 * Không giữ số liệu kế toán mẫu. Trạng thái bước lấy lại từ GET sau khi ghi.
 */

import axios from "./axiosClient";
import { getPeriodLockProgress, startPeriodLock } from "./periodLockApi";
import {
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
    throw new Error(overview?.statusMessage || "Kỳ chưa có RUN. Hãy khởi tạo kỳ trước khi ghi.");
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
    throw new Error("Chưa chọn công ty hoặc kỳ.");
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
  return reloadProductionCosting();
}

export async function ensureProductionCostingPeriod(): Promise<ProductionCostingOverview> {
  await post("/period/ensure", { PeriodYm: session.periodYm });
  return reloadProductionCosting();
}

export async function syncProductionCostObjects(): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  await post("/objects/sync-receipts", identity);
  return reloadProductionCosting();
}

export async function setProductionCostingActiveStep(step: CostingStepIndex): Promise<ProductionCostingOverview> {
  session.activeStep = step;
  if (!session.overview) return emptyOverview(session.companyCd, session.periodYm, "");
  const next = { ...session.overview, activeStep: step };
  session.overview = next;
  return next;
}

export async function toggleProductionCostObject(departmentId: number, selected: boolean): Promise<ProductionCostingOverview> {
  const identity = requireIdentity();
  await put("/objects/selection", { ...identity, DepartmentId: departmentId, ProductId: 0, Selected: selected });
  return reloadProductionCosting();
}

async function runPeriodLock(step: "FA_PREPAID_LOCK" | "PROFIT_LOSS_REPORT"): Promise<ProductionCostingOverview> {
  const year = Number(session.periodYm.slice(0, 4));
  const started = await startPeriodLock({
    Year: year,
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
  let message = "Đang chạy PeriodLock.";
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const progress = await getPeriodLockProgress(jobId);
    percent = progress.data.Percent ?? 0;
    message = progress.data.Message || progress.data.CurrentStepName || message;
    const status = progress.data.Status;
    if (status === "DONE" || status === "ERROR" || percent >= 100) {
      if (status === "ERROR") throw new Error(message || "PeriodLock báo lỗi.");
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  const overview = await reloadProductionCosting();
  overview.job = { running: false, percent, message };
  session.overview = overview;
  return overview;
}

export async function runProductionCostingStep1(): Promise<ProductionCostingOverview> {
  const overview = await runPeriodLock("FA_PREPAID_LOCK");
  if (overview.stepStatuses[0] !== "DONE") {
    throw new Error(overview.job.message || "PeriodLock chưa ghi nhận FA_PREPAID_LOCK = DONE.");
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
    throw new Error(text(result.Message) || "Backend chưa chuyển bước sang DONE.");
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
    throw new Error("B2 chưa DONE trên DB. Không kết chuyển.");
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
      ? { IncompleteMode: "incomplete_ValueChange_Calculated_ID2720", IncompletePercent: 0.8 }
      : { IncompleteMode: "STANDARD", IncompletePercent: 0.8 };
  await put("/run/config", { ...identity, ...preset });
  return reloadProductionCosting();
}

export async function patchWipRow(productId: number, patch: WipPatchFields): Promise<ProductionCostingOverview> {
  if (patch.amount154Direct != null || patch.closingIncompleteAmount154 != null || patch.beforeAmountResult621 != null || patch.beforeAmountResult62N != null) {
    throw new Error("154 trực tiếp và số đầu kỳ lấy từ sổ cái / kỳ trước. Chỉ lưu % hoàn thành, số lượng dở dang, giảm trừ và SL đầu kỳ.");
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
    throw new Error(text(result.Message) || "Backend chưa ghi nhận VALUATION = DONE.");
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
    throw new Error("Chưa đủ bước 1–5 DONE trên DB.");
  }
  return { ...overview, step6Checked: true };
}

export async function lockProfitLoss(): Promise<ProductionCostingOverview> {
  const overview = await runPeriodLock("PROFIT_LOSS_REPORT");
  if (overview.stepStatuses[5] !== "DONE") {
    throw new Error(overview.job.message || "PeriodLock chưa ghi nhận PROFIT_LOSS_REPORT = DONE.");
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
    throw new Error(text(result.Message) || "Backend chưa ghi REOPEN.");
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
