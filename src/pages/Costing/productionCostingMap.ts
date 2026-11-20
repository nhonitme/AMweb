import type {
  AllocationPoolRow,
  AllocationProductDetailRow,
  CostAggregateRow,
  CostObjectCandidate,
  PrerequisiteIssue,
  PrerequisiteValidationResult,
  PrerequisiteValidationStatus,
  CostingCompareRow,
  CostingReopenInfo,
  CostingStepHistoryItem,
  CostingStepIndex,
  CostingStepMeta,
  CostingStepRunStatus,
  ProductionCostingOverview,
  ReceiptUpdateRow,
  ValuationSaleRow,
  WipDetailRow,
} from "./types/productionCostingTypes";
import { emptyPrerequisiteValidation } from "./types/productionCostingTypes";

type Rec = Record<string, unknown>;

export function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function text(value: unknown): string {
  return value == null ? "" : String(value);
}

export function mapStepStatus(raw: unknown): CostingStepRunStatus {
  const status = text(raw).toUpperCase();
  if (status === "DONE") return "DONE";
  if (status === "PROCESSING") return "PROCESSING";
  if (status === "REOPENED") return "REOPENED";
  if (status === "ERROR") return "ERROR";
  return "NOT_STARTED";
}

function authoritativeStatus(step: Rec): CostingStepRunStatus {
  const index = num(step.StepIndex);
  const gk = mapStepStatus(step.Status);
  if (index !== 1 && index !== 6) return gk;
  const biStatus = text(step.BiStatus).toUpperCase();
  const bi = mapStepStatus(step.BiStatus);
  // OPEN on B-I after a successful shared REOPEN still represents a
  // REOPENED G-K working version, not a never-started period.
  if (gk === "REOPENED" && biStatus === "OPEN") return "REOPENED";
  // A still-locked B-I step must never appear safely reopened on G-K.
  if (biStatus === "DONE") return "DONE";
  if (step.StatusMismatch === true && biStatus) return bi;
  if (biStatus) return bi;
  return gk;
}

export function emptyOverview(companyCd: string, periodYm: string, message: string): ProductionCostingOverview {
  const statuses: CostingStepRunStatus[] = ["NOT_STARTED", "NOT_STARTED", "NOT_STARTED", "NOT_STARTED", "NOT_STARTED", "NOT_STARTED"];
  return {
    companyCd,
    periodYm,
    periodExists: false,
    statusMessage: message,
    runId: null,
    runVersion: null,
    costEngine: "",
    cogsRule: "",
    monthStatus: "OPEN",
    faPrepaidStatus: "OPEN",
    allocationStatus: "NOT_STARTED",
    cogsSummaryStatus: "OPEN",
    costRunStatus: "DRAFT",
    valuationStatus: "NOT_CHECKED",
    profitLossStatus: "OPEN",
    activeStep: 0,
    doneFlags: [false, false, false, false, false, false, false],
    stepStatuses: statuses,
    stepMetas: [null, null, null, null, null, null],
    stepHistory: [],
    compareRows: [],
    stats: { objectCount: 0, productCount: 0, receiptCount: 0, warningCount: 0, doneStepCount: 0 },
    warnings: message ? [{ id: "period", level: "warn", message }] : [],
    prerequisiteValidation: emptyPrerequisiteValidation(),
    objects: [],
    logs: [],
    job: { running: false, percent: 0, message: "" },
    allocationPreviewed: false,
    step3Checked: false,
    costPreviewed: false,
    step6Checked: false,
    hasPostedCosting: false,
    hasPostedValuation: false,
    sharedLabor: 0,
    sharedOverhead: 0,
    allocationPoolRows: [],
    allocationProductRows: [],
    allocateType: 0,
    is622_627_byDepartment: false,
    is6212: false,
    allocationNumberDigit: 0,
    aggregateRows: [],
    wipDetailRows: [],
    receiptRows: [],
    valuationRows: [],
    profitLossConditions: [],
    wipMethod: "PERCENT_COMPLETED",
    incompleteConfig: { mode: "STANDARD", incompletePercent: 0.8, enableProductReduce: false, presetKey: "standard" },
    allocationMethod: "MAIN_MATERIAL",
  };
}

