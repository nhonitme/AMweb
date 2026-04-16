"use client"

import { useState, useEffect, useCallback } from "react"
import { X, AlertCircle, Usb, Shield, Building2, Settings, CreditCard, FileSignature, Receipt, Check, Mail, MessageSquare, Upload, Trash2, CheckSquare, Square, Plus, Edit2, ChevronLeft, ChevronRight } from "lucide-react"

interface CompanyFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void> | void
  initialData?: any
  mode: "add" | "edit"
}

// --- Định nghĩa các hằng số cho tab và dữ liệu ---

const PROVINCES = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Bình Dương", "Đồng Nai", "Quảng Ninh", "Thanh Hóa", "Nghệ An"
]
const INDUSTRIES = [
  "Sản xuất", "Thương mại", "Dịch vụ", "Xây dựng", "CNTT", "Vận tải", "Tài chính", "Bất động sản", "Y tế", "Giáo dục"
]
const PRICING_METHODS = [
  { value: 'bqtt', label: 'Bình quân tức thời' },
  { value: 'fifo', label: 'Phương pháp nhập trước xuất trước' },
  { value: 'bqck', label: 'Bình quân cuối kỳ' },
  { value: 'specific', label: 'Thực tế đích danh' },
];
const TAX_METHODS = [
  { value: 'accrual', label: 'Phương pháp khấu trừ' },
  { value: 'direct', label: 'Phương pháp trực tiếp' },
  { value: 'hybrid', label: 'Phương pháp hỗn hợp' },
];

// Khai báo các bước (steps) cho form, mỗi bước có id, title, icon
const steps = [
  { id: 0, title: 'Thông tin công ty', icon: Building2 },
  { id: 1, title: 'Thiết lập dữ liệu kế toán', icon: Settings },
  { id: 2, title: 'Cài đặt Firmbanking', icon: CreditCard },
  { id: 3, title: 'Cài đặt chữ ký', icon: FileSignature },
  { id: 4, title: 'Cài đặt hóa đơn', icon: Receipt },
];

