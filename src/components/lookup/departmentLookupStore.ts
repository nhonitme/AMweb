import { getDepartmentInfos } from "@/api/departmentInfoApi"
import { normalizeDepartmentInfoRows } from "@/pages/Module/DepartmentManagement/departmentInfoUtils"
import type { DepartmentInfo } from "@/types/departmentInfo"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<DepartmentInfo>("DEPARTMENT_ID", async () => {
  const response = await getDepartmentInfos()
  return normalizeDepartmentInfoRows(response.data || [])
})

export const departmentLookupStore = store
export const clearDepartmentLookupCache = clearCache
