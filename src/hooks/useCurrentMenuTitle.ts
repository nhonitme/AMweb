import { useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";

import { findMenuById, findOverviewMenu, isOverviewPath } from "@/api/menuApi";
import { SHOW_DASHBOARD } from "@/lib/featureVisibility";
import { useMenuTreeQuery } from "@/hooks/queries/useMenuTreeQuery";
import { LanguageContext } from "@/lib/i18nLoader";
import { getCompanyCdFromPathname, getCurrentCompanyCd } from "@/lib/login";
import type { MenuTreeNode } from "@/types/menu";
import { resolveMenuCaption } from "@/utils/resolveConfigCaption";

// Mirrors App.tsx's own path-scoping/menu-matching logic so any component
// (not just the top-level layout) can find out which sidebar menu item the
// current route belongs to. Kept as a self-contained copy rather than an
// import from App.tsx to avoid coupling this hook to the app shell.
function stripCompanyPath(pathname: string): string {
  const companyCd = getCompanyCdFromPathname(pathname);
  if (!companyCd) {
    return pathname;
  }

  return pathname.replace(/^\/app\/[^/]+/i, "") || "/";
}

function getActiveMenuFromPath(pathname: string, tree: MenuTreeNode[]): string {
  if (isOverviewPath(pathname)) {
    if (!SHOW_DASHBOARD) {
      return "";
    }
    return findOverviewMenu(tree)?.id ?? "";
  }

  const normalize = (path: string) => (path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path);
  const normalizedPath = normalize(pathname);

  const flatten = (nodes: MenuTreeNode[], output: MenuTreeNode[] = []) => {
    for (const node of nodes) {
      if (node.routePath) {
        output.push(node);
      }
      if (node.children && node.children.length) {
        flatten(node.children, output);
      }
    }
    return output;
  };

  const candidates = flatten(tree)
    .filter((node) => node.routePath)
    .map((node) => ({ ...node, routePath: normalize(node.routePath as string) }));

  let best: MenuTreeNode | null = null;
  let bestLength = -1;
  for (const candidate of candidates) {
    const routePath = candidate.routePath as string;
    if (
      normalizedPath === routePath ||
      normalizedPath.startsWith(routePath + "/") ||
      normalizedPath.startsWith(routePath)
    ) {
      if (routePath.length > bestLength) {
        best = candidate;
        bestLength = routePath.length;
      }
    }
  }

  return best ? best.id : "";
}

/**
 * Returns the (translated) display name of the sidebar menu item that
 * matches the current route, e.g. "Đối tượng tập hợp chi phí". Returns an
 * empty string while the menu tree is still loading or when no menu item
 * matches the current path.
 */
export function useCurrentMenuTitle(): string {
  const location = useLocation();
  const languageContext = useContext(LanguageContext) as
    | { translate?: (key: string, fallback?: string) => string }
    | undefined;
  const translate = languageContext?.translate;

  const currentCompanyCd = getCompanyCdFromPathname(location.pathname) || getCurrentCompanyCd() || "";
  const { data: menuTree = [] } = useMenuTreeQuery(currentCompanyCd);

  return useMemo(() => {
    const scopedPathname = stripCompanyPath(location.pathname);
    const activeMenuId = getActiveMenuFromPath(scopedPathname, menuTree);
    const currentMenuItem = activeMenuId ? findMenuById(menuTree, activeMenuId) : null;
    if (!currentMenuItem) {
      return "";
    }
    return translate
      ? resolveMenuCaption(currentMenuItem, translate)
      : currentMenuItem.caption || currentMenuItem.name;
  }, [location.pathname, menuTree, translate]);
}
