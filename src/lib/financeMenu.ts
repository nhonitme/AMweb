import type { MenuTreeNode } from "@/types/menu";

// "/gl/voucher/" is the route prefix used specifically by TÀI CHÍNH's
// general-ledger voucher pages (Chứng Từ: /gl/voucher/payment,
// /gl/voucher/receipt, ...), unlike Mua hàng/Bán hàng which reach the same
// underlying pages through their own /ap/purchase/ and /ar/sale aliases
// instead (kept narrow — not just "/gl/" — because Mua hàng/Bán hàng also
// link to their own /gl/book/... report pages, which must NOT count as
// finance). This is the same kind of route-based signal used for "Quản lý
// dữ liệu" (/master/).
//
// A first attempt at matching by display name ("TÀI CHÍNH") silently failed
// against the real backend data — a live localStorage dump of the actual
// menu tree later showed why: node.name isn't a display string at all, it's
// an internal code ("GRP_FINANCE") that only becomes the Vietnamese label
// through an i18n translate() call at render time, so it could never have
// equaled "TÀI CHÍNH". node.code (== node.id here) is the reliable signal
// for that same node, kept as a secondary OR-fallback alongside the route
// prefix above.
const FINANCE_ROUTE_PREFIX = "/gl/voucher/";
const FINANCE_MENU_CODE = "GRP_FINANCE";

function collectRoutePaths(node: MenuTreeNode, out: string[]): void {
  if (node.routePath) {
    out.push(node.routePath);
  }
  for (const child of node.children ?? []) {
    collectRoutePaths(child, out);
  }
}

export function isFinanceTopMenu(node: MenuTreeNode): boolean {
  if (node.parentId) {
    return false;
  }

  if (node.code === FINANCE_MENU_CODE) {
    return true;
  }

  const routePaths: string[] = [];
  collectRoutePaths(node, routePaths);
  return routePaths.some((routePath) => routePath.startsWith(FINANCE_ROUTE_PREFIX));
}

export function findFinanceTopMenu(tree: MenuTreeNode[]): MenuTreeNode | null {
  return tree.find(isFinanceTopMenu) ?? null;
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
 * Same idea as flattenMasterDataMenuForSidebar (src/lib/masterDataMenu.ts):
 * returns a copy of the tree where the TÀI CHÍNH top-level node has its
 * children hidden from the Sidebar tree (they render as TieredModuleTabs
 * instead) and gains a routePath (its first descendant's) so clicking it in
 * the sidebar still lands somewhere real. Only affects what the Sidebar
 * renders — routing and everything else keep using the real, full tree.
 */
export function flattenFinanceMenuForSidebar(tree: MenuTreeNode[]): MenuTreeNode[] {
  const financeNode = findFinanceTopMenu(tree);
  if (!financeNode) {
    return tree;
  }

  const fallbackRoutePath = financeNode.routePath ?? findFirstRoutePath(financeNode);

  return tree.map((node) =>
    node.id === financeNode.id
      ? { ...node, children: [], routePath: fallbackRoutePath }
      : node,
  );
}
