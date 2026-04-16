import React, { useContext } from "react";
import { Column, RequiredRule, AsyncRule } from "devextreme-react/data-grid";
import { LanguageContext } from '@/lib/i18nLoader';
import { checkProductKindExists } from "@/api/productKindApi";

const validateProductKindCd = async (e: { value: unknown; data?: Record<string, unknown>; }) => {
  const productKindCd = String(e.value ?? "").trim();

  if (!productKindCd) {
    return true;
  }

  try {
    const productKindId = Number(e.data?.PRODUCT_KIND_ID ?? 0);
    const res = await checkProductKindExists(productKindId, productKindCd);

    return {
      isValid: !res.Data,
    };
  } catch (err) {
    console.error("Error CheckExists:", err);
  }
    return {
      isValid: false,
      message: "Không kiểm tra được dữ liệu",
    };
};

export const ProductKindColumns: React.FC = () => {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string };

  return (
    <>
      <Column dataField="PRODUCT_KIND_CD" caption={translate('PRODUCT_KIND_CD', 'PRODUCT_KIND_CD')}> 
        <RequiredRule message={translate ? translate("MSG_MUST_ITEM", "PRODUCT_KIND_CD không được để trống") : "PRODUCT_KIND_CD không được để trống"} />
        <AsyncRule message={translate ? translate("MsgEqualCode", "PRODUCT_KIND_CD đã tồn tại") : "PRODUCT_KIND_CD đã tồn tại"} validationCallback={validateProductKindCd} />
      </Column>
      <Column dataField="PRODUCTKIND_NM" caption={translate('PRODUCTKIND_NM', 'PRODUCTKIND_NM')}>
        <RequiredRule message={translate ? translate("MSG_MUST_ITEM", "PRODUCTKIND_NM không được để trống") : "PRODUCTKIND_NM không được để trống"} />
      </Column>
      <Column dataField="PRODUCTKIND_NM_ENG" caption={translate('PRODUCTKIND_NM_ENG', 'PRODUCTKIND_NM_ENG')} />
      <Column dataField="PRODUCTKIND_NM_KOR" caption={translate('PRODUCTKIND_NM_KOR', 'PRODUCTKIND_NM_KOR')} />
      <Column dataField="REMARK" caption={translate('REMARK', 'REMARK')} />
    </>
  );
};
