/**
 * Engine phân bổ 622/627 — bám CONG_THUC_PHAN_BO_622_627.md / frmAllocateCosts.
 *
 * Phương pháp:
 * - allocate_type = 0: tiêu thức Amount_Quantity = Σ tiền Nợ 621 / Có 152 theo TP
 * - allocate_type = 1: tiêu thức Quantity = Σ SL nhập Nợ 155 / Có 154 theo TP
 *
 * Công thức chung (mục 6): Round(P_A × T_i / ΣT, d); dòng cuối nhận phần dư.
 * Biến thể byDepartment: phân bổ trong từng DEPARTMENT_CD với P_{A,D}.
 */

import type {
  AllocateType,
  AllocationPoolRow,
  AllocationProductDetailRow,
} from "../types/productionCostingTypes";

export type AllocationEngineOptions = {
  allocateType: AllocateType;
  /** is622_627_byDepartment */
  byDepartment: boolean;
  /** NUMBER_DIGIT — thường 0; byDepartment thường 2. */
  numberDigit: number;
  /** companyCd đặc biệt "3619": reduction = CREDIT_AMOUNT(A) */
  companyCd?: string;
};

/** Làm tròn theo số chữ số thập phân (giống Round trong WinForms). */
export function roundDigit(value: number, digit: number): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** Math.max(0, digit);
  return Math.round(value * f) / f;
}

/**
 * reduction(A) = CREDIT_AMOUNT(A) − DEBIT_AMOUNT_154(A)
 * Riêng company "3619": = CREDIT_AMOUNT(A)
 */
export function computeReduction(
  creditAmount: number,
  debitAmount154: number,
  companyCd?: string,
): number {
  if (companyCd === "3619") return roundDigit(creditAmount, 0);
  return roundDigit(creditAmount - debitAmount154, 0);
}

/** P_A = total_amount − reduction */
export function computeAllocationCosts(totalAmount: number, reduction: number): number {
  return roundDigit(totalAmount - reduction, 0);
}

/** Áp dụng lại reduction → allocationCosts trên pool (khi user sửa reduction). */
export function recalculatePoolFromReduction(pool: AllocationPoolRow[]): AllocationPoolRow[] {
  return pool.map((row) => ({
    ...row,
    allocationCosts: computeAllocationCosts(row.totalAmount, row.reduction),
  }));
}

/**
 * Tính lại reduction mặc định từ creditAmount / debitAmount154 rồi P_A.
 * Dùng khi tải dữ liệu nguồn lần đầu.
 */
export function refreshPoolDerivedFields(
  pool: AllocationPoolRow[],
  companyCd?: string,
): AllocationPoolRow[] {
  return pool.map((row) => {
    const reduction = computeReduction(row.creditAmount, row.debitAmount154, companyCd);
    return {
      ...row,
      reduction,
      allocationCosts: computeAllocationCosts(row.totalAmount, reduction),
    };
  });
}

function basisOf(row: AllocationProductDetailRow, allocateType: AllocateType): number {
  return allocateType === 0 ? row.amountQuantity : row.quantity;
}

function sum622(allocated: Record<string, number>): number {
  return Object.entries(allocated)
    .filter(([acc]) => acc.startsWith("622"))
    .reduce((s, [, v]) => s + v, 0);
}

function sum627(allocated: Record<string, number>): number {
  return Object.entries(allocated)
    .filter(([acc]) => acc.startsWith("627"))
    .reduce((s, [, v]) => s + v, 0);
}

/**
 * Phân bổ một nhóm sản phẩm với một tập pool (cùng phạm vi đối tượng hoặc toàn kỳ).
 * Dòng cuối nhận phần dư để Σ = P_A.
 */
