import BaseVoucherForm from "../base/BaseVoucherForm"
import VoucherBusinessSection from "../sections/VoucherBusinessSection"
import VoucherDescriptionSection from "../sections/VoucherDescriptionSection"
import VoucherDocumentSection from "../sections/VoucherDocumentSection"
import VoucherStatusSection from "../sections/VoucherStatusSection"
import type { VoucherBusinessFormProps } from "../types"

export function OffsetVoucherBusinessForm({
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
          dateLabel={t("CHIT_YMD", "Ngày cấn trừ")}
          documentNoLabel={t("CHIT_NO", "Số phiếu cấn trừ")}
          amountLabel={t("AMOUNT", "Số tiền cấn trừ")}
          t={t}
        />
      }
    >
      <VoucherBusinessSection
        caption={t("OFFSET_INFO", "Thông tin cấn trừ")}
        partnerLabel={t("PAYER_INFO", "Đối tượng công nợ")}
        partnerPlaceholder={t("PAYER_INFO", "Nhập khách hàng hoặc nhà cung cấp cấn trừ")}
        referenceLabel={t("OFFSET_REFERENCE", "Tham chiếu cấn trừ")}
        referencePlaceholder={t("OFFSET_REFERENCE", "Nhập tham chiếu cấn trừ")}
        timeLabel={t("TIME_FOR_PAYMENT", "Quy tắc cấn trừ")}
        timePlaceholder={t("TIME_FOR_PAYMENT", "Nhập quy tắc cấn trừ")}
      />
      <VoucherStatusSection paymentStatusLabel={t("IS_PAYMENT", "Đã cấn trừ")} t={t} />
      <VoucherDescriptionSection
        primaryDescriptionLabel={t("DESCRIPTION_VIET", "Diễn giải cấn trừ")}
        noteLabel={t("NOTE", "Ghi chú đối trừ công nợ")}
        t={t}
      />
    </BaseVoucherForm>
  )
}

export default OffsetVoucherBusinessForm
