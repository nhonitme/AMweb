import { useContext, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { findMenuById, getMenuPath } from "@/api/menuApi"
import { SHOW_DASHBOARD } from "@/lib/featureVisibility"
import { useMenuTreeQuery } from "@/hooks/queries/useMenuTreeQuery"
import { LanguageContext } from "@/lib/i18nLoader"
import {
  buildAppPath,
  getCompanyCdFromPathname,
  getCurrentCompanyCd,
  resolveDefaultCompanyCd,
} from "@/lib/login"
import { isMasterDataTopMenu } from "@/lib/masterDataMenu"
import type { MenuTreeNode } from "@/types/menu"
import { resolveMenuCaption } from "@/utils/resolveConfigCaption"

import "./ModuleSubTabs.css"

// Deliberately duplicated (not imported) from App.tsx's own route-matching
// logic — see useCurrentMenuTitle.ts for the same pattern/rationale: this
// keeps ModuleSubTabs decoupled from the app shell.
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

/**
 * Renders a horizontal tab bar for the current top-level menu's children,
 * but ONLY when that top-level menu is "Quản lý dữ liệu" (master data) —
 * every other menu still uses the regular nested sidebar and this component
 * renders nothing for those routes. This lets the master-data module move
 * its sub-pages out of the sidebar tree and into tabs without touching any
 * other menu or any individual page.
 */
export default function ModuleSubTabs() {
  const location = useLocation()
  const navigate = useNavigate()
  const languageContext = useContext(LanguageContext) as
    | { translate?: (key: string, fallback?: string) => string }
    | undefined
  const translate = languageContext?.translate ?? ((key: string, fallback?: string) => fallback ?? key)

  const currentCompanyCd = getCompanyCdFromPathname(location.pathname) || getCurrentCompanyCd() || ""
  const { data: menuTree = [] } = useMenuTreeQuery(currentCompanyCd)

  const { topMenu, activeChildId } = useMemo(() => {
    const scopedPathname = stripCompanyPath(location.pathname)
    const activeMenuId = findActiveMenuId(scopedPathname, menuTree)
    if (!activeMenuId) {
      return { topMenu: null as MenuTreeNode | null, activeChildId: "" }
    }

    const menuPath = getMenuPath(menuTree, activeMenuId)
    const topId = menuPath && menuPath.length > 0 ? menuPath[0] : null
    const top = topId ? findMenuById(menuTree, topId) : null

    if (!top || !isMasterDataTopMenu(top)) {
      return { topMenu: null as MenuTreeNode | null, activeChildId: "" }
    }

    return { topMenu: top, activeChildId: activeMenuId }
  }, [location.pathname, menuTree])

  if (!topMenu || !topMenu.children || topMenu.children.length === 0) {
    return null
  }

  const handleTabClick = (child: MenuTreeNode) => {
    if (!child.routePath) {
      return
    }
    const companyCd = currentCompanyCd || getCurrentCompanyCd() || resolveDefaultCompanyCd()
    navigate(buildAppPath(companyCd, child.routePath))
  }

  const topMenuLabel = resolveMenuCaption(topMenu, translate)

  return (
    <div className="module-sub-tabs" role="tablist" aria-label={topMenuLabel}>
      {topMenu.children.map((child) => {
        const label = resolveMenuCaption(child, translate)
        const isActive = child.id === activeChildId
        return (
          <button
            key={child.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={child.isDisabled}
            className={`module-sub-tabs__tab${isActive ? " module-sub-tabs__tab--active" : ""}`}
            onClick={() => handleTabClick(child)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
