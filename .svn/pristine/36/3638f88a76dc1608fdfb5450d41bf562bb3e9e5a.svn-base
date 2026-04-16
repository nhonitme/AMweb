import type { FormConfig, DeleteConfig } from "@/types/form"

export const costObjectFormConfig: FormConfig = {
  title: "Đối tượng tập hợp chi phí",
  description: "Thêm hoặc chỉnh sửa thông tin đối tượng tập hợp chi phí",
  fields: [
    {
      id: "code",
      name: "code",
      label: "Mã đối tượng",
      type: "text",
      required: true,
      placeholder: "Ví dụ: CC001",
      validation: {
        pattern: "^[A-Z0-9]+$",
        maxLength: 20,
      },
      description: "Mã đối tượng chỉ được chứa chữ cái viết hoa và số",
    },
    {
      id: "nameVi",
      name: "nameVi",
      label: "Tên tiếng Việt",
      type: "text",
      required: true,
      placeholder: "Nhập tên tiếng Việt",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "nameEn",
      name: "nameEn",
      label: "Tên tiếng Anh",
      type: "text",
      required: false,
      placeholder: "Nhập tên tiếng Anh",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "nameKo",
      name: "nameKo",
      label: "Tên tiếng Hàn",
      type: "text",
      required: false,
      placeholder: "Nhập tên tiếng Hàn",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "parentObject",
      name: "parentObject",
      label: "Đối tượng gốc",
      type: "select",
      required: false,
      defaultValue: "0",
      description: "Chọn đối tượng cha (để trống nếu là đối tượng gốc)",
      options: [], // Will be populated dynamically
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
    code: (value: string, formData: any, existingData: any[] = []) => {
      const errors: string[] = []
      if (value) {
        // Check for duplicate codes (exclude current item in edit mode)
        const duplicateItem = existingData.find((item) => item.code === value && item.id !== formData.id)
        if (duplicateItem) {
          errors.push(`Mã đối tượng "${value}" đã tồn tại trong hệ thống`)
        }
      }
      return errors
    },
    parentObject: (value: string, formData: any, existingData: any[] = []) => {
      const errors: string[] = []
      if (value && value !== "0") {
        // Check if parent exists
        const parentExists = existingData.find((item) => item.id === value)
        if (!parentExists) {
          errors.push("Đối tượng gốc được chọn không tồn tại")
        }

        // Prevent self-reference
        if (value === formData.id) {
          errors.push("Không thể chọn chính mình làm đối tượng gốc")
        }
      }
      return errors
    },
  },
}

export const costObjectDeleteConfig: DeleteConfig = {
  title: "Xóa đối tượng tập hợp chi phí",
  message: "Bạn có chắc chắn muốn xóa {item}?", // This message is for single delete
  confirmText: "Xóa",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị mất.",
}

export const costObjectBulkDeleteConfig: DeleteConfig = {
  title: "Xóa nhiều đối tượng",
  message: "Bạn có chắc chắn muốn xóa {count} đối tượng đã chọn?", // Kept for backward compatibility, but new fields are preferred
  singleMessage: "Bạn có chắc chắn muốn xóa 1 đối tượng đã chọn?", // New: Message for 1 item in bulk delete context
  multipleMessage: "Bạn có chắc chắn muốn xóa {count} đối tượng đã chọn?", // New: Message for >1 items in bulk delete context
  confirmText: "Xóa tất cả",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị mất.",
}
