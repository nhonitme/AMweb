import { useLocation } from "react-router-dom"

import ChitManagementPage from "./ChitManagementPage"

const ISSUE_MATERIAL_PATH = "/cost/issue-material"

export default function OtherVoucherPage() {
  const { pathname } = useLocation()
  const accountPairFilter =
    pathname === ISSUE_MATERIAL_PATH || pathname.endsWith(ISSUE_MATERIAL_PATH)
      ? "MATERIAL_ISSUE"
      : undefined

  return (
    <ChitManagementPage
      ledger="AR"
      chitType="OT"
      accountPairFilter={accountPairFilter}
    />
  )
}
