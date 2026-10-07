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
import { isFlatModuleTopMenu } from "@/lib/flatModuleMenus"
import type { MenuTreeNode } from "@/types/menu"
import { resolveMenuCaption } from "@/utils/resolveConfigCaption"

import "./FlatModuleTabs.css"

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

function containsMenuId(node: MenuTreeNode, id: string): boolean {
  if (node.id === id) {
    return true
  }
  return (node.children ?? []).some((child) => containsMenuId(child, id))
}

function findFirstRoutePath(node: MenuTreeNode): string | null {
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

function isUtilitiesTab(child: MenuTreeNode): boolean {
  return child.code.toUpperCase().endsWith("_UTILITY")
}

function resolveVisibleChildren(children: MenuTreeNode[]): MenuTreeNode[] {
  const ordered = [
    ...children.filter((child) => !isUtilitiesTab(child)),
    ...children.filter((child) => isUtilitiesTab(child)),
  ]
  return ordered.flatMap((child) => {
    if (child.children && child.children.length === 1) {
      return [child.children[0]]
    }
    return [child]
  })
}

export default function FlatModuleTabs() {
  const location = useLocation()
  const navigate = useNavigate()
  const languageContext = useContext(LanguageContext) as
    | { translate?: (key: string, fallback?: string) => string }
    | undefined
  const translate = languageContext?.translate ?? ((key: string, fallback?: string) => fallback ?? key)

  const currentCompanyCd = getCompanyCdFromPathname(location.pathname) || getCurrentCompanyCd() || ""
  const { data: menuTree = [] } = useMenuTreeQuery(currentCompanyCd)

  const { topMenu, activeLeafId } = useMemo(() => {
    const scopedPathname = stripCompanyPath(location.pathname)
    const activeMenuId = findActiveMenuId(scopedPathname, menuTree)
    if (!activeMenuId) {
      return { topMenu: null as MenuTreeNode | null, activeLeafId: "" }
    }

    const menuPath = getMenuPath(menuTree, activeMenuId)
    const topId = menuPath && menuPath.length > 0 ? menuPath[0] : null
    const top = topId ? findMenuById(menuTree, topId) : null

    if (!top || !isFlatModuleTopMenu(top)) {
      return { topMenu: null as MenuTreeNode | null, activeLeafId: "" }
    }

    return { topMenu: top, activeLeafId: activeMenuId }
  }, [location.pathname, menuTree])

  if (!topMenu || !topMenu.children || topMenu.children.length === 0) {
    return null
  }

  const label = (node: MenuTreeNode) => resolveMenuCaption(node, translate)

  const goTo = (routePath: string | null) => {
    if (!routePath) {
      return
    }
    const companyCd = currentCompanyCd || getCurrentCompanyCd() || resolveDefaultCompanyCd()
    navigate(buildAppPath(companyCd, routePath))
  }

  const visibleChildren = resolveVisibleChildren(topMenu.children)
  const activeFolder =
    visibleChildren.find((child) => (child.children?.length ?? 0) > 0 && containsMenuId(child, activeLeafId)) ?? null

  return (
    <div className="flat-module-tabs-stack">
      <div className="flat-module-tabs" role="tablist" aria-label={label(topMenu)}>
        {visibleChildren.map((child) => {
          const hasChildren = Boolean(child.children && child.children.length > 0)
          const isActive = hasChildren ? containsMenuId(child, activeLeafId) : child.id === activeLeafId

          return (
            <button
              key={child.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={child.isDisabled}
              className={`flat-module-tabs__tab${isActive ? " flat-module-tabs__tab--active" : ""}`}
              onClick={() => goTo(hasChildren ? (child.routePath ?? findFirstRoutePath(child)) : child.routePath)}
            >
              {label(child)}
            </button>
          )
        })}
      </div>

      {activeFolder ? (
        <div className="flat-module-tabs flat-module-tabs--sub" role="tablist" aria-label={label(activeFolder)}>
          <span className="flat-module-tabs__crumb">
            {label(activeFolder)}
            <span className="flat-module-tabs__crumb-sep">›</span>
          </span>
          {activeFolder.children!.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === activeLeafId || containsMenuId(item, activeLeafId)}
              disabled={item.isDisabled}
              className={`flat-module-tabs__subtab${item.id === activeLeafId || containsMenuId(item, activeLeafId) ? " flat-module-tabs__subtab--active" : ""}`}
              onClick={() => goTo(item.routePath ?? findFirstRoutePath(item))}
            >
              {label(item)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
