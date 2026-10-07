export interface MenuItem {
  MENU_ID: string;
  MENU_CODE: string;
  MENU_NAME: string;
  LABEL_TEXT?: string | null;
  CAPTION?: string | null;
  PARENT_ID: string | null;
  ROUTE_PATH: string | null;
  ICON: string;
  SORT_ORDER: number;
  IS_ACTIVE: boolean;
  IS_VISIBLE: boolean;
  IS_DISABLED: boolean;
}

export interface MenuTreeNode {
  id: string;
  code: string;
  name: string;
  labelText?: string | null;
  caption?: string | null;
  parentId: string | null;
  routePath: string | null;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  isVisible: boolean;
  isDisabled: boolean;
  children?: MenuTreeNode[];
}

export interface MenuTreeNodeApi {
  MENU_ID: string;
  MENU_CODE: string;
  MENU_NAME: string;
  LABEL_TEXT?: string | null;
  CAPTION?: string | null;
  PARENT_ID: string | null;
  ROUTE_PATH: string | null;
  ICON: string | null;
  SORT_ORDER: number;
  IS_DISABLED: boolean;
  CHILDREN?: MenuTreeNodeApi[];
}
