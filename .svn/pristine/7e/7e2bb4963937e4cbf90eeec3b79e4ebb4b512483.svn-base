"use client"

import { useState, useCallback, useEffect } from "react"
import { X, Save, AlertCircle, Info, Loader2, Building2, Store, Receipt, MapPin, ChevronLeft, ChevronRight } from "lucide-react"

interface CustomerFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void> | void
  initialData?: any
  existingData?: any[]
  mode: "add" | "edit"
}

export default function CustomerFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  existingData = [],
  mode,
}: CustomerFormModalProps) {
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})
  const [activeTab, setActiveTab] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([0])

  useEffect(() => {
    if (isOpen) {
      const defaultData: any = {
        nameVi: mode === "edit" ? initialData.nameVi || "" : "",
        nameEn: mode === "edit" ? initialData.nameEn || "" : "",
        nameKo: mode === "edit" ? initialData.nameKo || "" : "", 
        buyerName: mode === "edit" ? initialData.buyerName || "" : "",
        customerUserCode: mode === "edit" ? initialData.customerUserCode || "" : "",
        customerType: mode === "edit" ? initialData.customerType || "" : "",
        categoryCode: mode === "edit" ? initialData.categoryCode || "" : "",
        taxCode: mode === "edit" ? initialData.taxCode || "" : "",
        email: mode === "edit" ? initialData.email || "" : "",
        tel: mode === "edit" ? initialData.tel || "" : "",
        fax: mode === "edit" ? initialData.fax || "" : "",
        businessType: mode === "edit" ? initialData.businessType || "" : "",
        kindBusiness: mode === "edit" ? initialData.kindBusiness || "" : "",
        ownerName: mode === "edit" ? initialData.ownerName || "" : "",
        address: mode === "edit" ? initialData.address || "" : "",
        zipCode: mode === "edit" ? initialData.zipCode || "" : "",
        notes: mode === "edit" ? initialData.notes || "" : "",
      }
      if (mode === "edit" && initialData.id) {
        defaultData.id = initialData.id
      }
      setFormData(defaultData)
      setActiveTab(0)
      setErrors({})
      setTouched({})
      setCompletedSteps([0])
    }
  }, [isOpen, initialData, mode])
  // Validate từng step
  // Nếu nhập số điện thoại thì phải hợp lệ mới cho next, nếu không nhập thì không bắt buộc
  const stepFields = [
    ["nameVi", "customerType", "categoryCode"], // Step 0
    ["taxCode", "tel"], // Step 1: kiểm tra tel nếu có nhập
    [], // Step 2
    ["address"] // Step 3
  ]

  const isStepValid = (step: number) => {
    const fields = stepFields[step] || []
    return fields.every((field) => {
      const errs = validateField(field, formData[field])
      return !errs || errs.length === 0
    })
  }

  const handleNext = () => {
    if (isStepValid(activeTab)) {
      setCompletedSteps((prev) => Array.from(new Set([...prev, activeTab + 1])))
      setActiveTab((prev) => prev + 1)
    } else {
      // Đánh dấu touched và show lỗi
      const fields = stepFields[activeTab] || []
      const newTouched: any = { ...touched }
      fields.forEach((field) => {
        newTouched[field] = true
      })
      setTouched(newTouched)
      const newErrors: any = { ...errors }
      fields.forEach((field) => {
        newErrors[field] = validateField(field, formData[field])
      })
      setErrors(newErrors)
    }
  }

  const handlePrev = () => {
    setActiveTab((prev) => Math.max(0, prev - 1))
  }

  const validateField = useCallback(
    (fieldName: string, value: any) => {
      const fieldErrors: string[] = []

      switch (fieldName) {
        case "nameVi":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Tên tiếng Việt là bắt buộc")
          }
          break
        case "customerType":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Loại khách hàng là bắt buộc")
          }
          break
        case "categoryCode":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Mã danh mục là bắt buộc")
          }
          break
        case "taxCode":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Mã số thuế là bắt buộc")
          } else if (!/^\d{10}$|^\d{13}$/.test(String(value))) {
            fieldErrors.push("Mã số thuế phải có 10 hoặc 13 chữ số")
          } else {
            // Kiểm tra trùng mã số thuế trong existingData (trừ trường hợp đang sửa chính bản ghi đó)
            const trimmedValue = String(value).trim();
            const isDuplicate = existingData?.some((item) => {
              if (!item.taxCode) return false;
              if (mode === "edit" && formData.id && item.id === formData.id) return false;
              return String(item.taxCode).trim() === trimmedValue;
            });
            if (isDuplicate) {
              fieldErrors.push("Mã số thuế đã tồn tại trong hệ thống")
            }
          }
          break
        case "address":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Địa chỉ là bắt buộc")
          }
          break
        case "email":
          if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
            fieldErrors.push("Email không hợp lệ")
          }
          break
        case "tel":
          if (value && !/^\d{10}$/.test(String(value).trim())) {
            fieldErrors.push("Số điện thoại phải gồm đúng 10 chữ số")
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

    const fields = ["nameVi", "taxCode", "address"]
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
      
      const allTouched: { [key: string]: boolean } = {}
      const fields = ["nameVi", "taxCode", "address"] 
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
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {mode === "add" ? "Thêm khách hàng mới" : "Chỉnh sửa thông tin khách hàng"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {mode === "add" ? "Thêm mới thông tin khách hàng vào hệ thống" : "Cập nhật thông tin khách hàng"}
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

        {/* Tabs/Steps */}
        <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <nav className="flex space-x-2 sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
            {[
              { label: 'Thông tin cơ bản', icon: Building2 },
              { label: 'Thông tin thuế và liên hệ', icon: Receipt },
              { label: 'Thông tin kinh doanh', icon: Store },
              { label: 'Thông tin địa chỉ', icon: MapPin },
            ].map((tab, idx) => {
              const Icon = tab.icon
              const isClickable = completedSteps.includes(idx) || idx === activeTab
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => isClickable && setActiveTab(idx)}
                  className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                    activeTab === idx
                      ? 'border-blue-500 text-blue-600'
                      : isClickable
                        ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        : 'border-transparent text-gray-500 cursor-not-allowed opacity-60'
                  }`}
                  disabled={!isClickable}
                >
                  <Icon className="inline h-4 w-4 mr-1 sm:mr-2" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {/* Tab 1: Thông tin cơ bản */}
            {activeTab === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-blue-900 mb-4">Thông tin cơ bản</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tên tiếng Việt */}
                  <div className="space-y-2">
                    <label htmlFor="nameVi" className="block font-medium text-gray-700">
                      Tên khách hàng (Tiếng Việt) <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      id="nameVi"
                      name="nameVi"
                      type="text"
                      value={formData.nameVi || ""}
                      onChange={(e) => handleFieldChange("nameVi", e.target.value)}
                      onBlur={() => handleFieldBlur("nameVi")}
                      placeholder="Nhập tên tiếng Việt"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:border-2 transition-colors ${
                        errors.nameVi?.length ? "border-red-500 bg-red-50" : "border-gray-300"
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
                  {/* Loại khách hàng */}
                  <div className="space-y-2">
                    <label htmlFor="customerType" className="block font-medium text-gray-700">
                      Loại khách hàng <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      id="customerType"
                      name="customerType"
                      type="text"
                      value={formData.customerType || ""}
                      onChange={(e) => handleFieldChange("customerType", e.target.value)}
                      onBlur={() => handleFieldBlur("customerType")}
                      placeholder="Ví dụ: 1 (Nội địa), 2 (Nước ngoài)"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:border-2 transition-colors ${
                        errors.customerType?.length ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors.customerType?.length > 0 && (
                      <div className="space-y-1">
                        {errors.customerType.map((error, index) => (
                          <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Mã danh mục */}
                  <div className="space-y-2">
                    <label htmlFor="categoryCode" className="block font-medium text-gray-700">
                      Mã danh mục <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      id="categoryCode"
                      name="categoryCode"
                      type="text"
                      value={formData.categoryCode || ""}
                      onChange={(e) => handleFieldChange("categoryCode", e.target.value)}
                      onBlur={() => handleFieldBlur("categoryCode")}
                      placeholder="Mã danh mục khách hàng"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:border-2 transition-colors ${
                        errors.categoryCode?.length ? "border-red-500 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors.categoryCode?.length > 0 && (
                      <div className="space-y-1">
                        {errors.categoryCode.map((error, index) => (
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
                      Tên khách hàng (Tiếng Anh)
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
                  </div>
                  {/* Tên tiếng Hàn */}
                  <div className="space-y-2">
                    <label htmlFor="nameKo" className="block font-medium text-gray-700">
                      Tên khách hàng (Tiếng Hàn)
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
                  </div>
                  {/* Tên người mua */}
                  <div className="space-y-2">
                    <label htmlFor="buyerName" className="block font-medium text-gray-700">
                      Tên người mua
                    </label>
                    <input
                      id="buyerName"
                      name="buyerName"
                      type="text"
                      value={formData.buyerName || ""}
                      onChange={(e) => handleFieldChange("buyerName", e.target.value)}
                      onBlur={() => handleFieldBlur("buyerName")}
                      placeholder="Nhập tên người mua"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  {/* Mã ngân hàng */}
                  <div className="space-y-2">
                    <label htmlFor="bankCD" className="block font-medium text-gray-700">
                      Mã ngân hàng
                    </label>
                    <input
                      id="bankCD"
                      name="bankCD"
                      type="text"
                      value={formData.bankCD || ""}
                      onChange={(e) => handleFieldChange("bankCD", e.target.value)}
                      onBlur={() => handleFieldBlur("bankCD")}
                      placeholder="Nhập mã ngân hàng"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Thông tin thuế và liên hệ */}
            {activeTab === 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-amber-900 mb-4">Thông tin thuế và liên hệ</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mã số thuế */}
                  <div className="space-y-2">
                    <label htmlFor="taxCode" className="block font-medium text-gray-700">
                      Mã số thuế <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      id="taxCode"
                      name="taxCode"
                      type="text"
                      value={formData.taxCode || ""}
                      onChange={(e) => handleFieldChange("taxCode", e.target.value)}
                      onBlur={() => handleFieldBlur("taxCode")}
                      placeholder="Nhập mã số thuế"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.taxCode?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors.taxCode?.length > 0 && (
                      <div className="space-y-1">
                        {errors.taxCode.map((error, index) => (
                          <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Email */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="block font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      onBlur={() => handleFieldBlur("email")}
                      placeholder="Nhập email"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.email?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                      }`}
                    />
                  </div>
                  {/* Số điện thoại */}
                  <div className="space-y-2">
                    <label htmlFor="tel" className="block font-medium text-gray-700">
                      Số điện thoại
                    </label>
                    <input
                      id="tel"
                      name="tel"
                      type="tel"
                      value={formData.tel || ""}
                      onChange={(e) => handleFieldChange("tel", e.target.value)}
                      onBlur={() => handleFieldBlur("tel")}
                      placeholder="Nhập số điện thoại"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.tel?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors.tel?.length > 0 && (
                      <div className="space-y-1">
                        {errors.tel.map((error, index) => (
                          <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Fax */}
                  <div className="space-y-2">
                    <label htmlFor="fax" className="block font-medium text-gray-700">
                      Fax
                    </label>
                    <input
                      id="fax"
                      name="fax"
                      type="text"
                      value={formData.fax || ""}
                      onChange={(e) => handleFieldChange("fax", e.target.value)}
                      onBlur={() => handleFieldBlur("fax")}
                      placeholder="Nhập số fax"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Thông tin kinh doanh */}
            {activeTab === 2 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-purple-900 mb-4">Thông tin kinh doanh</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Loại hình kinh doanh */}
                  <div className="space-y-2">
                    <label htmlFor="businessType" className="block font-medium text-gray-700">
                      Loại hình kinh doanh
                    </label>
                    <input
                      id="businessType"
                      name="businessType"
                      type="text"
                      value={formData.businessType || ""}
                      onChange={(e) => handleFieldChange("businessType", e.target.value)}
                      onBlur={() => handleFieldBlur("businessType")}
                      placeholder="Nhập loại hình kinh doanh"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  {/* Hình thức kinh doanh */}
                  <div className="space-y-2">
                    <label htmlFor="kindBusiness" className="block font-medium text-gray-700">
                      Hình thức kinh doanh
                    </label>
                    <input
                      id="kindBusiness"
                      name="kindBusiness"
                      type="text"
                      value={formData.kindBusiness || ""}
                      onChange={(e) => handleFieldChange("kindBusiness", e.target.value)}
                      onBlur={() => handleFieldBlur("kindBusiness")}
                      placeholder="Nhập hình thức kinh doanh"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  {/* Chủ sở hữu */}
                  <div className="space-y-2">
                    <label htmlFor="ownerName" className="block font-medium text-gray-700">
                      Chủ sở hữu
                    </label>
                    <input
                      id="ownerName"
                      name="ownerName"
                      type="text"
                      value={formData.ownerName || ""}
                      onChange={(e) => handleFieldChange("ownerName", e.target.value)}
                      onBlur={() => handleFieldBlur("ownerName")}
                      placeholder="Nhập tên chủ sở hữu"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Thông tin địa chỉ */}
            {activeTab === 3 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Thông tin địa chỉ</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Địa chỉ */}
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="address" className="block font-medium text-gray-700">
                      Địa chỉ <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      value={formData.address || ""}
                      onChange={(e) => handleFieldChange("address", e.target.value)}
                      onBlur={() => handleFieldBlur("address")}
                      placeholder="Nhập địa chỉ"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors.address?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                      }`}
                    />
                    {errors.address?.length > 0 && (
                      <div className="space-y-1">
                        {errors.address.map((error, index) => (
                          <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Zip code */}
                  <div className="space-y-2">
                    <label htmlFor="zipCode" className="block font-medium text-gray-700">
                      Zip code
                    </label>
                    <input
                      id="zipCode"
                      name="zipCode"
                      type="text"
                      value={formData.zipCode || ""}
                      onChange={(e) => handleFieldChange("zipCode", e.target.value)}
                      onBlur={() => handleFieldBlur("zipCode")}
                      placeholder="Nhập zip code"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
                {/* Ghi chú - chỉ hiển thị ở tab cuối cùng */}
                <div className="space-y-2 mt-6">
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
                    rows={3}
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
            )}
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
            {/* Quay lại */}
            {activeTab > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={isSubmitting}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:block">Quay lại</span>
              </button>
            )}
            {/* Tiếp theo */}
            {activeTab < 3 && (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                <ChevronRight className="w-4 h-4" />
                <span className="hidden sm:block">Tiếp theo</span>
              </button>
            )}
            {/* Lưu */}
            {activeTab === 3 && (
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
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
