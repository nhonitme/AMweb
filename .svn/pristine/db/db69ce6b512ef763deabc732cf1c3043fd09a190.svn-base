"use client"

import { useState, useCallback, useEffect } from "react"
import { X, Save, AlertCircle, Info, Loader2 } from "lucide-react"

interface KhoFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void> | void
  initialData?: any
  existingData?: any[]
  mode: "add" | "edit"
}

export default function KhoFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  existingData = [],
  mode,
}: KhoFormModalProps) {
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (isOpen) {
      const defaultData: any = {
        PRODUCT_CD: mode === "edit" ? initialData.PRODUCT_CD || "" : "",
        DivisionCD: mode === "edit" ? initialData.DivisionCD || "" : "",
        PRODUCTKIND_CD: mode === "edit" ? initialData.PRODUCTKIND_CD || "" : "",
        DepartmentCD: mode === "edit" ? initialData.DepartmentCD || "" : "",
        PRODUCT_NM: mode === "edit" ? initialData.PRODUCT_NM || "" : "",
        PRODUCT_NM_ENG: mode === "edit" ? initialData.PRODUCT_NM_ENG || "" : "",
        PRODUCT_NM_KOR: mode === "edit" ? initialData.PRODUCT_NM_KOR || "" : "",
        InboundUnitCD: mode === "edit" ? initialData.InboundUnitCD || "" : "",
        OutboundUnitCD: mode === "edit" ? initialData.OutboundUnitCD || "" : "",
        materialInputUnitCD: mode === "edit" ? initialData.materialInputUnitCD || "" : "",
        StockUnitCD: mode === "edit" ? initialData.StockUnitCD || "" : "",
        InboundQuantity: mode === "edit" ? initialData.InboundQuantity || 0 : 0,
        OutboundQuantity: mode === "edit" ? initialData.OutboundQuantity || 0 : 0,
        MaterialInputQuantity: mode === "edit" ? initialData.MaterialInputQuantity || 0 : 0,
        StoreCD: mode === "edit" ? initialData.StoreCD || "" : "",
        StandardCD: mode === "edit" ? initialData.StandardCD || "" : "",
        FitnessStock: mode === "edit" ? initialData.FitnessStock || 0 : 0,
        UnitPrice: mode === "edit" ? initialData.UnitPrice || 0 : 0,
        FcUnitPirce: mode === "edit" ? initialData.FcUnitPirce || 0 : 0,
        ExRate: mode === "edit" ? initialData.ExRate || 0 : 0,
        lblCCType: mode === "edit" ? initialData.lblCCType || "" : "",
        lblFCType: mode === "edit" ? initialData.lblFCType || "" : "",
        txtSummary: mode === "edit" ? initialData.txtSummary || "" : "",
        rgUseNotUse: mode === "edit" ? initialData.rgUseNotUse || "1" : "1",
        HaveChildBOM: mode === "edit" ? initialData.HaveChildBOM || "" : "",
        Origin: mode === "edit" ? initialData.Origin || "" : "",
      }
      if (mode === "edit" && initialData.id) {
        defaultData.id = initialData.id
      }
      setFormData(defaultData)
      setErrors({})
      setTouched({})
    }
  }, [isOpen, initialData, mode])

  const validateField = useCallback(
    (fieldName: string, value: any) => {
      const fieldErrors: string[] = []

      switch (fieldName) {
        case "PRODUCT_CD":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Mã sản phẩm là bắt buộc")
          } else {
            if (String(value).length > 50) {
              fieldErrors.push("Mã sản phẩm không được vượt quá 50 ký tự")
            }
            // Check duplicate
            const duplicateItem = existingData.find((item) => item.PRODUCT_CD === value && item.id !== formData.id)
            if (duplicateItem) {
              fieldErrors.push(`Mã sản phẩm "${value}" đã tồn tại trong hệ thống`)
            }
          }
          break
        case "PRODUCT_NM":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Tên sản phẩm (VI) là bắt buộc")
          } else if (String(value).length > 255) {
            fieldErrors.push("Tên sản phẩm không được vượt quá 255 ký tự")
          }
          break
        case "PRODUCT_NM_ENG":
          if (value && String(value).length > 255) {
            fieldErrors.push("Tên sản phẩm (EN) không được vượt quá 255 ký tự")
          }
          break
        case "PRODUCT_NM_KOR":
          if (value && String(value).length > 255) {
            fieldErrors.push("Tên sản phẩm (KO) không được vượt quá 255 ký tự")
          }
          break
        case "txtSummary":
          if (value && String(value).length > 500) {
            fieldErrors.push("Ghi chú không được vượt quá 500 ký tự")
          }
          break
      }

      return fieldErrors
    },
    [existingData, formData.id],
  )

  const validateForm = useCallback(() => {
    const newErrors: { [key: string]: string[] } = {}
    let hasErrors = false

    const requiredFields = ["PRODUCT_CD", "PRODUCT_NM"]
    requiredFields.forEach((field) => {
      const fieldErrors = validateField(field, formData[field])
      if (fieldErrors.length > 0) {
        newErrors[field] = fieldErrors
        hasErrors = true
      }
    })

    setErrors(newErrors)
    return !hasErrors
  }, [formData, validateField])

  const handleFieldChange = useCallback(
    (fieldName: string, value: any) => {
      setFormData((prev: any) => ({ ...prev, [fieldName]: value }))
      if (touched[fieldName]) {
        const fieldErrors = validateField(fieldName, value)
        setErrors((prev) => ({
          ...prev,
          [fieldName]: fieldErrors,
        }))
      }
    },
    [touched, validateField],
  )

  const handleFieldBlur = useCallback(
    (fieldName: string) => {
      setTouched((prev) => ({ ...prev, [fieldName]: true }))
      const fieldErrors = validateField(fieldName, formData[fieldName])
      setErrors((prev) => ({
        ...prev,
        [fieldName]: fieldErrors,
      }))
    },
    [formData, validateField],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      
      // Mark all required fields as touched
      const allTouched: { [key: string]: boolean } = {}
      const requiredFields = ["PRODUCT_CD", "PRODUCT_NM"]
      requiredFields.forEach((field) => {
        allTouched[field] = true
      })
      setTouched(allTouched)

      if (!validateForm()) {
        return
      }

      setIsSubmitting(true)
      try {
        await onSubmit(formData)
        onClose()
      } catch (error) {
        console.error("Form submission error:", error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, validateForm, onSubmit, onClose],
  )

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose()
    }
  }, [isSubmitting, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {mode === "add" ? "Thêm sản phẩm kho hàng" : "Chỉnh sửa sản phẩm kho hàng"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {mode === "add" ? "Thêm mới sản phẩm vào kho hàng" : "Cập nhật thông tin sản phẩm kho hàng"}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-6 p-6 flex-1 min-h-0 overflow-y-auto">
            {/* Thông tin cơ bản */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-blue-900 mb-4">Thông tin cơ bản sản phẩm</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mã sản phẩm */}
                <div className="space-y-2">
                  <label htmlFor="PRODUCT_CD" className="block font-medium text-gray-700">
                    Mã sản phẩm <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    id="PRODUCT_CD"
                    name="PRODUCT_CD"
                    type="text"
                    value={formData.PRODUCT_CD || ""}
                    onChange={(e) => handleFieldChange("PRODUCT_CD", e.target.value)}
                    onBlur={() => handleFieldBlur("PRODUCT_CD")}
                    placeholder="Nhập mã sản phẩm"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.PRODUCT_CD?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.PRODUCT_CD?.length > 0 && (
                    <div className="space-y-1">
                      {errors.PRODUCT_CD.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mã bộ phận */}
                <div className="space-y-2">
                  <label htmlFor="DivisionCD" className="block font-medium text-gray-700">
                    Mã bộ phận
                  </label>
                  <input
                    id="DivisionCD"
                    name="DivisionCD"
                    type="text"
                    value={formData.DivisionCD || ""}
                    onChange={(e) => handleFieldChange("DivisionCD", e.target.value)}
                    placeholder="Nhập mã bộ phận"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                {/* Mã loại sản phẩm */}
                <div className="space-y-2">
                  <label htmlFor="PRODUCTKIND_CD" className="block font-medium text-gray-700">
                    Mã loại sản phẩm
                  </label>
                  <input
                    id="PRODUCTKIND_CD"
                    name="PRODUCTKIND_CD"
                    type="text"
                    value={formData.PRODUCTKIND_CD || ""}
                    onChange={(e) => handleFieldChange("PRODUCTKIND_CD", e.target.value)}
                    placeholder="Nhập mã loại sản phẩm"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                {/* Mã phòng ban */}
                <div className="space-y-2">
                  <label htmlFor="DepartmentCD" className="block font-medium text-gray-700">
                    Mã phòng ban
                  </label>
                  <input
                    id="DepartmentCD"
                    name="DepartmentCD"
                    type="text"
                    value={formData.DepartmentCD || ""}
                    onChange={(e) => handleFieldChange("DepartmentCD", e.target.value)}
                    placeholder="Nhập mã phòng ban"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Tên sản phẩm */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-green-900 mb-4">Tên sản phẩm đa ngôn ngữ</h4>
              <div className="grid grid-cols-1 gap-4">
                {/* Tên sản phẩm (VI) */}
                <div className="space-y-2">
                  <label htmlFor="PRODUCT_NM" className="block font-medium text-gray-700">
                    Tên sản phẩm (VI) <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    id="PRODUCT_NM"
                    name="PRODUCT_NM"
                    type="text"
                    value={formData.PRODUCT_NM || ""}
                    onChange={(e) => handleFieldChange("PRODUCT_NM", e.target.value)}
                    onBlur={() => handleFieldBlur("PRODUCT_NM")}
                    placeholder="Nhập tên sản phẩm tiếng Việt"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.PRODUCT_NM?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.PRODUCT_NM?.length > 0 && (
                    <div className="space-y-1">
                      {errors.PRODUCT_NM.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tên sản phẩm (EN) */}
                <div className="space-y-2">
                  <label htmlFor="PRODUCT_NM_ENG" className="block font-medium text-gray-700">
                    Tên sản phẩm (EN)
                  </label>
                  <input
                    id="PRODUCT_NM_ENG"
                    name="PRODUCT_NM_ENG"
                    type="text"
                    value={formData.PRODUCT_NM_ENG || ""}
                    onChange={(e) => handleFieldChange("PRODUCT_NM_ENG", e.target.value)}
                    placeholder="Nhập tên sản phẩm tiếng Anh"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                {/* Tên sản phẩm (KO) */}
                <div className="space-y-2">
                  <label htmlFor="PRODUCT_NM_KOR" className="block font-medium text-gray-700">
                    Tên sản phẩm (KO)
                  </label>
                  <input
                    id="PRODUCT_NM_KOR"
                    name="PRODUCT_NM_KOR"
                    type="text"
                    value={formData.PRODUCT_NM_KOR || ""}
                    onChange={(e) => handleFieldChange("PRODUCT_NM_KOR", e.target.value)}
                    placeholder="Nhập tên sản phẩm tiếng Hàn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Đơn vị tính */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-amber-900 mb-4">Đơn vị tính</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="InboundUnitCD" className="block font-medium text-gray-700">
                    Đơn vị nhập kho
                  </label>
                  <input
                    id="InboundUnitCD"
                    name="InboundUnitCD"
                    type="text"
                    value={formData.InboundUnitCD || ""}
                    onChange={(e) => handleFieldChange("InboundUnitCD", e.target.value)}
                    placeholder="Nhập đơn vị nhập kho"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="OutboundUnitCD" className="block font-medium text-gray-700">
                    Đơn vị xuất kho
                  </label>
                  <input
                    id="OutboundUnitCD"
                    name="OutboundUnitCD"
                    type="text"
                    value={formData.OutboundUnitCD || ""}
                    onChange={(e) => handleFieldChange("OutboundUnitCD", e.target.value)}
                    placeholder="Nhập đơn vị xuất kho"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="materialInputUnitCD" className="block font-medium text-gray-700">
                    Đơn vị nhập NVL
                  </label>
                  <input
                    id="materialInputUnitCD"
                    name="materialInputUnitCD"
                    type="text"
                    value={formData.materialInputUnitCD || ""}
                    onChange={(e) => handleFieldChange("materialInputUnitCD", e.target.value)}
                    placeholder="Nhập đơn vị nhập NVL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="StockUnitCD" className="block font-medium text-gray-700">
                    Đơn vị tồn kho
                  </label>
                  <input
                    id="StockUnitCD"
                    name="StockUnitCD"
                    type="text"
                    value={formData.StockUnitCD || ""}
                    onChange={(e) => handleFieldChange("StockUnitCD", e.target.value)}
                    placeholder="Nhập đơn vị tồn kho"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Số lượng và giá */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-purple-900 mb-4">Số lượng và giá cả</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="InboundQuantity" className="block font-medium text-gray-700">
                    Số lượng nhập kho
                  </label>
                  <input
                    id="InboundQuantity"
                    name="InboundQuantity"
                    type="number"
                    value={formData.InboundQuantity || 0}
                    onChange={(e) => handleFieldChange("InboundQuantity", e.target.value)}
                    placeholder="Nhập số lượng nhập kho"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="OutboundQuantity" className="block font-medium text-gray-700">
                    Số lượng xuất kho
                  </label>
                  <input
                    id="OutboundQuantity"
                    name="OutboundQuantity"
                    type="number"
                    value={formData.OutboundQuantity || 0}
                    onChange={(e) => handleFieldChange("OutboundQuantity", e.target.value)}
                    placeholder="Nhập số lượng xuất kho"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="UnitPrice" className="block font-medium text-gray-700">
                    Đơn giá
                  </label>
                  <input
                    id="UnitPrice"
                    name="UnitPrice"
                    type="number"
                    value={formData.UnitPrice || 0}
                    onChange={(e) => handleFieldChange("UnitPrice", e.target.value)}
                    placeholder="Nhập đơn giá"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Thông tin khác */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Thông tin bổ sung</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="StoreCD" className="block font-medium text-gray-700">
                    Mã kho lưu trữ
                  </label>
                  <input
                    id="StoreCD"
                    name="StoreCD"
                    type="text"
                    value={formData.StoreCD || ""}
                    onChange={(e) => handleFieldChange("StoreCD", e.target.value)}
                    placeholder="Nhập mã kho lưu trữ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="Origin" className="block font-medium text-gray-700">
                    Xuất xứ
                  </label>
                  <input
                    id="Origin"
                    name="Origin"
                    type="text"
                    value={formData.Origin || ""}
                    onChange={(e) => handleFieldChange("Origin", e.target.value)}
                    placeholder="Nhập xuất xứ"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="rgUseNotUse" className="block font-medium text-gray-700">
                    Sử dụng/Không sử dụng
                  </label>
                  <select
                    id="rgUseNotUse"
                    name="rgUseNotUse"
                    value={formData.rgUseNotUse || "1"}
                    onChange={(e) => handleFieldChange("rgUseNotUse", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="1">Sử dụng</option>
                    <option value="0">Không sử dụng</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="HaveChildBOM" className="block font-medium text-gray-700">
                    Có BOM con
                  </label>
                  <input
                    id="HaveChildBOM"
                    name="HaveChildBOM"
                    type="text"
                    value={formData.HaveChildBOM || ""}
                    onChange={(e) => handleFieldChange("HaveChildBOM", e.target.value)}
                    placeholder="Có BOM con"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Ghi chú */}
            <div className="space-y-2">
              <label htmlFor="txtSummary" className="block font-medium text-gray-700">
                Ghi chú
              </label>
              <textarea
                id="txtSummary"
                name="txtSummary"
                value={formData.txtSummary || ""}
                onChange={(e) => handleFieldChange("txtSummary", e.target.value)}
                onBlur={() => handleFieldBlur("txtSummary")}
                placeholder="Nhập ghi chú"
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.txtSummary?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.txtSummary?.length > 0 && (
                <div className="space-y-1">
                  {errors.txtSummary.map((error, index) => (
                    <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-white flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:block">Hủy</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:block">Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:block">Lưu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
