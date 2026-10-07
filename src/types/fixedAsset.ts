export type AllocationType = 'PERCENT' | 'AMOUNT'
export type FixedAssetStatus = 'NOT_IN_USE' | 'IN_USE' | 'SUSPENDED' | 'SOLD'

export interface FixedAssetListItem {
  ASSET_ID: number
  COMPANY_CD: string
  ASSET_CD: string
  ASSET_NM: string
  ACC_CD?: string | null
  ACC_NM_VIET?: string | null
  ACC_NM_ENG?: string | null
  ACC_NM_KOR?: string | null
  ACC_NM_CHINA?: string | null
  USE_DEPT_CD?: string | null
  RECEIVE_YMD?: string | null
  USE_START_YMD: string
  DEPRE_START_YM: string
  DEPRE_END_YM: string
  USEFUL_LIFE_MONTH: number
  NORMAL_MONTH_COUNT: number
  ORIGINAL_AMT: number
  ACCUM_DEPRE_AMT: number
  REMAIN_DEPRE_AMT: number
  FIRST_DEPRE_AMT: number
  NORMAL_DEPRE_AMT: number
  LAST_DEPRE_AMT: number
  ACQ_CHIT_NO?: string | null
  STATUS: FixedAssetStatus | string
}

export interface FixedAsset extends FixedAssetListItem {
  ACQ_CHITINFO_ID?: number | null
  ACQ_CHITDETAIL_ID?: number | null
  NOTE?: string | null
}

export interface FixedAssetAllocation {
  ALLOC_ID?: number | null
  COMPANY_CD: string
  ASSET_ID: number
  ALLOC_SEQ: number
  ALLOC_TYPE: AllocationType | string
  ALLOC_RATE?: number | null
  FIRST_ALLOC_AMT?: number | null
  NORMAL_ALLOC_AMT?: number | null
  LAST_ALLOC_AMT?: number | null
  DEBIT_ACCT_CD: string
  CREDIT_ACCT_CD: string
  DEPARTMENT_ID?: number | null
  DEPARTMENT_CD?: string | null
  DEP_NAME_VIET?: string | null
  DEP_NAME_ENG?: string | null
  DEP_NAME_KOR?: string | null
  DEP_NAME_CHINA?: string | null
  NOTE?: string | null
}

export type FixedAssetAllocationRow = FixedAssetAllocation & {
  ROW_KEY: string
  ISDEL?: boolean
  DEBIT_ACCT_ID?: number | null
  DEBIT_ACCT_NM?: string | null
  DEBIT_ACCT_NM_VIET?: string | null
  DEBIT_ACCT_NM_ENG?: string | null
  DEBIT_ACCT_NM_KOR?: string | null
  DEBIT_ACCT_NM_CHINA?: string | null
  CREDIT_ACCT_ID?: number | null
  CREDIT_ACCT_NM?: string | null
  CREDIT_ACCT_NM_VIET?: string | null
  CREDIT_ACCT_NM_ENG?: string | null
  CREDIT_ACCT_NM_KOR?: string | null
  CREDIT_ACCT_NM_CHINA?: string | null
}

export interface FixedAssetSaveRequest {
  ASSET: FixedAsset
  ALLOCATIONS: FixedAssetAllocation[]
}

export interface FixedAssetDetailResponse {
  ASSET: FixedAsset
  ALLOCATIONS: FixedAssetAllocation[]
}

export interface FixedAssetDepreciationPreviewRequest {
  USE_START_YMD: string
  USEFUL_LIFE_MONTH: number
  ORIGINAL_AMT: number
  ACCUM_DEPRE_AMT: number
}

export interface FixedAssetDepreciationPreviewResponse {
  DEPRE_START_YM: string
  DEPRE_END_YM: string
  USEFUL_LIFE_MONTH: number
  NORMAL_MONTH_COUNT: number
  REMAIN_DEPRE_AMT: number
  FIRST_DEPRE_AMT: number
  NORMAL_DEPRE_AMT: number
  LAST_DEPRE_AMT: number
}

export type FixedAssetGridRow = Omit<FixedAsset, 'RECEIVE_YMD' | 'USE_START_YMD'> & {
  RECEIVE_YMD?: string | Date | null
  USE_START_YMD: string | Date
  ALLOCATIONS: FixedAssetAllocationRow[]
}
