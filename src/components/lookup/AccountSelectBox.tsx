import { useCallback, useMemo, useRef } from "react"

import type { AcclistInfo } from "@/types/acclist"
import BaseLookupCellEditor from "./BaseLookupCellEditor"
import {
  buildAccountLookupSearchExpr,
  formatAccountDisplay,
  getAccountLookupCode,
  getAccountLookupId,
  getAccountLookupName,
  type AccountLookupItem,
} from "./accountLookupUtils"
import { getAcclistLookupStore } from "./AcclistLookupStore"

export type AccountSelectBoxProps = {
  value?: string | null
  disabled?: boolean
  readOnly?: boolean
  placeholder?: string
  validationMessageMode?: "always" | "auto"
  onValueChanged?: (value: string | null, selectedItem?: AcclistInfo | null) => void
}

function normalizeAccountItem(item: AccountLookupItem): AcclistInfo {
  return {
    ...item,
    ACC_ID: getAccountLookupId(item) ?? 0,
    COMPANY_CD: String(item.COMPANY_CD ?? ""),
    ACC_CD: getAccountLookupCode(item),
    ACCTITLE_NM_VIET: getAccountLookupName(item, "NM_VIET"),
    ACCTITLE_NM_ENG: getAccountLookupName(item, "NM_ENG"),
    ACCTITLE_NM_KOR: getAccountLookupName(item, "NM_KOR"),
    ACCTITLE_NM_CHINA: getAccountLookupName(item, "NM_CHINA"),
  } as AcclistInfo
}

export default function AccountSelectBox({
  value,
  disabled = false,
  readOnly = false,
  placeholder = "Chọn tài khoản",
  validationMessageMode = "always",
  onValueChanged,
}: AccountSelectBoxProps) {
  const applyingRef = useRef(false)
  const dataSource = useMemo(() => getAcclistLookupStore(), [])
  const searchExpr = useMemo(() => buildAccountLookupSearchExpr("CD"), [])

  const displayExpr = useCallback((item: AccountLookupItem | null) => {
    return formatAccountDisplay(getAccountLookupCode(item), getAccountLookupName(item))
  }, [])

  const applyAccount = useCallback(
    (item: AccountLookupItem) => {
      const normalized = normalizeAccountItem(item)
      applyingRef.current = true
      onValueChanged?.(normalized.ACC_CD || null, normalized)
      window.requestAnimationFrame(() => {
        applyingRef.current = false
      })
    },
    [onValueChanged],
  )

  return (
    <BaseLookupCellEditor<AccountLookupItem>
      dataSource={dataSource}
      value={value}
      valueExpr="CD"
      displayExpr={displayExpr}
      itemRender={(item) => {
        if (!item) {
          return null
        }

        return (
          <div className="flex items-center gap-2 py-2 leading-tight">
            <span className="font-semibold text-slate-900">{getAccountLookupCode(item) || "-"}</span>
            <span className="text-slate-600">{getAccountLookupName(item) || "-"}</span>
          </div>
        )
      }}
      filterFocusField="CD"
      searchExpr={searchExpr}
      placeholder={placeholder}
      popupTitle="Tìm kiếm tài khoản"
      buttonHint="Tìm kiếm tài khoản"
      noDataText="Không tìm thấy tài khoản"
      stylingMode="outlined"
      validationMessageMode={validationMessageMode}
      disabled={disabled}
      readOnly={readOnly}
      onApply={applyAccount}
      onClear={() => onValueChanged?.(null, null)}
      shouldHandleValueChange={(event) => {
        if (applyingRef.current) {
          return false
        }

        const nextCode = String(event.value ?? "").trim()
        return !nextCode || nextCode !== String(value ?? "").trim()
      }}
      columns={[
        { dataField: "CD", caption: "Mã tài khoản", width: 180 },
        { dataField: "NM_VIET", caption: "Tên tài khoản", minWidth: 280 },
      ]}
    />
  )
}
