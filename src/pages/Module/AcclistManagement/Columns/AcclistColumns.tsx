import React, { useContext } from "react";
import { Column, RequiredRule, AsyncRule, TreeListTypes } from "devextreme-react/tree-list";
import { LanguageContext } from '@/lib/i18nLoader';
import { checkExistsACC } from '@/api/acclistAPI';
import { Button } from "devextreme-react/tree-list";

const validateAccCd = async (e: { value: unknown; data?: any }) => {
  const accCd = String(e.value ?? "").trim();

  if (!accCd) {
    return true;
  }

  try {
    const accId = e.data?.ACC_ID ?? 0;
    const res = await checkExistsACC(
      accId,
      accCd
    );

    return {
      isValid: !res.Data,
    };
  } catch (err: any) {
    console.error("Error in getAcclistInfos:", err);
  }
    return {
      isValid: false,
      message: "Không kiểm tra được dữ liệu",
    };
};

type AcclistColumnsProps = {
  onAddChild?: (rowData: any) => void;
};

export const AcclistColumns: React.FC<AcclistColumnsProps> = ({ onAddChild }) => {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string };
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

      {<Column dataField="ACC_CD" caption={translate('ACC_CD', 'Account Code')}>
          <RequiredRule message={translate ? translate("MSG_MUST_ITEM", "ACC_CD không được để trống") : "ACC_CD không được để trống"} />
          <AsyncRule message={translate ? translate("MsgEqualCode", "ACC_CD đã tồn tại") : "ACC_CD đã tồn tại"} validationCallback={validateAccCd} />
      </Column>}
      {<Column dataField="ACC_ID" caption={translate('ACC_ID', 'Account ID')} visible={false} showInColumnChooser={false} allowHiding={false} />}
      {<Column dataField="ACCTITLE_NM_VIET" caption={translate('ACCTITLE_NM_VIET', 'Acc name viet')}>
          <RequiredRule message={translate ? translate("MSG_MUST_ITEM", "ACCTITLE_NM_VIET không được để trống") : "ACCTITLE_NM_VIET không được để trống"} />
      </Column>}
      {<Column dataField="ACCTITLE_NM_ENG" caption={translate('ACCTITLE_NM_ENG', 'Acc name eng')} />}
      {<Column dataField="ACCTITLE_NM_KOR" caption={translate('ACCTITLE_NM_KOR', 'Acc name kor')} />}
      {<Column dataField="ACCTITLE_NM_CHINA" caption={translate('ACCTITLE_NM_CHINA', 'Acc name china')} />}
      {<Column dataField="ISABLEINPUT" caption={translate('ISABLEINPUT', 'Is Able Input')} >
          <RequiredRule message={translate ? translate("MSG_MUST_ITEM", "Account Type is required") : "Account Type is required"} />
      </Column>}
      {<Column dataField="ISCUSTOMER" caption={translate('ISCUSTOMER', 'Is Customer')}  />}
      {<Column dataField="ISABLETYPE" caption={translate('ISABLETYPE', 'Is Able Type')}  />}
      {<Column dataField="ISUSERADD" caption={translate('ISUSERADD', 'Is User Add')}  />}
      {<Column dataField="LEVEL" caption={translate('LEVEL', 'Level')}  />}
      {<Column dataField="DECISION" caption={translate('DECISION', 'Decision')}  />}
      {<Column dataField="DESTINATION_ACC_CD" caption={translate('DESTINATION_ACC_CD', 'Destination Account Code')}  />}
    </>
  );
}
