import { useCallback, useContext, useMemo, useRef } from 'react'
import { Column, Lookup, RequiredRule } from 'devextreme-react/data-grid'
import { requiredMasterMessage } from '@/components/forms/masterValidationMessages'
import type { ColumnCellTemplateData, ColumnEditCellTemplateData } from 'devextreme/ui/data_grid'

import { EtcType } from '@/api/systemApi'
import { getAcclistLookupStore } from '@/components/lookup/AcclistLookupStore'
import AccountLookupCellEditor from '@/components/lookup/AccountLookupCellEditor'
import DepartmentLookupCellEditor from '@/components/lookup/DepartmentLookupCellEditor'
import DepartmentLookupDisplayCell from '@/components/lookup/DepartmentLookupDisplayCell'
import {
  LookupGridCellEditor,
  consumeLookupCellOpen,
  type LookupOpenMode,
} from '@/components/lookup/LookupGridCellDisplay'
import { LanguageContext } from '@/lib/i18nLoader'
import { useSysGridColumnSettings } from '@/lib/sysGridColumnSettingContext'
import type { FixedAssetAllocationRow } from '@/types/fixedAsset'
import { SYSTEM_GRID_TEMPLATE_ID } from '@/types/sysGridColumnSetting'
import { getCurrentDataLanguageSuffix } from '@/utils/language'

import {
  calcAllocAmountsFromRate,
  type DepreciationHeaderAmounts,
} from '../fixedAssetAllocationCalc'
import { resolveFaColumns, type FaResolvedColumn } from './faColumnLayout'
import { FIXED_ASSET_ALLOCATION_COLUMN_DEFS } from './fixedAssetAllocationColumnDefs'
import { FIXED_ASSET_ALLOCATION_GRID_ID } from './fixedAssetGridIds'

const EMPTY_DEPRECIATION_HEADER: DepreciationHeaderAmounts = {
  FIRST_DEPRE_AMT: 0,
  NORMAL_DEPRE_AMT: 0,
  LAST_DEPRE_AMT: 0,
}

type AllocationCellInfo = ColumnCellTemplateData<FixedAssetAllocationRow, string>
type AllocationEditCellInfo = ColumnEditCellTemplateData<FixedAssetAllocationRow, string>
type AllocationAccountCodeField = 'DEBIT_ACCT_CD' | 'CREDIT_ACCT_CD'
type AllocationAccountNameField = 'DEBIT_ACCT_NM_VIET' | 'CREDIT_ACCT_NM_VIET'
type AllocationAccountIdField = 'DEBIT_ACCT_ID' | 'CREDIT_ACCT_ID'
type AllocationAccountNamePrefix = 'DEBIT_ACCT_NM' | 'CREDIT_ACCT_NM'

type FixedAssetAllocationColumnsProps = {
  gridId?: string
  depreciationHeader?: DepreciationHeaderAmounts
  onRateApplied?: () => void
}

const toAllocationRate = (value: unknown): number | null => {
  if (value == null || value === '') {
    return null
  }

  const rate = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(rate) ? rate : null
}

function consumeLookupAutoOpen(cellInfo: AllocationEditCellInfo, dataField: string) {
  return consumeLookupCellOpen(cellInfo, dataField)
}

function renderLookupCell(dataField: string) {
  return (cellInfo: AllocationCellInfo) => (
    <LookupGridCellEditor mode="display" cellInfo={cellInfo} dataField={dataField} />
  )
}

function renderLookupEditor(children: JSX.Element) {
  return <LookupGridCellEditor mode="edit">{children}</LookupGridCellEditor>
}

function buildBaseColumnProps(column: FaResolvedColumn) {
  return {
    dataField: column.fieldName,
    caption: column.caption,
    visible: column.visible,
    visibleIndex: column.visibleIndex,
    width: column.width,
    minWidth: column.minWidth,
    allowHiding: column.allowHiding,
    showInColumnChooser: column.showInColumnChooser,
    allowEditing: column.allowEditing,
    dataType: column.dataType,
    format: column.format,
    alignment: column.alignment,
    fixed: column.fixed || undefined,
    fixedPosition: column.fixedPosition,
    sortOrder: column.sortOrder === 'asc' || column.sortOrder === 'desc' ? column.sortOrder : undefined,
    sortIndex: column.sortIndex ?? undefined,
  }
}

