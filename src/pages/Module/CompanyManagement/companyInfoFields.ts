import type { CompanyInfoOptionsKey } from "./companyInfoOptions";
import type { CompanyInfo } from "@/types/companyInfo";

export type CompanyInfoEditorType = "dxDateBox" | "dxSelectBox" | "dxTextArea" | "dxTextBox";

export type CompanyInfoFieldConfig = {
  key: keyof CompanyInfo;
  label: string;
  labelKey: string;
  editorType?: CompanyInfoEditorType;
  optionsKey?: CompanyInfoOptionsKey;
  colSpan?: 2 | 3 | 4 | 5 | 6 | 8 | 12;
  readOnly?: boolean;
  required?: boolean;
  showWhen?: (form: CompanyInfo) => boolean;
};

export type CompanyInfoFieldGroup = {
  key: string;
  titleKey: string;
  title: string;
  /** When true, section starts expanded. Others start collapsed. */
  defaultExpanded?: boolean;
  items: CompanyInfoFieldConfig[];
};

type TranslateFn = (key: string, fallback?: string) => string;

export function createCompanyInfoFieldGroups(translate: TranslateFn): CompanyInfoFieldGroup[] {
  const t = (key: string, fallback: string) => translate(key, fallback);

  return [
    {
      key: "identity",
      titleKey: "BASE_INFO",
      title: t("BASE_INFO", "Thông tin chung"),
      defaultExpanded: true,
      items: [
        { key: "TAX_CD", labelKey: "TAX_CD", label: t("TAX_CD", "Mã số thuế"), colSpan: 4, required: true, readOnly: true },
        { key: "COMPANY_NM", labelKey: "COMPANY_NM", label: t("COMPANY_NM", "Tên công ty"), colSpan: 8, required: true, readOnly: true },
        { key: "ADDRESS", labelKey: "ADDRESS", label: t("ADDRESS", "Địa chỉ"), colSpan: 12, readOnly: true },
      ],
    },
    {
      key: "tax",
      titleKey: "COMPANY_INFO_TAX",
      title: t("COMPANY_INFO_TAX", "Thuế & đăng ký"),
      items: [
        { key: "OWNER_NM", labelKey: "OWNER_NM", label: t("OWNER_NM", "Người đại diện"), colSpan: 4 },
        { key: "COMPANY_NM_EN", labelKey: "COMPANY_NM_EN", label: t("COMPANY_NM_EN", "Tên công ty (EN)"), colSpan: 8 },
        { key: "CCCDan", labelKey: "CCCDAN", label: t("CCCDan", "CCCD"), colSpan: 4 },
        { key: "OPEN_YMD", labelKey: "OPEN_YMD", label: t("OPEN_YMD", "Ngày thành lập"), editorType: "dxDateBox", colSpan: 4 },
        { key: "BRN", labelKey: "BRN", label: t("BRN", "Số ĐKKD"), colSpan: 4 },
        { key: "CRN", labelKey: "CRN", label: t("CRN", "Số ĐKDN"), colSpan: 4 },
        { key: "MCQTQLy", labelKey: "MCQTQLy", label: t("MCQTQLy", "MCQTQLY"), colSpan: 4 },
        { key: "TCQTQLy", labelKey: "TCQTQLy", label: t("TCQTQLy", "Cơ quan thuế quản lý"), colSpan: 8 },
      ],
    },
    {
      key: "address",
      titleKey: "COMPANY_INFO_ADDRESS",
      title: t("COMPANY_INFO_ADDRESS", "Địa chỉ chi tiết"),
      items: [
        { key: "ZIP_CODE", labelKey: "ZIP_CODE", label: t("ZIP_CODE", "Mã bưu điện"), colSpan: 2 },
        { key: "SIDO", labelKey: "SIDO", label: t("SIDO", "Tỉnh/Thành phố"), colSpan: 5 },
        { key: "GUMYUN", labelKey: "GUMYUN", label: t("GUMYUN", "Quận/Huyện"), colSpan: 5 },
        { key: "ADDRESS_ENG", labelKey: "ADDRESS_ENG", label: t("ADDRESS_ENG", "Địa chỉ (EN)"), colSpan: 12 },
      ],
    },
    {
      key: "contact",
      titleKey: "COMPANY_INFO_CONTACT",
      title: t("COMPANY_INFO_CONTACT", "Liên hệ"),
      items: [
        { key: "TEL", labelKey: "TEL", label: t("TEL", "Điện thoại"), colSpan: 3 },
        { key: "FAX", labelKey: "FAX", label: t("FAX", "Fax"), colSpan: 3 },
        { key: "EMAIL", labelKey: "EMAIL", label: t("EMAIL", "Email"), colSpan: 3 },
        { key: "WEBSITE", labelKey: "WEBSITE", label: t("WEBSITE", "Website"), colSpan: 3 },
      ],
    },
    {
      key: "accounting",
      titleKey: "COMPANY_INFO_ACCOUNTING",
      title: t("COMPANY_INFO_ACCOUNTING", "Kế toán"),
      items: [
        {
          key: "CARRYFORWARD_YMD",
          labelKey: "CARRYFORWARD_YMD",
          label: t("CARRYFORWARD_YMD", "Ngày bắt đầu kỳ kế toán"),
          editorType: "dxDateBox",
          colSpan: 3,
        },
        { key: "ACCDATE_CD", labelKey: "ACCDATE_CD", label: t("ACCDATE_CD", "Năm tài chính"), colSpan: 3 },
        {
          key: "DECISION",
          labelKey: "DECISION",
          label: t("DECISION", "Thông tư"),
          editorType: "dxSelectBox",
          optionsKey: "decision",
          colSpan: 3,
        },
        {
          key: "STOCKCALC_TYPE",
          labelKey: "STOCKCALC_TYPE",
          label: t("STOCKCALC_TYPE", "Tính tồn kho"),
          editorType: "dxSelectBox",
          optionsKey: "stockCalcType",
          colSpan: 3,
        },
      ],
    },
    {
      key: "business",
      titleKey: "COMPANY_INFO_BUSINESS",
      title: t("COMPANY_INFO_BUSINESS", "Kinh doanh"),
      items: [
        { key: "BUSINESS_TYPE", labelKey: "BUSINESS_TYPE", label: t("BUSINESS_TYPE", "Ngành nghề"), colSpan: 6 },
        { key: "KIND_BUSINESS", labelKey: "KIND_BUSINESS", label: t("KIND_BUSINESS", "Lĩnh vực"), colSpan: 6 },
        { key: "NOTE", labelKey: "NOTE", label: t("NOTE", "Ghi chú"), colSpan: 12 },
      ],
    },
    {
      key: "other",
      titleKey: "COMPANY_INFO_OTHER",
      title: t("COMPANY_INFO_OTHER", "Thông tin khác"),
      items: [
        { key: "COMPANY_NM_KOR", labelKey: "COMPANY_NM_KOR", label: t("COMPANY_NM_KOR", "Tên công ty (KO)"), colSpan: 6 },
        { key: "ADDRESS_DO", labelKey: "ADDRESS_DO", label: t("ADDRESS_DO", "Mã tỉnh/thành"), colSpan: 6 },
        { key: "ADDRESS_KOR", labelKey: "ADDRESS_KOR", label: t("ADDRESS_KOR", "Địa chỉ (KO)"), editorType: "dxTextArea", colSpan: 12 },
      ],
    },
  ];
}
