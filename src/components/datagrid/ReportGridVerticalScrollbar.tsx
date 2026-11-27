import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react"

type ScrollbarState = { top: number; height: number; maximum: number; value: number }

export default function ReportGridVerticalScrollbar({ hostRef, label }: {
  hostRef: RefObject<HTMLDivElement>
  label: string
}) {
  const viewportRef = useRef<HTMLElement | null>(null)
  const [state, setState] = useState<ScrollbarState | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let frame = 0
    let content: HTMLElement | null = null
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    const sizes = new ResizeObserver(schedule)

    function update() {
      frame = 0
      const viewport = host.querySelector<HTMLElement>(
        ":is(.dx-datagrid-rowsview, .dx-treelist-rowsview).dx-scrollable-native > .dx-scrollable-wrapper > .dx-scrollable-container",
      )
      if (viewport !== viewportRef.current) {
        if (viewportRef.current) {
          sizes.unobserve(viewportRef.current)
          viewportRef.current.removeEventListener("scroll", schedule)
        }
        viewportRef.current = viewport
        if (viewport) {
          viewport.addEventListener("scroll", schedule, { passive: true })
          sizes.observe(viewport)
        }
      }

      const nextContent = viewport?.querySelector<HTMLElement>(".dx-scrollable-content") ?? null
      if (content !== nextContent) {
        if (content) sizes.unobserve(content)
        content = nextContent
        if (content) sizes.observe(content)
      }

      const height = viewport?.clientHeight ?? 0
      const maximum = (viewport?.scrollHeight ?? 0) - height
      if (!viewport || height === 0 || maximum <= 0) {
        setState(null)
        return
      }

      const top = viewport.getBoundingClientRect().top - host.getBoundingClientRect().top
      const value = Math.min(maximum, Math.max(0, Math.round(viewport.scrollTop)))
      setState((previous) => previous?.top === top && previous.height === height &&
        previous.maximum === maximum && previous.value === value
        ? previous : { top, height, maximum, value })
    }

    const markup = new MutationObserver(schedule)
    markup.observe(host, { childList: true, subtree: true })
    sizes.observe(host)
    update()

    return () => {
      window.cancelAnimationFrame(frame)
      markup.disconnect()
      sizes.disconnect()
      viewportRef.current?.removeEventListener("scroll", schedule)
      viewportRef.current = null
    }
  }, [hostRef])

  if (!state) return null

  const { top, height, maximum, value } = state
  const thumbHeight = Math.min(height, Math.max(24, height * height / (height + maximum)))

  return (
    <input
      type="range"
      className="report-grid-vscroll"
      aria-label={label}
      min={0}
      max={maximum}
      value={value}
      style={{ top, height, "--report-grid-vscroll-thumb-height": `${thumbHeight}px` } as CSSProperties}
      onPointerDown={(event) => event.stopPropagation()}
      onChange={(event) => {
        const viewport = viewportRef.current
        if (!viewport) return
        const value = event.currentTarget.valueAsNumber
        viewport.scrollTop = value
        setState({ ...state, value })
      }}
    />
  )
}
