import { checkCodeExists } from "@/api/lookupApi";
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation";
import { useContext } from "react";
import { LanguageContext } from "@/lib/i18nLoader";
import { Form } from 'devextreme-react/data-grid';
import { Item  } from 'devextreme-react/form';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';
import { isDefaultLangField, isLangFieldVisible, useCompanyLangRevision } from '@/lib/companyLang';

export function ProductKindForm() {
  const { translate } = useContext(LanguageContext) as { translate: (key: string, fallback?: string) => string };
  const companyLangRevision = useCompanyLangRevision();
  const validation = useMasterFormValidation(translate);
  return (
    <Form key={companyLangRevision} colCount={2} onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
      <Item dataField="PRODUCT_KIND_CD" validationRules={validation.code("PRODUCT_KIND_CD", "PRODUCT_KIND_ID", (id, value) => checkCodeExists("product-kind", value, id))} editorOptions={createOutlinedEditorOptions()}></Item>
      <Item dataField="REMARK" editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="PRODUCTKIND_NM_VIET" colSpan={2} visible={isLangFieldVisible('PRODUCTKIND_NM_VIET') || isDefaultLangField('PRODUCTKIND_NM_VIET')} validationRules={isDefaultLangField('PRODUCTKIND_NM_VIET') ? validation.required('PRODUCTKIND_NM_VIET') : []} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="PRODUCTKIND_NM_ENG" colSpan={2} visible={isLangFieldVisible('PRODUCTKIND_NM_ENG') || isDefaultLangField('PRODUCTKIND_NM_ENG')} validationRules={isDefaultLangField('PRODUCTKIND_NM_ENG') ? validation.required('PRODUCTKIND_NM_ENG') : []} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="PRODUCTKIND_NM_KOR" colSpan={2} visible={isLangFieldVisible('PRODUCTKIND_NM_KOR') || isDefaultLangField('PRODUCTKIND_NM_KOR')} validationRules={isDefaultLangField('PRODUCTKIND_NM_KOR') ? validation.required('PRODUCTKIND_NM_KOR') : []} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="PRODUCTKIND_NM_CHINA" colSpan={2} visible={isLangFieldVisible('PRODUCTKIND_NM_CHINA') || isDefaultLangField('PRODUCTKIND_NM_CHINA')} validationRules={isDefaultLangField('PRODUCTKIND_NM_CHINA') ? validation.required('PRODUCTKIND_NM_CHINA') : []} editorOptions={createOutlinedEditorOptions()} />
    </Form>
  );
}
