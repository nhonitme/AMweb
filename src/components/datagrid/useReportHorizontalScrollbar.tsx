import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react"
import type { Scrollable } from "devextreme/ui/tree_list"

type ScrollbarOptions = {
  widgetRef: RefObject<{ getScrollable(): Scrollable | null }>
  hostRef: RefObject<HTMLDivElement>
  loading: boolean
  rows: readonly unknown[]
  columnLayout: readonly unknown[] | string
  onSync?: () => void
}

function maxScrollLeft(scrollable: Scrollable) {
  return Math.max(0, scrollable.scrollWidth() - scrollable.clientWidth())
}

export function useReportHorizontalScrollbar({ widgetRef, hostRef, loading, rows, columnLayout, onSync }: ScrollbarOptions) {
  const proxyRef = useRef<HTMLDivElement>(null)
  const [needed, setNeeded] = useState(false)
  const [contentWidth, setContentWidth] = useState(1)

  const sync = useCallback(() => {
    onSync?.()
    const scrollable = widgetRef.current?.getScrollable()
    if (!scrollable) return

    const maxLeft = maxScrollLeft(scrollable)
    setNeeded(maxLeft > 2)
    const proxy = proxyRef.current
    const proxyWidth = proxy?.clientWidth ?? 0
    if (!proxy || proxyWidth <= 0 || maxLeft <= 2) return

    // The track and the grid can differ in width, but need the same scroll range.
    setContentWidth(Math.round(proxyWidth + maxLeft))
    // React may still be rendering the new spacer width.
    if (Math.abs(proxy.scrollWidth - proxyWidth - maxLeft) > 1) return

    const left = Math.min(Math.max(0, scrollable.scrollLeft()), maxLeft)
    if (Math.abs(proxy.scrollLeft - left) > 1) {
      proxy.scrollLeft = left
    }
  }, [onSync, widgetRef])

  const handleProxyScroll = useCallback(() => {
    const proxy = proxyRef.current
    const scrollable = widgetRef.current?.getScrollable()
    if (!proxy || !scrollable) return

    const maxLeft = maxScrollLeft(scrollable)
    if (Math.abs(proxy.scrollWidth - proxy.clientWidth - maxLeft) > 1) return

    const left = Math.min(Math.max(0, proxy.scrollLeft), maxLeft)
    if (Math.abs(left - scrollable.scrollLeft()) > 1) scrollable.scrollTo({ left })
  }, [widgetRef])

  useLayoutEffect(() => {
    if (needed) sync()
  }, [contentWidth, needed, sync])

  useEffect(() => {
    if (loading) {
      setNeeded(false)
      return
    }

    const scrollable = widgetRef.current?.getScrollable()
    scrollable?.on("scroll", sync)
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null
    if (hostRef.current) observer?.observe(hostRef.current)
    if (proxyRef.current) observer?.observe(proxyRef.current)
    window.addEventListener("resize", sync)
    sync()

    return () => {
      scrollable?.off("scroll", sync)
      observer?.disconnect()
      window.removeEventListener("resize", sync)
    }
  }, [columnLayout, hostRef, loading, needed, rows, sync, widgetRef])

  const scrollbar = needed ? (
    <div className="report-grid-hscroll-pane">
      <div
        ref={proxyRef}
        className="report-grid-hscroll"
        tabIndex={0}
        role="region"
        aria-label="Cuộn ngang bảng báo cáo"
        onScroll={handleProxyScroll}
      >
        <div className="report-grid-hscroll-content" style={{ width: contentWidth }} />
      </div>
    </div>
  ) : null

  return { needed, scrollbar, sync }
}
