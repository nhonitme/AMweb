import type { FormConfig, DeleteConfig } from "@/types/form"
import { deleteCustomerAPI } from "@/api/customerApi";

export const customerFormConfig: FormConfig = {
  title: "Thông tin khách hàng",
  description: "Thêm hoặc chỉnh sửa thông tin khách hàng",
  fields: [
   
    {
      id: "customerNameVi",
      name: "nameVi",
      label: "Tên khách hàng (Tiếng Việt)",
      type: "text",
      required: true,
      placeholder: "Nhập tên tiếng Việt",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "customerNameEn",
      name: "nameEn",
      label: "Tên khách hàng (Tiếng Anh)",
      type: "text",
      required: false,
      placeholder: "Nhập tên tiếng Anh",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "customerNameKo",
      name: "nameKo",
      label: "Tên khách hàng (Tiếng Hàn)",
      type: "text",
      required: false,
      placeholder: "Nhập tên tiếng Hàn",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "buyerName", // NEW
      name: "buyerName",
      label: "Tên người mua",
      type: "text",
      required: false,
      placeholder: "Nhập tên người mua",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "customerUserCode", // Existing
      name: "customerUserCode",
      label: "Mã người dùng KH",
      type: "text",
      required: false,
      placeholder: "Mã người dùng khách hàng",
      validation: {
        maxLength: 50,
      },
    },
    {
      id: "customerType", // Existing
      name: "customerType",
      label: "Loại khách hàng",
      type: "text",
      required: true, // Bắt buộc nhập
      placeholder: "Ví dụ: 1 (Nội địa), 2 (Nước ngoài)",
      validation: {
        pattern: "^[0-9]$", // Chỉ chấp nhận 1 chữ số
        maxLength: 1,
      },
      description: "Loại khách hàng chỉ được chứa một chữ số (ví dụ: 1 hoặc 2).",
    },
    {
      id: "categoryCode", // Existing
      name: "categoryCode",
      label: "Mã danh mục",
      type: "text", // Or select
      required: true, // Bắt buộc nhập
      placeholder: "Mã danh mục khách hàng",
      validation: {
        pattern: "^[0-9]$", // Chỉ chấp nhận 1 chữ số
        maxLength: 1,
      },
      description: "Mã danh mục chỉ được chứa một chữ số.",
    },
    {
      id: "taxCode",
      name: "taxCode",
      label: "Mã số thuế",
      type: "text",
      required: true, // Bắt buộc nhập
      placeholder: "Nhập mã số thuế (10 chữ số)",
      validation: {
        pattern: "^[0-9]{10}$", // Chính xác 10 chữ số
        maxLength: 10,
        minLength: 10,
      },
      description: "Mã số thuế phải là 10 chữ số.",
    },
    {
      id: "email",
      name: "email",
      label: "Email",
      type: "email",
      required: false,
      placeholder: "Nhập địa chỉ email",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "tel",
      name: "tel",
      label: "Số điện thoại",
      type: "tel",
      required: false,
      placeholder: "Nhập số điện thoại",
      validation: {
        maxLength: 20,
      },
    },
    {
      id: "fax", // NEW
      name: "fax",
      label: "Fax",
      type: "text",
      required: false,
      placeholder: "Nhập số Fax",
      validation: {
        maxLength: 20,
      },
    },
    {
      id: "ownerName", // Existing
      name: "ownerName",
      label: "Tên chủ sở hữu",
      type: "text",
      required: false,
      placeholder: "Nhập tên chủ sở hữu",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "businessType", // Existing
      name: "businessType",
      label: "Loại hình kinh doanh",
      type: "text",
      required: false,
      placeholder: "Nhập loại hình kinh doanh",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "kindBusiness", // Existing
      name: "kindBusiness",
      label: "Ngành nghề kinh doanh",
      type: "text",
      required: false,
      placeholder: "Nhập ngành nghề kinh doanh",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "zipCode", // NEW
      name: "zipCode",
      label: "Mã bưu chính",
      type: "text",
      required: false,
      placeholder: "Nhập mã bưu chính",
      validation: {
        maxLength: 10,
      },
    },
    {
      id: "address",
      name: "address",
      label: "Địa chỉ",
      type: "textarea",
      required: true, // Bắt buộc nhập
      placeholder: "Nhập địa chỉ",
      validation: {
        maxLength: 500,
      },
    },
    {
      id: "notes",
      name: "notes",
      label: "Ghi chú",
      type: "textarea",
      required: false,
      placeholder: "Nhập ghi chú (tùy chọn)",
      validation: {
        maxLength: 500,
      },
    },
  ],
  submitLabel: "Lưu",
  cancelLabel: "Hủy",
  validationRules: {
    id: (value: string, formData: any, existingData: any[] = []) => {
      const errors: string[] = []
      if (value) {
        // Check for duplicate codes (exclude current item in edit mode)
        const duplicateItem = existingData.find((item) => item.id === value && item.id !== formData.id)
        if (duplicateItem) {
          errors.push(`Mã khách hàng "${value}" đã tồn tại trong hệ thống`)
        }
      }
      return errors
    },
    taxCode: (value: string, formData: any, existingData: any[] = []) => {
      const errors: string[] = []
      if (value) {
        // Check for duplicate tax codes (exclude current item in edit mode)
        const duplicateItem = existingData.find((item) => item.taxCode === value && item.id !== formData.id)
        if (duplicateItem) {
          errors.push(`Mã số thuế "${value}" đã tồn tại trong hệ thống`)
        }
      }
      return errors
    },
  },
}

export const customerDeleteConfig: DeleteConfig = {
  title: "Xóa khách hàng",
  message: "Bạn có chắc chắn muốn xóa khách hàng {item}?",
  confirmText: "Xóa",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị mất."
}

export const customerBulkDeleteConfig: DeleteConfig = {
  title: "Xóa nhiều khách hàng",
  message: "Bạn có chắc chắn muốn xóa {count} khách hàng đã chọn?",
  singleMessage: "Bạn có chắc chắn muốn xóa 1 khách hàng đã chọn?",
  multipleMessage: "Bạn có chắc chắn muốn xóa {count} khách hàng đã chọn?",
  confirmText: "Xóa tất cả",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị mất."
}
