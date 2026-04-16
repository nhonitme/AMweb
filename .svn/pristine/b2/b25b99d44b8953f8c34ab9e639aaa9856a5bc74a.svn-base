"use client"

import { useState, useCallback, useEffect } from "react"
import { X, Save, AlertCircle, Loader2, Eye, EyeOff, Search, ChevronDown, ChevronRight, User, Settings } from "lucide-react"

interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void> | void
  initialData?: any
  existingData?: any[]
  mode: "add" | "edit"
}                      <label htmlFor="userId" className="block font-medium text-gray-700">
                        Mã người dùng <span className="text-red-500 ml-1">*</span>
                      </label>
// Menu permissions tree structure
const menuPermissions = [
  {
    id: "overview",
    title: "Tổng quan",
    children: [
      { id: "dashboard", title: "Dashboard Tổng Quan" }
    ]
  },
  {
    id: "data-management",
    title: "Quản lý Dữ liệu",
    children: [
      { id: "basic-data", title: "Quản lý Dữ liệu Cơ Bản" },
      { id: "company-management", title: "Quản lý công ty" },
      { id: "user-management", title: "Quản lý người dùng" },
      { id: "cost-center", title: "Đối tượng tập hợp chi phí" },
      { id: "customer-management", title: "Quản lý khách hàng" },
      { id: "bank-management", title: "Quản lý ngân hàng" },
    ]
  },
  {
    id: "finance",
    title: "Tài Chính",
    children: [
      { id: "summary", title: "Tổng Hợp" },
      { id: "journal", title: "Sổ Nhật Ký" },
      { id: "cash", title: "Tiền Mặt" },
      { id: "banking", title: "Ngân Hàng" },
    ]
  },
  {
    id: "trading",
    title: "Mua Bán",
    children: [
      { id: "purchasing", title: "Mua Hàng" },
      { id: "sales", title: "Bán Hàng" },
    ]
  },
]

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  existingData = [],
  mode,
}: UserFormModalProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showPassword2, setShowPassword2] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["overview", "data-management"])
  const [permissionSearch, setPermissionSearch] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      setActiveStep(0) // Luôn reset về bước đầu tiên khi mở form
      const defaultData: any = {
        costCenterCode: mode === "edit" ? initialData.costCenterCode || "" : "",
        userId: mode === "edit" ? initialData.userId || "" : "",
        password: mode === "edit" ? "••••••••" : "",
        password2: mode === "edit" ? "••••••••" : "",
        name: mode === "edit" ? initialData.name || "" : "",
        phone: mode === "edit" ? initialData.phone || "" : "",
        permission: mode === "edit" ? initialData.permission || "user" : "user",
        issueDate: mode === "edit" ? initialData.issueDate || "" : new Date().toISOString().split('T')[0],
        notes: mode === "edit" ? initialData.notes || "" : "",
        lockOption: mode === "edit" ? initialData.lockOption || "cannot_lock" : "cannot_lock",
        cannotDeleteLinked: mode === "edit" ? initialData.cannotDeleteLinked || false : false,
        cannotEditLocked: mode === "edit" ? initialData.cannotEditLocked || false : false,
        cannotAddLock: mode === "edit" ? initialData.cannotAddLock || false : false,
        editReservedName: mode === "edit" ? initialData.editReservedName || false : false,
        showDocumentsByUser: mode === "edit" ? initialData.showDocumentsByUser || false : false,
        // ...existing code...
      }
      if (mode === "edit" && initialData.id) {
        defaultData.id = initialData.id
      }
      setFormData(defaultData)
      setSelectedPermissions(mode === "edit" ? initialData.permissions || [] : [])
      setErrors({})
      setTouched({})
    }
  }, [isOpen, initialData, mode])

  const validateField = useCallback(
    (fieldName: string, value: any) => {
      const fieldErrors: string[] = []

      switch (fieldName) {
        case "costCenterCode":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Đối tượng tập hợp chi phí là bắt buộc")
          }
          break
        case "userId":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("ID người dùng là bắt buộc")
          } else {
            if (String(value).length > 50) {
              fieldErrors.push("ID người dùng không được vượt quá 50 ký tự")
            }
            const duplicateItem = existingData.find((item) => item.userId === value && item.id !== formData.id)
            if (duplicateItem) {
              fieldErrors.push(`ID người dùng "${value}" đã tồn tại trong hệ thống`)
            }
          }
          break
        case "password":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Mật khẩu là bắt buộc")
          }
          break
        case "name":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Tên là bắt buộc")
          } else if (String(value).length > 255) {
            fieldErrors.push("Tên không được vượt quá 255 ký tự")
          }
          break
        case "permission":
          if (!value || String(value).trim() === "") {
            fieldErrors.push("Quyền là bắt buộc")
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

    const fields = ["costCenterCode", "userId", "password", "name", "permission"]
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
      const fields = ["costCenterCode", "userId", "password", "name", "permission"]
      fields.forEach((field) => {
        allTouched[field] = true
      })
      setTouched(allTouched)

      if (!validateForm()) {
        return
      }

      setIsSubmitting(true)
      try {
        // Nếu là edit thì merge dữ liệu cũ với dữ liệu mới
        let submitData: any = {}
        if (mode === "edit") {
          submitData = { ...initialData, ...formData, permissions: selectedPermissions }
        } else {
          submitData = { ...formData, permissions: selectedPermissions }
        }
        await onSubmit(submitData)
        onClose()
      } catch (error) {
        console.error("Form submission error:", error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, selectedPermissions, validateForm, onSubmit, onClose, initialData, mode],
  )

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose()
    }
  }, [isSubmitting, onClose])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const togglePermission = (permissionId: string) => {
    const group = menuPermissions.find(g => g.id === permissionId)
    if (group) {
      // Nếu là parent, check/uncheck tất cả child
      const allIds = [group.id, ...group.children.map(child => child.id)]
      setSelectedPermissions(prev => {
        const isChecked = prev.includes(group.id)
        if (isChecked) {
          // Bỏ check parent và tất cả child
          return prev.filter(id => !allIds.includes(id))
        } else {
          // Check parent và tất cả child
          return [...prev, ...allIds.filter(id => !prev.includes(id))]
        }
      })
    } else {
      // Nếu là child, chỉ toggle child
      setSelectedPermissions(prev =>
        prev.includes(permissionId)
          ? prev.filter(id => id !== permissionId)
          : [...prev, permissionId]
      )
    }
  }

  const selectAllPermissions = () => {
    const allPermissions = menuPermissions.flatMap(group => 
      [group.id, ...group.children.map(child => child.id)]
    )
    setSelectedPermissions(allPermissions)
  }

  const deselectAllPermissions = () => {
    setSelectedPermissions([])
  }

  const filteredPermissions = menuPermissions.filter(group => 
    group.title.toLowerCase().includes(permissionSearch.toLowerCase()) ||
    group.children.some(child => child.title.toLowerCase().includes(permissionSearch.toLowerCase()))
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {mode === "add" ? "Thêm người dùng mới" : "Chỉnh sửa thông tin người dùng"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {mode === "add" ? "Thêm mới người dùng vào hệ thống" : "Cập nhật thông tin người dùng"}
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

        {/* Step Header giữ kiểu tab */}
        <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <nav className="flex space-x-2 sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveStep(0)}
              className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                activeStep === 0
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              disabled={activeStep === 0}
            >
              <User className="inline h-4 w-4 mr-1 sm:mr-2" />
              Thông tin người dùng
            </button>
            <button
              type="button"
              onClick={() => {
                // Chỉ cho phép sang bước 2 nếu validate xong bước 1
                const fields = ["costCenterCode", "userId", "password", "name", "permission"];
        const allTouched: { [key: string]: boolean } = {};
                fields.forEach((field) => { allTouched[field] = true; });
                setTouched(allTouched);
                if (validateForm()) setActiveStep(1);
              }}
              className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                activeStep === 1
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              disabled={activeStep === 1}
            >
              <Settings className="inline h-4 w-4 mr-1 sm:mr-2" />
              Quyền & Thiết lập nâng cao
            </button>
          </nav>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Step 1: User Information */}
            {activeStep === 0 && (
              <div className="space-y-6 p-6">
                {/* Thông tin bắt buộc */}
                <div className="bg-blue-50 border border-blue-300 rounded-xl p-4 shadow-sm">
                  <h4 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                    <AlertCircle size={16} className="mr-2 text-blue-500" />
                    Thông tin bắt buộc
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Đối tượng tập hợp chi phí */}
                    <div className="space-y-2">
                      <label htmlFor="costCenterCode" className="block font-medium text-gray-700">
                        Đối tượng tập hợp chi phí <span className="text-red-500 ml-1">*</span>
                      </label>
                      <select
                        id="costCenterCode"
                        name="costCenterCode"
                        value={formData.costCenterCode || ""}
                        onChange={(e) => handleFieldChange("costCenterCode", e.target.value)}
                        onBlur={() => handleFieldBlur("costCenterCode")}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.costCenterCode?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                        }`}
                      >
                        <option value="">Chọn đối tượng tập hợp chi phí</option>
                        <option value="213">213 - Phòng Kế toán</option>
                        <option value="214">214 - Phòng Marketing</option>
                        <option value="215">215 - Phòng IT</option>
                        <option value="216">216 - Phòng Nhân sự</option>
                      </select>
                      {errors.costCenterCode?.length > 0 && (
                        <div className="space-y-1">
                          {errors.costCenterCode.map((error, index) => (
                            <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ID người dùng */}
                    <div className="space-y-2">
                      <label htmlFor="userId" className="block font-medium text-gray-700">
                        ID của người sử dụng <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        id="userId"
                        name="userId"
                        type="text"
                        value={formData.userId || ""}
                        onChange={(e) => handleFieldChange("userId", e.target.value)}
                        onBlur={() => handleFieldBlur("userId")}
                        placeholder="Ví dụ: 089"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.userId?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                        }`}
                      />
                      {errors.userId?.length > 0 && (
                        <div className="space-y-1">
                          {errors.userId.map((error, index) => (
                            <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mật khẩu */}
                    <div className="space-y-2">
                      <label htmlFor="password" className="block font-medium text-gray-700">
                        Mật khẩu <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password || ""}
                          onChange={(e) => handleFieldChange("password", e.target.value)}
                          onBlur={() => handleFieldBlur("password")}
                          placeholder="Nhập mật khẩu"
                          className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            errors.password?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {mode === "edit" && (
                        <button
                          type="button"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Thay đổi mật khẩu
                        </button>
                      )}
                      {errors.password?.length > 0 && (
                        <div className="space-y-1">
                          {errors.password.map((error, index) => (
                            <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mật khẩu 2 */}
                    <div className="space-y-2">
                      <label htmlFor="password2" className="block font-medium text-gray-700">
                        Mật khẩu 2
                      </label>
                      <div className="relative">
                        <input
                          id="password2"
                          name="password2"
                          type={showPassword2 ? "text" : "password"}
                          value={formData.password2 || ""}
                          onChange={(e) => handleFieldChange("password2", e.target.value)}
                          placeholder="Nhập mật khẩu 2"
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword2(!showPassword2)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword2 ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {mode === "edit" && (
                        <button
                          type="button"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Cập nhật mật khẩu 2
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Thông tin bổ sung */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-blue-900 mb-4">Thông tin bổ sung</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tên */}
                    <div className="space-y-2">
                      <label htmlFor="name" className="block font-medium text-gray-700">
                        Tên <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name || ""}
                        onChange={(e) => handleFieldChange("name", e.target.value)}
                        onBlur={() => handleFieldBlur("name")}
                        placeholder="Ví dụ: Planning"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.name?.length ? "border-red-300 bg-red-50" : "border-gray-300"
                        }`}
                      />
                      {errors.name?.length > 0 && (
                        <div className="space-y-1">
                          {errors.name.map((error, index) => (
                            <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Số điện thoại */}
                    <div className="space-y-2">
                      <label htmlFor="phone" className="block font-medium text-gray-700">
                        Số điện thoại
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone || ""}
                        onChange={(e) => handleFieldChange("phone", e.target.value)}
                        placeholder="Ví dụ: 0914xxxxxx"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>

                    {/* Cho phép */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="block font-medium text-gray-700">
                        Cho phép <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="flex space-x-6">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="permission"
                            value="admin"
                            checked={formData.permission === "admin"}
                            onChange={(e) => handleFieldChange("permission", e.target.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Quản trị cao nhất</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="permission"
                            value="user"
                            checked={formData.permission === "user"}
                            onChange={(e) => handleFieldChange("permission", e.target.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Người sử dụng</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="permission"
                            value="viewer"
                            checked={formData.permission === "viewer"}
                            onChange={(e) => handleFieldChange("permission", e.target.value)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Người xem</span>
                        </label>
                      </div>
                      {errors.permission?.length > 0 && (
                        <div className="space-y-1">
                          {errors.permission.map((error, index) => (
                            <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    


                    {/* Ghi chú */}
                    <div className="space-y-2 md:col-span-2">
                      <label htmlFor="notes" className="block font-medium text-gray-700">
                        Ghi chú
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes || ""}
                        onChange={(e) => handleFieldChange("notes", e.target.value)}
                        placeholder="Nhập ghi chú"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Permissions & Advanced Settings */}
            {activeStep === 1 && (
              <div className="flex h-full">
                {/* Left Panel: Permissions */}
                <div className="w-1/2 border-r border-gray-200 p-6">
                  <div className="mb-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Danh sách quyền</h4>
                    <div className="flex items-center space-x-2 mb-4">
                      <button
                        type="button"
                        onClick={selectAllPermissions}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Chọn tất cả
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={deselectAllPermissions}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                    <div className="relative mb-4">
                      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm quyền..."
                        value={permissionSearch}
                        onChange={(e) => setPermissionSearch(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredPermissions.map((group) => (
                      <div key={group.id} className="border border-gray-200 rounded-lg">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(group.id)}
                              onChange={() => togglePermission(group.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="font-medium text-gray-900">{group.title}</span>
                          </div>
                          {expandedGroups.includes(group.id) ? (
                            <ChevronDown size={16} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={16} className="text-gray-400" />
                          )}
                        </button>
                        {expandedGroups.includes(group.id) && (
                          <div className="border-t border-gray-200 bg-gray-50">
                            {group.children.map((child) => (
                              <label key={child.id} className="flex items-center space-x-2 p-3 pl-8 hover:bg-gray-100">
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(child.id)}
                                  onChange={() => togglePermission(child.id)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{child.title}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Panel: Advanced Settings */}
                <div className="w-1/2 p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Thiết lập nâng cao</h4>
                  
                  {/* Lựa chọn khóa */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <h5 className="font-medium text-amber-900 mb-3">Lựa chọn khóa</h5>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="lockOption"
                          value="cannot_lock"
                          checked={formData.lockOption === "cannot_lock"}
                          onChange={(e) => handleFieldChange("lockOption", e.target.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Không thể khóa chứng từ</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="lockOption"
                          value="can_lock"
                          checked={formData.lockOption === "can_lock"}
                          onChange={(e) => handleFieldChange("lockOption", e.target.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Có thể khóa chứng từ</span>
                      </label>
                    </div>
                  </div>

                  {/* Các tùy chọn khác */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Các tùy chọn khác</h5>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.cannotDeleteLinked || false}
                          onChange={(e) => handleFieldChange("cannotDeleteLinked", e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Không thể xóa chứng từ đã liên kết</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.cannotEditLocked || false}
                          onChange={(e) => handleFieldChange("cannotEditLocked", e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Không thể sửa chứng từ đã khóa sổ</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.cannotAddLock || false}
                          onChange={(e) => handleFieldChange("cannotAddLock", e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Không thể thêm khóa sổ</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.editReservedName || false}
                          onChange={(e) => handleFieldChange("editReservedName", e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Sửa chữ dành/Tên</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.showDocumentsByUser || false}
                          onChange={(e) => handleFieldChange("showDocumentsByUser", e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Hiện thị chứng từ theo người đăng nhập</span>
                      </label>
                    </div>
                  </div>
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
            {activeStep === 1 && (
              <button
                type="button"
                onClick={() => setActiveStep(0)}
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span className="hidden sm:block">Quay lại</span>
              </button>
            )}
            {/* Tiếp tục */}
            {activeStep === 0 && (
              <button
                type="button"
                onClick={() => {
                  // Validate step 1 trước khi sang bước 2
                  const fields = ["costCenterCode", "userId", "password", "name", "permission"];
                  const allTouched: { [key: string]: boolean } = {};
                  fields.forEach((field) => { allTouched[field] = true; });
                  setTouched(allTouched);
                  if (validateForm()) setActiveStep(1);
                }}
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
                <span className="hidden sm:block">Tiếp tục</span>
              </button>
            )}
            {/* Lưu */}
            {activeStep === 1 && (
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
