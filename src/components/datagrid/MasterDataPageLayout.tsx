import type { ReactNode } from "react"

import { LookupPopupProvider } from "@/components/lookup/LookupPopupHost"

type MasterDataPageLayoutProps = {
  toolbar?: ReactNode
  children: ReactNode
  overlays?: ReactNode
  className?: string
  contentClassName?: string
  /** Hide toolbar and show opening overlay until contentReady (lookup master pages). */
  holdToolbarUntilReady?: boolean
  contentReady?: boolean
  openingLabel?: string
}

export default function MasterDataPageLayout({
  toolbar,
  children,
  overlays,
  className,
  contentClassName,
  holdToolbarUntilReady = false,
  contentReady = true,
  openingLabel = "Đang tải…",
}: MasterDataPageLayoutProps) {
  const showOpeningOverlay = holdToolbarUntilReady && !contentReady
  const resolvedToolbar = showOpeningOverlay ? null : toolbar

  const containerClassName = [
    "relative flex h-full min-h-0 flex-col gap-1 overflow-hidden",
    className,
  ].filter(Boolean).join(" ")

  const bodyClassName = [
    "relative min-h-0 flex-1 overflow-hidden",
    contentClassName,
  ].filter(Boolean).join(" ")

  return (
    <LookupPopupProvider>
      <div className={containerClassName}>
        {resolvedToolbar ? <div className="flex-shrink-0">{resolvedToolbar}</div> : null}
        <div className={bodyClassName}>{children}</div>
        {showOpeningOverlay ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-slate-500">
            {openingLabel}
          </div>
        ) : null}
      </div>
      {overlays}
    </LookupPopupProvider>
  )
}
