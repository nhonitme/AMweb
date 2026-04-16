import React from 'react';
import { TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { Product } from '../types';

interface ProductTableProps {
  title: string;
  products: Product[];
}

export default function ProductTable({ title, products }: ProductTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">Sản phẩm</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Đã bán</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Doanh thu</th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">Tồn kho</th>
              <th className="text-center py-3 px-4 font-medium text-gray-700">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Package size={20} className="text-blue-600" />
                    </div>
                    <div className="font-medium text-gray-900">{product.name}</div>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end">
                    <TrendingUp size={16} className="text-green-500 mr-1" />
                    <span className="font-medium text-gray-900">{product.sold}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-medium text-gray-900">
                    {product.revenue.toLocaleString('vi-VN')} đ
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className={`font-medium ${product.stock < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                    {product.stock}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  {product.stock < 10 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <AlertTriangle size={12} className="mr-1" />
                      Sắp hết
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Bình thường
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}