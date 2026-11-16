import type { ReactNode } from "react"
import Button from "devextreme-react/button"
import { EDITOR_ACTION_ICONS } from "./editorActionDefaults"
import "./EditorActionToolbar.scss"

type StandardEditorAction = {
  key: "save" | "saveAndNew" | "print" | "sign" | "close" | "copy"
  text: string
  icon?: string
  hint?: string
  visible?: boolean
  disabled?: boolean
  type?: "normal" | "default" | "danger" | "success"
  stylingMode?: "contained" | "outlined" | "text"
  onClick: () => void | Promise<void>
}

export type EditorAction = StandardEditorAction | {
  key: "delete"
  visible?: boolean
  render: ReactNode
}

const MIDDLE_ACTION_KEYS = new Set(["copy", "print", "sign"])
const MIDDLE_ACTION_ORDER = ["sign", "copy", "print"] as const
const RIGHT_ACTION_ORDER = ["delete", "saveAndNew", "save", "close"] as const

type EditorActionToolbarProps = {
  mode?: "add" | "edit"
  title?: string
  actions: EditorAction[]
  busy?: boolean
  className?: string
  /** @deprecated Save actions use the shared blue accent. */
  accentSave?: boolean
}

export default function EditorActionToolbar({
  title, mode, actions, busy = false, className = "",
}: EditorActionToolbarProps) {
  return (
    <div className={`editor-action-toolbar ${mode ? `editor-mode--${mode}` : ""} ${className}`}>
      <div className="editor-action-toolbar__middle">
        {actions.filter(action => action.visible !== false && MIDDLE_ACTION_KEYS.has(action.key))
          .sort((a, b) => MIDDLE_ACTION_ORDER.indexOf(a.key as typeof MIDDLE_ACTION_ORDER[number])
            - MIDDLE_ACTION_ORDER.indexOf(b.key as typeof MIDDLE_ACTION_ORDER[number])).map(renderAction)}
      </div>
      <div className="editor-action-toolbar__right">
        {actions.filter(action => action.visible !== false && !MIDDLE_ACTION_KEYS.has(action.key))
          .sort((a, b) => RIGHT_ACTION_ORDER.indexOf(a.key as typeof RIGHT_ACTION_ORDER[number])
            - RIGHT_ACTION_ORDER.indexOf(b.key as typeof RIGHT_ACTION_ORDER[number])).map(renderAction)}
      </div>
      {title ? <div className="editor-action-toolbar__title">{title}</div> : null}
    </div>
  )

  function renderAction(action: EditorAction) {
    if (action.key === "delete") {
      return <div key={action.key} className="editor-action-toolbar__delete">{action.render}</div>
    }
    return (
        <Button
          key={action.key}
          text={action.text}
          icon={action.icon ?? EDITOR_ACTION_ICONS[action.key]}
          hint={action.hint}
          type={action.type ?? (action.key === "save" || action.key === "saveAndNew" ? "default" : "normal")}
          stylingMode={action.stylingMode ?? (action.key === "save" ? "contained" : "outlined")}
          disabled={busy || action.disabled}
          elementAttr={{ class: `editor-action-toolbar__${action.key}` }}
          onClick={action.onClick}
        />
    )
  }
}


