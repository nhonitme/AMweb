import React, { useState } from 'react';
import { Save, Plus, Edit2, Trash2, Shield, CreditCard } from 'lucide-react';
import type { FirmbankingSettings, BankAccount, SecurityQuestion, FormErrors } from '../types';

const FirmbankingTab: React.FC = () => {
  const [formData, setFormData] = useState<FirmbankingSettings>({
    bankAccounts: [],
    otpEmail: '',
    otpPhone: '',
    securityQuestions: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<SecurityQuestion | null>(null);

  const [newAccount, setNewAccount] = useState<Omit<BankAccount, 'id'>>({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    branch: '',
  });

  const [newQuestion, setNewQuestion] = useState<Omit<SecurityQuestion, 'id'>>({
    question: '',
    answer: '',
  });

  const predefinedQuestions = [
    'Tên trường tiểu học đầu tiên của bạn?',
    'Tên thú cưng đầu tiên của bạn?',
    'Tên người bạn thân nhất thời thơ ấu?',
    'Tên phố nơi bạn sinh ra?',
    'Món ăn yêu thích của bạn?',
    'Tên của giáo viên chủ nhiệm lớp 12?',
    'Màu sắc yêu thích của bạn?',
    'Tên quê hương của cha/mẹ bạn?',
  ];

  const validateAccount = (): boolean => {
    const newErrors: FormErrors = {};

    if (!newAccount.bankName.trim()) {
      newErrors.bankName = 'Tên ngân hàng là bắt buộc';
    }

    if (!newAccount.accountNumber.trim()) {
      newErrors.accountNumber = 'Số tài khoản là bắt buộc';
    }

    if (!newAccount.accountHolder.trim()) {
      newErrors.accountHolder = 'Tên chủ tài khoản là bắt buộc';
    }

    if (!newAccount.branch.trim()) {
      newErrors.branch = 'Chi nhánh là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddAccount = () => {
    if (validateAccount()) {
      const account: BankAccount = {
        ...newAccount,
        id: Date.now().toString(),
      };

      setFormData(prev => ({
        ...prev,
        bankAccounts: [...prev.bankAccounts, account],
      }));

      setNewAccount({
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        branch: '',
      });
      setShowAccountForm(false);
      setErrors({});
    }
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setNewAccount({
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolder: account.accountHolder,
      branch: account.branch,
    });
    setShowAccountForm(true);
  };

  const handleUpdateAccount = () => {
    if (validateAccount() && editingAccount) {
      setFormData(prev => ({
        ...prev,
        bankAccounts: prev.bankAccounts.map(acc =>
          acc.id === editingAccount.id
            ? { ...newAccount, id: editingAccount.id }
            : acc
        ),
      }));

      setEditingAccount(null);
      setNewAccount({
        bankName: '',
        accountNumber: '',
        accountHolder: '',
        branch: '',
      });
      setShowAccountForm(false);
      setErrors({});
    }
  };

  const handleDeleteAccount = (id: string) => {
    setFormData(prev => ({
      ...prev,
      bankAccounts: prev.bankAccounts.filter(acc => acc.id !== id),
    }));
  };

  const handleAddQuestion = () => {
    if (newQuestion.question.trim() && newQuestion.answer.trim()) {
      const question: SecurityQuestion = {
        ...newQuestion,
        id: Date.now().toString(),
      };

      setFormData(prev => ({
        ...prev,
        securityQuestions: [...prev.securityQuestions, question],
      }));

      setNewQuestion({ question: '', answer: '' });
      setShowQuestionForm(false);
    }
  };

  const handleDeleteQuestion = (id: string) => {
    setFormData(prev => ({
      ...prev,
      securityQuestions: prev.securityQuestions.filter(q => q.id !== id),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving firmbanking settings:', formData);
    // Handle save logic here
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h2 className="text-[13px] font-semibold text-gray-900 mb-6 flex items-center">
          <CreditCard className="w-6 h-6 mr-2 text-blue-600" />
          Cài đặt Firmbanking
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Bank Accounts Management */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-medium text-gray-800">Quản lý tài khoản ngân hàng</h3>
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setShowAccountForm(true)}
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Thêm tài khoản
                </div>
              </div>
            </div>

            {/* Bank Accounts List */}
            <div className="space-y-3">
              {formData.bankAccounts.map((account) => (
                <div key={account.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{account.bankName}</h4>
                      <p className="text-sm text-gray-600">STK: {account.accountNumber}</p>
                      <p className="text-sm text-gray-600">Chủ TK: {account.accountHolder}</p>
                      <p className="text-sm text-gray-600">Chi nhánh: {account.branch}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEditAccount(account)}
                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors duration-200"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(account.id)}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {formData.bankAccounts.length === 0 && (
                <p className="text-gray-500 text-center py-4">Chưa có tài khoản ngân hàng nào</p>
              )}
            </div>

            {/* Add/Edit Account Form */}
            {showAccountForm && (
              <div className="mt-4 bg-white p-4 rounded-lg border border-gray-300">
                <h4 className="font-medium text-gray-900 mb-3">
                  {editingAccount ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Tên ngân hàng
                    </label>
                    <input
                      type="text"
                      value={newAccount.bankName}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, bankName: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.bankName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nhập tên ngân hàng"
                    />
                    {errors.bankName && (
                      <p className="mt-1 text-sm text-red-600">{errors.bankName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Số tài khoản
                    </label>
                    <input
                      type="text"
                      value={newAccount.accountNumber}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, accountNumber: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.accountNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nhập số tài khoản"
                    />
                    {errors.accountNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Tên chủ tài khoản
                    </label>
                    <input
                      type="text"
                      value={newAccount.accountHolder}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, accountHolder: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.accountHolder ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nhập tên chủ tài khoản"
                    />
                    {errors.accountHolder && (
                      <p className="mt-1 text-sm text-red-600">{errors.accountHolder}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Chi nhánh
                    </label>
                    <input
                      type="text"
                      value={newAccount.branch}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, branch: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.branch ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Nhập chi nhánh"
                    />
                    {errors.branch && (
                      <p className="mt-1 text-sm text-red-600">{errors.branch}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-4">
                  <button
                    type="button"
                    onClick={editingAccount ? handleUpdateAccount : handleAddAccount}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    {editingAccount ? 'Cập nhật' : 'Thêm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountForm(false);
                      setEditingAccount(null);
                      setNewAccount({ bankName: '', accountNumber: '', accountHolder: '', branch: '' });
                      setErrors({});
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors duration-200"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* OTP Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-medium text-gray-700 mb-2">
                Email nhận OTP
              </label>
              <input
                type="email"
                value={formData.otpEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, otpEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập email nhận OTP"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Số điện thoại nhận OTP
              </label>
              <input
                type="tel"
                value={formData.otpPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, otpPhone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setShowQuestionForm(true)}
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Thêm câu hỏi
                </div>
              </div>
            </div>

            {/* Security Questions List */}
            <div className="space-y-3">
              {formData.securityQuestions.map((question) => (
                <div key={question.id} className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{question.question}</p>
                      <p className="text-sm text-gray-600 mt-1">Câu trả lời: {question.answer}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="p-1 text-gray-500 hover:text-red-600 transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {formData.securityQuestions.length === 0 && (
                <p className="text-gray-500 text-center py-4">Chưa có câu hỏi bảo mật nào</p>
              )}
            </div>

            {/* Add Question Form */}
            {showQuestionForm && (
              <div className="mt-4 bg-white p-4 rounded-lg border border-gray-300">
                <h4 className="font-medium text-gray-900 mb-3">Thêm câu hỏi bảo mật</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Câu hỏi
                    </label>
                    <select
                      value={newQuestion.question}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Chọn câu hỏi</option>
                      {predefinedQuestions.map((question) => (
                        <option key={question} value={question}>
                          {question}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-1">
                      Câu trả lời
                    </label>
                    <input
                      type="text"
                      value={newQuestion.answer}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, answer: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập câu trả lời"
                    />
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-4">
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    Thêm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuestionForm(false);
                      setNewQuestion({ question: '', answer: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors duration-200"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
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

export default FirmbankingTab;
