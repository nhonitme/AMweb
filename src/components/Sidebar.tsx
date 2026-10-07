import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import LoadIndicator from 'devextreme-react/load-indicator';
import TextBox from 'devextreme-react/text-box';
import TreeView from 'devextreme-react/tree-view';
import type dxTreeView from 'devextreme/ui/tree_view';
import type { ItemClickEvent, ItemCollapsedEvent, ItemExpandedEvent } from 'devextreme/ui/tree_view';
import ShortcutHelpPopup from '@/components/shortcuts/ShortcutHelpPopup';
import { useMenuLayout } from '@/components/menu-layout-provider';
import useShortcutBindings from '@/hooks/useShortcutBindings';
import useShortcutHelp from '@/hooks/useShortcutHelp';
import { getDevExtremeIconClass } from '@/lib/devexpressIcons';
import { getSidebarTopLevelIcon } from '@/lib/sidebarTopMenuIcons';
import { LanguageContext } from '@/lib/i18nLoader';
import { createShortcutBindings } from '@/lib/shortcuts/shortcutBindings';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts/shortcutDefinitions';
import {
  filterMenuTreeBySearchTerm,
  splitHighlightedText,
} from '@/lib/menuSearch';
import type { MenuTreeNode } from '@/types/menu';
import { resolveMenuCaption } from '@/utils/resolveConfigCaption';

interface SidebarProps {
  menuTree: MenuTreeNode[];
  /**
   * Full, un-flattened menu tree used only to look up a collapsed item's
   * children for the hover flyout. `menuTree` itself may have some
   * top-level nodes' children hidden (see the flatten*ForSidebar helpers)
   * so the always-visible sidebar renders them as flat items instead of a
   * nested tree; the flyout should still be able to show those children
   * when the user hovers a collapsed icon. Falls back to `menuTree` when
   * not provided.
   */
  flyoutMenuTree?: MenuTreeNode[];
  activeMenu: string;
  onMenuSelect: (menuItem: MenuTreeNode) => void;
  isCollapsed: boolean;
  isMobile?: boolean;
  loading: boolean;
  onRequestExpand?: () => void;
}

interface SidebarTreeItem {
  id: string;
  text: string;
  icon: string;
  disabled: boolean;
  expanded: boolean;
  hasChildren: boolean;
  routePath: string | null;
  searchTerm: string;
  source: MenuTreeNode;
  items?: SidebarTreeItem[];
}

type Translate = (key: string, fallback?: string) => string;
type SidebarTreeEvent = ItemClickEvent<SidebarTreeItem, string>;
type SidebarTreeExpandedEvent = ItemExpandedEvent<SidebarTreeItem, string>;
type SidebarTreeCollapsedEvent = ItemCollapsedEvent<SidebarTreeItem, string>;
type SidebarTreeViewRef = {
  instance: () => dxTreeView<SidebarTreeItem, string>;
};

const AMNOTE_LOGO_SRC = '/img/amnote_logo.svg';

function normalizeDisplayText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function buildTooltipText(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => normalizeDisplayText(part))
    .filter(Boolean)
    .join('\n');
}

function getActiveMenuPath(nodes: MenuTreeNode[], activeMenu: string, path: string[] = []): string[] {
  if (!activeMenu) {
    return [];
  }

  for (const node of nodes) {
    const nextPath = [...path, node.id];
    if (node.id === activeMenu) {
      return nextPath;
    }

    const childPath = getActiveMenuPath(node.children ?? [], activeMenu, nextPath);
    if (childPath.length > 0) {
      return childPath;
    }
  }

  return [];
}

function findNodeById(nodes: MenuTreeNode[], id: string): MenuTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findNodeById(node.children ?? [], id);
    if (found) {
      return found;
    }
  }
  return null;
}

function renderHighlightedText(text: string, term: string): ReactNode {
  return splitHighlightedText(text, term).map((part, index) =>
    part.highlighted
      ? <span key={index} className="rounded-sm bg-amber-100 px-0.5 font-semibold text-slate-800">{part.text}</span>
      : part.text,
  );
}

