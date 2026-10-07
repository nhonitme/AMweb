import { useCallback, useContext, useEffect, useRef, type MutableRefObject, type RefObject } from 'react'

import { previewFixedAssetDepreciation } from '@/api/fixedAssetApi'
import { getApiErrorMessage } from '@/api/apiTypes'
import { LanguageContext } from '@/lib/i18nLoader'
import { formatDateToYmd } from '@/pages/Accounting/accountingDateUtils'
import type {
  FixedAssetDepreciationPreviewRequest,
  FixedAssetDepreciationPreviewResponse,
  FixedAssetGridRow,
} from '@/types/fixedAsset'
import type dxForm from 'devextreme/ui/form'

const PREVIEW_DEBOUNCE_MS = 300

export const FIXED_ASSET_DEPRE_PREVIEW_TRIGGER_FIELDS = [
  'USE_START_YMD',
  'USEFUL_LIFE_MONTH',
  'ORIGINAL_AMT',
  'ACCUM_DEPRE_AMT',
] as const

export const FIXED_ASSET_DEPRE_MANUAL_FIELDS = [
  'FIRST_DEPRE_AMT',
  'NORMAL_DEPRE_AMT',
  'LAST_DEPRE_AMT',
] as const

type ManualDepreField = 'FIRST' | 'NORMAL' | 'LAST'

