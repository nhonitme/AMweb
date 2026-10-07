import { useContext, useEffect, useMemo, useState } from 'react'
import type { ColumnCellTemplateData } from 'devextreme/ui/data_grid'

import { LanguageContext } from '@/lib/i18nLoader'
import { getDataLanguageSuffix } from '@/utils/language'

import {
  findAccountLookupItemByCode,
  getAccountLookupNameBySuffix,
  getLocalizedAccountNameFromRow,
  recallAccountDisplayName,
  rememberAccountDisplayName,
  resolveAccountDisplayText,
} from './accountLookupUtils'
import { trimLookupText } from './lookupHelpers'
import { LookupGridCellEditor } from './LookupGridCellDisplay'

type AccountLookupDisplayCellProps<TData, TKey extends string | number> = {
  cellInfo: ColumnCellTemplateData<TData, TKey>
  codeField: string
  nameField?: string
  nameFieldPrefix?: string
}

export default function AccountLookupDisplayCell<TData extends object, TKey extends string | number>({
  cellInfo,
  codeField,
  nameField,
  nameFieldPrefix,
}: AccountLookupDisplayCellProps<TData, TKey>) {
  const { lang } = useContext(LanguageContext) as { lang: string }
  const dataLanguageSuffix = useMemo(() => getDataLanguageSuffix(lang), [lang])
  const rowData = cellInfo.data as Record<string, unknown> | undefined
  const accountCode = useMemo(() => trimLookupText(rowData?.[codeField]), [rowData, codeField])
  const nameFromRow = useMemo(
    () =>
      nameFieldPrefix
        ? getLocalizedAccountNameFromRow(rowData, nameFieldPrefix)
        : trimLookupText(rowData?.[nameField ?? '']),
    [nameField, nameFieldPrefix, rowData],
  )
  const [cacheRevision, setCacheRevision] = useState(0)

  const displayText = useMemo(
    () => resolveAccountDisplayText(accountCode, nameFromRow, dataLanguageSuffix),
    [accountCode, cacheRevision, dataLanguageSuffix, nameFromRow],
  )

  useEffect(() => {
    if (nameFromRow || !accountCode || recallAccountDisplayName(accountCode, dataLanguageSuffix)) {
      return
    }

    let cancelled = false

    void findAccountLookupItemByCode(accountCode).then((item) => {
      if (cancelled || !item) {
        return
      }

      const resolvedName = getAccountLookupNameBySuffix(item, dataLanguageSuffix)
      if (!resolvedName) {
        return
      }

      rememberAccountDisplayName(accountCode, resolvedName, dataLanguageSuffix)
      setCacheRevision((current) => current + 1)
    })

    return () => {
      cancelled = true
    }
  }, [accountCode, dataLanguageSuffix, nameFromRow])

  return (
    <LookupGridCellEditor
      mode="display"
      cellInfo={{
        ...cellInfo,
        text: displayText,
        displayValue: displayText,
        value: rowData?.[codeField],
      }}
      dataField={codeField}
    />
  )
}