export function mapPoolRows(items: Rec[]): AllocationPoolRow[] {
  return items.map((row) => ({
    id: `${text(row.AccountCd)}:${num(row.DepartmentId)}`,
    accountCd: text(row.AccountCd),
    credit: text(row.CreditSample),
    totalAmount: num(row.TotalAmount),
    fcAmount: num(row.FcAmount),
    creditAmount: num(row.CreditAmount),
    debitAmount154: num(row.DebitAmount154),
    reduction: num(row.Reduction),
    allocationCosts: num(row.AllocationCosts),
    departmentCd: text(row.DepartmentCd),
  }));
}

export function mapDetailRows(items: Rec[]): AllocationProductDetailRow[] {
  const grouped = new Map<string, AllocationProductDetailRow>();
  for (const line of items) {
    const key = `${num(line.ProductId)}:${num(line.DepartmentId)}`;
    let row = grouped.get(key);
    if (!row) {
      row = {
        productId: num(line.ProductId),
        productCd: text(line.ProductCd),
        productName: text(line.ProductCd),
        departmentId: num(line.DepartmentId),
        departmentCd: text(line.DepartmentCd),
        amountQuantity: num(line.AmountQuantity),
        quantity: num(line.Quantity),
        amount6211: num(line.Amount6211),
        amount6212: num(line.Amount6212),
        allocatedByAccount: {},
        amount622: num(line.Amount622Sum),
        amount627: num(line.Amount627Sum),
      };
      grouped.set(key, row);
    }
    const account = text(line.AccountCd);
    if (account) row.allocatedByAccount[account] = num(line.AllocatedAmount);
    row.amount622 = num(line.Amount622Sum) || row.amount622;
    row.amount627 = num(line.Amount627Sum) || row.amount627;
  }
  return [...grouped.values()];
}

export function mapObjects(items: Rec[]): CostObjectCandidate[] {
  return items.map((row) => ({
    objectSelId: num(row.ObjectSelId),
    departmentId: num(row.DepartmentId),
    departmentCd: text(row.DepartmentCd),
    departmentName: text(row.DepartmentName) || text(row.DepartmentCd),
    productId: num(row.ProductId),
    productCd: text(row.ProductCd),
    productName: text(row.ProductName) || text(row.ProductCd),
    finishedQty: num(row.FinishedQty),
    receiptCount: num(row.ReceiptCount),
    hasWarning: Boolean(text(row.WarningText)),
    warningText: text(row.WarningText),
    selected: text(row.IsSelected) !== "0",
  }));
}

export function mapWip(items: Rec[]): WipDetailRow[] {
  return items.map((row) => ({
    productId: num(row.ProductId),
    productCd: text(row.ProductCd),
    productName: text(row.ProductCd),
    departmentId: num(row.DepartmentId),
    departmentCd: text(row.DepartmentCd),
    incompleteQtyOpening: num(row.IncompleteQtyOpening),
    beforeAmountResult621: num(row.BeforeAmountResult621),
    beforeAmountResult62N: num(row.BeforeAmountResult62N),
    beforeAmount154: num(row.BeforeAmount154),
    amount621: num(row.Amount621),
    amount6212: num(row.Amount6212),
    amount622: num(row.Amount622),
    amount627: num(row.Amount627),
    amount154Direct: num(row.Amount154Direct),
    totalAmountIncurred: num(row.TotalAmountIncurred),
    quantity: num(row.Quantity),
    percentCompleted: num(row.PercentCompleted),
    closingIncompleteQty: num(row.ClosingIncompleteQuantity ?? row.ClosingIncompleteQty),
    amountResult621: num(row.AmountResult621),
    amountResult62N: num(row.AmountResult62N),
    closingIncompleteAmount154: num(row.ClosingIncompleteAmount154),
    productReduce: num(row.ProductReduce),
    totalCostPrice: num(row.TotalCostPrice),
    unitCost: num(row.UnitCost),
    qHt: num(row.QHt),
    errors: [],
  }));
}

export function mapAggregate(rows: WipDetailRow[]): CostAggregateRow[] {
  return rows.map((row) => ({
    departmentId: row.departmentId,
    productId: row.productId,
    productCd: row.productCd,
    productName: row.productName,
    amount621: row.amount621,
    amount6212: row.amount6212,
    amount622: row.amount622,
    amount627: row.amount627,
    amount154Direct: row.amount154Direct,
    periodCost: row.totalAmountIncurred,
    openingWip: row.beforeAmount154,
    closingWip: row.closingIncompleteAmount154,
    finishedQty: row.quantity,
    finishedCost: row.totalCostPrice,
    unitCost: row.unitCost,
  }));
}

