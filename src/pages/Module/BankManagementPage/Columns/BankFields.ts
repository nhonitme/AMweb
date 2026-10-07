export type BankFieldGroup = "basic" | "account" | "other"

export type BankField = {
  key: string
  caption: string
  colSpan?: number
}

export const bankFields: BankField[] = [
  { key: "BANK_CD", caption: "Bank Code" },
  { key: "BANK_NM", caption: "Bank Name" },
  { key: "ACC_CD", caption: "Account Code" },
  { key: "PASSBOOK_NM", caption: "Account Name" },
  { key: "ACCOUNT_NUM", caption: "Account Number" },
  { key: "CITAD_CODE", caption: "Citad Code" },
  { key: "REMARK", caption: "Remark", colSpan: 2 },
]

export const bankFieldGroups: Record<BankFieldGroup, string[]> = {
  basic: ["BANK_CD", "BANK_NM", "ACC_CD"],
  account: ["PASSBOOK_NM", "ACCOUNT_NUM", "CITAD_CODE"],
  other: ["REMARK"],
}
