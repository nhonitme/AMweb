import type { ReactNode } from "react";
import type { PitFormField } from "../types";
import { EInvoiceEditorSection } from "@/pages/EInvoice/components/EInvoiceEditorShell";
type FieldRenderer = (field: PitFormField) => ReactNode;
export default function PitErrorNoticeForm({ renderField }: {
    renderField: FieldRenderer;
}) {
    return <>
    <EInvoiceEditorSection title="Thông báo">
      <div className="pit-fields">
        {renderField({ Key: "LOAI", Label: "Loại thông báo", Type: "select", MaxLength: 1, Options: [{ Value: "1", Label: "NNT thông báo" }, { Value: "2", Label: "Giải trình theo thông báo của CQT" }] })}
        {renderField({ Key: "SO", Label: "Số thông báo của CQT", Required: false, MaxLength: 30 })}
        {renderField({ Key: "NTBCCQT", Label: "Ngày thông báo của CQT", Type: "date", Required: false })}
        {renderField({ Key: "DDANH", Label: "Địa danh", MaxLength: 50 })}
        {renderField({ Key: "NTBAO", Label: "Ngày thông báo", Type: "date" })}
      </div>
    </EInvoiceEditorSection>
    <EInvoiceEditorSection title="Cơ quan thuế">
      <div className="pit-fields">
        {renderField({ Key: "MCQT", Label: "Mã cơ quan thuế", MaxLength: 5 })}
        {renderField({ Key: "TCQT", Label: "Tên cơ quan thuế", MaxLength: 100 })}
      </div>
    </EInvoiceEditorSection>
    <EInvoiceEditorSection title="Người nộp thuế">
      <div className="pit-fields">
        {renderField({ Key: "TNNT", Label: "Tên tổ chức, cá nhân trả thu nhập" })}
        {renderField({ Key: "MST", Label: "Mã số thuế", Required: false, MaxLength: 14 })}
        {renderField({ Key: "MDVQHNSACH", Label: "Mã đơn vị quan hệ ngân sách (nội bộ)", Required: false, MaxLength: 7 })}
      </div>
    </EInvoiceEditorSection>
  </>;
}
