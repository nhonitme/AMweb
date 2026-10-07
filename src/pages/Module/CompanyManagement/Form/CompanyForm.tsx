import React, { useContext, useMemo } from "react";
import { Form as DxForm } from "devextreme-react/data-grid";
import { Item as DxItem } from "devextreme-react/form";
import { createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions";
import { LanguageContext } from "@/lib/i18nLoader";

interface CompanyFormProps {
  colLabels?: Record<string, string>;
}



type CompanyFormItem = {
  dataField: string;
  label: { text: string };
  editorType?: string;
  editorTemplate?: (data: unknown) => JSX.Element;
  editorOptions?: Record<string, unknown>;
};


export default function CompanyForm({ colLabels = {} }: CompanyFormProps) {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string; lang: string };
  const t = (k: string, f: string) => (translate ? translate(k, f) : f);

  const label = (field: string, fallback: string) => colLabels[field] ?? t(field, fallback);

  const items = useMemo<CompanyFormItem[]>(() => {
    return [
  
      {
        dataField: "COMPANY_NM",
        label: { text: label("COMPANY_NM", "Company Name") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "TAX_CD",
        label: { text: label("TAX_CD", "Tax Code") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "TEL",
        label: { text: label("NNT_SDThoai", "Telephone") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "ADDRESS_DO",
        label: { text: label("AddressDO", "AddressDO") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "ADDRESS",
        label: { text: label("ADDRESS", "Address") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "OWNER_NM",
        label: { text: label("OWNER_NM", "Owner Name") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "BRN",
        label: { text: label("COR_BUS_NUMBER", "BRN") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "BUSINESS_TYPE",
        label: { text: label("lblUPTAE", "CRN") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "KIND_BUSINESS",
        label: { text: label("KeyM_Business_Type", "Business type") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "EMAIL",
        label: { text: label("EMAIL", "Email") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "WEBSITE",
        label: { text: label("WEBSITE", "Website") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "FAX",
        label: { text: label("FAX", "Fax") },
        editorOptions: createOutlinedEditorOptions(),
      },
      {
        dataField: "OPEN_YMD",
        label: { text: label("lblOPEN_YMD", "Open Date") },
        editorOptions: createOutlinedEditorOptions(),
      },
    ];
  }, [colLabels, translate]);


  return (
    <div className="company-form">
      <DxForm colCount={2} labelLocation="top" width="100%">
        {items.map((item) => (
          <DxItem
            key={item.dataField}
            dataField={item.dataField}
            editorType={item.editorType}
            editorOptions={item.editorOptions}
            editorTemplate={item.editorTemplate}
            label={item.label}
          />
        ))}
      </DxForm>
    </div>
  );

}