function allocateGroup(
  pool: AllocationPoolRow[],
  products: AllocationProductDetailRow[],
  allocateType: AllocateType,
  numberDigit: number,
): AllocationProductDetailRow[] {
  if (products.length === 0) return [];

  const bases = products.map((p) => basisOf(p, allocateType));
  const totalBasis = bases.reduce((a, b) => a + b, 0);
  if (totalBasis === 0) {
    // ΣT = 0 → không phân bổ
    return products.map((p) => ({
      ...p,
      allocatedByAccount: Object.fromEntries(pool.map((r) => [r.accountCd, 0])),
      amount622: 0,
      amount627: 0,
    }));
  }

  const accountCds = pool.map((r) => r.accountCd);
  const results: AllocationProductDetailRow[] = products.map((p) => ({
    ...p,
    allocatedByAccount: {},
    amount622: 0,
    amount627: 0,
  }));

  for (const poolRow of pool) {
    const pA = poolRow.allocationCosts;
    let allocatedSum = 0;
    for (let i = 0; i < results.length; i += 1) {
      if (i === results.length - 1) {
        // Dòng cuối: phần dư
        results[i].allocatedByAccount[poolRow.accountCd] = roundDigit(pA - allocatedSum, numberDigit);
      } else {
        const share = roundDigit((pA * bases[i]) / totalBasis, numberDigit);
        results[i].allocatedByAccount[poolRow.accountCd] = share;
        allocatedSum += share;
      }
    }
  }

  // Đảm bảo mọi TK có key (kể cả 0)
  for (const row of results) {
    for (const acc of accountCds) {
      if (row.allocatedByAccount[acc] == null) row.allocatedByAccount[acc] = 0;
    }
    row.amount622 = roundDigit(sum622(row.allocatedByAccount), numberDigit);
    row.amount627 = roundDigit(sum627(row.allocatedByAccount), numberDigit);
  }

  return results;
}

/**
 * Chạy phân bổ đầy đủ theo options.
 * Khi byDepartment: group theo DEPARTMENT_CD, pool lọc cùng departmentCd (rỗng = dùng chung toàn bộ).
 */
export function runAllocation(
  pool: AllocationPoolRow[],
  products: AllocationProductDetailRow[],
  options: AllocationEngineOptions,
): AllocationProductDetailRow[] {
  const { allocateType, byDepartment, numberDigit } = options;

  if (!byDepartment) {
    return allocateGroup(pool, products, allocateType, numberDigit);
  }

  const deptSet = new Set(products.map((p) => p.departmentCd));
  const out: AllocationProductDetailRow[] = [];

  for (const dept of deptSet) {
    const prodGroup = products.filter((p) => p.departmentCd === dept);
    // Pool cùng đối tượng; nếu không có dòng theo ĐT thì lấy pool departmentCd rỗng / "(ALL)"
    let poolGroup = pool.filter((r) => r.departmentCd === dept);
    if (poolGroup.length === 0) {
      poolGroup = pool.filter((r) => !r.departmentCd || r.departmentCd === "(ALL)");
    }
    out.push(...allocateGroup(poolGroup, prodGroup, allocateType, numberDigit));
  }

  // Giữ thứ tự gốc theo products
  const byCd = new Map(out.map((r) => [r.productCd, r]));
  return products.map((p) => byCd.get(p.productCd) ?? p);
}

/** Tổng pool P_A theo prefix TK (622 / 627). */
export function sumPoolByPrefix(pool: AllocationPoolRow[], prefix: string): number {
  return pool.filter((r) => r.accountCd.startsWith(prefix)).reduce((s, r) => s + r.allocationCosts, 0);
}

/**
 * Kiểm chứng ví dụ mục 3.4 tài liệu (NVL).
 * Trả về true nếu khớp SP-A/SP-B với P_622=10M, P_627=5M, B=3M/7M.
 */
