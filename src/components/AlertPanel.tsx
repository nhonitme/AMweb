import React from 'react';
import { AlertTriangle, Clock, Info, X } from 'lucide-react';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
}

const alerts: Alert[] = [
  {
    id: '1',
    type: 'error',
    title: 'Công nợ quá hạn',
    message: '15 khách hàng có công nợ quá hạn 30 ngày',
    time: 'Tổng 2.8B VND'
  },
  {
    id: '2',
    type: 'warning',
    title: 'Dòng tiền thấp',
    message: 'Dự báo dòng tiền trong 2 tuần tới',
    time: 'Cần 200M VND'
  },
  {
    id: '3',
    type: 'info',
    title: 'Thuế sắp đến hạn',
    message: 'Báo cáo thuế tháng 11',
    time: 'Hạn 20/12/2024'
  },
  {
    id: '4',
    type: 'success',
    title: 'Mục tiêu đạt được',
    message: 'Doanh thu tháng 11 vượt 15% so với kế hoạch',
    time: 'Hoàn thành'
  }
];

export default function AlertPanel() {
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'warning':
        return <Clock size={16} className="text-amber-500" />;
      case 'success':
        return <Info size={16} className="text-green-500" />;
      default:
        return <Info size={16} className="text-blue-500" />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <AlertTriangle className="mr-2 text-amber-500" size={20} />
        Cảnh báo Quan trọng
      </h3>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className={`border rounded-lg p-3 ${getAlertBg(alert.type)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 text-sm">{alert.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{alert.time}</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <button className="text-red-600 hover:text-red-700 font-medium">
          Xem tất cả cảnh báo
        </button>
      </div>
    </div>
  );
}