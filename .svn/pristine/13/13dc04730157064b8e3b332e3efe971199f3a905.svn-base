"use client"

import { useState, useCallback, useEffect } from "react"
import { X, Save, AlertCircle, Info, Loader2 } from "lucide-react"

interface UnitFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void> | void
  initialData?: any
  existingData?: any[]
  mode: "add" | "edit"
}

export default function UnitFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  existingData = [],
  mode,
}: UnitFormModalProps) {
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    if (isOpen) {
      const defaultData: any = {
        UNIT_CD: mode === "edit" ? initialData.UNIT_CD || "" : "",
        UNIT_NM: mode === "edit" ? initialData.UNIT_NM || "" : "",
        ISDEL: mode === "edit" ? initialData.ISDEL || false : false,
        USERID: mode === "edit" ? initialData.USERID || "" : "",
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
        case "UNIT_CD":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Mã đơn vị tính là bắt buộc")
          } else {
            // Check duplicate
            const duplicateItem = existingData.find((item) => item.UNIT_CD === value && item.id !== formData.id)
            if (duplicateItem) {
              fieldErrors.push(`Mã đơn vị tính "${value}" đã tồn tại trong hệ thống`)
            }
          }
          break
        case "UNIT_NM":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Tên đơn vị tính là bắt buộc")
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

    const fields = ["UNIT_CD", "UNIT_NM"]
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
      const fields = ["UNIT_CD", "UNIT_NM"]
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
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {mode === "add" ? "Thêm đơn vị tính" : "Chỉnh sửa đơn vị tính"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {mode === "add" ? "Thêm mới đơn vị tính vào hệ thống" : "Cập nhật thông tin đơn vị tính"}
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
            {/* Thông tin đơn vị tính */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-blue-900 mb-4">Thông tin đơn vị tính</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mã đơn vị tính */}
                <div className="space-y-2">
                  <label htmlFor="UNIT_CD" className="block font-medium text-gray-700">
                    Mã đơn vị tính <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    id="UNIT_CD"
                    name="UNIT_CD"
                    type="text"
                    value={formData.UNIT_CD || ""}
                    onChange={(e) => handleFieldChange("UNIT_CD", e.target.value)}
                    onBlur={() => handleFieldBlur("UNIT_CD")}
                    placeholder="Ví dụ: KG, M, L"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.UNIT_CD?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.UNIT_CD?.length > 0 && (
                    <div className="space-y-1">
                      {errors.UNIT_CD.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tên đơn vị tính */}
                <div className="space-y-2">
                  <label htmlFor="UNIT_NM" className="block font-medium text-gray-700">
                    Tên đơn vị tính <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    id="UNIT_NM"
                    name="UNIT_NM"
                    type="text"
                    value={formData.UNIT_NM || ""}
                    onChange={(e) => handleFieldChange("UNIT_NM", e.target.value)}
                    onBlur={() => handleFieldBlur("UNIT_NM")}
                    placeholder="Ví dụ: Kilogram, Mét, Lít"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.UNIT_NM?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.UNIT_NM?.length > 0 && (
                    <div className="space-y-1">
                      {errors.UNIT_NM.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thông tin bổ sung */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-green-900 mb-4">Thông tin bổ sung</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trạng thái xóa */}
                <div className="space-y-2">
                  <label htmlFor="ISDEL" className="block font-medium text-gray-700">
                    Trạng thái
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="ISDEL"
                        value="false"
                        checked={formData.ISDEL === false}
                        onChange={() => handleFieldChange("ISDEL", false)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Đang sử dụng</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="ISDEL"
                        value="true"
                        checked={formData.ISDEL === true}
                        onChange={() => handleFieldChange("ISDEL", true)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Đã xóa</span>
                    </label>
                  </div>
                </div>

                {/* User ID */}
                <div className="space-y-2">
                  <label htmlFor="USERID" className="block font-medium text-gray-700">
                    User ID
                  </label>
                  <input
                    id="USERID"
                    name="USERID"
                    type="text"
                    value={formData.USERID || ""}
                    onChange={(e) => handleFieldChange("USERID", e.target.value)}
                    placeholder="Nhập User ID"
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
