export type EInvoiceTransmissionText = string | null | undefined

export type EInvoiceTransmissionMessageKind = "SEND" | "RECEIVE"

export interface EInvoiceTransmissionMessage {
  MESSAGE_KEY?: EInvoiceTransmissionText
  MESSAGE_KIND?: EInvoiceTransmissionMessageKind | EInvoiceTransmissionText
  SEND_ID?: number | null
  RECEIVE_ID?: number | null
  INVOICE_ID?: number | null
  COMPANY_CD?: EInvoiceTransmissionText
  PBAN?: EInvoiceTransmissionText
  MNGUI?: EInvoiceTransmissionText
  MNNHAN?: EInvoiceTransmissionText
  MLTDIEP?: EInvoiceTransmissionText
  MLTDIEP_NAME?: EInvoiceTransmissionText
  MTDIEP?: EInvoiceTransmissionText
  MTDTCHIEU?: EInvoiceTransmissionText
  MTRA_CUU?: EInvoiceTransmissionText
  MST?: EInvoiceTransmissionText
  SLUONG?: number | null
  RESPONSE_XML?: EInvoiceTransmissionText
  ERROR_MESSAGE?: EInvoiceTransmissionText
  CREATE_USER?: EInvoiceTransmissionText
  CREATE_DT?: EInvoiceTransmissionText
}