export function mapReceipts(items: Rec[]): ReceiptUpdateRow[] {
  return items.map((row) => ({
    inputId: num(row.InputId),
    inventoryNo: text(row.InventoryNo),
    receiptDate: "",
    productCd: text(row.ProductCd),
    qty: num(row.Qty),
    oldUnitPrice: num(row.OldUnitPrice),
    oldAmount: num(row.OldAmount),
    newUnitPrice: num(row.NewUnitPrice),
    newAmount: num(row.NewAmount),
    deltaAmount: num(row.DeltaAmount),
    posted: text(row.IsApplied) === "1",
    finishedCost: num(row.NewAmount),
    finishedQty: num(row.Qty),
  }));
}

export function mapHistory(items: Rec[]): CostingStepHistoryItem[] {
  return items.map((row) => {
    // Giữ nguyên ACTION_CODE từ DB — không ánh xạ mã lạ thành EXECUTE.
    const action = text(row.ActionCode).toUpperCase();
    const stepIndex = Math.min(6, Math.max(1, num(row.StepIndex) || 1)) as 1 | 2 | 3 | 4 | 5 | 6;
    return {
      id: text(row.HistoryId),
      stepIndex,
      runNo: num(row.RunVersion),
      action,
      status: mapStepStatus(row.StatusAfter),
      resultBefore: text(row.ResultBefore),
      resultAfter: text(row.ResultAfter),
      difference: text(row.DifferenceText),
      userName: text(row.UserName),
      at: text(row.ActionAt),
      reason: text(row.Reason),
      runId: text(row.RunId),
      voucherRefs: text(row.StableKey),
    };
  });
}

export function mapCompare(items: Rec[]): CostingCompareRow[] {
  return items.map((row, index) => ({
    id: `${num(row.ProductId)}-${index}`,
    indicator: `${text(row.ProductCd) || num(row.ProductId)} / giá thành`,
    oldValue: num(row.BaseTotalCostPrice),
    newValue: num(row.CompareTotalCostPrice),
    delta: num(row.DeltaTotalCostPrice),
  }));
}

export function mapCogsRows(items: Rec[]): ValuationSaleRow[] {
  return items.map((row) => ({
    saleNo: text(row.ChitType),
    productCd: text(row.ProductCd),
    productName: text(row.ProductCd),
    openingQty: 0,
    openingUnitCost: num(row.EndingUnitCostBefore),
    periodInQty: 0,
    periodInUnitCost: num(row.OutputUnitCostAfter),
    soldQty: num(row.OutputQuantity),
    currentCogs: num(row.CogsAmountBefore),
    proposedCogs: num(row.CogsAmountAfter),
    method: text(row.DebitAccountHint) && text(row.CreditAccountHint)
      ? `${text(row.DebitAccountHint)}/${text(row.CreditAccountHint)}`
      : "",
    status: num(row.CogsDelta) === 0 ? "UNCHANGED" : "DELTA",
  }));
}

export function buildReopenInfo(
  overview: ProductionCostingOverview,
  stepIndex: 1 | 2 | 3 | 4 | 5 | 6,
): CostingReopenInfo {
  const titles = ["", "Khóa TSCĐ/CPTT", "Phân bổ 622/627", "Kết chuyển 154", "Tính giá thành", "Định giá xuất", "Khóa lãi lỗ"];
  const current = overview.stepStatuses[stepIndex - 1];
  const blocking = overview.stepStatuses
    .map((status, index) => ({ stepIndex: index + 1, title: titles[index + 1], status }))
    .filter((row) => row.stepIndex > stepIndex && row.status === "DONE");
  return {
    stepIndex,
    stepCode: titles[stepIndex],
    stepTitle: titles[stepIndex],
    companyCd: overview.companyCd,
    periodYm: overview.periodYm,
    currentStatus: current,
    completedBy: overview.stepMetas[stepIndex - 1]?.completedBy ?? "",
    completedAt: overview.stepMetas[stepIndex - 1]?.completedAt ?? "",
    relatedResults: [],
    blockingDependents: blocking,
    canReopen: current === "DONE" || current === "REOPENED",
    blockReason: blocking.length > 0 ? "Hệ thống sẽ hoàn nguyên các bước DONE phía sau trong cùng thao tác." : "",
    warnings: overview.warnings.map((row) => row.message),
  };
}

