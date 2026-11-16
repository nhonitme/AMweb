import type { MenuItem, MenuTreeNode, MenuTreeNodeApi } from "@/types/menu";
import axios from "./axiosClient";
import { normalizeDevExtremeIconName } from '@/lib/devexpressIcons';
import {
  getApiArrayPayload,
  getApiEnvelopeMessage,
  getApiErrorMessage,
  isApiSuccessPayload,
  logApiError,
  type ApiResponseEnvelope,
} from "./apiTypes";
import { getCurrentCompanyCd } from "@/lib/login";

// Legacy persisted trees are no longer read: product mode and user permissions can change.
export function clearCachedMenuTree(companyCd?: string): void {
  if (typeof window === "undefined") return;
  const suffix = companyCd ? ':' + (companyCd.trim().toUpperCase() || 'DEFAULT') : null;
  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith('menu-tree:') && (!suffix || key.endsWith(suffix))) {
      window.localStorage.removeItem(key);
    }
  }
}

type MenuListApiResponse = ApiResponseEnvelope<MenuItem[]>;
type MenuTreeApiResponse = ApiResponseEnvelope<MenuTreeNodeApi[]>;

export async function fetchMenuList(): Promise<MenuItem[]> {
  try {
    const resp = await axios.get<MenuListApiResponse>("/menu/list", {
      headers: { "Content-Type": "application/json" },
    });
    const result = resp.data;
    if (!isApiSuccessPayload(result)) {
      throw new Error(getApiEnvelopeMessage(result, "Failed to fetch menu list"));
    }
    return getApiArrayPayload<MenuItem>(result);
  } catch (err: unknown) {
    const msg = getApiErrorMessage(err, "Failed to fetch menu list");
    throw new Error(`Failed to fetch menu list: ${msg}`);
  }
}

function resolveMenuCaptionFallback(source: {
  MENU_CODE?: string | null;
  MENU_NAME?: string | null;
  CAPTION?: string | null;
}): string {
  return source.CAPTION?.trim() || source.MENU_NAME?.trim() || source.MENU_CODE?.trim() || "";
}

const mapMenuTreeNodeApi = (node: MenuTreeNodeApi): MenuTreeNode => ({
  id: node.MENU_ID,
  code: node.MENU_CODE,
  name: resolveMenuCaptionFallback(node),
  labelText: node.LABEL_TEXT ?? null,
  caption: resolveMenuCaptionFallback(node),
  parentId: node.PARENT_ID ?? null,
  routePath: node.ROUTE_PATH ?? null,
  icon: normalizeDevExtremeIconName(node.ICON ?? ""),
  sortOrder: node.SORT_ORDER,
  isActive: true,
  isVisible: true,
  isDisabled: node.IS_DISABLED,
  children: node.CHILDREN?.map(mapMenuTreeNodeApi) ?? [],
});

function isMenuRequestCanceled(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) {
    return true;
  }

  if (axios.isCancel(error)) {
    return true;
  }

  if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") {
    return true;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  return error instanceof Error
    && (error.name === "CanceledError" || error.name === "AbortError");
}

export async function fetchMenuTree(companyCd = getCurrentCompanyCd().trim(), signal?: AbortSignal): Promise<MenuTreeNode[]> {
  if (!companyCd) {
    throw new Error("Company context is not ready");
  }

  try {
    const resp = await axios.get<MenuTreeApiResponse>(`/companies/${encodeURIComponent(companyCd)}/menu/tree`, {
      signal,
      headers: { "Content-Type": "application/json" },
    });

    const result = resp.data;
    if (!isApiSuccessPayload(result)) {
      if (import.meta.env.DEV) {
        console.error("Failed to fetch menu tree response", result);
      }

      throw new Error(getApiEnvelopeMessage(result, "Failed to fetch menu tree"));
    }

    const rawTree = getApiArrayPayload<MenuTreeNodeApi>(result);
    const menuTree = rawTree.map(mapMenuTreeNodeApi);
    clearCachedMenuTree(companyCd);
    return menuTree;
  } catch (err: unknown) {
    if (isMenuRequestCanceled(err, signal)) {
      throw err;
    }

    if (import.meta.env.DEV) {
      logApiError("Failed to fetch menu tree request", err);
    }

    const msg = getApiErrorMessage(err, "Failed to fetch menu tree");
    throw new Error(msg === "Failed to fetch menu tree" ? msg : `Failed to fetch menu tree: ${msg}`);
  }
}

