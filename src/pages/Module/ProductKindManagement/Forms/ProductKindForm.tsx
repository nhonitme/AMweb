import { Form } from 'devextreme-react/data-grid';
import { Item  } from 'devextreme-react/form';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';
import { isDefaultLangField, isLangFieldVisible, useCompanyLangRevision } from '@/lib/companyLang';

export function ProductKindForm() {
  const companyLangRevision = useCompanyLangRevision();
  return (
    <Form key={companyLangRevision} colCount={2}>
      <Item dataField="PRODUCT_KIND_CD" editorOptions={createOutlinedEditorOptions()}></Item>
      <Item dataField="REMARK" editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="PRODUCTKIND_NM_VIET" colSpan={2} visible={isLangFieldVisible('PRODUCTKIND_NM_VIET')} isRequired={isDefaultLangField('PRODUCTKIND_NM_VIET')} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="PRODUCTKIND_NM_ENG" colSpan={2} visible={isLangFieldVisible('PRODUCTKIND_NM_ENG')} isRequired={isDefaultLangField('PRODUCTKIND_NM_ENG')} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="PRODUCTKIND_NM_KOR" colSpan={2} visible={isLangFieldVisible('PRODUCTKIND_NM_KOR')} isRequired={isDefaultLangField('PRODUCTKIND_NM_KOR')} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="PRODUCTKIND_NM_CHINA" colSpan={2} visible={isLangFieldVisible('PRODUCTKIND_NM_CHINA')} isRequired={isDefaultLangField('PRODUCTKIND_NM_CHINA')} editorOptions={createOutlinedEditorOptions()} />
    </Form>
  );
}