export function mapPrerequisiteValidation(raw: unknown): PrerequisiteValidationResult {
  if (!raw || typeof raw !== "object") return emptyPrerequisiteValidation();
  const row = raw as Rec;
  const statusRaw = text(row.Status || row.status).toUpperCase();
  const status: PrerequisiteValidationStatus =
    statusRaw === "SUCCESS" || statusRaw === "WARNING" || statusRaw === "ERROR" || statusRaw === "NOT_CHECKED"
      ? statusRaw
      : "NOT_CHECKED";
  const issuesRaw = (row.Issues ?? row.issues) as Rec[] | undefined;
  const issues: PrerequisiteIssue[] = (issuesRaw ?? []).map((item) => {
    const levelRaw = text(item.Level || item.level).toUpperCase();
    return {
      level: levelRaw === "WARNING" ? "WARNING" : "ERROR",
      code: text(item.Code || item.code),
      message: text(item.Message || item.message),
      productId: num(item.ProductId ?? item.productId) || undefined,
      departmentId: num(item.DepartmentId ?? item.departmentId) || undefined,
    };
  });
  return {
    status,
    errorCount: num(row.ErrorCount ?? row.errorCount),
    warningCount: num(row.WarningCount ?? row.warningCount),
    issues,
  };
}

function objectSelectionKey(departmentId: number, productId: number): string {
  return `${departmentId}:${productId}`;
}

/**
 * Tính lại tiền kiểm Bước 00 từ danh sách đối tượng sau khi đổi IS_SELECTED,
 * không gọi lại API. Giữ các issue không phụ thuộc lựa chọn (kỳ / nguồn phiếu / mapping trùng).
 */
