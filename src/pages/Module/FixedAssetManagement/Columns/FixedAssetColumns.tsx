import React, { useCallback, useContext, useMemo } from 'react'
import { Column, RequiredRule } from 'devextreme-react/data-grid'

import type { SysCode } from '@/api/sysCodeService'
import { normalizeYmd } from '@/pages/Accounting/accountingDateUtils'
import { LanguageContext } from '@/lib/i18nLoader'
import { useSysGridColumnSettings } from '@/lib/sysGridColumnSettingContext'
import { getSysCodeCd } from '@/lib/sysCodeUtils'
import { normalizeGridSettingKey } from '@/lib/gridSettingCache'
import { SYSTEM_GRID_TEMPLATE_ID } from '@/types/sysGridColumnSetting'

import { getFaStatusDisplayText, normalizeFixedAssetStatus } from '../fixedAssetStatus'
import {
  resolveFaColumnsFromSysGrid,
  type FaColumnBehavior,
  type FaResolvedColumn,
} from './faColumnLayout'
import { FIXED_ASSET_MASTER_GRID_ID } from './fixedAssetGridIds'

type FixedAssetColumnsProps = {
  statusCodes: SysCode[]
  gridId?: string
}

/** Runtime-only overrides — catalog/order/visible come from sys_grid_column. */
const MASTER_COLUMN_BEHAVIORS: Readonly<Record<string, FaColumnBehavior>> = {
  STATUS: { locked: true, captionKey: 'STATUS', captionFallback: 'Trạng thái' },
  STATUS_TEXT: {
    allowEditing: false,
    captionKey: 'STATUS',
    captionFallback: 'Trạng thái',
    minWidth: 110,
  },
  ASSET_CD: { minWidth: 130 },
  ASSET_NM: { minWidth: 220 },
  RECEIVE_YMD: { dataType: 'date', format: 'dd/MM/yyyy' },
  USE_START_YMD: { dataType: 'date', format: 'dd/MM/yyyy' },
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

export const FixedAssetColumns: React.FC<FixedAssetColumnsProps> = ({
  statusCodes,
  gridId = FIXED_ASSET_MASTER_GRID_ID,
}) => {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const { getGridColumnSettings, settingsRevision } = useSysGridColumnSettings()

  const statusTextByCode = useMemo(() => {
    const map = new Map<string, string>()
    const translateCode = (key: string, fallback?: string) => t(key, fallback ?? '')
    for (const code of statusCodes) {
      const codeCd = getSysCodeCd(code).toUpperCase()
      if (!codeCd) continue
      map.set(codeCd, getFaStatusDisplayText(codeCd, translateCode, statusCodes))
    }
    return map
  }, [statusCodes, translate])

  const calculateStatusText = useCallback(
    (row: { STATUS?: string | null }) => {
      const status = normalizeFixedAssetStatus(row?.STATUS)
      return statusTextByCode.get(status) ?? getFaStatusDisplayText(status, (key, fallback) => t(key, fallback ?? ''))
    },
    [statusTextByCode, translate],
  )

  const resolvedColumns = useMemo(() => {
    const merged = getGridColumnSettings(gridId, SYSTEM_GRID_TEMPLATE_ID)
    return resolveFaColumnsFromSysGrid(merged, t, MASTER_COLUMN_BEHAVIORS)
  }, [getGridColumnSettings, gridId, settingsRevision, translate])

  return (
    <>
      {resolvedColumns.map((column) => {
        const base = buildBaseColumnProps(column)

        if (column.fieldName === 'ASSET_CD') {
          return (
            <Column key={column.fieldName} {...base}>
              <RequiredRule message={t('MSG_MUST_ITEM', 'Vui lòng nhập mã tài sản.')} />
            </Column>
          )
        }

        if (column.fieldName === 'ASSET_NM') {
          return (
            <Column key={column.fieldName} {...base}>
              <RequiredRule message={t('MSG_MUST_ITEM', 'Vui lòng nhập tên tài sản.')} />
            </Column>
          )
        }

        if (column.fieldName === 'RECEIVE_YMD' || column.fieldName === 'USE_START_YMD') {
          return (
            <Column
              key={column.fieldName}
              {...base}
              calculateCellValue={(row) => normalizeYmd(row[column.fieldName])}
            />
          )
        }

        if (normalizeGridSettingKey(column.fieldName) === 'STATUS_TEXT') {
          return (
            <Column
              key={column.fieldName}
              {...base}
              calculateCellValue={calculateStatusText}
            />
          )
        }

        return <Column key={column.fieldName} {...base} />
      })}
    </>
  )
}
