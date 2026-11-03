/**
 * Kiểu dữ liệu phân hệ G-K – Giá thành giản đơn (All-in-One).
 * Thiết kế sát API dự kiến để sau này thay mock bằng HTTP mà không đổi UI.
 */

/** Mã bước xử lý trong G-K (0 = kiểm tra đầu vào, 1–6 = quy trình chính). */
export type CostingStepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Trạng thái hiển thị từng bước trên sidebar / panel (FE-04 bổ sung REOPENED). */
export type CostingStepUiStatus =
  | "NOT_STARTED"
  | "READY"
  | "PROCESSING"
  | "DONE"
  | "REOPENED"
  | "ERROR"
  | "BLOCKED";

/** Trạng thái chạy thực tế của từng bước 1–6 trong mock store. */
export type CostingStepRunStatus =
  | "NOT_STARTED"
  | "PROCESSING"
  | "DONE"
  | "REOPENED"
  | "ERROR";

/** Hành động ghi vào lịch sử bước. */
export type CostingHistoryAction =
  | "EXECUTE"
  | "REOPEN"
  | "PREVIEW"
  | "CONFIRM"
  | "ERROR";

/** Một dòng lịch sử thực hiện / mở lại theo bước. */
export type CostingStepHistoryItem = {
  id: string;
  stepIndex: 1 | 2 | 3 | 4 | 5 | 6;
  runNo: number;
  action: CostingHistoryAction;
  status: CostingStepRunStatus;
  resultBefore: string;
  resultAfter: string;
  difference: string;
  userName: string;
  at: string;
  reason: string;
  runId: string;
  voucherRefs: string;
};

/** Dòng so sánh kết quả cũ / mới khi tính thử lại. */
export type CostingCompareRow = {
  id: string;
  indicator: string;
  oldValue: number;
  newValue: number;
  delta: number;
};

/** Thông tin điều kiện mở lại một bước (cho Popup). */
export type CostingReopenInfo = {
  stepIndex: 1 | 2 | 3 | 4 | 5 | 6;
  stepCode: string;
  stepTitle: string;
  companyCd: string;
  periodYm: string;
  currentStatus: CostingStepRunStatus;
  completedBy: string;
  completedAt: string;
  relatedResults: string[];
  blockingDependents: Array<{ stepIndex: number; title: string; status: CostingStepRunStatus }>;
  canReopen: boolean;
  blockReason: string;
  warnings: string[];
};

/** Metadata lần hoàn thành / mở lại gần nhất của một bước. */
export type CostingStepMeta = {
  completedBy: string;
  completedAt: string;
  reopenBy: string;
  reopenAt: string;
  reopenReason: string;
  runId: string;
  voucherRefs: string[];
};

/** Trạng thái khóa kỳ dùng chung với B-I (chỉ trong mock store giai đoạn FE). */
export type PeriodMonthStatus = "OPEN" | "PARTIAL" | "LOCKED";

/** Trạng thái bước khóa sổ B-I dùng chung. */
export type SharedLockStepStatus = "OPEN" | "PROCESSING" | "DONE" | "ERROR";

/** Trạng thái phân bổ 622/627. */
export type AllocationStatus = "NOT_STARTED" | "PREVIEWED" | "CONFIRMED" | "STALE";

/** Trạng thái phiên tính giá thành. */
export type CostRunStatus = "DRAFT" | "CALCULATED" | "POSTED" | "SUPERSEDED" | "REVERSED";

/** Trạng thái đối chiếu giá xuất. */
export type ValuationStatus = "NOT_CHECKED" | "CALCULATED" | "RECONCILED" | "STALE" | "NO_MOVEMENTS";

/**
 * Phương pháp phân bổ 622/627 (bám frmAllocateCosts).
 * 0 = NVL chính (N621/C152 → Amount_Quantity)
 * 1 = SL TP nhập kho (N155/C154 → Quantity)
 */
export type AllocateType = 0 | 1;

/** Alias cũ — map sang AllocateType khi cần. */
export type AllocationMethod = "MAIN_MATERIAL" | "FINISHED_QTY" | "REVENUE" | "MANUAL_RATE";

