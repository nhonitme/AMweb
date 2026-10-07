import type { ReactNode } from "react"
import Button from "devextreme-react/button"
import LoadPanel from "devextreme-react/load-panel"
import Popup from "devextreme-react/popup"
import type { HidingEvent, Properties as PopupProperties, ShownEvent } from "devextreme/ui/popup"

import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"

import "./einvoiceEditor.css"

export type EInvoiceEditorShellProps = {
  visible: boolean
  title: string
  subtitle?: string
  width?: string | number
  height?: string | number
  fullScreen?: boolean
  loading?: boolean
  closeDisabled?: boolean
  dragEnabled?: boolean
  resizeEnabled?: boolean
  onClose: () => void
  onShown?: (event: ShownEvent) => void
  onHiding?: (event: HidingEvent) => void
  wrapperAttr?: Record<string, string>
  animation?: PopupProperties["animation"]
  headerActions?: ReactNode
  footerStart?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

export function EInvoiceEditorSection({
  title,
  children,
  className,
  bodyClassName,
  headerAction,
}: {
  title: string
  children: ReactNode
  className?: string
  bodyClassName?: string
  headerAction?: ReactNode
}) {
  if (headerAction) {
    return (
      <section className={["einvoice-editor__section", className].filter(Boolean).join(" ")}>
        <div className="einvoice-editor__detail-toolbar">
          <div className="einvoice-editor__section-title einvoice-editor__section-title--inline">{title}</div>
          {headerAction}
        </div>
        <div className={["einvoice-editor__section-body", bodyClassName].filter(Boolean).join(" ")}>{children}</div>
      </section>
    )
  }

  return (
    <section className={["einvoice-editor__section", className].filter(Boolean).join(" ")}>
      <div className="einvoice-editor__section-title">{title}</div>
      <div className={["einvoice-editor__section-body", bodyClassName].filter(Boolean).join(" ")}>{children}</div>
    </section>
  )
}

export default function EInvoiceEditorShell({
  visible,
  title,
  subtitle,
  width = "min(1180px, 96vw)",
  height = "min(820px, 94vh)",
  fullScreen = false,
  loading = false,
  closeDisabled = false,
  dragEnabled,
  resizeEnabled,
  onClose,
  onShown,
  onHiding,
  wrapperAttr,
  animation = POPUP_FADE_ANIMATION,
  headerActions,
  footerStart,
  footer,
  children,
}: EInvoiceEditorShellProps) {
  const mergedWrapperAttr = {
    ...wrapperAttr,
    class: ["einvoice-editor-popup", wrapperAttr?.class].filter(Boolean).join(" "),
  }

  return (
    <Popup
      visible={visible}
      showTitle={false}
      showCloseButton={false}
      dragEnabled={dragEnabled ?? !fullScreen}
      resizeEnabled={resizeEnabled ?? !fullScreen}
      hideOnOutsideClick={false}
      width={fullScreen ? "100vw" : width}
      height={fullScreen ? "100vh" : height}
      maxWidth={fullScreen ? "100vw" : undefined}
      maxHeight={fullScreen ? "100vh" : undefined}
      container={fullScreen ? "body" : undefined}
      position={fullScreen ? { my: "center", at: "center", of: window } : undefined}
      wrapperAttr={mergedWrapperAttr}
      animation={animation}
      onShown={onShown}
      onHiding={onHiding}
    >
      <div className="einvoice-editor">
        <header className="einvoice-editor__header">
          <div className="einvoice-editor__header-main">
            <h1 className="einvoice-editor__title">{title}</h1>
            {subtitle ? <div className="einvoice-editor__subtitle">{subtitle}</div> : null}
          </div>
          <div className="einvoice-editor__header-actions">
            {headerActions}
            <Button
              icon="close"
              stylingMode="text"
              disabled={closeDisabled || loading}
              hint="Close"
              onClick={onClose}
            />
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <LoadPanel
            visible={loading}
            showIndicator={true}
            showPane={true}
            shading={true}
            shadingColor="rgba(15, 23, 42, 0.2)"
          />

          <div className="einvoice-editor__body">
            <div className="einvoice-editor__stack">{children}</div>
          </div>

          {footer ? (
            <footer className="einvoice-editor__footer">
              {footerStart ? <div className="einvoice-editor__footer-start">{footerStart}</div> : null}
              <div className="einvoice-editor__footer-actions">{footer}</div>
            </footer>
          ) : null}
        </div>
      </div>
    </Popup>
  )
}
