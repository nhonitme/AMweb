"use client"

import { useState } from "react"
import * as Icons from "lucide-react"
import type { ColumnConfig } from "@/types/table"

interface TableSettingsProps {
  columns: ColumnConfig[]
  onColumnChange: (columnId: string, field: keyof ColumnConfig, value: any) => void
  onClose: () => void
  onReset: () => void
  stickyPositions: { [key: string]: number }
}

export function TableSettings({ columns, onColumnChange, onClose, onReset, stickyPositions }: TableSettingsProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  const toggleExpanded = (columnId: string) => {
    setExpandedItems(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    )
  }

  const isExpanded = (columnId: string) => expandedItems.includes(columnId)

  const filteredColumns = columns.filter(column =>
    column.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    column.dataField.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const visibleCount = columns.filter(col => col.visible).length
  const pinnedCount = columns.filter(col => col.pinned && col.visible).length

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-end z-50">
      <div className="bg-white h-full w-80 shadow-2xl settings-panel flex flex-col border-l border-gray-200">
        <div className="flex-1 flex flex-col h-full">
          {/* Header - Compact & Modern */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Icons.Settings size={18} className="mr-2 text-blue-600" />
                Cài đặt cột
              </h3>
              <div className="flex items-center space-x-3 mt-1 text-xs text-gray-600">
                <span className="flex items-center bg-white/60 px-2 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                  {visibleCount} hiển thị
                </span>
                <span className="flex items-center bg-white/60 px-2 py-1 rounded-full">
                  <Icons.Pin size={10} className="mr-1 text-blue-500" />
                  {pinnedCount} ghim
                </span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white/80 rounded-lg transition-all duration-200 group"
            >
              <Icons.X size={16} className="text-gray-500 group-hover:text-gray-700" />
            </button>
          </div>

          {/* Search - Compact */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Icons.Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
              />
            </div>
          </div>

          {/* Content - Improved spacing */}
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {filteredColumns.map((column) => (
                <div key={column.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm transition-all duration-200">
                  {/* Compact Header */}
                  <div 
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-all duration-200"
                    onClick={() => toggleExpanded(column.id)}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {/* Visibility Toggle */}
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={column.visible}
                          onChange={(e) => {
                            e.stopPropagation()
                            onColumnChange(column.id, "visible", e.target.checked)
                          }}
                          className="sr-only"
                        />
                        <div 
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                            column.visible 
                              ? 'bg-blue-600 border-blue-600' 
                              : 'border-gray-300 hover:border-blue-400'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onColumnChange(column.id, "visible", !column.visible)
                          }}
                        >
                          {column.visible && <Icons.Check size={10} className="text-white" />}
                        </div>
                      </div>
                      
                      {/* Column Info - More compact */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate text-sm">{column.displayName}</div>
                        <div className="text-xs text-gray-500 flex items-center space-x-1">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{column.width}px</span>
                          {column.pinned && (
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs flex items-center">
                              <Icons.Pin size={8} className="mr-0.5" />
                              Ghim
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center space-x-1">
                        {/* Pin Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onColumnChange(column.id, "pinned", !column.pinned)
                          }}
                          className={`p-1.5 rounded-md transition-all duration-200 ${
                            column.pinned 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          title={column.pinned ? "Bỏ ghim" : "Ghim cột"}
                          disabled={!column.visible}
                        >
                          <Icons.Pin size={12} />
                        </button>
                        
                        {/* Expand Icon */}
                        <Icons.ChevronDown 
                          size={14} 
                          className={`text-gray-400 transition-transform duration-200 ${
                            isExpanded(column.id) ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content - More organized */}
                  {isExpanded(column.id) && (
                    <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50/50 space-y-3">
                      {/* Display Name */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tên hiển thị</label>
                        <input
                          type="text"
                          value={column.displayName}
                          onChange={(e) => onColumnChange(column.id, "displayName", e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          disabled={!column.visible}
                        />
                      </div>

                      {/* Width Slider - Improved */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          Độ rộng: <span className="text-blue-600 font-semibold">{column.width}px</span>
                        </label>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="80"
                            max="400"
                            value={column.width}
                            onChange={(e) => onColumnChange(column.id, "width", Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            disabled={!column.visible}
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>80px</span>
                            <span>400px</span>
                          </div>
                        </div>
                      </div>

                      {/* Info Cards */}
                      <div className="space-y-2">
                        <div className="bg-white border border-gray-200 rounded-md p-2">
                          <div className="text-xs text-gray-600">
                            <span className="font-medium text-gray-700">Trường dữ liệu:</span>
                            <code className="ml-1 text-blue-600 bg-blue-50 px-1 py-0.5 rounded text-xs font-mono">
                              {column.dataField}
                            </code>
                          </div>
                        </div>
                        
                        {column.pinned && column.visible && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                            <div className="flex items-center space-x-1 text-xs text-blue-800">
                              <Icons.Pin size={10} />
                              <span>Vị trí ghim: <strong>{stickyPositions[column.id] || 0}px</strong></span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredColumns.length === 0 && (
                <div className="text-center py-8">
                  <Icons.Search size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Không tìm thấy cột nào</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Modern buttons */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <button
                onClick={onReset}
                className="flex-1 px-3 py-2.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center space-x-1.5 font-medium"
              >
                <Icons.RotateCcw size={14} />
                <span>Đặt lại</span>
              </button>
              <button 
                onClick={onClose}
                className="flex-1 px-3 py-2.5 text-[13px] font-[Noto Sans] bg-red-600 border border-red-600 text-white rounded-lg hover:bg-red-700 hover:border-red-700 transition-all duration-200 flex items-center justify-center space-x-1.5 shadow-sm font-medium"
              >
                <Icons.Check size={14} />
                <span>Hoàn tất</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .slider::-webkit-slider-track {
          height: 8px;
          border-radius: 4px;
          background: #e5e7eb;
        }
        
        .slider::-moz-range-track {
          height: 8px;
          border-radius: 4px;
          background: #e5e7eb;
        }
      `}</style>
    </div>
  )
}