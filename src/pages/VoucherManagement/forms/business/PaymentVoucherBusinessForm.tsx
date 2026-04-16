import BaseVoucherForm from "../base/BaseVoucherForm"
import VoucherBusinessSection from "../sections/VoucherBusinessSection"
import VoucherDescriptionSection from "../sections/VoucherDescriptionSection"
import VoucherDocumentSection from "../sections/VoucherDocumentSection"
import VoucherStatusSection from "../sections/VoucherStatusSection"
import type { VoucherBusinessFormProps } from "../types"

export function PaymentVoucherBusinessForm({
  formData,
  isUpdate,
  onFieldDataChanged,
  formRef,
  t,
}: VoucherBusinessFormProps) {
  return (
    <BaseVoucherForm
      formData={formData}
      formRef={formRef}
      onFieldDataChanged={onFieldDataChanged}
      sidebar={
        <VoucherDocumentSection
          isUpdate={isUpdate}
          showVoucherCode={true}
          dateLabel={t("CHIT_YMD", "Ngày phiếu chi")}
          documentNoLabel={t("CHIT_NO", "Số phiếu chi")}
          amountLabel={t("AMOUNT", "Tổng tiền chi")}
          t={t}
        />
      }
    >
      <VoucherBusinessSection
        caption={t("CASH_PAYMENT_INFO", "Thông tin phiếu chi")}
        partnerLabel={t("PAYER_INFO", "Người nhận / Đối tượng liên quan")}
        partnerPlaceholder={t("PAYER_INFO", "Nhập người nhận hoặc đối tượng thanh toán")}
        referenceLabel={t("PAYMENT_REFERENCE", "Tham chiếu phiếu chi")}
        referencePlaceholder={t("PAYMENT_REFERENCE", "Nhập tham chiếu phiếu chi")}
      />
      <VoucherStatusSection paymentStatusLabel={t("IS_PAYMENT", "Đã chi")} t={t} />
      <VoucherDescriptionSection
        primaryDescriptionLabel={t("DESCRIPTION_VIET", "Diễn giải phiếu chi")}
        noteLabel={t("NOTE", "Ghi chú phiếu chi")}
        t={t}
      />
    </BaseVoucherForm>
  )
}

export default PaymentVoucherBusinessForm
