import React, { useState, useRef } from 'react';
import { Save, Upload, FileSignature, Trash2, Eye, CheckSquare, Square } from 'lucide-react';

const defaultSigners = [
  { key: 'director', label: 'Giám đốc' },
  { key: 'chiefAccountant', label: 'Kế toán trưởng' },
  { key: 'treasurer', label: 'Thủ quỹ' },
  { key: 'warehouseKeeper', label: 'Thủ kho' },
  { key: 'reportMaker', label: 'Người lập biểu' },
  { key: 'inspector', label: 'Người kiểm tra' },
];

type Signer = {
  key: string;
  label: string;
  name: string;
  signatureFile?: File;
  signaturePreview?: string;
  enabled: boolean;
};

const SignatureTab: React.FC = () => {
  // Danh sách chức danh và chữ ký
  const [signers, setSigners] = useState<Signer[]>(
    defaultSigners.map(s => ({ ...s, name: '', enabled: true }))
  );
  // Để lưu ref input file cho từng dòng
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  // State cho validation errors
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Xử lý đổi tên chức danh
  const handleNameChange = (idx: number, value: string) => {
    setSigners(prev => prev.map((s, i) => i === idx ? { ...s, name: value } : s));
    // Clear error khi user bắt đầu nhập
    if (errors[`signer_${idx}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`signer_${idx}`];
        return newErrors;
      });
    }
  };
  // Xử lý upload chữ ký/dấu
  const handleFileUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
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
        setSigners(prev => prev.map((s, i) => i === idx ? { ...s, signatureFile: file, signaturePreview: event.target?.result as string } : s));
      };
      reader.readAsDataURL(file);
    }
  };
  // Xóa chữ ký
  const handleRemoveSignature = (idx: number) => {
    setSigners(prev => prev.map((s, i) => i === idx ? { ...s, signatureFile: undefined, signaturePreview: undefined } : s));
    if (fileInputRefs.current[idx]) fileInputRefs.current[idx]!.value = '';
  };
  // Bật/tắt sử dụng
  const handleToggleEnabled = (idx: number) => {
    setSigners(prev => prev.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s));
    // Clear error khi disable signer
    if (errors[`signer_${idx}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`signer_${idx}`];
        return newErrors;
      });
    }
  };

  // 2 checkbox tuỳ chọn
  const [printAllReports, setPrintAllReports] = useState(true);
  const [autoFillMaker, setAutoFillMaker] = useState(true);

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: {[key: string]: string} = {};
    
    signers.forEach((signer, idx) => {
      if (signer.enabled && !signer.name.trim()) {
        newErrors[`signer_${idx}`] = `Vui lòng nhập tên ${signer.label.toLowerCase()}`;
      }
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Clear errors if validation passes
    setErrors({});
    
    // Xử lý lưu dữ liệu signers và 2 tuỳ chọn
    console.log('Saving signature data:', { signers, printAllReports, autoFillMaker });
    alert('Đã lưu thiết lập chữ ký!');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <FileSignature className="w-6 h-6 mr-2 text-blue-600" />
          Cài đặt chữ ký điện tử
        </h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Form nhập tên chức danh */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Chữ ký</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signers.map((s, idx) => (
                <div key={s.key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="w-40 text-gray-700 text-[13px] font-medium">{s.label}</label>
                    <input
                      type="text"
                      value={s.name}
                      onChange={e => handleNameChange(idx, e.target.value)}
                      className={`flex-1 px-3 py-2 border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        errors[`signer_${idx}`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={`Nhập tên ${s.label.toLowerCase()}`}
                    />
                  </div>
                  {errors[`signer_${idx}`] && (
                    <p className="text-red-500 text-xs ml-40">{errors[`signer_${idx}`]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bảng chữ ký và dấu */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 border-b text-left font-semibold">Chức vụ</th>
                  <th className="px-4 py-2 border-b text-left font-semibold">Chữ ký và dấu (Hình ảnh)</th>
                  <th className="px-4 py-2 border-b text-center font-semibold">Sử dụng</th>
                  {/* Bỏ cột thao tác */}
                </tr>
              </thead>
              <tbody>
                {signers.map((s, idx) => (
                  <tr key={s.key} className="even:bg-gray-50">
                    <td className="px-4 py-2 align-middle">{s.label}</td>
                    <td className="px-4 py-2 align-middle">
                      <div className="flex items-center gap-3">
                        {s.signaturePreview ? (
                          <img src={s.signaturePreview} alt="Signature" className="h-12 max-w-[120px] object-contain border border-gray-200 rounded bg-white" />
                        ) : (
                          <span className="italic text-gray-400">Chưa có</span>
                        )}
                        <input
                          ref={el => fileInputRefs.current[idx] = el}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={e => handleFileUpload(idx, e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[idx]?.click()}
                          className="inline-flex items-center px-3 py-1 text-[13px] bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          {s.signaturePreview ? 'Thay đổi' : 'Upload'}
                        </button>
                        {s.signaturePreview && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSignature(idx)}
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
                        onClick={() => handleToggleEnabled(idx)}
                        className="focus:outline-none"
                        tabIndex={-1}
                      >
                        {s.enabled ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    {/* Bỏ cột thao tác */}
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
                checked={printAllReports}
                onChange={e => setPrintAllReports(e.target.checked)}
                className="h-4 w-4 accent-blue-600 border-gray-300 rounded mr-3 focus:ring-blue-500 focus:ring-2"
              />
              In trên tất cả báo cáo
            </label>
            <label className="inline-flex items-center text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoFillMaker}
                onChange={e => setAutoFillMaker(e.target.checked)}
                className="h-4 w-4 accent-blue-600 border-gray-300 rounded mr-3 focus:ring-blue-500 focus:ring-2"
              />
              Lấy tên người lập chứng từ theo tên người đăng nhập
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6">
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

export default SignatureTab;
