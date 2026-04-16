import type { ExcelImportConfig } from "@/types/modal";

export const receiptImportConfig: ExcelImportConfig = {
  templateName: "mau-phieu-thu.xlsx",
  columnMappings: [
    { softwareColumn: "receiptNo", excelColumn: "", required: true, description: "Số chứng từ (bắt buộc)" },
    { softwareColumn: "transactionDate", excelColumn: "", required: true, description: "Ngày giao dịch (bắt buộc, yyyy-mm-dd)" },
    { softwareColumn: "amount", excelColumn: "", required: true, description: "Số tiền (bắt buộc)" },
    { softwareColumn: "description1", excelColumn: "", required: false, description: "Mô tả 1 (tùy chọn)" },
    { softwareColumn: "description2", excelColumn: "", required: false, description: "Mô tả 2 (tùy chọn)" },
    { softwareColumn: "receiverName", excelColumn: "", required: true, description: "Người nhận tiền (bắt buộc)" },
    { softwareColumn: "customerCode", excelColumn: "", required: false, description: "Mã khách hàng (tùy chọn)" },
    { softwareColumn: "customerName", excelColumn: "", required: false, description: "Tên khách hàng (tùy chọn)" },
    { softwareColumn: "bankName", excelColumn: "", required: false, description: "Tên ngân hàng (tùy chọn)" },
    { softwareColumn: "email", excelColumn: "", required: false, description: "Email (tùy chọn)" },
    { softwareColumn: "isLocked", excelColumn: "", required: false, description: "Đã khóa (true/false, tùy chọn)" },
  ],
  sampleData: [
    ["PT0001", "2025-07-29", 1000000, "Thu tiền bán hàng", "", "Nguyễn Văn A", "KH0001", "Công ty TNHH A", "Vietcombank", "a@company.com", "false"],
    ["PT0002", "2025-07-29", 2000000, "Thu dịch vụ", "", "Trần Thị B", "KH0002", "Công ty TNHH B", "BIDV", "b@company.com", "true"],
  ],
  instructions: [
    'Cột "Ngày giao dịch": định dạng yyyy-mm-dd',
    'Cột "Số tiền": chỉ nhập số, không nhập ký tự đặc biệt',
    'Cột "Đã khóa": chỉ nhập true hoặc false',
    'Số chứng từ không được trùng lặp với dữ liệu đã có',
  ],
  validationRules: {
    receiptNo: (value: any, allData: any[], existingData: any[]) => {
      const errors: string[] = [];
      if (!value || String(value).trim() === "") {
        errors.push("Số chứng từ là bắt buộc");
      } else {
        const duplicate = [...allData, ...existingData].filter((item) => item.receiptNo === value);
        if (duplicate.length > 1) {
          errors.push(`Số chứng từ "${value}" đã tồn tại trong file hoặc hệ thống`);
        }
      }
      return errors;
    },
    transactionDate: (value: any) => {
      const errors: string[] = [];
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        errors.push("Ngày giao dịch phải đúng định dạng yyyy-mm-dd");
      }
      return errors;
    },
    amount: (value: any) => {
      const errors: string[] = [];
      if (value && isNaN(Number(value))) {
        errors.push("Số tiền phải là số");
      }
      return errors;
    },
    isLocked: (value: any) => {
      const errors: string[] = [];
      if (value && !["true", "false"].includes(value)) {
        errors.push("Đã khóa chỉ được nhập true hoặc false");
      }
      return errors;
    },
  },
};
