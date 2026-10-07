import * as React from "react";

import {
  applyFontBoost,
  clampFontBoost,
  FONT_BOOST_STEP_PX,
  getFontSizePx,
  getStoredFontBoost,
  MAX_FONT_BOOST_PX,
  MIN_FONT_BOOST_PX,
  setStoredFontBoost,
} from "@/lib/fontScale";

type FontScaleContextValue = {
  canDecreaseFont: boolean;
  canIncreaseFont: boolean;
  decreaseFontSize: () => void;
  fontSizePx: number;
  increaseFontSize: () => void;
};

type FontScaleProviderProps = {
  children: React.ReactNode;
};

const FontScaleContext = React.createContext<FontScaleContextValue | undefined>(undefined);

export function FontScaleProvider({ children }: FontScaleProviderProps) {
  const [fontBoostPx, setFontBoostState] = React.useState(() => getStoredFontBoost());

  const setFontBoost = React.useCallback((nextBoostPx: number) => {
    const resolved = clampFontBoost(nextBoostPx);
    setStoredFontBoost(resolved);
    setFontBoostState(resolved);
  }, []);

  const increaseFontSize = React.useCallback(() => {
    setFontBoost(fontBoostPx + FONT_BOOST_STEP_PX);
  }, [fontBoostPx, setFontBoost]);

  const decreaseFontSize = React.useCallback(() => {
    setFontBoost(fontBoostPx - FONT_BOOST_STEP_PX);
  }, [fontBoostPx, setFontBoost]);

  React.useLayoutEffect(() => {
    applyFontBoost(fontBoostPx);
  }, [fontBoostPx]);

  const contextValue = React.useMemo<FontScaleContextValue>(
    () => ({
      canDecreaseFont: fontBoostPx > MIN_FONT_BOOST_PX,
      canIncreaseFont: fontBoostPx < MAX_FONT_BOOST_PX,
      decreaseFontSize,
      fontSizePx: getFontSizePx(fontBoostPx),
      increaseFontSize,
    }),
    [decreaseFontSize, fontBoostPx, increaseFontSize],
  );

  return <FontScaleContext.Provider value={contextValue}>{children}</FontScaleContext.Provider>;
}

export function useFontScale(): FontScaleContextValue {
  const contextValue = React.useContext(FontScaleContext);

  if (!contextValue) {
    throw new Error("useFontScale must be used within FontScaleProvider");
  }

  return contextValue;
}
