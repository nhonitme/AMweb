import { ChevronDown } from "lucide-react"
import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { containsMenuId, findFirstRoutePath, useFinanceTierState } from "@/hooks/useFinanceTierState"
import {
  buildAppPath,
  getCompanyCdFromPathname,
  getCurrentCompanyCd,
  resolveDefaultCompanyCd,
} from "@/lib/login"
import { OTHER_TAB_CATEGORY_ID, type TabCategory } from "@/lib/menuTabCategories"
import type { MenuTreeNode } from "@/types/menu"

import "./FinanceModuleTabs.css"

export default function TieredModuleTabs() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)

  const currentCompanyCd = getCompanyCdFromPathname(location.pathname) || getCurrentCompanyCd() || ""

  const {
    topMenu,
    activeGroup,
    activeLeafId,
    categories,
    shouldMergeGroupTabs,
    translate,
    label,
    handleGroupClick,
  } = useFinanceTierState()

  useEffect(() => {
    if (!categories) {
      setActiveCategoryId(null)
      return
    }
    const matched = categories.find((category) =>
      category.children.some((child) => containsMenuId(child, activeLeafId)),
    )
    setActiveCategoryId(matched?.id ?? categories[0]?.id ?? null)
  }, [categories, activeLeafId])

  useEffect(() => {
    setOpenCategoryId(null)
  }, [location.pathname])

  if (!topMenu || !topMenu.children || topMenu.children.length === 0) {
    return null
  }

  const categoryLabel = (category: TabCategory) =>
    category.menu ? label(category.menu) : translate(category.labelKey, category.label)

  const isPageActive = (page: MenuTreeNode) => page.id === activeLeafId || containsMenuId(page, activeLeafId)

  const goTo = (routePath: string | null) => {
    if (!routePath) {
      return
    }
    const companyCd = currentCompanyCd || getCurrentCompanyCd() || resolveDefaultCompanyCd()
    navigate(buildAppPath(companyCd, routePath))
  }

  const handlePageClick = (page: MenuTreeNode) => {
    goTo(page.routePath ?? findFirstRoutePath(page))
  }

  const activeCategory = categories?.find((category) => category.id === activeCategoryId) ?? null
  const pagesCrumbLabel = activeCategory ? categoryLabel(activeCategory) : activeGroup ? label(activeGroup) : ""
  const pageChildren = activeCategory?.children ?? activeGroup?.children ?? []

  return (
    <div className="finance-module-tabs">
      {!shouldMergeGroupTabs && (
        <div className="finance-module-tabs__row finance-module-tabs__row--groups" role="tablist" aria-label={label(topMenu)}>
          {topMenu.children.map((group) => {
            const isActive = activeGroup?.id === group.id
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                disabled={group.isDisabled}
                className={`finance-module-tabs__gtab${isActive ? " finance-module-tabs__gtab--active" : ""}`}
                onClick={() => handleGroupClick(group)}
              >
                {label(group)}
              </button>
            )
          })}
        </div>
      )}

      {categories && categories.length > 1 ? (
        <div className="finance-module-tabs__row finance-module-tabs__row--merged" role="tablist" aria-label={activeGroup ? label(activeGroup) : undefined}>
          {categories.map((category) => {
            if (category.id === OTHER_TAB_CATEGORY_ID) {
              return category.children.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  role="tab"
                  aria-selected={isPageActive(page)}
                  disabled={page.isDisabled}
                  className={`finance-module-tabs__ptab${isPageActive(page) ? " finance-module-tabs__ptab--active" : ""}`}
                  onClick={() => handlePageClick(page)}
                >
                  {label(page)}
                </button>
              ))
            }

            const isCategoryActive = category.children.some((child) => isPageActive(child))
            const isOpen = openCategoryId === category.id

            return (
              <div key={category.id} className="finance-module-tabs__catdd">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  className={`finance-module-tabs__catdd-btn${isCategoryActive ? " finance-module-tabs__catdd-btn--active" : ""}`}
                  onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
                >
                  {categoryLabel(category)}
                  <ChevronDown size={14} />
                </button>
                {isOpen && (
                  <>
                    <div className="finance-module-tabs__catdd-overlay" onClick={() => setOpenCategoryId(null)} />
                    <div className="finance-module-tabs__catdd-panel" role="menu">
                      {category.children.map((page) => (
                        <button
                          key={page.id}
                          type="button"
                          role="menuitem"
                          disabled={page.isDisabled}
                          className={`finance-module-tabs__catdd-item${isPageActive(page) ? " finance-module-tabs__catdd-item--active" : ""}`}
                          onClick={() => {
                            handlePageClick(page)
                            setOpenCategoryId(null)
                          }}
                        >
                          {label(page)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : activeGroup && pageChildren.length > 0 ? (
        <div className="finance-module-tabs__row finance-module-tabs__row--pages" role="tablist" aria-label={label(activeGroup)}>
          <span className="finance-module-tabs__crumb">
            {pagesCrumbLabel}
            <span className="finance-module-tabs__crumb-sep">›</span>
          </span>
          {pageChildren.map((page) => (
            <button
              key={page.id}
              type="button"
              role="tab"
              aria-selected={isPageActive(page)}
              disabled={page.isDisabled}
              className={`finance-module-tabs__ptab${isPageActive(page) ? " finance-module-tabs__ptab--active" : ""}`}
              onClick={() => handlePageClick(page)}
            >
              {label(page)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