export function recomputePrerequisiteAfterSelection(
  overview: ProductionCostingOverview,
  objects: CostObjectCandidate[],
): PrerequisiteValidationResult {
  if (!overview.periodExists || !overview.runId) {
    return {
      status: "NOT_CHECKED",
      errorCount: 0,
      warningCount: 0,
      issues: [
        {
          level: "WARNING",
          code: "PERIOD_NOT_READY",
          message:
            "Kỳ G-K chưa được khởi tạo hoặc chưa tải được RUN. Hãy khởi tạo kỳ trước khi kiểm tra đầu vào.",
        },
      ],
    };
  }

  const issues: PrerequisiteIssue[] = [];
  for (const issue of overview.prerequisiteValidation.issues) {
    if (issue.code === "PERIOD_NOT_READY" || issue.code === "NO_SOURCE_RECEIPT" || issue.code === "DUPLICATE_MAPPING") {
      issues.push(issue);
    }
  }

  if (overview.stats.receiptCount <= 0 && !issues.some((issue) => issue.code === "NO_SOURCE_RECEIPT")) {
    issues.push({
      level: "ERROR",
      code: "NO_SOURCE_RECEIPT",
      message:
        "Không có chứng từ nhập thành phẩm nguồn hợp lệ trong kỳ (Nợ 155% / Có 154%). " +
        "Đồng bộ đối tượng từ nhập kho hoặc kiểm tra hạch toán phiếu nhập.",
    });
  }

  const selected = objects.filter((row) => row.selected);
  if (selected.length === 0) {
    issues.push({
      level: "ERROR",
      code: "NO_SELECTED_PRODUCT",
      message:
        "Chưa có thành phẩm được chọn để tính giá thành. " +
        "Chọn đối tượng hợp lệ trên Bước 00 trước khi ghi các bước G-K.",
    });
  }

  for (const row of objects) {
    const productId = Number(row.productId ?? 0);
    if (productId <= 0) {
      issues.push({
        level: "ERROR",
        code: "MISSING_PRODUCT_ID",
        message:
          `Thành phẩm nguồn thiếu PRODUCT_ID bắt buộc` +
          (row.productCd ? ` (mã ${row.productCd}).` : ".") +
          " Không thể tính giá thành cho dòng này.",
        productId,
        departmentId: row.departmentId,
      });
    }
    if (row.departmentId <= 0) {
      issues.push({
        level: "ERROR",
        code: "MISSING_DEPARTMENT_ID",
        message:
          `Thành phẩm phát sinh nguồn thiếu DEPARTMENT_ID hợp lệ` +
          (row.productCd ? ` (TP ${row.productCd}).` : ".") +
          " Gán đối tượng tập hợp chi phí trên danh mục sản phẩm rồi đồng bộ lại.",
        productId: productId > 0 ? productId : undefined,
        departmentId: row.departmentId,
      });
    }
  }

  for (const row of selected) {
    const productId = Number(row.productId ?? 0);
    if (productId <= 0 || row.departmentId <= 0) continue;
    if (row.finishedQty <= 0) {
      issues.push({
        level: "ERROR",
        code: "INVALID_QUANTITY",
        message:
          `Thành phẩm được chọn có số lượng không hợp lệ (SL=${row.finishedQty})` +
          (row.productCd ? ` — TP ${row.productCd}.` : ".") +
          " Kiểm tra phiếu nhập Nợ 155% / Có 154% trong kỳ.",
        productId,
        departmentId: row.departmentId,
      });
      issues.push({
        level: "ERROR",
        code: "MISSING_ACCOUNTING_LINK",
        message:
          `Không liên kết được chứng từ nhập kho với hạch toán Nợ 155% / Có 154% cho thành phẩm được chọn` +
          (row.productCd ? ` (TP ${row.productCd}).` : "."),
        productId,
        departmentId: row.departmentId,
      });
    }
  }

  for (const row of objects) {
    const productId = Number(row.productId ?? 0);
    if (
      row.selected ||
      productId <= 0 ||
      row.departmentId <= 0 ||
      row.finishedQty <= 0 ||
      row.receiptCount <= 0
    ) {
      continue;
    }
    issues.push({
      level: "WARNING",
      code: "DESELECTED_SOURCE_PRODUCT",
      message:
        `Thành phẩm có nhập kho hợp lệ trong kỳ nhưng chưa được chọn tính giá thành` +
        (row.productCd ? ` (TP ${row.productCd}).` : ".") +
        " Bỏ qua nếu cố ý loại khỏi phạm vi tính.",
      productId,
      departmentId: row.departmentId,
    });
  }

  const deduped = [
    ...new Map(
      issues.map((issue) => [
        `${issue.level}|${issue.code}|${issue.productId ?? 0}|${issue.departmentId ?? 0}|${issue.message}`,
        issue,
      ]),
    ).values(),
  ];
  const errorCount = deduped.filter((issue) => issue.level === "ERROR").length;
  const warningCount = deduped.filter((issue) => issue.level === "WARNING").length;
  const status: PrerequisiteValidationStatus =
    errorCount > 0 ? "ERROR" : warningCount > 0 ? "WARNING" : "SUCCESS";

  return { status, errorCount, warningCount, issues: deduped };
}

/**
 * Cập nhật state lựa chọn đối tượng trên overview hiện có (không reload G-K).
 * Đồng bộ objectCount + tiền kiểm Bước 00; giữ nguyên productCount / receiptCount.
 */
export function applyObjectSelection(
  overview: ProductionCostingOverview,
  updates: Array<{ departmentId: number; productId: number; selected: boolean }>,
): ProductionCostingOverview {
  if (updates.length === 0) return overview;

  const patch = new Map(
    updates.map((item) => [objectSelectionKey(item.departmentId, item.productId), item.selected]),
  );
  const objects = overview.objects.map((row) => {
    const productId = Number(row.productId ?? 0);
    const nextSelected = patch.get(objectSelectionKey(row.departmentId, productId));
    if (nextSelected === undefined || nextSelected === row.selected) return row;
    return { ...row, selected: nextSelected };
  });

  const prerequisiteValidation = recomputePrerequisiteAfterSelection(overview, objects);
  const objectCount = objects.filter((row) => row.selected).length;
  const warningCount =
    prerequisiteValidation.warningCount +
    prerequisiteValidation.errorCount +
    overview.stepStatuses.filter((status) => status === "ERROR" || status === "REOPENED").length;

  const warnings = [
    ...overview.warnings.filter((row) => row.id === "period"),
    ...prerequisiteValidation.issues.map((issue, index) => ({
      id: `prereq-${issue.code}-${issue.departmentId ?? 0}-${issue.productId ?? 0}-${index}`,
      level: (issue.level === "ERROR" ? "error" : "warn") as "error" | "warn",
      message: issue.message,
      departmentId: issue.departmentId,
      productId: issue.productId,
    })),
    ...objects
      .filter((row) => row.warningText)
      .filter(
        (row) =>
          !prerequisiteValidation.issues.some(
            (issue) =>
              issue.departmentId === row.departmentId &&
              issue.productId === (row.productId ?? undefined) &&
              issue.message.includes(row.warningText.slice(0, 40)),
          ),
      )
      .map((row) => ({
        id: `obj-${row.departmentId}-${row.productId}`,
        level: "error" as const,
        message: row.warningText,
        departmentId: row.departmentId,
        productId: row.productId ?? undefined,
      })),
  ];

  return {
    ...overview,
    objects,
    prerequisiteValidation,
    stats: {
      ...overview.stats,
      objectCount,
      warningCount,
    },
    warnings,
  };
}

