import React, { useState } from 'react';
import { Save, AlertCircle, Building2 } from 'lucide-react';
import type { CompanyInfo, FormErrors } from '../types';

const CompanyInfoTab: React.FC = () => {
  const [formData, setFormData] = useState<CompanyInfo>({
    companyName: '',
    address: '',
    taxCode: '',
    province: '',
    taxOfficeCode: '',
    phone: '',
    email: '',
    companyType: '',
    accountingCompany: '',
    accountingPeriod: '',
    directorName: '',
    businessRegistrationNumber: '',
    businessForm: '',
    businessType: '',
    fax: '',
    operationStartDate: '',
    positionVietnamese: 'Giám đốc',
    positionEnglish: 'Director',
    positionKorean: '감독',
    positionChinese: '董事',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const provinces = [
    'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
    'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
    'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
    'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
    'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
    'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
  ];

  const businessForms = [
    'Công ty trách nhiệm hữu hạn một thành viên',
    'Công ty trách nhiệm hữu hạn hai thành viên trở lên',
    'Công ty cổ phần',
    'Công ty hợp danh',
    'Doanh nghiệp tư nhân',
    'Hợp tác xã',
    'Liên hiệp hợp tác xã',
  ];

  const businessTypes = [
    'Sản xuất',
    'Thương mại',
    'Dịch vụ',
    'Vận tải',
    'Xây dựng',
    'Tài chính - Ngân hàng',
    'Bất động sản',
    'Công nghệ thông tin',
    'Y tế',
    'Giáo dục',
    'Du lịch',
    'Khác',
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Tên công ty là bắt buộc';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Địa chỉ là bắt buộc';
    }

    if (!formData.taxCode.trim()) {
      newErrors.taxCode = 'Mã số thuế là bắt buộc';
    } else if (!/^\d{10}$|^\d{13}$/.test(formData.taxCode)) {
      newErrors.taxCode = 'Mã số thuế phải có 10 hoặc 13 chữ số';
    }

    if (!formData.province) {
      newErrors.province = 'Vui lòng chọn tỉnh/thành phố';
    }

    if (!formData.companyType) {
      newErrors.companyType = 'Vui lòng chọn loại công ty';
    }

    if (!formData.accountingCompany.trim()) {
      newErrors.accountingCompany = 'Công ty kế toán phụ trách là bắt buộc';
    }

    if (!formData.accountingPeriod) {
      newErrors.accountingPeriod = 'Vui lòng chọn kỳ kế toán';
    }

    if (!formData.taxOfficeCode.trim()) {
      newErrors.taxOfficeCode = 'Mã cơ quan thuế là bắt buộc';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (formData.phone && !/^[0-9+\-\s\(\)]{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Saving company info:', formData);
      // Handle save logic here
    }
  };

  const handleInputChange = (field: keyof CompanyInfo, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h2 className="text-[13px] font-semibold text-gray-900 mb-6 flex items-center">
          <Building2 className="w-6 h-6 mr-2 text-blue-600" />
          Thông tin công ty
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields Section */}
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
            <h3 className="text-[13px] font-medium text-gray-800 mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
              Thông tin bắt buộc
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Company Type */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Loại công ty <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.companyType}
                  onChange={(e) => handleInputChange('companyType', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.companyType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Chọn loại công ty</option>
                  <option value="company">Công ty</option>
                  <option value="individual">Cá nhân</option>
                </select>
                {errors.companyType && (
                  <p className="mt-1 text-[13px] text-red-600">{errors.companyType}</p>
                )}
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Tên công ty <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.companyName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Nhập tên công ty"
                />
                {errors.companyName && (
                  <p className="mt-1 text-[13px] text-red-600">{errors.companyName}</p>
                )}
              </div>

              {/* Tax Code */}
              <div className="lg:col-span-2">
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Mã số thuế <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.taxCode}
                  onChange={(e) => handleInputChange('taxCode', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.taxCode ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Nhập mã số thuế"
                />
                {errors.taxCode && (
                  <p className="mt-1 text-[13px] text-red-600">{errors.taxCode}</p>
                )}
              </div>

              {/* Address */}
              <div className="lg:col-span-2">
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Địa chỉ <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Nhập địa chỉ công ty"
                />
                {errors.address && (
                  <p className="mt-1 text-[13px] text-red-600">{errors.address}</p>
                )}
              </div>

              {/* Province */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Tỉnh/Thành phố <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.province}
                  onChange={(e) => handleInputChange('province', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.province ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Chọn tỉnh/thành phố</option>
                  {provinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
                {errors.province && (
                  <p className="mt-1 text-[13px] text-red-600">{errors.province}</p>
                )}
              </div>

              {/* Tax Office Code */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Mã cơ quan thuế <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.taxOfficeCode}
                  onChange={(e) => handleInputChange('taxOfficeCode', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.taxOfficeCode ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Nhập mã cơ quan thuế"
                />
                {errors.taxOfficeCode && (
                  <p className="mt-1 text-[13px] text-red-600">{errors.taxOfficeCode}</p>
                )}
              </div>

              {/* Accounting Company */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Công ty kế toán phụ trách <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.accountingCompany}
                  onChange={(e) => handleInputChange('accountingCompany', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.accountingCompany ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Nhập tên công ty kế toán"
                />
                {errors.accountingCompany && (
                  <p className="mt-1 text-[13px] text-red-600">{errors.accountingCompany}</p>
                )}
              </div>

              {/* Accounting Period */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Kỳ kế toán <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.accountingPeriod}
                  onChange={(e) => handleInputChange('accountingPeriod', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.accountingPeriod ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Chọn kỳ kế toán</option>
                  <option value="2024">Năm 2024</option>
                  <option value="2025">Năm 2025</option>
                  <option value="2026">Năm 2026</option>
                  <option value="2027">Năm 2027</option>
                  <option value="2028">Năm 2028</option>
                </select>
                {errors.accountingPeriod && (
                  <p className="mt-1 text-[13px] text-red-600">{errors.accountingPeriod}</p>
                )}
              </div>
            </div>
          </div>

          {/* Optional Fields Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-[13px] font-medium text-gray-800 mb-4">Thông tin bổ sung</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Director Name */}
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Tên giám đốc
                </label>
                <input
                  type="text"
                  value={formData.directorName || ''}
                  onChange={(e) => handleInputChange('directorName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  onChange={(e) => handleInputChange('businessRegistrationNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  onChange={(e) => handleInputChange('businessForm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Chọn hình thức kinh doanh</option>
                  {businessForms.map((form) => (
                    <option key={form} value={form}>
                      {form}
                    </option>
                  ))}
                </select>
              </div>

              {/* Business Type */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Loại hình kinh doanh
                </label>
                <select
                  value={formData.businessType || ''}
                  onChange={(e) => handleInputChange('businessType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Chọn loại hình kinh doanh</option>
                  {businessTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Nhập số điện thoại"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Nhập email công ty"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Fax */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Fax
                </label>
                <input
                  type="text"
                  value={formData.fax || ''}
                  onChange={(e) => handleInputChange('fax', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  onChange={(e) => handleInputChange('operationStartDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Position Vietnamese */}
              <div>
                <label className="block font-medium text-gray-700 mb-2">
                  Chức vụ (Tiếng Việt)
                </label>
                <input
                  type="text"
                  value={formData.positionVietnamese || ''}
                  onChange={(e) => handleInputChange('positionVietnamese', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  value={formData.positionEnglish || ''}
                  onChange={(e) => handleInputChange('positionEnglish', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  value={formData.positionKorean || ''}
                  onChange={(e) => handleInputChange('positionKorean', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  value={formData.positionChinese || ''}
                  onChange={(e) => handleInputChange('positionChinese', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入中文职位"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 sm:px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 text-sm"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyInfoTab;
