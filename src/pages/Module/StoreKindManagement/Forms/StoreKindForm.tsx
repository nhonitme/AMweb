import { checkCodeExists } from "@/api/lookupApi";
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation";
import { useContext } from "react";
import { LanguageContext } from "@/lib/i18nLoader";
import { Form } from 'devextreme-react/data-grid';
import { Item} from 'devextreme-react/form';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';
import { isDefaultLangField, isLangFieldVisible, useCompanyLangRevision } from '@/lib/companyLang';

type StoreFormProps = {
  isUpdate: boolean;
};

export function StoreKindForm({isUpdate }: StoreFormProps) {
  const { translate } = useContext(LanguageContext) as { translate: (key: string, fallback?: string) => string };
  const companyLangRevision = useCompanyLangRevision();
  const validation = useMasterFormValidation(translate);
  return (
    <Form key={companyLangRevision} colCount={2} onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
      
      <Item dataField="STORE_KIND_CD" validationRules={validation.code("STORE_KIND_CD", "STORE_KIND_ID", (id, value) => checkCodeExists("store-kind", value, id))} colSpan={2}
        editorOptions={createOutlinedEditorOptions({
          validationMessageMode: "always",
        })}
      >
      </Item>
      <Item dataField="STORE_KIND_NM_VIET" colSpan={2}
          visible={isLangFieldVisible('STORE_KIND_NM_VIET') || isDefaultLangField('STORE_KIND_NM_VIET')}
          validationRules={isDefaultLangField('STORE_KIND_NM_VIET') ? validation.required('STORE_KIND_NM_VIET') : []}
          editorOptions={createOutlinedEditorOptions({
          validationMessageMode: "always",
        })}
      >

      </Item>
      <Item dataField="STORE_KIND_NM_ENG" colSpan={2} visible={isLangFieldVisible('STORE_KIND_NM_ENG') || isDefaultLangField('STORE_KIND_NM_ENG')} validationRules={isDefaultLangField('STORE_KIND_NM_ENG') ? validation.required('STORE_KIND_NM_ENG') : []} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="STORE_KIND_NM_KOR" colSpan={2} visible={isLangFieldVisible('STORE_KIND_NM_KOR') || isDefaultLangField('STORE_KIND_NM_KOR')} validationRules={isDefaultLangField('STORE_KIND_NM_KOR') ? validation.required('STORE_KIND_NM_KOR') : []} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="STORE_KIND_NM_CHINA" colSpan={2} visible={isLangFieldVisible('STORE_KIND_NM_CHINA') || isDefaultLangField('STORE_KIND_NM_CHINA')} validationRules={isDefaultLangField('STORE_KIND_NM_CHINA') ? validation.required('STORE_KIND_NM_CHINA') : []} editorOptions={createOutlinedEditorOptions()} />
    </Form>
  );
}
