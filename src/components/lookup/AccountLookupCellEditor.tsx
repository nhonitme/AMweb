import { useCallback, useMemo, useRef } from "react"
import type dxSelectBox from "devextreme/ui/select_box"

import BaseLookupCellEditor, { type LookupDataSource } from "./BaseLookupCellEditor"
import {
  accountMatchesSearchText,
  buildAccountLookupSearchExpr,
  findAccountLookupItemInRows,
  getAccountLookupCode,
  getAccountLookupId,
  getAccountLookupName,
  getAccountLookupNames,
  getMultilingualAccountNameFieldNames,
  rememberAccountDisplayNames,
  type AccountLookupItem,
} from "./accountLookupUtils"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import {
  restoreLookupGridCellFocus,
  type LookupGridCellValueHost,
  setLookupGridCellValue,
  trimLookupText,
} from "./lookupHelpers"

type Props = {
  dataSource: LookupDataSource
  value: string | null | undefined
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: string | null) => void
  ValueField?: string
  NameField?: string
  IdField?: string
  LookupCodeField?: string
  LookupNameField?: string
  multilingualNameFieldPrefix?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  autoOpen?: LookupOpenMode | null
  editMode?: "code" | "name"
}

async function loadLookupRows(dataSource: LookupDataSource): Promise<AccountLookupItem[]> {
  if (dataSource && typeof dataSource === "object" && "load" in dataSource && typeof dataSource.load === "function") {
    return (await dataSource.load()) as AccountLookupItem[]
  }

  return Array.isArray(dataSource) ? dataSource : []
}

