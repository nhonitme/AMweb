import type { MenuTreeNode } from "@/types/menu"

export function menuRoutePaths(tree: MenuTreeNode[]): string[] {
  return tree.flatMap(node => [
    ...(!node.isDisabled && node.routePath ? [node.routePath.replace(/\/$/, "") || "/"] : []),
    ...(node.code?.trim().toUpperCase() === "GRP_OVERVIEW" && !node.isDisabled ? ["/"] : []),
    ...menuRoutePaths(node.children ?? []),
  ])
}

export function matchesMenuRoute(path: string, route: string): boolean {
  const normalized = path.replace(/\/$/, "") || "/"
  return normalized === route || (route !== "/" && normalized.startsWith(route + "/"))
}

export function menuLandingPath(tree: MenuTreeNode[]): string | null {
  const routes = menuRoutePaths(tree)
  if (routes.includes("/")) return "/"
  return routes.find(route => route !== "/dashboard") ?? null
}
