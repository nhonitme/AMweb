import BaseVoucherForm from "../base/BaseVoucherForm"
import VoucherBusinessSection from "../sections/VoucherBusinessSection"
import VoucherDescriptionSection from "../sections/VoucherDescriptionSection"
import VoucherDocumentSection from "../sections/VoucherDocumentSection"
import VoucherStatusSection from "../sections/VoucherStatusSection"
import type { VoucherBusinessFormProps } from "../types"

export function PurchaseServiceVoucherBusinessForm({
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
          dateLabel={t("CHIT_YMD", "Ngày phiếu mua dịch vụ")}
          documentNoLabel={t("CHIT_NO", "Số phiếu mua dịch vụ")}
          amountLabel={t("AMOUNT", "Tổng tiền dịch vụ")}
          t={t}
        />
      }
    >
      <VoucherBusinessSection
        caption={t("PURCHASE_SERVICE_INFO", "Thông tin mua dịch vụ")}
        partnerLabel={t("PAYER_INFO", "Nhà cung cấp dịch vụ")}
        partnerPlaceholder={t("PAYER_INFO", "Nhập nhà cung cấp dịch vụ")}
        referenceLabel={t("SERVICE_CONTRACT_INFO", "Hợp đồng / Hóa đơn dịch vụ")}
        referencePlaceholder={t("SERVICE_CONTRACT_INFO", "Nhập hợp đồng hoặc hóa đơn dịch vụ")}
        dayLabel={t("DAY_OF_PAYMENT", "Ngày đến hạn thanh toán")}
        dayPlaceholder={t("DAY_OF_PAYMENT", "Nhập ngày đến hạn")}
        timeLabel={t("TIME_FOR_PAYMENT", "Điều khoản nghiệm thu")}
        timePlaceholder={t("TIME_FOR_PAYMENT", "Nhập điều khoản nghiệm thu")}
      />
      <VoucherStatusSection paymentStatusLabel={t("IS_PAYMENT", "Đã thanh toán dịch vụ")} t={t} />
      <VoucherDescriptionSection
        primaryDescriptionLabel={t("DESCRIPTION_VIET", "Diễn giải mua dịch vụ")}
        noteLabel={t("NOTE", "Ghi chú VAT dịch vụ")}
        t={t}
      />
    </BaseVoucherForm>
  )
}

export default PurchaseServiceVoucherBusinessForm
