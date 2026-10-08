import { checkCodeExists } from "@/api/lookupApi";
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation";
import { Form } from 'devextreme-react/tree-list';
import { Item  } from 'devextreme-react/form';
import { useContext } from 'react';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';
import { isDefaultLangField, isLangFieldVisible, useCompanyLangRevision } from '@/lib/companyLang';
import { LanguageContext } from '@/lib/i18nLoader';

type AcclistFormProps = {
  isUpdate: boolean;
  lblChoose: string;
  lblAccType: string;
  data: { VALUE: number; TEXT: string }[];
};

export function AcclistForm({ isUpdate, lblChoose, lblAccType, data }: AcclistFormProps) {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string };
  const companyLangRevision = useCompanyLangRevision();
  const validation = useMasterFormValidation(translate);
  return (
    <Form key={companyLangRevision} colCount={2} onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
      <Item dataField="ACC_CD" validationRules={validation.code("ACC_CD", "ACC_ID", (id, value) => checkCodeExists("account", value, id))}
        editorOptions={createOutlinedEditorOptions({           
          validationMessageMode: "always",
          readOnly: isUpdate
        })}  
      >
      </Item>
      
      <Item dataField="ISABLETYPE"
        editorType="dxSelectBox"
        label={{ text: lblAccType }}
        editorOptions={createOutlinedEditorOptions({
          dataSource: data,
          valueExpr: "VALUE",
          displayExpr: "TEXT",
          searchEnabled: true,
          placeholder: lblChoose,
          showClearButton: true,
          validationMessageMode: "always"
        })}
      >

      </Item>

      <Item dataField="ACCTITLE_NM_VIET" colSpan={2}
        visible={isLangFieldVisible('ACCTITLE_NM_VIET') || isDefaultLangField('ACCTITLE_NM_VIET')}
        validationRules={isDefaultLangField('ACCTITLE_NM_VIET') ? validation.required('ACCTITLE_NM_VIET') : []}
        editorOptions={createOutlinedEditorOptions({ validationMessageMode: "always" })}
      >
      </Item>
      <Item dataField="ACCTITLE_NM_ENG" colSpan={2} visible={isLangFieldVisible('ACCTITLE_NM_ENG') || isDefaultLangField('ACCTITLE_NM_ENG')} validationRules={isDefaultLangField('ACCTITLE_NM_ENG') ? validation.required('ACCTITLE_NM_ENG') : []} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="ACCTITLE_NM_KOR" colSpan={2} visible={isLangFieldVisible('ACCTITLE_NM_KOR') || isDefaultLangField('ACCTITLE_NM_KOR')} validationRules={isDefaultLangField('ACCTITLE_NM_KOR') ? validation.required('ACCTITLE_NM_KOR') : []} editorOptions={createOutlinedEditorOptions()} />
      <Item dataField="ACCTITLE_NM_CHINA" colSpan={2} visible={isLangFieldVisible('ACCTITLE_NM_CHINA') || isDefaultLangField('ACCTITLE_NM_CHINA')} validationRules={isDefaultLangField('ACCTITLE_NM_CHINA') ? validation.required('ACCTITLE_NM_CHINA') : []} editorOptions={createOutlinedEditorOptions()} />
    </Form>
  );
}
