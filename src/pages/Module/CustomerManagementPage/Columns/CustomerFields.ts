export type CustomerFieldGroup = "basic" | "names" | "contact" | "finance" | "other"

export type CustomerFieldKey =
  | "CUSTOMER_CD"
  | "CATEGORY_CD"
  | "CUSTOMER_TYPE"
  | "CUSTOMER_NM_VIET"
  | "CUSTOMER_NM_ENG"
  | "CUSTOMER_NM_KOR"
  | "CUSTOMER_NM_CHINA"
  | "TEL"
  | "FAX"
  | "EMAIL"
  | "ADDRESS"
  | "TAX_CD"
  | "BANK_ID"
  | "IDNUMBER"
  | "BUYER_NM"
  | "NOTE"

export type CustomerField = {
  key: CustomerFieldKey
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
  { key: "BANK_ID", caption: "Bank" },
  { key: "IDNUMBER", caption: "ID Number" },
  { key: "BUYER_NM", caption: "Buyer person" },
  { key: "NOTE", caption: "Note", colSpan: 2 },
]

export const requiredCustomerFields = new Set<CustomerFieldKey>([
  "CUSTOMER_CD",
  "CATEGORY_CD",
  "CUSTOMER_TYPE",
])

export const customerFieldGroups: Record<CustomerFieldGroup, CustomerFieldKey[]> = {
  basic: ["CUSTOMER_CD", "CATEGORY_CD", "CUSTOMER_TYPE"],
  // TAX_CD + ADDRESS are rendered with CUSTOMER_NM_VIET in CustomerIdentitySection
  names: ["CUSTOMER_NM_VIET"],
  contact: ["TEL", "FAX", "EMAIL"],
  finance: ["BANK_ID", "IDNUMBER", "BUYER_NM"],
  other: ["NOTE"],
}
