import { masterFormGroupCaptions } from "@/components/forms/masterFormSectionIcons";
import { getMasterNameFields } from "@/components/forms/masterNameFields";
import { checkCodeExists } from "@/api/lookupApi";
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation";
import { Form } from 'devextreme-react/tree-list';
import { GroupItem, Item } from 'devextreme-react/form';
import {useContext, useMemo } from 'react';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';
import { useCompanyLangRevision } from '@/lib/companyLang';
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
  return useMemo(() => (
    <Form key={companyLangRevision} colCount={1} labelLocation="top" width="100%" onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
      <GroupItem caption={translate("BASE_INFO", "Thông tin chung")} captionRender={masterFormGroupCaptions.info} colCount={2} colCountByScreen={{ xs: 1 }}>
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
        {getMasterNameFields("ACCTITLE_NM").map((field, index, fields) => (
          <Item
            key={field}
            dataField={field}
            colSpan={index === fields.length - 1 && fields.length % 2 === 1 ? 2 : 1}
            validationRules={field === "ACCTITLE_NM_VIET" ? validation.required(field) : []}
            editorOptions={createOutlinedEditorOptions(field === "ACCTITLE_NM_VIET" ? { validationMessageMode: "always" } : {})}
          />
        ))}
      </GroupItem>
    </Form>
  ), [translate, companyLangRevision, validation, isUpdate, lblChoose, lblAccType, data]);
}
