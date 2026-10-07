import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { X } from "lucide-react"
import type { Location, NavigateFunction } from "react-router-dom"

import { getDevExtremeIconClass } from "@/lib/devexpressIcons"
import { LanguageContext } from "@/lib/i18nLoader"
import {
  clearAllWorkspaceTabState,
  clearWorkspaceTabState,
} from "@/lib/workspaceTabStateCache"

export type WorkspaceTab = {
  customTitle: boolean
  icon: string
  id: string
  href: string
  pathname: string
  state: unknown
  title: string
  lastActivatedAt: number
}

export type OpenWorkspacePathOptions = {
  replaceScreen?: boolean
  title?: string
  state?: unknown
}

type WorkspaceTabsActions = {
  openWorkspacePath: (target: string, options?: OpenWorkspacePathOptions) => void
  openWorkspaceScreen: (target: string, options?: OpenWorkspacePathOptions) => void
}

type WorkspaceTabsController = WorkspaceTabsActions & {
  activeTabId: string
  closeAllTabs: () => void
  closeOtherTabs: (tabId: string) => void
  closeTab: (tabId: string) => void
  selectTab: (tabId: string) => void
  tabs: WorkspaceTab[]
}

const WorkspaceTabsContext = createContext<WorkspaceTabsActions | null>(null)

export type WorkspaceTabRoute = {
  href: string
  pathname: string
  search: string
  tabId: string
}

const WorkspaceTabRouteContext = createContext<WorkspaceTabRoute | null>(null)

type PendingTabSelection = {
  toTabId: string
  toHref: string
  toState: unknown
}

export function workspaceTabStatesMatch(left: unknown, right: unknown): boolean {
  return left === right || (left == null && right == null)
}

function canonicalizePathname(pathname: string): string {
  const withoutDashboard = pathname.replace(/\/dashboard\/?$/i, "")
  const withoutTrailingSlash = withoutDashboard.length > 1 && withoutDashboard.endsWith("/")
    ? withoutDashboard.slice(0, -1)
    : withoutDashboard
  return withoutTrailingSlash || "/"
}

export function normalizeWorkspaceHref(target: string): string {
  const url = new URL(target, window.location.origin)
  return `${canonicalizePathname(url.pathname)}${url.search}${url.hash}`
}

function pathnameOf(href: string): string {
  return canonicalizePathname(new URL(href, window.location.origin).pathname)
}

function createTabId(sequence: number): string {
  return `workspace-tab-${sequence}`
}

const ICON_ONLY_TAB_WIDTH = 72

