export type DepartmentFieldKey =
  | "DEPARTMENT_CD"
  | "DEP_NAME_KOR"
  | "DEP_NAME_ENG"
  | "DEP_NAME_VIET"
  | "DEP_NAME_CHINA"

export interface DepartmentField {
  key: DepartmentFieldKey
  caption: string
}

export const departmentFields: DepartmentField[] = [
  { key: "DEPARTMENT_CD", caption: "Department Code" },
  { key: "DEP_NAME_VIET", caption: "Department Name (VI)" },
  { key: "DEP_NAME_ENG", caption: "Department Name (EN)" },
  { key: "DEP_NAME_KOR", caption: "Department Name (KO)" },
  { key: "DEP_NAME_CHINA", caption: "Department Name (ZH)" },
]

export const departmentFieldGroups: Record<"basic" | "names", DepartmentFieldKey[]> = {
  basic: ["DEPARTMENT_CD"],
  names: ["DEP_NAME_VIET", "DEP_NAME_ENG", "DEP_NAME_KOR", "DEP_NAME_CHINA"],
}
