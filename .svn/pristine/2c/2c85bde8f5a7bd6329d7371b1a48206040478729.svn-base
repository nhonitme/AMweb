import type { MutableRefObject } from "react"

import type { ChitInfo } from "@/types/voucher"

export type VoucherTranslate = (key: string, fallback: string) => string

export type VoucherFieldChangeEvent = {
  dataField?: string
  value?: unknown
}

export type VoucherFormData = ChitInfo & {
  CHIT_TYPE_LABEL: string
}

export interface VoucherBusinessFormProps {
  formData: VoucherFormData
  isUpdate: boolean
  t: VoucherTranslate
  onFieldDataChanged: (event: VoucherFieldChangeEvent) => void
  formRef?: MutableRefObject<any | null>
}