/** Dòng bảng trên: tổng hợp pool chi phí phân bổ theo tài khoản. */
export type AllocationPoolRow = {
  /** Khóa dòng (account + department nếu byDepartment). */
  id: string;
  /** Tài khoản nợ 622* / 627* / 6212. */
  accountCd: string;
  /** Bên Có tham chiếu (hiển thị). */
  credit: string;
  /** Số phát sinh nợ (total_amount). */
  totalAmount: number;
  /** FC (mock). */
  fcAmount: number;
  /**
   * CREDIT_AMOUNT(A) — tổng phát sinh Có = A trong kỳ.
   * Dùng để tính reduction.
   */
  creditAmount: number;
  /**
   * DEBIT_AMOUNT_154(A) — Có = A và Nợ 154%.
   */
  debitAmount154: number;
  /** Điều chỉnh giảm = creditAmount − debitAmount154 (trừ company đặc biệt). */
  reduction: number;
  /** Chi phí phân bổ P_A = totalAmount − reduction. */
  allocationCosts: number;
  /** Đối tượng khi is622_627_byDepartment. */
  departmentCd: string;
};

/** Dòng bảng dưới: phân bổ về từng mã thành phẩm. */
export type AllocationProductDetailRow = {
  productId: number;
  productCd: string;
  productName: string;
  departmentId: number;
  departmentCd: string;
  /** Tiêu thức NVL: Σ AMOUNT N621/C152 theo TP (Amount_Quantity). */
  amountQuantity: number;
  /** Tiêu thức TPNK: Σ SL nhập N155/C154. */
  quantity: number;
  /** Σ Nợ 6211/Có 152. */
  amount6211: number;
  /** Σ Nợ 6212/Có 152. */
  amount6212: number;
  /** Tiền phân bổ từng TK: ACC_CD_A. */
  allocatedByAccount: Record<string, number>;
  /** Σ ACC_CD_622*. */
  amount622: number;
  /** Σ ACC_CD_627*. */
  amount627: number;
};

/**
 * Phương pháp dở dang cuối kỳ (frmCalculateProductProcess).
 * - PERCENT_COMPLETED: theo % hoàn thành NVL chính
 * - CLOSING_WIP_QUANTITY: theo số lượng dở dang cuối kỳ
 */
export type WipMethod = "PERCENT_COMPLETED" | "CLOSING_WIP_QUANTITY";

/** Chế độ tính đặc biệt (mục 7) — chọn qua preset, không hardcode company trên UI. */
export type IncompleteCostMode =
  | "STANDARD"
  | "incomplete_cost_SL_TP_SX"
  | "incomplete_ValueChange_Calculated_ID2720";

export type IncompleteCostConfigView = {
  mode: IncompleteCostMode;
  incompletePercent: number;
  enableProductReduce: boolean;
  presetKey: string;
};

/** Dòng chi tiết tab Chi phí dở dang (Bước 4). */
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

export type WipDetailRow = {
  productId: number;
  productCd: string;
  productName: string;
  departmentId: number;
  departmentCd: string;
  /** SL dở dang đầu kỳ. */
  incompleteQtyOpening: number;
  beforeAmountResult621: number;
  beforeAmountResult62N: number;
  beforeAmount154: number;
  amount621: number;
  amount6212: number;
  amount622: number;
  amount627: number;
  /** Phát sinh thẳng 154 — không gồm kết chuyển Bước 3. */
  amount154Direct: number;
  totalAmountIncurred: number;
  quantity: number;
  percentCompleted: number;
  closingIncompleteQty: number;
  amountResult621: number;
  amountResult62N: number;
  closingIncompleteAmount154: number;
  productReduce: number;
  totalCostPrice: number;
  unitCost: number;
  qHt: number;
  errors: string[];
};

/** Định nghĩa một bước trên sidebar. */
export type CostingStepDefinition = {
  /** Chỉ số bước 1–6 (sidebar không gồm bước 0). */
  index: 1 | 2 | 3 | 4 | 5 | 6;
  /** Mã nghiệp vụ ổn định. */
  code: string;
  /** Khóa i18n tiêu đề. */
  titleKey: string;
  /** Fallback tiếng Việt tiêu đề. */
  titleFallback: string;
  /** Khóa i18n mô tả phụ. */
  subKey: string;
  /** Fallback mô tả phụ. */
  subFallback: string;
  /** Nguồn xử lý: tái sử dụng B-I hay nghiệp vụ G-K. */
  engine: "BI" | "GK";
};

