import React, { useContext } from "react";
import { Column, TreeListTypes } from "devextreme-react/tree-list";
import { useCompanyLangRevision } from '@/lib/companyLang';
import { LanguageContext } from '@/lib/i18nLoader';
import { Button } from "devextreme-react/tree-list";
import type { AcclistInfo } from "@/types/acclist";

type AcclistColumnsProps = {
  onAddChild?: (rowData: AcclistInfo) => void;
};

export const AcclistColumns: React.FC<AcclistColumnsProps> = ({ onAddChild }) => {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string };
  useCompanyLangRevision();
  return (
    <>
      <Column
        type="buttons"
        width={100}
        fixed
        fixedPosition="left"
        showInColumnChooser={false}
      >
        <Button
          icon="add"
          hint={translate("ADD", "Thêm tài khoản con")}
          onClick={(e: TreeListTypes.ColumnButtonClickEvent) => {
            onAddChild?.(e.row?.data);
          }}
        />
        <Button name="edit" />
        <Button name="delete" />
      </Column>

      <Column dataField="ACC_CD" />

   
      <Column
        dataField="ISABLETYPE"
  
      />

      <Column dataField="ACCTITLE_NM_VIET" />
      <Column dataField="ACCTITLE_NM_ENG" />
      <Column dataField="ACCTITLE_NM_KOR" />
      <Column dataField="ACCTITLE_NM_CHINA" />
    </>
  );
}
