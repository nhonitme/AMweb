import { filterActiveLangFields } from '@/lib/companyLang'
import { Form } from 'devextreme-react/data-grid'
import { Item } from 'devextreme-react/form'
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions'
import { currencyLookupStore } from '@/components/lookup/currencyLookupStore'
import { formatSysCodeOptionText } from '@/lib/sysCodeUtils'
import { openingBalanceAccountLookupStore } from '@/components/lookup/openingBalanceAccountLookupStore'
import type { BeforeState } from '@/types/openingBalance'
import type { ValidationRule } from 'devextreme-react/common';

type OpeningBalanceAccountFormProps = {
  translate: (k: string, f?: string) => string
  isUpdate: boolean
  editingRowData?: Partial<BeforeState> | null
}

export function OpeningBalanceAccountForm(props: OpeningBalanceAccountFormProps) {

  const validationRules: {
    ACC_CD: ValidationRule[]
    FC_TYPE: ValidationRule[]
    DEBIT: ValidationRule[]
    CREDIT: ValidationRule[]
    DEBIT_FC: ValidationRule[]
    CREDIT_FC: ValidationRule[]
    EXCHANGE_RATE: ValidationRule[]
  } = {
    ACC_CD: [
      { type: 'required', message: props.translate('ACC_CD_REQUIRED', 'Account Code is required.') },
    ],
    FC_TYPE: [
      { type: 'required', message: props.translate('FC_TYPE_REQUIRED', 'Currency is required.') }
    ],

    DEBIT: [
      { type: 'numeric', message: props.translate('NUMBER_INVALID', 'Value must be numeric.') },     
    ],
    CREDIT: [
      { type: 'numeric', message: props.translate('NUMBER_INVALID', 'Value must be numeric.') },
    ],
    DEBIT_FC: [
      { type: 'numeric', message: props.translate('NUMBER_INVALID', 'Value must be numeric.') },
    ],
    CREDIT_FC: [
      { type: 'numeric', message: props.translate('NUMBER_INVALID', 'Value must be numeric.') },
    ],
    EXCHANGE_RATE: [
      { type: 'numeric', message: props.translate('NUMBER_INVALID', 'Value must be numeric.') },
    ],
  };

  return (
    <Form colCount={2}>
      <Item dataField="ID" visible={false} />
      <Item dataField="ROW_ID" visible={false} />
      <Item dataField="ACC_ID" visible={false} />
      <Item dataField="ACC_NM_VIET" visible={false} />
      <Item dataField="ACC_NM_ENG" visible={false} />
      <Item dataField="ACC_NM_KOR" visible={false} />
      <Item dataField="ACC_NM_CHINA" visible={false} />

      <Item
        colSpan={2}
        dataField="ACC_CD"
        editorType="dxSelectBox"
        editorOptions={createOutlinedEditorOptions({
          dataSource: openingBalanceAccountLookupStore,
          valueExpr: 'CD',
          displayExpr: (item: Record<string, unknown> | null) => {
            if (!item) return ''
            const code = String(item['ACC_CD'] ?? item['CD'] ?? '').trim()
            const name = String(
              item['ACCTITLE_NM_VIET'] ?? item['NM_VIET'] ?? item['ACCTITLE_NM_ENG'] ?? item['NM_ENG'] ?? '',
            ).trim()
            return code && name ? `${code} - ${name}` : code || name
          },
          searchEnabled: true,
          searchExpr: filterActiveLangFields(['ACC_CD', 'CD', 'ACCTITLE_NM_VIET', 'NM_VIET', 'NM_ENG', 'NM_KOR', 'NM_CHINA']),
          placeholder: props.translate('ACC_SELECT', 'Choose'),
          showClearButton: true,
          value: undefined,
          validationMessageMode: 'auto',
        })}
        validationRules={validationRules.ACC_CD}
      />

      <Item
        dataField="FC_TYPE"
        editorType="dxSelectBox"
        editorOptions={createOutlinedEditorOptions({
          dataSource: currencyLookupStore,
          valueExpr: 'CODE_CD',
          displayExpr: (item: Record<string, unknown> | null) =>
            formatSysCodeOptionText(item, props.translate),
          searchEnabled: true,
          searchExpr: ['CODE_CD', 'CODE_NAME'],
          placeholder: props.translate('CHOOSE_FC_TYPE', 'Choose'),
          showClearButton: true,
          value: undefined,
          validationMessageMode: "always"
        })}
        validationRules={validationRules.FC_TYPE}
      />

      <Item dataField="EXCHANGE_RATE" editorOptions={createOutlinedEditorOptions({ showClearButton: false })} validationRules={validationRules.EXCHANGE_RATE} />

      <Item dataField="DEBIT" editorOptions={createOutlinedEditorOptions({ showClearButton: false })} validationRules={validationRules.DEBIT} />
      <Item dataField="CREDIT" editorOptions={createOutlinedEditorOptions({ showClearButton: false })} validationRules={validationRules.CREDIT} />
      <Item dataField="DEBIT_FC" editorOptions={createOutlinedEditorOptions({ showClearButton: false })} validationRules={validationRules.DEBIT_FC} />
      <Item dataField="CREDIT_FC" editorOptions={createOutlinedEditorOptions({ showClearButton: false })} validationRules={validationRules.CREDIT_FC} />
      <Item dataField="NOTE" colSpan={2} editorOptions={createOutlinedEditorOptions()} />
    </Form>
  )
}
