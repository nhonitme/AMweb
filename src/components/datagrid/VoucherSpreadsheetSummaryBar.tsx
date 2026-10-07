export type VoucherSpreadsheetSummaryItem = {
  key: string
  label: string
  value: string
}

type VoucherSpreadsheetSummaryBarProps = {
  items: VoucherSpreadsheetSummaryItem[]
}

export default function VoucherSpreadsheetSummaryBar({ items }: VoucherSpreadsheetSummaryBarProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="voucher-spreadsheet-summary flex flex-shrink-0 flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-slate-200 bg-slate-50 px-3 py-2">
      {items.map((item) => (
        <div key={item.key} className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{item.label}</div>
          <div className="text-sm font-semibold tabular-nums text-slate-800">{item.value}</div>
        </div>
      ))}
    </div>
  )
}
