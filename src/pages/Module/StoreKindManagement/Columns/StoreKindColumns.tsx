import React, { useContext } from "react";
import { Column, RequiredRule, AsyncRule } from "devextreme-react/data-grid";
import { LanguageContext } from '@/lib/i18nLoader';
import { checkExists } from "@/api/storeKindAPI";

const validateStoreKindCd = async (e: { value: unknown; data?: any }) => {
  const storeKindCd = String(e.value ?? "").trim();

  if (!storeKindCd) {
    return true;
  }

  try {
    const storeKindId = e.data?.STORE_KIND_ID ?? 0;
    const res = await checkExists(
      storeKindId,
      storeKindCd
    );

    return {
      isValid: !res.Data,
    };
  } catch (err: any) {
    console.error("Error in getStoreKind:", err);
  }
    return {
      isValid: false,
      message: "Không kiểm tra được dữ liệu",
    };
};

export const StoreKindColumns: React.FC = () => {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string };
  return (
    <>
      {<Column dataField="STORE_KIND_CD" caption={translate('StoreKindCD', 'Kind')}>
          <RequiredRule message={translate ? translate("MSG_MUST_ITEM", "STORE_KIND_CD không được để trống") : "STORE_KIND_CD không được để trống"} />
          <AsyncRule message={translate ? translate("MsgEqualCode", "STORE_KIND_CD đã tồn tại") : "STORE_KIND_CD đã tồn tại"} validationCallback={validateStoreKindCd} />
      </Column>}
      {<Column dataField="STORE_KIND_ID" caption={translate('StoreKindID', 'Kind')} visible={false} showInColumnChooser={false} allowHiding={false} />}
      {<Column dataField="STORE_KIND_NM_VIET" caption={translate('STORE_KIND_NM_VIET', 'STORE_KIND_NM_VIET')}>
          <RequiredRule message={translate ? translate("MSG_MUST_ITEM", "STORE_KIND_NM_VIET không được để trống") : "STORE_KIND_NM_VIET không được để trống"} />
      </Column>}
      {<Column dataField="STORE_KIND_NM_ENG" caption={translate('STORE_KIND_NM_ENG', 'STORE_KIND_NM_ENG')} />}
      {<Column dataField="STORE_KIND_NM_KOR" caption={translate('STORE_KIND_NM_KOR', 'STORE_KIND_NM_KOR')} />}
      {<Column dataField="STORE_KIND_NM_CHINA" caption={translate('STORE_KIND_NM_CHINA', 'STORE_KIND_NM_CHINA')} />}
    </>
  );
}