export function FixedAssetAllocationColumns({
  gridId = FIXED_ASSET_ALLOCATION_GRID_ID,
  depreciationHeader,
  onRateApplied,
}: FixedAssetAllocationColumnsProps = {}) {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const { getGridColumnSettings, settingsRevision } = useSysGridColumnSettings()
  const allocationTypes = useMemo(
    () => [
      {
        value: 'PERCENT',
        text: translate ? translate('FA_ALLOC_TYPE_PERCENT', 'Theo %') : 'Theo %',
      },
      {
        value: 'AMOUNT',
        text: translate ? translate('FA_ALLOC_TYPE_AMOUNT', 'Theo tiền') : 'Theo tiền',
      },
    ],
    [translate],
  )

  const departmentField = 'DEPARTMENT_CD'
  const depreciationHeaderRef = useRef(depreciationHeader ?? EMPTY_DEPRECIATION_HEADER)
  depreciationHeaderRef.current = depreciationHeader ?? EMPTY_DEPRECIATION_HEADER
  const onRateAppliedRef = useRef(onRateApplied)
  onRateAppliedRef.current = onRateApplied

  const setAllocRateCellValue = useCallback(
    (
      newData: Partial<FixedAssetAllocationRow>,
      value: unknown,
      currentRowData: FixedAssetAllocationRow,
    ) => {
      const rate = toAllocationRate(value)
      newData.ALLOC_RATE = rate

      const allocType = String(currentRowData?.ALLOC_TYPE ?? 'PERCENT').trim().toUpperCase()
      if (allocType !== 'PERCENT' || rate == null) {
        return
      }

      const amounts = calcAllocAmountsFromRate(depreciationHeaderRef.current, rate)
      newData.FIRST_ALLOC_AMT = amounts.FIRST_ALLOC_AMT
      newData.NORMAL_ALLOC_AMT = amounts.NORMAL_ALLOC_AMT
      newData.LAST_ALLOC_AMT = amounts.LAST_ALLOC_AMT
      onRateAppliedRef.current?.()
    },
    [],
  )

  const resolvedColumns = useMemo(() => {
    const merged = getGridColumnSettings(gridId, SYSTEM_GRID_TEMPLATE_ID)
    return resolveFaColumns(FIXED_ASSET_ALLOCATION_COLUMN_DEFS, merged, t)
  }, [getGridColumnSettings, gridId, settingsRevision, translate])

  const departmentEditor = (cellInfo: AllocationEditCellInfo, autoOpen?: LookupOpenMode | null) => {
    const rowIndex = cellInfo.row?.rowIndex ?? -1

    return (
      <DepartmentLookupCellEditor
        value={cellInfo.data?.DEPARTMENT_ID ?? null}
        rowIndex={rowIndex}
        grid={cellInfo.component}
        setValue={(value) => {
          if (rowIndex < 0) {
            return
          }

          cellInfo.component.cellValue(rowIndex, 'DEPARTMENT_ID', value)
        }}
        valueMode="id"
        departmentIdField="DEPARTMENT_ID"
        departmentCdField={departmentField}
        multilingualNameFields
        placeholder={t('DEPARTMENT_SELECT', 'Chọn bộ phận')}
        popupTitle={t('DEPARTMENT_SELECT', 'Chọn bộ phận')}
        buttonHint={t('DEPARTMENT_LOOKUP', 'Mở danh sách bộ phận')}
        autoOpen={autoOpen}
      />
    )
  }

  const createAccEditor =
    ({
      valueField,
      nameField,
      idField,
      namePrefix,
      etcType,
      placeholder,
      popupTitle,
      editMode,
    }: {
      valueField: AllocationAccountCodeField
      nameField: AllocationAccountNameField
      idField: AllocationAccountIdField
      namePrefix: AllocationAccountNamePrefix
      etcType: EtcType
      placeholder?: string
      popupTitle?: string
      editMode?: 'code' | 'name'
    }) =>
    (cellInfo: AllocationEditCellInfo, autoOpen?: LookupOpenMode | null) => (
      <AccountLookupCellEditor
        dataSource={getAcclistLookupStore({ etcType })}
        value={cellInfo.data?.[valueField] ?? null}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(value) => {
          cellInfo.component.cellValue(
            cellInfo.row.rowIndex,
            editMode === 'name' ? nameField : valueField,
            value,
          )
        }}
        ValueField={valueField}
        NameField={nameField}
        IdField={idField}
        LookupCodeField="CD"
        LookupNameField={`NM_${getCurrentDataLanguageSuffix()}`}
        multilingualNameFieldPrefix={namePrefix}
        placeholder={placeholder ?? t('ACC_SELECT', 'Chọn tài khoản')}
        popupTitle={popupTitle ?? t('ACC_SELECT', 'Chọn tài khoản')}
        buttonHint={t('lblACC', 'Mở danh sách tài khoản')}
        autoOpen={autoOpen}
        editMode={editMode}
      />
    )

  const debitEditor = createAccEditor({
    valueField: 'DEBIT_ACCT_CD',
    nameField: 'DEBIT_ACCT_NM_VIET',
    idField: 'DEBIT_ACCT_ID',
    namePrefix: 'DEBIT_ACCT_NM',
    etcType: EtcType.cbxFixedAssetDebitAccount,
  })
  const debitNameEditor = createAccEditor({
    valueField: 'DEBIT_ACCT_CD',
    nameField: 'DEBIT_ACCT_NM_VIET',
    idField: 'DEBIT_ACCT_ID',
    namePrefix: 'DEBIT_ACCT_NM',
    etcType: EtcType.cbxFixedAssetDebitAccount,
    editMode: 'name',
  })
  const creditEditor = createAccEditor({
    valueField: 'CREDIT_ACCT_CD',
    nameField: 'CREDIT_ACCT_NM_VIET',
    idField: 'CREDIT_ACCT_ID',
    namePrefix: 'CREDIT_ACCT_NM',
    etcType: EtcType.cbxFixedAssetCreditAccount,
  })
  const creditNameEditor = createAccEditor({
    valueField: 'CREDIT_ACCT_CD',
    nameField: 'CREDIT_ACCT_NM_VIET',
    idField: 'CREDIT_ACCT_ID',
    namePrefix: 'CREDIT_ACCT_NM',
    etcType: EtcType.cbxFixedAssetCreditAccount,
    editMode: 'name',
  })

  return (
    <>
      {resolvedColumns.map((column) => {
        const base = buildBaseColumnProps(column)

        if (column.fieldName === 'ALLOC_SEQ') {
          return (
            <Column
              key={column.fieldName}
              {...base}
              cellRender={(cellInfo: AllocationCellInfo) => {
                const seq =
                  typeof cellInfo.row?.dataIndex === 'number'
                    ? cellInfo.row.dataIndex + 1
                    : (cellInfo.data?.ALLOC_SEQ ?? '')
                return <span>{seq}</span>
              }}
            />
          )
        }

        if (column.fieldName === 'ALLOC_RATE') {
          return (
            <Column
              key={column.fieldName}
              {...base}
              setCellValue={setAllocRateCellValue}
            />
          )
        }

        if (column.fieldName === 'ALLOC_TYPE') {
          return (
            <Column
              key={column.fieldName}
              {...base}
              editorOptions={{
                dataSource: allocationTypes,
                valueExpr: 'value',
                displayExpr: 'text',
              }}
            >
              <Lookup dataSource={allocationTypes} valueExpr="value" displayExpr="text" />
              <RequiredRule message={requiredMasterMessage(t, column.caption)} />
            </Column>
          )
        }

        if (column.fieldName === 'DEBIT_ACCT_CD') {
          return (
            <Column
              key={column.fieldName}
              {...base}
              cssClass="am-grid-lookup-column-cell"
              cellRender={renderLookupCell('DEBIT_ACCT_CD')}
              editCellRender={(cellInfo: AllocationEditCellInfo) =>
                renderLookupEditor(debitEditor(cellInfo, consumeLookupAutoOpen(cellInfo, 'DEBIT_ACCT_CD')))
              }
            >
              <RequiredRule message={requiredMasterMessage(t, column.caption)} />
            </Column>
          )
        }

        if (column.fieldName === 'DEBIT_ACCT_NM_VIET') {
          return (
            <Column
              key={column.fieldName}
              {...base}
              cssClass="am-grid-lookup-column-cell"
              cellRender={renderLookupCell('DEBIT_ACCT_NM_VIET')}
              editCellRender={(cellInfo: AllocationEditCellInfo) =>
                renderLookupEditor(
                  debitNameEditor(cellInfo, consumeLookupAutoOpen(cellInfo, 'DEBIT_ACCT_NM_VIET')),
                )
              }
            />
          )
        }

        if (column.fieldName === 'CREDIT_ACCT_CD') {
          return (
            <Column
              key={column.fieldName}
              {...base}
              cssClass="am-grid-lookup-column-cell"
              cellRender={renderLookupCell('CREDIT_ACCT_CD')}
              editCellRender={(cellInfo: AllocationEditCellInfo) =>
                renderLookupEditor(creditEditor(cellInfo, consumeLookupAutoOpen(cellInfo, 'CREDIT_ACCT_CD')))
              }
            >
              <RequiredRule message={requiredMasterMessage(t, column.caption)} />
            </Column>
          )
        }

        if (column.fieldName === 'CREDIT_ACCT_NM_VIET') {
          return (
            <Column
              key={column.fieldName}
              {...base}
              cssClass="am-grid-lookup-column-cell"
              cellRender={renderLookupCell('CREDIT_ACCT_NM_VIET')}
              editCellRender={(cellInfo: AllocationEditCellInfo) =>
                renderLookupEditor(
                  creditNameEditor(cellInfo, consumeLookupAutoOpen(cellInfo, 'CREDIT_ACCT_NM_VIET')),
                )
              }
            />
          )
        }

        if (column.fieldName === 'DEPARTMENT_CD') {
          return (
            <Column
              key={column.fieldName}
              {...base}
              cssClass="am-grid-lookup-column-cell"
              cellRender={(cellInfo: AllocationCellInfo) => (
                <DepartmentLookupDisplayCell
                  cellInfo={cellInfo}
                  codeField={departmentField}
                  idField="DEPARTMENT_ID"
                />
              )}
              editCellRender={(cellInfo: AllocationEditCellInfo) =>
                renderLookupEditor(departmentEditor(cellInfo, consumeLookupAutoOpen(cellInfo, departmentField)))
              }
              editorOptions={{ showUndoButton: false }}
            />
          )
        }

        return <Column key={column.fieldName} {...base} />
      })}
    </>
  )
}