export function useWorkspaceTabsController({
  companyCd,
  enabled = true,
  getIcon,
  getTitle,
  location,
  navigate,
  resolveDefaultLandingHref,
}: {
  companyCd: string
  enabled?: boolean
  getIcon: (href: string) => string
  getTitle: (href: string) => string
  location: Location
  navigate: NavigateFunction
  resolveDefaultLandingHref?: () => string
}): WorkspaceTabsController {
  const sequenceRef = useRef(1)
  const activationRef = useRef(1)
  const pendingSelectionRef = useRef<PendingTabSelection | null>(null)
  const initialHref = normalizeWorkspaceHref(`${location.pathname}${location.search}${location.hash}`)
  const [tabs, setTabs] = useState<WorkspaceTab[]>(() => [
    {
      id: createTabId(sequenceRef.current++),
      customTitle: false,
      icon: getIcon(initialHref),
      href: initialHref,
      pathname: location.pathname,
      state: location.state,
      title: getTitle(initialHref),
      lastActivatedAt: activationRef.current++,
    },
  ])
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id)
  const companyRef = useRef(companyCd)

  const makeTab = useCallback(
    (href: string, options?: OpenWorkspacePathOptions): WorkspaceTab => {
      const normalizedHref = normalizeWorkspaceHref(href)
      return {
        customTitle: Boolean(options?.title?.trim()),
        icon: getIcon(normalizedHref),
        id: createTabId(sequenceRef.current++),
        href: normalizedHref,
        pathname: pathnameOf(normalizedHref),
        state: options?.state,
        title: options?.title?.trim() || getTitle(normalizedHref),
        lastActivatedAt: activationRef.current++,
      }
    },
    [getIcon, getTitle],
  )

  const selectTab = useCallback(
    (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId)
      if (!tab) return

      pendingSelectionRef.current = {
        toTabId: tab.id,
        toHref: tab.href,
        toState: tab.state,
      }

      setActiveTabId(tab.id)
      setTabs((currentTabs) =>
        currentTabs.map((item) =>
          item.id === tab.id ? { ...item, lastActivatedAt: activationRef.current++ } : item,
        ),
      )
      navigate(tab.href, { replace: true, state: tab.state })
    },
    [navigate, tabs],
  )

  const openWorkspacePath = useCallback(
    (target: string, options?: OpenWorkspacePathOptions) => {
      const href = normalizeWorkspaceHref(target)
      if (!enabled) {
        navigate(href, { replace: Boolean(options?.replaceScreen), state: options?.state })
        return
      }

      const existing = tabs.find((tab) => tab.href === href)
      if (existing) {
        selectTab(existing.id)
        return
      }

      if (options?.replaceScreen) {
        const pathname = pathnameOf(href)
        const existingScreen = tabs.find((tab) => tab.pathname === pathname)
        if (existingScreen) {
          const providedTitle = options.title?.trim() ?? ""
          const nextTitle = providedTitle || getTitle(href)
          if (existingScreen.href === href && existingScreen.state === options.state && existingScreen.title === nextTitle) {
            selectTab(existingScreen.id)
            return
          }

          pendingSelectionRef.current = {
            toTabId: existingScreen.id,
            toHref: href,
            toState: options.state,
          }
          setActiveTabId(existingScreen.id)
          setTabs((currentTabs) =>
            currentTabs.map((tab) =>
              tab.id === existingScreen.id
                ? {
                    ...tab,
                    customTitle: Boolean(providedTitle),
                    href,
                    icon: getIcon(href),
                    pathname,
                    state: options.state,
                    title: nextTitle,
                    lastActivatedAt: activationRef.current++,
                  }
                : tab,
            ),
          )
          navigate(href, { replace: true, state: options.state })
          return
        }
      }

      const tab = makeTab(href, options)
      pendingSelectionRef.current = {
        toTabId: tab.id,
        toHref: tab.href,
        toState: tab.state,
      }
      setTabs((currentTabs) => [...currentTabs, tab])
      setActiveTabId(tab.id)
      navigate(href, { state: options?.state })
    },
    [enabled, getIcon, getTitle, makeTab, navigate, selectTab, tabs],
  )

  const openWorkspaceScreen = useCallback(
    (target: string, options?: OpenWorkspacePathOptions) => {
      const href = normalizeWorkspaceHref(target)
      if (!enabled) {
        navigate(href, { state: options?.state })
        return
      }

      const pathname = pathnameOf(href)
      const existing = tabs.find((tab) => tab.pathname === pathname)
      if (existing) {
        selectTab(existing.id)
        return
      }
      openWorkspacePath(href, options)
    },
    [enabled, navigate, openWorkspacePath, selectTab, tabs],
  )

  const closeTab = useCallback(
    (tabId: string) => {
      const closingIndex = tabs.findIndex((tab) => tab.id === tabId)
      if (closingIndex < 0) return

      clearWorkspaceTabState(tabId)
      const remaining = tabs.filter((tab) => tab.id !== tabId)
      if (!remaining.length) {
        const landingHref = resolveDefaultLandingHref?.()
          ?? (companyCd ? `/app/${encodeURIComponent(companyCd)}/` : "/")
        const landingTab = makeTab(landingHref)
        setTabs([landingTab])
        setActiveTabId(landingTab.id)
        navigate(landingTab.href, { replace: true })
        return
      }

      setTabs(remaining)
      if (activeTabId !== tabId) return

      const nextTab = remaining[Math.min(closingIndex, remaining.length - 1)]
      setActiveTabId(nextTab.id)
      navigate(nextTab.href, { replace: true, state: nextTab.state })
    },
    [activeTabId, companyCd, makeTab, navigate, resolveDefaultLandingHref, tabs],
  )

  const closeOtherTabs = useCallback(
    (tabId: string) => {
      const retained = tabs.find((tab) => tab.id === tabId)
      if (!retained) return
      if (retained.id !== activeTabId) {
        selectTab(retained.id)
      }
      tabs.forEach((tab) => {
        if (tab.id !== retained.id) {
          clearWorkspaceTabState(tab.id)
        }
      })
      setTabs([retained])
    },
    [activeTabId, selectTab, tabs],
  )

  const closeAllTabs = useCallback(() => {
    pendingSelectionRef.current = null
    clearAllWorkspaceTabState()
    const landingHref = resolveDefaultLandingHref?.()
      ?? (companyCd ? `/app/${encodeURIComponent(companyCd)}/` : "/")
    const landingTab = makeTab(landingHref)
    setTabs([landingTab])
    setActiveTabId(landingTab.id)
    navigate(landingTab.href, { replace: true })
  }, [companyCd, makeTab, navigate, resolveDefaultLandingHref])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const href = normalizeWorkspaceHref(`${location.pathname}${location.search}${location.hash}`)
    const pendingSelection = pendingSelectionRef.current

    if (companyRef.current !== companyCd) {
      companyRef.current = companyCd
      pendingSelectionRef.current = null
      clearAllWorkspaceTabState()
      const replacement = makeTab(href, { state: location.state })
      setTabs([replacement])
      setActiveTabId(replacement.id)
      return
    }

    if (
      pendingSelection
      && (href !== pendingSelection.toHref || !workspaceTabStatesMatch(location.state, pendingSelection.toState))
    ) {
      return
    }

    if (
      pendingSelection
      && href === pendingSelection.toHref
      && workspaceTabStatesMatch(location.state, pendingSelection.toState)
      && tabs.some((tab) => tab.id === pendingSelection.toTabId)
    ) {
      if (activeTabId !== pendingSelection.toTabId) {
        setActiveTabId(pendingSelection.toTabId)
        return
      }
      pendingSelectionRef.current = null
      return
    }

    const active = tabs.find((tab) => tab.id === activeTabId)
    if (active?.href === href && workspaceTabStatesMatch(active.state, location.state)) return

    if (active?.pathname === location.pathname) {
      setTabs((currentTabs) =>
        currentTabs.map((tab) =>
          tab.id === activeTabId
            ? {
                ...tab,
                href,
                pathname: location.pathname,
                state: location.state,
                title: tab.customTitle ? tab.title : getTitle(href),
              }
            : tab,
        ),
      )
      return
    }

    const exact = tabs.find((tab) => tab.href === href)
    if (exact) {
      setActiveTabId(exact.id)
      return
    }

    const newTab = makeTab(href, { state: location.state })
    setTabs((currentTabs) => [...currentTabs, newTab])
    setActiveTabId(newTab.id)
  }, [
    activeTabId,
    companyCd,
    enabled,
    getTitle,
    location.hash,
    location.pathname,
    location.search,
    location.state,
    makeTab,
    tabs,
  ])

  useEffect(() => {
    if (!enabled) {
      return
    }

    setTabs((currentTabs) => {
      let changed = false
      const next = currentTabs.map((tab) => {
        const icon = getIcon(tab.href)
        const title = tab.customTitle ? tab.title : getTitle(tab.href)
        if (icon === tab.icon && title === tab.title) return tab
        changed = true
        return { ...tab, icon, title }
      })
      return changed ? next : currentTabs
    })
  }, [enabled, getIcon, getTitle])

  useEffect(
    () => () => {
      clearAllWorkspaceTabState()
    },
    [],
  )

  return {
    activeTabId,
    closeAllTabs,
    closeOtherTabs,
    closeTab,
    openWorkspacePath,
    openWorkspaceScreen,
    selectTab,
    tabs,
  }
}

