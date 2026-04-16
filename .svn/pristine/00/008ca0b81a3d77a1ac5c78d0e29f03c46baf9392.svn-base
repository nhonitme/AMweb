import type { ExcelImportConfig } from "@/types/modal";

export const userImportConfig: ExcelImportConfig = {
  templateName: "mau-nguoi-dung.xlsx",
  columnMappings: [
    { softwareColumn: "userId", excelColumn: "", required: true, description: "ID người dùng (bắt buộc)" },
    { softwareColumn: "name", excelColumn: "", required: true, description: "Tên người dùng (bắt buộc)" },
    { softwareColumn: "costCenterCode", excelColumn: "", required: true, description: "Đối tượng tập hợp chi phí (bắt buộc)" },
    { softwareColumn: "permission", excelColumn: "", required: true, description: "Quyền (bắt buộc, admin/user/viewer)" },
    { softwareColumn: "phone", excelColumn: "", required: false, description: "Số điện thoại (tùy chọn)" },
    { softwareColumn: "issueDate", excelColumn: "", required: false, description: "Ngày cấp (tùy chọn, yyyy-mm-dd)" },
    { softwareColumn: "notes", excelColumn: "", required: false, description: "Ghi chú (tùy chọn)" },
  ],
  sampleData: [
    ["USER001", "Nguyễn Văn A", "213", "admin", "0914000001", "2024-01-01", "Ghi chú 1"],
    ["USER002", "Trần Thị B", "214", "user", "0914000002", "2024-01-02", "Ghi chú 2"],
  ],
  instructions: [
    'Cột "Đối tượng tập hợp chi phí": nhập mã phòng ban (ví dụ: 213, 214, 215, 216)',
    'Cột "Quyền": chỉ nhập một trong các giá trị: admin, user, viewer',
    'Cột "Ngày cấp": định dạng yyyy-mm-dd',
    'ID người dùng không được trùng lặp với dữ liệu đã có',
  ],
  validationRules: {
    userId: (value: any, allData: any[], existingData: any[]) => {
      const errors: string[] = [];
      if (!value || String(value).trim() === "") {
        errors.push("ID người dùng là bắt buộc");
      } else {
        const duplicate = [...allData, ...existingData].filter((item) => item.userId === value);
        if (duplicate.length > 1) {
          errors.push(`ID người dùng "${value}" đã tồn tại trong file hoặc hệ thống`);
        }
      }
      return errors;
    },
    permission: (value: any) => {
      const errors: string[] = [];
      if (value && !["admin", "user", "viewer"].includes(value)) {
        errors.push("Quyền chỉ được nhập: admin, user hoặc viewer");
      }
      return errors;
    },
  },
};
