import { checkCodeExists } from "@/api/lookupApi";
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation";
import { useContext } from 'react';
import { Form } from 'devextreme-react/data-grid';
import { Item  } from 'devextreme-react/form';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';
import MasterLookupFormField from '@/components/lookup/MasterLookupFormField';
import { patchMasterFormDraft, readMasterFormDraft } from '@/components/lookup/masterFormDraft';
import { productGroupLookupStore } from '@/components/lookup/productGroupLookupStore';
import { unitLookupStore } from '@/components/lookup/unitLookupStore';
import { warehouseLookupStore } from '@/components/lookup/warehouseLookupStore';
import { getAcclistLookupStore } from '@/components/lookup/AcclistLookupStore';
import {
  mapAcclistToEtcData,
  renderSharedAcclistLookupPage,
  renderSharedProductGroupLookupPage,
  renderSharedUnitLookupPage,
  renderSharedWarehouseLookupPage,
} from '@/components/lookup/sharedMasterLookupPages';
import { filterActiveLangFields, isDefaultLangField, isLangFieldVisible, pickLocalizedText, useCompanyLangRevision } from '@/lib/companyLang';
import { LanguageContext } from '@/lib/i18nLoader';
import type { ProductKind } from '@/types/productKind';
import type { Unit } from '@/types/unit';
import type { StoreInfo } from '@/types/store';
import type { etcData } from '@/types/etcData';

