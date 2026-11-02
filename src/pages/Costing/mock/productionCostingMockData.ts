/**
 * Dữ liệu mẫu G-K (DEMO MODE).
 * Bước 2 dùng số liệu khớp ví dụ CONG_THUC_PHAN_BO_622_627.md:
 * - Pool P_622=10M, P_627=5M
 * - NVL: B = 3M / 7M (N621/C152)
 * - TPNK: Q = 200 / 800 (N155/C154)
 */

import type { AllocationPoolRow, AllocationProductDetailRow } from "../types/productionCostingTypes";

/** Thành phẩm mẫu dùng xuyên suốt 6 bước. */
export type MockProductItem = {
  departmentId: number;
  departmentCd: string;
  departmentName: string;
  productId: number;
  productCd: string;
  productName: string;
  /** Số lượng hoàn thành trong kỳ (bước 4). */
  finishedQty: number;
  /** Dở dang đầu kỳ (giá trị) = BEFORE_AMOUNT_154. */
  openingWip: number;
  /** SL dở dang đầu kỳ (INCOMPLETE_QUANTITY_154). */
  incompleteQtyOpening: number;
  /** 154 ĐK từ 621. */
  beforeAmountResult621: number;
  /** 154 ĐK từ 6212/622/627. */
  beforeAmountResult62N: number;
  /** Chi phí NVL 621 kỳ (AMOUNT_621) — nguồn, không gồm kết chuyển. */
  material621: number;
  /** Chi phí 6212 kỳ. */
  amount6212Period: number;
  /**
   * Tiêu thức NVL chính — Σ tiền xuất NVL Nợ 621 / Có 152 theo FINISHED_CD.
   * KHÔNG dùng tỷ lệ BOM lý thuyết.
   */
  amountQuantity621_152: number;
  /** Σ Nợ 6211 / Có 152. */
  amount6211: number;
  /** Σ Nợ 6212 / Có 152. */
  amount6212: number;
  /**
   * Tiêu thức TPNK — Σ SL nhập Nợ 155 / Có 154 (có thể khác finishedQty nếu nghiệp vụ tách).
   */
  allocQuantity155_154: number;
  /** Nhân công trực tiếp đã gắn đối tượng (không vào pool dùng chung). */
  directLabor622: number;
  /** SXC trực tiếp đã gắn đối tượng. */
  directOverhead627: number;
  receipts: Array<{ inputId: number; inventoryNo: string; receiptDate: string; qty: number }>;
  soldQty: number;
  saleNo: string;
  openingQty: number;
  openingUnitCost: number;
};

/** Tổng pool mặc định (sau reduction=0) — khớp ví dụ tài liệu. */
export const MOCK_SHARED_LABOR_622 = 10_000_000;
export const MOCK_SHARED_OVERHEAD_627 = 5_000_000;

/** Hai đối tượng / thành phẩm mẫu. */
export const MOCK_PRODUCTS: MockProductItem[] = [
  {
    departmentId: 101,
    departmentCd: "SX-A01",
    departmentName: "Tổ sản xuất bàn inox",
    productId: 1001,
    productCd: "TP-A01",
    productName: "Bàn inox",
    finishedQty: 1000,
    openingWip: 25_000_000,
    incompleteQtyOpening: 50,
    beforeAmountResult621: 20_000_000,
    beforeAmountResult62N: 5_000_000,
    material621: 85_000_000,
    amount6212Period: 0,
    amountQuantity621_152: 3_000_000,
    amount6211: 3_000_000,
    amount6212: 0,
    allocQuantity155_154: 200,
    directLabor622: 0,
    directOverhead627: 0,
    receipts: [
      { inputId: 3101, inventoryNo: "NKTP-1026-001", receiptDate: "08/10/2026", qty: 600 },
      { inputId: 3102, inventoryNo: "NKTP-1026-002", receiptDate: "24/10/2026", qty: 400 },
    ],
    soldQty: 300,
    saleNo: "XB-1026-011",
    openingQty: 100,
    openingUnitCost: 80_000,
  },
  {
    departmentId: 102,
    departmentCd: "SX-B02",
    departmentName: "Tổ sản xuất kệ công nghiệp",
    productId: 1002,
    productCd: "TP-B02",
    productName: "Kệ công nghiệp",
    finishedQty: 600,
    openingWip: 12_000_000,
    incompleteQtyOpening: 40,
    beforeAmountResult621: 10_000_000,
    beforeAmountResult62N: 2_000_000,
    material621: 50_000_000,
    amount6212Period: 0,
    amountQuantity621_152: 7_000_000,
    amount6211: 7_000_000,
    amount6212: 0,
    allocQuantity155_154: 800,
    directLabor622: 0,
    directOverhead627: 0,
    receipts: [
      { inputId: 3201, inventoryNo: "NKTP-1026-003", receiptDate: "14/10/2026", qty: 400 },
      { inputId: 3202, inventoryNo: "NKTP-1026-004", receiptDate: "28/10/2026", qty: 200 },
    ],
    soldQty: 200,
    saleNo: "XB-1026-024",
    openingQty: 50,
    openingUnitCost: 90_000,
  },
];

