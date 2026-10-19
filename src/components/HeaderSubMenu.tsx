import { ChevronDown, ChevronRight } from "lucide-react"
import { useContext, useEffect, useRef, useState } from "react"

import { findFirstMenuRoutePath } from "@/api/menuApi"
import { LanguageContext } from "@/lib/i18nLoader"
import type { MenuTreeNode } from "@/types/menu"
import { resolveMenuCaption } from "@/utils/resolveConfigCaption"

import {
  getMenuTrail,
  MenuCurrentCaption,
  MenuCurrentCheck,
  type MenuNode,
} from "./MenuCurrentLocation"
import "./HeaderSubMenu.css"

interface HeaderSubMenuProps {
  rootMenu: MenuTreeNode | null
  activeMenuId: string
  onMenuSelect: (menu: MenuTreeNode) => void
}

export default function HeaderSubMenu({ rootMenu, activeMenuId, onMenuSelect }: HeaderSubMenuProps) {
  const [openPath, setOpenPath] = useState<string[]>([])
  const menuRef = useRef<HTMLElement>(null)
  const languageContext = useContext(LanguageContext) as
    | { translate?: (key: string, fallback?: string) => string }
    | undefined
  const translate = languageContext?.translate ?? ((key: string, fallback?: string) => fallback ?? key)
  const label = (menu: MenuNode) => resolveMenuCaption(menu as MenuTreeNode, translate)

  useEffect(() => {
    setOpenPath([])
  }, [activeMenuId, rootMenu?.id])

  useEffect(() => {
    if (openPath.length === 0) {
      return
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setOpenPath([])
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenPath([])
      }
    }

    window.addEventListener("pointerdown", closeOnOutsidePointer)
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer)
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [openPath.length])

  if (!rootMenu?.children?.length) {
    return null
  }

  const selectMenu = (menu: MenuTreeNode) => {
    const routePath = menu.routePath ?? findFirstMenuRoutePath([menu])
    if (!routePath || menu.isDisabled) {
      return
    }

    setOpenPath([])
    onMenuSelect({ ...menu, routePath })
  }

  const togglePath = (path: string[]) => {
    setOpenPath((current) =>
      current.length === path.length && current.every((id, index) => id === path[index])
        ? path.slice(0, -1)
        : path,
    )
  }

  const renderNestedItems = (items: MenuTreeNode[], parentPath: string[] = []) => (
    <div className="header-submenu__panel-list">
      {items.map((item) => {
        const path = [...parentPath, item.id]
        const children = item.children ?? []
        const hasChildren = children.length > 0
        const isOpen = openPath.length >= path.length && path.every((id, index) => openPath[index] === id)
        const isCurrent = item.id === activeMenuId
        const isActiveBranch = getMenuTrail(item, activeMenuId).length > 0

        return (
          <div key={item.id} className="header-submenu__nested-item">
            <div
              className={`header-submenu__nested-row${isActiveBranch ? " header-submenu__nested-row--active" : ""}`}
            >
              <button
                type="button"
                role="menuitem"
                disabled={item.isDisabled}
                aria-current={isCurrent ? "page" : undefined}
                aria-haspopup={hasChildren ? "menu" : undefined}
                aria-expanded={hasChildren ? isOpen : undefined}
                className="header-submenu__nested-label"
                onClick={() => {
                  if (item.routePath || !hasChildren) {
                    selectMenu(item)
                  } else {
                    togglePath(path)
                  }
                }}
              >
                <span className="header-submenu__label-text">{label(item)}</span>
                <MenuCurrentCheck current={isCurrent} />
              </button>
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={`${translate("OPEN_MENU", "Mở menu")} ${label(item)}`}
                  className="header-submenu__nested-toggle"
                  onClick={() => togglePath(path)}
                >
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            {hasChildren && isOpen ? (
              <div className="header-submenu__flyout" role="menu" aria-label={label(item)}>
                {renderNestedItems(children, path)}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )

  return (
    <nav ref={menuRef} className="header-submenu" aria-label={label(rootMenu)}>
      {rootMenu.children.map((item) => {
        const children = item.children ?? []
        const hasChildren = children.length > 0
        const isOpen = openPath[0] === item.id
        const activeBranch = getMenuTrail(item, activeMenuId).length > 0

        return (
          <div key={item.id} className="header-submenu__root-item">
            <div
              className={`header-submenu__root-row${activeBranch ? " header-submenu__root-row--active" : ""}`}
            >
              <button
                type="button"
                disabled={item.isDisabled}
                aria-current={item.id === activeMenuId ? "page" : undefined}
                aria-haspopup={hasChildren ? "menu" : undefined}
                aria-expanded={hasChildren ? isOpen : undefined}
                className="header-submenu__root-label"
                onClick={() => {
                  if (item.routePath || !hasChildren) {
                    selectMenu(item)
                  } else {
                    togglePath([item.id])
                  }
                }}
              >
                <MenuCurrentCaption item={item} activeMenuId={activeMenuId} label={label} />
              </button>
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={`${translate("OPEN_MENU", "Mở menu")} ${label(item)}`}
                  aria-expanded={isOpen}
                  className="header-submenu__root-toggle"
                  onClick={() => togglePath([item.id])}
                >
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            {hasChildren && isOpen ? (
              <div className="header-submenu__dropdown" role="menu" aria-label={label(item)}>
                {renderNestedItems(children, [item.id])}
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