function readLookupText(option: object, key: string): string {
  const value = (option as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function displayProductKind(option: ProductKind | null): string {
  if (!option) return '';
  const code = readLookupText(option, 'PRODUCT_KIND_CD');
  const name = pickLocalizedText(option, 'PRODUCTKIND_NM');
  return code && name ? `${code} - ${name}` : code || name;
}

function displayUnit(option: Unit | null): string {
  if (!option) return '';
  const code = readLookupText(option, 'UNIT_CD');
  const name = readLookupText(option, 'UNIT_NM');
  return code && name ? `${code} - ${name}` : code || name;
}

function displayWarehouse(option: StoreInfo | null): string {
  if (!option) return '';
  const code = readLookupText(option, 'STORE_CD');
  const name = pickLocalizedText(option, 'STORE_NM');
  return code && name ? `${code} - ${name}` : code || name;
}

function displayAccount(option: etcData | null): string {
  if (!option) return '';
  const code = readLookupText(option, 'CD');
  const name = pickLocalizedText(option, 'NM') || pickLocalizedText(option, 'ACCTITLE_NM');
  return code && name ? `${code} - ${name}` : code || name;
}

export function ProductForm() {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string };
  const companyLangRevision = useCompanyLangRevision();

  const validation = useMasterFormValidation(translate);
  return (
    <Form key={companyLangRevision} colCount={2} onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged} customizeItem={validation.customizeItem}>
      <Item dataField="PRODUCT_CD" validationRules={validation.code("PRODUCT_CD", "PRODUCT_ID", (id, value) => checkCodeExists("product", value, id))} editorOptions={createOutlinedEditorOptions()} />
      <Item />
      <Item dataField="PRODUCT_NM_VIET" colSpan={2} visible={isLangFieldVisible('PRODUCT_NM_VIET') || isDefaultLangField('PRODUCT_NM_VIET')} validationRules={isDefaultLangField('PRODUCT_NM_VIET') ? validation.required('PRODUCT_NM_VIET') : []} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="PRODUCT_NM_ENG" colSpan={2} visible={isLangFieldVisible('PRODUCT_NM_ENG') || isDefaultLangField('PRODUCT_NM_ENG')} validationRules={isDefaultLangField('PRODUCT_NM_ENG') ? validation.required('PRODUCT_NM_ENG') : []} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="PRODUCT_NM_KOR" colSpan={2} visible={isLangFieldVisible('PRODUCT_NM_KOR') || isDefaultLangField('PRODUCT_NM_KOR')} validationRules={isDefaultLangField('PRODUCT_NM_KOR') ? validation.required('PRODUCT_NM_KOR') : []} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="PRODUCT_NM_CHINA" colSpan={2} visible={isLangFieldVisible('PRODUCT_NM_CHINA') || isDefaultLangField('PRODUCT_NM_CHINA')} validationRules={isDefaultLangField('PRODUCT_NM_CHINA') ? validation.required('PRODUCT_NM_CHINA') : []} editorOptions={createOutlinedEditorOptions()} />
      <Item
        dataField="PRODUCT_KIND_ID"
        label={{ text: translate('PRODUCTKIND_NM', 'Kind Name') }}
        isRequired={false}
        render={({ component }) => (
          <MasterLookupFormField<ProductKind>
            form={component}
            dataField="PRODUCT_KIND_ID"
            draftValue={readMasterFormDraft('PRODUCT_KIND_ID') as number | null}
            onDraftValueChange={(value) => patchMasterFormDraft({ PRODUCT_KIND_ID: value == null ? null : Number(value) })}
            dataSource={productGroupLookupStore}
            valueExpr="PRODUCT_KIND_ID"
            getValue={(item) => item.PRODUCT_KIND_ID}
            displayExpr={displayProductKind}
            placeholder={translate('SELECT', 'Select')}
            popupTitle={translate('PRODUCTKIND_NM', 'Product groups')}
            buttonHint={translate('SEARCH', 'Open product group list')}
            filterFocusField="PRODUCT_KIND_CD"
            searchExpr={filterActiveLangFields(['PRODUCT_KIND_CD', 'PRODUCTKIND_NM_VIET', 'PRODUCTKIND_NM_ENG', 'PRODUCTKIND_NM_KOR', 'PRODUCTKIND_NM_CHINA'])}
            renderPopupContent={({ closePopup, onPick }) =>
              renderSharedProductGroupLookupPage({ closePopup, onPick })
            }
          />
        )}
      />
      <Item
        dataField="UNIT_ID"
        cssClass="master-custom-validation"
        label={{ text: translate('UNIT_NM', 'Unit Name') }}
        validationRules={validation.required("UNIT_ID", "Đơn vị tính")}
        render={({ component }) => (
          <MasterLookupFormField<Unit>
            form={component}
            dataField="UNIT_ID"
            draftValue={readMasterFormDraft('UNIT_ID') as number | null}
            onDraftValueChange={(value) => patchMasterFormDraft({ UNIT_ID: value == null ? null : Number(value) })}
            dataSource={unitLookupStore}
            valueExpr="UNIT_ID"
            getValue={(item) => item.UNIT_ID}
            displayExpr={displayUnit}
            placeholder={translate('SELECT', 'Select')}
            popupTitle={translate('UNIT_NM', 'Units')}
            buttonHint={translate('SEARCH', 'Open unit list')}
            filterFocusField="UNIT_CD"
            searchExpr={['UNIT_CD', 'UNIT_NM']}
            renderPopupContent={({ closePopup, onPick }) =>
              renderSharedUnitLookupPage({ closePopup, onPick })
            }
          />
        )}
      />
      <Item
        dataField="STORE_ID"
        label={{ text: translate('STORE_NM_VIET', 'Store Name') }}
        isRequired={false}
        render={({ component }) => (
          <MasterLookupFormField<StoreInfo>
            form={component}
            dataField="STORE_ID"
            draftValue={readMasterFormDraft('STORE_ID') as number | null}
            onDraftValueChange={(value) => patchMasterFormDraft({ STORE_ID: value == null ? null : Number(value) })}
            dataSource={warehouseLookupStore}
            valueExpr="STORE_ID"
            getValue={(item) => item.STORE_ID}
            displayExpr={displayWarehouse}
            placeholder={translate('SELECT', 'Select')}
            popupTitle={translate('STORE_NM_VIET', 'Warehouses')}
            buttonHint={translate('SEARCH', 'Open warehouse list')}
            filterFocusField="STORE_CD"
            searchExpr={filterActiveLangFields(['STORE_CD', 'STORE_NM_VIET', 'STORE_NM_ENG', 'STORE_NM_KOR', 'STORE_NM_CHINA'])}
            renderPopupContent={({ closePopup, onPick }) =>
              renderSharedWarehouseLookupPage({ closePopup, onPick })
            }
          />
        )}
      />
      <Item
        dataField="DIVISION"
        label={{ text: translate('DIVISION_CD', 'Account Code') }}
        render={({ component }) => (
          <MasterLookupFormField<etcData>
            form={component}
            dataField="DIVISION"
            draftValue={readMasterFormDraft('DIVISION') as string | null}
            onDraftValueChange={(value) => patchMasterFormDraft({ DIVISION: value == null ? null : String(value) })}
            dataSource={getAcclistLookupStore()}
            valueExpr="CD"
            getValue={(item) => item.CD}
            displayExpr={displayAccount}
            placeholder={translate('ACC_SELECT', 'Select account')}
            popupTitle={translate('ACC_LIST', 'Accounts')}
            buttonHint={translate('SEARCH', 'Open account list')}
            filterFocusField="CD"
            searchExpr={filterActiveLangFields(['CD', 'NM_VIET', 'NM_ENG', 'NM_KOR', 'NM_CHINA'])}
            renderPopupContent={({ closePopup, onPick }) =>
              renderSharedAcclistLookupPage({
                closePopup,
                onPick: (row) => onPick(mapAcclistToEtcData(row)),
              })
            }
          />
        )}
      />
      <Item dataField="SUMMARY" editorOptions={createOutlinedEditorOptions()} />
    </Form>
  );
}
