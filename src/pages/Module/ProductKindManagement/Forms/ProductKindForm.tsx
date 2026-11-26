import { masterFormGroupCaptions } from "@/components/forms/masterFormSectionIcons";
import { getMasterNameFields } from "@/components/forms/masterNameFields";
import { checkCodeExists } from "@/api/lookupApi";
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation";
import {useContext, useMemo } from "react";
import { LanguageContext } from "@/lib/i18nLoader";
import { Form } from 'devextreme-react/data-grid';
import { GroupItem, Item } from 'devextreme-react/form';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';
import { useCompanyLangRevision } from '@/lib/companyLang';

export function ProductKindForm() {
  const { translate } = useContext(LanguageContext) as { translate: (key: string, fallback?: string) => string };
  const companyLangRevision = useCompanyLangRevision();
  const validation = useMasterFormValidation(translate);
  return useMemo(() => (
    <Form key={companyLangRevision} colCount={1} labelLocation="top" width="100%" onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
      <GroupItem caption={translate("BASE_INFO", "Thông tin chung")} captionRender={masterFormGroupCaptions.info} colCount={2} colCountByScreen={{ xs: 1 }}>
        <Item dataField="PRODUCT_KIND_CD" colSpan={2} cssClass="field-narrow" validationRules={validation.code("PRODUCT_KIND_CD", "PRODUCT_KIND_ID", (id, value) => checkCodeExists("product-kind", value, id))} editorOptions={createOutlinedEditorOptions()} />
        {getMasterNameFields("PRODUCTKIND_NM").map((field, index, fields) => (
          <Item
            key={field}
            dataField={field}
            colSpan={index === fields.length - 1 && fields.length % 2 === 1 ? 2 : 1}
            validationRules={field === "PRODUCTKIND_NM_VIET" ? validation.required(field) : []}
            editorOptions={createOutlinedEditorOptions()}
          />
        ))}
      </GroupItem>
      <GroupItem caption={translate("Other", "Khác")} captionRender={masterFormGroupCaptions.overflow}>
        <Item dataField="REMARK" editorOptions={createOutlinedEditorOptions()} />
      </GroupItem>
    </Form>
  ), [translate, companyLangRevision, validation]);
}
