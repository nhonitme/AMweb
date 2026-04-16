import type { ExcelImportConfig } from "@/types/modal"

export const bankImportConfig: ExcelImportConfig = {
  templateName: "mau-tai-khoan-ngan-hang.xlsx",
  columnMappings: [
    { softwareColumn: "bankCode", excelColumn: "", required: true, description: "Mã ngân hàng (bắt buộc)" },
    { softwareColumn: "bankName", excelColumn: "", required: true, description: "Tên ngân hàng (bắt buộc)" },
    { softwareColumn: "accountNumber", excelColumn: "", required: true, description: "Số tài khoản (bắt buộc)" },
    { softwareColumn: "accountName", excelColumn: "", required: true, description: "Tên tài khoản (bắt buộc)" },
    { softwareColumn: "balance", excelColumn: "", required: false, description: "Loại Tiền (tùy chọn)" },
  ],
  sampleData: [
    ["VCB001", "Vietcombank", "1234567890", "Tài khoản chính", "1000000000", "active"],
    ["BIDV001", "BIDV", "0987654321", "Tài khoản phụ", "500000000", "active"],
    ["ACB001", "ACB", "1122334455", "Tài khoản tiết kiệm", "2000000000", "inactive"],
  ],
  instructions: [
    'Cột "Trạng thái":',
    "- active: Tài khoản đang hoạt động",
    "- inactive: Tài khoản tạm ngưng",
    "",
    'Cột "Số dư":',
    "- Nhập số tiền (VND)",
    "- Có thể để trống (mặc định = 0)",
    "",
    "Lưu ý: Mã ngân hàng không được trùng lặp trong hệ thống",
  ],
  validationRules: {
    balance: (value: any) => {
      const errors: string[] = []
      if (value && String(value).trim() !== "") {
        const balanceValue = String(value).trim()
        if (!/^\d+$/.test(balanceValue)) {
          errors.push(`Số dư phải là số nguyên (giá trị hiện tại: "${balanceValue}")`)
        }
      }
      return errors
    },
  },
}
