/** Bật/tắt tạm các mục UI chưa sẵn sàng. */
export const SHOW_NOTIFICATIONS = false;
export const SHOW_USER_GUIDE = false;

/** Company được xem UI Guidelines cả ở bản build (không chỉ DEV). */
export const UI_GUIDELINES_COMPANY_CD = "0001";

/** Hiện menu/route UI Guidelines khi DEV hoặc company_cd = 0001. */
export function canShowUiGuidelines(companyCd?: string | null): boolean {
  if (import.meta.env.DEV) {
    return true;
  }

  return String(companyCd ?? "").trim().toUpperCase() === UI_GUIDELINES_COMPANY_CD;
}
