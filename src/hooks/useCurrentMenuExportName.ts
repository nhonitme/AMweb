import { useMemo } from "react"
import { useLocation } from "react-router-dom"

import { useMenuTreeQuery } from "@/hooks/queries/useMenuTreeQuery"
import { getCompanyCdFromPathname, getCurrentCompanyCd } from "@/lib/login"
import type { MenuTreeNode } from "@/types/menu"
import { useMenuExportName } from "@/hooks/useMenuExportName"

function resolveCurrentMenuCode(pathname: string, menuTree: MenuTreeNode[]): string {
  const companyCd = getCompanyCdFromPathname(pathname)
  const menuPath = companyCd ? pathname.replace(/^\/app\/[^/]+/i, "") || "/" : pathname
  const normalizePath = (path: string) => path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path
  const currentPath = normalizePath(menuPath)
  const candidates: MenuTreeNode[] = []

  const collect = (nodes: MenuTreeNode[]) => {
    for (const node of nodes) {
      if (node.routePath) {
        candidates.push(node)
      }
      if (node.children?.length) {
        collect(node.children)
      }
    }
  }
  collect(menuTree)

  let best: MenuTreeNode | null = null
  for (const candidate of candidates) {
    const routePath = normalizePath(candidate.routePath ?? "")
    if (
      currentPath === routePath
      || currentPath.startsWith(`${routePath}/`)
      || currentPath.startsWith(routePath)
    ) {
      if (!best || routePath.length > normalizePath(best.routePath ?? "").length) {
        best = candidate
      }
    }
  }

  return best?.code ?? ""
}

export function useCurrentMenuExportName() {
  const location = useLocation()
  const companyCd = getCompanyCdFromPathname(location.pathname) || getCurrentCompanyCd() || ""
  const { data: menuTree = [] } = useMenuTreeQuery(companyCd)
  const menuCode = useMemo(
    () => resolveCurrentMenuCode(location.pathname, menuTree),
    [location.pathname, menuTree],
  )

  return useMenuExportName(menuCode)
}
