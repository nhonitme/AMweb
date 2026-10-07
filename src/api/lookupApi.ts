import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { getApiArrayPayload, getApiBooleanPayload } from "./apiTypes"
import type { ApiResponseEnvelope } from "./apiTypes"
import type { BankInfo } from "@/types/bankInfo"
import type { CustomerExt } from "@/types/customerExt"
import type { DepartmentInfo } from "@/types/departmentInfo"
import type { ManagementInfo } from "@/types/managementInfo"
import type { StoreInfo } from "@/types/store"
import type { StoreKindInfo } from "@/types/storeKind"
import type { Product } from "@/types/product"
import type { ProductKind } from "@/types/productKind"
import type { Unit } from "@/types/unit"

const BASE_URL = `${API_BASE_URL}/Lookup`

export async function fetchBankLookup(): Promise<BankInfo[]> {
  const resp = await axios.get(`${BASE_URL}/banks`)
  return getApiArrayPayload<BankInfo>(resp.data)
}

export async function fetchCustomerLookup(): Promise<CustomerExt[]> {
  const resp = await axios.get(`${BASE_URL}/customers`)
  return getApiArrayPayload<CustomerExt>(resp.data)
}

export async function fetchDepartmentLookup(): Promise<DepartmentInfo[]> {
  const resp = await axios.get(`${BASE_URL}/departments`)
  return getApiArrayPayload<DepartmentInfo>(resp.data)
}

export async function fetchManagementLookup(): Promise<ManagementInfo[]> {
  const resp = await axios.get(`${BASE_URL}/management`)
  return getApiArrayPayload<ManagementInfo>(resp.data)
}

export async function fetchStoreLookup(): Promise<StoreInfo[]> {
  const resp = await axios.get(`${BASE_URL}/stores`)
  return getApiArrayPayload<StoreInfo>(resp.data)
}

export async function fetchStoreKindLookup(): Promise<StoreKindInfo[]> {
  const resp = await axios.get(`${BASE_URL}/store-kinds`)
  return getApiArrayPayload<StoreKindInfo>(resp.data)
}

export async function fetchProductLookup(): Promise<Product[]> {
  const resp = await axios.get(`${BASE_URL}/products`)
  return getApiArrayPayload<Product>(resp.data)
}

export async function fetchProductKindLookup(): Promise<ProductKind[]> {
  const resp = await axios.get(`${BASE_URL}/product-kinds`)
  return getApiArrayPayload<ProductKind>(resp.data)
}

export async function fetchUnitLookup(): Promise<Unit[]> {
  const resp = await axios.get(`${BASE_URL}/units`)
  return getApiArrayPayload<Unit>(resp.data)
}

export type CountryLookup = {
  COUNTRY_ID: number
  COUNTRY_CD: string
  COUNTRY_NM: string
}

export async function fetchCountryLookup(): Promise<CountryLookup[]> {
  const resp = await axios.get(`${BASE_URL}/countries`)
  return getApiArrayPayload<CountryLookup>(resp.data)
}

export async function checkCodeExists(
  type: string,
  code: string,
  currentId?: number | null,
): Promise<boolean> {
  const params: Record<string, string | number> = { type, code }
  if (typeof currentId === "number" && Number.isFinite(currentId) && currentId > 0) {
    params.currentId = currentId
  }
  const resp = await axios.get<ApiResponseEnvelope<boolean>>(`${BASE_URL}/check-exists`, { params })
  return getApiBooleanPayload(resp.data as ApiResponseEnvelope<boolean>)
}
