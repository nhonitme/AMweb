import type { ExcelImportConfig } from "@/types/modal"

export const customerImportConfig: ExcelImportConfig = {
  // Name of the downloadable template (users can click “Tải tệp mẫu Excel”)
  templateName: "mau-danh-sach-khach-hang.xlsx",

  // Map Excel columns → software fields
  columnMappings: [
    {
      softwareColumn: "id",
      excelColumn: "",
      required: true,
      description: "Mã khách hàng (bắt buộc)",
    },
    {
      softwareColumn: "nameVi",
      excelColumn: "",
      required: true,
      description: "Tên khách hàng (Tiếng Việt) (bắt buộc)",
    },
    {
      softwareColumn: "nameEn",
      excelColumn: "",
      required: false,
      description: "Tên khách hàng (Tiếng Anh) (tùy chọn)",
    },
    {
      softwareColumn: "nameKo",
      excelColumn: "",
      required: false,
      description: "Tên khách hàng (Tiếng Hàn) (tùy chọn)",
    },
    {
      softwareColumn: "buyerName", // NEW
      excelColumn: "",
      required: false,
      description: "Tên người mua (tùy chọn)",
    },
    {
      softwareColumn: "customerUserCode", // Existing
      excelColumn: "",
      required: false,
      description: "Mã người dùng khách hàng (tùy chọn)",
    },
    {
      softwareColumn: "customerType", // Existing
      excelColumn: "",
      required: false,
      description: "CustomerType- 1 so",
    },
    {
      softwareColumn: "categoryCode", // Existing
      excelColumn: "",
      required: false,
      description: "CategoryCD",
    },
    {
      softwareColumn: "taxCode",
      excelColumn: "",
      required: false,
      description: "TaxCD",
    },
    {
      softwareColumn: "email",
      excelColumn: "",
      required: false,
      description: "Email (tùy chọn)",
    },
    {
      softwareColumn: "tel",
      excelColumn: "",
      required: false,
      description: "Số điện thoại (tùy chọn)",
    },
    {
      softwareColumn: "fax", // NEW
      excelColumn: "",
      required: false,
      description: "Fax (tùy chọn)",
    },
    {
      softwareColumn: "ownerName", // Existing
      excelColumn: "",
      required: false,
      description: "Tên chủ sở hữu (tùy chọn)",
    },
    {
      softwareColumn: "businessType", // Existing
      excelColumn: "",
      required: false,
      description: "Loại hình kinh doanh (tùy chọn)",
    },
    {
      softwareColumn: "kindBusiness", // Existing
      excelColumn: "",
      required: false,
      description: "Ngành nghề kinh doanh (tùy chọn)",
    },
    {
      softwareColumn: "zipCode", // NEW
      excelColumn: "",
      required: false,
      description: "Mã bưu chính (tùy chọn)",
    },
    {
      softwareColumn: "address",
      excelColumn: "",
      required: false,
      description: "Địa chỉ (tùy chọn)",
    },
    {
      softwareColumn: "notes",
      excelColumn: "",
      required: false,
      description: "Ghi chú (tùy chọn)",
    },
    {
      softwareColumn: "lag", // NEW - assuming it's a fixed value like "VIET" or can be imported
      excelColumn: "",
      required: false,
      description: "Ngôn ngữ (mặc định là VIET)",
    },
  ],

  // Example rows that appear in the downloaded template
  sampleData: [
    [
      "CUS001",
      "Công ty TNHH A",
      "A Co., Ltd",
      "A 회사",
      "Người mua A", // buyerName
      "USER001", // customerUserCode
      "1", // customerType
      "1", // categoryCode
      "0312270160",
      "contact@acompany.com",
      "0241234567",
      "0241234568", // fax
      "Ông Nguyễn Văn A", // ownerName
      "Sản xuất", // businessType
      "Điện tử", // kindBusiness
      "10000", // zipCode
      "123 Đường A, Hà Nội",
      "Ghi chú A",
      "VIET", // lag
    ],
    [
      "CUS002",
      "Công ty TNHH B",
      "B Co., Ltd",
      "B 회사",
      "Người mua B", // buyerName
      "USER002", // customerUserCode
      "2", // customerType
      "2", // categoryCode
      "0102030405",
      "info@bcompany.vn",
      "0287654321",
      "0287654322", // fax
      "Bà Trần Thị B", // ownerName
      "Thương mại", // businessType
      "Thực phẩm", // kindBusiness
      "70000", // zipCode
      "456 Đường B, Hồ Chí Minh",
      "Ghi chú B",
      "VIET", // lag
    ],
  ],

  // Step-by-step guide (shown on the “Hướng dẫn” sheet in the template)
  instructions: [
    "HƯỚNG DẪN NHẬP KHÁCH HÀNG:",
    "- Cột 'Mã khách hàng' phải duy nhất, không chứa ký tự đặc biệt.",
    "- Email phải đúng định dạng 'example@domain.com'.",
    "- Số điện thoại và Fax chỉ bao gồm số, khoảng trắng hoặc dấu '+'.",
    "- 'Loại khách hàng' và 'Mã danh mục' nên theo quy ước của hệ thống (ví dụ: 1=Nội địa, 2=Nước ngoài).",
    "- Có thể bỏ trống các cột không bắt buộc.",
  ],

  // Custom validators (optional – extend later as needed)
  validationRules: {
    email: (value: any) => {
      const errors: string[] = []
      if (value && String(value).trim() !== "") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(String(value).trim())) {
          errors.push(`Email "${value}" không đúng định dạng`)
        }
      }
      return errors
    },
    tel: (value: any) => {
      const errors: string[] = []
      if (value && String(value).trim() !== "") {
        const phoneRegex = /^[0-9+\-\s()]+$/
        if (!phoneRegex.test(String(value).trim())) {
          errors.push(`Số điện thoại "${value}" không hợp lệ`)
        }
      }
      return errors
    },
    fax: (value: any) => {
      // NEW validation for fax
      const errors: string[] = []
      if (value && String(value).trim() !== "") {
        const faxRegex = /^[0-9+\-\s()]+$/
        if (!faxRegex.test(String(value).trim())) {
          errors.push(`Số Fax "${value}" không hợp lệ`)
        }
      }
      return errors
    },
  },
}
