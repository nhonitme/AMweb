
import * as Icons from "lucide-react";
import { useState } from "react";

export interface ReceiptTableToolbarProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  onSettings: () => void;
  searchTerm: string;
  onSearch: (val: string) => void;
}

export function ReceiptTableToolbar({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  isRefreshing,
  onRefresh,
  onExport,
  onPrint,
  onSettings,
  searchTerm,
  onSearch,
}: ReceiptTableToolbarProps) {
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const handleOpenDatePopup = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    setShowDatePopup(true);
  };
  const handleApplyDate = () => {
    onStartDateChange(tempStart);
    onEndDateChange(tempEnd);
    setShowDatePopup(false);
  };

  const handleCancelDate = () => {
    onStartDateChange("");
    onEndDateChange("");
    setShowDatePopup(false);
  };
  return (
    <div className="block sm:flex items-center justify-between p-2">
      <div className="flex flex-col w-full gap-2 mb-2">
        {/* Đã bỏ box filter ngày trực tiếp, chỉ còn icon search date phía dưới */}
        <div className="flex items-center space-x-4 w-full mt-2">
          <div className="relative w-64">
            <Icons.Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm mã, tên…"
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-gray-50 rounded-lg p-1 space-x-1 ml-4">
            <div className="relative group">
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Làm mới dữ liệu"
              >
                <Icons.RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              </button>
              <div className="absolute top-auto bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Làm mới dữ liệu
              </div>
            </div>
            {/* Icon search date */}
            <div className="relative group">
              <button
                onClick={handleOpenDatePopup}
                className={`p-2 ${startDate || endDate ? 'text-blue-600' : 'text-gray-600'} hover:text-blue-600 hover:bg-white rounded-md transition-all`}
                title="Tìm kiếm theo ngày"
              >
                <Icons.CalendarSearch size={18} />
              </button>
              <div className="absolute top-auto bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Tìm kiếm theo ngày
              </div>
              {/* Popup chọn ngày */}
              {showDatePopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                  <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px]">
                    <div className="mb-4">
                      <label className="block mb-1">Từ ngày</label>
                      <input type="date" value={tempStart} onChange={e => setTempStart(e.target.value)} className="border border-gray-300 rounded px-3 py-2 w-full" />
                    </div>
                    <div className="mb-4">
                      <label className="block mb-1">Đến ngày</label>
                      <input type="date" value={tempEnd} onChange={e => setTempEnd(e.target.value)} className="border border-gray-300 rounded px-3 py-2 w-full" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={handleCancelDate} className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100">Huỷ</button>
                      <button onClick={handleApplyDate} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Áp dụng</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {onExport && (
              <div className="relative group">
                <button
                  onClick={onExport}
                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-white rounded-md transition-all"
                  title="Xuất Excel"
                >
                  <Icons.FileSpreadsheet size={16} />
                </button>
                <div className="absolute top-auto bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Xuất Excel
                </div>
              </div>
            )}
            <div className="relative group">
              <button
                onClick={onSettings}
                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-white rounded-md transition-all settings-trigger"
                title="Thiết lập"
              >
                <Icons.Settings size={16} />
              </button>
              <div className="absolute top-auto bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Thiết lập
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
