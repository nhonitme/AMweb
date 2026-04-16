import * as React from "react";

import {
  DEVEXTREME_THEMES,
  ensureDevExtremeThemeLinks,
  getDevExtremeTheme,
  getStoredDevExtremeTheme,
  resolveDevExtremeThemeId,
  setStoredDevExtremeTheme,
  type DevExtremeThemeId,
  type DevExtremeThemeOption,
} from "@/lib/devextremeThemes";

type ThemeContextValue = {
  currentTheme: DevExtremeThemeOption;
  isReady: boolean;
  setTheme: (themeId: DevExtremeThemeId) => void;
  theme: DevExtremeThemeId;
  themes: DevExtremeThemeOption[];
};

type ThemeProviderProps = {
  children: React.ReactNode;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

async function applyDevExtremeTheme(themeId: DevExtremeThemeId): Promise<void> {
  ensureDevExtremeThemeLinks();

  const themeModule = await import("devextreme/ui/themes");
  themeModule.default.current(themeId);
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<DevExtremeThemeId>(() => getStoredDevExtremeTheme());
  const [isReady, setIsReady] = React.useState(false);

  const setTheme = React.useCallback((nextThemeId: DevExtremeThemeId) => {
    const resolvedThemeId = resolveDevExtremeThemeId(nextThemeId);
    setStoredDevExtremeTheme(resolvedThemeId);
    setThemeState(resolvedThemeId);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    const resolvedThemeId = resolveDevExtremeThemeId(theme);

    if (resolvedThemeId !== theme) {
      setStoredDevExtremeTheme(resolvedThemeId);
      setThemeState(resolvedThemeId);
      return;
    }

    setIsReady(false);

    void applyDevExtremeTheme(resolvedThemeId)
      .then(() => {
        if (!isMounted) {
          return;
        }

        document.documentElement.dataset.dxTheme = resolvedThemeId;
        document.documentElement.dataset.dxThemeMode = getDevExtremeTheme(resolvedThemeId).isDark
          ? "dark"
          : "light";
        setIsReady(true);
      })
      .catch(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [theme]);

  const contextValue = React.useMemo<ThemeContextValue>(
    () => ({
      currentTheme: getDevExtremeTheme(theme),
      isReady,
      setTheme,
      theme,
      themes: DEVEXTREME_THEMES,
    }),
    [isReady, setTheme, theme],
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const contextValue = React.useContext(ThemeContext);

  if (!contextValue) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return contextValue;
}

export const useDevExtremeTheme = useTheme;
