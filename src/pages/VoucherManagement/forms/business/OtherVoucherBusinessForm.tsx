import BaseVoucherForm from "../base/BaseVoucherForm"
import VoucherBusinessSection from "../sections/VoucherBusinessSection"
import VoucherDescriptionSection from "../sections/VoucherDescriptionSection"
import VoucherDocumentSection from "../sections/VoucherDocumentSection"
import VoucherStatusSection from "../sections/VoucherStatusSection"
import type { VoucherBusinessFormProps } from "../types"

export function OtherVoucherBusinessForm({
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
          dateLabel={t("CHIT_YMD", "Ngày nghiệp vụ")}
          documentNoLabel={t("CHIT_NO", "Số chứng từ")}
          amountLabel={t("AMOUNT", "Số tiền nghiệp vụ")}
          t={t}
        />
      }
    >
      <VoucherBusinessSection
        caption={t("OTHER_INFO", "Thông tin nghiệp vụ khác")}
        partnerLabel={t("PAYER_INFO", "Đối tượng liên quan")}
        partnerPlaceholder={t("PAYER_INFO", "Nhập đối tượng liên quan")}
        referenceLabel={t("OTHER_REFERENCE", "Tham chiếu")}
        referencePlaceholder={t("OTHER_REFERENCE", "Nhập tham chiếu nội bộ hoặc bên ngoài")}
        timeLabel={t("TIME_FOR_PAYMENT", "Quy tắc xử lý")}
        timePlaceholder={t("TIME_FOR_PAYMENT", "Nhập quy tắc xử lý")}
      />
      <VoucherStatusSection paymentStatusLabel={t("IS_PAYMENT", "Đã xử lý")} t={t} />
      <VoucherDescriptionSection
        primaryDescriptionLabel={t("DESCRIPTION_VIET", "Diễn giải nghiệp vụ")}
        noteLabel={t("NOTE", "Ghi chú nội bộ")}
        t={t}
      />
    </BaseVoucherForm>
  )
}

export default OtherVoucherBusinessForm
