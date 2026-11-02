/**
 * API client phân hệ G-K – Giá thành giản đơn.
 *
 * FE-01→FE-04: toàn bộ gọi chuyển sang mock store trong bộ nhớ.
 * Khi có backend, thay thân hàm bằng axios tới /api/production-costing/*.
 */

import type {
  AllocateType,
  CostingReopenInfo,
  CostingStepHistoryItem,
  CostingStepIndex,
  ProductionCostingOverview,
  WipMethod,
} from "@/pages/Costing/types/productionCostingTypes";
import {
  buildOverview,
  mockCheckStep3,
  mockCheckStep6,
  mockConfirmAllocation,
  mockConfirmValuation,
  mockGetReopenInfo,
  mockGetStepHistory,
  mockLockCogsTo154,
  mockLockProfitLoss,
  mockPatchWipRow,
  mockPostCosting,
  mockPreviewAllocation,
  mockPreviewCosting,
  mockPreviewValuation,
  mockReopenStep,
  mockResetDemo,
  mockRunFaPrepaidLock,
  mockSetActiveStep,
  mockSetAllocateType,
  mockSetArmWriteFailure,
  mockSetByDepartment,
  mockSetClosingWip,
  mockSetInclude6212,
  mockSetIncompletePreset,
  mockSetPeriod,
  mockSetPoolReduction,
  mockSetWipMethod,
  mockToggleObject,
  type WipPatchFields,
  subscribeProductionCostingMock,
  getProductionCostingMockSnapshot,
} from "@/pages/Costing/mock/productionCostingMockStore";

export const PRODUCTION_COSTING_DEMO_MODE = true as const;

export function subscribeProductionCosting(listener: () => void): () => void {
  return subscribeProductionCostingMock(listener);
}

export function getProductionCostingSnapshot(): ReturnType<typeof getProductionCostingMockSnapshot> {
  return getProductionCostingMockSnapshot();
}

export async function getProductionCostingOverview(
  _companyCd: string,
  _periodYm: string,
): Promise<ProductionCostingOverview> {
  return buildOverview();
}

export async function setProductionCostingPeriod(
  companyCd: string,
  periodYm: string,
): Promise<ProductionCostingOverview> {
  return mockSetPeriod(companyCd, periodYm);
}

export async function resetProductionCostingDemo(): Promise<ProductionCostingOverview> {
  return mockResetDemo();
}

export async function setProductionCostingActiveStep(
  step: CostingStepIndex,
): Promise<ProductionCostingOverview> {
  return mockSetActiveStep(step);
}

export async function toggleProductionCostObject(
  departmentId: number,
  selected: boolean,
): Promise<ProductionCostingOverview> {
  return mockToggleObject(departmentId, selected);
}

export async function runProductionCostingStep1(): Promise<ProductionCostingOverview> {
  return mockRunFaPrepaidLock();
}

/** Đổi phương pháp phân bổ: 0 = NVL (N621/C152), 1 = SL TP (N155/C154). */
export async function setAllocateType(allocateType: AllocateType): Promise<ProductionCostingOverview> {
  return mockSetAllocateType(allocateType);
}

/** Sửa điều chỉnh giảm trên dòng pool → tính lại P_A và phân bổ nếu đang preview. */
export async function setPoolReduction(
  poolRowId: string,
  reduction: number,
): Promise<ProductionCostingOverview> {
  return mockSetPoolReduction(poolRowId, reduction);
}

/** Bật/tắt is622_627_byDepartment. */
export async function setAllocationByDepartment(enabled: boolean): Promise<ProductionCostingOverview> {
  return mockSetByDepartment(enabled);
}

/** Bật/tắt đưa TK 6212 vào pool. */
export async function setAllocationInclude6212(enabled: boolean): Promise<ProductionCostingOverview> {
  return mockSetInclude6212(enabled);
}

/** Xem trước phân bổ 622/627 theo công thức tài liệu. */
export async function previewAllocation(): Promise<ProductionCostingOverview> {
  return mockPreviewAllocation();
}

/** Xác nhận phân bổ (ghi đè kết quả cũ). */
export async function confirmAllocation(): Promise<ProductionCostingOverview> {
  return mockConfirmAllocation();
}

export async function checkCostTransferPreconditions(): Promise<ProductionCostingOverview> {
  return mockCheckStep3();
}

export async function lockCostTransferTo154(): Promise<ProductionCostingOverview> {
  return mockLockCogsTo154();
}

/** @deprecated — dùng patchWipRow. */
export async function setClosingWipAmount(
  productIndex: number,
  amount: number,
): Promise<ProductionCostingOverview> {
  return mockSetClosingWip(productIndex, amount);
}

export async function setWipMethod(method: WipMethod): Promise<ProductionCostingOverview> {
  return mockSetWipMethod(method);
}

export async function setIncompleteCostPreset(presetKey: string): Promise<ProductionCostingOverview> {
  return mockSetIncompletePreset(presetKey);
}

export async function patchWipRow(
  productId: number,
  patch: WipPatchFields,
): Promise<ProductionCostingOverview> {
  return mockPatchWipRow(productId, patch);
}

export async function previewCostingRun(): Promise<ProductionCostingOverview> {
  return mockPreviewCosting();
}

export async function postCostingRun(): Promise<ProductionCostingOverview> {
  return mockPostCosting();
}

export async function previewValuation(): Promise<ProductionCostingOverview> {
  return mockPreviewValuation();
}

export async function confirmValuation(): Promise<ProductionCostingOverview> {
  return mockConfirmValuation();
}

export async function checkProfitLossPreconditions(): Promise<ProductionCostingOverview> {
  return mockCheckStep6();
}

export async function lockProfitLoss(): Promise<ProductionCostingOverview> {
  return mockLockProfitLoss();
}

/** FE-04: lấy thông tin điều kiện mở lại bước. */
export async function getReopenInfo(
  stepIndex: 1 | 2 | 3 | 4 | 5 | 6,
): Promise<CostingReopenInfo> {
  return mockGetReopenInfo(stepIndex);
}

/** FE-04: xác nhận mở lại bước (giữ số liệu cũ). */
export async function reopenCostingStep(
  stepIndex: 1 | 2 | 3 | 4 | 5 | 6,
  reason: string,
): Promise<ProductionCostingOverview> {
  return mockReopenStep(stepIndex, reason);
}

/** FE-04: lịch sử theo bước (hoặc toàn bộ). */
export async function getCostingStepHistory(
  stepIndex?: 1 | 2 | 3 | 4 | 5 | 6,
): Promise<CostingStepHistoryItem[]> {
  return mockGetStepHistory(stepIndex);
}

/** FE-04 DEMO: bật/tắt mô phỏng lỗi ghi nhận lần kế tiếp. */
export async function setArmWriteFailure(armed: boolean): Promise<ProductionCostingOverview> {
  return mockSetArmWriteFailure(armed);
}
