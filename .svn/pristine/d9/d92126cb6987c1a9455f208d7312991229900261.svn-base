import type { ExcelImportConfig } from "@/types/modal"

export const costObjectImportConfig: ExcelImportConfig = {
  templateName: "mau-doi-tuong-tap-hop-chi-phi.xlsx",
  columnMappings: [
    { softwareColumn: "code", excelColumn: "", required: true, description: "Mã đối tượng tập hợp chi phí (bắt buộc)" },
    { softwareColumn: "nameVi", excelColumn: "", required: true, description: "Tên tiếng Việt (bắt buộc)" },
    { softwareColumn: "nameEn", excelColumn: "", required: false, description: "Tên tiếng Anh (tùy chọn)" },
    { softwareColumn: "nameKo", excelColumn: "", required: false, description: "Tên tiếng Hàn (tùy chọn)" },
    {
      softwareColumn: "parentObject",
      excelColumn: "",
      required: false,
      description: "ID đối tượng gốc - số nguyên (tùy chọn, nhập 0 nếu không có cha)",
    },
    { softwareColumn: "notes", excelColumn: "", required: false, description: "Ghi chú (tùy chọn)" },
  ],
  sampleData: [
    ["CC001", "Phòng Sản Xuất", "Production Dept", "생산부", "0", "Bộ phận sản xuất chính"],
    ["CC002", "Phòng Marketing", "Marketing Dept", "마케팅부", "1", "Bộ phận marketing - con của CC001"],
    ["CC003", "Phòng Kế Toán", "Accounting Dept", "회계부", "0", "Bộ phận kế toán"],
    ["CC004", "Team A Marketing", "Marketing Team A", "마케팅 A팀", "2", "Team con của Marketing"],
  ],
  instructions: [
    'Cột "ID đối tượng gốc":',
    "- Nhập 0: đối tượng không có cha (mặc định)",
    "- Nhập số khác 0: ID của đối tượng cha (phải tồn tại trong hệ thống)",
    "- Không được nhập chữ, chỉ chấp nhận số nguyên",
    "",
    "Ví dụ:",
    "- CC001: không có cha (nhập 0 vào cột ID đối tượng gốc)",
    "- CC002: có cha là CC001 (nhập ID của CC001 vào cột ID đối tượng gốc)",
    "",
    "Lưu ý: ID đối tượng gốc phải là số nguyên và tồn tại trong danh sách đối tượng hiện có",
  ],
  validationRules: {
    parentObject: (value: any, allData: any[], existingData: any[]) => {
      const errors: string[] = []
      if (value && String(value).trim() !== "") {
        const parentValue = String(value).trim()

        // Check if it's a number
        if (!/^\d+$/.test(parentValue)) {
          errors.push(`ID đối tượng gốc phải là số nguyên, không được nhập chữ (giá trị hiện tại: "${parentValue}")`)
        } else {
          // If it's 0, it's valid (no parent)
          if (parentValue !== "0") {
            // Check if the ID exists in the system
            const existingIds = new Set(existingData.map((item) => item.id?.toString()))
            if (!existingIds.has(parentValue)) {
              errors.push(`ID đối tượng gốc "${parentValue}" không tồn tại trong hệ thống`)
            }
          }
        }
      }
      return errors
    },
  },
}
