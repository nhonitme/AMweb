import type { ComponentType } from "react"

import type { ChitType } from "@/types/voucher"

import type { VoucherBusinessFormProps } from "../types"
import CreditNoteVoucherBusinessForm from "./CreditNoteVoucherBusinessForm"
import DebitNoteVoucherBusinessForm from "./DebitNoteVoucherBusinessForm"
import OffsetVoucherBusinessForm from "./OffsetVoucherBusinessForm"
import OtherVoucherBusinessForm from "./OtherVoucherBusinessForm"
import PaymentVoucherBusinessForm from "./PaymentVoucherBusinessForm"
import PurchaseServiceVoucherBusinessForm from "./PurchaseServiceVoucherBusinessForm"
import PurchaseVoucherBusinessForm from "./PurchaseVoucherBusinessForm"
import ReceiptVoucherBusinessForm from "./ReceiptVoucherBusinessForm"
import SalesVoucherBusinessForm from "./SalesVoucherBusinessForm"

type VoucherBusinessFormComponent = ComponentType<VoucherBusinessFormProps>

const businessFormMap: Record<ChitType, VoucherBusinessFormComponent> = {
  RC: ReceiptVoucherBusinessForm,
  PM: PaymentVoucherBusinessForm,
  DN: DebitNoteVoucherBusinessForm,
  CN: CreditNoteVoucherBusinessForm,
  PO: PurchaseVoucherBusinessForm,
  PS: PurchaseServiceVoucherBusinessForm,
  SO: SalesVoucherBusinessForm,
  CO: OffsetVoucherBusinessForm,
  OT: OtherVoucherBusinessForm,
}

export function getVoucherBusinessFormComponent(
  chitType: ChitType,
): VoucherBusinessFormComponent {
  return businessFormMap[chitType]
}
