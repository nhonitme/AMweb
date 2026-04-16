import React, { useContext, useMemo } from "react";
import { Form as DxForm } from "devextreme-react/data-grid";
import { Item as DxItem } from "devextreme-react/form";
import { LanguageContext } from "@/lib/i18nLoader";

interface CompanyFormProps {
  colLabels?: Record<string, string>;
}



type CompanyFormItem = {
  dataField: string;
  label: { text: string };
  editorType?: string;
  editorTemplate?: (data: unknown) => JSX.Element;
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
      },
      {
        dataField: "TAX_CD",
        label: { text: label("TAX_CD", "Tax Code") },
      },
      {
        dataField: "TEL",
        label: { text: label("NNT_SDThoai", "Telephone") },
      },
      {
        dataField: "ADDRESS_DO",
        label: { text: label("AddressDO", "AddressDO") },
      },
      {
        dataField: "ADDRESS",
        label: { text: label("ADDRESS", "Address") },
      },
      /*
      {
        dataField: "ADDRESS_ENG",
        label: { text: label("ADDRESS_ENG", "ADDRESS_ENG") },
      },
      {
        dataField: "ADDRESS_KOR",
        label: { text: label("ADDRESS_KOR", "ADDRESS_KOR") },
      },
*/

      {
        dataField: "OWNER_NM",
        label: { text: label("OWNER_NM", "Owner Name") },
      },



      {
        dataField: "BRN",
        label: { text: label("COR_BUS_NUMBER", "BRN") },
      },
      {
        dataField: "BUSINESS_TYPE",
        label: { text: label("lblUPTAE", "CRN") },
      },
      {
        dataField: "KIND_BUSINESS",
        label: { text: label("KeyM_Business_Type", "Business type") },
      },
      {
        dataField: "EMAIL",
        label: { text: label("EMAIL", "Email") },
      },
      {
        dataField: "WEBSITE",
        label: { text: label("WEBSITE", "Website") },
      },
      {
        dataField: "FAX",
        label: { text: label("FAX", "Fax") },
      },
      {
        dataField: "OPEN_YMD",
        label: { text: label("lblOPEN_YMD", "Open Date") },
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
            editorTemplate={item.editorTemplate}
            label={item.label}
          />
        ))}
      </DxForm>
    </div>
  );

}