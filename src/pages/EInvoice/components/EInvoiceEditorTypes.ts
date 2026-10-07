import type {
  ColumnCellTemplateData,
  ColumnEditCellTemplateData,
} from "devextreme/ui/data_grid"

import type { EInvoice, EInvoiceDetail } from "@/types/einvoice"
import type { EInvoiceWarehouseFields } from "../einvoiceWarehouseModel"

export type GridKey = string | number
export type EInvoiceDetailRow = EInvoiceDetail & {
  PRODUCT_ID?: number | null
}
export type EInvoiceDetailCellInfo = ColumnEditCellTemplateData<EInvoiceDetailRow, GridKey>
export type EInvoiceDetailDisplayCellInfo = ColumnCellTemplateData<EInvoiceDetailRow, GridKey>
export type EInvoiceFormData = EInvoice & EInvoiceWarehouseFields & {
  BUYER_CUSTOMER_ID: number
  TEMPLATE_XSL_ID: number
}

export interface EInvoiceEditorPopupProps {
  cashRegister?: boolean
  visible: boolean
  invoiceId: number
  initialInvoice?: EInvoice | null
  copyFromInvoiceId?: number
  readOnly?: boolean
  onClose: () => void
  onSaved?: (invoice: EInvoice, createNext: boolean) => void | Promise<void>
}