/** Cảnh báo kiểm tra dữ liệu đầu vào. */
export type CostingWarning = {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  departmentId?: number;
  productId?: number;
};

/** Đối tượng tập hợp chi phí / thành phẩm trên lưới bước 0. */
export type CostObjectCandidate = {
  departmentId: number;
  departmentCd: string;
  departmentName: string;
  productId: number | null;
  productCd: string | null;
  productName: string | null;
  finishedQty: number;
  receiptCount: number;
  hasWarning: boolean;
  warningText: string;
  selected: boolean;
};

/** Khoản khấu hao / CPTT xem trước bước 1. */
export type FaPrepaidPreviewRow = {
  id: number;
  assetCd: string;
  assetName: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  note: string;
};

/** Dòng chi phí nguồn 622/627. */
export type CostSourceRow = {
  chitDetailId: number;
  accountCd: string;
  voucherNo: string;
  voucherDate: string;
  departmentId: number;
  departmentCd: string;
  amount: number;
  /** true = đã gắn đối tượng; false = dùng chung cần phân bổ. */
  isDirect: boolean;
};

/** Kết quả phân bổ theo đối tượng. */
export type AllocationResultRow = {
  departmentId: number;
  productCd: string;
  productName: string;
  ratePercent: number;
  direct622: number;
  direct627: number;
  alloc622: number;
  alloc627: number;
  adjustment: number;
  total: number;
};

/** Dòng tập hợp chi phí bước 3/4. */
export type CostAggregateRow = {
  departmentId: number;
  productId: number;
  productCd: string;
  productName: string;
  amount621: number;
  amount6212: number;
  amount622: number;
  amount627: number;
  amount154Direct: number;
  periodCost: number;
  openingWip: number;
  closingWip: number;
  finishedQty: number;
  finishedCost: number;
  unitCost: number;
};

/** Phiếu nhập thành phẩm liên kết INPUT_ID. */
export type ReceiptUpdateRow = {
  inputId: number;
  inventoryNo: string;
  receiptDate: string;
  productCd: string;
  qty: number;
  oldUnitPrice: number;
  oldAmount: number;
  newUnitPrice: number;
  newAmount: number;
  deltaAmount: number;
  posted: boolean;
  finishedCost: number;
  finishedQty: number;
};

/** Dòng xuất bán / giá vốn bước 5. */
export type ValuationSaleRow = {
  saleNo: string;
  productCd: string;
  productName: string;
  openingQty: number;
  openingUnitCost: number;
  periodInQty: number;
  periodInUnitCost: number;
  soldQty: number;
  currentCogs: number;
  proposedCogs: number;
  method: string;
  status: string;
};

/** Điều kiện checklist bước 6. */
export type ProfitLossCondition = {
  id: string;
  label: string;
  ok: boolean;
};

/** Một dòng nhật ký thao tác demo. */
export type CostingLogItem = {
  at: string;
  message: string;
};

/** Tiến độ job giả lập. */
export type CostingJobProgressState = {
  running: boolean;
  percent: number;
  message: string;
};

