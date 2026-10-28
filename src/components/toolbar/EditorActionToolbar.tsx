import type { ReactNode } from "react"
import Button from "devextreme-react/button"
import { EDITOR_ACTION_ICONS } from "./editorActionDefaults"
import "./EditorActionToolbar.scss"

export type EditorAction = {
  key: "save" | "saveAndNew" | "print" | "close"
  text: string
  icon?: string
  hint?: string
  visible?: boolean
  disabled?: boolean
  type?: "normal" | "default" | "danger" | "success"
  stylingMode?: "contained" | "outlined" | "text"
  onClick: () => void | Promise<void>
}

type EditorActionToolbarProps = {
  actions: EditorAction[]
  leadingContent?: ReactNode
  busy?: boolean
  className?: string
  /** Preserve the red save accent used by Chit and Inventory. */
  accentSave?: boolean
}

export default function EditorActionToolbar({
  actions, leadingContent, busy = false, className = "", accentSave = false,
}: EditorActionToolbarProps) {
  return (
    <div className={`editor-action-toolbar ${className}`}>
      {leadingContent}
      {actions.filter(action => action.visible !== false).map(action => (
        <Button
          key={action.key}
          text={action.text}
          icon={action.icon ?? EDITOR_ACTION_ICONS[action.key]}
          hint={action.hint}
          type={action.type ?? (action.key === "save" || action.key === "saveAndNew" ? "default" : "normal")}
          stylingMode={action.stylingMode ?? (action.key === "save" ? "contained" : "outlined")}
          disabled={busy || action.disabled}
          elementAttr={{ class: accentSave && action.key === "save" ? "editor-action-toolbar__save--accent" : "" }}
          onClick={action.onClick}
        />
      ))}
    </div>
  )
}
