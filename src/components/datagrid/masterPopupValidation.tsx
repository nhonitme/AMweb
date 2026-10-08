import { createContext, useCallback, useContext, useRef, useState } from "react"
import { createPortal } from "react-dom"
import notify from "devextreme/ui/notify"
import { getApiErrorMessage } from "@/api/apiTypes"

type ValidationState = {
  messages: string[]
  setMessages: (messages: string[]) => void
  fieldErrors?: Array<{ dataField: string; message: string }>
  registerFormValidation?: (validate: (row: Record<string, unknown>) => Array<{ dataField: string; message: string }>) => () => void
  getEditingData?: () => Record<string, unknown>
  setEditingField?: (dataField: string, value: unknown) => void
  clearFieldError?: (field: string) => void
}
export const MasterPopupValidationContext = createContext<ValidationState | null>(null)
const reporters = new WeakMap<object, (messages: string[]) => void>()
const sessions = new WeakMap<object, () => number>()

export function captureMasterPopupError(component: object | null | undefined) {
  const session = component && sessions.get(component)?.()
  return (message: string) => {
    if (component && sessions.get(component)?.() !== session) return
    showMasterPopupError(component, message)
  }
}

export function showMasterPopupError(component: object | null | undefined, message: string) {
  const report = component && reporters.get(component)
  if (report) report([message])
  else notify(message, "error", 4000)
}

type GridEvents = {
  on: (name: string, handler: (event: MasterGridEvent) => void) => unknown
  off: (name: string, handler: (event: MasterGridEvent) => void) => unknown
  option: (name: string) => unknown
  getRowIndexByKey?: (key: unknown) => number
  cellValue?: (rowIndex: number, dataField: string, value: unknown) => unknown
}
type MasterGridEvent = {
  brokenRules?: Array<{ message?: string }>
  errorText?: string
  error?: unknown
  promise?: PromiseLike<unknown>
  data?: Record<string, unknown>
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  isValid?: boolean
}

export function useMasterPopupValidation() {
  const [messages, setMessages] = useState<string[]>([])
  const epoch = useRef(0)
  const gridComponent = useRef<GridEvents | null>(null)
  const editingData = useRef<Record<string, unknown>>({})
  const formValidation = useRef<((row: Record<string, unknown>) => Array<{ dataField: string; message: string }>) | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Array<{ dataField: string; message: string }>>([])
  const registerFormValidation = useCallback((validate: NonNullable<typeof formValidation.current>) => {
    formValidation.current = validate
    return () => { if (formValidation.current === validate) formValidation.current = null }
  }, [])
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(current => {
      const next = current.filter(error => error.dataField !== field)
      return next.length === current.length ? current : next
    })
    setMessages(current => current.length === 0 ? current : [])
  }, [])
  const setEditingField = useCallback((dataField: string, value: unknown) => {
    const component = gridComponent.current
    if (!component || component.option("editing.mode") !== "popup") return
    const editRowKey = component.option("editing.editRowKey")
    if (editRowKey === null || editRowKey === undefined) return
    const rowIndex = component.getRowIndexByKey?.(editRowKey)
    if (typeof rowIndex !== "number" || rowIndex < 0) return
    component.cellValue?.(rowIndex, dataField, value)
  }, [])
  const bind = (component: GridEvents | null) => {
    if (!component || reporters.has(component)) return
    gridComponent.current = component
    const report = (next: string[]) => setMessages(Array.from(new Set(next.filter(Boolean))))
    reporters.set(component, report)
    sessions.set(component, () => epoch.current)
    const clear = (event: MasterGridEvent) => {
      epoch.current++; report([]); setFieldErrors([])
      editingData.current = event.data ?? {}
    }
    const validate = (event: MasterGridEvent) => {
      const session = epoch.current
      let requiredErrors: Array<{ dataField: string; message: string }> = []
      if (component.option("editing.mode") === "popup" && formValidation.current) {
        requiredErrors = formValidation.current({ ...editingData.current, ...event.oldData, ...event.newData })
        setFieldErrors(requiredErrors)
        if (requiredErrors.length) {
          event.isValid = false
          event.brokenRules = [...(event.brokenRules ?? []), ...requiredErrors]
        }
      }
      const finish = () => {
        if (session !== epoch.current || component.option("editing.mode") !== "popup") return
        report((event.brokenRules ?? []).map((rule: { message?: string }) => rule.message ?? "").concat(event.errorText ?? ""))
      }
      finish()
      if (event.promise) void Promise.resolve(event.promise).then(finish, () => {})
    }
    const error = (event: MasterGridEvent) => {
      if (component.option("editing.mode") === "popup") report([getApiErrorMessage(event.error, "Không lưu được dữ liệu.")])
    }
    const handlers: Record<string, (event: MasterGridEvent) => void> = {
      editingStart: clear, initNewRow: clear, editCanceled: clear,
      rowInserted: clear, rowUpdated: clear, rowValidating: validate, dataErrorOccurred: error,
    }
    for (const [name, handler] of Object.entries(handlers)) component.on(name, handler)
    component.on("disposing", () => {
      epoch.current++
      if (gridComponent.current === component) gridComponent.current = null
      reporters.delete(component)
      sessions.delete(component)
      for (const [name, handler] of Object.entries(handlers)) component.off(name, handler)
    })
  }
  return { messages, setMessages, bind, fieldErrors, registerFormValidation, clearFieldError, getEditingData: () => editingData.current, setEditingField }
}

export function MasterPopupFieldError({ dataField }: { dataField: string }) {
  const state = useContext(MasterPopupValidationContext)
  const message = state?.fieldErrors?.find(error => error.dataField === dataField)?.message
  return message ? <div role="alert" style={{ color: "#b42318", marginTop: 4 }}>{message}</div> : null
}

export function MasterPopupValidationSummary({ host }: { host: HTMLElement | null }) {
  const state = useContext(MasterPopupValidationContext)
  if (!host || !state?.messages.length) return null
  return createPortal(
    <div role="alert" aria-live="polite" style={{ padding: "12px 16px", color: "#b42318", background: "#fff1f0", border: "1px solid #fecdca", marginBottom: 12, whiteSpace: "pre-wrap" }}>
      <ul style={{ margin: 0, paddingLeft: 20 }}>{state.messages.map(message => <li key={message}>{message}</li>)}</ul>
    </div>, host,
  )
}
