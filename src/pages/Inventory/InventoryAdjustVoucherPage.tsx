import InventoryManagementPage from "./InventoryManagementPage"

export default function InventoryAdjustVoucherPage() {
  return (
    <InventoryManagementPage
      ledger="INV"
      chitType="IA"
      titleKey="INVENTORY_ADJUSTMENT_VOUCHER"
      titleFallback="Phiếu điều chỉnh kho"
    />
  )
}
