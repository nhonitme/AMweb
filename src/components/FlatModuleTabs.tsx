import { ChevronDown } from "lucide-react"
import { useContext, useEffect, useMemo, useState } from "react"
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

const AP_UTILITY_ROUTE_PREFIX = "/ap/utility"

function isApUtilityRoute(routePath: string | null): boolean {
  if (!routePath) return false
  const route = normalizePath(routePath).toLowerCase()
  return route === AP_UTILITY_ROUTE_PREFIX || route.startsWith(`${AP_UTILITY_ROUTE_PREFIX}/`)
}

function getDescendantRoutePaths(node: MenuTreeNode): string[] {
  const paths = node.routePath ? [node.routePath] : []
  for (const child of node.children ?? []) {
    paths.push(...getDescendantRoutePaths(child))
  }
  return paths
}

function isApUtilityFolder(node: MenuTreeNode): boolean {
  if (!node.children?.length) return false

  const childPaths = node.children.flatMap(getDescendantRoutePaths)
  if (childPaths.length === 0) return false

  // A dedicated utility group can itself have a landing route outside
  // /ap/utility; its children still belong to this dropdown.
  const isNamedUtilityGroup = ["AP_UTILITY", "GRP_AP_UTILITY"].includes(node.code.toUpperCase())
  if (isNamedUtilityGroup && childPaths.some(isApUtilityRoute)) return true

  const paths = getDescendantRoutePaths(node)
  return paths.length > 0 && paths.every(isApUtilityRoute)
}

function isUtilitiesTab(child: MenuTreeNode): boolean {
  return child.code.toUpperCase().endsWith("_UTILITY") || isApUtilityFolder(child)
}

function resolveVisibleChildren(children: MenuTreeNode[]): MenuTreeNode[] {
  const ordered = [
    ...children.filter((child) => !isUtilitiesTab(child)),
    ...children.filter((child) => isUtilitiesTab(child)),
  ]

  // A customer database may place utility pages directly under Purchase
  // instead of under an AP_UTILITY folder. Present both shapes identically.
  const directUtilityPages = ordered.filter(
    (child) => !child.children?.length && isApUtilityRoute(child.routePath),
  )
  const existingUtilityFolder = ordered.find(isApUtilityFolder)
  const directIds = new Set(directUtilityPages.map((page) => page.id))
  const withoutDirectPages = ordered.filter((child) => !directIds.has(child.id))

  const groupedChildren = existingUtilityFolder
    ? withoutDirectPages.map((child) =>
        child.id === existingUtilityFolder.id
          ? { ...child, children: [...(child.children ?? []), ...directUtilityPages] }
          : child,
      )
    : directUtilityPages.length > 0
      ? [
          ...withoutDirectPages,
          {
            ...directUtilityPages[0],
            id: "__AP_UTILITY_DROPDOWN__",
            code: "AP_UTILITY",
            name: "Tiện ích",
            labelText: "AP_UTILITY",
            caption: "Tiện ích",
            routePath: null,
            isDisabled: false,
            children: directUtilityPages,
          },
        ]
      : withoutDirectPages

  return groupedChildren.flatMap((child) => {
    // Unlike general-purpose tabs, AP utility must remain a dropdown even
    // when it currently contains only a single page.
    if (!isApUtilityFolder(child) && child.children?.length === 1) {
      return [child.children[0]]
    }
    return [child]
  })
}

export default function FlatModuleTabs() {
  const location = useLocation()
  const navigate = useNavigate()
  const [openUtilityId, setOpenUtilityId] = useState<string | null>(null)

  useEffect(() => {
    setOpenUtilityId(null)
  }, [location.pathname])

  useEffect(() => {
    if (!openUtilityId) return

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenUtilityId(null)
    }
    window.addEventListener("keydown", onEscape)
    return () => window.removeEventListener("keydown", onEscape)
  }, [openUtilityId])
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
    visibleChildren.find((child) =>
      !isApUtilityFolder(child)
      && (child.children?.length ?? 0) > 0
      && containsMenuId(child, activeLeafId),
    ) ?? null

  return (
    <div className="flat-module-tabs-stack">
      <div className="flat-module-tabs" role="tablist" aria-label={label(topMenu)}>
        {visibleChildren.map((child) => {
          const hasChildren = Boolean(child.children && child.children.length > 0)
          const isActive = hasChildren ? containsMenuId(child, activeLeafId) : child.id === activeLeafId

          if (isApUtilityFolder(child)) {
            const isOpen = openUtilityId === child.id
            return (
              <div key={child.id} className="flat-module-tabs__utility-dd">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  disabled={child.isDisabled}
                  className={`flat-module-tabs__utility-trigger${isActive ? " flat-module-tabs__utility-trigger--active" : ""}`}
                  onClick={() => setOpenUtilityId(isOpen ? null : child.id)}
                >
                  {label(child)}
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                {isOpen ? (
                  <>
                    <div
                      className="flat-module-tabs__utility-overlay"
                      onClick={() => setOpenUtilityId(null)}
                    />
                    <div className="flat-module-tabs__utility-menu" role="menu" aria-label={label(child)}>
                      {child.children!.map((item) => {
                        const selected = item.id === activeLeafId || containsMenuId(item, activeLeafId)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="menuitem"
                            disabled={item.isDisabled}
                            aria-current={selected ? "page" : undefined}
                            className={`flat-module-tabs__utility-item${selected ? " flat-module-tabs__utility-item--active" : ""}`}
                            onClick={() => {
                              setOpenUtilityId(null)
                              goTo(item.routePath ?? findFirstRoutePath(item))
                            }}
                          >
                            {label(item)}
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            )
          }

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
