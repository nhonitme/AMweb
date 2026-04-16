import type { CompanyInfo } from "@/types/companyInfo";

export type CompanyInfoEditorType = "dxDateBox" | "dxNumberBox" | "dxTextBox" | "dxTextBox";

export type CompanyInfoFieldConfig = {
  key: keyof CompanyInfo;
  label: string;
  labelKey: string;
  editorType?: CompanyInfoEditorType;
  colSpan?: number;
  readOnly?: boolean;
};

export type CompanyInfoFieldGroup = {
  key: string;
  titleKey: string;
  title: string;
  items: CompanyInfoFieldConfig[];
};

type TranslateFn = (key: string, fallback?: string) => string;

export function createCompanyInfoFieldGroups(translate: TranslateFn): CompanyInfoFieldGroup[] {
  return [
    {
      key: "identity",
      titleKey: "BASE_INFO",
      title: translate("BASE_INFO", "General information"),
      items: [
        { key: "COMPANY_CD", labelKey: "COMPANY_CD", label: translate("COMPANY_CD", "Company code"), readOnly: true },
        { key: "COMPANY_NM", labelKey: "COMPANY_NM", label: translate("COMPANY_NM", "Company name") },
        { key: "COMPANY_NM_EN", labelKey: "COMPANY_NM_EN", label: translate("COMPANY_NM_EN", "Company name (EN)") },
        { key: "COMPANY_NM_KOR", labelKey: "COMPANY_NM_KOR", label: translate("COMPANY_NM_KOR", "Company name (KO)") },
        { key: "OWNER_NM", labelKey: "OWNER_NM", label: translate("OWNER_NM", "Representative") },
        { key: "DE_COMPANY_CD", labelKey: "DE_COMPANY_CD", label: translate("DE_COMPANY_CD", "Parent company code") },
        { key: "COMPANY_TYPE", labelKey: "COMPANY_TYPE", label: translate("COMPANY_TYPE", "Company type"), editorType: "dxNumberBox" },
        { key: "COMPANY_KIND", labelKey: "COMPANY_KIND", label: translate("COMPANY_KIND", "Company category"), editorType: "dxNumberBox" },
        { key: "COMPANY_LV", labelKey: "COMPANY_LV", label: translate("COMPANY_LV", "Company level") },
        { key: "DECISION", labelKey: "DECISION", label: translate("DECISION", "Decision") },
      ],
    },
    {
      key: "tax",
      titleKey: "MCCQT",
      title: translate("MCCQT", "Tax and legal"),
      items: [
        { key: "TAX_CD", labelKey: "TAX_CD", label: translate("TAX_CD", "Tax code") },
        { key: "ACCDATE_CD", labelKey: "ACCDATE_CD", label: translate("ACCDATE_CD", "Accounting period code") },
        { key: "CCCDan", labelKey: "CCCDAN", label: translate("CCCDan", "Căn cước công dân") },
        { key: "TCQTQLy", labelKey: "TCQTQLy", label: translate("TCQTQLy", "Tax authority") },
        { key: "MCQTQLy", labelKey: "MCQTQLy", label: translate("MCQTQLy", "Tax authority code") },
        { key: "BRN", labelKey: "BRN", label: translate("BRN", "Business registration number") },
        { key: "CRN", labelKey: "CRN", label: translate("CRN", "Corporate registration number") },
        { key: "OPEN_YMD", labelKey: "OPEN_YMD", label: translate("OPEN_YMD", "Open date"), editorType: "dxDateBox" },
        { key: "CARRYFORWARD_YMD", labelKey: "CARRYFORWARD_YMD", label: translate("CARRYFORWARD_YMD", "Carry forward date"), editorType: "dxDateBox" },
        { key: "STOCKCALC_TYPE", labelKey: "STOCKCALC_TYPE", label: translate("STOCKCALC_TYPE", "Inventory calculation method") },
      ],
    },
    {
      key: "address",
      titleKey: "COMPANY_INFO_ADDRESS",
      title: translate("COMPANY_INFO_ADDRESS", "Address"),
      items: [
        { key: "ZIP_CODE", labelKey: "ZIP_CODE", label: translate("ZIP_CODE", "Zip code") },
        { key: "SIDO", labelKey: "SIDO", label: translate("SIDO", "Province/City") },
        { key: "GUMYUN", labelKey: "GUMYUN", label: translate("GUMYUN", "District") },
        { key: "ADDRESS_DO", labelKey: "ADDRESS_DO", label: translate("ADDRESS_DO", "Address area") },
        { key: "ADDRESS", labelKey: "ADDRESS", label: translate("ADDRESS", "Address"), editorType: "dxTextBox", colSpan: 2 },
        { key: "ADDRESS_ENG", labelKey: "ADDRESS_ENG", label: translate("ADDRESS_ENG", "Address (EN)"), editorType: "dxTextBox", colSpan: 2 },
        { key: "ADDRESS_KOR", labelKey: "ADDRESS_KOR", label: translate("ADDRESS_KOR", "Address (KO)"), editorType: "dxTextBox", colSpan: 2 },
      ],
    },
    {
      key: "contact",
      titleKey: "COMPANY_INFO_CONTACT",
      title: translate("COMPANY_INFO_CONTACT", "Contact"),
      items: [
        { key: "TEL", labelKey: "TEL", label: translate("TEL", "Phone") },
        { key: "EMAIL", labelKey: "EMAIL", label: translate("EMAIL", "Email") },
        { key: "WEBSITE", labelKey: "WEBSITE", label: translate("WEBSITE", "Website") },
        { key: "FAX", labelKey: "FAX", label: translate("FAX", "Fax") },
      ],
    },
    {
      key: "business",
      titleKey: "COMPANY_INFO_BUSINESS",
      title: translate("COMPANY_INFO_BUSINESS", "Business"),
      items: [
        { key: "BUSINESS_TYPE", labelKey: "BUSINESS_TYPE", label: translate("BUSINESS_TYPE", "Business type") },
        { key: "KIND_BUSINESS", labelKey: "KIND_BUSINESS", label: translate("KIND_BUSINESS", "Business category") },
        { key: "NOTE", labelKey: "NOTE", label: translate("NOTE", "Note"), editorType: "dxTextBox", colSpan: 2 },
      ],
    },
  ];
}
