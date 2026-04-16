import React from 'react';
import { ChartData } from '../types';

interface ChartProps {
  title: string;
  data: ChartData[];
  type: 'bar' | 'line' | 'pie';
  height?: number;
}

export default function Chart({ title, data, type, height = 300 }: ChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  const BarChart = () => (
    <div className="flex items-end justify-between h-48 px-4">
      {data.map((item, index) => (
        <div key={index} className="flex flex-col items-center flex-1 mx-1">
          <div className="flex items-end justify-center h-40 w-full">
            <div
              className="bg-red-500 rounded-t-md w-full transition-all duration-300 hover:bg-red-600"
              style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: '4px' }}
              title={`${item.label}: ${item.value.toLocaleString('vi-VN')}`}
            />
          </div>
          <span className="text-xs text-gray-600 mt-2 text-center truncate w-full">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );

  const LineChart = () => {
    const points = data.map((item, index) => ({
      x: (index / (data.length - 1)) * 100,
      y: 100 - (item.value / maxValue) * 80
    }));

    const pathD = points.reduce((path, point, index) => {
      return path + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
    }, '');

    return (
      <div className="h-48 px-4">
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#DC2626" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#DC2626" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path
            d={`${pathD} L 100 100 L 0 100 Z`}
            fill="url(#lineGradient)"
          />
          <path
            d={pathD}
            stroke="#DC2626"
            strokeWidth="2"
            fill="none"
          />
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="#DC2626"
              className="hover:r-4 transition-all"
            />
          ))}
        </svg>
        <div className="flex justify-between mt-2">
          {data.map((item, index) => (
            <span key={index} className="text-xs text-gray-600 text-center">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const PieChart = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    const colors = ['#3B82F6', '#DC2626', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];

    return (
      <div className="flex items-center justify-center h-48">
        <div className="relative">
          <svg width="160" height="160" viewBox="0 0 160 160">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const angle = (item.value / total) * 360;
              const startAngle = currentAngle;
              currentAngle += angle;

              const x1 = 80 + 60 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 80 + 60 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 80 + 60 * Math.cos(((startAngle + angle) * Math.PI) / 180);
              const y2 = 80 + 60 * Math.sin(((startAngle + angle) * Math.PI) / 180);

              const largeArcFlag = angle > 180 ? 1 : 0;

              return (
                <path
                  key={index}
                  d={`M 80 80 L ${x1} ${y1} A 60 60 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                  fill={colors[index % colors.length]}
                  className="hover:opacity-80 transition-opacity"
                />
              );
            })}
          </svg>
        </div>
        <div className="ml-6 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center text-sm">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-gray-700">{item.label}</span>
              <span className="ml-2 font-medium">
                {((item.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex space-x-2">
          <button className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full">Tháng</button>
          <button className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-full">Quý</button>
          <button className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-full">Năm</button>
        </div>
      </div>
      {type === 'bar' && <BarChart />}
      {type === 'line' && <LineChart />}
      {type === 'pie' && <PieChart />}
    </div>
  );
}