export default function CompanyFormModal({ isOpen, onClose, onSubmit, initialData = {}, mode }: CompanyFormModalProps) {
  const [formData, setFormData] = useState<any>({})
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([0])
  const [activeInvoiceTab, setActiveInvoiceTab] = useState<'email'|'sms'|'digital-signature'>('email')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Sửa lỗi thiếu khai báo state cho bank modal và security modal
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState<{ bankName: string; accountNumber: string; accountOwner: string; branch: string }>({
    bankName: '',
    accountNumber: '',
    accountOwner: '',
    branch: ''
  });
  const [showAddSecurityModal, setShowAddSecurityModal] = useState(false);
  const [newSecurityQuestion, setNewSecurityQuestion] = useState<{ question: string; answer: string }>({ question: '', answer: '' });

  const requiredFieldsByStep: Record<number, string[]> = {
    0: ["companyType", "name", "taxCode", "address", "province", "taxOfficeCode", "accountingCompany", "accountingPeriod"],
    1: ["settings.accounting.decision", "settings.accounting.pricing", "settings.accounting.tax", "settings.accounting.lockMethod", "settings.accounting.decimal"],
    2: [],
    3: [],
    4: []
  };

  const getValueByPath = (obj: any, path: string) => {
    if (!path) return undefined;
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  };

  const validateStep = useCallback((step: number) => {
    const fields = requiredFieldsByStep[step] || [];
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      const value = getValueByPath(formData, field);
      if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
        newErrors[field] = 'Trường này là bắt buộc';
      }
    });

    if (step === 0) {
      if (formData.taxCode && !/^\d{10}$|^\d{13}$/.test(formData.taxCode)) {
        newErrors.taxCode = 'Mã số thuế phải có 10 hoặc 13 chữ số';
      }
    }

    if (step === 1) {
      const decimalValue = getValueByPath(formData, 'settings.accounting.decimal');
      if (decimalValue !== undefined && (isNaN(parseInt(decimalValue)) || parseInt(decimalValue) < 0 || parseInt(decimalValue) > 4)) {
        newErrors['settings.accounting.decimal'] = 'Số thập phân phải từ 0 đến 4';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const hasError = (fieldName: string) => {
    return !!(touched[fieldName] && errors[fieldName]);
  }

  const getInputClassName = (fieldName: string, baseClassName: string = "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent") => {
    if (hasError(fieldName)) {
      return `${baseClassName.replace('border-gray-300', 'border-red-500')} border-red-500`;
    }
    return `${baseClassName} border-gray-300`;
  };
  
  const getRadioContainerClassName = (fieldName: string) => {
    if (hasError(fieldName)) {
      return 'flex gap-6 border border-red-500 rounded px-3 py-2';
    }
    return 'flex gap-6 border border-gray-300 rounded px-3 py-2';
  }

  const validateForm = () => {
    const allFields = Object.values(requiredFieldsByStep).flat();
    const newTouched: Record<string, boolean> = {};
    allFields.forEach(field => newTouched[field] = true);
    setTouched(newTouched);

    let isAllValid = true;
    const allErrors: Record<string, string> = {};

    for (const step of Object.keys(requiredFieldsByStep).map(Number)) {
        const fields = requiredFieldsByStep[step] || [];
        fields.forEach(field => {
            const value = getValueByPath(formData, field);
            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
                allErrors[field] = 'Trường này là bắt buộc';
                isAllValid = false;
            }
        });
    }
    
    if (formData.taxCode && !/^\d{10}$|^\d{13}$/.test(formData.taxCode)) {
        allErrors.taxCode = 'Mã số thuế phải có 10 hoặc 13 chữ số';
        isAllValid = false;
    }
    const decimalValue = getValueByPath(formData, 'settings.accounting.decimal');
    if (decimalValue !== undefined && (isNaN(parseInt(decimalValue)) || parseInt(decimalValue) < 0 || parseInt(decimalValue) > 4)) {
        allErrors['settings.accounting.decimal'] = 'Số thập phân phải từ 0 đến 4';
        isAllValid = false;
    }

    setErrors(allErrors);
    if (!isAllValid) {
        for (const step of Object.keys(requiredFieldsByStep).map(Number)) {
            const hasErrorInStep = requiredFieldsByStep[step].some(field => allErrors[field]);
            if (hasErrorInStep) {
                setCurrentStep(step);
                break;
            }
        }
    }
    return isAllValid;
  }

  const handleNext = () => {
    const fieldsToTouch = requiredFieldsByStep[currentStep] || [];
    const newTouched = { ...touched };
    fieldsToTouch.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);

    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCompletedSteps(prev => Array.from(new Set([...prev, currentStep + 1])));
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSave = async () => {
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeModal = () => {
    if (!isSubmitting) onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] mx-2 sm:mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'edit' ? 'Chỉnh sửa công ty' : 'Thêm mới công ty'}
          </h2>
          <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Steps Navigation - Chuẩn hóa logic giống User/Customer */}
        <div className="border-b bg-gray-50 flex-shrink-0">
          <nav className="flex space-x-2 sm:space-x-8 px-4 sm:px-6 overflow-x-auto">
            {steps.map((step, index: number) => {
              const isClickable = completedSteps.includes(index) || index === currentStep
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (!isClickable) return;
                    // Nếu chuyển sang step khác, validate step hiện tại
                    if (index !== currentStep) {
                      if (validateStep(currentStep)) {
                        setCompletedSteps((prev) => Array.from(new Set([...prev, index])))
                        setCurrentStep(index)
                      }
                    }
                  }}
                  className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
                    currentStep === index
                      ? 'border-blue-500 text-blue-600'
                      : isClickable
                        ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        : 'border-transparent text-gray-500 cursor-not-allowed opacity-60'
                  }`}
                  disabled={!isClickable}
                >
                  <step.icon className="inline h-4 w-4 mr-1 sm:mr-2" />
                  {step.title}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Step 1: Thông tin công ty */}
          {currentStep === 0 && (
            <div className="space-y-6">
              {/* Required Fields Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <AlertCircle className="inline h-5 w-5 mr-2 text-gray-600" />
                  Thông tin bắt buộc
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Company Type */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Loại công ty <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.companyType || ''}
                      onChange={e => setFormData({ ...formData, companyType: e.target.value })}
                      className={getInputClassName('companyType')}
                    >
                      <option value="">Chọn loại công ty</option>
                      <option value="company">Công ty</option>
                      <option value="individual">Cá nhân</option>
                    </select>
                    {hasError('companyType') && (
                      <p className="text-red-500 text-sm mt-1">{errors.companyType}</p>
                    )}
                  </div>

                  {/* Company Name */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Tên công ty <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className={getInputClassName('name')}
                      placeholder="Nhập tên công ty"
                    />
                    {hasError('name') && (
                      <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>

                  {/* Tax Code */}
                  <div className="lg:col-span-2">
                    <label className="block font-medium text-gray-700 mb-2">
                      Mã số thuế <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.taxCode || ''}
                      onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                      className={getInputClassName('taxCode')}
                      placeholder="Nhập mã số thuế"
                      maxLength={13}
                    />
                    {hasError('taxCode') && (
                      <p className="text-red-500 text-sm mt-1">{errors.taxCode}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="lg:col-span-2">
                    <label className="block font-medium text-gray-700 mb-2">
                      Địa chỉ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.address || ''}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className={getInputClassName('address')}
                      placeholder="Nhập địa chỉ công ty"
                    />
                    {hasError('address') && (
                      <p className="text-red-500 text-sm mt-1">{errors.address}</p>
                    )}
                  </div>

                  {/* Province */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Tỉnh/Thành phố <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.province || ''}
                      onChange={e => setFormData({ ...formData, province: e.target.value })}
                      className={getInputClassName('province')}
                    >
                      <option value="">Chọn tỉnh/thành phố</option>
                      {PROVINCES.map(province => (
                        <option key={province} value={province}>{province}</option>
                      ))}
                    </select>
                    {hasError('province') && (
                      <p className="text-red-500 text-sm mt-1">{errors.province}</p>
                    )}
                  </div>

                  {/* Tax Office Code */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Mã cơ quan thuế <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.taxOfficeCode || ''}
                      onChange={e => setFormData({ ...formData, taxOfficeCode: e.target.value })}
                      className={getInputClassName('taxOfficeCode')}
                      placeholder="Nhập mã cơ quan thuế"
                    />
                    {hasError('taxOfficeCode') && (
                      <p className="text-red-500 text-sm mt-1">{errors.taxOfficeCode}</p>
                    )}
                  </div>

                  {/* Accounting Company */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Công ty kế toán phụ trách <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.accountingCompany || ''}
                      onChange={e => setFormData({ ...formData, accountingCompany: e.target.value })}
                      className={getInputClassName('accountingCompany')}
                      placeholder="Nhập tên công ty kế toán"
                    />
                    {hasError('accountingCompany') && (
                      <p className="text-red-500 text-sm mt-1">{errors.accountingCompany}</p>
                    )}
                  </div>

                  {/* Accounting Period */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Kỳ kế toán <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.accountingPeriod || ''}
                      onChange={e => setFormData({ ...formData, accountingPeriod: e.target.value })}
                      className={getInputClassName('accountingPeriod')}
                    >
                      <option value="">Chọn kỳ kế toán</option>
                      <option value="2024">Năm 2024</option>
                      <option value="2025">Năm 2025</option>
                      <option value="2026">Năm 2026</option>
                      <option value="2027">Năm 2027</option>
                      <option value="2028">Năm 2028</option>
                    </select>
                    {hasError('accountingPeriod') && (
                      <p className="text-red-500 text-sm mt-1">{errors.accountingPeriod}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Optional Fields Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Thông tin bổ sung</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Director Name */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Tên giám đốc
                    </label>
                    <input
                      type="text"
                      value={formData.directorName || ''}
                      onChange={e => setFormData({ ...formData, directorName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập tên giám đốc"
                    />
                  </div>

                  {/* Business Registration Number */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Số đăng ký kinh doanh
                    </label>
                    <input
                      type="text"
                      value={formData.businessRegistrationNumber || ''}
                      onChange={e => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập số đăng ký kinh doanh"
                    />
                  </div>

                  {/* Business Form */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Hình thức kinh doanh
                    </label>
                    <select
                      value={formData.businessForm || ''}
                      onChange={e => setFormData({ ...formData, businessForm: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Chọn hình thức kinh doanh</option>
                      <option value="Công ty trách nhiệm hữu hạn một thành viên">Công ty trách nhiệm hữu hạn một thành viên</option>
                      <option value="Công ty trách nhiệm hữu hạn hai thành viên trở lên">Công ty trách nhiệm hữu hạn hai thành viên trở lên</option>
                      <option value="Công ty cổ phần">Công ty cổ phần</option>
                      <option value="Công ty hợp danh">Công ty hợp danh</option>
                      <option value="Doanh nghiệp tư nhân">Doanh nghiệp tư nhân</option>
                      <option value="Hợp tác xã">Hợp tác xã</option>
                      <option value="Liên hiệp hợp tác xã">Liên hiệp hợp tác xã</option>
                    </select>
                  </div>

                  {/* Business Type */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Loại hình kinh doanh
                    </label>
                    <select
                      value={formData.businessType || ''}
                      onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Chọn loại hình kinh doanh</option>
                      {INDUSTRIES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">Số điện thoại</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập số điện thoại"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập email công ty"
                    />
                  </div>

                  {/* Fax */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Fax
                    </label>
                    <input
                      type="text"
                      value={formData.fax || ''}
                      onChange={e => setFormData({ ...formData, fax: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập số fax"
                    />
                  </div>

                  {/* Operation Start Date */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Ngày bắt đầu hoạt động
                    </label>
                    <input
                      type="date"
                      value={formData.operationStartDate || ''}
                      onChange={e => setFormData({ ...formData, operationStartDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Position Vietnamese */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Chức vụ (Tiếng Việt)
                    </label>
                    <input
                      type="text"
                      value={formData.positionVietnamese || 'Giám đốc'}
                      onChange={e => setFormData({ ...formData, positionVietnamese: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập chức vụ bằng tiếng Việt"
                    />
                  </div>

                  {/* Position English */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Chức vụ (Tiếng Anh)
                    </label>
                    <input
                      type="text"
                      value={formData.positionEnglish || 'Director'}
                      onChange={e => setFormData({ ...formData, positionEnglish: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter position in English"
                    />
                  </div>

                  {/* Position Korean */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Chức vụ (Tiếng Hàn)
                    </label>
                    <input
                      type="text"
                      value={formData.positionKorean || '감독'}
                      onChange={e => setFormData({ ...formData, positionKorean: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="한국어로 직책 입력"
                    />
                  </div>

                  {/* Position Chinese */}
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Chức vụ (Tiếng Trung)
                    </label>
                    <input
                      type="text"
                      value={formData.positionChinese || '董事'}
                      onChange={e => setFormData({ ...formData, positionChinese: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="输入中文职位"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Thiết lập kế toán */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Settings className="w-6 h-6 mr-2 text-blue-600" />
                  Thiết lập dữ liệu kế toán
                </h2>
                
                <div className="space-y-6">
                  {/* Quyết định/Thông tư */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Dữ liệu báo cáo thuế</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block font-medium text-gray-700 mb-2">
                          Quyết định/thông tư <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.settings?.accounting?.decision || ''}
                          onChange={e => setFormData({
                            ...formData,
                            settings: {
                              ...formData.settings!,
                              accounting: {
                                ...formData.settings?.accounting,
                                decision: e.target.value
                              }
                            }
                          })}
                          className={getInputClassName('settings.accounting.decision', "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent")}
                        >
                          <option value="">Chọn quyết định/thông tư</option>
                          <option value="c200">Quyết định 48/2006/QĐ-BTC (C200)</option>
                          <option value="c133">Thông tư 133/2016/TT-BTC (C133)</option>
                        </select>
                        {hasError('settings.accounting.decision') && (
                          <p className="text-red-500 text-sm mt-1">{errors['settings.accounting.decision']}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Calculation Methods */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Pricing Method */}
                    <div>
                      <label className="block font-medium text-gray-700 mb-2">
                        Phương pháp tính giá <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.settings?.accounting?.pricing || ''}
                        onChange={e => setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings!,
                            accounting: {
                              ...formData.settings?.accounting,
                              pricing: e.target.value
                            }
                          }
                        })}
                        className={getInputClassName('settings.accounting.pricing', "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent")}
                      >
                        <option value="">Chọn phương pháp tính giá</option>
                        {PRICING_METHODS.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                      {hasError('settings.accounting.pricing') && (
                        <p className="text-red-500 text-sm mt-1">{errors['settings.accounting.pricing']}</p>
                      )}
                    </div>

                    {/* Tax Method */}
                    <div>
                      <label className="block font-medium text-gray-700 mb-2">
                        Phương pháp tính thuế <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.settings?.accounting?.tax || ''}
                        onChange={e => setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings!,
                            accounting: {
                              ...formData.settings?.accounting,
                              tax: e.target.value
                            }
                          }
                        })}
                        className={getInputClassName('settings.accounting.tax', "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent")}
                      >
                        <option value="">Chọn phương pháp tính thuế</option>
                        {TAX_METHODS.map(method => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </select>
                      {hasError('settings.accounting.tax') && (
                        <p className="text-red-500 text-sm mt-1">{errors['settings.accounting.tax']}</p>
                      )}
                    </div>

                    {/* Closing Method - radio */}
                    <div>
                      <label className="block font-medium text-gray-700 mb-2">
                        Phương pháp khóa sổ <span className="text-red-500">*</span>
                      </label>
                      <div className={getRadioContainerClassName('settings.accounting.lockMethod')}>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="lockMethod"
                            value="basic"
                            checked={formData.settings?.accounting?.lockMethod === 'basic'}
                            onChange={e => setFormData({
                              ...formData,
                              settings: {
                                ...formData.settings!,
                                accounting: {
                                  ...formData.settings?.accounting,
                                  lockMethod: e.target.value
                                }
                              }
                            })}
                            className="accent-blue-600"
                          />
                          Cơ bản
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="lockMethod"
                            value="sequence"
                            checked={formData.settings?.accounting?.lockMethod === 'sequence'}
                            onChange={e => setFormData({
                              ...formData,
                              settings: {
                                ...formData.settings!,
                                accounting: {
                                  ...formData.settings?.accounting,
                                  lockMethod: e.target.value
                                }
                              }
                            })}
                            className="accent-blue-600"
                          />
                          Trình tự
                        </label>
                      </div>
                      {hasError('settings.accounting.lockMethod') && (
                        <p className="text-red-500 text-sm mt-1">{errors['settings.accounting.lockMethod']}</p>
                      )}
                    </div>

                    {/* Decimal Places - input number thay vì select */}
                    <div>
                      <label className="block font-medium text-gray-700 mb-2">
                        Số thập phân <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="4"
                        value={formData.settings?.accounting?.decimal ?? ''}
                        onChange={e => setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings!,
                            accounting: {
                              ...formData.settings?.accounting,
                              decimal: e.target.value === '' ? undefined : parseInt(e.target.value)
                            }
                          }
                        })}
                        className={getInputClassName('settings.accounting.decimal', "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent")}
                        placeholder="Nhập số thập phân (0-4)"
                      />
                      {hasError('settings.accounting.decimal') && (
                        <p className="text-red-500 text-sm mt-1">{errors['settings.accounting.decimal']}</p>
                      )}
                    </div>
                  </div>

                  {/* Additional Settings */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Cài đặt bổ sung</h3>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allowNegativeInventory"
                        checked={formData.settings?.accounting?.allowNegative || false}
                        onChange={e => setFormData({
                          ...formData,
                          settings: {
                            ...formData.settings!,
                            accounting: {
                              ...formData.settings?.accounting,
                              allowNegative: e.target.checked
                            }
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="allowNegativeInventory" className="ml-2 text-gray-700">
                        Cho phép xuất âm tồn kho
                      </label>
                    </div>
                  </div>

                  {/* Submit Button - Loại bỏ */}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Firmbanking */}
          {currentStep === 2 && (
            <div className="space-y-8">
              {/* Bank Accounts Management */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Quản lý tài khoản ngân hàng</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddBankModal(true)}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Thêm tài khoản
                  </button>
                </div>

                {/* Bank Accounts List */}
                <div className="space-y-3">
                  {formData.bankAccounts && formData.bankAccounts.length > 0 ? (
                    formData.bankAccounts.map((account: any, index: number) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{account.bankName}</h4>
                            <p className="text-sm text-gray-600">STK: {account.accountNumber}</p>
                            <p className="text-sm text-gray-600">Chủ TK: {account.accountOwner}</p>
                            <p className="text-sm text-gray-600">Chi nhánh: {account.branch}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => {
                                setNewBankAccount(account);
                                setShowAddBankModal(true);
                              }}
                              className="p-2 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newAccounts = formData.bankAccounts?.filter((_: any, i: number) => i !== index) || [];
                                setFormData({
                                  ...formData,
                                  bankAccounts: newAccounts
                                });
                              }}
                              className="p-2 text-gray-500 hover:text-red-600 transition-colors duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">Chưa có tài khoản ngân hàng nào</p>
                  )}
                </div>
              </div>

              {/* Modal thêm tài khoản ngân hàng */}
              {showAddBankModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                  <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {newBankAccount.accountNumber && formData.bankAccounts?.some((acc: any) => acc.accountNumber === newBankAccount.accountNumber) ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
                      </h3>
                      <button 
                        type="button"
                        onClick={() => {
                          setShowAddBankModal(false);
                          setNewBankAccount({ bankName: '', accountNumber: '', accountOwner: '', branch: '' });
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-medium text-gray-700 mb-1">
                            Tên ngân hàng
                          </label>
                          <input
                            type="text"
                            value={newBankAccount.bankName}
                            onChange={e => setNewBankAccount({...newBankAccount, bankName: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nhập tên ngân hàng"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-gray-700 mb-1">
                            Số tài khoản
                          </label>
                          <input
                            type="text"
                            value={newBankAccount.accountNumber}
                            onChange={e => setNewBankAccount({...newBankAccount, accountNumber: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nhập số tài khoản"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-medium text-gray-700 mb-1">
                            Tên chủ tài khoản
                          </label>
                          <input
                            type="text"
                            value={newBankAccount.accountOwner}
                            onChange={e => setNewBankAccount({...newBankAccount, accountOwner: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nhập tên chủ tài khoản"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-gray-700 mb-1">
                            Chi nhánh
                          </label>
                          <input
                            type="text"
                            value={newBankAccount.branch}
                            onChange={e => setNewBankAccount({...newBankAccount, branch: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nhập chi nhánh"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          if (newBankAccount.bankName && newBankAccount.accountNumber && newBankAccount.accountOwner && newBankAccount.branch) {
                            const currentAccounts = formData.bankAccounts || [];
                            const isEditing = currentAccounts.some((acc: any) => acc.accountNumber === newBankAccount.accountNumber);
                            
                            if (isEditing) {
                              setFormData({
                                ...formData,
                                bankAccounts: currentAccounts.map((acc: any) => 
                                  acc.accountNumber === newBankAccount.accountNumber ? newBankAccount : acc
                                )
                              });
                            } else {
                              setFormData({
                                ...formData,
                                bankAccounts: [...currentAccounts, newBankAccount]
                              });
                            }
                            
                            setNewBankAccount({ bankName: '', accountNumber: '', accountOwner: '', branch: '' });
                            setShowAddBankModal(false);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        {newBankAccount.accountNumber && formData.bankAccounts?.some((acc: any) => acc.accountNumber === newBankAccount.accountNumber) ? 'Cập nhật' : 'Thêm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewBankAccount({ bankName: '', accountNumber: '', accountOwner: '', branch: '' });
                          setShowAddBankModal(false);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* OTP Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Email nhận OTP
                  </label>
                  <input
                    type="email"
                    value={formData.otpEmail || ''}
                    onChange={e => setFormData({ ...formData, otpEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập email nhận OTP"
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Số điện thoại nhận OTP
                  </label>
                  <input
                    type="tel"
                    value={formData.otpPhone || ''}
                    onChange={e => setFormData({ ...formData, otpPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập số điện thoại nhận OTP"
                  />
                </div>
              </div>

              {/* Security Questions */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-800 flex items-center">
                    <Shield className="w-5 h-5 mr-2 text-red-600" />
                    Câu hỏi bảo mật
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddSecurityModal(true)}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Thêm câu hỏi
                  </button>
                </div>

                {/* Security Questions List */}
                <div className="space-y-3">
                  {formData.securityQuestions && formData.securityQuestions.length > 0 ? (
                    formData.securityQuestions.map((question: any, index: number) => (
                      <div key={index as number} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{question.question}</p>
                            <p className="text-sm text-gray-600 mt-1">Câu trả lời: {question.answer}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newQuestions = formData.securityQuestions?.filter((_: any, i: number) => i !== index) || [];
                              setFormData({
                                ...formData,
                                securityQuestions: newQuestions
                              });
                            }}
                            className="p-1 text-gray-500 hover:text-red-600 transition-colors duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">Chưa có câu hỏi bảo mật nào</p>
                  )}
                </div>

                {/* Modal thêm câu hỏi bảo mật */}
                {showAddSecurityModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Thêm câu hỏi bảo mật</h3>
                        <button 
                          type="button"
                          onClick={() => setShowAddSecurityModal(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block font-medium text-gray-700 mb-1">
                            Câu hỏi
                          </label>
                          <select
                            value={newSecurityQuestion.question}
                            onChange={e => setNewSecurityQuestion({...newSecurityQuestion, question: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Chọn câu hỏi</option>
                            <option value="Tên trường tiểu học đầu tiên của bạn?">Tên trường tiểu học đầu tiên của bạn?</option>
                            <option value="Tên thú cưng đầu tiên của bạn?">Tên thú cưng đầu tiên của bạn?</option>
                            <option value="Tên người bạn thân nhất thời thơ ấu?">Tên người bạn thân nhất thời thơ ấu?</option>
                            <option value="Tên phố nơi bạn sinh ra?">Tên phố nơi bạn sinh ra?</option>
                            <option value="Món ăn yêu thích của bạn?">Món ăn yêu thích của bạn?</option>
                            <option value="Tên của giáo viên chủ nhiệm lớp 12?">Tên của giáo viên chủ nhiệm lớp 12?</option>
                            <option value="Màu sắc yêu thích của bạn?">Màu sắc yêu thích của bạn?</option>
                            <option value="Tên quê hương của cha/mẹ bạn?">Tên quê hương của cha/mẹ bạn?</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-medium text-gray-700 mb-1">
                            Câu trả lời
                          </label>
                          <input
                            type="text"
                            value={newSecurityQuestion.answer}
                            onChange={e => setNewSecurityQuestion({...newSecurityQuestion, answer: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nhập câu trả lời"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            if (newSecurityQuestion.question && newSecurityQuestion.answer) {
                              const currentQuestions = formData.securityQuestions || [];
                              setFormData({
                                ...formData,
                                securityQuestions: [...currentQuestions, newSecurityQuestion]
                              });
                              setNewSecurityQuestion({ question: '', answer: '' });
                              setShowAddSecurityModal(false);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Thêm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewSecurityQuestion({ question: '', answer: '' });
                            setShowAddSecurityModal(false);
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Chữ ký */}
          {currentStep === 3 && (
            <div className="space-y-8">
              {/* Form nhập tên chức danh */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Chữ ký</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="w-40 text-gray-700 font-medium">Giám đốc</label>
                      <input
                        type="text"
                        value={formData.directorName || ''}
                        onChange={e => setFormData({ ...formData, directorName: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập tên giám đốc"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="w-40 text-gray-700 font-medium">Kế toán trưởng</label>
                      <input
                        type="text"
                        value={formData.chiefAccountant || ''}
                        onChange={e => setFormData({ ...formData, chiefAccountant: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập tên kế toán trưởng"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="w-40 text-gray-700 font-medium">Thủ quỹ</label>
                      <input
                        type="text"
                        value={formData.treasurer || ''}
                        onChange={e => setFormData({ ...formData, treasurer: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập tên thủ quỹ"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="w-40 text-gray-700 font-medium">Thủ kho</label>
                      <input
                        type="text"
                        value={formData.warehouseKeeper || ''}
                        onChange={e => setFormData({ ...formData, warehouseKeeper: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập tên thủ kho"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="w-40 text-gray-700 font-medium">Người lập biểu</label>
                      <input
                        type="text"
                        value={formData.reportMaker || ''}
                        onChange={e => setFormData({ ...formData, reportMaker: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập tên người lập biểu"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="w-40 text-gray-700 font-medium">Người kiểm tra</label>
                      <input
                        type="text"
                        value={formData.inspector || ''}
                        onChange={e => setFormData({ ...formData, inspector: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập tên người kiểm tra"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng chữ ký và dấu */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 border-b text-left font-semibold">Chức vụ</th>
                      <th className="px-4 py-2 border-b text-left font-semibold">Chữ ký và dấu (Hình ảnh)</th>
                      <th className="px-4 py-2 border-b text-center font-semibold">Sử dụng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'director', label: 'Giám đốc' },
                      { key: 'chiefAccountant', label: 'Kế toán trưởng' },
                      { key: 'treasurer', label: 'Thủ quỹ' },
                      { key: 'warehouseKeeper', label: 'Thủ kho' },
                      { key: 'reportMaker', label: 'Người lập biểu' },
                      { key: 'inspector', label: 'Người kiểm tra' },
                    ].map(({ key, label }) => (
                      <tr key={key} className="even:bg-gray-50">
                        <td className="px-4 py-2 align-middle">{label}</td>
                        <td className="px-4 py-2 align-middle">
                          <div className="flex items-center gap-3">
                            {formData[`${key}SignaturePreview`] ? (
                              <img src={formData[`${key}SignaturePreview`]} alt="Signature" className="h-12 max-w-[120px] object-contain border border-gray-200 rounded bg-white" />
                            ) : (
                              <span className="italic text-gray-400">Chưa có</span>
                            )}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
                                  if (!allowedTypes.includes(file.type)) {
                                    alert('Chỉ chấp nhận file hình ảnh (PNG, JPG, JPEG)');
                                    return;
                                  }
                                  if (file.size > 5 * 1024 * 1024) {
                                    alert('Kích thước file không được vượt quá 5MB');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    setFormData({
                                      ...formData,
                                      [`${key}SignatureFile`]: file,
                                      [`${key}SignaturePreview`]: event.target?.result as string
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                              id={`file-${key}`}
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById(`file-${key}`)?.click()}
                              className="inline-flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              {formData[`${key}SignaturePreview`] ? 'Thay đổi' : 'Upload'}
                            </button>
                            {formData[`${key}SignaturePreview`] && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    [`${key}SignatureFile`]: undefined,
                                    [`${key}SignaturePreview`]: undefined
                                  });
                                  const input = document.getElementById(`file-${key}`) as HTMLInputElement;
                                  if (input) input.value = '';
                                }}
                                className="inline-flex items-center px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Xóa
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              [`${key}Enabled`]: !(formData[`${key}Enabled`] ?? true)
                            })}
                            className="focus:outline-none"
                            tabIndex={-1}
                          >
                            {formData[`${key}Enabled`] ?? true ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 2 checkbox tuỳ chọn */}
              <div className="flex flex-col gap-3 mt-4">
                <label className="inline-flex items-center text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.printAllReports ?? true}
                    onChange={e => setFormData({ ...formData, printAllReports: e.target.checked })}
                    className="h-4 w-4 accent-blue-600 border-gray-300 rounded mr-3 focus:ring-blue-500 focus:ring-2"
                  />
                  In trên tất cả báo cáo
                </label>
                <label className="inline-flex items-center text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoFillMaker ?? true}
                    onChange={e => setFormData({ ...formData, autoFillMaker: e.target.checked })}
                    className="h-4 w-4 accent-blue-600 border-gray-300 rounded mr-3 focus:ring-blue-500 focus:ring-2"
                  />
                  Lấy tên người lập chứng từ theo tên người đăng nhập
                </label>
              </div>
            </div>
          )}

          {/* Step 5: Hóa đơn */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Sub-tabs cho Hóa đơn */}
              <div className="border-b border-gray-200">
                <div className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-hide">
                  <button
                    className={`px-2 sm:px-4 py-2 rounded-t-md font-medium flex items-center space-x-1 sm:space-x-2 focus:outline-none transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm ${activeInvoiceTab === 'email' ? 'bg-white border-x border-t border-gray-200 text-blue-600' : 'bg-gray-50 text-gray-500 hover:text-blue-700'}`}
                    onClick={() => setActiveInvoiceTab('email')}
                  >
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Thiết lập email gửi hóa đơn</span>
                    <span className="sm:hidden">Email</span>
                  </button>
                  <button
                    className={`px-2 sm:px-4 py-2 rounded-t-md font-medium flex items-center space-x-1 sm:space-x-2 focus:outline-none transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm ${activeInvoiceTab === 'sms' ? 'bg-white border-x border-t border-gray-200 text-blue-600' : 'bg-gray-50 text-gray-500 hover:text-blue-700'}`}
                    onClick={() => setActiveInvoiceTab('sms')}
                  >
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Thiết lập SMS gửi hóa đơn</span>
                    <span className="sm:hidden">SMS</span>
                  </button>
                  <button
                    className={`px-2 sm:px-4 py-2 rounded-t-md font-medium flex items-center space-x-1 sm:space-x-2 focus:outline-none transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm ${activeInvoiceTab === 'digital-signature' ? 'bg-white border-x border-t border-gray-200 text-blue-600' : 'bg-gray-50 text-gray-500 hover:text-blue-700'}`}
                    onClick={() => setActiveInvoiceTab('digital-signature')}
                  >
                    <Usb className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">Thiết lập chữ ký số</span>
                    <span className="sm:hidden">Chữ ký số</span>
                  </button>
                </div>
              </div>

              {/* Tab Thiết lập email gửi hóa đơn */}
              {activeInvoiceTab === 'email' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Nhà cung cấp</label>
                      <input 
                        type="text" 
                        value={formData.emailProvider || ''}
                        onChange={e => setFormData({ ...formData, emailProvider: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Gmail, Outlook, Yahoo..."
                      />
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block font-medium text-gray-700 mb-1">Máy chủ Mail <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          value={formData.emailServer || ''}
                          onChange={e => setFormData({ ...formData, emailServer: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div className="w-20 sm:w-24">
                        <label className="block font-medium text-gray-700 mb-1">Cổng <span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          value={formData.emailPort || '587'}
                          onChange={e => setFormData({ ...formData, emailPort: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Tên người gửi <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={formData.emailSenderName || ''}
                        onChange={e => setFormData({ ...formData, emailSenderName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Tên hiển thị khi gửi email"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Email gửi <span className="text-red-500">*</span></label>
                      <input 
                        type="email" 
                        value={formData.emailSender || ''}
                        onChange={e => setFormData({ ...formData, emailSender: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="your-email@gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Tên đăng nhập <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={formData.emailUsername || ''}
                        onChange={e => setFormData({ ...formData, emailUsername: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Tên đăng nhập email"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                      <input 
                        type="password" 
                        value={formData.emailPassword || ''}
                        onChange={e => setFormData({ ...formData, emailPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block font-medium text-gray-700 mb-1">Phương thức bảo mật</label>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <label className="flex items-center gap-1">
                            <input 
                              type="radio" 
                              name="security" 
                              value="None" 
                              checked={formData.emailSecurity === 'None'}
                              onChange={e => setFormData({ ...formData, emailSecurity: e.target.value })}
                              className="accent-blue-600" 
                            />
                            None
                          </label>
                          <label className="flex items-center gap-1">
                            <input 
                              type="radio" 
                              name="security" 
                              value="SSL" 
                              checked={formData.emailSecurity === 'SSL'}
                              onChange={e => setFormData({ ...formData, emailSecurity: e.target.value })}
                              className="accent-blue-600" 
                            />
                            SSL
                          </label>
                          <label className="flex items-center gap-1">
                            <input 
                              type="radio" 
                              name="security" 
                              value="TLS" 
                              checked={formData.emailSecurity === 'TLS' || !formData.emailSecurity}
                              onChange={e => setFormData({ ...formData, emailSecurity: e.target.value })}
                              className="accent-blue-600" 
                            />
                            TLS
                          </label>
                        </div>
                        <button type="button" className="w-full sm:w-auto px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Kiểm tra kết nối</button>
                      </div>
                    </div>
                    <div className="lg:col-span-2">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 mt-2">
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="useAmnote" 
                            value="amnote" 
                            checked={formData.emailProvider === 'amnote' || !formData.emailProvider}
                            onChange={e => setFormData({ ...formData, emailProvider: e.target.value })}
                            className="accent-blue-600" 
                          />
                          Sử dụng email AMnote
                        </label>
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="useAmnote" 
                            value="amnote2" 
                            checked={formData.emailProvider === 'amnote2'}
                            onChange={e => setFormData({ ...formData, emailProvider: e.target.value })}
                            className="accent-blue-600" 
                          />
                          Sử dụng gmail AMnote
                        </label>
                        <label className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="useAmnote" 
                            value="other" 
                            checked={formData.emailProvider === 'other'}
                            onChange={e => setFormData({ ...formData, emailProvider: e.target.value })}
                            className="accent-blue-600" 
                          />
                          Khác
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Thiết lập SMS gửi hóa đơn */}
              {activeInvoiceTab === 'sms' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Api Key <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={formData.smsApiKey || ''}
                        onChange={e => setFormData({ ...formData, smsApiKey: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Nhập API Key SMS"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Secret Key <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={formData.smsSecretKey || ''}
                        onChange={e => setFormData({ ...formData, smsSecretKey: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Nhập Secret Key SMS"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block font-medium text-gray-700 mb-1">Brand Name <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={formData.smsBrandName || ''}
                        onChange={e => setFormData({ ...formData, smsBrandName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Tên thương hiệu hiển thị khi gửi SMS"
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block font-medium text-gray-700 mb-1">Mẫu tin nhắn</label>
                      <textarea 
                        rows={3}
                        value={formData.smsTemplate || 'Quy khach da nhan hoa don dien tu tu {COMPANY_NAME}. Ma so hoa don: {INVOICE_NUMBER}. Tong tien: {TOTAL_AMOUNT}. Cam on!'}
                        onChange={e => setFormData({ ...formData, smsTemplate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Nhập mẫu tin nhắn SMS"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Có thể sử dụng: {'{COMPANY_NAME}'}, {'{INVOICE_NUMBER}'}, {'{TOTAL_AMOUNT}'}, {'{CUSTOMER_NAME}'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Thiết lập chữ ký số */}
              {activeInvoiceTab === 'digital-signature' && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Nhà cung cấp chữ ký số</label>
                      <select 
                        value={formData.digitalSignatureProvider || ''}
                        onChange={e => setFormData({ ...formData, digitalSignatureProvider: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Chọn nhà cung cấp</option>
                        <option value="viettel-ca">Viettel-CA</option>
                        <option value="vnpt-ca">VNPT-CA</option>
                        <option value="fpt-ca">FPT-CA</option>
                        <option value="newtel-ca">Newtel-CA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">File chứng thư số (.p12)</label>
                      <input 
                        type="file" 
                        accept=".p12,.pfx"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, certificateFile: file.name });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Mật khẩu chứng thư số <span className="text-red-500">*</span></label>
                      <input 
                        type="password" 
                        value={formData.certificatePassword || ''}
                        onChange={e => setFormData({ ...formData, certificatePassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        placeholder="Nhập mật khẩu chứng thư số"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Ngày hết hạn</label>
                      <input 
                        type="date" 
                        value={formData.certificateExpiry || ''}
                        onChange={e => setFormData({ ...formData, certificateExpiry: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      />
                    </div>
                    <div className="lg:col-span-2">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="autoSign"
                          checked={formData.autoDigitalSign || false}
                          onChange={e => setFormData({ ...formData, autoDigitalSign: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="autoSign" className="text-gray-700">
                          Tự động ký số khi xuất hóa đơn
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer với nút điều hướng step */}
        <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {currentStep > 0 && (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex items-center gap-2 p-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span className="hidden sm:inline">Quay lại</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative group">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex items-center gap-2 p-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <X className="w-5 h-5" />
                  <span className="hidden sm:inline">Hủy</span>
                </button>
              </div>

              {currentStep < steps.length - 1 ? (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <ChevronRight className="w-5 h-5" />
                    <span className="hidden sm:inline">Tiếp tục</span>
                  </button>
                </div>
              ) : (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Check className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    <span className="hidden sm:inline">{isSubmitting ? 'Đang lưu...' : (mode === 'edit' ? 'Cập nhật' : 'Thêm mới')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
