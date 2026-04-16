"use client"

import { useState, useCallback, useEffect } from "react"
import { X, Save, AlertCircle, Info, Loader2 } from "lucide-react"
import type { FormConfig } from "@/types/form"

interface CostCenterFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void> | void
  initialData?: any
  existingData?: any[]
  mode: "add" | "edit"
}

interface DoiTuongTapHopChiPhi {
  id: string
  code: string
  nameVi: string
  nameEn: string
  nameKo: string
  parentObject: string
  notes: string
  createdDate: string
  status: "active" | "inactive"
}

export default function CostCenterFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  existingData = [],
  mode,
}: CostCenterFormModalProps) {
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (isOpen) {
      const defaultData: any = {
        code: mode === "edit" ? initialData.code || "" : "",
        nameVi: mode === "edit" ? initialData.nameVi || "" : "",
        nameEn: mode === "edit" ? initialData.nameEn || "" : "",
        nameKo: mode === "edit" ? initialData.nameKo || "" : "",
        parentObject: mode === "edit" ? initialData.parentObject || "0" : "0",
        notes: mode === "edit" ? initialData.notes || "" : "",
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
        case "code":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Mã đối tượng là bắt buộc")
          } else {
            // Check pattern
            if (!/^[A-Z0-9]+$/.test(value)) {
              fieldErrors.push("Mã đối tượng chỉ được chứa chữ cái viết hoa và số")
            }
            if (String(value).length > 20) {
              fieldErrors.push("Mã đối tượng không được vượt quá 20 ký tự")
            }
            // Check duplicate
            const duplicateItem = existingData.find((item) => item.code === value && item.id !== formData.id)
            if (duplicateItem) {
              fieldErrors.push(`Mã đối tượng "${value}" đã tồn tại trong hệ thống`)
            }
          }
          break
        case "nameVi":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Tên tiếng Việt là bắt buộc")
          } else if (String(value).length > 255) {
            fieldErrors.push("Tên tiếng Việt không được vượt quá 255 ký tự")
          }
          break
        case "nameEn":
          if (value && String(value).length > 255) {
            fieldErrors.push("Tên tiếng Anh không được vượt quá 255 ký tự")
          }
          break
        case "nameKo":
          if (value && String(value).length > 255) {
            fieldErrors.push("Tên tiếng Hàn không được vượt quá 255 ký tự")
          }
          break
        case "parentObject":
          if (value && value !== "0") {
            const parentExists = existingData.find((item) => item.id === value)
            if (!parentExists) {
              fieldErrors.push("Đối tượng gốc được chọn không tồn tại")
            }
            if (value === formData.id) {
              fieldErrors.push("Không thể chọn chính mình làm đối tượng gốc")
            }
          }
          break
        case "notes":
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

    const fields = ["code", "nameVi", "nameEn", "nameKo", "parentObject", "notes"]
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
      const fields = ["code", "nameVi", "nameEn", "nameKo", "parentObject", "notes"]
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

  // Prepare parent options
  const parentOptions = [
    { value: "0", label: "Không có cha (đối tượng gốc)" },
    ...existingData
      .filter((item) => item.id !== formData.id)
      .map((item) => ({
        value: item.id,
        label: `${item.code} - ${item.nameVi || item.name || item.id}`,
      })),
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {mode === "add" ? "Thêm đối tượng tập hợp chi phí" : "Chỉnh sửa đối tượng tập hợp chi phí"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {mode === "add" ? "Thêm mới thông tin đối tượng tập hợp chi phí" : "Cập nhật thông tin đối tượng tập hợp chi phí"}
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
            {/* Mã đối tượng */}
            <div className="space-y-2">
              <label htmlFor="code" className="block font-medium text-gray-700">
                Mã đối tượng <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                id="code"
                name="code"
                type="text"
                value={formData.code || ""}
                onChange={(e) => handleFieldChange("code", e.target.value)}
                onBlur={() => handleFieldBlur("code")}
                placeholder="Ví dụ: CC001"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.code?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              />
              <div className="flex items-start space-x-2 text-xs text-gray-600">
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                <span>Mã đối tượng chỉ được chứa chữ cái viết hoa và số</span>
              </div>
              {errors.code?.length > 0 && (
                <div className="space-y-1">
                  {errors.code.map((error, index) => (
                    <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tên tiếng Việt */}
            <div className="space-y-2">
              <label htmlFor="nameVi" className="block font-medium text-gray-700">
                Tên tiếng Việt <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                id="nameVi"
                name="nameVi"
                type="text"
                value={formData.nameVi || ""}
                onChange={(e) => handleFieldChange("nameVi", e.target.value)}
                onBlur={() => handleFieldBlur("nameVi")}
                placeholder="Nhập tên tiếng Việt"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.nameVi?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.nameVi?.length > 0 && (
                <div className="space-y-1">
                  {errors.nameVi.map((error, index) => (
                    <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tên tiếng Anh */}
            <div className="space-y-2">
              <label htmlFor="nameEn" className="block font-medium text-gray-700">
                Tên tiếng Anh
              </label>
              <input
                id="nameEn"
                name="nameEn"
                type="text"
                value={formData.nameEn || ""}
                onChange={(e) => handleFieldChange("nameEn", e.target.value)}
                onBlur={() => handleFieldBlur("nameEn")}
                placeholder="Nhập tên tiếng Anh"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.nameEn?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.nameEn?.length > 0 && (
                <div className="space-y-1">
                  {errors.nameEn.map((error, index) => (
                    <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tên tiếng Hàn */}
            <div className="space-y-2">
              <label htmlFor="nameKo" className="block font-medium text-gray-700">
                Tên tiếng Hàn
              </label>
              <input
                id="nameKo"
                name="nameKo"
                type="text"
                value={formData.nameKo || ""}
                onChange={(e) => handleFieldChange("nameKo", e.target.value)}
                onBlur={() => handleFieldBlur("nameKo")}
                placeholder="Nhập tên tiếng Hàn"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.nameKo?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.nameKo?.length > 0 && (
                <div className="space-y-1">
                  {errors.nameKo.map((error, index) => (
                    <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                      <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Đối tượng gốc */}
            <div className="space-y-2">
              <label htmlFor="parentObject" className="block font-medium text-gray-700">
                Đối tượng gốc
              </label>
              <select
                id="parentObject"
                name="parentObject"
                value={formData.parentObject || "0"}
                onChange={(e) => handleFieldChange("parentObject", e.target.value)}
                onBlur={() => handleFieldBlur("parentObject")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.parentObject?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              >
                {parentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="flex items-start space-x-2 text-xs text-gray-600">
                <Info size={12} className="mt-0.5 flex-shrink-0" />
                <span>Chọn đối tượng cha (để trống nếu là đối tượng gốc)</span>
              </div>
              {errors.parentObject?.length > 0 && (
                <div className="space-y-1">
                  {errors.parentObject.map((error, index) => (
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
              <label htmlFor="notes" className="block font-medium text-gray-700">
                Ghi chú
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes || ""}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                onBlur={() => handleFieldBlur("notes")}
                placeholder="Nhập ghi chú (tùy chọn)"
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.notes?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.notes?.length > 0 && (
                <div className="space-y-1">
                  {errors.notes.map((error, index) => (
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
