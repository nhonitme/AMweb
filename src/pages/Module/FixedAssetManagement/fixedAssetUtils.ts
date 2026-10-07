import type {
  AllocationType,
  FixedAsset,
  FixedAssetAllocation,
  FixedAssetAllocationRow,
  FixedAssetGridRow,
  FixedAssetSaveRequest,
} from '@/types/fixedAsset'

import { formatDateToYmd } from '@/pages/Accounting/accountingDateUtils'

import {
  FA_ALLOC_RATE_TOLERANCE,
  formatFaMessage,
  getAllocationAmountMismatchMessages,
  type DepreciationHeaderAmounts,
  type FaMessageTranslate,
} from './fixedAssetAllocationCalc'
import { DEFAULT_FIXED_ASSET_STATUS, normalizeFixedAssetStatus } from './fixedAssetStatus'

export const createRowKey = () => `fa-alloc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const cloneAllocationRow = (row: FixedAssetAllocationRow): FixedAssetAllocationRow => ({
  ...row,
  ROW_KEY: row.ROW_KEY || createRowKey(),
  ISDEL: Boolean(row.ISDEL),
})

export const getActiveAllocationRows = (rows: FixedAssetAllocationRow[]): FixedAssetAllocationRow[] =>
  rows.filter((row) => !row.ISDEL)

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export type AllocationRequiredField = 'ALLOC_TYPE' | 'DEBIT_ACCT_ID' | 'CREDIT_ACCT_ID'

const allocationRequiredFieldLabels: Record<
  AllocationRequiredField,
  { key: string; fallback: string }
> = {
  ALLOC_TYPE: { key: 'ALLOC_TYPE', fallback: 'Kiểu phân bổ' },
  DEBIT_ACCT_ID: { key: 'DEBIT', fallback: 'TK Nợ' },
  CREDIT_ACCT_ID: { key: 'CREDIT', fallback: 'TK Có' },
}

const faMessage = (
  translate: FaMessageTranslate,
  key: string,
  fallback: string,
  values?: readonly (string | number)[],
): string => {
  const template = translate(key, fallback) || fallback
  return values ? formatFaMessage(template, values) : template
}

export const getAllocationRowMissingRequiredFields = (
  row: FixedAssetAllocationRow,
): AllocationRequiredField[] => {
  const missing: AllocationRequiredField[] = []

  if (!row.ALLOC_TYPE?.trim()) {
    missing.push('ALLOC_TYPE')
  }

  const debitAccountId = toNumber((row as FixedAssetAllocationRow).DEBIT_ACCT_ID)
  const creditAccountId = toNumber((row as FixedAssetAllocationRow).CREDIT_ACCT_ID)

  if (debitAccountId <= 0 && !row.DEBIT_ACCT_CD?.trim()) {
    missing.push('DEBIT_ACCT_ID')
  }

  if (creditAccountId <= 0 && !row.CREDIT_ACCT_CD?.trim()) {
    missing.push('CREDIT_ACCT_ID')
  }

  return missing
}

export const isAllocationRowRequiredValid = (row: FixedAssetAllocationRow): boolean =>
  getAllocationRowMissingRequiredFields(row).length === 0

/** Dòng insert mới chưa nhập gì — bỏ khi Save để không commit dòng trống / E4008. */
export const isBlankAllocationDraft = (row: FixedAssetAllocationRow | null | undefined): boolean => {
  if (!row) {
    return true
  }

  const hasAccount = Boolean(row.DEBIT_ACCT_CD?.trim() || row.CREDIT_ACCT_CD?.trim())
  const hasDept = toNumber(row.DEPARTMENT_ID) > 0 || Boolean(row.DEPARTMENT_CD?.trim())
  const hasRate = toNumber(row.ALLOC_RATE) !== 0
  const hasAmount =
    toNumber(row.FIRST_ALLOC_AMT) !== 0 ||
    toNumber(row.NORMAL_ALLOC_AMT) !== 0 ||
    toNumber(row.LAST_ALLOC_AMT) !== 0
  const hasNote = Boolean(row.NOTE?.trim())

  return !hasAccount && !hasDept && !hasRate && !hasAmount && !hasNote
}

export const validateActiveAllocationRowsRequired = (
  rows: FixedAssetAllocationRow[],
  translate: FaMessageTranslate,
): string => {
  const activeRows = getActiveAllocationRows(rows)

  for (let index = 0; index < activeRows.length; index += 1) {
    const missingFields = getAllocationRowMissingRequiredFields(activeRows[index])
    if (missingFields.length === 0) {
      continue
    }

    const missingLabels = missingFields
      .map((field) => {
        const label = allocationRequiredFieldLabels[field]
        return faMessage(translate, label.key, label.fallback)
      })
      .join(', ')
    return faMessage(
      translate,
      'FA_ALLOC_ROW_REQUIRED',
      'Dòng phân bổ {0}: Vui lòng nhập {1}.',
      [index + 1, missingLabels],
    )
  }

  return ''
}

export const cloneFixedAssetGridRow = (row: FixedAssetGridRow): FixedAssetGridRow => ({
  ...row,
  ALLOCATIONS: row.ALLOCATIONS.map((item) => cloneAllocationRow(item)),
})

export const normalizeAllocationRows = (
  rows: readonly FixedAssetAllocation[] | undefined,
  companyCd: string,
  assetId = 0,
): FixedAssetAllocationRow[] =>
  (rows ?? []).map((row, index) => ({
    ...row,
    ROW_KEY: (row as FixedAssetAllocationRow).ROW_KEY ?? createRowKey(),
    COMPANY_CD: row.COMPANY_CD || companyCd,
    ASSET_ID: row.ASSET_ID || assetId,
    ALLOC_SEQ: row.ALLOC_SEQ > 0 ? row.ALLOC_SEQ : index + 1,
    ALLOC_TYPE: row.ALLOC_TYPE || 'PERCENT',
    DEBIT_ACCT_CD: row.DEBIT_ACCT_CD ?? '',
    CREDIT_ACCT_CD: row.CREDIT_ACCT_CD || '',
  }))

export const mapDetailToGridRow = (
  asset: FixedAsset,
  allocations: FixedAssetAllocation[],
): FixedAssetGridRow =>
  normalizeFixedAssetYmdFields({
    ...(asset as FixedAssetGridRow),
    STATUS: normalizeFixedAssetStatus(asset.STATUS),
    ALLOCATIONS:
      allocations.length > 0
        ? normalizeAllocationRows(allocations, asset.COMPANY_CD, asset.ASSET_ID)
        : [createEmptyAllocationRow(asset.COMPANY_CD, asset.ASSET_ID, 1)],
  })

export const mergeDetailFieldsIntoGridRow = (
  row: FixedAssetGridRow,
  asset: FixedAsset,
  allocations: FixedAssetAllocation[],
): FixedAssetGridRow =>
  normalizeFixedAssetYmdFields({
    ...row,
    ...asset,
    STATUS: normalizeFixedAssetStatus(asset.STATUS ?? row.STATUS),
    NOTE: asset.NOTE ?? null,
    ACQ_CHITINFO_ID: asset.ACQ_CHITINFO_ID ?? null,
    ACQ_CHITDETAIL_ID: asset.ACQ_CHITDETAIL_ID ?? null,
    ALLOCATIONS:
      allocations.length > 0
        ? normalizeAllocationRows(allocations, row.COMPANY_CD || asset.COMPANY_CD, row.ASSET_ID || asset.ASSET_ID)
        : [createEmptyAllocationRow(row.COMPANY_CD || asset.COMPANY_CD, row.ASSET_ID || asset.ASSET_ID, 1)],
  })

const normalizeMoney = (value: number | null | undefined) => {
  if (value === null || value === undefined) return null
  return Number.isFinite(value) ? value : 0
}

const toYmdCompact = (value: unknown): string => formatDateToYmd(value as string | Date | null | undefined) ?? ''

export const normalizeFixedAssetYmdFields = <
  T extends {
    RECEIVE_YMD?: string | Date | null
    USE_START_YMD?: string | Date | null
  },
>(
  row: T,
): T => ({
  ...row,
  RECEIVE_YMD: row.RECEIVE_YMD ? toYmdCompact(row.RECEIVE_YMD) : null,
  USE_START_YMD: toYmdCompact(row.USE_START_YMD),
})

export const normalizeFixedAssetRowForForm = (row: FixedAssetGridRow): FixedAssetGridRow => {
  const normalized = normalizeFixedAssetYmdFields(row)
  return {
    ...normalized,
    REMAIN_DEPRE_AMT: toNumber(normalized.ORIGINAL_AMT) - toNumber(normalized.ACCUM_DEPRE_AMT),
  }
}

export const createEmptyAllocation = (
  companyCd: string,
  assetId = 0,
  seq = 1,
  allocType: AllocationType | string = 'PERCENT',
): FixedAssetAllocation => {
  const resolvedType: AllocationType = allocType === 'AMOUNT' ? 'AMOUNT' : 'PERCENT'
  return {
    ALLOC_ID: null,
    COMPANY_CD: companyCd,
    ASSET_ID: assetId,
    ALLOC_SEQ: seq,
    ALLOC_TYPE: resolvedType,
    // Dòng 1 mặc định Theo % với tỷ lệ 100%; dòng thêm sau để trống để user tự chia.
    ALLOC_RATE: resolvedType === 'PERCENT' && seq === 1 ? 100 : null,
    FIRST_ALLOC_AMT: null,
    NORMAL_ALLOC_AMT: null,
    LAST_ALLOC_AMT: null,
    DEBIT_ACCT_CD: '',
    CREDIT_ACCT_CD: '',
    DEPARTMENT_ID: null,
    DEPARTMENT_CD: '',
    NOTE: '',
  }
}

export const createEmptyAllocationRow = (
  companyCd: string,
  assetId = 0,
  seq = 1,
  allocType: AllocationType | string = 'PERCENT',
): FixedAssetAllocationRow => ({
  ...createEmptyAllocation(companyCd, assetId, seq, allocType),
  ROW_KEY: createRowKey(),
  ISDEL: false,
})

export const createDefaultFixedAssetRow = (companyCd: string): FixedAssetGridRow => ({
  ASSET_ID: 0,
  COMPANY_CD: companyCd,
  ASSET_CD: '',
  ASSET_NM: '',
  ACC_CD: '',
  USE_DEPT_CD: '',
  RECEIVE_YMD: toYmdCompact(new Date()),
  USE_START_YMD: toYmdCompact(new Date()),
  DEPRE_START_YM: '',
  DEPRE_END_YM: '',
  USEFUL_LIFE_MONTH: 0,
  NORMAL_MONTH_COUNT: 0,
  ORIGINAL_AMT: 0,
  ACCUM_DEPRE_AMT: 0,
  REMAIN_DEPRE_AMT: 0,
  FIRST_DEPRE_AMT: 0,
  NORMAL_DEPRE_AMT: 0,
  LAST_DEPRE_AMT: 0,
  ACQ_CHITINFO_ID: null,
  ACQ_CHITDETAIL_ID: null,
  ACQ_CHIT_NO: '',
  STATUS: DEFAULT_FIXED_ASSET_STATUS,
  NOTE: '',
  ALLOCATIONS: [createEmptyAllocationRow(companyCd)],
})

/** 0 = Thông tin chung, 1 = Ghi nhận & khấu hao */
export type FixedAssetValidationIssue = {
  message: string
  tabIndex: 0 | 1
}

export const getFixedAssetValidationIssue = (
  row: Partial<FixedAssetGridRow>,
  translate: FaMessageTranslate,
): FixedAssetValidationIssue | null => {
  const asset = row as FixedAsset
  const allocations = row.ALLOCATIONS ?? []
  const issue = (key: string, fallback: string, tabIndex: 0 | 1, values?: readonly (string | number)[]) => ({
    message: faMessage(translate, key, fallback, values),
    tabIndex,
  })

  if (!asset.ASSET_CD?.trim()) {
    return issue('FA_MSG_ASSET_CD_REQUIRED', 'Vui lòng nhập mã tài sản.', 0)
  }
  if (!asset.ASSET_NM?.trim()) {
    return issue('FA_MSG_ASSET_NM_REQUIRED', 'Vui lòng nhập tên tài sản.', 0)
  }
  if (!toYmdCompact(asset.USE_START_YMD)) {
    return issue('FA_MSG_USE_START_REQUIRED', 'Vui lòng nhập ngày bắt đầu sử dụng.', 0)
  }
  if (!/^\d{8}$/.test(toYmdCompact(asset.USE_START_YMD))) {
    return issue('FA_MSG_USE_START_YMD', 'Ngày bắt đầu sử dụng phải có định dạng yyyyMMdd.', 0)
  }
  if (asset.RECEIVE_YMD && !/^\d{8}$/.test(toYmdCompact(asset.RECEIVE_YMD))) {
    return issue('FA_MSG_RECEIVE_YMD', 'Ngày tiếp nhận phải có định dạng yyyyMMdd.', 0)
  }
  if (!/^\d{6}$/.test(asset.DEPRE_START_YM ?? '')) {
    return issue('FA_MSG_DEPRE_START_YM', 'Tháng bắt đầu khấu hao phải có định dạng YYYYMM.', 1)
  }
  if (!/^\d{6}$/.test(asset.DEPRE_END_YM ?? '')) {
    return issue('FA_MSG_DEPRE_END_YM', 'Tháng kết thúc khấu hao phải có định dạng YYYYMM.', 1)
  }
  if ((asset.DEPRE_START_YM ?? '') > (asset.DEPRE_END_YM ?? '')) {
    return issue('FA_MSG_DEPRE_YM_ORDER', 'Tháng bắt đầu khấu hao không được lớn hơn tháng kết thúc.', 1)
  }
  if (toNumber(asset.USEFUL_LIFE_MONTH) <= 0) {
    return issue('FA_MSG_USEFUL_LIFE_MIN', 'Tổng số tháng khấu hao phải lớn hơn 0.', 1)
  }
  if (toNumber(asset.USEFUL_LIFE_MONTH) > 12000) {
    return issue('FA_MSG_USEFUL_LIFE_MAX', 'Tổng số tháng khấu hao không được lớn hơn 12000.', 1)
  }
  if (toNumber(asset.NORMAL_MONTH_COUNT) < 0) {
    return issue('FA_MSG_NORMAL_MONTH_MIN', 'Số tháng giữa không được nhỏ hơn 0.', 1)
  }
  if (toNumber(asset.ORIGINAL_AMT) < 0) {
    return issue('FA_MSG_ORIGINAL_AMT_MIN', 'Nguyên giá không được nhỏ hơn 0.', 0)
  }
  if (toNumber(asset.ACCUM_DEPRE_AMT) < 0) {
    return issue('FA_MSG_ACCUM_MIN', 'Hao mòn lũy kế không được nhỏ hơn 0.', 1)
  }
  if (toNumber(asset.ACCUM_DEPRE_AMT) > toNumber(asset.ORIGINAL_AMT)) {
    return issue('FA_MSG_ACCUM_GT_ORIGINAL', 'Hao mòn lũy kế không được lớn hơn nguyên giá.', 1)
  }

  const remainDepreAmt = toNumber(asset.ORIGINAL_AMT) - toNumber(asset.ACCUM_DEPRE_AMT)
  const planTotal =
    toNumber(asset.FIRST_DEPRE_AMT) +
    toNumber(asset.NORMAL_DEPRE_AMT) * toNumber(asset.NORMAL_MONTH_COUNT) +
    toNumber(asset.LAST_DEPRE_AMT)

  if (Math.abs(planTotal - remainDepreAmt) > 1) {
    return issue(
      'FA_MSG_DEPRE_PLAN_BALANCE',
      'Tổng khấu hao đầu + giữa * số tháng giữa + cuối phải bằng giá trị còn lại cần khấu hao.',
      1,
    )
  }
  const activeAllocations = getActiveAllocationRows(allocations as FixedAssetAllocationRow[])
  if (activeAllocations.length === 0) {
    return issue('FA_MSG_ALLOC_REQUIRED', 'Vui lòng nhập ít nhất một dòng phân bổ.', 1)
  }

  const types = new Set(activeAllocations.map((item) => item.ALLOC_TYPE))
  if (types.size > 1) {
    return issue(
      'ALLOC_TYPE_MIXED',
      'Một tài sản chỉ nên dùng một kiểu phân bổ: Theo % hoặc Theo tiền.',
      1,
    )
  }

  for (const item of activeAllocations) {
    const debitAccountId = toNumber((item as FixedAssetAllocationRow).DEBIT_ACCT_ID)
    const creditAccountId = toNumber((item as FixedAssetAllocationRow).CREDIT_ACCT_ID)

    if (debitAccountId <= 0 && !item.DEBIT_ACCT_CD?.trim()) {
      return issue('FA_MSG_ALLOC_DEBIT_REQUIRED', 'Vui lòng chọn tài khoản Nợ cho dòng phân bổ.', 1)
    }

    if (creditAccountId <= 0 && !item.CREDIT_ACCT_CD?.trim()) {
      return issue('FA_MSG_ALLOC_CREDIT_REQUIRED', 'Vui lòng chọn tài khoản Có cho dòng phân bổ.', 1)
    }
  }

  for (const item of activeAllocations) {
    if (toNumber(item.FIRST_ALLOC_AMT) < 0 || toNumber(item.NORMAL_ALLOC_AMT) < 0 || toNumber(item.LAST_ALLOC_AMT) < 0) {
      return issue('FA_MSG_ALLOC_AMT_MIN', 'Số tiền phân bổ không được nhỏ hơn 0.', 1)
    }

    if (toNumber(item.ALLOC_RATE) < 0) {
      return issue('FA_MSG_ALLOC_RATE_MIN', 'Tỷ lệ phân bổ không được nhỏ hơn 0.', 1)
    }

    if (toNumber(item.ALLOC_RATE) > 100) {
      return issue('FA_MSG_ALLOC_RATE_MAX', 'Tỷ lệ phân bổ trên một dòng không được lớn hơn 100%.', 1)
    }
  }

  if (types.has('PERCENT')) {
    const rateTotal = activeAllocations.reduce((sum, item) => sum + toNumber(item.ALLOC_RATE), 0)
    if (Math.abs(rateTotal - 100) > FA_ALLOC_RATE_TOLERANCE) {
      return issue(
        'FA_ALLOC_RATE_TOTAL',
        'Tổng tỷ lệ phân bổ phải bằng 100%. Hiện tại: {0}%.',
        1,
        [Number(rateTotal.toFixed(4))],
      )
    }
  }

  const headerAmounts: DepreciationHeaderAmounts = {
    FIRST_DEPRE_AMT: toNumber(asset.FIRST_DEPRE_AMT),
    NORMAL_DEPRE_AMT: toNumber(asset.NORMAL_DEPRE_AMT),
    LAST_DEPRE_AMT: toNumber(asset.LAST_DEPRE_AMT),
  }
  const mismatchMessages = getAllocationAmountMismatchMessages(headerAmounts, activeAllocations, translate)
  if (mismatchMessages.length > 0) {
    return { message: mismatchMessages[0], tabIndex: 1 }
  }

  return null
}

export const validateFixedAssetRow = (
  row: Partial<FixedAssetGridRow>,
  translate: FaMessageTranslate,
): string => getFixedAssetValidationIssue(row, translate)?.message ?? ''

export const buildFixedAssetSaveRequest = (row: Partial<FixedAssetGridRow>): FixedAssetSaveRequest => {
  const companyCd = row.COMPANY_CD?.trim() ?? ''
  const assetId = toNumber(row.ASSET_ID)
  const remainDepreAmt = toNumber(row.ORIGINAL_AMT) - toNumber(row.ACCUM_DEPRE_AMT)

  const asset: FixedAsset = normalizeFixedAssetYmdFields({
    ...(row as FixedAsset),
    COMPANY_CD: companyCd,
    ASSET_CD: row.ASSET_CD?.trim() ?? '',
    ASSET_NM: row.ASSET_NM?.trim() ?? '',
    ACC_CD: row.ACC_CD?.trim() ?? '',
    USE_DEPT_CD: row.USE_DEPT_CD?.trim() || null,
    REMAIN_DEPRE_AMT: remainDepreAmt,
    ACQ_CHIT_NO: row.ACQ_CHIT_NO?.trim() || null,
    STATUS: normalizeFixedAssetStatus(row.STATUS),
    NOTE: row.NOTE?.trim() || null,
  })

  const allocations = getActiveAllocationRows(normalizeAllocationRows(row.ALLOCATIONS, companyCd, assetId)).map(
    (item, index) => {
      const {
        ROW_KEY: _rowKey,
        ISDEL: _isDel,
        DEBIT_ACCT_ID: _debitAcctId,
        DEBIT_ACCT_NM: _debitAcctNm,
        DEBIT_ACCT_NM_VIET: _debitAcctNmViet,
        DEBIT_ACCT_NM_ENG: _debitAcctNmEng,
        DEBIT_ACCT_NM_KOR: _debitAcctNmKor,
        DEBIT_ACCT_NM_CHINA: _debitAcctNmChina,
        CREDIT_ACCT_ID: _creditAcctId,
        CREDIT_ACCT_NM: _creditAcctNm,
        CREDIT_ACCT_NM_VIET: _creditAcctNmViet,
        CREDIT_ACCT_NM_ENG: _creditAcctNmEng,
        CREDIT_ACCT_NM_KOR: _creditAcctNmKor,
        CREDIT_ACCT_NM_CHINA: _creditAcctNmChina,
        DEP_NAME_VIET: _depNameViet,
        DEP_NAME_ENG: _depNameEng,
        DEP_NAME_KOR: _depNameKor,
        DEP_NAME_CHINA: _depNameChina,
        DEPARTMENT_CD: _departmentCd,
        ...rest
      } = item as FixedAssetAllocationRow & { BALANCE_YN?: string }
      const { BALANCE_YN: _balanceYn, ...allocationRest } = rest as typeof rest & { BALANCE_YN?: string }
      return {
        ...allocationRest,
        COMPANY_CD: companyCd,
        ASSET_ID: assetId,
        ALLOC_SEQ: index + 1,
        ALLOC_TYPE: item.ALLOC_TYPE,
        ALLOC_RATE: normalizeMoney(item.ALLOC_RATE),
        FIRST_ALLOC_AMT: normalizeMoney(item.FIRST_ALLOC_AMT),
        NORMAL_ALLOC_AMT: normalizeMoney(item.NORMAL_ALLOC_AMT),
        LAST_ALLOC_AMT: normalizeMoney(item.LAST_ALLOC_AMT),
        DEBIT_ACCT_CD: item.DEBIT_ACCT_CD.trim(),
        CREDIT_ACCT_CD: item.CREDIT_ACCT_CD.trim(),
        DEPARTMENT_ID: toNumber(item.DEPARTMENT_ID) > 0 ? toNumber(item.DEPARTMENT_ID) : null,
        NOTE: item.NOTE?.trim() || null,
      }
    },
  )

  return { ASSET: asset, ALLOCATIONS: allocations }
}
