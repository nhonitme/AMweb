import type { ReactNode } from "react"

import "./einvoiceTable.css"

type EInvoiceTableShellProps = {
  children: ReactNode
  className?: string
}

/** Shared accounting-style shell for all e-invoice data grids. */
export function EInvoiceTableShell({ children, className }: EInvoiceTableShellProps) {
  return (
    <div className={["einvoice-table", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  )
}
