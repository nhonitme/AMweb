import React, { useState } from 'react';
import { 
  User, 
  Edit, 
  Camera, 
  Save, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Shield, 
  Eye, 
  EyeOff,
  Check,
  AlertCircle,
  Upload,
  Trash2
} from 'lucide-react';

interface UserProfile {
  id: string;
  avatar: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email: string;
  address: string;
  postalCode: string;
  position: string;
  department: string;
  joinDate: string;
}

const mockProfile: UserProfile = {
  id: '1',
  avatar: 'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=400',
  fullName: 'Nguyễn Mỹ Liên',
  dateOfBirth: '1990-05-15',
  gender: 'female',
  phone: '0123456789',
  email: '007@amnote.com.vn',
  address: '123 Đường ABC, Quận Ba Đình, Hà Nội',
  postalCode: '100000',
  position: 'Kế toán trưởng',
  department: 'Phòng Tài chính - Kế toán',
  joinDate: '2020-01-15'
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(mockProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UserProfile>(mockProfile);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityStep, setSecurityStep] = useState<'password' | 'success'>('password');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [pendingChanges, setPendingChanges] = useState<Partial<UserProfile>>({});

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!editData.fullName.trim()) {
      newErrors.fullName = 'Tên đầy đủ là bắt buộc';
    }

    if (!editData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!editData.phone.trim()) {
      newErrors.phone = 'Số điện thoại là bắt buộc';
    } else if (!/^[0-9]{10,11}$/.test(editData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    if (!editData.dateOfBirth) {
      newErrors.dateOfBirth = 'Ngày sinh là bắt buộc';
    }

    if (!editData.address.trim()) {
      newErrors.address = 'Địa chỉ là bắt buộc';
    }

    if (!editData.postalCode.trim()) {
      newErrors.postalCode = 'Mã bưu chính là bắt buộc';
    } else if (!/^[0-9]{5,6}$/.test(editData.postalCode)) {
      newErrors.postalCode = 'Mã bưu chính không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const needsSecurityVerification = () => {
    return editData.email !== profile.email || editData.phone !== profile.phone;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (needsSecurityVerification()) {
      setPendingChanges(editData);
      setShowSecurityModal(true);
      return;
    }

    await saveProfile();
  };

  const saveProfile = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProfile(editData);
      setIsEditing(false);
      
      // Show success notification
      // In a real app, you would show a toast notification here
      console.log('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecurityVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setErrors(prev => ({ ...prev, password: 'Vui lòng nhập mật khẩu' }));
      return;
    }

    setIsLoading(true);
    try {
      // Simulate password verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (password === 'password123') {
        setEditData(pendingChanges as UserProfile);
        setSecurityStep('success');
        
        // Auto-save after successful verification
        setTimeout(async () => {
          await saveProfile();
          setShowSecurityModal(false);
          setSecurityStep('password');
          setPassword('');
          setPendingChanges({});
        }, 1500);
      } else {
        setErrors(prev => ({ ...prev, password: 'Mật khẩu không chính xác' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, password: 'Có lỗi xảy ra, vui lòng thử lại' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setEditData(prev => ({ ...prev, avatar: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getGenderText = (gender: string) => {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      default: return 'Khác';
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Chỉnh sửa thông tin cá nhân</h2>
              <p className="text-gray-600 mt-1">Cập nhật thông tin cá nhân của bạn</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditData(profile);
                  setErrors({});
                }}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X size={16} />
                <span>Hủy</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={16} />
                )}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ảnh đại diện</h3>
              <div className="text-center">
                <div className="relative inline-block">
                  <img
                    src={editData.avatar}
                    alt="Avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                    <Camera size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Nhấp vào biểu tượng camera để thay đổi ảnh
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG tối đa 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Tên đầy đủ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.fullName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Nhập tên đầy đủ"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Ngày sinh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.dateOfBirth ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block font-medium text-gray-700 mb-1">
                    Giới tính
                  </label>
                  <div className="flex space-x-4">
                    {[
                      { value: 'male', label: 'Nam' },
                      { value: 'female', label: 'Nữ' },
                      { value: 'other', label: 'Khác' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="radio"
                          name="gender"
                          value={option.value}
                          checked={editData.gender === option.value}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin liên lạc</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.phone}
                    </p>
                  )}
                  {editData.phone !== profile.phone && (
                    <p className="mt-1 text-sm text-amber-600 flex items-center">
                      <Shield size={14} className="mr-1" />
                      Yêu cầu xác thực bảo mật
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Nhập email"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.email}
                    </p>
                  )}
                  {editData.email !== profile.email && (
                    <p className="mt-1 text-sm text-amber-600 flex items-center">
                      <Shield size={14} className="mr-1" />
                      Yêu cầu xác thực bảo mật
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block font-medium text-gray-700 mb-1">
                    Địa chỉ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                    <textarea
                      value={editData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.address ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Nhập địa chỉ"
                    />
                  </div>
                  {errors.address && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.address}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Mã bưu chính <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.postalCode ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Nhập mã bưu chính"
                  />
                  {errors.postalCode && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle size={14} className="mr-1" />
                      {errors.postalCode}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Modal */}
        {showSecurityModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                {securityStep === 'password' ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="text-amber-600" size={32} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Xác thực bảo mật</h3>
                      <p className="text-gray-600 text-sm">
                        Bạn đang thay đổi thông tin nhạy cảm. Vui lòng nhập mật khẩu để xác thực.
                      </p>
                    </div>

                    <form onSubmit={handleSecurityVerification} className="space-y-4">
                      <div>
                        <label className="block font-medium text-gray-700 mb-1">
                          Mật khẩu hiện tại
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (errors.password) {
                                setErrors(prev => ({ ...prev, password: '' }));
                              }
                            }}
                            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="Nhập mật khẩu hiện tại"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertCircle size={14} className="mr-1" />
                            {errors.password}
                          </p>
                        )}
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-700">
                          <strong>Demo:</strong> Sử dụng mật khẩu "password123" để xác thực
                        </p>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowSecurityModal(false);
                            setPassword('');
                            setErrors({});
                          }}
                          className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            'Xác thực'
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="text-green-600" size={32} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Xác thực thành công!</h3>
                    <p className="text-gray-600 text-sm">
                      Thông tin của bạn đang được cập nhật...
                    </p>
                    <div className="mt-4">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Thông tin cá nhân</h2>
            <p className="text-gray-600 mt-1">Quản lý thông tin cá nhân và cài đặt tài khoản</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit size={16} />
            <span>Chỉnh sửa</span>
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar and Basic Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <img
              src={profile.avatar}
              alt="Avatar"
              className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-white shadow-lg mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-900 mb-1">{profile.fullName}</h3>
            <p className="text-gray-600 mb-2">{profile.position}</p>
            <p className="text-sm text-gray-500">{profile.department}</p>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  <span>Gia nhập: {formatDate(profile.joinDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Thông tin cơ bản</h3>
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Edit size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-medium text-gray-500 mb-1">Tên đầy đủ</label>
                <p className="text-gray-900 font-medium">{profile.fullName}</p>
              </div>
              
              <div>
                <label className="block font-medium text-gray-500 mb-1">Ngày sinh</label>
                <p className="text-gray-900">{formatDate(profile.dateOfBirth)}</p>
              </div>
              
              <div>
                <label className="block font-medium text-gray-500 mb-1">Giới tính</label>
                <p className="text-gray-900">{getGenderText(profile.gender)}</p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Thông tin liên lạc</h3>
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-700 p-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Edit size={16} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Phone size={16} className="text-blue-600" />
                </div>
                <div>
                  <label className="block font-medium text-gray-500">Số điện thoại</label>
                  <p className="text-gray-900 font-medium">{profile.phone}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail size={16} className="text-green-600" />
                </div>
                <div>
                  <label className="block font-medium text-gray-500">Email</label>
                  <p className="text-gray-900 font-medium">{profile.email}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <MapPin size={16} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <label className="block font-medium text-gray-500">Địa chỉ</label>
                  <p className="text-gray-900">{profile.address}</p>
                  <p className="text-sm text-gray-600 mt-1">Mã bưu chính: {profile.postalCode}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bảo mật tài khoản</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield size={20} className="text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Đổi mật khẩu</p>
                    <p className="text-sm text-gray-600">Cập nhật mật khẩu để bảo mật tài khoản</p>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Thay đổi
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield size={20} className="text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Xác thực 2 bước</p>
                    <p className="text-sm text-gray-600">Tăng cường bảo mật với xác thực 2 bước</p>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Kích hoạt
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
