import React from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { TableData } from '../types';

interface DataTableProps {
  title: string;
  data: TableData[];
  type: 'receivable' | 'payable';
}

export default function DataTable({ title, data, type }: DataTableProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'due-soon':
        return <Clock size={16} className="text-amber-500" />;
      default:
        return <CheckCircle size={16} className="text-green-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'Quá hạn';
      case 'due-soon':
        return 'Sắp đến hạn';
      default:
        return 'Bình thường';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-50 text-red-800';
      case 'due-soon':
        return 'bg-amber-50 text-amber-800';
      default:
        return 'bg-green-50 text-green-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                {type === 'receivable' ? 'Khách hàng' : 'Nhà cung cấp'}
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Số tiền</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Ngày đến hạn</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900">{item.name}</div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-medium text-gray-900">
                    {item.amount.toLocaleString('vi-VN')} đ
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-gray-600">{item.dueDate}</div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status)}
                      <span className="ml-1">{getStatusText(item.status)}</span>
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}