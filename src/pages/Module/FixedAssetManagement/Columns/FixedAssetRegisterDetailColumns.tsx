import { useContext, useMemo } from 'react'
import { Column, Lookup } from 'devextreme-react/data-grid'

import { pickLocalizedText } from '@/lib/companyLang'
import { LanguageContext } from '@/lib/i18nLoader'
import type { FixedAssetAllocationRow } from '@/types/fixedAsset'

import { FA_INTEGER_NUMBER_FORMAT, formatFaGridInteger } from './faColumnLayout'

export function useFixedAssetRegisterDetailColumns() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  const allocationTypes = useMemo(
    () => [
      { value: 'PERCENT', text: t('FA_ALLOC_TYPE_PERCENT', 'Theo %') },
      { value: 'AMOUNT', text: t('FA_ALLOC_TYPE_AMOUNT', 'Theo tiền') },
    ],
    [translate],
  )

  return useMemo(
    () => (
      <>
        <Column
          dataField="ALLOC_SEQ"
          caption={t('ALLOC_SEQ', 'STT')}
          dataType="number"
          width={70}
          alignment="center"
          allowEditing={false}
        />
        <Column dataField="ALLOC_TYPE" caption={t('ALLOC_TYPE', 'Kiểu phân bổ')} width={130}>
          <Lookup dataSource={allocationTypes} valueExpr="value" displayExpr="text" />
        </Column>
        <Column
          dataField="ALLOC_RATE"
          caption={t('ALLOC_RATE', 'Tỷ lệ %')}
          dataType="number"
          format={FA_INTEGER_NUMBER_FORMAT}
          width={110}
          customizeText={(cell) => formatFaGridInteger(cell.value)}
        />
        <Column
          dataField="FIRST_ALLOC_AMT"
          caption={t('FIRST_ALLOC_AMT', 'Tiền đầu')}
          dataType="number"
          format={FA_INTEGER_NUMBER_FORMAT}
          width={130}
          customizeText={(cell) => formatFaGridInteger(cell.value)}
        />
        <Column
          dataField="NORMAL_ALLOC_AMT"
          caption={t('NORMAL_ALLOC_AMT', 'Tiền giữa')}
          dataType="number"
          format={FA_INTEGER_NUMBER_FORMAT}
          width={130}
          customizeText={(cell) => formatFaGridInteger(cell.value)}
        />
        <Column
          dataField="LAST_ALLOC_AMT"
          caption={t('LAST_ALLOC_AMT', 'Tiền cuối')}
          dataType="number"
          format={FA_INTEGER_NUMBER_FORMAT}
          width={130}
          customizeText={(cell) => formatFaGridInteger(cell.value)}
        />
        <Column dataField="DEBIT_ACCT_CD" caption={t('DEBIT', 'TK Nợ')} width={110} />
        <Column
          dataField="DEBIT_ACCT_NM_VIET"
          caption={t('ACC_NM_DEBIT', 'Tên TK Nợ')}
          minWidth={160}
          calculateCellValue={(row: FixedAssetAllocationRow) => pickLocalizedText(row, 'DEBIT_ACCT_NM')}
        />
        <Column dataField="CREDIT_ACCT_CD" caption={t('CREDIT', 'TK Có')} width={110} />
        <Column
          dataField="CREDIT_ACCT_NM_VIET"
          caption={t('ACC_NM_CREDIT', 'Tên TK Có')}
          minWidth={160}
          calculateCellValue={(row: FixedAssetAllocationRow) => pickLocalizedText(row, 'CREDIT_ACCT_NM')}
        />
        <Column dataField="DEPARTMENT_CD" caption={t('DEPARTMENT_CD', 'Bộ phận')} width={140} />
        <Column
          dataField="DEP_NAME_VIET"
          caption={t('DEPARTMENT_NM', 'Tên bộ phận')}
          minWidth={180}
          calculateCellValue={(row: FixedAssetAllocationRow) => pickLocalizedText(row, 'DEP_NAME')}
        />
        <Column dataField="NOTE" caption={t('NOTE', 'Ghi chú')} minWidth={160} />
      </>
    ),
    [allocationTypes, t],
  )
}