function toSidebarTreeItem(
  node: MenuTreeNode,
  translate: Translate,
  expandedIds: string[],
  searchTerm: string,
  includeChildren: boolean,
): SidebarTreeItem {
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const translatedText = resolveMenuCaption(node, translate);
  const isSearching = searchTerm.trim().length > 0;

  return {
    id: node.id,
    text: translatedText,
    icon: node.icon,
    disabled: node.isDisabled,
    expanded: isSearching || expandedIds.includes(node.id),
    hasChildren,
    routePath: node.routePath,
    searchTerm,
    source: node,
    items: includeChildren && hasChildren
      ? children.map((child) => toSidebarTreeItem(
          child,
          translate,
          expandedIds,
          searchTerm,
          includeChildren,
        ))
      : undefined,
  };
}

function renderExpandedTreeItemContent(item: SidebarTreeItem, active: boolean): ReactNode {
  const isTopLevel = !item.source.parentId;

  let iconNode: ReactNode = null;
  if (isTopLevel) {
    // Top-level groups (Quan ly du lieu, Tai chinh, Mua hang, ...) use the
    // same curated Lucide icon set as the collapsed icon rail, so expanding
    // the sidebar doesn't swap every icon out for a different style.
    const TopLevelIcon = getSidebarTopLevelIcon(item.source);
    iconNode = <TopLevelIcon size={17} aria-hidden="true" />;
  } else if (item.icon) {
    const iconClassName = getDevExtremeIconClass(item.icon);
    iconNode = <span className={iconClassName} aria-hidden="true" />;
  }

  return (
    <div className={`am-sidebar-tree-item ${active ? 'am-sidebar-tree-item-active' : ''}`} title={item.text}>
      {iconNode}
      <span className="am-sidebar-tree-item-text">{renderHighlightedText(item.text, item.searchTerm)}</span>
    </div>
  );
}

