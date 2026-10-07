import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Button from 'devextreme-react/button'
import type { SelectBoxTypes } from 'devextreme-react/select-box'
import type dxSelectBox from 'devextreme/ui/select_box'

import type { AcclistInfo } from '@/types/acclist'
import { getCurrentDataLanguageSuffix } from '@/utils/language'

import AccountQuickCreatePopup from './AccountQuickCreatePopup'
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
} from './accountLookupUtils'
import BaseLookupCellEditor, { type LookupDataSource } from './BaseLookupCellEditor'
import type { LookupOpenMode } from './LookupGridCellDisplay'
import {
  focusNextEditableGridCell,
  restoreLookupGridCellFocus,
  type LookupGridCellValueHost,
  setLookupGridCellValues,
  trimLookupText,
} from './lookupHelpers'
import { getAcclistLookupStore, reloadAcclistLookupStore } from './AcclistLookupStore'
import { EtcType } from '@/api/systemApi'

type AccDataSource = SelectBoxTypes.Properties['dataSource']
type AccountLookupStore = {
  load: () => Promise<unknown>
}

type AccountGridLookupCellEditorProps = {
  dataSource?: AccDataSource
  value: string | null | undefined
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: string | null) => void
  codeField: string
  nameField?: string
  multilingualNameFieldPrefix?: string
  idField: string
  lookupCodeField?: string
  lookupNameField?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  addAccountLabel?: string
  autoOpen?: LookupOpenMode | null
  focusNextColumnOnSelect?: boolean
  editMode?: 'code' | 'name'
}

function buildAccountRowValues({
  codeField,
  idField,
  nameField,
  multilingualNameFieldPrefix,
  normalizedCode,
  accId,
  accNm,
  sourceAccount,
}: {
  codeField: string
  idField: string
  nameField?: string
  multilingualNameFieldPrefix?: string
  normalizedCode: string
  accId: number | null
  accNm: string
  sourceAccount?: AccountLookupItem | null
}): Record<string, unknown> {
  const values: Record<string, unknown> = {
    [codeField]: normalizedCode,
    [idField]: accId,
  }

  if (multilingualNameFieldPrefix) {
    const names = getAccountLookupNames(sourceAccount)
    const fields = getMultilingualAccountNameFieldNames(multilingualNameFieldPrefix)
    values[fields.viet] = names.VIET
    values[fields.eng] = names.ENG
    values[fields.kor] = names.KOR
    values[fields.china] = names.CHN
    return values
  }

  if (nameField) {
    values[nameField] = trimLookupText(accNm)
  }

  return values
}

function buildClearAccountRowValues({
  codeField,
  idField,
  nameField,
  multilingualNameFieldPrefix,
}: {
  codeField: string
  idField: string
  nameField?: string
  multilingualNameFieldPrefix?: string
}): Record<string, unknown> {
  const values: Record<string, unknown> = {
    [codeField]: '',
    [idField]: null,
  }

  if (multilingualNameFieldPrefix) {
    const fields = getMultilingualAccountNameFieldNames(multilingualNameFieldPrefix)
    values[fields.viet] = ''
    values[fields.eng] = ''
    values[fields.kor] = ''
    values[fields.china] = ''
    return values
  }

  if (nameField) {
    values[nameField] = ''
  }

  return values
}

