import type { ReactNode } from "react"
import Button from "devextreme-react/button"
import { EDITOR_ACTION_ICONS } from "./editorActionDefaults"
import "./EditorActionToolbar.scss"

type StandardEditorAction = {
  key: "save" | "saveAndNew" | "print" | "close" | "copy"
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
        {actions.filter(action => action.visible !== false && (action.key === "copy" || action.key === "print"))
          .sort((a, b) => Number(a.key === "print") - Number(b.key === "print")).map(renderAction)}
      </div>
      <div className="editor-action-toolbar__right">
        {actions.filter(action => action.visible !== false && action.key !== "print" && action.key !== "copy")
          .sort((a, b) => ["delete", "saveAndNew", "save", "close"].indexOf(a.key) - ["delete", "saveAndNew", "save", "close"].indexOf(b.key)).map(renderAction)}
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


