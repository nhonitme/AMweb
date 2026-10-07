import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import TextBox from 'devextreme-react/text-box'
import { useCallback, useContext, useMemo, useState } from 'react'
import type dxDataGrid from 'devextreme/ui/data_grid'

import type { SysCode } from '@/api/sysCodeService'
import { syncGridSearchState } from '@/components/datagrid/gridSearch'
import { getAcclistLookupStore } from '@/components/lookup/AcclistLookupStore'
import { EtcType } from '@/api/systemApi'
import {
  ACCOUNT_LOOKUP_SEARCH_FIELDS,
  formatAccountDisplay,
  getAccountLookupCode,
  getAccountLookupNameBySuffix,
  type AccountLookupItem,
} from '@/components/lookup/accountLookupUtils'
import { LanguageContext } from '@/lib/i18nLoader'
import { getDataLanguageSuffix } from '@/utils/language'

import FixedAssetStatusFilter from './FixedAssetStatusFilter'

import '@/components/toolbar/PageToolbar.scss'

const TOOLBAR_FIELD = 'page-toolbar__field'

type GridToolbarHelperInstance = dxDataGrid & {
  __openColumnSettings?: () => boolean
}

type FixedAssetPageToolbarProps = {
  gridRef: React.RefObject<GridToolbarHelperInstance | null>
  statusCodes: SysCode[]
  statusFilterDraft: string
  accFilterDraft: string
  onStatusFilterChange: (value: string) => void
  onAccFilterChange: (value: string) => void
  onSearchSubmit: () => void
  onAdd: () => void
  onRefresh: () => void
  onDelete: () => void
  onImport?: () => void
  onExportXlsx?: () => void
  onExportPdf?: () => void
  translate: (key: string, fallback: string) => string
}

export default function FixedAssetPageToolbar({
  gridRef,
  statusCodes,
  statusFilterDraft,
  accFilterDraft,
  onStatusFilterChange,
  onAccFilterChange,
  onSearchSubmit,
  onAdd,
  onRefresh,
  onDelete,
  onImport,
  onExportXlsx,
  onExportPdf,
  translate,
}: FixedAssetPageToolbarProps) {
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const { lang } = useContext(LanguageContext) as { lang: string }
  const [quickSearchText, setQuickSearchText] = useState('')

  const dataLanguageSuffix = useMemo(() => getDataLanguageSuffix(lang), [lang])

  const accountDisplayExpr = useCallback(
    (item: AccountLookupItem | null) =>
      formatAccountDisplay(
        getAccountLookupCode(item),
        getAccountLookupNameBySuffix(item, dataLanguageSuffix),
      ),
    [dataLanguageSuffix],
  )

  const handleQuickSearchChange = useCallback((value: string) => {
    setQuickSearchText(value)
    syncGridSearchState(gridRef.current, value)
  }, [gridRef])

  const handleQuickSearchEnter = useCallback(() => {
    syncGridSearchState(gridRef.current, quickSearchText)
  }, [gridRef, quickSearchText])

  const handleColumnChooser = useCallback(() => {
    gridRef.current?.__openColumnSettings?.()
  }, [gridRef])

  return (
    <div className="page-toolbar fixed-asset-page-toolbar">
      <div className="page-toolbar__row">
        <div className="page-toolbar__filters">
          <SelectBox
            className={TOOLBAR_FIELD}
            dataSource={getAcclistLookupStore({ etcType: EtcType.cbxFixedAssetAccount })}
            value={accFilterDraft || null}
            valueExpr="CD"
            displayExpr={accountDisplayExpr}
            width={260}
            stylingMode="outlined"
            label={t('ACC_CD', 'Tài khoản')}
            labelMode="floating"
            searchEnabled
            searchExpr={[...ACCOUNT_LOOKUP_SEARCH_FIELDS]}
            showClearButton
            placeholder={t('ALL', 'Tất cả')}
            onValueChanged={(event) => onAccFilterChange(String(event.value ?? ''))}
          />

          <FixedAssetStatusFilter
            className={TOOLBAR_FIELD}
            value={statusFilterDraft}
            statusCodes={statusCodes}
            label={t('STATUS', 'Trạng thái')}
            placeholder={t('ALL', 'Tất cả')}
            translate={(key, fallback) => t(key, fallback ?? key)}
            variant="filter-bar"
            onValueChange={onStatusFilterChange}
          />

          <Button
            className="page-toolbar__search-btn"
            type="default"
            stylingMode="contained"
            icon="search"
            text={t('MSG_BTNSER', 'Tìm kiếm')}
            hint={t('MSG_BTNSER', 'Tìm kiếm')}
            onClick={onSearchSubmit}
          />
        </div>

        <div className="page-toolbar__actions">
          <TextBox
            className={`${TOOLBAR_FIELD} page-toolbar__field--search page-toolbar__quick-search`}
            width={200}
            mode="search"
            stylingMode="outlined"
            label={t('FA_QUICK_SEARCH', 'Tìm nhanh')}
            labelMode="floating"
            value={quickSearchText}
            showClearButton
            placeholder={t('Search...', 'Tìm...')}
            onValueChanged={(event) => handleQuickSearchChange(String(event.value ?? ''))}
            onEnterKey={handleQuickSearchEnter}
          />

          <Button
            className="page-toolbar__add-btn"
            type="default"
            stylingMode="contained"
            icon="plus"
            text={t('lblAddNew', 'Thêm mới')}
            hint={t('lblAddNew', 'Thêm mới')}
            onClick={onAdd}
          />
          <Button
            className="page-toolbar__action-btn"
            stylingMode="text"
            icon="refresh"
            hint={t('MSG_BTNREFRESH', 'Làm mới')}
            onClick={onRefresh}
          />
          <Button
            className="page-toolbar__action-btn"
            stylingMode="text"
            icon="columnchooser"
            hint={t('AUDIT_SETTING_SHOW_HIDE', 'Ẩn/hiện cột')}
            onClick={handleColumnChooser}
          />
          <Button
            className="page-toolbar__action-btn"
            stylingMode="text"
            type="danger"
            icon="trash"
            hint={t('MSG_BTNDELETE', 'Xóa')}
            onClick={onDelete}
          />
          {onImport ? (
            <Button
              className="page-toolbar__action-btn"
              stylingMode="text"
              icon="import"
              hint={t('MSG_BTNIMPORT', 'Import Excel')}
              onClick={onImport}
            />
          ) : null}
          {onExportPdf ? (
            <Button
              className="page-toolbar__action-btn"
              stylingMode="text"
              icon="exportpdf"
              hint={t('MSG_BTNPDF', 'Xuất PDF')}
              onClick={onExportPdf}
            />
          ) : null}
          {onExportXlsx ? (
            <Button
              className="page-toolbar__action-btn"
              stylingMode="text"
              icon="xlsxfile"
              hint={t('MSG_BTNEXCEL', 'Xuất Excel')}
              onClick={onExportXlsx}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
