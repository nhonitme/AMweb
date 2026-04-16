"use client"

import { useState, useCallback, useEffect } from "react"
import { X, Save, AlertCircle, Info, Loader2 } from "lucide-react"

interface BankFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void> | void
  initialData?: any
  existingData?: any[]
  mode: "add" | "edit"
}

export default function BankFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  existingData = [],
  mode,
}: BankFormModalProps) {
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})

  const bankOptions = [
    { value: "Vietcombank", label: "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)" },
    { value: "BIDV", label: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)" },
    { value: "Agribank", label: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam (Agribank)" },
    { value: "Techcombank", label: "Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)" },
    { value: "VPBank", label: "Ngân hàng TMCP Việt Nam Thịnh vượng (VPBank)" },
    { value: "ACB", label: "Ngân hàng TMCP Á Châu (ACB)" },
    { value: "MBBank", label: "Ngân hàng TMCP Quân đội (MBBank)" },
    { value: "Sacombank", label: "Ngân hàng TMCP Sài Gòn Thương tín (Sacombank)" },
  ]

  useEffect(() => {
    if (isOpen) {
      const defaultData: any = {
        bankCode: mode === "edit" ? initialData.bankCode || "" : "",
        bankName: mode === "edit" ? initialData.bankName || "" : "",
        accountNumber: mode === "edit" ? initialData.accountNumber || "" : "",
        accountName: mode === "edit" ? initialData.accountName || "" : "",
        balance: mode === "edit" ? initialData.balance || 0 : 0,
        status: mode === "edit" ? initialData.status || "active" : "active",
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
        case "bankCode":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Mã ngân hàng là bắt buộc")
          } else {
            if (!/^[A-Z0-9]+$/.test(value)) {
              fieldErrors.push("Mã ngân hàng chỉ được chứa chữ cái viết hoa và số")
            }
            if (String(value).length > 20) {
              fieldErrors.push("Mã ngân hàng không được vượt quá 20 ký tự")
            }
            // Check duplicate
            const duplicateItem = existingData.find((item) => item.bankCode === value && item.id !== formData.id)
            if (duplicateItem) {
              fieldErrors.push(`Mã ngân hàng "${value}" đã tồn tại trong hệ thống`)
            }
          }
          break
        case "bankName":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Tên ngân hàng là bắt buộc")
          }
          break
        case "accountNumber":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Số tài khoản là bắt buộc")
          } else {
            if (!/^[0-9]+$/.test(value)) {
              fieldErrors.push("Số tài khoản chỉ được chứa số")
            }
            if (String(value).length < 8 || String(value).length > 20) {
              fieldErrors.push("Số tài khoản phải từ 8-20 ký tự")
            }
            // Check duplicate
            const duplicateItem = existingData.find((item) => item.accountNumber === value && item.id !== formData.id)
            if (duplicateItem) {
              fieldErrors.push(`Số tài khoản "${value}" đã tồn tại trong hệ thống`)
            }
          }
          break
        case "accountName":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Tên tài khoản là bắt buộc")
          } else if (String(value).length > 255) {
            fieldErrors.push("Tên tài khoản không được vượt quá 255 ký tự")
          }
          break
        case "balance":
          if (value && isNaN(Number(value))) {
            fieldErrors.push("Số dư phải là số")
          } else if (Number(value) < 0) {
            fieldErrors.push("Số dư phải lớn hơn hoặc bằng 0")
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

    const fields = ["bankCode", "bankName", "accountNumber", "accountName", "balance"]
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
      const fields = ["bankCode", "bankName", "accountNumber", "accountName", "balance"]
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
              {mode === "add" ? "Thêm tài khoản ngân hàng" : "Chỉnh sửa tài khoản ngân hàng"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {mode === "add" ? "Thêm mới tài khoản ngân hàng vào hệ thống" : "Cập nhật thông tin tài khoản ngân hàng"}
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
            {/* Thông tin ngân hàng */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-blue-900 mb-4">Thông tin ngân hàng</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mã ngân hàng */}
                <div className="space-y-2">
                  <label htmlFor="bankCode" className="block font-medium text-gray-700">
                    Mã ngân hàng <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    id="bankCode"
                    name="bankCode"
                    type="text"
                    value={formData.bankCode || ""}
                    onChange={(e) => handleFieldChange("bankCode", e.target.value)}
                    onBlur={() => handleFieldBlur("bankCode")}
                    placeholder="Ví dụ: VCB001"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.bankCode?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  <div className="flex items-start space-x-2 text-xs text-gray-600">
                    <Info size={12} className="mt-0.5 flex-shrink-0" />
                    <span>Mã ngân hàng chỉ được chứa chữ cái viết hoa và số</span>
                  </div>
                  {errors.bankCode?.length > 0 && (
                    <div className="space-y-1">
                      {errors.bankCode.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tên ngân hàng */}
                <div className="space-y-2">
                  <label htmlFor="bankName" className="block font-medium text-gray-700">
                    Tên ngân hàng <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    id="bankName"
                    name="bankName"
                    value={formData.bankName || ""}
                    onChange={(e) => handleFieldChange("bankName", e.target.value)}
                    onBlur={() => handleFieldBlur("bankName")}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.bankName?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  >
                    <option value="">Chọn ngân hàng</option>
                    {bankOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.bankName?.length > 0 && (
                    <div className="space-y-1">
                      {errors.bankName.map((error, index) => (
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

            {/* Thông tin tài khoản */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-green-900 mb-4">Thông tin tài khoản</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Số tài khoản */}
                <div className="space-y-2">
                  <label htmlFor="accountNumber" className="block font-medium text-gray-700">
                    Số tài khoản <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    id="accountNumber"
                    name="accountNumber"
                    type="text"
                    value={formData.accountNumber || ""}
                    onChange={(e) => handleFieldChange("accountNumber", e.target.value)}
                    onBlur={() => handleFieldBlur("accountNumber")}
                    placeholder="Nhập số tài khoản"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.accountNumber?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  <div className="flex items-start space-x-2 text-xs text-gray-600">
                    <Info size={12} className="mt-0.5 flex-shrink-0" />
                    <span>Số tài khoản chỉ được chứa số, từ 8-20 ký tự</span>
                  </div>
                  {errors.accountNumber?.length > 0 && (
                    <div className="space-y-1">
                      {errors.accountNumber.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tên tài khoản */}
                <div className="space-y-2">
                  <label htmlFor="accountName" className="block font-medium text-gray-700">
                    Tên tài khoản <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    id="accountName"
                    name="accountName"
                    type="text"
                    value={formData.accountName || ""}
                    onChange={(e) => handleFieldChange("accountName", e.target.value)}
                    onBlur={() => handleFieldBlur("accountName")}
                    placeholder="Nhập tên tài khoản"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.accountName?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {errors.accountName?.length > 0 && (
                    <div className="space-y-1">
                      {errors.accountName.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Số dư */}
                <div className="space-y-2">
                  <label htmlFor="balance" className="block font-medium text-gray-700">
                    Số dư (VND)
                  </label>
                  <input
                    id="balance"
                    name="balance"
                    type="number"
                    value={formData.balance || 0}
                    onChange={(e) => handleFieldChange("balance", e.target.value)}
                    onBlur={() => handleFieldBlur("balance")}
                    placeholder="0"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                      errors.balance?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  <div className="flex items-start space-x-2 text-xs text-gray-600">
                    <Info size={12} className="mt-0.5 flex-shrink-0" />
                    <span>Số dư hiện tại của tài khoản</span>
                  </div>
                  {errors.balance?.length > 0 && (
                    <div className="space-y-1">
                      {errors.balance.map((error, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                          <span>{error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Trạng thái */}
                <div className="space-y-2">
                  <label htmlFor="status" className="block font-medium text-gray-700">
                    Trạng thái <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status || "active"}
                    onChange={(e) => handleFieldChange("status", e.target.value)}
                    onBlur={() => handleFieldBlur("status")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Tạm ngưng</option>
                  </select>
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