export default function Sidebar({
  menuTree,
  flyoutMenuTree,
  activeMenu,
  onMenuSelect,
  isCollapsed,
  isMobile = false,
  loading,
  onRequestExpand,
}: SidebarProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [flyoutRoot, setFlyoutRoot] = useState<SidebarTreeItem | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(8);
  const flyoutPanelRef = useRef<HTMLDivElement | null>(null);
  const flyoutAnchorRef = useRef<HTMLElement | null>(null);
  const expandedTreeViewRef = useRef<SidebarTreeViewRef | null>(null);
  const pendingExpandedScrollTopRef = useRef<number | null>(null);
  const { translate = (key: string) => key, lang, labelsLoading = false } = useContext(LanguageContext) as {
    translate?: Translate;
    lang?: string;
    labelsLoading?: boolean;
  };
  const { menuLayout } = useMenuLayout();
  const showMenuSearch = menuLayout !== 'header';
  const treeStructureKey = menuTree.some((node) => (node.children?.length ?? 0) > 0) ? 'tree' : 'flat';
  const treeViewKey = `${lang ?? 'VIET'}-${labelsLoading ? 'loading' : 'ready'}-${treeStructureKey}`;
  const shortcutActions = useMemo(
    () => (
      showMenuSearch
        ? [SHORTCUT_ACTIONS.FOCUS_MENU_SEARCH, SHORTCUT_ACTIONS.HELP]
        : [SHORTCUT_ACTIONS.HELP]
    ),
    [showMenuSearch],
  );
  const {
    shortcutHelpVisible,
    shortcutHelpItems,
    openShortcutHelp,
    closeShortcutHelp,
  } = useShortcutHelp(shortcutActions);

  const brandTooltip = useMemo(
    () => buildTooltipText(
      'AMnote',
      translate('ACCOUNTING_SOFTWARE', 'Phần mềm kế toán'),
    ),
    [translate],
  );

  const filteredMenuTree = useMemo(
    () => filterMenuTreeBySearchTerm(menuTree, searchTerm, translate),
    [menuTree, searchTerm, translate],
  );

  const activeMenuIds = useMemo(
    () => new Set(getActiveMenuPath(menuTree, activeMenu)),
    [activeMenu, menuTree],
  );

  useEffect(() => {
    const path = getActiveMenuPath(menuTree, activeMenu);
    if (path.length < 2) {
      return;
    }

    const ancestorIds = path.slice(0, -1);
    setExpandedIds((previous) => {
      const missing = ancestorIds.filter((id) => !previous.includes(id));
      return missing.length === 0 ? previous : [...previous, ...missing];
    });
  }, [activeMenu, menuTree]);

  const selectedItemKeys = useMemo(
    () => (activeMenu ? [activeMenu] : []),
    [activeMenu],
  );

  const expandedTreeItems = useMemo(
    () => filteredMenuTree.map((node) => toSidebarTreeItem(
      node,
      translate,
      expandedIds,
      searchTerm,
      true,
    )),
    [expandedIds, filteredMenuTree, searchTerm, translate],
  );

  const collapsedTreeItems = useMemo(
    () => menuTree.map((node) => {
      const item = toSidebarTreeItem(node, translate, expandedIds, '', false);
      // A top-level node may have had its children hidden just so the
      // always-visible (expanded) sidebar renders it as a flat item — see
      // the flatten*ForSidebar helpers. When collapsed, the icon-only view
      // should still open a hover flyout if the node really has children,
      // so recheck against the full tree before giving up on hasChildren.
      if (!item.hasChildren) {
        const fullNode = findNodeById(flyoutMenuTree ?? menuTree, node.id);
        if (fullNode && (fullNode.children?.length ?? 0) > 0) {
          return { ...item, hasChildren: true };
        }
      }
      return item;
    }),
    [expandedIds, flyoutMenuTree, menuTree, translate],
  );

  const flyoutTreeItems = useMemo(() => {
    if (!flyoutRoot) {
      return [];
    }
    const fullNode = findNodeById(flyoutMenuTree ?? menuTree, flyoutRoot.id) ?? flyoutRoot.source;
    return (fullNode.children ?? []).map((node) => toSidebarTreeItem(
      node,
      translate,
      expandedIds,
      '',
      true,
    ));
  }, [expandedIds, flyoutMenuTree, flyoutRoot, menuTree, translate]);

  const isTreeItemActive = useCallback(
    (item: SidebarTreeItem) => activeMenuIds.has(item.id),
    [activeMenuIds],
  );

  const renderExpandedTreeItem = useCallback(
    (item: SidebarTreeItem): ReactNode => renderExpandedTreeItemContent(item, isTreeItemActive(item)),
    [isTreeItemActive],
  );

  const restoreExpandedTreeScrollTop = useCallback(() => {
    const scrollTop = pendingExpandedScrollTopRef.current;
    if (scrollTop === null) {
      return;
    }

    const treeView = expandedTreeViewRef.current?.instance();
    const scrollable = treeView?.getScrollable();
    if (!scrollable) {
      return;
    }

    pendingExpandedScrollTopRef.current = null;
    scrollable.scrollTo({ top: scrollTop });
    window.requestAnimationFrame(() => {
      treeView.getScrollable()?.scrollTo({ top: scrollTop });
    });
  }, []);

  const rememberExpandedTreeScrollTop = useCallback(() => {
    const scrollTop = expandedTreeViewRef.current?.instance().getScrollable()?.scrollTop();
    pendingExpandedScrollTopRef.current = typeof scrollTop === 'number' ? scrollTop : null;
  }, []);

  const handleMenuSelect = useCallback((menuItem: MenuTreeNode) => {
    onMenuSelect(menuItem);
  }, [onMenuSelect]);

  const handleExpandedItemClick = useCallback((event: SidebarTreeEvent) => {
    const item = event.itemData;
    if (!item || item.disabled || item.hasChildren || !item.routePath) {
      return;
    }

    rememberExpandedTreeScrollTop();
    handleMenuSelect(item.source);
  }, [handleMenuSelect, rememberExpandedTreeScrollTop]);

  const handleCollapsedItemClick = useCallback((event: SidebarTreeEvent) => {
    const item = event.itemData;
    if (!item || item.disabled) {
      return;
    }

    // Some collapsed top-level items (e.g. Quản lý dữ liệu, Tài Chính) have
    // hasChildren=true purely so hovering can open the flyout (see
    // collapsedTreeItems above) even though their own row in the flattened
    // sidebar tree carries a sensible fallback routePath. Clicking the icon
    // itself should still navigate there; only truly route-less parent
    // categories (no routePath at all) do nothing on click and rely on the
    // flyout/expand instead.
    if (item.routePath) {
      handleMenuSelect(item.source);
      setFlyoutRoot(null);
    }
  }, [handleMenuSelect]);

  const openCollapsedFlyout = useCallback((item: SidebarTreeItem, anchor: HTMLElement) => {
    if (item.disabled || !item.hasChildren) {
      flyoutAnchorRef.current = null;
      setFlyoutRoot(null);
      return;
    }

    flyoutAnchorRef.current = anchor;
    const rect = anchor.getBoundingClientRect();
    setFlyoutRoot(item);
    setFlyoutTop(Math.max(rect.top - 8, 8));
  }, []);

  const closeCollapsedFlyout = useCallback(() => {
    flyoutAnchorRef.current = null;
    setFlyoutRoot(null);
  }, []);

  useLayoutEffect(() => {
    if (!flyoutRoot) {
      return;
    }

    const updateFlyoutPosition = () => {
      const panel = flyoutPanelRef.current;
      const anchor = flyoutAnchorRef.current;
      if (!panel || !anchor) {
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const panelHeight = panel.getBoundingClientRect().height;
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const margin = 8;
      const spaceBelow = viewportBottom - anchorRect.top;
      const spaceAbove = anchorRect.bottom - viewportTop;
      const openUp = spaceBelow < panelHeight + margin && spaceAbove > spaceBelow;
      const preferredTop = openUp
        ? anchorRect.bottom - panelHeight + margin
        : anchorRect.top - margin;
      const minTop = viewportTop + margin;
      const maxTop = Math.max(minTop, viewportBottom - panelHeight - margin);

      setFlyoutTop(Math.min(Math.max(preferredTop, minTop), maxTop));
    };

    updateFlyoutPosition();
    window.addEventListener('resize', updateFlyoutPosition);
    window.visualViewport?.addEventListener('resize', updateFlyoutPosition);
    window.visualViewport?.addEventListener('scroll', updateFlyoutPosition);

    return () => {
      window.removeEventListener('resize', updateFlyoutPosition);
      window.visualViewport?.removeEventListener('resize', updateFlyoutPosition);
      window.visualViewport?.removeEventListener('scroll', updateFlyoutPosition);
    };
  }, [flyoutRoot, flyoutTreeItems]);

  const renderCollapsedTreeItem = useCallback((item: SidebarTreeItem): ReactNode => {
    const active = isTreeItemActive(item);
    const isTopLevel = !item.source.parentId;

    let iconNode: ReactNode;
    if (isTopLevel) {
      const TopLevelIcon = getSidebarTopLevelIcon(item.source);
      iconNode = <TopLevelIcon size={19} aria-hidden="true" />;
    } else if (item.icon) {
      const iconClassName = getDevExtremeIconClass(item.icon);
      iconNode = <span className={iconClassName} aria-hidden="true" />;
    } else {
      iconNode = <span className="dx-icon dx-icon-folder" aria-hidden="true" />;
    }

    return (
      <div
        className={`am-sidebar-tree-item-collapsed ${active ? 'am-sidebar-tree-item-active' : ''}`}
        title={item.text}
        onMouseEnter={(event) => openCollapsedFlyout(item, event.currentTarget)}
      >
        {iconNode}
      </div>
    );
  }, [isTreeItemActive, openCollapsedFlyout]);

  const handleFlyoutItemClick = useCallback((event: SidebarTreeEvent) => {
    const item = event.itemData;
    if (!item || item.disabled || item.hasChildren || !item.routePath) {
      return;
    }

    handleMenuSelect(item.source);
    setFlyoutRoot(null);
  }, [handleMenuSelect]);

  const handleItemExpanded = useCallback((event: SidebarTreeExpandedEvent) => {
    const item = event.itemData;
    if (!item) {
      return;
    }

    rememberExpandedTreeScrollTop();
    setExpandedIds((previous) => previous.includes(item.id) ? previous : [...previous, item.id]);
  }, [rememberExpandedTreeScrollTop]);

  const handleItemCollapsed = useCallback((event: SidebarTreeCollapsedEvent) => {
    const item = event.itemData;
    if (!item) {
      return;
    }

    rememberExpandedTreeScrollTop();
    setExpandedIds((previous) => previous.filter((id) => id !== item.id));
  }, [rememberExpandedTreeScrollTop]);

  const focusMenuSearch = useCallback(() => {
    if (!showMenuSearch) {
      return;
    }

    if (isCollapsed && !isMobile) {
      onRequestExpand?.();
    }

    window.requestAnimationFrame(() => {
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.menu-search-input'));
      const visibleInput = inputs.find((input) => input.offsetParent !== null) ?? inputs[0];
      visibleInput?.focus();
      visibleInput?.select?.();
    });
  }, [isCollapsed, isMobile, onRequestExpand, showMenuSearch]);

  useEffect(() => {
    if (!showMenuSearch) {
      setSearchTerm('');
    }
  }, [showMenuSearch]);

  const shortcutBindings = useMemo(
    () =>
      createShortcutBindings(shortcutActions, {
        [SHORTCUT_ACTIONS.FOCUS_MENU_SEARCH]: () => focusMenuSearch(),
        [SHORTCUT_ACTIONS.HELP]: () => openShortcutHelp(),
      }),
    [focusMenuSearch, openShortcutHelp, shortcutActions],
  );

  useShortcutBindings(shortcutBindings);

  useEffect(() => {
    if (!isCollapsed || isMobile) {
      setFlyoutRoot(null);
    }
  }, [isCollapsed, isMobile]);

  useLayoutEffect(() => {
    restoreExpandedTreeScrollTop();
  }, [activeMenu, expandedTreeItems, restoreExpandedTreeScrollTop]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 border-r border-blue-100 bg-blue-50/40 text-sm text-slate-600">
        <LoadIndicator height={22} width={22} />
        {!isCollapsed || isMobile ? <span>{translate('LOADING', 'Loading...')}</span> : null}
      </div>
    );
  }

  if (isCollapsed && !isMobile) {
    return (
      <>
        <div className="relative h-screen w-16" onMouseLeave={closeCollapsedFlyout}>
          <div className="flex h-screen w-16 flex-col border-r border-blue-100 bg-blue-50/30">
            <div className="flex h-14 flex-shrink-0 items-center justify-center border-b border-blue-100">
              <div
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-blue-100"
                title={brandTooltip}
                aria-label={brandTooltip}
              >
                <img
                  src={AMNOTE_LOGO_SRC}
                  alt={brandTooltip}
                  className="h-9 w-9 object-contain"
                  draggable={false}
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 py-2">
              <TreeView<SidebarTreeItem, string>
                key={treeViewKey}
                items={collapsedTreeItems}
                keyExpr="id"
                displayExpr="text"
                itemsExpr="items"
                disabledExpr="disabled"
                selectedItemKeys={selectedItemKeys}
                selectionMode="single"
                selectByClick
                focusStateEnabled
                activeStateEnabled
                hoverStateEnabled
                noDataText={translate('NO_DATA', 'No data')}
                itemRender={renderCollapsedTreeItem}
                onItemClick={handleCollapsedItemClick}
                className="am-sidebar-tree am-sidebar-tree-collapsed"
                width="100%"
                height="100%"
              />
            </div>
          </div>
          {flyoutRoot ? (
            <div
              ref={flyoutPanelRef}
              className="am-sidebar-flyout-panel"
              style={{ top: `${flyoutTop}px` }}
            >
              <div className="am-sidebar-flyout-title">{flyoutRoot.text}</div>
              <TreeView<SidebarTreeItem, string>
                key={`${treeViewKey}-flyout-${flyoutRoot.id}`}
                items={flyoutTreeItems}
                keyExpr="id"
                displayExpr="text"
                itemsExpr="items"
                disabledExpr="disabled"
                expandedExpr="expanded"
                selectedItemKeys={selectedItemKeys}
                selectionMode="single"
                selectByClick
                expandEvent="click"
                expandNodesRecursive={false}
                focusStateEnabled
                activeStateEnabled
                hoverStateEnabled
                animationEnabled
                noDataText={translate('NO_DATA', 'No data')}
                itemRender={renderExpandedTreeItem}
                onItemClick={handleFlyoutItemClick}
                onItemExpanded={handleItemExpanded}
                onItemCollapsed={handleItemCollapsed}
                className="am-sidebar-tree am-sidebar-tree-flyout"
                width="100%"
              />
            </div>
          ) : null}
        </div>
        <ShortcutHelpPopup
          visible={shortcutHelpVisible}
          shortcuts={shortcutHelpItems}
          onClose={closeShortcutHelp}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex h-screen w-full min-w-0 flex-col overflow-hidden border-r border-blue-100 bg-blue-50/30">
          <div className="flex-shrink-0 border-b border-blue-100 bg-white px-3 py-3">
            <div
              className="flex min-w-0 items-center gap-3"
              title={brandTooltip}
              aria-label={brandTooltip}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-blue-100">
                <img
                  src={AMNOTE_LOGO_SRC}
                  alt=""
                  className="h-9 w-9 object-contain"
                  draggable={false}
                />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold tracking-tight text-slate-900">AMnote</h1>
                <p className="truncate text-xs text-slate-500">{translate('ACCOUNTING_SOFTWARE', 'Phần mềm kế toán')}</p>
              </div>
            </div>
          </div>

          {showMenuSearch ? (
            <div className="flex-shrink-0 border-b border-blue-100 bg-white px-3 py-3">
              <div className="menu-search-wrapper" title={translate('MENU_SEARCH', 'Search menu')}>
                <TextBox
                  mode="search"
                  stylingMode="outlined"
                  valueChangeEvent="input"
                  value={searchTerm}
                  onValueChanged={(event) => setSearchTerm(String(event.value ?? ''))}
                  placeholder={translate('MENU_SEARCH_PLACEHOLDER', 'Tìm kiếm menu...')}
                  inputAttr={{
                    className: 'text-sm menu-search-input',
                    'aria-label': translate('MENU_SEARCH', 'Search menu'),
                    title: translate('MENU_SEARCH_PLACEHOLDER', 'Tìm kiếm menu...'),
                  }}
                  className="w-full"
                  showClearButton
                />
              </div>
            </div>
          ) : null}

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden py-2">
            <TreeView<SidebarTreeItem, string>
              key={treeViewKey}
              items={expandedTreeItems}
              keyExpr="id"
              displayExpr="text"
              itemsExpr="items"
              disabledExpr="disabled"
              expandedExpr="expanded"
              selectedItemKeys={selectedItemKeys}
              selectionMode="single"
              selectByClick
              expandEvent="click"
              expandNodesRecursive={false}
              focusStateEnabled
              activeStateEnabled
              hoverStateEnabled
              animationEnabled
              noDataText={translate('NO_DATA', 'No data')}
              itemRender={renderExpandedTreeItem}
              onItemClick={handleExpandedItemClick}
              onItemExpanded={handleItemExpanded}
              onItemCollapsed={handleItemCollapsed}
              onContentReady={restoreExpandedTreeScrollTop}
              ref={expandedTreeViewRef}
              className="am-sidebar-tree am-sidebar-tree-expanded"
              width="100%"
              height="100%"
            />
          </div>
      </div>
      <ShortcutHelpPopup
        visible={shortcutHelpVisible}
        shortcuts={shortcutHelpItems}
        onClose={closeShortcutHelp}
      />
    </>
  );
}
