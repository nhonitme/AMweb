import { Check } from "lucide-react";

/** Adapter for the existing menu tree. Keep the app's route and permission logic. */
export interface MenuNode {
  id: string;
  name: string;
  children?: MenuNode[];
}

export function getMenuTrail(node: MenuNode, activeMenuId: string): MenuNode[] {
  if (node.id === activeMenuId) return [node];
  for (const child of node.children ?? []) {
    const trail = getMenuTrail(child, activeMenuId);
    if (trail.length) return [node, ...trail];
  }
  return [];
}

interface CaptionProps {
  item: MenuNode;
  activeMenuId: string;
  label: (item: MenuNode) => string;
}

export function MenuCurrentCaption({ item, activeMenuId, label }: CaptionProps) {
  const childTitle = getMenuTrail(item, activeMenuId).slice(1).map(label).join(" / ");
  return (
    <span className="header-submenu__root-caption">
      <span>{label(item)}</span>
      {childTitle ? (
        <span className="header-submenu__current-path">
          <span aria-hidden="true" className="header-submenu__path-divider">
            /
          </span>
          <span className="header-submenu__current-name" title={childTitle}>
            {childTitle}
          </span>
        </span>
      ) : null}
    </span>
  );
}

export function MenuCurrentCheck({ current }: { current: boolean }) {
  return current ? (
    <Check size={16} aria-hidden="true" className="header-submenu__current-check" />
  ) : null;
}
