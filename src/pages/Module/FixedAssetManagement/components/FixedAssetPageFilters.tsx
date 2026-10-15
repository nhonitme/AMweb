import Button from 'devextreme-react/button'
import SelectBox from 'devextreme-react/select-box'
import { useCallback, useContext, useMemo } from 'react'

import type { SysCode } from '@/api/sysCodeService'
import { EtcType } from '@/api/systemApi'
import { getAcclistLookupStore } from '@/components/lookup/AcclistLookupStore'
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

const TOOLBAR_FIELD = 'page-toolbar__field'

type FixedAssetPageFiltersProps = {
  statusCodes: SysCode[]
  statusFilterDraft: string
  accFilterDraft: string
  onStatusFilterChange: (value: string) => void
  onAccFilterChange: (value: string) => void
  onSearchSubmit: () => void
  translate: (key: string, fallback: string) => string
}

export default function FixedAssetPageFilters({
  statusCodes,
  statusFilterDraft,
  accFilterDraft,
  onStatusFilterChange,
  onAccFilterChange,
  onSearchSubmit,
  translate,
}: FixedAssetPageFiltersProps) {
  const t = useCallback(
    (key: string, fallback: string) => translate(key, fallback),
    [translate],
  )
  const { lang } = useContext(LanguageContext) as { lang: string }
  const dataLanguageSuffix = useMemo(() => getDataLanguageSuffix(lang), [lang])
  const accountDisplayExpr = useCallback(
    (item: AccountLookupItem | null) =>
      formatAccountDisplay(
        getAccountLookupCode(item),
        getAccountLookupNameBySuffix(item, dataLanguageSuffix),
      ),
    [dataLanguageSuffix],
  )

  return (
    <>
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
    </>
  )
}
