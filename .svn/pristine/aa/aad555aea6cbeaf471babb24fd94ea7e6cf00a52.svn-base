import React from 'react';
import { FileText, Users, Package, TrendingUp, Calculator, Receipt } from 'lucide-react';
import CompanyManagement from './CompanyManagement';
import ProfilePage from './ProfilePage';
import HelpSupportPage from './HelpSupportPage';
import BankManagementPage from './BankManagementPage';

interface ModuleContentProps {
  moduleId: string;
}

const moduleContent: { [key: string]: { title: string; description: string; icon: React.ReactNode; features: string[] } } = {
  'basic-data': {
    title: 'Quản lý dữ liệu cơ bản',
    description: 'Quản lý thông tin khách hàng, nhà cung cấp, sản phẩm và cấu hình hệ thống',
    icon: <Users className="text-blue-600" size={48} />,
    features: [
      'Danh mục khách hàng',
      'Danh mục nhà cung cấp', 
      'Danh mục sản phẩm/dịch vụ',
      'Danh mục nhân viên',
      'Hệ thống tài khoản kế toán',
      'Cấu hình hệ thống'
    ]
  },
  'summary': {
    title: 'Tổng hợp tài chính',
    description: 'Tổng quan về tình hình tài chính, doanh thu, chi phí và các chỉ số KPI',
    icon: <TrendingUp className="text-green-600" size={48} />,
    features: [
      'Báo cáo tổng hợp doanh thu',
      'Phân tích chi phí theo danh mục',
      'Theo dõi lợi nhuận',
      'Quản lý công nợ',
      'Phân tích dòng tiền',
      'Dashboard KPI tài chính'
    ]
  },
  'cash': {
    title: 'Quản lý tiền mặt',
    description: 'Theo dõi và quản lý toàn bộ giao dịch tiền mặt',
    icon: <Calculator className="text-yellow-600" size={48} />,
    features: [
      'Sổ quỹ tiền mặt',
      'Phiếu thu/chi tiền mặt',
      'Báo cáo tồn quỹ',
      'Cảnh báo tồn quỹ thấp',
      'Theo dõi dòng tiền mặt',
      'Đối chiếu quỹ định kỳ'
    ]
  },
  'banking': {
    title: 'Quản lý ngân hàng',
    description: 'Quản lý tài khoản ngân hàng và giao dịch banking',
    icon: <Receipt className="text-purple-600" size={48} />,
    features: [
      'Quản lý tài khoản ngân hàng',
      'Giao dịch chuyển khoản',
      'Đối chiếu sao kê ngân hàng',
      'Báo cáo dòng tiền ngân hàng',
      'Cảnh báo số dư thấp',
      'Tích hợp internet banking'
    ]
  },
  'purchasing': {
    title: 'Quản lý mua hàng',
    description: 'Quản lý quy trình mua hàng từ đặt hàng đến thanh toán',
    icon: <Package className="text-red-600" size={48} />,
    features: [
      'Đơn đặt hàng mua',
      'Phiếu nhập kho',
      'Quản lý công nợ NCC',
      'Báo cáo chi phí mua hàng',
      'Phân tích hiệu quả NCC',
      'Theo dõi đơn hàng'
    ]
  },
  'sales': {
    title: 'Quản lý bán hàng',
    description: 'Quản lý quy trình bán hàng và quan hệ khách hàng',
    icon: <TrendingUp className="text-green-600" size={48} />,
    features: [
      'Đơn hàng bán',
      'Hóa đơn bán hàng',
      'Quản lý công nợ khách hàng',
      'Báo cáo doanh thu',
      'Phân tích khách hàng',
      'Theo dõi đơn hàng'
    ]
  }
};

export default function ModuleContent({ moduleId }: ModuleContentProps) {
  // Handle specific module cases
  if (moduleId === 'company-management') {
    return <CompanyManagement />;
  }

  if (moduleId === 'bank-management') {
    return <BankManagementPage />;
  }

  if (moduleId === 'profile') {
    return <ProfilePage />;
  }

  if (moduleId === 'help-support') {
    return <HelpSupportPage />;
  }

  const content = moduleContent[moduleId];
  
  if (!content) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Module đang phát triển</h3>
          <p className="text-gray-600">Tính năng này đang được phát triển và sẽ sớm ra mắt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-gray-50 rounded-lg">
            {content.icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
            <p className="text-gray-600 mt-1">{content.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {content.features.map((feature, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="font-medium text-gray-900">{feature}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê tổng quan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">127</div>
            <div className="text-sm text-gray-600">Giao dịch hôm nay</div>
          </div>
          <div className="text-center p-6 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">89.2%</div>
            <div className="text-sm text-gray-600">Tỷ lệ hoàn thành</div>
          </div>
          <div className="text-center p-6 bg-amber-50 rounded-lg">
            <div className="text-3xl font-bold text-amber-600 mb-2">24</div>
            <div className="text-sm text-gray-600">Cần xử lý</div>
          </div>
        </div>
      </div>
    </div>
  );
}