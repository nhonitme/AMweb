import { useCallback, useEffect, useRef, useState } from "react"

import type {
  CogsTransferRuleCode,
  PeriodLockStepCode,
  ProfitLossBalanceMethod,
} from "@/api/periodLockApi"
import { getUserSettingsBatch, saveUserSettingsBulk } from "@/api/userSettingApi"
import {
  buildPeriodLockUserSettingSaveItems,
  DEFAULT_PERIOD_LOCK_COGS_RULE,
  DEFAULT_PERIOD_LOCK_PL_BALANCE_METHOD,
  DEFAULT_PERIOD_LOCK_STEP_CODES,
  PERIOD_LOCK_USER_SETTING_KEYS,
  resolvePeriodLockCogsRule,
  resolvePeriodLockPlBalanceMethod,
  resolvePeriodLockStepCodes,
  type PeriodLockResolvedUserSettings,
} from "@/lib/periodLockUserSettings"

const USER_SETTINGS_SAVE_DEBOUNCE_MS = 400

async function fetchPeriodLockUserSettings(): Promise<PeriodLockResolvedUserSettings> {
  const settings = await getUserSettingsBatch([
    PERIOD_LOCK_USER_SETTING_KEYS.STEP_CODES,
    PERIOD_LOCK_USER_SETTING_KEYS.COGS_RULE,
    PERIOD_LOCK_USER_SETTING_KEYS.PL_BALANCE_METHOD,
  ])

  const stepSetting = settings.find(
    (item) => item.KEY_NAME === PERIOD_LOCK_USER_SETTING_KEYS.STEP_CODES,
  )
  const cogsSetting = settings.find(
    (item) => item.KEY_NAME === PERIOD_LOCK_USER_SETTING_KEYS.COGS_RULE,
  )
  const plSetting = settings.find(
    (item) => item.KEY_NAME === PERIOD_LOCK_USER_SETTING_KEYS.PL_BALANCE_METHOD,
  )

  return {
    stepCodes: resolvePeriodLockStepCodes(stepSetting?.VALUE, stepSetting?.SOURCE),
    cogsRule: resolvePeriodLockCogsRule(cogsSetting?.VALUE),
    plBalanceMethod: resolvePeriodLockPlBalanceMethod(plSetting?.VALUE),
  }
}

/**
 * State option khóa sổ đồng bộ với user_setting_info.
 * - Load một lần khi mở màn hình.
 * - Lưu debounce khi user tick/đổi radio.
 */
export function usePeriodLockOptions(onSaveError?: (error: unknown) => void) {
  const [selectedStepCodes, setSelectedStepCodes] = useState<PeriodLockStepCode[]>([
    ...DEFAULT_PERIOD_LOCK_STEP_CODES,
  ])
  const [selectedCogsTransferRules, setSelectedCogsTransferRules] =
    useState<CogsTransferRuleCode>(DEFAULT_PERIOD_LOCK_COGS_RULE)
  const [profitLossBalanceMethod, setProfitLossBalanceMethod] =
    useState<ProfitLossBalanceMethod>(DEFAULT_PERIOD_LOCK_PL_BALANCE_METHOD)
  const [isSettingsLoading, setIsSettingsLoading] = useState(true)
  const [settingsQueryError, setSettingsQueryError] = useState<unknown>(null)

  const hydratedRef = useRef(false)
  const skipNextSaveRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    setIsSettingsLoading(true)
    setSettingsQueryError(null)

    void fetchPeriodLockUserSettings()
      .then((data) => {
        if (cancelled) return

        skipNextSaveRef.current = true
        setSelectedStepCodes(data.stepCodes)
        setSelectedCogsTransferRules(data.cogsRule)
        setProfitLossBalanceMethod(data.plBalanceMethod)
        hydratedRef.current = true
      })
      .catch((err) => {
        if (!cancelled) {
          setSettingsQueryError(err)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSettingsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!hydratedRef.current) return

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null

      const payload: PeriodLockResolvedUserSettings = {
        stepCodes: selectedStepCodes,
        cogsRule: selectedCogsTransferRules,
        plBalanceMethod: profitLossBalanceMethod,
      }

      void saveUserSettingsBulk(buildPeriodLockUserSettingSaveItems(payload)).catch((saveError) => {
        onSaveError?.(saveError)
      })
    }, USER_SETTINGS_SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [onSaveError, profitLossBalanceMethod, selectedCogsTransferRules, selectedStepCodes])

  const toggleSelectedStep = useCallback((stepCode: PeriodLockStepCode, checked: boolean) => {
    setSelectedStepCodes((prev) => {
      if (checked) {
        if (prev.includes(stepCode)) return prev

        return [...prev, stepCode].sort((a, b) => {
          const order: Record<PeriodLockStepCode, number> = {
            FA_PREPAID_LOCK: 1,
            COGS_SUMMARY: 2,
            PROFIT_LOSS_REPORT: 3,
          }
          return order[a] - order[b]
        })
      }

      return prev.filter((item) => item !== stepCode)
    })
  }, [])

  return {
    selectedStepCodes,
    selectedCogsTransferRules,
    profitLossBalanceMethod,
    setSelectedCogsTransferRules,
    setProfitLossBalanceMethod,
    toggleSelectedStep,
    isSettingsLoading,
    isSettingsReady: hydratedRef.current,
    settingsQueryError,
  }
}
