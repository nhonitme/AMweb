import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { getApiErrorMessage, getApiObjectPayload } from "./apiTypes"
import type { ApiResponseEnvelope } from "./apiTypes"
import { normalizeTaxCode } from "@/lib/taxCode"
import type { TaxLookupInfo } from "@/types/taxLookup"

const BASE_URL = `${API_BASE_URL}/Lookup`

function readTaxLookupText(source: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string") {
      return value.trim()
    }
  }
  return ""
}

/** Accept PascalCase / camelCase payloads from `/Lookup/tax-info`. */
export function normalizeTaxLookupInfo(payload: unknown): TaxLookupInfo {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
  return {
    OrgType: readTaxLookupText(source, "OrgType", "orgType"),
    TaxID: normalizeTaxCode(readTaxLookupText(source, "TaxID", "taxID", "taxId")),
    Name: readTaxLookupText(source, "Name", "name"),
    Address: readTaxLookupText(source, "Address", "address"),
    TaxDepartment: readTaxLookupText(source, "TaxDepartment", "taxDepartment"),
    Status: readTaxLookupText(source, "Status", "status"),
    UpdatedAt: readTaxLookupText(source, "UpdatedAt", "updatedAt"),
    MaCoQuanThue: readTaxLookupText(source, "MaCoQuanThue", "ma_co_quan_thue", "maCoQuanThue"),
  }
}

export async function fetchTaxLookupInfo(mst: string): Promise<TaxLookupInfo> {
  const normalizedMst = normalizeTaxCode(mst)
  if (!normalizedMst) {
    throw new Error("MST is required")
  }

  try {
    const resp = await axios.get<ApiResponseEnvelope<TaxLookupInfo>>(`${BASE_URL}/tax-info`, {
      params: { mst: normalizedMst },
    })
    const info = normalizeTaxLookupInfo(getApiObjectPayload(resp.data))
    if (!info.TaxID) {
      info.TaxID = normalizedMst
    }
    return info
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Không tra cứu được thông tin MST"))
  }
}
