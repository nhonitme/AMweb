import type { FormConfig, DeleteConfig } from "@/types/form"

export const userFormConfig: FormConfig = {
  title: "Thông tin người dùng",
  description: "Thêm hoặc chỉnh sửa thông tin người dùng",
  fields: [
    {
      id: "costCenterCode",
      name: "costCenterCode",
      label: "Đối tượng tập hợp chi phí",
      type: "select",
      required: true,
      options: [
        { value: "213", label: "213 - Phòng Kế toán" },
        { value: "214", label: "214 - Phòng Marketing" },
        { value: "215", label: "215 - Phòng IT" },
        { value: "216", label: "216 - Phòng Nhân sự" },
      ],
    },
    {
      id: "userId",
      name: "userId",
      label: "ID của người sử dụng",
      type: "text",
      required: true,
      placeholder: "Ví dụ: 089",
      validation: { maxLength: 50 },
    },
    {
      id: "password",
      name: "password",
      label: "Mật khẩu",
      type: "text",
      required: true,
      placeholder: "Nhập mật khẩu",
    },
    {
      id: "password2",
      name: "password2",
      label: "Mật khẩu 2",
      type: "text",
      required: false,
      placeholder: "Nhập mật khẩu 2",
    },
    {
      id: "name",
      name: "name",
      label: "Tên",
      type: "text",
      required: true,
      placeholder: "Ví dụ: Planning",
      validation: { maxLength: 255 },
    },
    {
      id: "phone",
      name: "phone",
      label: "Số điện thoại",
      type: "tel",
      required: false,
      placeholder: "Ví dụ: 0914xxxxxx",
      validation: { maxLength: 20 },
    },
    {
      id: "permission",
      name: "permission",
      label: "Cho phép",
      type: "select",
      required: true,
      defaultValue: "user",
      options: [
        { value: "admin", label: "Quản trị cao nhất" },
        { value: "user", label: "Người sử dụng" },
        { value: "viewer", label: "Người xem" },
      ],
    },
    {
      id: "issueDate",
      name: "issueDate",
      label: "Ngày cấp",
      type: "text",
      required: false,
      defaultValue: new Date().toISOString().split('T')[0],
    },
    {
      id: "notes",
      name: "notes",
      label: "Ghi chú",
      type: "textarea",
      required: false,
      placeholder: "Nhập ghi chú",
      validation: { maxLength: 500 },
    },
  ],
  submitLabel: "Lưu",
  cancelLabel: "Hủy",
  validationRules: {
    userId: (value: string, formData: any, existingData: any[] = []) => {
      const errors: string[] = []
      if (value) {
        const duplicateItem = existingData.find((item) => item.userId === value && item.id !== formData.id)
        if (duplicateItem) {
          errors.push(`ID người dùng "${value}" đã tồn tại trong hệ thống`)
        }
      }
      return errors
    },
  },
}

export const userDeleteConfig: DeleteConfig = {
  title: "Xóa người dùng",
  message: "Bạn có chắc chắn muốn xóa người dùng {item}?",
  confirmText: "Xóa",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị mất.",
}

export const userBulkDeleteConfig: DeleteConfig = {
  title: "Xóa nhiều người dùng",
  message: "Bạn có chắc chắn muốn xóa {count} người dùng đã chọn?",
  singleMessage: "Bạn có chắc chắn muốn xóa 1 người dùng đã chọn?",
  multipleMessage: "Bạn có chắc chắn muốn xóa {count} người dùng đã chọn?",
  confirmText: "Xóa tất cả",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị mất.",
}