const manualFieldKeyMap: Record<(typeof FIXED_ASSET_DEPRE_MANUAL_FIELDS)[number], ManualDepreField> = {
  FIRST_DEPRE_AMT: 'FIRST',
  NORMAL_DEPRE_AMT: 'NORMAL',
  LAST_DEPRE_AMT: 'LAST',
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const createManualFlags = (): Record<ManualDepreField, boolean> => ({
  FIRST: false,
  NORMAL: false,
  LAST: false,
})

type FormRefLike = RefObject<{ instance: () => dxForm } | dxForm | null>

type UseFixedAssetDepreciationPreviewOptions = {
  visible: boolean
  draftRef: MutableRefObject<FixedAssetGridRow>
  formRef: FormRefLike
  onPreviewError?: (message: string) => void
  onPreviewApplied?: (amounts: {
    FIRST_DEPRE_AMT: number
    NORMAL_DEPRE_AMT: number
    LAST_DEPRE_AMT: number
  }) => void
}

function resolveFormInstance(formRef: FormRefLike): dxForm | null {
  const current = formRef.current
  if (!current) {
    return null
  }

  if (typeof (current as { instance?: () => dxForm }).instance === 'function') {
    return (current as { instance: () => dxForm }).instance()
  }

  return current as dxForm
}

type DepreciationPreviewSource =
  | { kind: 'skip' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; request: FixedAssetDepreciationPreviewRequest }

function getDepreciationPreviewSource(
  draftRef: MutableRefObject<FixedAssetGridRow>,
  formRef: FormRefLike,
  translate: (key: string, fallback?: string) => string,
): DepreciationPreviewSource {
  const form = resolveFormInstance(formRef)
  const formData = (form?.option('formData') ?? {}) as Partial<FixedAssetGridRow>
  const merged = {
    ...draftRef.current,
    ...formData,
  }

  const useStartYmd = formatDateToYmd(merged.USE_START_YMD) ?? ''
  const usefulLifeMonth = toNumber(merged.USEFUL_LIFE_MONTH)
  const originalAmt = toNumber(merged.ORIGINAL_AMT)
  const accumDepreAmt = toNumber(merged.ACCUM_DEPRE_AMT)

  if (!useStartYmd || usefulLifeMonth <= 0) {
    return { kind: 'skip' as const }
  }

  if (usefulLifeMonth > 12000) {
    return {
      kind: 'error' as const,
      message: translate(
        'FA_MSG_USEFUL_LIFE_MAX',
        'Tổng số tháng khấu hao không được lớn hơn 12000.',
      ),
    }
  }

  return {
    kind: 'ok' as const,
    request: {
      USE_START_YMD: useStartYmd,
      USEFUL_LIFE_MONTH: usefulLifeMonth,
      ORIGINAL_AMT: originalAmt,
      ACCUM_DEPRE_AMT: accumDepreAmt,
    },
  }
}

export function useFixedAssetDepreciationPreview({
  visible,
  draftRef,
  formRef,
  onPreviewError,
  onPreviewApplied,
}: UseFixedAssetDepreciationPreviewOptions) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const translateRef = useRef(translate)
  translateRef.current = translate
  const previewTimerRef = useRef<number | null>(null)
  const previewRequestRef = useRef<AbortController | null>(null)
  const manualDepreFieldsRef = useRef(createManualFlags())

  const resetPreviewState = useCallback(() => {
    manualDepreFieldsRef.current = createManualFlags()
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current)
      previewTimerRef.current = null
    }
    previewRequestRef.current?.abort()
    previewRequestRef.current = null
  }, [])

  const markManualDepreField = useCallback((dataField: string) => {
    const manualKey = manualFieldKeyMap[dataField as keyof typeof manualFieldKeyMap]
    if (manualKey) {
      manualDepreFieldsRef.current[manualKey] = true
    }
  }, [])

  const resetManualDepreFields = useCallback(() => {
    manualDepreFieldsRef.current = createManualFlags()
  }, [])

  const handlePreviewTriggerFieldChanged = useCallback(() => {
    resetManualDepreFields()
  }, [resetManualDepreFields])

  const applyPreviewResult = useCallback(
    (result: FixedAssetDepreciationPreviewResponse) => {
      const form = resolveFormInstance(formRef)
      const prev = draftRef.current
      const manualFlags = manualDepreFieldsRef.current

      const firstDepreAmt = manualFlags.FIRST ? toNumber(prev.FIRST_DEPRE_AMT) : toNumber(result.FIRST_DEPRE_AMT)
      const normalDepreAmt = manualFlags.NORMAL
        ? toNumber(prev.NORMAL_DEPRE_AMT)
        : toNumber(result.NORMAL_DEPRE_AMT)
      const lastDepreAmt = manualFlags.LAST ? toNumber(prev.LAST_DEPRE_AMT) : toNumber(result.LAST_DEPRE_AMT)

      const updates: Partial<FixedAssetGridRow> = {
        DEPRE_START_YM: result.DEPRE_START_YM,
        DEPRE_END_YM: result.DEPRE_END_YM,
        NORMAL_MONTH_COUNT: result.NORMAL_MONTH_COUNT,
        REMAIN_DEPRE_AMT: result.REMAIN_DEPRE_AMT,
        FIRST_DEPRE_AMT: firstDepreAmt,
        NORMAL_DEPRE_AMT: normalDepreAmt,
        LAST_DEPRE_AMT: lastDepreAmt,
      }

      draftRef.current = {
        ...prev,
        ...updates,
      }

      if (form) {
        Object.entries(updates).forEach(([fieldName, fieldValue]) => {
          form.updateData(fieldName, fieldValue)
        })
      }

      // form.updateData không luôn fire onFieldDataChanged — đồng bộ header cho lưới phân bổ.
      onPreviewApplied?.({
        FIRST_DEPRE_AMT: firstDepreAmt,
        NORMAL_DEPRE_AMT: normalDepreAmt,
        LAST_DEPRE_AMT: lastDepreAmt,
      })
    },
    [draftRef, formRef, onPreviewApplied],
  )

  const scheduleDepreciationPreview = useCallback(() => {
    if (!visible) {
      return
    }

    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current)
    }

    previewTimerRef.current = window.setTimeout(() => {
      previewTimerRef.current = null

      const t = (key: string, fallback: string) =>
        translateRef.current ? translateRef.current(key, fallback) : fallback
      const source = getDepreciationPreviewSource(draftRef, formRef, t)
      if (source.kind === 'skip') {
        return
      }

      if (source.kind === 'error') {
        onPreviewError?.(source.message)
        return
      }

      previewRequestRef.current?.abort()
      const controller = new AbortController()
      previewRequestRef.current = controller

      void previewFixedAssetDepreciation(source.request, { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted) {
            return
          }

          applyPreviewResult(result)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return
          }

          onPreviewError?.(
            getApiErrorMessage(
              error,
              t('FA_DEPRE_PREVIEW_FAILED', 'Không thể tính khấu hao tự động.'),
            ),
          )
        })
        .finally(() => {
          if (previewRequestRef.current === controller) {
            previewRequestRef.current = null
          }
        })
    }, PREVIEW_DEBOUNCE_MS)
  }, [applyPreviewResult, draftRef, formRef, onPreviewError, visible])

  useEffect(() => {
    if (!visible) {
      resetPreviewState()
    }
  }, [resetPreviewState, visible])

  useEffect(
    () => () => {
      if (previewTimerRef.current !== null) {
        window.clearTimeout(previewTimerRef.current)
      }
      previewRequestRef.current?.abort()
    },
    [],
  )

  return {
    resetPreviewState,
    markManualDepreField,
    handlePreviewTriggerFieldChanged,
    scheduleDepreciationPreview,
  }
}

export { getDepreciationPreviewSource }
