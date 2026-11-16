import type { ReactNode } from "react";
import type { PitFormField } from "../types";
import { EInvoiceEditorSection } from "@/pages/EInvoice/components/EInvoiceEditorShell";
type FieldRenderer = (field: PitFormField) => ReactNode;
export default function PitDeclarationForm({ renderField }: {
    renderField: FieldRenderer;
}) {
    return <>
    <EInvoiceEditorSection title="Tờ khai">
      <div className="pit-fields">
        {renderField({ Key: "HTHUC", Label: "Hình thức đăng ký", Type: "select", MaxLength: 1, Options: [{ Value: "1", Label: "Đăng ký mới" }, { Value: "2", Label: "Thay đổi thông tin" }] })}
        {renderField({ Key: "DDANH", Label: "Địa danh", MaxLength: 50 })}
        {renderField({ Key: "NLAP", Label: "Ngày lập", Type: "date" })}
      </div>
    </EInvoiceEditorSection>
    <EInvoiceEditorSection title="Người nộp thuế">
      <div className="pit-fields">
        {renderField({ Key: "TNNT", Label: "Tên tổ chức, cá nhân trả thu nhập" })}
        {renderField({ Key: "MST", Label: "Mã số thuế", MaxLength: 14 })}
        {renderField({ Key: "CQTQLY", Label: "Cơ quan thuế quản lý", MaxLength: 100 })}
        {renderField({ Key: "MCQTQLY", Label: "Mã cơ quan thuế", MaxLength: 5 })}
      </div>
    </EInvoiceEditorSection>
    <EInvoiceEditorSection title="Liên hệ">
      <div className="pit-fields">
        {renderField({ Key: "NLHE", Label: "Người liên hệ", MaxLength: 50 })}
        {renderField({ Key: "DCLHE", Label: "Địa chỉ liên hệ" })}
        {renderField({ Key: "DCTDTU", Label: "Email", Type: "email", MaxLength: 50 })}
        {renderField({ Key: "DTLHE", Label: "Điện thoại liên hệ", MaxLength: 20 })}
      </div>
    </EInvoiceEditorSection>
  </>;
}
