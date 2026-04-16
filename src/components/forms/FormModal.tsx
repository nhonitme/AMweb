"use client"

import type { FormField } from "@/types/form"

import type React from "react"
import { useState, useCallback, useEffect } from "react"
import { X, Save, AlertCircle, Info, Loader2 } from "lucide-react"


interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void> | void
  config: any // Cho phép nhận cả dạng có tabs
  initialData?: any
  existingData?: any[]
  mode: "add" | "edit"
}

export default function FormModal({
  isOpen,
  onClose,
  onSubmit,
  config,
  initialData = {},
  existingData = [],
  mode,
}: FormModalProps) {
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})

  // Xác định fields (dạng cũ hoặc dạng tabs)
  const [activeTab, setActiveTab] = useState(0)
  const fields = config.tabs ? config.tabs.flatMap((tab: any) => tab.fields) : config.fields


  useEffect(() => {
    if (isOpen) {
      const defaultData: any = {}
      fields.forEach((field: any) => {
        if (mode === "edit" && initialData[field.name] !== undefined) {
          defaultData[field.name] = initialData[field.name]
        } else if (field.defaultValue !== undefined) {
          defaultData[field.name] = field.defaultValue
        } else {
          defaultData[field.name] = ""
        }
      })
      if (mode === "edit" && initialData.id !== undefined) {
        defaultData.id = initialData.id
      }
      setFormData(defaultData)
      setErrors({})
      setTouched({})
    }
  }, [isOpen, fields, initialData, mode])


  // Validate field
  const validateField = useCallback(
    (fieldName: string, value: any, allData: any = formData) => {
      const field = fields.find((f: any) => f.name === fieldName)
      if (!field) return []

      const fieldErrors: string[] = []

      // Required validation
      if (field.required && (!value || String(value).trim() === "")) {
        fieldErrors.push(`${field.label} là bắt buộc`)
      }

      // Type-specific validation
      if (value && String(value).trim() !== "") {
        switch (field.type) {
          case "email":
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(value)) {
              fieldErrors.push(`${field.label} không đúng định dạng email`)
            }
            break
          case "number":
            if (isNaN(Number(value))) {
              fieldErrors.push(`${field.label} phải là số`)
            } else {
              const numValue = Number(value)
              if (field.validation?.min !== undefined && numValue < field.validation.min) {
                fieldErrors.push(`${field.label} phải lớn hơn hoặc bằng ${field.validation.min}`)
              }
              if (field.validation?.max !== undefined && numValue > field.validation.max) {
                fieldErrors.push(`${field.label} phải nhỏ hơn hoặc bằng ${field.validation.max}`)
              }
            }
            break
          case "tel":
            const phoneRegex = /^[0-9+\-\s()]+$/
            if (!phoneRegex.test(value)) {
              fieldErrors.push(`${field.label} không đúng định dạng số điện thoại`)
            }
            break
        }

        // Pattern validation
        if (field.validation?.pattern) {
          const regex = new RegExp(field.validation.pattern)
          if (!regex.test(value)) {
            fieldErrors.push(`${field.label} không đúng định dạng`)
          }
        }

        // Length validation
        if (field.validation?.minLength && String(value).length < field.validation.minLength) {
          fieldErrors.push(`${field.label} phải có ít nhất ${field.validation.minLength} ký tự`)
        }
        if (field.validation?.maxLength && String(value).length > field.validation.maxLength) {
          fieldErrors.push(`${field.label} không được vượt quá ${field.validation.maxLength} ký tự`)
        }
      }

      // Custom validation rules
      if (config.validationRules && config.validationRules[fieldName]) {
        const customErrors = config.validationRules[fieldName](value, allData, existingData)
        fieldErrors.push(...customErrors)
      }

      return fieldErrors
    },
    [fields, config.validationRules, existingData, formData],
  )

  // Validate all fields (chỉ validate fields của tab hiện tại nếu có tabs)
  const validateForm = useCallback(() => {
    const newErrors: { [key: string]: string[] } = {}
    let hasErrors = false
    const validateFields = config.tabs ? config.tabs[activeTab].fields : fields
    validateFields.forEach((field: any) => {
      if (!field.showWhen || field.showWhen(formData)) {
        const fieldErrors = validateField(field.name, formData[field.name], formData)
        if (fieldErrors.length > 0) {
          newErrors[field.name] = fieldErrors
          hasErrors = true
        }
      }
    })
    setErrors(newErrors)
    return !hasErrors
  }, [fields, formData, validateField, config.tabs, activeTab])

  // Handle field change
  const handleFieldChange = useCallback(
    (fieldName: string, value: any) => {
      setFormData((prev: any) => ({ ...prev, [fieldName]: value }))
      if (touched[fieldName]) {
        const fieldErrors = validateField(fieldName, value, { ...formData, [fieldName]: value })
        setErrors((prev) => ({
          ...prev,
          [fieldName]: fieldErrors,
        }))
      }
    },
    [formData, touched, validateField],
  )

  // Handle field blur
  const handleFieldBlur = useCallback(
    (fieldName: string) => {
      setTouched((prev) => ({ ...prev, [fieldName]: true }))
      const fieldErrors = validateField(fieldName, formData[fieldName], formData)
      setErrors((prev) => ({
        ...prev,
        [fieldName]: fieldErrors,
      }))
    },
    [formData, validateField],
  )

  // Handle submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      // Mark all fields của tab hiện tại là touched
      const allTouched: { [key: string]: boolean } = {}
      const markFields = config.tabs ? config.tabs[activeTab].fields : fields
      markFields.forEach((field: any) => {
        allTouched[field.name] = true
      })
      setTouched(allTouched)
      // Validate form
      if (!validateForm()) {
        return
      }
      setIsSubmitting(true)
      try {
        await onSubmit(formData)
        onClose()
      } catch (error) {
        console.error("Form submission error:", error)
        // Handle error (could show toast notification)
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, config.tabs, fields, activeTab, validateForm, onSubmit, onClose],
  )

  // Handle close
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose()
    }
  }, [isSubmitting, onClose])

  // Render field
  const renderField = useCallback(
    (field: FormField) => {
      // Check if field should be shown
      if (field.showWhen && !field.showWhen(formData)) {
        return null
      }

      const fieldErrors = errors[field.name] || []
      const hasError = fieldErrors.length > 0
      const value = formData[field.name] || ""

      const baseInputClasses = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
        hasError ? "border-red-300 bg-red-50" : "border-gray-300"
      } ${field.disabled ? "bg-gray-100 cursor-not-allowed" : ""}`

      return (
        <div key={field.id} className="space-y-2">
          <label htmlFor={field.id} className="block font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {field.type === "textarea" ? (
            <textarea
              id={field.id}
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              rows={4}
              className={baseInputClasses}
            />
          ) : field.type === "select" ? (
            <select
              id={field.id}
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              disabled={field.disabled}
              className={baseInputClasses}
            >
              <option value="">Chọn {field.label.toLowerCase()}</option>
              {field.options?.map((option: { value: string | number; label: string }) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={field.id}
              name={field.name}
              type={field.type}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              className={baseInputClasses}
            />
          )}

          {field.description && (
            <div className="flex items-start space-x-2 text-xs text-gray-600">
              <Info size={12} className="mt-0.5 flex-shrink-0" />
              <span>{field.description}</span>
            </div>
          )}

          {hasError && (
            <div className="space-y-1">
              {fieldErrors.map((error, index) => (
                <div key={index} className="flex items-start space-x-2 text-xs text-red-600">
                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    },
    [formData, errors, handleFieldChange, handleFieldBlur],
  )

  if (!isOpen) return null

  // Tabs UI nếu có config.tabs

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{config.title}</h3>
            {config.description && <p className="text-sm text-gray-600 mt-1">{config.description}</p>}
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
          {config.tabs ? (
            <>
              {/* Tabs header */}
              <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-2">
                {config.tabs.map((tab: any, idx: number) => (
                  <button
                    key={tab.label}
                    type="button"
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors duration-150 ${activeTab === idx ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-600 hover:text-blue-600'}`}
                    onClick={() => setActiveTab(idx)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* Tab content */}
              <div className="space-y-6 p-6 flex-1 min-h-0 overflow-y-auto">
                {config.tabs[activeTab].fields.map((field: any) => renderField(field))}
              </div>
            </>
          ) : (
            <div className="space-y-6 p-6 flex-1 min-h-0 overflow-y-auto">
              {fields.map((field: any) => renderField(field))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-white flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {config.cancelLabel || "Hủy"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{config.submitLabel || "Lưu"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
