import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, FilePlus2, FileMinus2, Receipt, ScrollText, ChevronRight, Banknote, ShoppingCart, ArrowLeftRight, Layers } from "lucide-react";

const documentSubMenus = [
  {
    id: "receipt",
    title: "Phiếu thu",
    icon: <Receipt size={32} />,
  slug: "/receipt",
    description: "Quản lý phiếu thu tiền mặt, ngân hàng...",
    color: "from-green-500 to-green-600",
  },
  {
    id: "payment",
    title: "Phiếu chi",
    icon: <Banknote size={32} />,
  slug: "/payment",
    description: "Quản lý phiếu chi tiền mặt, ngân hàng...",
    color: "from-red-500 to-red-600",
  },
  {
    id: "debt-note",
    title: "Giấy báo nợ",
    icon: <FileMinus2 size={32} />,
  slug: "/debt-note",
    description: "Quản lý giấy báo nợ ngân hàng...",
    color: "from-yellow-500 to-yellow-600",
  },
  {
    id: "credit-note",
    title: "Giấy báo có",
    icon: <FilePlus2 size={32} />,
  slug: "/credit-note",
    description: "Quản lý giấy báo có ngân hàng...",
    color: "from-indigo-500 to-indigo-600",
  },
  {
    id: "purchase-order",
    title: "Phiếu mua hàng",
    icon: <ShoppingCart size={32} />,
  slug: "/purchase-order",
    description: "Quản lý phiếu mua hàng hóa, dịch vụ...",
    color: "from-pink-500 to-pink-600",
  },
  {
    id: "service-order",
    title: "Phiếu mua dịch vụ",
    icon: <ScrollText size={32} />,
  slug: "/service-order",
    description: "Quản lý phiếu mua dịch vụ...",
    color: "from-purple-500 to-purple-600",
  },
  {
    id: "sales-order",
    title: "Phiếu bán hàng/dịch vụ",
    icon: <ShoppingCart size={32} />,
  slug: "/sales-order",
    description: "Quản lý phiếu bán hàng, bán dịch vụ...",
    color: "from-orange-500 to-orange-600",
  },
  {
    id: "offset-order",
    title: "Phiếu cấn trừ",
    icon: <ArrowLeftRight size={32} />,
  slug: "/offset-order",
    description: "Quản lý phiếu cấn trừ công nợ...",
    color: "from-lime-500 to-lime-600",
  },
  {
    id: "other-order",
    title: "Phiếu khác",
    icon: <Layers size={32} />,
  slug: "/other-order",
    description: "Quản lý các loại phiếu khác...",
    color: "from-gray-500 to-gray-600",
  },
];

export default function DocumentsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
            <FileText className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chứng từ</h1>
            <p className="text-gray-600 mt-2">Danh sách các chức năng quản lý chứng từ</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documentSubMenus.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(item.slug)}
            className="group relative bg-white rounded-lg border border-gray-200 p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-red-300 hover:bg-gradient-to-br hover:from-white hover:to-red-50 active:scale-95"
          >
            <div className="flex flex-row items-center gap-4">
              <div className="w-14 h-14 bg-white border border-gray-300 rounded-lg flex items-center justify-center group-hover:scale-105 transition-all duration-200 shadow-sm">
                <div className="text-black group-hover:text-red-600">
                  {React.isValidElement(item.icon)
                    ? React.cloneElement(item.icon as React.ReactElement, { className: "w-5 h-5 text-black group-hover:text-red-700" })
                    : item.icon}
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="relative group">
                  <h3
                    className="text-sm font-semibold text-gray-900 group-hover:text-red-600 transition-colors duration-200 leading-relaxed line-clamp-1"
                  >
                    {item.title}
                  </h3>
                  <div className="absolute top-0 left-0 transform -translate-x-0 -translate-y-full px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.title}
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>
            </div>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <ChevronRight
                size={14}
                className="text-red-600"
              />
            </div>
            <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-red-200 transition-colors duration-200 pointer-events-none"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
