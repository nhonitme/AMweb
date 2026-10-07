const FONT_SCALE_STORAGE_KEY = "am-font-scale-boost";

/** Base app font size in px (matches historical default in index.css). */
export const DEFAULT_FONT_SIZE_PX = 13;

/** Extra px added on top of the default. */
export const MIN_FONT_BOOST_PX = 0;
export const MAX_FONT_BOOST_PX = 12;
export const FONT_BOOST_STEP_PX = 1;

export function clampFontBoost(boostPx: number): number {
  if (!Number.isFinite(boostPx)) {
    return MIN_FONT_BOOST_PX;
  }

  return Math.min(MAX_FONT_BOOST_PX, Math.max(MIN_FONT_BOOST_PX, Math.round(boostPx)));
}

export function getStoredFontBoost(): number {
  if (typeof window === "undefined") {
    return MIN_FONT_BOOST_PX;
  }

  const raw = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY);
  if (raw == null || raw === "") {
    return MIN_FONT_BOOST_PX;
  }

  return clampFontBoost(Number.parseInt(raw, 10));
}

export function setStoredFontBoost(boostPx: number): void {
  if (typeof window === "undefined") {
    return;
  }

  const next = clampFontBoost(boostPx);
  if (next <= MIN_FONT_BOOST_PX) {
    window.localStorage.removeItem(FONT_SCALE_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(next));
}

export function getFontSizePx(boostPx: number = getStoredFontBoost()): number {
  return DEFAULT_FONT_SIZE_PX + clampFontBoost(boostPx);
}

/** Browser default rem root; Tailwind text-* scales from this. */
const DEFAULT_HTML_FONT_SIZE_PX = 16;

export function applyFontBoost(boostPx: number, doc: Document = document): void {
  const next = clampFontBoost(boostPx);
  const root = doc.documentElement;
  root.style.setProperty("--am-font-boost", `${next}px`);
  root.style.setProperty("--am-font-size", `${DEFAULT_FONT_SIZE_PX + next}px`);
  root.style.setProperty("--am-html-font-size", `${DEFAULT_HTML_FONT_SIZE_PX + next}px`);
  root.dataset.amFontBoost = String(next);
}
