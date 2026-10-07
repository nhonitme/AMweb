import { Form } from 'devextreme-react/data-grid';
import { Item} from 'devextreme-react/form';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';
import { isDefaultLangField, isLangFieldVisible, useCompanyLangRevision } from '@/lib/companyLang';

type StoreFormProps = {
  isUpdate: boolean;
};

export function StoreKindForm({isUpdate }: StoreFormProps) {
  const companyLangRevision = useCompanyLangRevision();
  return (
    <Form key={companyLangRevision} colCount={2}>
      
      <Item dataField="STORE_KIND_CD" colSpan={2}
        editorOptions={createOutlinedEditorOptions({
          validationMessageMode: "always",
        })}
      >
      </Item>
      <Item dataField="STORE_KIND_NM_VIET" colSpan={2}
          visible={isLangFieldVisible('STORE_KIND_NM_VIET')}
          isRequired={isDefaultLangField('STORE_KIND_NM_VIET')}
          editorOptions={createOutlinedEditorOptions({
          validationMessageMode: "always",
        })}
      >

      </Item>
      <Item dataField="STORE_KIND_NM_ENG" colSpan={2} visible={isLangFieldVisible('STORE_KIND_NM_ENG')} isRequired={isDefaultLangField('STORE_KIND_NM_ENG')} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="STORE_KIND_NM_KOR" colSpan={2} visible={isLangFieldVisible('STORE_KIND_NM_KOR')} isRequired={isDefaultLangField('STORE_KIND_NM_KOR')} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="STORE_KIND_NM_CHINA" colSpan={2} visible={isLangFieldVisible('STORE_KIND_NM_CHINA')} isRequired={isDefaultLangField('STORE_KIND_NM_CHINA')} editorOptions={createOutlinedEditorOptions()} />
    </Form>
  );
}
