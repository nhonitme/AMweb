export function EInvoiceStatusTag({
  label,
  tone = "muted",
}: {
  label: string
  tone?: "ok" | "warn" | "danger" | "info" | "muted"
}) {
  return <span className={`einvoice-table__tag einvoice-table__tag--${tone}`}>{label}</span>
}

export function getEInvoiceSignedTagTone(signed: boolean): "ok" | "warn" {
  return signed ? "ok" : "warn"
}

export function getEInvoiceInvoiceStatusTagTone(status: number | null | undefined): "ok" | "danger" | "muted" {
  const value = Number(status ?? 0)
  if (value === 6) {
    return "danger"
  }
  if (value === 1) {
    return "ok"
  }
  return "muted"
}

export function getEInvoiceMailTagTone(status: number | null | undefined): "ok" | "danger" | "info" | "muted" {
  const value = Number(status ?? 0)
  if (value === 1) {
    return "info"
  }
  if (value === 2) {
    return "danger"
  }
  return "muted"
}

export function EInvoiceEmptyCell() {
  return <span className="einvoice-table__empty">—</span>
}

export function EInvoiceCodeCell({ value, ok = false }: { value: unknown; ok?: boolean }) {
  const text = String(value ?? "").trim()
  if (!text) {
    return <EInvoiceEmptyCell />
  }
  return (
    <span
      className={ok ? "einvoice-table__code einvoice-table__code--ok" : "einvoice-table__code"}
      title={text}
    >
      {text}
    </span>
  )
}

export type EInvoicePartyMetaLine =
  | string
  | {
      text: string
      codeOk?: boolean
    }

function getEInvoicePartyMetaLineText(line: EInvoicePartyMetaLine): string {
  return typeof line === "string" ? line : line.text
}

export function EInvoicePartyCell({
  name,
  meta,
  metaLines,
  error,
}: {
  name: string
  meta?: string
  metaLines?: EInvoicePartyMetaLine[]
  error?: string
}) {
  const lines = metaLines?.filter((line) => getEInvoicePartyMetaLineText(line).trim().length > 0) ?? (meta ? [meta] : [])
  const title = [name, ...lines.map(getEInvoicePartyMetaLineText), error].filter(Boolean).join("\n")

  return (
    <div className="einvoice-table__party" title={title}>
      <div className="einvoice-table__party-name">{name || "—"}</div>
      {lines.map((line, index) => {
        const text = getEInvoicePartyMetaLineText(line)
        const codeOk = typeof line === "object" && line.codeOk

        return (
          <div key={`${index}-${text}`} className="einvoice-table__party-meta">
            {codeOk ? (
              <span className="einvoice-table__code einvoice-table__code--ok" title={text}>
                {text}
              </span>
            ) : (
              text
            )}
          </div>
        )
      })}
      {error ? <div className="einvoice-table__party-error">{error}</div> : null}
    </div>
  )
}

export function EInvoiceDocNoCell({
  series,
  numberLabel,
  codeLabel,
}: {
  series: string
  numberLabel: string
  codeLabel?: string
}) {
  return (
    <div className="einvoice-table__docno">
      <span className="einvoice-table__docno-series">{series || "—"}</span>
      <span className="einvoice-table__docno-no">{numberLabel}</span>
      {codeLabel ? (
        <span className="einvoice-table__docno-no einvoice-table__code einvoice-table__code--ok" title={codeLabel}>
          {codeLabel}
        </span>
      ) : null}
    </div>
  )
}

export function EInvoiceInvoiceRefCell({
  summary,
  href,
  emptyLabel,
}: {
  summary: string
  href?: string
  emptyLabel: string
}) {
  const text = summary.trim()
  if (!text) {
    return <EInvoiceStatusTag label={emptyLabel} tone="warn" />
  }

  if (href) {
    return (
      <a
        className="einvoice-table__ref-link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={text}
        onClick={(event) => event.stopPropagation()}
      >
        {text}
      </a>
    )
  }

  return (
    <span className="einvoice-table__ref-text" title={text}>
      {text}
    </span>
  )
}
