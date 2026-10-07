import { useQuery } from "@tanstack/react-query"

import { getReportOptions } from "@/api/reportOptionApi"
import { getCurrentCompanyCd } from "@/lib/login"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"

export function useReportOptionsQuery(reportGroupCode: string | undefined, enabled = true) {
  const companyCd = getCurrentCompanyCd() || ""
  const normalizedGroupCode = reportGroupCode?.trim() ?? ""

  return useQuery({
    queryKey: queryKeys.reports.options(companyCd, normalizedGroupCode),
    queryFn: async () => {
      const options = await getReportOptions({
        companyCd: companyCd || undefined,
        reportGroupCode: normalizedGroupCode,
      })
      return [...options].sort((first, second) => first.SORT_ORDER - second.SORT_ORDER)
    },
    enabled: enabled && Boolean(normalizedGroupCode),
    staleTime: STALE_TIME.STATIC,
  })
}
