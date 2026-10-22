import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCurrentLicense,
  getLicenseStatus,
  type LicenseInfo,
  type LicenseStatusInfo,
} from "@/api/licenseInfoApi";
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys";

const LICENSE_POLL_INTERVAL_MS = 5 * 60_000;

/**
 * One status observer per company at the application gate. React Query deduplicates
 * concurrent requests, refetches only stale data on focus, and checks every 5 minutes
 * while the page remains open. No manual window.focus HTTP handler is required.
 */
export function useLicenseStatusQuery(companyCd: string, enabled = true) {
  const cd = companyCd.trim().toUpperCase();
  return useQuery({
    queryKey: queryKeys.license.status(cd),
    queryFn: getLicenseStatus,
    enabled: enabled && Boolean(cd),
    staleTime: STALE_TIME.LICENSE,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: enabled ? LICENSE_POLL_INTERVAL_MS : false,
    retry: 1,
  });
}

/**
 * The gate uses the detail query directly on /system/license, so a direct visit
 * to that page makes ONE /license/current request shared with LicenseInfoPage.
 * Only the gate polls; the page's additional observer never schedules another poll.
 *
 * A successful detail read also updates the lightweight status cache so pressing
 * Refresh after renewing a License takes effect without waiting for status TTL.
 */
export function useLicenseDetailsQuery(
  companyCd: string,
  options: { enabled?: boolean; poll?: boolean } = {},
) {
  const cd = companyCd.trim().toUpperCase();
  const queryClient = useQueryClient();
  const enabled = options.enabled !== false && Boolean(cd);
  const poll = options.poll === true;

  return useQuery<LicenseInfo | null>({
    queryKey: queryKeys.license.current(cd),
    queryFn: async () => {
      const info = await getCurrentLicense();
      const status: LicenseStatusInfo = {
        COMPANY_CD: info?.COMPANY_CD ?? cd,
        LICENSE_STATUS: info?.LICENSE_STATUS ?? "UNCONFIGURED",
        END_DATE: info?.END_DATE ?? null,
      };
      queryClient.setQueryData(queryKeys.license.status(cd), status);
      return info;
    },
    enabled,
    staleTime: STALE_TIME.LICENSE,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: poll,
    refetchInterval: enabled && poll ? LICENSE_POLL_INTERVAL_MS : false,
    retry: 1,
  });
}
