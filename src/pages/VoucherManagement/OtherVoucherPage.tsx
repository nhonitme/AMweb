import { useLocation } from "react-router-dom"

import ChitManagementPage from "./ChitManagementPage"

const ISSUE_MATERIAL_PATH = "/cost/issue-material"
const FINISH_GOODS_IN_PATH = "/cost/finish-goods-in"

function resolveAccountPairFilter(pathname: string): string | undefined {
  if (pathname === ISSUE_MATERIAL_PATH || pathname.endsWith(ISSUE_MATERIAL_PATH)) {
    return "MATERIAL_ISSUE"
  }
  if (pathname === FINISH_GOODS_IN_PATH || pathname.endsWith(FINISH_GOODS_IN_PATH)) {
    return "FINISH_GOODS_IN"
  }
  return undefined
}

export default function OtherVoucherPage() {
  const { pathname } = useLocation()
  const accountPairFilter = resolveAccountPairFilter(pathname)

  return (
    <ChitManagementPage
      ledger="AR"
      chitType="OT"
      accountPairFilter={accountPairFilter}
    />
  )
}