export function verifyDocExampleNvl(): { ok: boolean; detail: string } {
  const pool: AllocationPoolRow[] = [
    {
      id: "622",
      accountCd: "622",
      credit: "111",
      totalAmount: 10_000_000,
      fcAmount: 0,
      creditAmount: 0,
      debitAmount154: 0,
      reduction: 0,
      allocationCosts: 10_000_000,
      departmentCd: "(ALL)",
    },
    {
      id: "627",
      accountCd: "627",
      credit: "111",
      totalAmount: 5_000_000,
      fcAmount: 0,
      creditAmount: 0,
      debitAmount154: 0,
      reduction: 0,
      allocationCosts: 5_000_000,
      departmentCd: "(ALL)",
    },
  ];
  const products: AllocationProductDetailRow[] = [
    {
      productId: 1,
      productCd: "SP-A",
      productName: "A",
      departmentId: 1,
      departmentCd: "D1",
      amountQuantity: 3_000_000,
      quantity: 0,
      amount6211: 3_000_000,
      amount6212: 0,
      allocatedByAccount: {},
      amount622: 0,
      amount627: 0,
    },
    {
      productId: 2,
      productCd: "SP-B",
      productName: "B",
      departmentId: 2,
      departmentCd: "D2",
      amountQuantity: 7_000_000,
      quantity: 0,
      amount6211: 7_000_000,
      amount6212: 0,
      allocatedByAccount: {},
      amount622: 0,
      amount627: 0,
    },
  ];
  const result = runAllocation(pool, products, {
    allocateType: 0,
    byDepartment: false,
    numberDigit: 0,
  });
  const a = result[0];
  const b = result[1];
  const ok =
    a.allocatedByAccount["622"] === 3_000_000 &&
    b.allocatedByAccount["622"] === 7_000_000 &&
    a.allocatedByAccount["627"] === 1_500_000 &&
    b.allocatedByAccount["627"] === 3_500_000;
  return {
    ok,
    detail: `SP-A 622=${a.allocatedByAccount["622"]} 627=${a.allocatedByAccount["627"]}; SP-B 622=${b.allocatedByAccount["622"]} 627=${b.allocatedByAccount["627"]}`,
  };
}

/** Kiểm chứng ví dụ mục 4.4 (TP nhập kho). */
export function verifyDocExampleQty(): { ok: boolean; detail: string } {
  const pool: AllocationPoolRow[] = [
    {
      id: "622",
      accountCd: "622",
      credit: "111",
      totalAmount: 10_000_000,
      fcAmount: 0,
      creditAmount: 0,
      debitAmount154: 0,
      reduction: 0,
      allocationCosts: 10_000_000,
      departmentCd: "(ALL)",
    },
    {
      id: "627",
      accountCd: "627",
      credit: "111",
      totalAmount: 5_000_000,
      fcAmount: 0,
      creditAmount: 0,
      debitAmount154: 0,
      reduction: 0,
      allocationCosts: 5_000_000,
      departmentCd: "(ALL)",
    },
  ];
  const products: AllocationProductDetailRow[] = [
    {
      productId: 1,
      productCd: "SP-A",
      productName: "A",
      departmentId: 1,
      departmentCd: "D1",
      amountQuantity: 0,
      quantity: 200,
      amount6211: 0,
      amount6212: 0,
      allocatedByAccount: {},
      amount622: 0,
      amount627: 0,
    },
    {
      productId: 2,
      productCd: "SP-B",
      productName: "B",
      departmentId: 2,
      departmentCd: "D2",
      amountQuantity: 0,
      quantity: 800,
      amount6211: 0,
      amount6212: 0,
      allocatedByAccount: {},
      amount622: 0,
      amount627: 0,
    },
  ];
  const result = runAllocation(pool, products, {
    allocateType: 1,
    byDepartment: false,
    numberDigit: 0,
  });
  const a = result[0];
  const b = result[1];
  const ok =
    a.allocatedByAccount["622"] === 2_000_000 &&
    b.allocatedByAccount["622"] === 8_000_000 &&
    a.allocatedByAccount["627"] === 1_000_000 &&
    b.allocatedByAccount["627"] === 4_000_000;
  return {
    ok,
    detail: `SP-A 622=${a.allocatedByAccount["622"]} 627=${a.allocatedByAccount["627"]}; SP-B 622=${b.allocatedByAccount["622"]} 627=${b.allocatedByAccount["627"]}`,
  };
}
