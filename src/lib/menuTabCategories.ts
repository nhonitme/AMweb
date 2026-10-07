import type { MenuTreeNode } from "@/types/menu"

export const OTHER_TAB_CATEGORY_ID = "other"

export type TabCategory = {
  id: string
  menu: MenuTreeNode | null
  labelKey: string
  label: string
  children: MenuTreeNode[]
}

/**
 * A child that itself has children is one level of the tab bar (sys_menu
 * PARENT_ID). A group whose children are all pages stays a single row.
 * Pages that sit beside those folders land in "Khác".
 */
export function buildTabCategories(group: MenuTreeNode): TabCategory[] | null {
  const children = group.children ?? []
  const folders = children.filter((child) => (child.children?.length ?? 0) > 0)
  if (folders.length === 0) {
    return null
  }

  const categories: TabCategory[] = folders.map((folder) => ({
    id: folder.id,
    menu: folder,
    labelKey: folder.code,
    label: folder.name,
    children: folder.children ?? [],
  }))

  const leftoverChildren = children.filter((child) => (child.children?.length ?? 0) === 0)
  if (leftoverChildren.length > 0) {
    categories.push({
      id: OTHER_TAB_CATEGORY_ID,
      menu: null,
      labelKey: "OTHER",
      label: "Khác",
      children: leftoverChildren,
    })
  }

  return categories.filter((category) => category.children.length > 0)
}
