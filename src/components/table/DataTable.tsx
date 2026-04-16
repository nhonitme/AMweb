"use client"

import type React from "react"

import { useCallback } from "react"
import * as Icons from "lucide-react"
import type { ColumnConfig, BaseTableItem } from "@/types/table"

interface DataTableProps<T extends BaseTableItem> {
  data: Array<{ item: T; depth: number }>
  columns: ColumnConfig[]
  stickyPositions: { [key: string]: number }
  selectedItems: string[]
  onSelectAll: (checked: boolean) => void
  onSelectOne: (id: string, checked: boolean) => void
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  isLoading?: boolean
  isSearching?: boolean
  itemsPerPage: number
  enableTreeView?: boolean
  childrenMap?: Record<string, T[]>
  expandedParents?: string[]
  onToggleExpand?: (id: string) => void
  parentField?: string
  renderCustomCell?: (item: T, column: ColumnConfig, depth: number) => React.ReactNode
  onSort?: (field: string) => void
  sortConfig?: { field: string; order: "asc" | "desc" }

}

export function DataTable<T extends BaseTableItem>({
  data,
  columns,
  stickyPositions,
  selectedItems,
  onSelectAll,
  onSelectOne,
  onEdit,
  onDelete,
  isLoading = false,
  isSearching = false,
  itemsPerPage,
  enableTreeView = false,
  childrenMap = {},
  expandedParents = [],
  onToggleExpand,
  parentField = "parentObject",
  renderCustomCell: propRenderCustomCell,
  onSort,
  sortConfig,
}: DataTableProps<T>) {
  const getColumnStyle = useCallback(
    (column: ColumnConfig) => {
      if (!column.pinned) return {}
      return {
        position: "sticky" as const,
        left: stickyPositions[column.id],
        zIndex: 10,
        backgroundColor: "white",
      }
    },
    [stickyPositions],
  )

  const getHeaderColumnStyle = useCallback(
    (column: ColumnConfig) => {
      if (!column.pinned) return {}
      return {
        position: "sticky" as const,
        left: stickyPositions[column.id],
        zIndex: 11,
        backgroundColor: "#fef2f2",
      }
    },
    [stickyPositions],
  )

  const renderCell = useCallback(
    (item: T, column: ColumnConfig, depth: number) => {
      if (propRenderCustomCell) {
        const customCell = propRenderCustomCell(item, column, depth)
        if (customCell) return customCell
      }

      const value = item[column.dataField]

      if (enableTreeView && column.dataField === "code") {
        const hasChildren = Boolean(childrenMap[item.id]?.length)
        const isExpanded = expandedParents.includes(item.id)

        return (
          <div className="flex items-center" style={{ marginLeft: depth * 20 }}>
            {hasChildren && onToggleExpand && (
              <button onClick={() => onToggleExpand(item.id)} className="ml-[-17px] mr-0">
                {isExpanded ? <Icons.ChevronDown size={16} /> : <Icons.ChevronRight size={16} />}
              </button>
            )}
            <span className={depth > 0 ? "text-gray-600" : "font-medium text-gray-900"}>{String(value || "")}</span>
          </div>
        )
      }

      if (column.dataField === parentField) {
        const parentValue = item[parentField]
        if (!parentValue || parentValue === "0") {
          return <span className="text-gray-400 italic">Không có cha</span>
        }
        return <span className="text-sm text-gray-600">{String(parentValue)}</span>
      }

      if (column.dataField === "notes") {
        return (
          <span className="text-sm text-gray-600 truncate max-w-xs block" title={String(value || "")}>
            {String(value || "")}
          </span>
        )
      }

      return <span>{String(value || "")}</span>
    },
    [enableTreeView, childrenMap, expandedParents, onToggleExpand, parentField, propRenderCustomCell],
  )

  return (
    <div className="overflow-x-auto relative">
      <table className="min-w-full table-auto">
        <thead className="bg-[#f5f5f5] border-t border-b border-[#e0e0e0] text-[#212121]">
          <tr>
            <th
              className="sticky left-0 z-20 bg-[#f5f5f5] border-t border-b border-[#e0e0e0] px-4 py-3 text-left text-[#212121] font-bold"
              style={{ width: "30px", minWidth: "30px", maxWidth: "30px" }}
            >
              <input
                type="checkbox"
                checked={selectedItems.length === data.length && data.length > 0}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
            </th>
            {columns.map((col) => {
              const isSorted = sortConfig && sortConfig.field === col.dataField;
              const sortOrder = isSorted ? sortConfig?.order : undefined;
              return (
                <th
                  key={col.id}
                  className="px-4 py-3 text-left text-sm font-bold select-none group bg-[#f5f5f5] border-t border-b border-[#e0e0e0] text-[#212121]"
                  style={{
                    width: col.width,
                    minWidth: col.width,
                    ...getHeaderColumnStyle(col),
                    cursor: onSort ? "pointer" : undefined,
                  }}
                  onClick={onSort ? () => onSort(col.dataField) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.displayName}
                    {/* Icon sort */}
                    {onSort && (
                      <span className="ml-1 flex items-center">
                        {isSorted ? (
                          sortOrder === "asc" ? (
                            <Icons.ChevronUp size={16} className="text-red-500" />
                          ) : (
                            <Icons.ChevronDown size={16} className="text-red-500" />
                          )
                        ) : (
                          <Icons.ChevronUp size={16} className="text-gray-300 opacity-0 group-hover:opacity-60 transition-opacity" />
                        )}
                      </span>
                    )}
                    {col.pinned && <Icons.Pin size={12} className="ml-1 text-red-500" />}
                  </div>
                </th>
              );
            })}
            <th
              className="sticky right-0 z-10 bg-[#f5f5f5] border-t border-b border-[#e0e0e0] px-4 py-3 text-center text-sm font-bold text-[#212121]"
              style={{ width: "100px", minWidth: "100px", maxWidth: "100px" }}
            >
              Thao tác
            </th>
          </tr>
        </thead>
      </table>
      <table className="min-w-full table-auto">
        <tbody className="divide-y divide-gray-200">
          {isLoading || isSearching
            ? Array.from({ length: itemsPerPage }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="animate-pulse">
                  <td
                    className="sticky left-0 z-15 bg-white px-4 py-3"
                    style={{ width: "30px", minWidth: "30px", maxWidth: "30px" }}
                  >
                    <div className="h-4 w-4 bg-gray-200 rounded" />
                  </td>
                  {columns.map((col) => (
                    <td
                      key={`skeleton-${rowIndex}-${col.id}`}
                      className="px-4 py-3"
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        ...getColumnStyle(col),
                      }}
                    >
                      <div className="h-4 bg-gray-200 rounded" style={{ width: `${Math.random() * 70 + 30}%` }} />
                    </td>
                  ))}
                  <td
                    className="sticky right-0 z-10 bg-white px-1 py-3 text-center"
                    style={{ width: "100px", minWidth: "100px", maxWidth: "100px" }}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <div className="h-6 w-6 bg-gray-200 rounded-lg" />
                      <div className="h-6 w-6 bg-gray-200 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))
            : data.map(({ item, depth }) => (
                <tr key={item.id} className="group hover:bg-gray-50">
                  <td
                    className="sticky left-0 z-15 bg-white px-4 py-3 group-hover:bg-gray-50"
                    style={{ width: "30px", minWidth: "30px", maxWidth: "30px" }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => onSelectOne(item.id, e.target.checked)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className="px-4 py-3 group-hover:bg-gray-50"
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        ...getColumnStyle(col),
                      }}
                    >
                      {renderCell(item, col, depth)}
                    </td>
                  ))}
                  <td
                    className="sticky group-hover:bg-gray-50 right-0  px-1 py-3 text-center"
                    style={{ width: "100px", minWidth: "100px", maxWidth: "100px" }}
                  >
                    <div className="flex items-center justify-center space-x-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
                      {onEdit && (
                        <div className="relative">
                          <button
                            onClick={() => onEdit(item)}
                            className="peer p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Icons.Edit size={16} />
                          </button>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                            Sửa
                          </div>
                        </div>
                      )}

                      {onDelete && (
                        <div className="relative">
                          <button
                            onClick={() => onDelete(item)}
                            className="peer p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Icons.Trash2 size={16} />
                          </button>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                            Xóa
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
      {data.length === 0 && !isLoading && !isSearching && (
        <div className="text-center py-8">
          <Icons.Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Không tìm thấy dữ liệu nào</p>
        </div>
      )}
    </div>
  )
}
