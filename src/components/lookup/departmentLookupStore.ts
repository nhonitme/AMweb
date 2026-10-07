import { fetchDepartmentLookup } from "@/api/lookupApi"
import type { DepartmentInfo } from "@/types/departmentInfo"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache: clearIdCache } = createLookupStore<DepartmentInfo>("DEPARTMENT_ID", fetchDepartmentLookup)

const { store: departmentCodeLookupStore, clearCache: clearCodeCache } = createLookupStore<DepartmentInfo>(
  "DEPARTMENT_CD",
  async () => {
    const rows = await store.load()
    return Array.isArray(rows) ? (rows as DepartmentInfo[]) : []
  },
)

export const departmentLookupStore = store
export { departmentCodeLookupStore }

export const clearDepartmentLookupCache = () => {
  clearIdCache()
  clearCodeCache()
}
