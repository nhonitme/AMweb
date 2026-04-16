
import React, { useState } from 'react';
import { Save, Receipt, FileText, Mail, Smartphone, Usb } from 'lucide-react';
import type { InvoiceSettings, FormErrors } from '../types';


const InvoiceTab: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'email' | 'sms' | 'signature'>('email');

  // Email form state
  const [emailForm, setEmailForm] = useState({
    provider: '',
    mailServer: '',
    port: '25',
    senderName: '',
    senderEmail: '',
    username: '',
    password: '',
    security: 'TLS',
    useAmnote: 'amnote',
  });
  const [emailErrors, setEmailErrors] = useState<any>({});
  const [emailTested, setEmailTested] = useState(false);

  // SMS form state
  const [smsForm, setSmsForm] = useState({
    apiKey: '',
    secretKey: '',
    brandName: '',
  });
  const [smsErrors, setSmsErrors] = useState<any>({});

  // Signature tab: không cần state

  // Validate email form
  const validateEmailForm = () => {
    const err: any = {};
    if (!emailForm.mailServer) err.mailServer = 'Bắt buộc';
    if (!emailForm.port) err.port = 'Bắt buộc';
    if (!emailForm.senderName) err.senderName = 'Bắt buộc';
    if (!emailForm.senderEmail) err.senderEmail = 'Bắt buộc';
    if (!emailForm.username) err.username = 'Bắt buộc';
    if (!emailForm.password) err.password = 'Bắt buộc';
    setEmailErrors(err);
    return Object.keys(err).length === 0;
  };
  // Validate sms form
  const validateSmsForm = () => {
    const err: any = {};
    if (!smsForm.apiKey) err.apiKey = 'Bắt buộc';
    if (!smsForm.secretKey) err.secretKey = 'Bắt buộc';
    if (!smsForm.brandName) err.brandName = 'Bắt buộc';
    setSmsErrors(err);
    return Object.keys(err).length === 0;
  };

  // Handlers
  const handleEmailChange = (field: string, value: string) => {
    setEmailForm(prev => ({ ...prev, [field]: value }));
    if (emailErrors[field]) setEmailErrors((prev: any) => ({ ...prev, [field]: '' }));
  };
  const handleSmsChange = (field: string, value: string) => {
    setSmsForm(prev => ({ ...prev, [field]: value }));
    if (smsErrors[field]) setSmsErrors((prev: any) => ({ ...prev, [field]: '' }));
  };

  // Test email connection
  const handleTestEmail = () => {
    if (!validateEmailForm()) return;
    setEmailTested(true);
    alert('Đã kiểm tra kết nối thành công!');
  };

  // Save email
  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmailForm()) return;
    alert('Đã lưu thiết lập email gửi hóa đơn!');
  };
  // Save sms
  const handleSaveSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSmsForm()) return;
    alert('Đã lưu thiết lập SMS gửi hóa đơn!');
  };
  // Save signature
  const handleSaveSignature = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Đã lưu thiết lập chữ ký số!');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
          <Receipt className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
          <span className="text-sm sm:text-base">Cấu hình kết nối e-Invoice</span>
        </h2>
        {/* Tabs */}
        <div className="mb-4 sm:mb-6 border-b border-gray-200">
          <div className="flex space-x-1 sm:space-x-2 overflow-x-auto  scrollbar-hide">
            <button
              className={`px-2 sm:px-4 py-2 rounded-t-md font-medium flex items-center space-x-1 sm:space-x-2 focus:outline-none transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm ${activeTab === 'email' ? 'bg-white border-x border-t border-gray-200 text-blue-600' : 'bg-gray-50 text-gray-500 hover:text-blue-700'}`}
              onClick={() => setActiveTab('email')}
            >
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Thiết lập email gửi hóa đơn</span>
              <span className="sm:hidden">Email</span>
            </button>
            <button
              className={`px-2 sm:px-4 py-2 rounded-t-md font-medium flex items-center space-x-1 sm:space-x-2 focus:outline-none transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm ${activeTab === 'sms' ? 'bg-white border-x border-t border-gray-200 text-blue-600' : 'bg-gray-50 text-gray-500 hover:text-blue-700'}`}
              onClick={() => setActiveTab('sms')}
            >
              <Smartphone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Thiết lập SMS gửi hóa đơn</span>
              <span className="sm:hidden">SMS</span>
            </button>
            <button
              className={`px-2 sm:px-4 py-2 rounded-t-md font-medium flex items-center space-x-1 sm:space-x-2 focus:outline-none transition-colors duration-200 whitespace-nowrap text-xs sm:text-sm ${activeTab === 'signature' ? 'bg-white border-x border-t border-gray-200 text-blue-600' : 'bg-gray-50 text-gray-500 hover:text-blue-700'}`}
              onClick={() => setActiveTab('signature')}
            >
              <Usb className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Thiết lập chữ ký số</span>
              <span className="sm:hidden">Chữ ký số</span>
            </button>
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'email' && (
          <form onSubmit={handleSaveEmail} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Nhà cung cấp</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={emailForm.provider} onChange={e => handleEmailChange('provider', e.target.value)} />
              </div>
<div className="flex gap-2 items-start">
                <div className="flex-1">
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Máy chủ Mail <span className="text-red-500">*</span></label>
                  <input type="text" className={`w-full px-3 py-2 border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailErrors.mailServer ? 'border-red-500' : 'border-gray-300'}`} value={emailForm.mailServer} onChange={e => handleEmailChange('mailServer', e.target.value)} />
                  {emailErrors.mailServer && <p className="text-[13px] text-red-600 mt-1">{emailErrors.mailServer}</p>}
                </div>
                <div className="w-20 sm:w-24">
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Cổng <span className="text-red-500">*</span></label>
                  <input type="text" className={`w-full px-3 py-2 border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailErrors.port ? 'border-red-500' : 'border-gray-300'}`} value={emailForm.port} onChange={e => handleEmailChange('port', e.target.value)} />
                  {emailErrors.port && <p className="text-[13px] text-red-600 mt-1">{emailErrors.port}</p>}
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Tên người gửi <span className="text-red-500">*</span></label>
                <input type="text" className={`w-full px-3 py-2 border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailErrors.senderName ? 'border-red-500' : 'border-gray-300'}`} value={emailForm.senderName} onChange={e => handleEmailChange('senderName', e.target.value)} />
                {emailErrors.senderName && <p className="text-[13px] text-red-600 mt-1">{emailErrors.senderName}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Email gửi <span className="text-red-500">*</span></label>
                <input type="email" className={`w-full px-3 py-2 border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailErrors.senderEmail ? 'border-red-500' : 'border-gray-300'}`} value={emailForm.senderEmail} onChange={e => handleEmailChange('senderEmail', e.target.value)} />
                {emailErrors.senderEmail && <p className="text-[13px] text-red-600 mt-1">{emailErrors.senderEmail}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Tên đăng nhập <span className="text-red-500">*</span></label>
                <input type="text" className={`w-full px-3 py-2 border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailErrors.username ? 'border-red-500' : 'border-gray-300'}`} value={emailForm.username} onChange={e => handleEmailChange('username', e.target.value)} />
                {emailErrors.username && <p className="text-[13px] text-red-600 mt-1">{emailErrors.username}</p>}
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                <input type="password" className={`w-full px-3 py-2 border rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${emailErrors.password ? 'border-red-500' : 'border-gray-300'}`} value={emailForm.password} onChange={e => handleEmailChange('password', e.target.value)} />
                {emailErrors.password && <p className="text-[13px] text-red-600 mt-1">{emailErrors.password}</p>}
              </div>
              <div className="lg:col-span-2">
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Phương thức bảo mật</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <label className="flex items-center gap-1">
                      <input type="radio" name="security" value="None" checked={emailForm.security === 'None'} onChange={e => handleEmailChange('security', e.target.value)} className="accent-blue-600" />
                      None
                    </label>
                    <label className="flex items-center gap-1 text-[13px]">
                      <input type="radio" name="security" value="SSL" checked={emailForm.security === 'SSL'} onChange={e => handleEmailChange('security', e.target.value)} className="accent-blue-600" />
                      SSL
                    </label>
                    <label className="flex items-center gap-1 text-[13px]">
                      <input type="radio" name="security" value="TLS" checked={emailForm.security === 'TLS'} onChange={e => handleEmailChange('security', e.target.value)} className="accent-blue-600" />
                      TLS
                    </label>
                  </div>
                  <button type="button" onClick={handleTestEmail} className="w-full sm:w-auto px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium">Kiểm tra kết nối</button>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 mt-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="useAmnote" value="amnote" checked={emailForm.useAmnote === 'amnote'} onChange={e => handleEmailChange('useAmnote', e.target.value)} className="accent-blue-600" />
                    Sử dụng email AMnote
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="useAmnote" value="amnote2" checked={emailForm.useAmnote === 'amnote2'} onChange={e => handleEmailChange('useAmnote', e.target.value)} className="accent-blue-600" />
                    Sử dụng gmail AMnote
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="useAmnote" value="other" checked={emailForm.useAmnote === 'other'} onChange={e => handleEmailChange('useAmnote', e.target.value)} className="accent-blue-600" />
                    Khác
                  </label>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 sm:mt-6">
              <button type="submit" className="inline-flex items-center justify-center px-4 sm:px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
                <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Lưu
              </button>
            </div>
          </form>
        )}
        {activeTab === 'sms' && (
          <form onSubmit={handleSaveSms} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block font-medium text-gray-700 mb-1">Api Key <span className="text-red-500">*</span></label>
                <input type="text" className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${smsErrors.apiKey ? 'border-red-500' : 'border-gray-300'}`} value={smsForm.apiKey} onChange={e => handleSmsChange('apiKey', e.target.value)} />
                {smsErrors.apiKey && <p className="text-xs text-red-600 mt-1">{smsErrors.apiKey}</p>}
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Secret Key <span className="text-red-500">*</span></label>
                <input type="text" className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${smsErrors.secretKey ? 'border-red-500' : 'border-gray-300'}`} value={smsForm.secretKey} onChange={e => handleSmsChange('secretKey', e.target.value)} />
                {smsErrors.secretKey && <p className="text-xs text-red-600 mt-1">{smsErrors.secretKey}</p>}
              </div>
              <div className="lg:col-span-2">
                <label className="block font-medium text-gray-700 mb-1">Brand Name <span className="text-red-500">*</span></label>
                <input type="text" className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${smsErrors.brandName ? 'border-red-500' : 'border-gray-300'}`} value={smsForm.brandName} onChange={e => handleSmsChange('brandName', e.target.value)} />
                {smsErrors.brandName && <p className="text-xs text-red-600 mt-1">{smsErrors.brandName}</p>}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 sm:mt-6">
              <button type="submit" className="inline-flex items-center justify-center px-4 sm:px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
                <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Lưu
              </button>
            </div>
          </form>
        )}
        {activeTab === 'signature' && (
          <form onSubmit={handleSaveSignature} className="space-y-4 sm:space-y-6 flex flex-col items-center justify-center min-h-[250px] sm:min-h-[300px]">
            <div className="flex flex-col items-center gap-4 sm:gap-6 w-full">
              <Usb className="w-24 h-24 sm:w-32 sm:h-32 text-blue-500 mb-2" />
              <FileText className="w-24 h-12 sm:w-32 sm:h-16 text-blue-400" />
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4 sm:mt-6 w-full sm:w-auto">
              <button type="submit" className="inline-flex items-center justify-center px-4 sm:px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
                <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Lưu
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InvoiceTab;
