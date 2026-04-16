"use client"
import * as Icons from "lucide-react"

interface UserTableToolbarProps {
  searchTerm: string
  onSearch: (term: string) => void
  isRefreshing: boolean
  onRefresh: () => Promise<void>
  onExport?: () => void
  onSettings: () => void
  selectedCount: number
  onBulkDelete?: () => void
  // Thêm props riêng cho user management
  userTypeFilter: string
  onUserTypeFilterChange: (type: string) => void
}

export function UserTableToolbar({
  searchTerm,
  onSearch,
  isRefreshing,
  onRefresh,
  onExport,
  onSettings,
  selectedCount,
  onBulkDelete,
  userTypeFilter,
  onUserTypeFilterChange,
}: UserTableToolbarProps) {
  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh()
    }
  }

  return (
    <div className="block sm:flex items-center justify-between p-6">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Icons.Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm mã, tên…"
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>

        

        <div className="flex items-center bg-gray-50 rounded-lg p-1 space-x-1">
          <div className="relative group">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Làm mới dữ liệu"
            >
              <Icons.RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Làm mới dữ liệu
            </div>
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
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
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
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Thiết lập
            </div>
          </div>
        </div>
        {/* User Type Filter - Tính năng riêng cho user management */}
        <div className="relative">
          <select
            value={userTypeFilter}
            onChange={(e) => onUserTypeFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
          >
            <option value="">Tất cả loại người dùng</option>
            <option value="admin">Quản trị cao nhất</option>
            <option value="user">Người sử dụng</option>
            <option value="viewer">Người xem</option>
          </select>
        </div>
      </div>

      {selectedCount > 0 && onBulkDelete && (
        <div className="flex mt-4 sm:mt-0 items-center space-x-4">
          <span className="text-sm text-gray-600">Đã chọn {selectedCount} mục</span>
          <button
            onClick={onBulkDelete}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2 hover:bg-red-700"
          >
            <Icons.Trash2 size={16} /> <span>Xóa</span>
          </button>
        </div>
      )}
    </div>
  )
}