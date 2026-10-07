import type { ToolbarCustomItem } from "@/components/toolbar/GridToolbar"

type EInvoiceTranslate = (key: string, fallback: string) => string

export function createEInvoiceIssueMttToolbarItem(
  t: EInvoiceTranslate,
  options: {
    visible: boolean
    loading: boolean
    onIssue: () => void | Promise<void>
  },
): ToolbarCustomItem {
  const label = t("MTT_ISSUE", "Phát hành")

  return {
    key: "mtt-issue",
    icon: "check",
    text: label,
    hint: label,
    type: "default",
    stylingMode: "contained",
    showText: "always",
    visible: options.visible,
    disabled: options.loading,
    onClick: () => {
      void options.onIssue()
    },
  }
}

export function createEInvoiceSignSendCqtToolbarItem(
  t: EInvoiceTranslate,
  options: {
    visible: boolean
    loading: boolean
    onSign: () => void | Promise<void>
    label?: string
  },
): ToolbarCustomItem {
  const label = options.label ?? t("SIGN_SEND_CQT", "Ký và gửi CQT")

  return {
    key: "sign-send-cqt",
    icon: "key",
    text: label,
    hint: label,
    type: "danger",
    stylingMode: "contained",
    showText: "always",
    visible: options.visible,
    disabled: options.loading,
    onClick: () => {
      void options.onSign()
    },
  }
}