import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { getCurrentCompanyCd } from "@/lib/login"
import {
  clearEInvoiceSellersCache,
  loadEInvoiceSellers,
} from "@/lib/einvoiceSellerCache"
import {
  clearEInvoiceDetailCache,
  loadEInvoiceDetail,
  saveEInvoiceDetailCache,
} from "@/lib/einvoiceDetailCache"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import { loadEInvoiceUserSettingDefaults } from "@/pages/EInvoice/einvoiceUserSettingDefaults"

export function useEInvoiceSellersQuery(khhdon = "", enabled = true) {
  const companyCd = getCurrentCompanyCd()
  const normalizedKhhdon = khhdon.trim()

  return useQuery({
    queryKey: queryKeys.transaction.einvoiceSellers(companyCd, normalizedKhhdon),
    queryFn: () => loadEInvoiceSellers({ khhdon: normalizedKhhdon, includeAllTemplates: true }),
    enabled: enabled && Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useEInvoiceSellersInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    clearEInvoiceSellersCache(companyCd)
    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.transaction.einvoiceRoot(companyCd), "sellers"],
    })
  }, [companyCd, queryClient])
}

export function useEInvoiceUserSettingDefaultsQuery(enabled = true) {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.transaction.einvoiceEditorUserDefaults(companyCd),
    queryFn: () => loadEInvoiceUserSettingDefaults(companyCd, true),
    enabled: enabled && Boolean(companyCd),
    staleTime: STALE_TIME.USER_SETTING,
  })
}

export function useEInvoiceDetailQuery(invoiceId: number, enabled = true) {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.transaction.einvoiceDetail(companyCd, invoiceId),
    // Editor luôn lấy bản mới từ API — tránh memory/session cache thiếu BKE_INFO.
    queryFn: () => loadEInvoiceDetail(invoiceId, true),
    enabled: enabled && Boolean(companyCd) && invoiceId > 0,
    staleTime: 0,
  })
}

export function useEInvoiceDetailCacheWriter() {
  return useCallback((invoice: Parameters<typeof saveEInvoiceDetailCache>[0]) => {
    saveEInvoiceDetailCache(invoice)
  }, [])
}

export function useEInvoiceDetailInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(
    async (invoiceId?: number) => {
      if (invoiceId && invoiceId > 0) {
        clearEInvoiceDetailCache(invoiceId, companyCd)
        await queryClient.invalidateQueries({
          queryKey: queryKeys.transaction.einvoiceDetail(companyCd, invoiceId),
        })
        return
      }

      clearEInvoiceDetailCache(undefined, companyCd)
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.transaction.einvoiceRoot(companyCd), "detail"],
      })
    },
    [companyCd, queryClient],
  )
}