export function assembleOverview(input: {
  companyCd: string;
  periodYm: string;
  activeStep: CostingStepIndex;
  period: Rec;
  steps: Rec[];
  objects: Rec[];
  sourceReceiptCount: number;
  prerequisiteValidation?: unknown;
  pool: Rec[];
  detail: Rec[];
  wip: Rec[];
  receipts: Rec[];
  history: Rec[];
  compare: Rec[];
  run: Rec | null;
}): ProductionCostingOverview {
  const base = emptyOverview(input.companyCd, input.periodYm, text(input.period.Message));
  const periodExists = input.period.PeriodExists === true && num(input.run?.RunId) > 0;
  const prerequisiteValidation = mapPrerequisiteValidation(input.prerequisiteValidation);
  const statuses = [1, 2, 3, 4, 5, 6].map((index) => {
    const step = input.steps.find((row) => num(row.StepIndex) === index);
    return step ? authoritativeStatus(step) : "NOT_STARTED";
  }) as CostingStepRunStatus[];
  const metas: Array<CostingStepMeta | null> = input.steps
    .slice()
    .sort((a, b) => num(a.StepIndex) - num(b.StepIndex))
    .map((step) => ({
      completedBy: text(step.CompletedBy),
      completedAt: text(step.CompletedAt),
      reopenBy: "",
      reopenAt: "",
      reopenReason: "",
      runId: text(input.run?.RunId),
      voucherRefs: [],
    }));
  while (metas.length < 6) metas.push(null);
  const wipRows = mapWip(input.wip);
  const objects = mapObjects(input.objects);
  const pool = mapPoolRows(input.pool);
  const products = mapDetailRows(input.detail);
  const receipts = mapReceipts(input.receipts);
  const history = mapHistory(input.history);
  const allocateType = num(input.run?.AllocateType) === 1 ? 1 : 0;
  const doneCount = statuses.filter((status) => status === "DONE").length;
  return {
    ...base,
    periodExists,
    statusMessage: periodExists ? text(input.period.Message) : text(input.period.Message) || "Kỳ chưa có phiên tính G-K.",
    runId: periodExists ? num(input.run?.RunId) : null,
    runVersion: periodExists ? num(input.run?.RunVersion) : null,
    costEngine: text(input.period.CostEngine),
    cogsRule: text(input.period.CogsRule),
    monthStatus: text(input.period.Status) === "DONE" ? "LOCKED" : "OPEN",
    activeStep: input.activeStep,
    stepStatuses: statuses,
    stepMetas: metas.slice(0, 6),
    doneFlags: [false, ...statuses.map((status) => status === "DONE")],
    objects,
    allocationPoolRows: pool,
    allocationProductRows: products,
    wipDetailRows: wipRows,
    aggregateRows: mapAggregate(wipRows),
    receiptRows: receipts,
    stepHistory: history,
    compareRows: mapCompare(input.compare),
    logs: history.slice(0, 8).map((row) => ({ at: row.at, message: `${row.action} ${row.resultAfter}` })),
    allocateType,
    is622_627_byDepartment: text(input.run?.Is622627ByDepartment) === "1",
    is6212: text(input.run?.Is6212) === "1",
    allocationNumberDigit: num(input.run?.AllocNumberDigit),
    wipMethod: text(input.run?.WipMethod) === "CLOSING_WIP_QUANTITY" ? "CLOSING_WIP_QUANTITY" : "PERCENT_COMPLETED",
    incompleteConfig: {
      mode: text(input.run?.IncompleteMode) === "incomplete_cost_SL_TP_SX"
        ? "incomplete_cost_SL_TP_SX"
        : text(input.run?.IncompleteMode) === "incomplete_ValueChange_Calculated_ID2720"
          ? "incomplete_ValueChange_Calculated_ID2720"
          : "STANDARD",
      incompletePercent: num(input.run?.IncompletePercent) || 0.8,
      enableProductReduce: text(input.run?.EnableProductReduce) === "1",
      presetKey: text(input.run?.IncompleteMode) === "incomplete_cost_SL_TP_SX"
        ? (Math.abs(num(input.run?.IncompletePercent) - 0.7) < 0.000001 ? "sl_tp_sx_p07" : "sl_tp_sx_p08")
        : text(input.run?.IncompleteMode) === "incomplete_ValueChange_Calculated_ID2720"
          ? "id2720_p05"
          : "standard",
    },
    allocationMethod: allocateType === 1 ? "FINISHED_QTY" : "MAIN_MATERIAL",
    allocationStatus: statuses[1] === "DONE" ? "CONFIRMED" : pool.length > 0 ? "PREVIEWED" : "NOT_STARTED",
    faPrepaidStatus: statuses[0] === "DONE" ? "DONE" : statuses[0] === "ERROR" ? "ERROR" : "OPEN",
    cogsSummaryStatus: statuses[2] === "DONE" ? "DONE" : statuses[2] === "ERROR" ? "ERROR" : "OPEN",
    profitLossStatus: statuses[5] === "DONE" ? "DONE" : statuses[5] === "ERROR" ? "ERROR" : "OPEN",
    costRunStatus: statuses[3] === "DONE" ? "POSTED" : "DRAFT",
    valuationStatus: statuses[4] === "DONE" ? "RECONCILED" : "NOT_CHECKED",
    hasPostedCosting: statuses[3] === "DONE",
    hasPostedValuation: statuses[4] === "DONE",
    sharedLabor: pool.filter((row) => row.accountCd.startsWith("622")).reduce((sum, row) => sum + row.allocationCosts, 0),
    sharedOverhead: pool.filter((row) => row.accountCd.startsWith("627")).reduce((sum, row) => sum + row.allocationCosts, 0),
    prerequisiteValidation,
    stats: {
      objectCount: objects.filter((row) => row.selected).length,
      productCount: new Set(objects.map((row) => row.productId).filter((id) => id > 0)).size,
      // Source inventory vouchers (N155/C154), not production_cost_receipt B4/B5 prep rows.
      receiptCount: input.sourceReceiptCount,
      warningCount:
        prerequisiteValidation.warningCount +
        prerequisiteValidation.errorCount +
        statuses.filter((status) => status === "ERROR" || status === "REOPENED").length,
      doneStepCount: doneCount,
    },
    warnings: [
      ...(text(input.period.Message) ? [{ id: "period", level: "info" as const, message: text(input.period.Message) }] : []),
      ...prerequisiteValidation.issues.map((issue, index) => ({
        id: `prereq-${issue.code}-${issue.departmentId ?? 0}-${issue.productId ?? 0}-${index}`,
        level: (issue.level === "ERROR" ? "error" : "warn") as "error" | "warn",
        message: issue.message,
        departmentId: issue.departmentId,
        productId: issue.productId,
      })),
      // Object-level WarningText not already covered by structured issues
      ...objects
        .filter((row) => row.warningText)
        .filter(
          (row) =>
            !prerequisiteValidation.issues.some(
              (issue) =>
                issue.departmentId === row.departmentId &&
                issue.productId === (row.productId ?? undefined) &&
                issue.message.includes(row.warningText.slice(0, 40)),
            ),
        )
        .map((row) => ({
          id: `obj-${row.departmentId}-${row.productId}`,
          level: "error" as const,
          message: row.warningText,
          departmentId: row.departmentId,
          productId: row.productId ?? undefined,
        })),
    ],
    profitLossConditions: [
      { id: "b1", label: "B1 TSCĐ/CPTT DONE trên PeriodLock", ok: statuses[0] === "DONE" },
      { id: "b2", label: "B2 phân bổ DONE", ok: statuses[1] === "DONE" },
      { id: "b3", label: "B3 EXP_TO_154_ONLY DONE", ok: statuses[2] === "DONE" },
      { id: "b4", label: "B4 giá thành DONE", ok: statuses[3] === "DONE" },
      { id: "b5", label: "B5 định giá DONE", ok: statuses[4] === "DONE" },
    ],
  };
}
