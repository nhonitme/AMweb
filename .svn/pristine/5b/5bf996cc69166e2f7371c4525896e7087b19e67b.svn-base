"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import * as Icons from "lucide-react"
import { useTableState } from "@/hooks/useTableState"
import { TableToolbar } from "./TableToolbar"
import { DataTable } from "./DataTable"
import { TableSettings } from "./TableSettings"
import Pagination from "@/components/table/Pagination"
import ExcelImportModal from "@/components/modals/ExcelImportModal"
import PrintModal from "@/components/modals/PrintModal"
import DeleteModal from "@/components/modals/DeleteModal"
import { Toast } from "@/components/ui/toast" // Import the new Toast component
// Remove hardcoded customer delete API. Use onDelete prop instead.
import type { TablePageProps, BaseTableItem } from "@/types/table"
import type { ExcelImportConfig, PrintConfig } from "@/types/modal"
import type { FormConfig, DeleteConfig } from "@/types/form"

// Update the interface to include the new config props
export interface TablePagePropsWithConfigs<T extends BaseTableItem> extends TablePageProps<T> {
  FormModalComponent?: React.ComponentType<any>
  customToolbar?: (props: any) => React.ReactNode
  customHeaderActions?: React.ReactNode // Cho phép truyền thêm icon/nút action vào header
  openAddAsPage?: boolean // Nếu true, khi nhấn Thêm mới sẽ gọi onAdd thay vì mở modal
}

