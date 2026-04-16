import React, { useState } from 'react';
import { Save, Settings2 } from 'lucide-react';
import type { AccountingSettings, FormErrors } from '../types';

const AccountingSettingsTab: React.FC = () => {
  const [formData, setFormData] = useState<AccountingSettings>({
    cDecision: '', // 'c200' | 'c133'
    pricingMethod: '',
    taxMethod: '',
    closingMethod: '',
    allowNegativeInventory: false,
    decimalPlaces: 2,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const pricingMethods = [
    { value: 'bqtt', label: 'Bình quân tức thời' },
    { value: 'fifo', label: 'Phương pháp nhập trước xuất trước' },
    { value: 'bqck', label: 'Bình quân cuối kỳ' },
    { value: 'specific', label: 'Thực tế đích danh' },
  ];

  const taxMethods = [
    { value: 'accrual', label: 'Phương pháp khấu trừ' },
    { value: 'direct', label: 'Phương pháp trực tiếp' },
    { value: 'hybrid', label: 'Phương pháp hỗn hợp' },
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.pricingMethod) {
      newErrors.pricingMethod = 'Vui lòng chọn phương pháp tính giá';
    }

    if (!formData.taxMethod) {
      newErrors.taxMethod = 'Vui lòng chọn phương pháp tính thuế';
    }

    if (!formData.closingMethod) {
      newErrors.closingMethod = 'Vui lòng chọn phương pháp khóa sổ';
    }

    if (formData.decimalPlaces < 0 || formData.decimalPlaces > 4) {
      newErrors.decimalPlaces = 'Số thập phân phải từ 0 đến 4';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Saving accounting settings:', formData);
      // Handle save logic here
    }
  };

  const handleInputChange = (field: keyof AccountingSettings, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
            <h2 className="text-[13px] font-semibold text-gray-900 mb-6 flex items-center">
          <Settings2 className="w-6 h-6 mr-2 text-blue-600" />
          Thiết lập dữ liệu kế toán
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quyết định/Thông tư */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-[13px] font-medium text-gray-800 mb-4">Dữ liệu báo cáo thuế</h3>
            <div className="space-y-4">
              <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Quyết định/thông tư <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.cDecision}
                  onChange={e => handleInputChange('cDecision', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Chọn quyết định/thông tư</option>
                  <option value="c200">Quyết định 48/2006/QĐ-BTC (C200)</option>
                  <option value="c133">Thông tư 133/2016/TT-BTC (C133)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Calculation Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pricing Method */}
            <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Phương pháp tính giá <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.pricingMethod}
                onChange={(e) => handleInputChange('pricingMethod', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.pricingMethod ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Chọn phương pháp tính giá</option>
                {pricingMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
              {errors.pricingMethod && (
                <p className="mt-1 text-sm text-red-600">{errors.pricingMethod}</p>
              )}
            </div>

            {/* Tax Method */}
            <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Phương pháp tính thuế <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.taxMethod}
                onChange={(e) => handleInputChange('taxMethod', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.taxMethod ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Chọn phương pháp tính thuế</option>
                {taxMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
              {errors.taxMethod && (
                <p className="mt-1 text-sm text-red-600">{errors.taxMethod}</p>
              )}
            </div>

            {/* Closing Method - radio */}
            <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Phương pháp khóa sổ <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6 border border-gray-300 rounded px-3 py-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="closingMethod"
                    value="basic"
                    checked={formData.closingMethod === 'basic'}
                    onChange={e => handleInputChange('closingMethod', e.target.value)}
                    className="accent-blue-600"
                  />
                  Cơ bản
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="closingMethod"
                    value="sequence"
                    checked={formData.closingMethod === 'sequence'}
                    onChange={e => handleInputChange('closingMethod', e.target.value)}
                    className="accent-blue-600"
                  />
                  Trình tự
                </label>
              </div>
              {errors.closingMethod && (
                <p className="mt-1 text-sm text-red-600">{errors.closingMethod}</p>
              )}
            </div>

            {/* Decimal Places */}
            <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Số thập phân <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="4"
                value={formData.decimalPlaces}
                onChange={(e) => handleInputChange('decimalPlaces', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.decimalPlaces ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nhập số thập phân (0-4)"
              />
              {errors.decimalPlaces && (
                <p className="mt-1 text-sm text-red-600">{errors.decimalPlaces}</p>
              )}
            </div>
          </div>

          {/* Additional Settings */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-[13px] font-medium text-gray-800 mb-4">Cài đặt bổ sung</h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowNegativeInventory"
                checked={formData.allowNegativeInventory}
                onChange={(e) => handleInputChange('allowNegativeInventory', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="allowNegativeInventory" className="ml-2 text-[13px] text-gray-700">
                Cho phép xuất âm tồn kho
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
                  className="inline-flex items-center justify-center px-4 sm:px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 text-[13px]"
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

export default AccountingSettingsTab;