export function WorkspaceTabsProvider({
  controller,
  children,
}: {
  controller: WorkspaceTabsController
  children: ReactNode
}) {
  const value = useMemo<WorkspaceTabsActions>(
    () => ({
      openWorkspacePath: controller.openWorkspacePath,
      openWorkspaceScreen: controller.openWorkspaceScreen,
    }),
    [controller.openWorkspacePath, controller.openWorkspaceScreen],
  )

  return <WorkspaceTabsContext.Provider value={value}>{children}</WorkspaceTabsContext.Provider>
}

export function useWorkspaceTabs(): WorkspaceTabsActions {
  const context = useContext(WorkspaceTabsContext)
  if (!context) {
    throw new Error("useWorkspaceTabs must be used inside WorkspaceTabsProvider")
  }
  return context
}

export function WorkspaceTabRouteProvider({
  tab,
  children,
}: {
  tab: WorkspaceTab
  children: ReactNode
}) {
  const value = useMemo<WorkspaceTabRoute>(() => {
    const url = new URL(tab.href, window.location.origin)
    return {
      href: tab.href,
      pathname: url.pathname,
      search: url.search,
      tabId: tab.id,
    }
  }, [tab.href, tab.id])

  return <WorkspaceTabRouteContext.Provider value={value}>{children}</WorkspaceTabRouteContext.Provider>
}

export function useWorkspaceTabRoute(): WorkspaceTabRoute | null {
  return useContext(WorkspaceTabRouteContext)
}

