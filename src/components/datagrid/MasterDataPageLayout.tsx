import type { ReactNode } from "react"

import { LookupPopupProvider } from "@/components/lookup/LookupPopupHost"

type MasterDataPageLayoutProps = {
  toolbar?: ReactNode
  children: ReactNode
  overlays?: ReactNode
  className?: string
  contentClassName?: string
}

export default function MasterDataPageLayout({
  toolbar,
  children,
  overlays,
  className,
  contentClassName,
}: MasterDataPageLayoutProps) {
  const containerClassName = [
    "flex h-full min-h-0 flex-col gap-1 overflow-hidden",
    className,
  ].filter(Boolean).join(" ")

  const bodyClassName = [
    "relative min-h-0 flex-1 overflow-hidden",
    contentClassName,
  ].filter(Boolean).join(" ")

  return (
    <LookupPopupProvider>
      <div className={containerClassName}>
        {toolbar ? <div className="flex-shrink-0">{toolbar}</div> : null}
        <div className={bodyClassName}>{children}</div>
      </div>
      {overlays}
    </LookupPopupProvider>
  )
}
