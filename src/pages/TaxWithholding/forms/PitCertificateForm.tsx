import type { ReactNode } from "react";
import type { PitFormField } from "../types";
import { PIT_CERTIFICATE_MONEY_FIELDS } from "../pitCertificateModel";
import { EInvoiceEditorSection } from "@/pages/EInvoice/components/EInvoiceEditorShell";
type FieldRenderer = (field: PitFormField) => ReactNode;
export function PitCertificatePayerFields({ renderField }: {
    renderField: FieldRenderer;
}) {
    return <>
        {renderField({ Key: "TCTTNHAP_TEN", Label: "Tên tổ chức, cá nhân trả thu nhập" })}
        {renderField({ Key: "TCTTNHAP_MST", Label: "Mã số thuế tổ chức", MaxLength: 14 })}
        {renderField({ Key: "TCTTNHAP_DCHI", Label: "Địa chỉ tổ chức" })}
        {renderField({ Key: "TCTTNHAP_SDTHOAI", Label: "Điện thoại tổ chức", Required: false, MaxLength: 20 })}
  </>;
}
export function PitCertificateHeaderFields({ renderField }: {
    renderField: FieldRenderer;
}) {
    return <>
        {renderField({ Key: "KHCTU", Label: "Ký hiệu chứng từ (CT26AA)", MaxLength: 6 })}
        {renderField({ Key: "NLAP", Label: "Ngày lập khi ký", Type: "date", Required: false })}
        {renderField({ Key: "TCCTU", Label: "Tính chất", Type: "select", Required: false, MaxLength: 1, Options: [{ Value: "", Label: "Chứng từ gốc" }, { Value: "1", Label: "Thay thế" }, { Value: "2", Label: "Điều chỉnh chứng từ đã điều chỉnh theo NĐ 70" }] })}
  </>;
}
export default function PitCertificateForm({ renderField, customerLookup, relatedPanel, t }: {
    renderField: FieldRenderer;
    customerLookup: ReactNode;
    relatedPanel: ReactNode;
    t: (key: string, fallback: string) => string;
}) {
    return <>
    {relatedPanel}
    <EInvoiceEditorSection title={t("INCOME_RECIPIENT", "Người nhận thu nhập")} className="pit-form-section pit-person-section">
      <div className="pit-fields">
        {customerLookup}
        {renderField({ Key: "NNT_TEN", Label: "Họ tên người nhận thu nhập" })}
        {renderField({ Key: "NNT_MST", Label: "Mã số thuế cá nhân", Required: false, MaxLength: 14 })}
        {renderField({ Key: "NNT_DCHI", Label: "Địa chỉ cá nhân" })}
        {renderField({ Key: "NNT_QTICH", Label: "Quốc tịch", Required: false })}
        {renderField({ Key: "NNT_CNCTRU", Label: "Tình trạng cư trú", Type: "option", MaxLength: 1, Options: [{ Value: "1", Label: "Cư trú" }, { Value: "0", Label: "Không cư trú" }] })}
        {renderField({ Key: "NNT_CCCDAN", Label: "CCCD / hộ chiếu / số định danh", Required: false, MaxLength: 20 })}
        {renderField({ Key: "NNT_SDTHOAI", Label: "Điện thoại cá nhân", MaxLength: 20 })}
        {renderField({ Key: "NNT_DCTDTU", Label: "Email cá nhân", Type: "email", Required: false, MaxLength: 50 })}
        {renderField({ Key: "NNT_GCHU", Label: "Ghi chú", Required: false, MaxLength: 255 })}
      </div>
    </EInvoiceEditorSection>
    <EInvoiceEditorSection title={t("PIT_CERT_INCOME_TAX", "Thu nhập và thuế")} className="pit-form-section pit-income-section">
      <div className="pit-fields">
        {renderField({ Key: "KTNHAP", Label: "Khoản thu nhập", Type: "select", MaxLength: 1 })}
        {renderField({ Key: "TTHANG", Label: "Từ tháng", Type: "integer" })}
        {renderField({ Key: "DTHANG", Label: "Đến tháng", Type: "integer" })}
        {renderField({ Key: "NAM", Label: "Năm trả thu nhập", Type: "integer" })}
        {PIT_CERTIFICATE_MONEY_FIELDS.map((field) => renderField({ ...field, Type: "money" }))}
      </div>
    </EInvoiceEditorSection>
  </>;
}
