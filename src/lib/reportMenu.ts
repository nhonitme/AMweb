import type { MenuTreeNode } from "@/types/menu";

// "/gl/book/" and "/gl/fs/" are the route prefixes used specifically by
// BÁO CÁO TỔNG HỢP's two groups — Sổ Kế Toán (GL_BOOK: cash book, bank book,
// trial balance, general journal, ledger, ...) and Báo Cáo Tài Chính
// (GL_FS: balance sheet, P&L, cashflow). Mua hàng/Bán hàng have their own,
// differently-prefixed report routes (/ap/report/..., /ar/report/...), so
// there's no overlap risk here — same reasoning as financeMenu.ts's
// "/gl/voucher/" prefix.
//
// node.code is checked first (the reliable signal — see financeMenu.ts's
// comment for why matching by display name doesn't work: node.name is an
// internal code like "GRP_REPORT", not the Vietnamese label), with the
// route prefixes kept as a secondary OR-fallback.
const REPORT_ROUTE_PREFIXES = ["/gl/book/", "/gl/fs/"];
const REPORT_MENU_CODE = "GRP_REPORT";

function collectRoutePaths(node: MenuTreeNode, out: string[]): void {
  if (node.routePath) {
    out.push(node.routePath);
  }
  for (const child of node.children ?? []) {
    collectRoutePaths(child, out);
  }
}

export function isReportTopMenu(node: MenuTreeNode): boolean {
  if (node.parentId) {
    return false;
  }

  if (node.code === REPORT_MENU_CODE) {
    return true;
  }

  const routePaths: string[] = [];
  collectRoutePaths(node, routePaths);
  return routePaths.some((routePath) =>
    REPORT_ROUTE_PREFIXES.some((prefix) => routePath.startsWith(prefix)),
  );
}

export function findReportTopMenu(tree: MenuTreeNode[]): MenuTreeNode | null {
  return tree.find(isReportTopMenu) ?? null;
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
 * Same idea as flattenFinanceMenuForSidebar (src/lib/financeMenu.ts):
 * returns a copy of the tree where the BÁO CÁO TỔNG HỢP top-level node has
 * its children hidden from the Sidebar tree (they render as
 * TieredModuleTabs instead) and gains a routePath (its first descendant's)
 * so clicking it in the sidebar still lands somewhere real. Only affects
 * what the Sidebar renders — routing and everything else keep using the
 * real, full tree.
 */
export function flattenReportMenuForSidebar(tree: MenuTreeNode[]): MenuTreeNode[] {
  const reportNode = findReportTopMenu(tree);
  if (!reportNode) {
    return tree;
  }

  const fallbackRoutePath = reportNode.routePath ?? findFirstRoutePath(reportNode);

  return tree.map((node) =>
    node.id === reportNode.id
      ? { ...node, children: [], routePath: fallbackRoutePath }
      : node,
  );
}
