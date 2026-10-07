import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup"
import { einvoiceImportConfig } from "../einvoiceImportConfig"

type EInvoiceExcelImportPopupProps = {
  visible: boolean
  title: string
  description?: string
  onClose: () => void
  onImported?: () => void | Promise<void>
  closeAfterSuccess?: boolean
  moduleCd?: string
  templateFileName?: string
}

export default function EInvoiceExcelImportPopup({
  visible,
  title,
  description,
  onClose,
  onImported,
  closeAfterSuccess = true,
  moduleCd = einvoiceImportConfig.moduleCd,
  templateFileName = einvoiceImportConfig.templateName,
}: EInvoiceExcelImportPopupProps) {
  return (
    <BaseExcelImportPopup
      visible={visible}
      onClose={onClose}
      title={title}
      description={description}
      moduleCd={moduleCd}
      templateFileName={templateFileName}
      params={{ lang: localStorage.getItem("lang") ?? undefined }}
      onImported={() => {
        void onImported?.()
      }}
      closeAfterSuccess={closeAfterSuccess}
      importMode="server"
      showTemplateDownload={true}
      showSheetSelector={false}
    />
  )
}
