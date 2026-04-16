import type { FormConfig, DeleteConfig } from "@/types/form"
// import { deleteKhoAPI } from "@/api/khoApi"

export const khoFormConfig: FormConfig = {
  title: "Thông tin sản phẩm kho hàng",
  description: "Thêm hoặc chỉnh sửa thông tin sản phẩm kho hàng",
  fields: [
    { id: "productCode", name: "PRODUCT_CD", label: "Mã sản phẩm", type: "text", required: true, placeholder: "Nhập mã sản phẩm", validation: { maxLength: 50 } },
    { id: "divisionCode", name: "DivisionCD", label: "Mã bộ phận", type: "text", required: false, placeholder: "Nhập mã bộ phận", validation: { maxLength: 50 } },
    { id: "productKindCode", name: "PRODUCTKIND_CD", label: "Mã loại sản phẩm", type: "text", required: false, placeholder: "Nhập mã loại sản phẩm", validation: { maxLength: 50 } },
    { id: "departmentCode", name: "DepartmentCD", label: "Mã phòng ban", type: "text", required: false, placeholder: "Nhập mã phòng ban", validation: { maxLength: 50 } },
    { id: "productNameVi", name: "PRODUCT_NM", label: "Tên sản phẩm (VI)", type: "text", required: true, placeholder: "Nhập tên sản phẩm tiếng Việt", validation: { maxLength: 255 } },
    { id: "productNameEng", name: "PRODUCT_NM_ENG", label: "Tên sản phẩm (EN)", type: "text", required: false, placeholder: "Nhập tên sản phẩm tiếng Anh", validation: { maxLength: 255 } },
    { id: "productNameKor", name: "PRODUCT_NM_KOR", label: "Tên sản phẩm (KO)", type: "text", required: false, placeholder: "Nhập tên sản phẩm tiếng Hàn", validation: { maxLength: 255 } },
    { id: "inboundUnitCode", name: "InboundUnitCD", label: "Đơn vị nhập kho", type: "text", required: false, placeholder: "Nhập đơn vị nhập kho", validation: { maxLength: 50 } },
    { id: "outboundUnitCode", name: "OutboundUnitCD", label: "Đơn vị xuất kho", type: "text", required: false, placeholder: "Nhập đơn vị xuất kho", validation: { maxLength: 50 } },
    { id: "materialInputUnitCode", name: "materialInputUnitCD", label: "Đơn vị nhập NVL", type: "text", required: false, placeholder: "Nhập đơn vị nhập NVL", validation: { maxLength: 50 } },
    { id: "stockUnitCode", name: "StockUnitCD", label: "Đơn vị tồn kho", type: "text", required: false, placeholder: "Nhập đơn vị tồn kho", validation: { maxLength: 50 } },
    { id: "inboundQuantity", name: "InboundQuantity", label: "Số lượng nhập kho", type: "number", required: false, placeholder: "Nhập số lượng nhập kho" },
    { id: "outboundQuantity", name: "OutboundQuantity", label: "Số lượng xuất kho", type: "number", required: false, placeholder: "Nhập số lượng xuất kho" },
    { id: "materialInputQuantity", name: "MaterialInputQuantity", label: "Số lượng nhập NVL", type: "number", required: false, placeholder: "Nhập số lượng nhập NVL" },
    { id: "storeCode", name: "StoreCD", label: "Mã kho lưu trữ", type: "text", required: false, placeholder: "Nhập mã kho lưu trữ", validation: { maxLength: 50 } },
    { id: "standardCode", name: "StandardCD", label: "Mã tiêu chuẩn", type: "text", required: false, placeholder: "Nhập mã tiêu chuẩn", validation: { maxLength: 50 } },
    { id: "fitnessStock", name: "FitnessStock", label: "Tồn kho khả dụng", type: "number", required: false, placeholder: "Nhập tồn kho khả dụng" },
    { id: "unitPrice", name: "UnitPrice", label: "Đơn giá", type: "number", required: false, placeholder: "Nhập đơn giá" },
    { id: "fcUnitPrice", name: "FcUnitPirce", label: "Đơn giá ngoại tệ", type: "number", required: false, placeholder: "Nhập đơn giá ngoại tệ" },
    { id: "exchangeRate", name: "ExRate", label: "Tỷ giá", type: "number", required: false, placeholder: "Nhập tỷ giá" },
    { id: "lblCCType", name: "lblCCType", label: "Loại CC", type: "text", required: false, placeholder: "Nhập loại CC", validation: { maxLength: 50 } },
    { id: "lblFCType", name: "lblFCType", label: "Loại ngoại tệ", type: "text", required: false, placeholder: "Nhập loại ngoại tệ", validation: { maxLength: 50 } },
    { id: "summary", name: "txtSummary", label: "Ghi chú", type: "textarea", required: false, placeholder: "Nhập ghi chú", validation: { maxLength: 500 } },
    { id: "useNotUse", name: "rgUseNotUse", label: "Sử dụng/Không sử dụng", type: "select", required: false, options: [ { value: "1", label: "Sử dụng" }, { value: "0", label: "Không sử dụng" } ] },
    { id: "haveChildBOM", name: "HaveChildBOM", label: "Có BOM con", type: "text", required: false, placeholder: "Có BOM con" },
    { id: "origin", name: "Origin", label: "Xuất xứ", type: "text", required: false, placeholder: "Nhập xuất xứ", validation: { maxLength: 100 } },
  ],
  submitLabel: "Lưu",
  cancelLabel: "Hủy",
  validationRules: {
    PRODUCT_CD: (value: string, formData: any, existingData: any[] = []) => {
      const errors: string[] = []
      if (value) {
        const duplicateItem = existingData.find((item) => item.PRODUCT_CD === value && item.id !== formData.id)
        if (duplicateItem) {
          errors.push(`Mã sản phẩm "${value}" đã tồn tại trong hệ thống`)
        }
      }
      return errors
    },
  },
}

export const khoDeleteConfig: DeleteConfig = {
  title: "Xóa sản phẩm kho hàng",
  message: "Bạn có chắc chắn muốn xóa sản phẩm kho hàng {item}?",
  confirmText: "Xóa",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị mất."
}

export const khoBulkDeleteConfig: DeleteConfig = {
  title: "Xóa nhiều sản phẩm kho hàng",
  message: "Bạn có chắc chắn muốn xóa {count} sản phẩm kho hàng đã chọn?",
  singleMessage: "Bạn có chắc chắn muốn xóa 1 sản phẩm kho hàng đã chọn?",
  multipleMessage: "Bạn có chắc chắn muốn xóa {count} sản phẩm kho hàng đã chọn?",
  confirmText: "Xóa tất cả",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan sẽ bị mất.",
}
