import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import type { EInvoiceUserSettingSearchParams } from "@/types/einvoiceSetting"

import {
  clearEInvoiceDecimalSettingsCache,
  loadEInvoiceDecimalSettings,
} from "@/lib/einvoiceDecimalSettingCache"
import {
  clearEInvoiceSellersCache,
  loadEInvoiceSellers,
} from "@/lib/einvoiceSellerCache"
import {
  clearEInvoiceUserSettingsCache,
  loadEInvoiceUserSettings,
} from "@/lib/einvoiceUserSettingCache"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import { getCurrentCompanyCd } from "@/lib/login"

export function useEInvoiceSettingSellersQuery(enabled = true) {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.transaction.einvoiceSettingSellers(companyCd),
    // Template configuration must reflect ToolTaoMau changes immediately; do not reuse a
    // sessionStorage seller list that may still say HAS_XSL_TEMPLATE = 0.
    queryFn: () => loadEInvoiceSellers({ includeInactive: true, includeAllTemplates: true }, true),
    enabled: enabled && Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
    refetchOnMount: "always",
  })
}

export function useEInvoiceSettingSellersInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    clearEInvoiceSellersCache(companyCd)
    // Drop cached query data so UI cannot keep showing the pre-create list.
    await queryClient.resetQueries({
      queryKey: queryKeys.transaction.einvoiceSettingSellers(companyCd),
    })
    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.transaction.einvoiceRoot(companyCd), "sellers"],
    })
  }, [companyCd, queryClient])
}

export type EInvoiceSettingDecimalsQueryOptions = {
  includeInactive?: boolean
}

export function useEInvoiceSettingDecimalsQuery(
  xslId = 0,
  enabled = true,
  options: EInvoiceSettingDecimalsQueryOptions = {},
) {
  const companyCd = getCurrentCompanyCd()
  const normalizedXslId = Number.isFinite(Number(xslId)) && Number(xslId) > 0 ? Number(xslId) : 0
  const includeInactive = options.includeInactive ?? true

  return useQuery({
    queryKey: queryKeys.transaction.einvoiceSettingDecimals(companyCd, normalizedXslId, includeInactive),
    queryFn: () =>
      loadEInvoiceDecimalSettings({
        includeInactive,
        xslId: normalizedXslId,
      }),
    enabled: enabled && Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useEInvoiceSettingDecimalsInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    clearEInvoiceDecimalSettingsCache(companyCd)
    await queryClient.invalidateQueries({
      queryKey: queryKeys.transaction.einvoiceSettingDecimalsRoot(companyCd),
    })
  }, [companyCd, queryClient])
}

export function useEInvoiceUserSettingsQuery(
  params: EInvoiceUserSettingSearchParams = {},
  enabled = true,
) {
  const companyCd = getCurrentCompanyCd()
  const settingId = Number(params.settingId ?? 0)
  const userId = (params.userId ?? "").trim()
  const keyword = (params.keyword ?? "").trim()
  const includeDeleted = params.includeDeleted === true

  return useQuery({
    queryKey: queryKeys.transaction.einvoiceUserSettings(companyCd, settingId, userId, keyword, includeDeleted),
    queryFn: () => loadEInvoiceUserSettings(params),
    enabled: enabled && Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useEInvoiceUserSettingsInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    clearEInvoiceUserSettingsCache(companyCd)
    await queryClient.invalidateQueries({
      queryKey: queryKeys.transaction.einvoiceUserSettingsRoot(companyCd),
    })
    await queryClient.invalidateQueries({
      queryKey: queryKeys.transaction.einvoiceEditorUserDefaults(companyCd),
    })
  }, [companyCd, queryClient])
}
