export type CompanyInfoSelectOption = {
  value: string | number;
  label: string;
};

export type CompanyInfoOptionsKey =
  | "companyLv"
  | "companyType"
  | "companyKind"
  | "stockCalcType"
  | "decision";

type TranslateFn = (key: string, fallback?: string) => string;

export function createCompanyInfoSelectOptions(
  translate: TranslateFn,
): Record<CompanyInfoOptionsKey, CompanyInfoSelectOption[]> {
  const t = (key: string, fallback: string) => translate(key, fallback);

  return {
    companyLv: [
      { value: "1", label: t("COMPANY_LV_1", "Công ty kế toán dịch vụ") },
      { value: "2", label: t("COMPANY_LV_2", "Doanh nghiệp") },
    ],
    companyType: [
      { value: 0, label: t("COMPANY_TYPE_0", "Đa ngôn ngữ") },
      { value: 5, label: t("COMPANY_TYPE_5", "Một ngôn ngữ") },
    ],
    companyKind: [
      { value: 1, label: t("COMPANY_KIND_1", "Loại 1") },
      { value: 2, label: t("COMPANY_KIND_2", "Loại 2") },
    ],
    stockCalcType: [
      { value: "1", label: t("STOCKCALC_TYPE_1", "Bình quân cuối kỳ") },
      { value: "2", label: t("STOCKCALC_TYPE_2", "FIFO - Nhập trước, xuất trước") },
      { value: "3", label: t("STOCKCALC_TYPE_3", "LIFO - Nhập sau, xuất trước") },
      { value: "4", label: t("STOCKCALC_TYPE_4", "Bình quân tức thời") },
      { value: "5", label: t("STOCKCALC_TYPE_5", "Thực tế đích danh") },
    ],
    decision: [
      { value: "15", label: t("DECISION_15", "Thông tư 15") },
      { value: "48", label: t("DECISION_48", "Thông tư 48") },
      { value: "99", label: t("DECISION_99", "Thông tư 99") },
    ],
  };
}
