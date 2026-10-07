import { useCallback, useEffect, useRef, useState } from 'react';

export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 480;

const SIDEBAR_WIDTH_STORAGE_KEY = 'sidebar-width';

function getMaxSidebarWidth() {
  if (typeof window === 'undefined') {
    return SIDEBAR_MAX_WIDTH;
  }

  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.floor(window.innerWidth * 0.5)));
}

export function clampSidebarWidth(width: number) {
  return Math.min(getMaxSidebarWidth(), Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
}

function readStoredSidebarWidth() {
  if (typeof window === 'undefined') {
    return SIDEBAR_DEFAULT_WIDTH;
  }

  const parsed = Number.parseInt(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY) ?? '', 10);
  return Number.isFinite(parsed) ? clampSidebarWidth(parsed) : SIDEBAR_DEFAULT_WIDTH;
}

export function useSidebarWidth() {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(readStoredSidebarWidth);
  const [isResizing, setIsResizing] = useState(false);

  const persistWidth = useCallback((width: number) => {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width));
  }, []);

  const beginResize = useCallback(() => {
    setIsResizing(true);
  }, []);

  const resetSidebarWidth = useCallback(() => {
    const nextWidth = clampSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
    setSidebarWidth(nextWidth);
    persistWidth(nextWidth);
  }, [persistWidth]);

  useEffect(() => {
    if (!isResizing) {
      persistWidth(sidebarWidth);
    }
  }, [isResizing, persistWidth, sidebarWidth]);

  useEffect(() => {
    const handleWindowResize = () => {
      setSidebarWidth((currentWidth) => clampSidebarWidth(currentWidth));
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      setSidebarWidth(clampSidebarWidth(event.clientX - left));
    };

    const handlePointerUp = () => {
      setIsResizing(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isResizing]);

  return {
    sidebarRef,
    sidebarWidth,
    isResizing,
    beginResize,
    resetSidebarWidth,
  };
}
