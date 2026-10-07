import InventoryManagementPage from "./InventoryManagementPage"

export default function InventoryIssueVoucherPage() {
  return (
    <InventoryManagementPage
      ledger="AR"
      chitType="IO"
      titleKey="INVENTORY_ISSUE_VOUCHER"
      titleFallback="Phiếu xuất kho"
    />
  )
}
