import type { MenuTreeNode } from "@/types/menu";

const FLAT_MODULE_ROUTE_PREFIXES = [
  "/ap/purchase",
  "/ar/sale",
  "/inventory",
  "/fa",
  "/tax",
  "/einvoice",
  "/pit-withholding",
];

const COSTING_MENU_CODE = "GRP_COSTING";
const COSTING_ROUTE_PREFIX = "/cost";

function isCostingTopMenu(node: MenuTreeNode): boolean {
  if (node.parentId) {
    return false;
  }
  if (node.code === COSTING_MENU_CODE) {
    return true;
  }
  const routePaths: string[] = [];
  collectRoutePaths(node, routePaths);
  return routePaths.some((routePath) => matchesRoutePrefix(routePath, COSTING_ROUTE_PREFIX));
}

function matchesRoutePrefix(routePath: string, prefix: string): boolean {
  return routePath === prefix || routePath.startsWith(`${prefix}/`);
}

function collectRoutePaths(node: MenuTreeNode, out: string[]): void {
  if (node.routePath) {
    out.push(node.routePath);
  }
  for (const child of node.children ?? []) {
    collectRoutePaths(child, out);
  }
}

export function isFlatModuleTopMenu(node: MenuTreeNode): boolean {
  if (node.parentId) {
    return false;
  }

  if (isCostingTopMenu(node)) {
    return true;
  }

  const routePaths: string[] = [];
  collectRoutePaths(node, routePaths);
  return routePaths.some((routePath) =>
    FLAT_MODULE_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(routePath, prefix)),
  );
}

export function findFlatModuleTopMenu(tree: MenuTreeNode[]): MenuTreeNode | null {
  return tree.find(isFlatModuleTopMenu) ?? null;
}

const ICON_OVERRIDES_BY_ROUTE_PREFIX: Record<string, string> = {
  "/einvoice": "doc",
  "/pit-withholding": "checklist",
};

export function getFlatModuleIconOverride(node: MenuTreeNode): string | null {
  if (node.parentId) {
    return null;
  }
  const routePaths: string[] = [];
  collectRoutePaths(node, routePaths);
  for (const [prefix, icon] of Object.entries(ICON_OVERRIDES_BY_ROUTE_PREFIX)) {
    if (routePaths.some((routePath) => matchesRoutePrefix(routePath, prefix))) {
      return icon;
    }
  }
  return null;
}

function collectIds(node: MenuTreeNode, out: Set<string>): void {
  out.add(node.id);
  for (const child of node.children ?? []) {
    collectIds(child, out);
  }
}

export function collectDescendantIds(node: MenuTreeNode): Set<string> {
  const ids = new Set<string>();
  for (const child of node.children ?? []) {
    collectIds(child, ids);
  }
  return ids;
}

function findFirstRoutePath(node: MenuTreeNode): string | null {
  if (node.routePath) {
    return node.routePath;
  }
  for (const child of node.children ?? []) {
    const found = findFirstRoutePath(child);
    if (found) {
      return found;
    }
  }
  return null;
}

function firstDescendantRoutePath(node: MenuTreeNode): string | null {
  for (const child of node.children ?? []) {
    const found = findFirstRoutePath(child);
    if (found) {
      return found;
    }
  }
  return null;
}

function sidebarLandingRoute(node: MenuTreeNode): string | null {
  return firstDescendantRoutePath(node) ?? node.routePath;
}

export function flattenFlatModuleMenusForSidebar(tree: MenuTreeNode[]): MenuTreeNode[] {
  return tree.map((node) => {
    if (!isFlatModuleTopMenu(node)) {
      return node;
    }
    return { ...node, children: [], routePath: sidebarLandingRoute(node) };
  });
}

export function remapActiveMenuForFlatModules(tree: MenuTreeNode[], activeMenu: string): string {
  for (const node of tree) {
    if (isFlatModuleTopMenu(node) && collectDescendantIds(node).has(activeMenu)) {
      return node.id;
    }
  }
  return activeMenu;
}
