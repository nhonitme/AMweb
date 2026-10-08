import { checkCodeExists } from "@/api/lookupApi";
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation";
import { useContext } from "react";
import { LanguageContext } from "@/lib/i18nLoader";
import { Form } from 'devextreme-react/data-grid';
import { Item  } from 'devextreme-react/form';
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions';

export function ProductUnitForm() {
  const { translate } = useContext(LanguageContext) as { translate: (key: string, fallback?: string) => string };
  const validation = useMasterFormValidation(translate);
  return (
    <Form colCount={2} onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
      <Item dataField="UNIT_CD" validationRules={validation.code("UNIT_CD", "UNIT_ID", (id, value) => checkCodeExists("unit", value, id))} editorOptions={createOutlinedEditorOptions()}></Item>
      <Item/>
      <Item dataField="UNIT_NM" validationRules={validation.required("UNIT_NM")} colSpan={2} editorOptions={createOutlinedEditorOptions()} />
    </Form>
  );
};