/** Pool nguồn mặc định (bảng trên) — total khớp ví dụ; reduction tính từ credit/154. */
export function createDefaultAllocationPool(include6212 = false): AllocationPoolRow[] {
  const rows: AllocationPoolRow[] = [
    {
      id: "622|(ALL)",
      accountCd: "622",
      credit: "334",
      totalAmount: 10_000_000,
      fcAmount: 0,
      creditAmount: 0,
      debitAmount154: 0,
      reduction: 0,
      allocationCosts: 10_000_000,
      departmentCd: "(ALL)",
    },
    {
      id: "627|(ALL)",
      accountCd: "627",
      credit: "214",
      totalAmount: 5_000_000,
      fcAmount: 0,
      creditAmount: 0,
      debitAmount154: 0,
      reduction: 0,
      allocationCosts: 5_000_000,
      departmentCd: "(ALL)",
    },
  ];
  if (include6212) {
    rows.push({
      id: "6212|(ALL)",
      accountCd: "6212",
      credit: "152",
      totalAmount: 1_000_000,
      fcAmount: 0,
      creditAmount: 0,
      debitAmount154: 0,
      reduction: 0,
      allocationCosts: 1_000_000,
      departmentCd: "(ALL)",
    });
  }
  return rows;
}

/** Dòng sản phẩm cho engine (bảng dưới) — tiêu thức từ chứng từ 621/152 và 155/154. */
export function createDefaultAllocationProducts(): AllocationProductDetailRow[] {
  return MOCK_PRODUCTS.map((p) => ({
    productId: p.productId,
    productCd: p.productCd,
    productName: p.productName,
    departmentId: p.departmentId,
    departmentCd: p.departmentCd,
    amountQuantity: p.amountQuantity621_152,
    quantity: p.allocQuantity155_154,
    amount6211: p.amount6211,
    amount6212: p.amount6212,
    allocatedByAccount: {},
    amount622: 0,
    amount627: 0,
  }));
}

/**
 * Đối tượng lỗi mẫu: sản phẩm nhóm 155 nhưng chưa gắn DEPARTMENT_ID.
 * Dùng để kiểm thử cảnh báo bước 0; không cho ghi nhận giá thành đối tượng lỗi.
 */
export const MOCK_ORPHAN_PRODUCT = {
  productId: 1099,
  productCd: "TP-X99",
  productName: "Thành phẩm thiếu đối tượng",
  division: "155",
};

/** Danh sách kỳ demo người dùng có thể chọn. */
export const MOCK_PERIOD_OPTIONS = [
  { value: "202610", text: "10/2026" },
  { value: "202609", text: "09/2026" },
  { value: "202611", text: "11/2026" },
];

/** Khấu hao / CPTT mẫu cho bước 1. */
export const MOCK_FA_PREPAID_ROWS = [
  {
    id: 1,
    assetCd: "TSCD-001",
    assetName: "Máy cắt CNC",
    debitAccount: "627",
    creditAccount: "214",
    amount: 8_000_000,
    note: "Khấu hao tháng — dữ liệu mẫu",
  },
  {
    id: 2,
    assetCd: "CPTT-012",
    assetName: "Chi phí sửa chữa phân bổ",
    debitAccount: "627",
    creditAccount: "242",
    amount: 5_000_000,
    note: "Phân bổ CPTT — dữ liệu mẫu",
  },
];
