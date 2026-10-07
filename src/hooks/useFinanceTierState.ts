import { useContext, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { findMenuById, getMenuPath } from "@/api/menuApi"
import { useMenuTreeQuery } from "@/hooks/queries/useMenuTreeQuery"
import { SHOW_DASHBOARD } from "@/lib/featureVisibility"
import { isFinanceTopMenu } from "@/lib/financeMenu"
import { LanguageContext } from "@/lib/i18nLoader"
import {
  buildAppPath,
  getCompanyCdFromPathname,
  getCurrentCompanyCd,
  resolveDefaultCompanyCd,
} from "@/lib/login"
import { buildTabCategories, type TabCategory } from "@/lib/menuTabCategories"
import { isReportTopMenu } from "@/lib/reportMenu"
import type { MenuTreeNode } from "@/types/menu"
import { resolveMenuCaption } from "@/utils/resolveConfigCaption"

function stripCompanyPath(pathname: string): string {
  const companyCd = getCompanyCdFromPathname(pathname)
  if (!companyCd) {
    return pathname
  }
  return pathname.replace(/^\/app\/[^/]+/i, "") || "/"
}

function normalizePath(path: string): string {
  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path
}

function findActiveMenuId(pathname: string, tree: MenuTreeNode[]): string {
  if (pathname === "/") {
    return SHOW_DASHBOARD ? "dashboard" : ""
  }

  const normalizedPath = normalizePath(pathname)

  const flatten = (nodes: MenuTreeNode[], output: MenuTreeNode[] = []) => {
    for (const node of nodes) {
      if (node.routePath) {
        output.push(node)
      }
      if (node.children && node.children.length) {
        flatten(node.children, output)
      }
    }
    return output
  }

  const candidates = flatten(tree).map((node) => ({
    ...node,
    routePath: normalizePath(node.routePath as string),
  }))

  let best: MenuTreeNode | null = null
  let bestLength = -1
  for (const candidate of candidates) {
    const routePath = candidate.routePath as string
    if (normalizedPath === routePath || normalizedPath.startsWith(`${routePath}/`)) {
      if (routePath.length > bestLength) {
        best = candidate
        bestLength = routePath.length
      }
    }
  }

  return best ? best.id : ""
}

export function findFirstRoutePath(node: MenuTreeNode): string | null {
  if (node.routePath) {
    return node.routePath
  }
  for (const child of node.children ?? []) {
    const found = findFirstRoutePath(child)
    if (found) {
      return found
    }
  }
  return null
}

export function containsMenuId(node: MenuTreeNode, id: string): boolean {
  if (node.id === id) {
    return true
  }
  return (node.children ?? []).some((child) => containsMenuId(child, id))
}

function isTieredTopMenu(node: MenuTreeNode): boolean {
  return isFinanceTopMenu(node) || isReportTopMenu(node)
}

export type FinanceTierState = {
  topMenu: MenuTreeNode | null
  activeGroup: MenuTreeNode | null
  activeLeafId: string
  categories: TabCategory[] | null
  /**
   * Whether this top menu's group tabs (e.g. Tong Hop / Tien Mat / Tai
   * khoan ngan hang) should be merged into the app header instead of
   * rendering as their own row. This applies to every Finance/Report top
   * menu that has group tabs at all (whether or not the active group also
   * splits into category pills below it) - the point is simply to avoid a
   * standalone "group tabs" row, and to keep the layout stable as the user
   * switches between group tabs that may or may not have that extra split.
   */
  shouldMergeGroupTabs: boolean
  translate: (key: string, fallback?: string) => string
  label: (node: MenuTreeNode) => string
  handleGroupClick: (group: MenuTreeNode) => void
}

/**
 * Derived state for the finance/report "tiered" menu (group tabs + category
 * pills + document-type tabs). Shared by Header (which shows a compact
 * inline version of the group tabs for "3-tier" pages) and TieredModuleTabs
 * (which renders the full set of rows), so both agree on which pages count
 * as "3-tier" and on which group is currently active.
 */
export function useFinanceTierState(): FinanceTierState {
  const location = useLocation()
  const navigate = useNavigate()
  const languageContext = useContext(LanguageContext) as
    | { translate?: (key: string, fallback?: string) => string }
    | undefined
  const translate = languageContext?.translate ?? ((key: string, fallback?: string) => fallback ?? key)

  const currentCompanyCd = getCompanyCdFromPathname(location.pathname) || getCurrentCompanyCd() || ""
  const { data: menuTree = [] } = useMenuTreeQuery(currentCompanyCd)

  const { topMenu, activeGroup, activeLeafId } = useMemo(() => {
    const scopedPathname = stripCompanyPath(location.pathname)
    const activeMenuId = findActiveMenuId(scopedPathname, menuTree)
    if (!activeMenuId) {
      return { topMenu: null as MenuTreeNode | null, activeGroup: null as MenuTreeNode | null, activeLeafId: "" }
    }

    const menuPath = getMenuPath(menuTree, activeMenuId)
    const topId = menuPath && menuPath.length > 0 ? menuPath[0] : null
    const top = topId ? findMenuById(menuTree, topId) : null

    if (!top || !isTieredTopMenu(top)) {
      return { topMenu: null as MenuTreeNode | null, activeGroup: null as MenuTreeNode | null, activeLeafId: "" }
    }

    const groupId = menuPath && menuPath.length > 1 ? menuPath[1] : null
    const group = (top.children ?? []).find((child) => child.id === groupId) ?? top.children?.[0] ?? null

    return { topMenu: top, activeGroup: group, activeLeafId: activeMenuId }
  }, [location.pathname, menuTree])

  const categories = useMemo(
    () => (activeGroup ? buildTabCategories(activeGroup) : null),
    [activeGroup],
  )

  // Merge the group tabs into the header for every top menu that has group
  // tabs at all. Earlier this only applied when the active group also had a
  // category-pill split, but that made the layout jump between 3 and 4 rows
  // as the user switched group tabs (some groups split into categories,
  // some don't), so it's simpler and more stable to always merge whenever
  // there are group tabs to show.
  const shouldMergeGroupTabs = Boolean(topMenu?.children && topMenu.children.length > 0)

  const label = (node: MenuTreeNode) => resolveMenuCaption(node, translate)

  const handleGroupClick = (group: MenuTreeNode) => {
    const routePath = group.routePath ?? findFirstRoutePath(group)
    if (!routePath) {
      return
    }
    const companyCd = currentCompanyCd || getCurrentCompanyCd() || resolveDefaultCompanyCd()
    navigate(buildAppPath(companyCd, routePath))
  }

  return { topMenu, activeGroup, activeLeafId, categories, shouldMergeGroupTabs, translate, label, handleGroupClick }
}
