export type CustomerFieldGroup = "basic" | "names" | "contact" | "finance" | "other"

export type CustomerField = {
  key: string
  caption: string
  colSpan?: number
}

export const customerFields: CustomerField[] = [
  { key: "CUSTOMER_CD", caption: "Customer Code" },
  { key: "CATEGORY_CD", caption: "Category" },
  { key: "CUSTOMER_TYPE", caption: "Customer Type" },
  { key: "CUSTOMER_NM_VIET", caption: "Customer Name (VI)" },
  { key: "CUSTOMER_NM_ENG", caption: "Customer Name (ENG)" },
  { key: "CUSTOMER_NM_KOR", caption: "Customer Name (KOR)" },
  { key: "CUSTOMER_NM_CHINA", caption: "Customer Name (CHN)" },
  { key: "TEL", caption: "Telephone" },
  { key: "FAX", caption: "Fax" },
  { key: "EMAIL", caption: "Email" },
  { key: "ADDRESS", caption: "Address", colSpan: 2 },
  { key: "TAX_CD", caption: "Tax Code" },
  { key: "BANK_CD", caption: "Bank Code" },
  { key: "IDNUMBER", caption: "ID Number" },
  { key: "NOTE", caption: "Note", colSpan: 2 },
]

export const customerFieldGroups: Record<CustomerFieldGroup, string[]> = {
  basic: ["CUSTOMER_CD", "CATEGORY_CD", "CUSTOMER_TYPE"],
  names: ["CUSTOMER_NM_VIET"],
  contact: ["TEL", "FAX", "EMAIL", "ADDRESS"],
  finance: ["TAX_CD", "BANK_CD", "IDNUMBER"],
  other: ["NOTE"],
}
