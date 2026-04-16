import BaseVoucherForm from "../base/BaseVoucherForm"
import VoucherBusinessSection from "../sections/VoucherBusinessSection"
import VoucherDescriptionSection from "../sections/VoucherDescriptionSection"
import VoucherDocumentSection from "../sections/VoucherDocumentSection"
import VoucherStatusSection from "../sections/VoucherStatusSection"
import type { VoucherBusinessFormProps } from "../types"

export function SalesVoucherBusinessForm({
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
          dateLabel={t("CHIT_YMD", "Ngày bán hàng")}
          documentNoLabel={t("CHIT_NO", "Số phiếu bán hàng")}
          amountLabel={t("AMOUNT", "Tổng doanh thu")}
          t={t}
        />
      }
    >
      <VoucherBusinessSection
        caption={t("SALES_INFO", "Thông tin bán hàng")}
        partnerLabel={t("PAYER_INFO", "Khách hàng")}
        partnerPlaceholder={t("PAYER_INFO", "Nhập khách hàng")}
        referenceLabel={t("SALES_INVOICE_INFO", "Hóa đơn bán hàng / Tham chiếu")}
        referencePlaceholder={t("SALES_INVOICE_INFO", "Nhập số hóa đơn bán hàng")}
        dayLabel={t("DAY_OF_PAYMENT", "Ngày đến hạn thu")}
        dayPlaceholder={t("DAY_OF_PAYMENT", "Nhập ngày đến hạn")}
        timeLabel={t("TIME_FOR_PAYMENT", "Điều khoản thanh toán")}
        timePlaceholder={t("TIME_FOR_PAYMENT", "Nhập điều khoản thanh toán")}
      />
      <VoucherStatusSection paymentStatusLabel={t("IS_PAYMENT", "Đã thu / Cấn trừ")} t={t} />
      <VoucherDescriptionSection
        primaryDescriptionLabel={t("DESCRIPTION_VIET", "Diễn giải bán hàng")}
        noteLabel={t("NOTE", "Ghi chú VAT đầu ra")}
        t={t}
      />
    </BaseVoucherForm>
  )
}

export default SalesVoucherBusinessForm