export default function AccountGridLookupCellEditor({
  dataSource,
  value,
  rowIndex,
  grid,
  codeField,
  nameField,
  multilingualNameFieldPrefix,
  idField,
  lookupCodeField = 'CD',
  lookupNameField = `NM_${getCurrentDataLanguageSuffix()}`,
  placeholder = 'Chọn tài khoản',
  popupTitle = 'Chọn tài khoản',
  buttonHint = 'Mở danh sách tài khoản',
  addAccountLabel = '+ Thêm tài khoản mới',
  autoOpen,
  focusNextColumnOnSelect = false,
  editMode = 'code',
}: AccountGridLookupCellEditorProps) {
  const accountLookupStore = useMemo(
    () => (dataSource ?? getAcclistLookupStore({ etcType: EtcType.cbxAccount })) as AccountLookupStore,
    [dataSource],
  )
  const [opened, setOpened] = useState(autoOpen === 'dropdown')
  const [quickCreateVisible, setQuickCreateVisible] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [lookupVersion, setLookupVersion] = useState(0)
  const [noSearchResults, setNoSearchResults] = useState(false)
  const lastValidCodeRef = useRef<string | null>(trimLookupText(value) || null)
  const tabNavigationRef = useRef(false)

  const searchExpr = useMemo(
    () => buildAccountLookupSearchExpr(lookupCodeField, lookupNameField),
    [lookupCodeField, lookupNameField],
  )

  const navigateField = editMode === 'name' && nameField ? nameField : codeField

  const displayExpr = useCallback(
    (item: AccountLookupItem | null) => {
      const accountCd = getAccountLookupCode(item, lookupCodeField)
      const accountNm = getAccountLookupName(item, lookupNameField)
      return editMode === 'name' ? accountNm || accountCd : accountCd || accountNm
    },
    [editMode, lookupCodeField, lookupNameField],
  )

  const finishSelection = useCallback(
    (targetField?: string) => {
      const fieldName = targetField ?? navigateField

      window.requestAnimationFrame(() => {
        if (focusNextColumnOnSelect) {
          focusNextEditableGridCell(grid, rowIndex, fieldName)
          return
        }

        restoreLookupGridCellFocus(grid, rowIndex, fieldName)
      })
    },
    [focusNextColumnOnSelect, grid, navigateField, rowIndex],
  )

  const writeAccountValues = useCallback(
    (
      account: { accId: number | null; accCd: string; accNm: string },
      sourceAccount?: AccountLookupItem | null,
    ) => {
      const normalizedCode = trimLookupText(account.accCd)
      lastValidCodeRef.current = normalizedCode || null

      setLookupGridCellValues(
        grid,
        rowIndex,
        buildAccountRowValues({
          codeField,
          idField,
          nameField,
          multilingualNameFieldPrefix,
          normalizedCode,
          accId: account.accId,
          accNm: account.accNm,
          sourceAccount,
        }),
      )
      rememberAccountDisplayNames(normalizedCode, sourceAccount)
    },
    [codeField, grid, idField, multilingualNameFieldPrefix, nameField, rowIndex],
  )

  const applyNormalizedAccount = useCallback(
    (account: { accId: number | null; accCd: string; accNm: string }, sourceAccount?: AccountLookupItem | null) => {
      writeAccountValues(account, sourceAccount)

      setOpened(false)
      setQuickCreateVisible(false)
      setNoSearchResults(false)
      finishSelection()
    },
    [finishSelection, writeAccountValues],
  )

  const applyAccount = useCallback(
    (account: AccountLookupItem | null | undefined) => {
      if (!account) {
        return
      }

      applyNormalizedAccount(
        {
          accId: getAccountLookupId(account),
          accCd: getAccountLookupCode(account, lookupCodeField),
          accNm: getAccountLookupName(account, lookupNameField),
        },
        account,
      )
    },
    [applyNormalizedAccount, lookupCodeField, lookupNameField],
  )

  const clearAccount = useCallback(() => {
    lastValidCodeRef.current = null
    setLookupGridCellValues(
      grid,
      rowIndex,
      buildClearAccountRowValues({
        codeField,
        idField,
        nameField,
        multilingualNameFieldPrefix,
      }),
    )
    restoreLookupGridCellFocus(grid, rowIndex, navigateField)
  }, [codeField, grid, idField, multilingualNameFieldPrefix, nameField, navigateField, rowIndex])

  const resolveSelectedAccount = useCallback(
    async (event: SelectBoxTypes.ValueChangedEvent): Promise<AccountLookupItem | null> => {
      const selectedItem = event.component?.option?.('selectedItem') as AccountLookupItem | null | undefined

      if (selectedItem) {
        return selectedItem
      }

      const normalizedCode = trimLookupText(event.value)
      if (!normalizedCode) {
        return null
      }

      try {
        const rows = (await accountLookupStore.load()) as AccountLookupItem[]
        return findAccountLookupItemInRows(rows, normalizedCode, lookupCodeField)
      } catch {
        return null
      }
    },
    [accountLookupStore, lookupCodeField],
  )

  const evaluateSearchResults = useCallback(async (text: string) => {
    const normalizedText = trimLookupText(text)
    if (!normalizedText) {
      setNoSearchResults(false)
      return
    }

    try {
      const rows = (await accountLookupStore.load()) as AccountLookupItem[]
      const hasMatch = rows.some((item) => accountMatchesSearchText(item, normalizedText))
      setNoSearchResults(!hasMatch)
    } catch {
      setNoSearchResults(false)
    }
  }, [accountLookupStore])

  const commitPendingInput = useCallback(
    async (component: dxSelectBox) => {
      const typedText = trimLookupText(component.option('text'))
      if (!typedText) {
        return
      }

      const currentValue = trimLookupText(component.option('value'))
      if (currentValue === typedText && lastValidCodeRef.current === typedText) {
        return
      }

      try {
        const rows = (await accountLookupStore.load()) as AccountLookupItem[]
        const matched =
          findAccountLookupItemInRows(rows, typedText, lookupCodeField) ??
          (editMode === 'name'
            ? rows.find((item) => getAccountLookupName(item, lookupNameField) === typedText) ?? null
            : null)
        if (matched) {
          writeAccountValues(
            {
              accId: getAccountLookupId(matched),
              accCd: getAccountLookupCode(matched, lookupCodeField),
              accNm: getAccountLookupName(matched, lookupNameField),
            },
            matched,
          )
          return
        }
      } catch {
        // Fall through to revert invalid input.
      }

      if (lastValidCodeRef.current) {
        setLookupGridCellValues(grid, rowIndex, { [codeField]: lastValidCodeRef.current })
        return
      }

      setLookupGridCellValues(
        grid,
        rowIndex,
        buildClearAccountRowValues({
          codeField,
          idField,
          nameField,
          multilingualNameFieldPrefix,
        }),
      )
    },
    [
      codeField,
      accountLookupStore,
      editMode,
      grid,
      idField,
      lookupCodeField,
      lookupNameField,
      multilingualNameFieldPrefix,
      nameField,
      rowIndex,
      writeAccountValues,
    ],
  )

  const handleBeforeTabNavigate = useCallback(
    async (component: dxSelectBox) => {
      tabNavigationRef.current = true
      setOpened(false)
      setNoSearchResults(false)
      setSearchText('')

      try {
        await commitPendingInput(component)
      } finally {
        window.requestAnimationFrame(() => {
          tabNavigationRef.current = false
        })
      }
    },
    [commitPendingInput],
  )

  const handleClosed = useCallback(() => {
    if (tabNavigationRef.current) {
      setNoSearchResults(false)
      setSearchText('')
      return
    }

    const currentValue = trimLookupText(value)
    const lastValidCode = lastValidCodeRef.current

    if (currentValue && currentValue !== lastValidCode) {
      if (lastValidCode) {
        setLookupGridCellValues(grid, rowIndex, { [codeField]: lastValidCode })
      } else {
        clearAccount()
      }
    }

    setNoSearchResults(false)
    setSearchText('')
  }, [clearAccount, codeField, grid, rowIndex, value])

  const renderAccountItem = useCallback(
    (item: AccountLookupItem | null) => {
      if (!item) {
        return null
      }

      const accountCd = getAccountLookupCode(item, lookupCodeField)
      const accountNm = getAccountLookupName(item, lookupNameField)

      return (
        <div className="account-lookup-item flex items-center gap-2 py-2 leading-tight">
          <span className="font-semibold text-slate-900">{accountCd || '-'}</span>
          <span className="text-slate-600">{accountNm || '-'}</span>
        </div>
      )
    },
    [lookupCodeField, lookupNameField],
  )

  const handleQuickCreateSaved = useCallback(
    async (account: AcclistInfo) => {
      await reloadAcclistLookupStore()
      setLookupVersion((current) => current + 1)

      const rows = (await accountLookupStore.load()) as AccountLookupItem[]
      const accountCode = getAccountLookupCode(account, lookupCodeField)
      const matched =
        rows.find((item) => getAccountLookupCode(item, lookupCodeField) === accountCode) ?? account

      applyAccount(matched)
    },
    [accountLookupStore, applyAccount, lookupCodeField],
  )

  useEffect(() => {
    lastValidCodeRef.current = trimLookupText(value) || lastValidCodeRef.current
  }, [value])

  return (
    <>
      <BaseLookupCellEditor<AccountLookupItem>
        key={`account-lookup-${lookupVersion}`}
        dataSource={accountLookupStore as LookupDataSource}
        value={value ?? null}
        valueExpr={lookupCodeField}
        displayExpr={displayExpr}
        itemRender={renderAccountItem}
        acceptCustomValue={false}
        searchExpr={searchExpr}
        searchTimeout={200}
        placeholder={placeholder}
        popupTitle={popupTitle}
        buttonHint={buttonHint}
        noDataText="Không tìm thấy tài khoản"
        autoOpen={autoOpen}
        opened={opened}
        grid={grid}
        rowIndex={rowIndex}
        navigateField={navigateField}
        onBeforeTabNavigate={handleBeforeTabNavigate}
        onOpenedChange={setOpened}
        onClosed={handleClosed}
        onInput={(event) => {
          const nextSearchText = String(event.event?.target ? (event.event.target as HTMLInputElement).value : '')
          setSearchText(nextSearchText)
          void evaluateSearchResults(nextSearchText)
        }}
        resolveSelectedItem={resolveSelectedAccount}
        onApply={applyAccount}
        onClear={clearAccount}
        columns={[
          { dataField: lookupCodeField, caption: 'Mã tài khoản', width: 180 },
          { dataField: lookupNameField, caption: 'Tên tài khoản', minWidth: 280 },
        ]}
      />

      {opened && noSearchResults && trimLookupText(searchText) ? (
        <div className="account-lookup-add-new">
          <Button
            text={addAccountLabel}
            stylingMode="text"
            icon="plus"
            onClick={() => {
              setOpened(false)
              setQuickCreateVisible(true)
            }}
          />
        </div>
      ) : null}

      <AccountQuickCreatePopup
        visible={quickCreateVisible}
        initialAccCd={trimLookupText(searchText)}
        onClose={() => setQuickCreateVisible(false)}
        onSaved={(account) => {
          void handleQuickCreateSaved(account)
        }}
      />
    </>
  )
}
