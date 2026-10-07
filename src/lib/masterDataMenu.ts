import type { MenuTreeNode } from "@/types/menu";

const MASTER_DATA_ROUTE_PREFIX = "/master/";

function collectRoutePaths(node: MenuTreeNode, out: string[]): void {
  if (node.routePath) {
    out.push(node.routePath);
  }
  for (const child of node.children ?? []) {
    collectRoutePaths(child, out);
  }
}

/**
 * A top-level menu node is treated as the "Quản lý dữ liệu" (master data)
 * module when any of its descendants route to /master/*. Matching by route
 * prefix (instead of the translated display name) keeps this correct
 * regardless of language or label changes coming from the backend menu data.
 */
export function isMasterDataTopMenu(node: MenuTreeNode): boolean {
  if (node.parentId) {
    return false;
  }

  const routePaths: string[] = [];
  collectRoutePaths(node, routePaths);
  return routePaths.some((routePath) => routePath.startsWith(MASTER_DATA_ROUTE_PREFIX));
}

export function findMasterDataTopMenu(tree: MenuTreeNode[]): MenuTreeNode | null {
  return tree.find(isMasterDataTopMenu) ?? null;
}

function collectIds(node: MenuTreeNode, out: Set<string>): void {
  out.add(node.id);
  for (const child of node.children ?? []) {
    collectIds(child, out);
  }
}

/** All descendant ids of a node (not including the node's own id). */
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

/**
 * Returns a copy of the tree where the master-data top-level node has its
 * children hidden (so the Sidebar renders it as a flat, non-expandable item
 * instead of a nested tree) and gains a routePath (falling back to its first
 * descendant's route) so clicking it in the sidebar still navigates
 * somewhere sensible. This is used ONLY for what the Sidebar renders —
 * routing, the current-menu title, and everything else keep using the real,
 * full tree so no other behavior changes.
 */
export function flattenMasterDataMenuForSidebar(tree: MenuTreeNode[]): MenuTreeNode[] {
  const masterDataNode = findMasterDataTopMenu(tree);
  if (!masterDataNode) {
    return tree;
  }

  const fallbackRoutePath = masterDataNode.routePath ?? findFirstRoutePath(masterDataNode);

  return tree.map((node) =>
    node.id === masterDataNode.id
      ? { ...node, children: [], routePath: fallbackRoutePath }
      : node,
  );
}