/** Tổng quan kỳ G-K trả về từ API (mock hoặc thật). */
export type ProductionCostingOverview = {
  companyCd: string;
  periodYm: string;
  demoMode: false;
  periodExists: boolean;
  statusMessage: string;
  runId: number | null;
  runVersion: number | null;
  costEngine: string;
  cogsRule: string;
  monthStatus: PeriodMonthStatus;
  faPrepaidStatus: SharedLockStepStatus;
  allocationStatus: AllocationStatus;
  cogsSummaryStatus: SharedLockStepStatus;
  costRunStatus: CostRunStatus;
  valuationStatus: ValuationStatus;
  profitLossStatus: SharedLockStepStatus;
  activeStep: CostingStepIndex;
  /** true khi bước tương ứng đang DONE (tương thích FE-01→03). */
  doneFlags: boolean[];
  /** Trạng thái chạy từng bước 1–6 (index 0 = bước 1). */
  stepStatuses: CostingStepRunStatus[];
  /** Metadata hoàn thành / mở lại từng bước. */
  stepMetas: Array<CostingStepMeta | null>;
  /** Lịch sử thao tác theo bước (mock). */
  stepHistory: CostingStepHistoryItem[];
  /** Bảng so sánh cũ/mới sau tính thử khi đang REOPENED. */
  compareRows: CostingCompareRow[];
  /** Bật mô phỏng lỗi ghi nhận lần kế tiếp (DEMO). */
  armWriteFailure: boolean;
  stats: {
    objectCount: number;
    productCount: number;
    receiptCount: number;
    warningCount: number;
    doneStepCount: number;
  };
  warnings: CostingWarning[];
  objects: CostObjectCandidate[];
  logs: CostingLogItem[];
  job: CostingJobProgressState;
  /** @deprecated FE cũ — giữ tương thích, không dùng cho công thức mới. */
  allocationRateA01: number;
  allocationPreviewed: boolean;
  step3Checked: boolean;
  costPreviewed: boolean;
  step6Checked: boolean;
  /** true nếu đã từng POST bước 4 — giữ đơn giá kể cả khi REOPENED. */
  hasPostedCosting: boolean;
  /** true nếu đã từng xác nhận bước 5. */
  hasPostedValuation: boolean;
  sharedLabor: number;
  sharedOverhead: number;
  faRows: FaPrepaidPreviewRow[];
  sourceRows: CostSourceRow[];
  /** Kết quả dạng cũ (tương thích). */
  allocationRows: AllocationResultRow[];
  /** Bảng trên — pool 622/627 theo công thức tài liệu. */
  allocationPoolRows: AllocationPoolRow[];
  /** Bảng dưới — phân bổ theo từng mã TP. */
  allocationProductRows: AllocationProductDetailRow[];
  /** allocate_type: 0 = NVL chính, 1 = SL TP nhập kho. */
  allocateType: AllocateType;
  /** Setting mock is622_627_byDepartment. */
  is622_627_byDepartment: boolean;
  /** Setting mock is6212 — đưa TK 6212 vào pool. */
  is6212: boolean;
  /** Số chữ số làm tròn (NUMBER_DIGIT). */
  allocationNumberDigit: number;
  aggregateRows: CostAggregateRow[];
  /** Lưới chi tiết dở dang Bước 4. */
  wipDetailRows: WipDetailRow[];
  receiptRows: ReceiptUpdateRow[];
  valuationRows: ValuationSaleRow[];
  profitLossConditions: ProfitLossCondition[];
  wipMethod: WipMethod;
  incompleteConfig: IncompleteCostConfigView;
  allocationMethod: AllocationMethod;
};

/** Định nghĩa 6 bước sidebar. */
export const COSTING_STEPS: CostingStepDefinition[] = [
  {
    index: 1,
    code: "FA_PREPAID_LOCK",
    titleKey: "GK_STEP1_TITLE",
    titleFallback: "Khóa sổ bước 1",
    subKey: "GK_STEP1_SUB",
    subFallback: "TSCĐ / CP trả trước",
    engine: "BI",
  },
  {
    index: 2,
    code: "COST_ALLOCATION",
    titleKey: "GK_STEP2_TITLE",
    titleFallback: "Phân bổ 622 / 627",
    subKey: "GK_STEP2_SUB",
    subFallback: "Theo đối tượng giá thành",
    engine: "GK",
  },
  {
    index: 3,
    code: "COGS_SUMMARY",
    titleKey: "GK_STEP3_TITLE",
    titleFallback: "Khóa chi phí sản xuất",
    subKey: "GK_STEP3_SUB",
    subFallback: "621, 622, 627 → 154",
    engine: "GK",
  },
  {
    index: 4,
    code: "COSTING_POST",
    titleKey: "GK_STEP4_TITLE",
    titleFallback: "Tính & ghi nhận giá thành",
    subKey: "GK_STEP4_SUB",
    subFallback: "Dở dang → 155/154",
    engine: "GK",
  },
  {
    index: 5,
    code: "COGS_RECONCILIATION",
    titleKey: "GK_STEP5_TITLE",
    titleFallback: "Tính lại & đối chiếu giá xuất",
    subKey: "GK_STEP5_SUB",
    subFallback: "Xuất bán → 632/155",
    engine: "GK",
  },
  {
    index: 6,
    code: "PROFIT_LOSS_REPORT",
    titleKey: "GK_STEP6_TITLE",
    titleFallback: "Khóa sổ bước 3",
    subKey: "GK_STEP6_SUB",
    subFallback: "Lãi/lỗ, chốt tháng",
    engine: "BI",
  },
];
