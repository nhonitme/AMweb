import type { Location } from "react-router-dom"

import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import type { VoucherOpenLocationState } from "@/types/voucher"

export function resolveVoucherOpenChitId(location: Pick<Location, "search" | "state">): number {
  const navigationState = location.state as VoucherOpenLocationState | null
  const navigationOpenChitId = Number(navigationState?.openChitId ?? 0)
  if (navigationState?.openMode === "edit" && navigationOpenChitId > 0) {
    return navigationOpenChitId
  }

  const params = new URLSearchParams(location.search)
  const queryOpenChitId = Number(params.get("openChitId") ?? 0)
  return Number.isFinite(queryOpenChitId) && queryOpenChitId > 0 ? queryOpenChitId : 0
}

export function hasVoucherOpenChitIdInQuery(location: Pick<Location, "search">): boolean {
  const params = new URLSearchParams(location.search)
  const queryOpenChitId = Number(params.get("openChitId") ?? 0)
  return Number.isFinite(queryOpenChitId) && queryOpenChitId > 0
}

export function hasVoucherNavigationOpenState(location: Pick<Location, "state">): boolean {
  const navigationState = location.state as VoucherOpenLocationState | null
  return navigationState?.openMode === "edit" && Number(navigationState?.openChitId ?? 0) > 0
}

export function hasVoucherOpenChitIdRoute(location: Pick<Location, "search" | "state">): boolean {
  return hasVoucherOpenChitIdInQuery(location) || hasVoucherNavigationOpenState(location)
}

export function buildVoucherOpenUrl(route: string, chitId: number): string {
  const companyCd = getCurrentCompanyCd()
  const basePath = buildAppPath(companyCd, route)
  const params = new URLSearchParams({ openChitId: String(chitId) })
  return `${basePath}?${params.toString()}`
}
