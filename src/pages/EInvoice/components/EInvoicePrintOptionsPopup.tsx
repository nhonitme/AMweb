import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import RadioGroup from "devextreme-react/radio-group"
import TextBox from "devextreme-react/text-box"

import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentSession } from "@/lib/login"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type {
  EInvoicePrintConfirmPayload,
  EInvoicePrintRequest,
} from "../einvoiceReportViewer"

type EInvoicePrintOptionsPopupProps = {
  visible: boolean
  invoiceCount: number
  loading?: boolean
  onClose: () => void
  onConfirm: (payload: EInvoicePrintConfirmPayload) => void
}

type PrintChoice = EInvoicePrintRequest["mode"] | "xml"

const PRINT_CHOICE_OPTIONS = [
  { value: "normal", textKey: "PRINT_MODE_NORMAL", fallback: "In thường" },
  { value: "converted", textKey: "PRINT_MODE_CONVERTED", fallback: "In chuyển đổi" },
  { value: "xml", textKey: "PRINT_MODE_XML", fallback: "Tải XML" },
] as const

function parsePrintChoice(value: unknown): PrintChoice {
  const nextValue = String(value ?? "normal")
  if (nextValue === "converted" || nextValue === "xml") {
    return nextValue
  }

  return "normal"
}

export default function EInvoicePrintOptionsPopup({
  visible,
  invoiceCount,
  loading = false,
  onClose,
  onConfirm,
}: EInvoicePrintOptionsPopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const defaultConvertedByNm = useMemo(() => getCurrentSession()?.username?.trim() ?? "", [])

  const [printChoice, setPrintChoice] = useState<PrintChoice>("normal")
  const [convertedByNm, setConvertedByNm] = useState(defaultConvertedByNm)

  useEffect(() => {
    if (!visible) {
      return
    }

    setPrintChoice("normal")
    setConvertedByNm(defaultConvertedByNm)
  }, [defaultConvertedByNm, visible])

  const choiceItems = useMemo(
    () =>
      PRINT_CHOICE_OPTIONS.map((item) => ({
        value: item.value,
        text: t(item.textKey, item.fallback),
      })),
    [t],
  )

  const isBatchDownload = invoiceCount > 1
  const isXmlDownload = printChoice === "xml"
  const isDownloadAction = isBatchDownload || isXmlDownload

  const handleConfirm = useCallback(() => {
    onConfirm({
      format: printChoice === "xml" ? "xml" : "pdf",
      printRequest: {
        mode: printChoice === "converted" ? "converted" : "normal",
        convertedByNm: printChoice === "converted" ? convertedByNm.trim() : undefined,
      },
    })
  }, [convertedByNm, onConfirm, printChoice])

  const hintText = isXmlDownload
    ? isBatchDownload
      ? t("PRINT_OPTIONS_BATCH_DOWNLOAD_XML_HINT", "XML will be downloaded for each selected invoice.")
      : t("PRINT_OPTIONS_XML_HINT", "XML will be downloaded.")
    : isBatchDownload
      ? t("PRINT_OPTIONS_BATCH_DOWNLOAD_HINT", "PDF will be downloaded for each selected invoice.")
      : t("PRINT_OPTIONS_HINT", "Choose print mode before opening preview.")

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      dragEnabled={false}
      hideOnOutsideClick={!loading}
      showCloseButton={!loading}
      width={460}
      height="auto"
      title={
        isDownloadAction
          ? t("PRINT_OPTIONS_DOWNLOAD_TITLE", "Download e-invoices")
          : t("PRINT_OPTIONS_TITLE", "Print e-invoice")
      }
      animation={POPUP_FADE_ANIMATION}
    >
      <div className="flex flex-col gap-4 p-1">
        <div className="text-sm text-gray-600">{hintText}</div>

        <RadioGroup
          items={choiceItems}
          value={printChoice}
          valueExpr="value"
          displayExpr="text"
          layout="vertical"
          disabled={loading}
          onValueChanged={(event) => {
            setPrintChoice(parsePrintChoice(event.value))
          }}
        />

        {printChoice === "converted" ? (
          <TextBox
            label={t("PRINT_CONVERTED_BY", "Converted by")}
            labelMode="floating"
            value={convertedByNm}
            readOnly={loading}
            onValueChanged={(event) => setConvertedByNm(String(event.value ?? ""))}
          />
        ) : null}
      </div>

      <ToolbarItem
        widget="dxButton"
        toolbar="bottom"
        location="after"
        options={{
          text: t("CANCEL", "Cancel"),
          stylingMode: "outlined",
          disabled: loading,
          onClick: onClose,
        }}
      />
      <ToolbarItem
        widget="dxButton"
        toolbar="bottom"
        location="after"
        options={{
          text: isDownloadAction
            ? t("PRINT_DOWNLOAD", "Download")
            : t("PRINT_OPEN_PREVIEW", "Open preview"),
          type: "default",
          icon: isDownloadAction ? "download" : "print",
          disabled: loading || (printChoice === "converted" && !convertedByNm.trim()),
          onClick: handleConfirm,
        }}
      />
    </Popup>
  )
}
