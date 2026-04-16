import BaseVoucherForm from "../base/BaseVoucherForm"
import VoucherBusinessSection from "../sections/VoucherBusinessSection"
import VoucherDescriptionSection from "../sections/VoucherDescriptionSection"
import VoucherDocumentSection from "../sections/VoucherDocumentSection"
import VoucherStatusSection from "../sections/VoucherStatusSection"
import type { VoucherBusinessFormProps } from "../types"

export function ReceiptVoucherBusinessForm({
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
          dateLabel={t("CHIT_YMD", "Ngày phiếu thu")}
          documentNoLabel={t("CHIT_NO", "Số phiếu thu")}
          amountLabel={t("AMOUNT", "Tổng tiền thu")}
          t={t}
        />
      }
    >
      <VoucherBusinessSection
        caption={t("CASH_RECEIPT_INFO", "Thông tin phiếu thu")}
        partnerLabel={t("PAYER_INFO", "Người nộp / Đối tượng liên quan")}
        partnerPlaceholder={t("PAYER_INFO", "Nhập người nộp hoặc đối tượng liên quan")}
        referenceLabel={t("COLLECTION_REFERENCE", "Tham chiếu phiếu thu")}
        referencePlaceholder={t("COLLECTION_REFERENCE", "Nhập tham chiếu phiếu thu")}
      />
      <VoucherStatusSection paymentStatusLabel={t("IS_PAYMENT", "Đã thu")} t={t} />
      <VoucherDescriptionSection
        primaryDescriptionLabel={t("DESCRIPTION_VIET", "Diễn giải phiếu thu")}
        noteLabel={t("NOTE", "Ghi chú phiếu thu")}
        t={t}
      />
    </BaseVoucherForm>
  )
}

export default ReceiptVoucherBusinessForm
