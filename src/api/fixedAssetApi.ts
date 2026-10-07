import axios from './axiosClient'
import API_BASE_URL from '../config/apiConfig'
import { getApiArrayPayload, getApiObjectPayload, logApiError } from './apiTypes'
import type {
  FixedAssetDetailResponse,
  FixedAssetDepreciationPreviewRequest,
  FixedAssetDepreciationPreviewResponse,
  FixedAssetListItem,
  FixedAssetSaveRequest,
} from '@/types/fixedAsset'

const BASE_URL = `${API_BASE_URL}/fixed-assets`

export type FixedAssetListQuery = {
  status?: string
  accCd?: string
}

export async function getFixedAssets(query?: FixedAssetListQuery): Promise<FixedAssetListItem[]> {
  try {
    const params: Record<string, string> = {}
    const status = query?.status?.trim()
    const accCd = query?.accCd?.trim()

    if (status) {
      params.status = status
    }

    if (accCd) {
      params.accCd = accCd
    }

    const resp = await axios.get(BASE_URL, {
      params: Object.keys(params).length > 0 ? params : undefined,
    })
    return getApiArrayPayload<FixedAssetListItem>(resp.data)
  } catch (error) {
    logApiError('Error in getFixedAssets:', error)
    throw error
  }
}

export async function getFixedAssetById(assetId: number): Promise<FixedAssetDetailResponse> {
  try {
    const resp = await axios.get(`${BASE_URL}/${assetId}`)
    return getApiObjectPayload<FixedAssetDetailResponse>(resp.data)
  } catch (error) {
    logApiError('Error in getFixedAssetById:', error)
    throw error
  }
}

export async function createFixedAsset(request: FixedAssetSaveRequest): Promise<number> {
  try {
    const resp = await axios.post(BASE_URL, request)
    const payload = getApiObjectPayload<{ ASSET_ID?: number }>(resp.data)
    return Number(payload.ASSET_ID ?? 0)
  } catch (error) {
    logApiError('Error in createFixedAsset:', error)
    throw error
  }
}

export async function updateFixedAsset(assetId: number, request: FixedAssetSaveRequest): Promise<boolean> {
  try {
    const resp = await axios.put(`${BASE_URL}/${assetId}`, request)
    return Boolean(getApiObjectPayload<boolean>(resp.data))
  } catch (error) {
    logApiError('Error in updateFixedAsset:', error)
    throw error
  }
}

export async function deleteFixedAssets(assetIds: number[]): Promise<boolean> {
  try {
    await Promise.all(assetIds.map((assetId) => axios.delete(`${BASE_URL}/${assetId}`)))
    return true
  } catch (error) {
    logApiError('Error in deleteFixedAssets:', error)
    throw error
  }
}

export async function previewFixedAssetDepreciation(
  request: FixedAssetDepreciationPreviewRequest,
  options?: { signal?: AbortSignal },
): Promise<FixedAssetDepreciationPreviewResponse> {
  try {
    const resp = await axios.post(`${BASE_URL}/depreciation/preview`, request, {
      signal: options?.signal,
    })
    return getApiObjectPayload<FixedAssetDepreciationPreviewResponse>(resp.data)
  } catch (error) {
    logApiError('Error in previewFixedAssetDepreciation:', error)
    throw error
  }
}

export async function exportFixedAssetsToExcel(options?: {
  assetId?: number
  status?: string
  accCd?: string
  lang?: string
}, abortSignal?: AbortSignal): Promise<Blob> {
  try {
    const params: Record<string, string | number> = {}
    if (options?.assetId && options.assetId > 0) {
      params.assetId = options.assetId
    }
    const status = options?.status?.trim()
    if (status) {
      params.status = status
    }
    const accCd = options?.accCd?.trim()
    if (accCd) {
      params.accCd = accCd
    }
    if (options?.lang) {
      params.lang = options.lang
    }

    const resp = await axios.get(`${BASE_URL}/export`, {
      params: Object.keys(params).length > 0 ? params : undefined,
      signal: abortSignal, responseType: 'blob',
    })
    return resp.data as Blob
  } catch (error) {
    logApiError('Error in exportFixedAssetsToExcel:', error)
    throw error
  }
}