export function WorkspaceTabBar({
  activeTabId,
  onCloseAll,
  onCloseOthers,
  onClose,
  onSelect,
  tabs,
}: {
  activeTabId: string
  onCloseAll: () => void
  onCloseOthers: (tabId: string) => void
  onClose: (tabId: string) => void
  onSelect: (tabId: string) => void
  tabs: WorkspaceTab[]
}) {
  const languageContext = useContext(LanguageContext) as
    | { translate?: (key: string, fallback?: string) => string }
    | null
  const translate = languageContext?.translate ?? ((key: string, fallback?: string) => fallback ?? key)

  const [contextMenu, setContextMenu] = useState<{
    left: number
    tabId: string
    top: number
  } | null>(null)

  useEffect(() => {
    if (!contextMenu) return

    const closeMenu = () => setContextMenu(null)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu()
    }

    document.addEventListener("click", closeMenu)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("blur", closeMenu)
    window.addEventListener("resize", closeMenu)
    return () => {
      document.removeEventListener("click", closeMenu)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("blur", closeMenu)
      window.removeEventListener("resize", closeMenu)
    }
  }, [contextMenu])

  const barRef = useRef<HTMLDivElement>(null)
  const [iconOnly, setIconOnly] = useState(false)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    const measure = () => {
      const styles = window.getComputedStyle(bar)
      const padding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0
      const available = bar.clientWidth - padding - gap * Math.max(0, tabs.length - 1)
      const tabWidth = tabs.length > 0 ? available / tabs.length : ICON_ONLY_TAB_WIDTH
      setIconOnly(tabWidth < ICON_ONLY_TAB_WIDTH)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [tabs.length])

  return (
    <>
      <div
        ref={barRef}
        className="flex h-8 w-full min-w-0 flex-none items-end gap-0.5 overflow-hidden border-b border-gray-200 bg-gray-100 px-1 pt-1"
        role="tablist"
        aria-label={translate("WORKSPACE_OPEN_TABS", "Màn hình đang mở")}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              title={tab.title}
              className={`group relative flex h-7 min-w-0 max-w-60 flex-1 basis-0 items-center overflow-hidden rounded-t border border-b-0 text-xs ${
                iconOnly ? "justify-center px-1" : "px-1.5"
              } ${
                active
                  ? "border-gray-300 bg-white font-medium text-blue-700"
                  : "border-transparent bg-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              onContextMenu={(event) => {
                event.preventDefault()
                setContextMenu({
                  left: Math.max(4, Math.min(event.clientX, window.innerWidth - 170)),
                  tabId: tab.id,
                  top: Math.max(4, Math.min(event.clientY, window.innerHeight - 110)),
                })
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={tab.title}
                className={`flex min-w-0 items-center gap-1 overflow-hidden text-left ${
                  iconOnly ? "" : `flex-1 ${active ? "" : "group-hover:pr-4"}`
                }`}
                onClick={() => onSelect(tab.id)}
              >
                <span
                  className={`${getDevExtremeIconClass(tab.icon)} shrink-0 text-base leading-none ${
                    iconOnly ? "group-hover:opacity-0" : ""
                  } ${active ? "am-icon-workspace-tab-active" : "am-icon-workspace-tab-inactive"}`}
                  aria-hidden="true"
                />
                {iconOnly ? null : <span className="min-w-0 flex-1 truncate">{tab.title}</span>}
              </button>
              <button
                type="button"
                aria-label={translate("WORKSPACE_CLOSE_TAB_NAMED", "Đóng {0}").replace("{0}", tab.title)}
                className={
                  iconOnly
                    ? "absolute inset-0 flex items-center justify-center text-gray-400 opacity-0 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 hover:text-gray-700"
                    : active
                      ? "relative z-[1] ml-1 shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                      : "absolute right-1 rounded p-0.5 text-gray-400 opacity-0 pointer-events-none hover:bg-gray-200 hover:text-gray-700 group-hover:pointer-events-auto group-hover:opacity-100"
                }
                onClick={() => onClose(tab.id)}
              >
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
      {contextMenu ? (
        <div
          role="menu"
          className="fixed z-[1000] w-40 rounded border border-gray-200 bg-white py-1 text-sm shadow-lg"
          style={{ left: contextMenu.left, top: contextMenu.top }}
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-100"
            onClick={() => onClose(contextMenu.tabId)}
          >
            {translate("WORKSPACE_CLOSE_TAB", "Đóng tab")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={tabs.length <= 1}
            onClick={() => onCloseOthers(contextMenu.tabId)}
          >
            {translate("WORKSPACE_CLOSE_OTHER_TABS", "Đóng tab khác")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-100"
            onClick={onCloseAll}
          >
            {translate("WORKSPACE_CLOSE_ALL_TABS", "Đóng tất cả")}
          </button>
        </div>
      ) : null}
    </>
  )
}

