import { useContext, useEffect, useMemo, useState } from 'react'
import type { ColumnCellTemplateData } from 'devextreme/ui/data_grid'

import { LanguageContext } from '@/lib/i18nLoader'
import { getDataLanguageSuffix } from '@/utils/language'

import {
  findDepartmentLookupItemById,
  formatDepartmentDisplay,
  getDepartmentLookupNameBySuffix,
  getLocalizedDepartmentNameFromRow,
} from './departmentLookupUtils'
import { trimLookupText, toLookupNumber } from './lookupHelpers'
import { LookupGridCellEditor } from './LookupGridCellDisplay'

type DepartmentLookupDisplayCellProps<TData, TKey extends string | number> = {
  cellInfo: ColumnCellTemplateData<TData, TKey>
  codeField?: string
  idField?: string
}

export default function DepartmentLookupDisplayCell<TData extends object, TKey extends string | number>({
  cellInfo,
  codeField = 'DEPARTMENT_CD',
  idField = 'DEPARTMENT_ID',
}: DepartmentLookupDisplayCellProps<TData, TKey>) {
  const { lang } = useContext(LanguageContext) as { lang: string }
  const dataLanguageSuffix = useMemo(() => getDataLanguageSuffix(lang), [lang])
  const rowData = cellInfo.data as Record<string, unknown> | undefined
  const departmentCode = useMemo(() => trimLookupText(rowData?.[codeField]), [codeField, rowData])
  const departmentId = useMemo(() => toLookupNumber(rowData?.[idField]), [idField, rowData])
  const nameFromRow = useMemo(() => getLocalizedDepartmentNameFromRow(rowData), [rowData])
  const [resolvedCode, setResolvedCode] = useState(departmentCode)
  const [resolvedName, setResolvedName] = useState(nameFromRow)

  useEffect(() => {
    if (nameFromRow) {
      setResolvedCode(departmentCode)
      setResolvedName(nameFromRow)
      return
    }

    if (!departmentId) {
      setResolvedCode(departmentCode)
      setResolvedName('')
      return
    }

    let cancelled = false

    void findDepartmentLookupItemById(departmentId).then((item) => {
      if (cancelled) {
        return
      }

      setResolvedCode(trimLookupText(item?.DEPARTMENT_CD) || departmentCode)
      setResolvedName(item ? getDepartmentLookupNameBySuffix(item, dataLanguageSuffix) : '')
    })

    return () => {
      cancelled = true
    }
  }, [dataLanguageSuffix, departmentCode, departmentId, nameFromRow])

  const displayText = formatDepartmentDisplay(resolvedCode, resolvedName)

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
