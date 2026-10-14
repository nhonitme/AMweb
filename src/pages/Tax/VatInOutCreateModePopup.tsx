import { useContext, useEffect, useState } from "react"
import Popup from "devextreme-react/popup"
import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import RadioGroup from "devextreme-react/radio-group"

import { LanguageContext } from "@/lib/i18nLoader"
import type { VatInvoiceType } from "./vatInvoiceVoucherDraft"

export type VatVoucherCreationMode = "MERGED" | "ONE_PER_INVOICE"

type Props = {
  visible: boolean
  invoiceType: VatInvoiceType
  invoiceCount: number
  loadInventoryDetail: boolean
  inventorySettingLoading: boolean
  onLoadInventoryDetailChange: (value: boolean) => void
  quickCreateEnabled: boolean
  onQuickCreateCustomer: () => void
  onQuickCreateProduct: () => void
  onChoose: (mode: VatVoucherCreationMode) => void
  onClose: () => void
}

export default function VatInOutCreateModePopup({
  visible,
  invoiceType,
  invoiceCount,
  loadInventoryDetail,
  inventorySettingLoading,
  onLoadInventoryDetailChange,
  quickCreateEnabled,
  onQuickCreateCustomer,
  onQuickCreateProduct,
  onChoose,
  onClose,
}: Props) {
  const { translate } = useContext(LanguageContext) as { translate?: (key: string, fallback?: string) => string }
  const t = (key: string, fallback: string) => translate ? translate(key, fallback) : fallback
  const [creationMode, setCreationMode] = useState<VatVoucherCreationMode>("MERGED")
  const creationModeOptions = [
    { value: "MERGED" as const, label: t("VAT_BATCH_MERGED", "Gộp nhiều hóa đơn vào một chứng từ") },
    { value: "ONE_PER_INVOICE" as const, label: t("VAT_BATCH_ONE_PER_INVOICE", "Mỗi hóa đơn một chứng từ") },
  ]
  useEffect(() => {
    if (visible) {
      setCreationMode("MERGED")
    }
  }, [invoiceType, visible])

  return (
    <Popup
      visible={visible}
      title={t("VAT_PROCESS_VOUCHERS", "Xử lý chứng từ hóa đơn VAT")}
      showCloseButton={true}
      hideOnOutsideClick={false}
      width="min(560px, 94vw)"
      height="auto"
      onHiding={onClose}
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="text-sm text-slate-600">
          {invoiceType === "BUY" ? t("VAT_INOUT_TYPE_BUY", "Hóa đơn đầu vào") : t("VAT_INOUT_TYPE_SELL", "Hóa đơn đầu ra")}
          <span className="mx-2">·</span>
          {t("VAT_SELECTED_INVOICE_COUNT", "Đã chọn {0} hóa đơn").replace("{0}", String(invoiceCount))}
        </div>
        <CheckBox
          value={loadInventoryDetail}
          disabled={inventorySettingLoading}
          text={t("VAT_LOAD_INVENTORY_DETAIL", "Tải thông tin chi tiết hàng tồn kho khi lập chứng từ")}
          onValueChanged={(event) => onLoadInventoryDetailChange(Boolean(event.value))}
        />
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-slate-700">{t("VAT_QUICK_CREATE_SECTION", "Tạo nhanh danh mục")}</div>
          <div className="flex flex-wrap gap-2">
            <Button
              text={t("VAT_QUICK_CREATE_CUSTOMER", "Tạo nhanh khách hàng")}
              icon="add"
              stylingMode="outlined"
              disabled={!quickCreateEnabled || inventorySettingLoading}
              hint={!quickCreateEnabled ? t("VAT_QUICK_CREATE_ONE_INVOICE", "Chọn hóa đơn trước; khi chọn nhiều hóa đơn, hệ thống sẽ tự lọc mục trùng.") : undefined}
              onClick={onQuickCreateCustomer}
            />
            <Button
              text={t("VAT_QUICK_CREATE_PRODUCT", "Tạo nhanh sản phẩm")}
              icon="add"
              stylingMode="outlined"
              disabled={!quickCreateEnabled || inventorySettingLoading}
              hint={!quickCreateEnabled ? t("VAT_QUICK_CREATE_ONE_INVOICE", "Chọn hóa đơn trước; khi chọn nhiều hóa đơn, hệ thống sẽ tự lọc mục trùng.") : undefined}
              onClick={onQuickCreateProduct}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium text-slate-700">{t("VAT_CREATION_MODE", "Cách tạo chứng từ")}</div>
          <RadioGroup
            dataSource={creationModeOptions}
            valueExpr="value"
            displayExpr="label"
            layout="vertical"
            value={creationMode}
            onValueChanged={(event) => setCreationMode((event.value ?? "MERGED") as VatVoucherCreationMode)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button text={t("CANCEL", "Hủy")} stylingMode="text" onClick={onClose} />
          <Button
            text={t("CONFIRM", "Xác nhận")}
            type="default"
            stylingMode="contained"
            disabled={!creationMode || inventorySettingLoading}
            onClick={() => {
              if (creationMode) onChoose(creationMode)
            }}
          />
        </div>
      </div>
    </Popup>
  )
}
