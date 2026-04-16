"use client"

import { useState, useCallback, useEffect } from "react"
import { X, Save, AlertCircle, Info, Loader2 } from "lucide-react"

interface MaterialGroupFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void> | void
  initialData?: any
  existingData?: any[]
  mode: "add" | "edit"
}

export default function MaterialGroupFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  existingData = [],
  mode,
}: MaterialGroupFormModalProps) {
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (isOpen) {
      const defaultData: any = {
        PRODUCTKIND_CD: mode === "edit" ? initialData.PRODUCTKIND_CD || "" : "",
        PRODUCTKIND_NM: mode === "edit" ? initialData.PRODUCTKIND_NM || "" : "",
        PRODUCTKIND_NM_ENG: mode === "edit" ? initialData.PRODUCTKIND_NM_ENG || "" : "",
        PRODUCTKIND_NM_KOR: mode === "edit" ? initialData.PRODUCTKIND_NM_KOR || "" : "",
        REMARK: mode === "edit" ? initialData.REMARK || "" : "",
        COUNT: mode === "edit" ? initialData.COUNT || 0 : 0,
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
        case "PRODUCTKIND_NM":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Tên nhóm vật tư là bắt buộc")
          } else {
            // Check for duplicate material group name (ignore case, trim)
            const duplicateItem = existingData.find(
              (item) => item.PRODUCTKIND_NM && item.PRODUCTKIND_NM.trim().toLowerCase() === value.trim().toLowerCase() && item.id !== formData.id
            )
            if (duplicateItem) {
              fieldErrors.push(`Tên nhóm vật tư "${value}" đã tồn tại trong hệ thống`)
            }
          }
          break
        case "COUNT":
          if (value && isNaN(Number(value))) {
            fieldErrors.push("Số lượng phải là số")
          } else if (Number(value) < 0) {
            fieldErrors.push("Số lượng phải lớn hơn hoặc bằng 0")
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

    const fields = ["PRODUCTKIND_NM", "COUNT"]
    fields.forEach((field) => {
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
      
      // Mark all fields as touched
      const allTouched: { [key: string]: boolean } = {}
      const fields = ["PRODUCTKIND_NM", "COUNT"]
      fields.forEach((field) => {
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
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {mode === "add" ? "Thêm nhóm vật tư" : "Chỉnh sửa nhóm vật tư"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {mode === "add" ? "Thêm mới nhóm vật tư vào hệ thống" : "Cập nhật thông tin nhóm vật tư"}
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
              <h4 className="text-lg font-medium text-blue-900 mb-4">Thông tin nhóm vật tư</h4>
              <div className="grid grid-cols-1 gap-4">
                {/* Tên nhóm vật tư */}
                <div className="space-y-2">
                  <label htmlFor="PRODUCTKIND_NM" className="block font-medium text-gray-700">
                    Tên nhóm vật tư <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    id="PRODUCTKIND_NM"
                    name="PRODUCTKIND_NM"
                    type="text"
                    value={formData.PRODUCTKIND_NM || ""}
                    onChange={(e) => handleFieldChange("PRODUCTKIND_NM", e.target.value)}
                    onBlur={() => handleFieldBlur("PRODUCTKIND_NM")}
                    placeholder="Nhập tên nhóm vật tư"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.PRODUCTKIND_NM?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.PRODUCTKIND_NM?.length > 0 && (
                    <div className="space-y-1">
                      {errors.PRODUCTKIND_NM.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tên nhóm vật tư (ENG) */}
                <div className="space-y-2">
                  <label htmlFor="PRODUCTKIND_NM_ENG" className="block font-medium text-gray-700">
                    Tên nhóm vật tư (ENG)
                  </label>
                  <input
                    id="PRODUCTKIND_NM_ENG"
                    name="PRODUCTKIND_NM_ENG"
                    type="text"
                    value={formData.PRODUCTKIND_NM_ENG || ""}
                    onChange={(e) => handleFieldChange("PRODUCTKIND_NM_ENG", e.target.value)}
                    placeholder="Nhập tên nhóm vật tư tiếng Anh"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>

                {/* Tên nhóm vật tư (KOR) */}
                <div className="space-y-2">
                  <label htmlFor="PRODUCTKIND_NM_KOR" className="block font-medium text-gray-700">
                    Tên nhóm vật tư (KOR)
                  </label>
                  <input
                    id="PRODUCTKIND_NM_KOR"
                    name="PRODUCTKIND_NM_KOR"
                    type="text"
                    value={formData.PRODUCTKIND_NM_KOR || ""}
                    onChange={(e) => handleFieldChange("PRODUCTKIND_NM_KOR", e.target.value)}
                    placeholder="Nhập tên nhóm vật tư tiếng Hàn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Thông tin bổ sung */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-green-900 mb-4">Thông tin bổ sung</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Số lượng */}
                <div className="space-y-2">
                  <label htmlFor="COUNT" className="block font-medium text-gray-700">
                    Số lượng
                  </label>
                  <input
                    id="COUNT"
                    name="COUNT"
                    type="number"
                    value={formData.COUNT || 0}
                    onChange={(e) => handleFieldChange("COUNT", e.target.value)}
                    onBlur={() => handleFieldBlur("COUNT")}
                    placeholder="Nhập số lượng"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.COUNT?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.COUNT?.length > 0 && (
                    <div className="space-y-1">
                      {errors.COUNT.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ghi chú */}
                <div className="space-y-2">
                  <label htmlFor="REMARK" className="block font-medium text-gray-700">
                    Ghi chú
                  </label>
                  <textarea
                    id="REMARK"
                    name="REMARK"
                    value={formData.REMARK || ""}
                    onChange={(e) => handleFieldChange("REMARK", e.target.value)}
                    placeholder="Nhập ghi chú"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
              </div>
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
