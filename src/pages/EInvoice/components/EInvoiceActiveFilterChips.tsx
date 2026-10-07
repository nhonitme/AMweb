import type { EInvoiceAdvancedFilterChip } from "../einvoiceAdvancedSearch"

import "./EInvoiceAdvancedSearchPanel.css"

type Translate = (key: string, fallback: string) => string

type EInvoiceActiveFilterChipsProps = {
  chips: EInvoiceAdvancedFilterChip[]
  t: Translate
  onRemove: (key: EInvoiceAdvancedFilterChip["key"]) => void
}

export function EInvoiceActiveFilterChips({
  chips,
  t,
  onRemove,
}: EInvoiceActiveFilterChipsProps) {
  if (chips.length === 0) {
    return null
  }

  return (
    <div className="einvoice-adv-filters">
      <span className="einvoice-adv-filters__caption">
        {t("ACTIVE_FILTERS", "Điều kiện lọc")}:
      </span>
      {chips.map((chip) => (
        <button
          key={`${chip.key}-${chip.label}`}
          type="button"
          className="einvoice-adv-filters__chip"
          onClick={() => onRemove(chip.key)}
          title={t("REMOVE_FILTER", "Bỏ điều kiện")}
        >
          <span className="einvoice-adv-filters__chip-text">{chip.label}</span>
          <span aria-hidden className="einvoice-adv-filters__chip-x">×</span>
        </button>
      ))}
    </div>
  )
}
