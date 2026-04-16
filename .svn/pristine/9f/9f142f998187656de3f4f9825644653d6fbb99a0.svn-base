import type { FormConfig, DeleteConfig } from "@/types/form"

export const bankFormConfig: FormConfig = {
  title: "Tài khoản ngân hàng",
  description: "Thêm hoặc chỉnh sửa thông tin tài khoản ngân hàng",
  fields: [
    {
      id: "bankCode",
      name: "bankCode",
      label: "Mã ngân hàng",
      type: "text",
      required: true,
      placeholder: "Ví dụ: VCB001",
      validation: {
        pattern: "^[A-Z0-9]+$",
        maxLength: 20,
      },
      description: "Mã ngân hàng chỉ được chứa chữ cái viết hoa và số",
    },
    {
      id: "bankName",
      name: "bankName",
      label: "Tên ngân hàng",
      type: "select",
      required: true,
      options: [
        { value: "Vietcombank", label: "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)" },
        { value: "BIDV", label: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)" },
        { value: "Agribank", label: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam (Agribank)" },
        { value: "Techcombank", label: "Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)" },
        { value: "VPBank", label: "Ngân hàng TMCP Việt Nam Thịnh vượng (VPBank)" },
        { value: "ACB", label: "Ngân hàng TMCP Á Châu (ACB)" },
        { value: "MBBank", label: "Ngân hàng TMCP Quân đội (MBBank)" },
        { value: "Sacombank", label: "Ngân hàng TMCP Sài Gòn Thương tín (Sacombank)" },
      ],
    },
    {
      id: "accountNumber",
      name: "accountNumber",
      label: "Số tài khoản",
      type: "text",
      required: true,
      placeholder: "Nhập số tài khoản",
      validation: {
        pattern: "^[0-9]+$",
        minLength: 8,
        maxLength: 20,
      },
      description: "Số tài khoản chỉ được chứa số, từ 8-20 ký tự",
    },
    {
      id: "accountName",
      name: "accountName",
      label: "Tên tài khoản",
      type: "text",
      required: true,
      placeholder: "Nhập tên tài khoản",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "balance",
      name: "balance",
      label: "Số dư (VND)",
      type: "number",
      required: false,
      placeholder: "0",
      defaultValue: 0,
      validation: {
        min: 0,
      },
      description: "Số dư hiện tại của tài khoản",
    },
    {
      id: "status",
      name: "status",
      label: "Trạng thái",
      type: "select",
      required: true,
      defaultValue: "active",
      options: [
        { value: "active", label: "Đang hoạt động" },
        { value: "inactive", label: "Tạm ngưng" },
      ],
    },
  ],
  submitLabel: "Lưu",
  cancelLabel: "Hủy",
  validationRules: {
    bankCode: (value: string, formData: any, existingData: any[] = []) => {
      const errors: string[] = []
      if (value) {
        // Check for duplicate codes (exclude current item in edit mode)
        const duplicateItem = existingData.find((item) => item.bankCode === value && item.id !== formData.id)
        if (duplicateItem) {
          errors.push(`Mã ngân hàng "${value}" đã tồn tại trong hệ thống`)
        }
      }
      return errors
    },
    accountNumber: (value: string, formData: any, existingData: any[] = []) => {
      const errors: string[] = []
      if (value) {
        // Check for duplicate account numbers (exclude current item in edit mode)
        const duplicateItem = existingData.find((item) => item.accountNumber === value && item.id !== formData.id)
        if (duplicateItem) {
          errors.push(`Số tài khoản "${value}" đã tồn tại trong hệ thống`)
        }
      }
      return errors
    },
  },
}

export const bankDeleteConfig: DeleteConfig = {
  title: "Xóa tài khoản ngân hàng",
  message: "Bạn có chắc chắn muốn xóa tài khoản {item}?",
  confirmText: "Xóa",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác. Tất cả giao dịch liên quan sẽ bị ảnh hưởng.",
}

export const bankBulkDeleteConfig: DeleteConfig = {
  title: "Xóa nhiều tài khoản",
  message: "Bạn có chắc chắn muốn xóa {count} tài khoản đã chọn?", // Kept for backward compatibility
  singleMessage: "Bạn có chắc chắn muốn xóa 1 tài khoản đã chọn?", // New: Message for 1 item in bulk delete context
  multipleMessage: "Bạn có chắc chắn muốn xóa {count} tài khoản đã chọn?", // New: Message for >1 items in bulk delete context
  confirmText: "Xóa tất cả",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác. Tất cả giao dịch liên quan sẽ bị ảnh hưởng.",
}
