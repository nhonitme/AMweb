import type { ToolbarCustomItem } from "@/components/toolbar/GridToolbar"

type EInvoiceTranslate = (key: string, fallback: string) => string

export function createEInvoiceSendMailToolbarItem(
  t: EInvoiceTranslate,
  options: {
    visible: boolean
    loading: boolean
    onSendMail: () => void | Promise<void>
  },
): ToolbarCustomItem {
  const label = t("SEND_MAIL", "Gửi mail")

  return {
    key: "send-mail",
    icon: "email",
    text: label,
    hint: label,
    type: "default",
    stylingMode: "contained",
    showText: "always",
    visible: options.visible,
    disabled: options.loading,
    onClick: () => {
      void options.onSendMail()
    },
  }
}
