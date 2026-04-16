import { getEtData } from "@/api/systemApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { AcclistInfo } from "@/types/acclist"
import type { etcData } from "@/types/etcData"
import { getCurrentLangCode } from "@/utils/language"
import { createLookupStore } from "./createLookupStore"

const normalizeChitDetail = (record: etcData): Partial<AcclistInfo> => ({
  ACC_CD: String((record as any).CD ?? "").trim(),
  ACCTITLE_NM_VIET: String((record as any).NM_VIET ?? "").trim(),
  ACCTITLE_NM_ENG: String((record as any).NM_ENG ?? "").trim(),
  ACCTITLE_NM_KOR: String((record as any).NM_KOR ?? "").trim(),
  ACCTITLE_NM_CHINA: String((record as any).NM_CHINA ?? "").trim()
})

async function loadAcclists(): Promise<AcclistInfo[]> {
  const response = await getEtData("0")
  const payload = (response as any)?.data ?? (response as any) ?? []
  return (Array.isArray(payload) ? payload : []).map((item: any) => normalizeChitDetail(item)) as AcclistInfo[]
}

const { store, clearCache } = createLookupStore<AcclistInfo>(
  "ACC_CD",
  loadAcclists,
  () => `${getCurrentCompanyCd()}::${getCurrentLangCode()}`,
)

export const LookupStore = store
export const clearAcclistLookupCache = clearCache
