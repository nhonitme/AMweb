import * as React from "react";

import {
  DEFAULT_MENU_LAYOUT,
  getStoredMenuLayout,
  isMenuLayout,
  setStoredMenuLayout,
  type MenuLayout,
} from "@/lib/menuLayout";
import { getStoredHeaderMenuBarVisible, setStoredHeaderMenuBarVisible } from "@/lib/headerMenuBar";
import { getStoredWorkspaceBarVisible, setStoredWorkspaceBarVisible } from "@/lib/workspaceBar";

type MenuLayoutContextValue = {
  menuLayout: MenuLayout;
  setMenuLayout: (layout: MenuLayout) => void;
  showWorkspaceBar: boolean;
  setShowWorkspaceBar: (visible: boolean) => void;
  showHeaderMenuBar: boolean;
  setShowHeaderMenuBar: (visible: boolean) => void;
};

type MenuLayoutProviderProps = {
  children: React.ReactNode;
};

const MenuLayoutContext = React.createContext<MenuLayoutContextValue | undefined>(undefined);

export function MenuLayoutProvider({ children }: MenuLayoutProviderProps) {
  const [menuLayout, setMenuLayoutState] = React.useState<MenuLayout>(() => getStoredMenuLayout());
  const [showWorkspaceBar, setShowWorkspaceBarState] = React.useState(() => getStoredWorkspaceBarVisible());
  const [showHeaderMenuBar, setShowHeaderMenuBarState] = React.useState(() => getStoredHeaderMenuBarVisible());

  const setMenuLayout = React.useCallback((layout: MenuLayout) => {
    const resolved = isMenuLayout(layout) ? layout : DEFAULT_MENU_LAYOUT;
    setStoredMenuLayout(resolved);
    setMenuLayoutState(resolved);
  }, []);

  const setShowWorkspaceBar = React.useCallback((visible: boolean) => {
    setStoredWorkspaceBarVisible(visible);
    setShowWorkspaceBarState(visible);
  }, []);

  const setShowHeaderMenuBar = React.useCallback((visible: boolean) => {
    setStoredHeaderMenuBarVisible(visible);
    setShowHeaderMenuBarState(visible);
  }, []);

  const contextValue = React.useMemo<MenuLayoutContextValue>(
    () => ({
      menuLayout,
      setMenuLayout,
      showWorkspaceBar,
      setShowWorkspaceBar,
      showHeaderMenuBar,
      setShowHeaderMenuBar,
    }),
    [menuLayout, setMenuLayout, setShowHeaderMenuBar, setShowWorkspaceBar, showHeaderMenuBar, showWorkspaceBar],
  );

  return <MenuLayoutContext.Provider value={contextValue}>{children}</MenuLayoutContext.Provider>;
}

export function useMenuLayout(): MenuLayoutContextValue {
  const contextValue = React.useContext(MenuLayoutContext);

  if (!contextValue) {
    throw new Error("useMenuLayout must be used within MenuLayoutProvider");
  }

  return contextValue;
}
