import { masterFormGroupCaptions } from "@/components/forms/masterFormSectionIcons";
import { getMasterNameFields } from "@/components/forms/masterNameFields";
import { checkCodeExists } from "@/api/lookupApi";
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation";
import {useContext, useMemo, type FC } from "react";
import { LanguageContext } from "@/lib/i18nLoader";
import { Form } from 'devextreme-react/data-grid';
import { GroupItem, Item } from 'devextreme-react/form';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';
import { useCompanyLangRevision } from '@/lib/companyLang';

type StoreFormProps = {
  isUpdate: boolean;
};

export const StoreKindForm: FC<StoreFormProps> = () => {
  const { translate } = useContext(LanguageContext) as { translate: (key: string, fallback?: string) => string };
  const companyLangRevision = useCompanyLangRevision();
  const validation = useMasterFormValidation(translate);
  return useMemo(() => (
    <Form key={companyLangRevision} colCount={1} labelLocation="top" width="100%" onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
      <GroupItem caption={translate("BASE_INFO", "Thông tin chung")} captionRender={masterFormGroupCaptions.info} colCount={2} colCountByScreen={{ xs: 1 }}>

        <Item dataField="STORE_KIND_CD" validationRules={validation.code("STORE_KIND_CD", "STORE_KIND_ID", (id, value) => checkCodeExists("store-kind", value, id))} colSpan={2}
          editorOptions={createOutlinedEditorOptions({
            validationMessageMode: "always",
          })}
        >
        </Item>
        {getMasterNameFields("STORE_KIND_NM").map((field, index, fields) => (
          <Item
            key={field}
            dataField={field}
            colSpan={index === fields.length - 1 && fields.length % 2 === 1 ? 2 : 1}
            validationRules={field === "STORE_KIND_NM_VIET" ? validation.required(field) : []}
            editorOptions={createOutlinedEditorOptions(field === "STORE_KIND_NM_VIET" ? { validationMessageMode: "always" } : {})}
          />
        ))}
      </GroupItem>
    </Form>
  ), [translate, companyLangRevision, validation]);
}
