import { useCallback, useContext } from "react"

import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup"
import type { ClientExcelImportContext, ExcelImportResponse } from "@/api/excelApi"
import { LanguageContext } from "@/lib/i18nLoader"
import { downloadEInvoiceDetailExcelTemplate } from "../einvoiceDetailExcelTemplate"
import { getEInvoiceDetailExcelTemplateFileSuffix, resolveEInvoiceDetailExcelFormKind } from "../einvoiceDetailExcelColumns"

type EInvoiceDetailExcelImportPopupProps = {
  visible: boolean
  title: string
  description?: string
  khmsHDON?: string | null
  onClose: () => void
  onImported?: () => void | Promise<void>
  onImportFile: (file: File, context: ClientExcelImportContext) => Promise<ExcelImportResponse>
  closeAfterSuccess?: boolean
}

export default function EInvoiceDetailExcelImportPopup({
  visible,
  title,
  description,
  khmsHDON,
  onClose,
  onImported,
  onImportFile,
  closeAfterSuccess = true,
}: EInvoiceDetailExcelImportPopupProps) {
  const { translate, lang } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
    lang?: string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const handleDownloadTemplate = useCallback(async () => {
    return downloadEInvoiceDetailExcelTemplate(t, lang ?? localStorage.getItem("lang") ?? "vi", khmsHDON)
  }, [khmsHDON, lang, t])

  const templateFileName = `EInvoiceDetail_${getEInvoiceDetailExcelTemplateFileSuffix(resolveEInvoiceDetailExcelFormKind(khmsHDON))}`

  return (
    <BaseExcelImportPopup
      visible={visible}
      onClose={onClose}
      title={title}
      description={description}
      onImportFile={onImportFile}
      onDownloadTemplate={handleDownloadTemplate}
      templateFileName={templateFileName}
      onImported={() => {
        void onImported?.()
      }}
      closeAfterSuccess={closeAfterSuccess}
      importMode="client"
      showTemplateDownload={true}
      showSheetSelector={false}
    />
  )
}