export function buildMenuTree(menuItems: MenuItem[]): MenuTreeNode[] {
  const transformedItems: MenuTreeNode[] = menuItems.map((item) => ({
    id: item.MENU_ID,
    code: item.MENU_CODE,
    name: resolveMenuCaptionFallback(item),
    labelText: item.LABEL_TEXT ?? null,
    caption: resolveMenuCaptionFallback(item),
    parentId: item.PARENT_ID,
    routePath: item.ROUTE_PATH,
    icon: normalizeDevExtremeIconName(item.ICON),
    sortOrder: item.SORT_ORDER,
    isActive: item.IS_ACTIVE,
    isVisible: item.IS_VISIBLE,
    isDisabled: item.IS_DISABLED,
    children: [],
  }));

  const visibleItems = transformedItems.filter((item) => item.isVisible && item.isActive);

  const itemMap = new Map<string, MenuTreeNode>();
  visibleItems.forEach((item) => itemMap.set(item.id, { ...item, children: [] }));

  const rootItems: MenuTreeNode[] = [];

  visibleItems.forEach((item) => {
    const node = itemMap.get(item.id);
    if (!node) return;
    if (!item.parentId) {
      rootItems.push(node);
    } else {
      const parent = itemMap.get(item.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        rootItems.push(node);
      }
    }
  });

  const sortByOrder = (nodes: MenuTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => n.children && n.children.length > 0 && sortByOrder(n.children));
  };

  sortByOrder(rootItems);

  return rootItems;
}

const OVERVIEW_MENU_CODE = "GRP_OVERVIEW"

export function findOverviewMenu(tree: MenuTreeNode[]): MenuTreeNode | null {
  for (const node of tree) {
    const code = (node.code || node.id || "").trim().toUpperCase()
    if (code === OVERVIEW_MENU_CODE) {
      return node
    }
    if (node.children && node.children.length > 0) {
      const found = findOverviewMenu(node.children)
      if (found) return found
    }
  }
  return null
}

export function isOverviewPath(pathname: string): boolean {
  const normalized = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
  return normalized === "/" || normalized === "/dashboard"
}

export function findMenuById(tree: MenuTreeNode[], menuId: string): MenuTreeNode | null {
  for (const node of tree) {
    if (node.id === menuId) return node;
    if (node.children && node.children.length > 0) {
      const found = findMenuById(node.children, menuId);
      if (found) return found;
    }
  }
  return null;
}

export function getMenuPath(tree: MenuTreeNode[], menuId: string, path: string[] = []): string[] | null {
  for (const node of tree) {
    const currentPath = [...path, node.id];
    if (node.id === menuId) return currentPath;
    if (node.children && node.children.length > 0) {
      const found = getMenuPath(node.children, menuId, currentPath);
      if (found) return found;
    }
  }
  return null;
}

/** Pass-through: ẩn/hiện menu theo sys_menu / quyền API, FE không lọc thêm. */
export function filterVisibleMenuTree(tree: MenuTreeNode[]): MenuTreeNode[] {
  return tree;
}

export function findFirstMenuRoutePath(tree: MenuTreeNode[]): string | null {
  for (const node of tree) {
    if (node.routePath && !node.isDisabled) {
      return node.routePath;
    }
    if (node.children?.length) {
      const childPath = findFirstMenuRoutePath(node.children);
      if (childPath) {
        return childPath;
      }
    }
  }
  return null;
}
