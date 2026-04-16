import type { ExcelImportConfig } from "@/types/modal";

export const materialGroupImportConfig: ExcelImportConfig = {
  templateName: "mau-danh-sach-nhom-vat-tu.xlsx",
  columnMappings: [
    {
      softwareColumn: "PRODUCTKIND_CD",
      excelColumn: "",
      required: true,
      description: "Mã nhóm vật tư (bắt buộc)",
    },
    {
      softwareColumn: "PRODUCTKIND_NM",
      excelColumn: "",
      required: true,
      description: "Tên nhóm vật tư (bắt buộc)",
    },
    {
      softwareColumn: "PRODUCTKIND_NM_ENG",
      excelColumn: "",
      required: false,
      description: "Tên nhóm vật tư (Tiếng Anh) (tùy chọn)",
    },
    {
      softwareColumn: "PRODUCTKIND_NM_KOR",
      excelColumn: "",
      required: false,
      description: "Tên nhóm vật tư (Tiếng Hàn) (tùy chọn)",
    },
    {
      softwareColumn: "REMARK",
      excelColumn: "",
      required: false,
      description: "Ghi chú (tùy chọn)",
    },
    {
      softwareColumn: "COUNT",
      excelColumn: "",
      required: false,
      description: "Số lượng (tùy chọn)",
    },
  ],
  sampleData: [
    [
      "VT001",
      "Nhóm vật tư A",
      "Material Group A",
      "자재 그룹 A",
      "Ghi chú cho nhóm A",
      "10",
    ],
    [
      "VT002",
      "Nhóm vật tư B",
      "Material Group B",
      "자재 그룹 B",
      "Ghi chú cho nhóm B",
      "20",
    ],
  ],
  instructions: [
    "HƯỚNG DẪN NHẬP NHÓM VẬT TƯ:",
    "- Cột 'Mã nhóm vật tư' phải duy nhất, không chứa ký tự đặc biệt.",
    "- Có thể bỏ trống các cột không bắt buộc.",
  ],
  validationRules: {
    PRODUCTKIND_CD: (value: any) => {
      const errors: string[] = [];
      if (!value || String(value).trim() === "") {
        errors.push("Mã nhóm vật tư không được để trống");
      }
      return errors;
    },
  },
};

export default materialGroupImportConfig;
