import InventoryManagementPage from "./InventoryManagementPage"

export default function InventoryReceiptVoucherPage() {
  return (
    <InventoryManagementPage
      ledger="AP"
      chitType="IR"
      titleKey="INVENTORY_RECEIPT_VOUCHER"
      titleFallback="Phiếu nhập kho"
    />
  )
}
