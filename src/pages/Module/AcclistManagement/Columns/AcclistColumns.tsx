import React, { useContext } from "react";
import { Column, RequiredRule, AsyncRule, TreeListTypes } from "devextreme-react/tree-list";
import { isDefaultLangField, useCompanyLangRevision } from '@/lib/companyLang';
import { LanguageContext } from '@/lib/i18nLoader';
import { checkCodeExists } from '@/api/lookupApi';
import { getApiEnvelopeMessage } from "@/api/apiTypes";
import { Button } from "devextreme-react/tree-list";
import type { AcclistInfo } from "@/types/acclist";

type DevExtremeValidationOptions<TData> = {
  column: Record<string, unknown>;
  data: TData;
  formItem: Record<string, unknown>;
  rule: Record<string, unknown>;
  validator: Record<string, unknown>;
  value: unknown;
};

type AcclistValidationData = Partial<Pick<AcclistInfo, "ACC_ID">>;

const CHECK_CODE_FALLBACK = "Không kiểm tra được dữ liệu";

const validateAccCd = async (options: DevExtremeValidationOptions<AcclistValidationData>) => {
  const accCd = String(options.value ?? "").trim();

  if (!accCd) {
    return true;
  }

  try {
    const accId = options.data?.ACC_ID ?? 0;
    const exists = await checkCodeExists("account", accCd, accId);

    return {
      isValid: !exists,
    };
  } catch (err: unknown) {
    console.error("Error in getAcclistInfos:", err);
    const responseData = (err as { response?: { data?: unknown } })?.response?.data;
    return {
      isValid: false,
      message: getApiEnvelopeMessage(responseData, CHECK_CODE_FALLBACK),
    };
  }
};

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

      <Column dataField="ACC_CD" caption={translate('ACC_CD', 'Account Code')}>
        <RequiredRule message={translate("MSG_MUST_ITEM", "ACC_CD không được để trống")} />
        <AsyncRule message={translate("MsgEqualCode", "ACC_CD đã tồn tại")} validationCallback={validateAccCd} />
      </Column>

      <Column dataField="ACCTITLE_NM_VIET" caption={translate('ACCTITLE_NM_VIET', 'Acc name viet')}>
        {isDefaultLangField('ACCTITLE_NM_VIET') && <RequiredRule message={translate("MSG_MUST_ITEM", "ACCTITLE_NM_VIET không được để trống")} />}
      </Column>
      <Column dataField="ACCTITLE_NM_ENG" caption={translate('ACCTITLE_NM_ENG', 'Acc name eng')}>
        {isDefaultLangField('ACCTITLE_NM_ENG') && <RequiredRule message={translate("MSG_MUST_ITEM", "ACCTITLE_NM_ENG không được để trống")} />}
      </Column>
      <Column dataField="ACCTITLE_NM_KOR" caption={translate('ACCTITLE_NM_KOR', 'Acc name kor')}>
        {isDefaultLangField('ACCTITLE_NM_KOR') && <RequiredRule message={translate("MSG_MUST_ITEM", "ACCTITLE_NM_KOR không được để trống")} />}
      </Column>
      <Column dataField="ACCTITLE_NM_CHINA" caption={translate('ACCTITLE_NM_CHINA', 'Acc name china')}>
        {isDefaultLangField('ACCTITLE_NM_CHINA') && <RequiredRule message={translate("MSG_MUST_ITEM", "ACCTITLE_NM_CHINA không được để trống")} />}
      </Column>
    </>
  );
}
