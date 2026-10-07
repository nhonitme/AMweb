import "./GridEmptyAddButton.scss"

type GridEmptyAddButtonProps = {
  label?: string
  onClick?: () => void
  title?: string
  description?: string
}

export function GridEmptyAddButton({ label, onClick, title, description }: GridEmptyAddButtonProps) {
  const showButton = Boolean(label && onClick)

  return (
    <div className="grid-empty-add">
      <div className="grid-empty-add__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      {title ? <div className="grid-empty-add__title">{title}</div> : null}
      {description ? <div className="grid-empty-add__description">{description}</div> : null}

      {showButton ? (
        <button type="button" className="grid-empty-add__cta" title={label} aria-label={label} onClick={onClick}>
          <svg className="grid-empty-add__cta-icon" viewBox="0 0 24 24" focusable="false">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>{label}</span>
        </button>
      ) : null}
    </div>
  )
}
