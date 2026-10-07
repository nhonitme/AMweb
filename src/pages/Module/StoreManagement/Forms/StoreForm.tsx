import { useContext } from 'react';
import { Form } from 'devextreme-react/data-grid';
import { Item } from 'devextreme-react/form';
import "devextreme/ui/lookup";
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';
import MasterLookupFormField from '@/components/lookup/MasterLookupFormField';
import { warehouseTypeLookupStore } from '@/components/lookup/warehouseTypeLookupStore';
import { renderSharedWarehouseTypeLookupPage } from '@/components/lookup/sharedMasterLookupPages';
import { filterActiveLangFields, isDefaultLangField, isLangFieldVisible, pickLocalizedText, useCompanyLangRevision } from '@/lib/companyLang';
import { LanguageContext } from '@/lib/i18nLoader';
import type { StoreKindInfo } from '@/types/storeKind';

export function StoreForm() {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string };
  const companyLangRevision = useCompanyLangRevision();
  const lblKind = translate ? translate('STORE_KIND_CD', 'Store Kind') : 'Store Kind';
  const lblChoose = translate ? translate('lblChoose', 'Choose') : 'Choose';

  return (
    <Form key={companyLangRevision} colCount={2}>
      <Item
        dataField="STORE_KIND_ID"
        label={{ text: lblKind }}
        render={({ component }) => (
          <MasterLookupFormField<StoreKindInfo>
            form={component}
            dataField="STORE_KIND_ID"
            dataSource={warehouseTypeLookupStore}
            valueExpr="STORE_KIND_ID"
            getValue={(item) => item.STORE_KIND_ID}
            displayExpr={(option) => {
              if (!option) {
                return '';
              }
              const code = option.STORE_KIND_CD?.trim() ?? '';
              const name = pickLocalizedText(option, 'STORE_KIND_NM');
              return code && name ? `${code} - ${name}` : code || name;
            }}
            placeholder={lblChoose}
            popupTitle={translate('STORE_KIND_LIST', 'Warehouse types')}
            buttonHint={translate('SEARCH', 'Open warehouse type list')}
            filterFocusField="STORE_KIND_CD"
            searchExpr={filterActiveLangFields(['STORE_KIND_CD', 'STORE_KIND_NM_VIET', 'STORE_KIND_NM_ENG', 'STORE_KIND_NM_KOR', 'STORE_KIND_NM_CHINA'])}
            renderPopupContent={({ closePopup, onPick }) =>
              renderSharedWarehouseTypeLookupPage({ closePopup, onPick })
            }
          />
        )}
      />

      <Item
        dataField="STORE_CD"
        editorOptions={createOutlinedEditorOptions({ validationMessageMode: 'always' })}
      />

      <Item dataField="STORE_NM_VIET" colSpan={2}
        visible={isLangFieldVisible('STORE_NM_VIET')}
        isRequired={isDefaultLangField('STORE_NM_VIET')}
        editorOptions={createOutlinedEditorOptions({ validationMessageMode: "always" })}
      >
      </Item>

      <Item dataField="STORE_NM_ENG" colSpan={2} visible={isLangFieldVisible('STORE_NM_ENG')} isRequired={isDefaultLangField('STORE_NM_ENG')} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="STORE_NM_KOR" colSpan={2} visible={isLangFieldVisible('STORE_NM_KOR')} isRequired={isDefaultLangField('STORE_NM_KOR')} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="STORE_NM_CHINA" colSpan={2} visible={isLangFieldVisible('STORE_NM_CHINA')} isRequired={isDefaultLangField('STORE_NM_CHINA')} editorOptions={createOutlinedEditorOptions()} />
    </Form>
  );
}