export function TablePage<T extends BaseTableItem>({
  title,
  description,
  columns,
  data: initialData, // Rename data to initialData as TablePage will manage its own data state
  onImport,
  onPrint,
  onAdd, // This prop now expects to return { success: boolean, message: string }
  onEdit, // This prop now expects to return { success: boolean, message: string }
  onRefresh,
  onExport,
  searchFields,
  enableTreeView = false,
  parentField = "parentObject",
  companyInfo,
  excelImportConfig,
  printConfig,
  formConfig,
  deleteConfig,
  bulkDeleteConfig,
  isInitialLoading = false, // Default to false
  onDelete,
  FormModalComponent,
  customToolbar,
  customHeaderActions,
  openAddAsPage = false,
}: TablePagePropsWithConfigs<T>) {
  const localStorageKey = `${title.replace(/\s+/g, "")}TableColumnConfigs`

  // Internal state for data, managed by TablePage
  const [tableData, setTableData] = useState<T[]>(initialData)

  // Re-initialize tableData if initialData changes (e.g., from parent refresh)
  useEffect(() => {
    setTableData(initialData)
  }, [initialData])

  const [sortConfig, setSortConfig] = useState<{ field: string; order: "asc" | "desc" }>({ field: "createdDate", order: "desc" });

  const {
    // data: filteredData, // Đã bỏ biến không dùng
    flattenedItems,
    paginationData,
    childrenMap,
    searchTerm,
    isSearching,
    isRefreshing,
    setIsRefreshing,
    selectedItems,
    expandedParents,
    currentPage,
    itemsPerPage,
    columnConfigs,
    setColumnConfigs,
    getOrderedColumns,
    stickyPositions,
    handleSearch,
    toggleExpand,
    handleSelectAll,
    handleSelectOne,
    handlePageChange,
    handleItemsPerPageChange,
    handleColumnConfigChange,
    setSelectedItems,
  } = useTableState({
    data: tableData, // Pass the internally managed data
    columns,
    searchFields,
    enableTreeView,
    parentField,
    localStorageKey,
    defaultSort: sortConfig,
  })

  // Hàm xử lý sort khi click header
  const handleSort = useCallback((field: string) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        // Đảo chiều sort nếu cùng field
        return { field, order: prev.order === "asc" ? "desc" : "asc" };
      }
      return { field, order: "asc" };
    });
  }, []);

  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [formMode, setFormMode] = useState<"add" | "edit">("add")
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [deletingItem, setDeletingItem] = useState<T | null>(null)

  // Toast state for undo
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  const { totalPages, startIndex, endIndex, displayed } = paginationData

  // Get item name for delete modal and toast
  const getItemName = useCallback((item: T | null | undefined): string => {
    // Defensive check for item itself
    if (!item) {
      return "mục không tên"
    }

    const nameFields = ["code", "nameVi", "nameEn", "nameKo", "bankCode", "accountName", "name"]
    for (const field of nameFields) {
      const value = (item as any)[field]
      // Ensure value is not null or undefined, and is a non-empty string after trimming
      if (value != null) {
        // Check for null or undefined
        const stringValue = String(value).trim()
        if (stringValue !== "") {
          return stringValue
        }
      }
    }

    // Fallback to item.id if no suitable name field found
    // item.id is typed as string, but we'll be defensive against runtime issues
    if (item.id != null) {
      // Check item.id for null or undefined
      const stringId = String(item.id).trim()
      if (stringId !== "") {
        return stringId
      }
    }

    // Final fallback if nothing useful is found
    return "mục không tên"
  }, [])

  // Prepare form config with dynamic options (for parent selection in tree view)
  // Chuẩn bị config cho FormModal, giữ nguyên cấu trúc tabs nếu có

  const handleRefreshData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      if (onRefresh) {
        await onRefresh()
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh, setIsRefreshing])

  const handleBulkDeleteInternal = useCallback(() => {
    if (bulkDeleteConfig && selectedItems.length > 0) {
      setIsBulkDeleteModalOpen(true)
    }
  }, [bulkDeleteConfig, selectedItems])

  const handlePrintInternal = useCallback(
    (lang: "vi" | "en" | "ko") => {
      setIsPrintModalOpen(true)
      if (onPrint) {
        onPrint(lang)
      }
    },
    [onPrint],
  )

  // Form handlers
  const handleAddClick = useCallback(() => {
    if (openAddAsPage && onAdd) {
      // Truyền object có id rỗng để tránh lỗi type, các page detail sẽ không dùng giá trị này
      onAdd({ id: "" } as T);
      return;
    }
    if (FormModalComponent) {
      setFormMode("add")
      setEditingItem(null)
      setIsFormModalOpen(true)
    }
  }, [FormModalComponent, openAddAsPage, onAdd])

  const handleEditClick = useCallback(
    (item: T) => {
      if (openAddAsPage && onEdit) {
        // Khi openAddAsPage=true, gọi onEdit để chuyển trang (parent sẽ handle navigate)
        onEdit(item);
        return;
      }
      if (FormModalComponent) {
        setFormMode("edit")
        setEditingItem(item)
        setIsFormModalOpen(true)
      }
    },
    [FormModalComponent, openAddAsPage, onEdit],
  )

  const handleDeleteClick = useCallback(
    (item: T) => {
      if (deleteConfig) {
        setDeletingItem(item)
        setIsDeleteModalOpen(true)
      }
    },
    [deleteConfig],
  )

  const handleFormSubmit = useCallback(
    async (formData: any) => {
      if (formMode === "add" && onAdd) {
        // Gọi onAdd và kiểm tra kết quả trả về
        const addResult = await onAdd(formData)
        if (addResult && addResult.success) {
          setToastMessage(addResult.message)
          setShowToast(true)
          setIsFormModalOpen(false)
          setTableData((prev) => [...prev, { ...formData }]) // Có thể bổ sung id nếu addResult trả về
        } else {
          setToastMessage(addResult?.message || "Thêm mới khách hàng thất bại!")
          setShowToast(true)
          // Không cập nhật tableData khi thất bại
          return
        }
        return
      } else if (formMode === "edit" && editingItem && onEdit) {
        const editResult = await onEdit({ ...editingItem, ...formData } as T)
        if (editResult && editResult.success) {
          setToastMessage(editResult.message)
          setShowToast(true)
          setIsFormModalOpen(false)
          setTableData((prev) => prev.map((item) => item.id === editingItem.id ? { ...item, ...formData } : item))
        } else {
          setToastMessage(editResult?.message || "Cập nhật khách hàng thất bại!")
          setShowToast(true)
          return
        }
        return
      }

      setToastMessage("Thao tác hoàn tất nhưng không có phản hồi cụ thể.")
      setShowToast(true)
      setIsFormModalOpen(false)
    },
    [formMode, editingItem, onAdd, onEdit, setIsFormModalOpen],
  )

  // Xử lý xóa thực tế qua API (generic)
  const handleDeleteConfirm = useCallback(async () => {
    if (deletingItem) {
      // Check if the item has children
      const hasChildren = childrenMap[deletingItem.id]?.length > 0
      if (hasChildren) {
        throw new Error("Không thể xóa đối tượng cha khi còn đối tượng con. Vui lòng xóa các đối tượng con trước.")
      }
      if (!onDelete) {
        setToastMessage("Không tìm thấy hàm xóa phù hợp!")
        setShowToast(true)
        return
      }
      // Gọi API xóa qua prop
      const result = await onDelete(deletingItem.id)
      // Kiểm tra nếu result là object có success/message
      if (typeof result === 'object' && result !== null && 'success' in result) {
        const r = result as { success: boolean; message?: string }
        if (r.success) {
          setTableData((prev) => prev.filter((item) => item.id !== deletingItem.id))
          setDeletingItem(null)
          setToastMessage(r.message || "Đã xóa thành công")
          setShowToast(true)
        } else {
          setToastMessage(r.message || "Xóa thất bại!")
          setShowToast(true)
        }
      } else {
        // Nếu không trả về object, chỉ show toast mặc định
        setTableData((prev) => prev.filter((item) => item.id !== deletingItem.id))
        setDeletingItem(null)
        setToastMessage("Đã xóa thành công")
        setShowToast(true)
      }
    }
  }, [deletingItem, tableData, childrenMap, onDelete])

  // Remove undo logic from handleBulkDeleteConfirm
  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selectedItems.length > 0) {
      const selectedItemsSet = new Set(selectedItems)
      let hasUnselectedChildren = false
      for (const itemId of selectedItems) {
        const children = childrenMap[itemId]
        if (children && children.length > 0) {
          const anyChildNotSelected = children.some((child) => !selectedItemsSet.has(child.id))
          if (anyChildNotSelected) {
            hasUnselectedChildren = true
            break
          }
        }
      }
      if (hasUnselectedChildren) {
        throw new Error(
          "Không thể xóa các đối tượng cha khi có đối tượng con chưa được chọn. Vui lòng chọn tất cả đối tượng con hoặc xóa chúng trước.",
        )
      }
      // Perform deletion
      setTableData((prev) => prev.filter((item) => !selectedItems.includes(item.id)))
      setSelectedItems([])

      // Show toast
      let successMsg: string
      if (selectedItems.length === 1) {
        const singleItem = tableData.find((item) => item.id === selectedItems[0])
        successMsg = bulkDeleteConfig?.singleMessage
          ? bulkDeleteConfig.singleMessage.replace("{item}", getItemName(singleItem))
          : `Đã xóa \"${getItemName(singleItem)}\" thành công`
      } else {
        successMsg = bulkDeleteConfig?.multipleMessage
          ? bulkDeleteConfig.multipleMessage.replace("{count}", selectedItems.length.toString())
          : `Đã xóa ${selectedItems.length} mục đã chọn thành công`
      }
      setToastMessage(successMsg)
      setShowToast(true)
    }
  }, [selectedItems, tableData, childrenMap, bulkDeleteConfig, setSelectedItems])

  // Remove undo logic from handleToastClose
  const handleToastClose = useCallback(() => {
    setShowToast(false)
    setToastMessage("")
  }, [])

  return (
    <div className="space-y-0">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-600 mt-1">
              {description} ({tableData.length.toLocaleString()} bản ghi) {/* Use tableData.length */}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {/* Cho phép truyền thêm icon/nút action tuỳ biến từ page ngoài */}
          {customHeaderActions}
          {onPrint && (
            <div className="relative group">
              <button
                onClick={() => handlePrintInternal("vi")}
                className="inline-flex items-center justify-center bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-white hover:text-red-600 hover:border-red-600 transition-all"
                aria-label="In ấn"
              >
                <Icons.Printer size={16} />
                <span className="ml-2 hidden sm:inline">In ấn</span>
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 whitespace-nowrap px-3 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-lg">
                In ấn
              </div>
            </div>
          )}

          {onImport && excelImportConfig && (
            <div className="relative group">
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="inline-flex items-center justify-center bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-white hover:text-red-600 hover:border-red-600 transition-all"
                aria-label="Nhập Excel"
              >
                <Icons.Upload size={16} />
                <span className="ml-2 hidden sm:inline">Nhập Excel</span>
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 whitespace-nowrap px-3 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-lg">
                Nhập Excel
              </div>
            </div>
          )}

          {FormModalComponent && (
            <div className="relative group">
              <button
                onClick={handleAddClick}
                className="inline-flex items-center justify-center bg-red-600 border border-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 hover:text-white hover:border-red-700 transition-all"
                aria-label="Thêm mới"
              >
                <Icons.Plus size={16} />
                <span className="ml-2 hidden sm:inline">Thêm mới</span>
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 whitespace-nowrap px-3 py-1 rounded bg-gray-800 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 shadow-lg">
                Thêm mới
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-white rounded-xl shadow border">
        {customToolbar ? (
          customToolbar({
            searchTerm,
            onSearch: handleSearch,
            isRefreshing,
            onRefresh: handleRefreshData,
            onExport,
            onSettings: () => setShowSettingsPanel(true),
            selectedCount: selectedItems.length,
            onBulkDelete: bulkDeleteConfig ? handleBulkDeleteInternal : undefined,
          })
        ) : (
          <TableToolbar
            searchTerm={searchTerm}
            onSearch={handleSearch}
            isRefreshing={isRefreshing}
            onRefresh={handleRefreshData}
            onExport={onExport}
            onSettings={() => setShowSettingsPanel(true)}
            selectedCount={selectedItems.length}
            onBulkDelete={bulkDeleteConfig ? handleBulkDeleteInternal : undefined}
          />
        )}

        <DataTable
          data={displayed}
          columns={getOrderedColumns}
          stickyPositions={stickyPositions}
          selectedItems={selectedItems}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          isLoading={isRefreshing || isInitialLoading}
          isSearching={isSearching}
          itemsPerPage={itemsPerPage}
          enableTreeView={enableTreeView}
          childrenMap={childrenMap}
          expandedParents={expandedParents}
          onToggleExpand={toggleExpand}
          parentField={parentField}
          onSort={handleSort}
          sortConfig={sortConfig}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={flattenedItems.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          startIndex={startIndex}
          endIndex={endIndex}
        />
      </div>

      {/* SETTINGS PANEL */}
      {showSettingsPanel && (
        <TableSettings
          columns={columnConfigs}
          onColumnChange={handleColumnConfigChange}
          onClose={() => setShowSettingsPanel(false)}
          onReset={() => setColumnConfigs(columns)}
          stickyPositions={stickyPositions}
        />
      )}

      {/* MODALS */}
      {onImport && excelImportConfig && (
        <ExcelImportModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          onImport={(importedData, method) => {
            // Handle import logic here to update tableData
            if (method === "overwrite") {
              setTableData(importedData)
            } else if (method === "add") {
              setTableData((prev) => [...prev, ...importedData])
            } else if (method === "update") {
              setTableData((prev) => {
                const updated = [...prev]
                importedData.forEach((row: any) => {
                  const index = updated.findIndex((item) => item.code === row.code || item.bankCode === row.bankCode) // Assuming 'code' or 'bankCode' is the unique identifier
                  if (index !== -1) {
                    updated[index] = { ...updated[index], ...row }
                  } else {
                    // If in update mode and item not found, add it (optional, depends on desired behavior)
                    // For now, only update existing.
                  }
                })
                return updated
              })
            }
            // Optionally, trigger a refresh of the table state if needed
            handleRefreshData()
          }}
          existingData={tableData} // Pass tableData for validation
          config={excelImportConfig}
        />
      )}

      {onPrint && printConfig && (
        <PrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          data={tableData} // Pass tableData for printing
          config={printConfig}
          companyInfo={companyInfo}
        />
      )}

      {FormModalComponent && (
        <FormModalComponent
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSubmit={handleFormSubmit} // This will now call onAdd/onEdit from parent
          initialData={editingItem || {}}
          existingData={tableData} // Pass tableData for validation
          mode={formMode}
        />
      )}

      {deleteConfig && (
        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          config={deleteConfig}
          itemName={deletingItem ? getItemName(deletingItem) : undefined}
          onSuccess={(message) => {
            setToastMessage(message)
            setShowToast(true)
          }}
        />
      )}

      {bulkDeleteConfig && (
        <DeleteModal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          onConfirm={handleBulkDeleteConfirm}
          config={bulkDeleteConfig}
          itemCount={selectedItems.length}
          customMessage={
            selectedItems.length === 1
              ? "Đã xóa 1 đối tượng thành công" // Thông báo tùy chỉnh khi chỉ có 1 mục được chọn
              : undefined // Để DeleteModal tự xử lý cho trường hợp nhiều mục
          }
          onSuccess={(message) => {
            setToastMessage(message)
            setShowToast(true)
          }}
        />
      )}

      {/* Undo Toast */}
      {showToast && (
        <Toast message={toastMessage} onClose={handleToastClose} duration={5000} />
      )}
    </div>
  )
}
