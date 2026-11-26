import { masterFormGroupCaptions } from "@/components/forms/masterFormSectionIcons";
import { getMasterNameFields } from "@/components/forms/masterNameFields";
import { checkCodeExists } from "@/api/lookupApi";
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation";
import {useContext, useMemo } from 'react';
import { Form } from 'devextreme-react/data-grid';
import { GroupItem, Item } from 'devextreme-react/form';
import "devextreme/ui/lookup";
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';
import MasterLookupFormField from '@/components/lookup/MasterLookupFormField';
import { warehouseTypeLookupStore } from '@/components/lookup/warehouseTypeLookupStore';
import { renderSharedWarehouseTypeLookupPage } from '@/components/lookup/sharedMasterLookupPages';
import { filterActiveLangFields, pickLocalizedText, useCompanyLangRevision } from '@/lib/companyLang';
import { LanguageContext } from '@/lib/i18nLoader';
import type { StoreKindInfo } from '@/types/storeKind';

export function StoreForm() {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string };
  const companyLangRevision = useCompanyLangRevision();
  const lblKind = translate ? translate('STORE_KIND_CD', 'Store Kind') : 'Store Kind';
  const lblChoose = translate ? translate('lblChoose', 'Choose') : 'Choose';

  const validation = useMasterFormValidation(translate);
  return useMemo(() => (
    <Form key={companyLangRevision} colCount={1} labelLocation="top" width="100%" onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
      <GroupItem caption={translate("BASE_INFO", "Thông tin chung")} captionRender={masterFormGroupCaptions.info} colCount={2} colCountByScreen={{ xs: 1 }}>
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
          dataField="STORE_CD" validationRules={validation.code("STORE_CD", "STORE_ID", (id, value) => checkCodeExists("store", value, id))}
          editorOptions={createOutlinedEditorOptions({ validationMessageMode: 'always' })}
        />
        {getMasterNameFields("STORE_NM").map((field, index, fields) => (
          <Item
            key={field}
            dataField={field}
            colSpan={index === fields.length - 1 && fields.length % 2 === 1 ? 2 : 1}
            validationRules={field === "STORE_NM_VIET" ? validation.required(field) : []}
            editorOptions={createOutlinedEditorOptions(field === "STORE_NM_VIET" ? { validationMessageMode: "always" } : {})}
          />
        ))}
      </GroupItem>
    </Form>
  ), [translate, companyLangRevision, validation, lblKind, lblChoose]);
}