export default function AccountLookupCellEditor({
  dataSource,
  value,
  rowIndex,
  grid,
  setValue,
  ValueField = "DEBIT",
  NameField = "DEBIT_NM_VIET",
  IdField = "ACC_ID",
  LookupCodeField = "ACC_CD",
  LookupNameField = "ACCTITLE_NM_VIET",
  multilingualNameFieldPrefix,
  placeholder = "Select account",
  popupTitle = "Select account",
  buttonHint = "Open account list",
  autoOpen,
  editMode = "code",
}: Props) {
  const committingRef = useRef(false)

  const displayExpr = useCallback(
    (item: AccountLookupItem | null) => {
      const accountCd = getAccountLookupCode(item, LookupCodeField)
      const accountName = getAccountLookupName(item, LookupNameField)
      return editMode === "name" ? accountName || accountCd : accountCd || accountName
    },
    [LookupCodeField, LookupNameField, editMode],
  )

  const searchExpr = useMemo(
    () => buildAccountLookupSearchExpr(LookupCodeField, LookupNameField),
    [LookupCodeField, LookupNameField],
  )

  // Same getEtcData_info etcType=0 (TK con); avoid AcclistManager full tree.
  const popupColumns = useMemo(
    () => [
      { dataField: LookupCodeField, caption: "Mã tài khoản", width: 180 },
      { dataField: LookupNameField, caption: "Tên tài khoản", minWidth: 280 },
    ],
    [LookupCodeField, LookupNameField],
  )

  const applyAccount = useCallback(
    (account: AccountLookupItem) => {
      const accountId = getAccountLookupId(account)
      const accountCd = getAccountLookupCode(account, LookupCodeField)
      const accountName = getAccountLookupName(account, LookupNameField)

      setValue((editMode === "name" ? accountName : accountCd) || null)
      setLookupGridCellValue(grid, rowIndex, ValueField, accountCd)
      setLookupGridCellValue(grid, rowIndex, NameField, accountName)

      if (IdField) {
        setLookupGridCellValue(grid, rowIndex, IdField, accountId)
      }

      if (multilingualNameFieldPrefix) {
        const names = getAccountLookupNames(account)
        const fields = getMultilingualAccountNameFieldNames(multilingualNameFieldPrefix)
        setLookupGridCellValue(grid, rowIndex, fields.viet, names.VIET)
        setLookupGridCellValue(grid, rowIndex, fields.eng, names.ENG)
        setLookupGridCellValue(grid, rowIndex, fields.kor, names.KOR)
        setLookupGridCellValue(grid, rowIndex, fields.china, names.CHN)
        rememberAccountDisplayNames(accountCd, account)
      }

      restoreLookupGridCellFocus(grid, rowIndex, editMode === "name" ? NameField : ValueField)
    },
    [
      IdField,
      LookupCodeField,
      LookupNameField,
      NameField,
      ValueField,
      editMode,
      grid,
      multilingualNameFieldPrefix,
      rowIndex,
      setValue,
    ],
  )

  const clearAccount = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, ValueField, "")
    setLookupGridCellValue(grid, rowIndex, NameField, "")

    if (IdField) {
      setLookupGridCellValue(grid, rowIndex, IdField, null)
    }

    if (multilingualNameFieldPrefix) {
      const fields = getMultilingualAccountNameFieldNames(multilingualNameFieldPrefix)
      setLookupGridCellValue(grid, rowIndex, fields.viet, "")
      setLookupGridCellValue(grid, rowIndex, fields.eng, "")
      setLookupGridCellValue(grid, rowIndex, fields.kor, "")
      setLookupGridCellValue(grid, rowIndex, fields.china, "")
    }

    restoreLookupGridCellFocus(grid, rowIndex, editMode === "name" ? NameField : ValueField)
  }, [
    IdField,
    NameField,
    ValueField,
    editMode,
    grid,
    multilingualNameFieldPrefix,
    rowIndex,
    setValue,
  ])

  const commitTypedAccount = useCallback(
    async (component: dxSelectBox) => {
      if (committingRef.current) {
        return
      }

      const typedText = trimLookupText(component.option("text"))
      if (!typedText) {
        return
      }

      const currentCode = trimLookupText(value)
      if (editMode === "code" && typedText === currentCode) {
        return
      }

      committingRef.current = true

      try {
        const rows = await loadLookupRows(dataSource)
        const exactMatch =
          findAccountLookupItemInRows(rows, typedText, LookupCodeField) ??
          rows.find((item) => getAccountLookupName(item, LookupNameField) === typedText) ??
          null
        const partialMatches = exactMatch
          ? []
          : rows.filter((item) => accountMatchesSearchText(item, typedText))
        const matched = exactMatch ?? (partialMatches.length === 1 ? partialMatches[0] : null)

        if (matched) {
          applyAccount(matched)
        }
      } finally {
        committingRef.current = false
      }
    },
    [LookupCodeField, LookupNameField, applyAccount, dataSource, editMode, value],
  )

  return (
    <BaseLookupCellEditor<AccountLookupItem>
      dataSource={dataSource}
      value={value}
      valueExpr={LookupCodeField}
      displayExpr={displayExpr}
      itemRender={(item) => {
        if (!item) {
          return null
        }

        return (
          <div className="flex items-center gap-2 py-2 leading-tight">
            <span className="font-semibold text-slate-900">
              {getAccountLookupCode(item, LookupCodeField) || "-"}
            </span>
            <span className="text-slate-600">
              {getAccountLookupName(item, LookupNameField) || "-"}
            </span>
          </div>
        )
      }}
      searchExpr={searchExpr}
      filterFocusField={LookupCodeField}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      noDataText="No matching accounts"
      dropDownHeight={360}
      autoOpen={autoOpen}
      grid={grid}
      rowIndex={rowIndex}
      navigateField={editMode === "name" ? NameField : ValueField}
      onBeforeTabNavigate={commitTypedAccount}
      onClosed={(event) => {
        void commitTypedAccount(event.component)
      }}
      shouldHandleValueChange={(event) => {
        if ((event.value == null || event.value === "") && !event.event) {
          return false
        }

        return true
      }}
      onApply={applyAccount}
      onClear={clearAccount}
      columns={popupColumns}
    />
  )
}
