import BaseVoucherForm from "../base/BaseVoucherForm"
import VoucherBusinessSection from "../sections/VoucherBusinessSection"
import VoucherDescriptionSection from "../sections/VoucherDescriptionSection"
import VoucherDocumentSection from "../sections/VoucherDocumentSection"
import VoucherStatusSection from "../sections/VoucherStatusSection"
import type { VoucherBusinessFormProps } from "../types"

export function PurchaseVoucherBusinessForm({
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
          showCogsCode={true}
          dateLabel={t("CHIT_YMD", "Ngày phiếu mua hàng")}
          documentNoLabel={t("CHIT_NO", "Số phiếu mua hàng")}
          amountLabel={t("AMOUNT", "Tổng tiền mua")}
          t={t}
        />
      }
    >
      <VoucherBusinessSection
        caption={t("PURCHASE_INFO", "Thông tin mua hàng")}
        partnerLabel={t("PAYER_INFO", "Nhà cung cấp")}
        partnerPlaceholder={t("PAYER_INFO", "Nhập nhà cung cấp")}
        referenceLabel={t("PURCHASE_INVOICE_INFO", "Hóa đơn / Chứng từ đầu vào")}
        referencePlaceholder={t("PURCHASE_INVOICE_INFO", "Nhập hóa đơn hoặc chứng từ đầu vào")}
        dayLabel={t("DAY_OF_PAYMENT", "Ngày đến hạn thanh toán")}
        dayPlaceholder={t("DAY_OF_PAYMENT", "Nhập ngày đến hạn")}
        timeLabel={t("TIME_FOR_PAYMENT", "Điều khoản mua hàng")}
        timePlaceholder={t("TIME_FOR_PAYMENT", "Nhập điều khoản mua hàng")}
      />
      <VoucherStatusSection paymentStatusLabel={t("IS_PAYMENT", "Đã thanh toán NCC")} t={t} />
      <VoucherDescriptionSection
        primaryDescriptionLabel={t("DESCRIPTION_VIET", "Diễn giải mua hàng")}
        noteLabel={t("NOTE", "Ghi chú VAT đầu vào")}
        t={t}
      />
    </BaseVoucherForm>
  )
}

export default PurchaseVoucherBusinessForm
