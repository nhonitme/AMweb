export type ManagementInfoField = {
  key: "MG_CD" | "MG_DESC_KOR" | "MG_DESC_ENG" | "MG_DESC_VIET" | "MG_CD_ROOT"
  caption: string
}

export const managementInfoFields: ManagementInfoField[] = [
  { key: "MG_CD", caption: "Management Code" },
    { key: "MG_DESC_KOR", caption: "Tên quản lý (KOR)" },
    { key: "MG_DESC_ENG", caption: "Tên quản lý (ENG)" },
    { key: "MG_DESC_VIET", caption: "Tên quản lý (VIET)" },
  { key: "MG_CD_ROOT", caption: "Mã quản lý gốc" },
]

export const managementInfoFieldGroups: Record<"basic" | "descriptions", ManagementInfoField["key"][]> = {
  basic: ["MG_CD", "MG_CD_ROOT"],
  descriptions: ["MG_DESC_KOR", "MG_DESC_ENG", "MG_DESC_VIET"],
}
