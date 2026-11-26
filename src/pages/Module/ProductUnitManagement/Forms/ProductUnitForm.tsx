import { masterFormGroupCaptions } from "@/components/forms/masterFormSectionIcons";
import { checkCodeExists } from "@/api/lookupApi";
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation";
import {useContext, useMemo } from "react";
import { LanguageContext } from "@/lib/i18nLoader";
import { Form } from 'devextreme-react/data-grid';
import { GroupItem, Item } from 'devextreme-react/form';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';

export function ProductUnitForm() {
  const { translate } = useContext(LanguageContext) as { translate: (key: string, fallback?: string) => string };
  const validation = useMasterFormValidation(translate);
  return useMemo(() => (
    <Form colCount={1} labelLocation="top" width="100%" onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
      <GroupItem caption={translate("BASE_INFO", "Thông tin chung")} captionRender={masterFormGroupCaptions.info} colCount={2} colCountByScreen={{ xs: 1 }}>
        <Item dataField="UNIT_CD" validationRules={validation.code("UNIT_CD", "UNIT_ID", (id, value) => checkCodeExists("unit", value, id))} editorOptions={createOutlinedEditorOptions()} />
        <Item dataField="UNIT_NM" validationRules={validation.required("UNIT_NM")} editorOptions={createOutlinedEditorOptions()} />
      </GroupItem>
    </Form>
  ), [translate, validation]);
};
