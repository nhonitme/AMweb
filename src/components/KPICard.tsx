import React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { KPICard as KPICardType } from '../types';

interface KPICardComponentProps extends KPICardType {}

const iconMap: { [key: string]: React.ReactNode } = {
  TrendingUp: <TrendingUp size={20} />,
  TrendingDown: <TrendingDown size={20} />,
  Minus: <Minus size={20} />,
  DollarSign: <DollarSign size={20} />,
};

export default function KPICard({ title, value, change, trend, icon }: KPICardComponentProps) {
  const trendIcon = trend === 'up' ? 'TrendingUp' : trend === 'down' ? 'TrendingDown' : 'Minus';
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';
  const trendBg = trend === 'up' ? 'bg-green-50' : trend === 'down' ? 'bg-red-50' : 'bg-gray-50';

  const getCardColor = (title: string) => {
    if (title.includes('Doanh Thu')) return 'bg-blue-500';
    if (title.includes('Chi Phí')) return 'bg-red-500';
    if (title.includes('Lợi Nhuận')) return 'bg-green-500';
    if (title.includes('Dòng Tiền')) return 'bg-purple-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${trendBg} ${trendColor}`}>
            {iconMap[trendIcon]}
            <span className="ml-1">{change}</span>
            <span className="ml-1 text-xs">so với tháng trước</span>
          </div>
        </div>
        <div className="ml-4">
          <div className={`w-12 h-12 ${getCardColor(title)} rounded-lg flex items-center justify-center`}>
            <div className="text-white">
              {iconMap[icon] || iconMap.TrendingUp}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}