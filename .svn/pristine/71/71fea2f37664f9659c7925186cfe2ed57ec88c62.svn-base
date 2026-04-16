import BaseVoucherForm from "../base/BaseVoucherForm"
import VoucherBusinessSection from "../sections/VoucherBusinessSection"
import VoucherDescriptionSection from "../sections/VoucherDescriptionSection"
import VoucherDocumentSection from "../sections/VoucherDocumentSection"
import VoucherStatusSection from "../sections/VoucherStatusSection"
import type { VoucherBusinessFormProps } from "../types"

export function CreditNoteVoucherBusinessForm({
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
          dateLabel={t("CHIT_YMD", "Ngày giấy báo có")}
          documentNoLabel={t("CHIT_NO", "Số giấy báo có")}
          amountLabel={t("AMOUNT", "Số tiền báo có")}
          t={t}
        />
      }
    >
      <VoucherBusinessSection
        caption={t("BANK_CREDIT_INFO", "Thông tin giấy báo có ngân hàng")}
        partnerLabel={t("PAYER_INFO", "Ngân hàng / Tài khoản nhận")}
        partnerPlaceholder={t("PAYER_INFO", "Nhập ngân hàng hoặc tài khoản nhận")}
        referenceLabel={t("BANK_TRANSACTION_NO", "Tham chiếu giao dịch")}
        referencePlaceholder={t("BANK_TRANSACTION_NO", "Nhập số giao dịch ngân hàng")}
        timeLabel={t("TIME_FOR_PAYMENT", "Thời điểm hạch toán")}
        timePlaceholder={t("TIME_FOR_PAYMENT", "Nhập thời điểm hạch toán")}
      />
      <VoucherStatusSection paymentStatusLabel={t("IS_PAYMENT", "Đã báo có")} t={t} />
      <VoucherDescriptionSection
        primaryDescriptionLabel={t("DESCRIPTION_VIET", "Diễn giải giấy báo có")}
        noteLabel={t("NOTE", "Ghi chú đối chiếu ngân hàng")}
        t={t}
      />
    </BaseVoucherForm>
  )
}

export default CreditNoteVoucherBusinessForm
