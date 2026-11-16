import type { ToolbarCustomItem } from "@/components/toolbar/GridToolbar"

type EInvoiceTranslate = (key: string, fallback: string) => string

/**
 * Icon-cluster print/preview button (stylingMode "text") so GridToolbar
 * places it next to column/grid settings, not in the primary action row.
 */
export function createEInvoicePrintToolbarItem(
  t: EInvoiceTranslate,
  options: {
    loading: boolean
    onClick: (event?: MouseEvent) => void
    key?: string
    hintKey?: string
    hintFallback?: string
  },
): ToolbarCustomItem {
  const hint = t(options.hintKey ?? "PREVIEW_HINT", options.hintFallback ?? "View HTML preview")

  return {
    key: options.key ?? "view-preview",
    icon: "print",
    hint,
    stylingMode: "text",
    disabled: options.loading,
    onClick: (event) => {
      options.onClick(event)
    },
  }
}
