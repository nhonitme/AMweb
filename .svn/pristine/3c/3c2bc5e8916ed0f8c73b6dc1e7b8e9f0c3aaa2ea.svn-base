"use client"

import { useState, useMemo, useEffect } from "react"
import { receiptColumns } from "./receiptConfig"
import type { ColumnConfig } from "@/types/table"
import { ReceiptTableToolbar } from "@/components/table/ReceiptTableToolbar"
import { Printer, Upload, Plus, Edit, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import ReceiptPrintModal from "./ReceiptPrintModal"
import PrintOptionModal from "./PrintOptionModal"
import { useNavigate } from "react-router-dom"
import Pagination from "@/components/table/Pagination" // Import Pagination component

interface Receipt {
  id: string
  receiptNo: string
  transactionDate: string
  amount: number
  description1?: string
  description2?: string
  receiverName: string
  modifiedDate?: string
  isLocked?: string
  email?: string
  attachment?: string
  createdBy?: string
  currentEditor?: string
  costCenter1?: string
  costCenter2?: string
  debit?: string
  debitAccountName?: string
  credit?: string
  creditAccountName?: string
  amountSecond?: number
  fcAmount?: number
  country?: string
  customerCode?: string
  customerName?: string
  bankName?: string
  manageCode?: string
  manageCode2?: string
  note1?: string
  note2?: string
  inventory?: string
}

// Hàm sinh mock data phiếu thu
const generateReceiptData = (count: number): Receipt[] => {
  const names = ["Nguyễn Văn A", "Trần Thị B", "Lê Văn C", "Phạm Thị D", "Hoàng Văn E", "Vũ Thị F"]
  const data: Receipt[] = []
  for (let i = 1; i <= count; i++) {
    data.push({
      id: i.toString(),
      receiptNo: `PT${i.toString().padStart(4, "0")}`,
      transactionDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        .toISOString()
        .split("T")[0],
      amount: Math.floor(Math.random() * 10000000) + 100000,
      description1: `Phiếu thu số ${i}`,
      description2: `Ghi chú cho phiếu thu ${i}`,
      receiverName: names[i % names.length],
      modifiedDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        .toISOString()
        .split("T")[0],
      isLocked: Math.random() > 0.5 ? "true" : "false",
      email: `user${i}@mail.com`,
      attachment: "",
      createdBy: "admin",
      currentEditor: "",
      costCenter1: "213",
      costCenter2: "214",
      debit: "111",
      debitAccountName: "Tiền mặt",
      credit: "511",
      creditAccountName: "Doanh thu",
      amountSecond: Math.floor(Math.random() * 1000),
      fcAmount: Math.floor(Math.random() * 1000),
      country: "VN",
      customerCode: `CUST${i.toString().padStart(3, "0")}`,
      customerName: names[i % names.length],
      bankName: "Vietcombank",
      manageCode: "MC01",
      manageCode2: "MC02",
      note1: "",
      note2: "",
      inventory: "Kho A",
    })
  }
  return data
}

interface ReceiptTwoViewTableProps {
  // Không cần data, onRefreshData nữa
}

export default function ReceiptTwoViewTable({}: ReceiptTwoViewTableProps) {
  const [data, setData] = useState<Receipt[]>(() => generateReceiptData(50))
  const [showDetailTable, setShowDetailTable] = useState(true)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [printLang, setPrintLang] = useState<string>("vi")
  const [printTemplate, setPrintTemplate] = useState<string>("receipt-foreign")
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null)
  const [showPrintOption, setShowPrintOption] = useState(false)
  const [currentPage, setCurrentPage] = useState(1) // State cho trang hiện tại
  const [itemsPerPage, setItemsPerPage] = useState(10) // State cho số mục mỗi trang
  const [table1Height, setTable1Height] = useState(400) // Chiều cao bảng 1
  const [isResizing, setIsResizing] = useState(false) // Trạng thái đang resize
  const navigate = useNavigate()

  // Hàm reload dữ liệu (mock)
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setData(generateReceiptData(50))
    setSelectedReceipt(null) // Reset table 2 khi reload
    setSelectedRowIds([])   // Reset checkbox chọn dòng
    setIsRefreshing(false)
  }

  // Xử lý resize bảng bằng cách kéo (hỗ trợ cả chuột & cảm ứng)
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsResizing(true)
    // Lấy vị trí Y bắt đầu từ chuột hoặc cảm ứng
    const startY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    const startHeight = table1Height

    // Hàm xử lý di chuyển (chuột hoặc cảm ứng)
    const handleMove = (ev: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY
      const newHeight = startHeight + (clientY - startY)
      const minHeight = 100
      const maxHeight = window.innerHeight - 300
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setTable1Height(newHeight)
      }
    }

    // Hàm kết thúc resize
    const handleEnd = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }

  // Lọc dữ liệu theo searchTerm và khoảng ngày giao dịch
  const filteredData = useMemo(() => {
    let result = data
    // Lọc theo ngày giao dịch nếu có
    if (startDate || endDate) {
      result = result.filter((r) => {
        if (!r.transactionDate) return false
        const date = r.transactionDate.slice(0, 10) // yyyy-mm-dd
        if (startDate && endDate) {
          return date >= startDate && date <= endDate
        } else if (startDate) {
          return date >= startDate
        } else if (endDate) {
          return date <= endDate
        }
        return true
      })
    }
    // Lọc theo searchTerm
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (r) =>
          (r.receiptNo && r.receiptNo.toLowerCase().includes(lower)) ||
          (r.customerName && r.customerName.toLowerCase().includes(lower)) ||
          (r.customerCode && r.customerCode.toLowerCase().includes(lower)) ||
          (r.description1 && r.description1.toLowerCase().includes(lower)) ||
          (r.description2 && r.description2.toLowerCase().includes(lower)),
      )
    }
    return result
  }, [data, searchTerm, startDate, endDate])

  // Tính toán thông tin phân trang
  const totalItems = filteredData.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = useMemo(() => filteredData.slice(startIndex, endIndex), [filteredData, startIndex, endIndex])

  // Reset current page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, startDate, endDate, itemsPerPage])

  // Tự động filter các cột theo thuộc tính visible
  const listViewColumns = useMemo(() => {
    return receiptColumns.filter((col) => col.visible === true)
  }, [])

  const detailViewColumns = useMemo(() => {
    return receiptColumns.filter((col) => col.visible === false)
  }, [])

  // Format giá trị hiển thị
  const formatValue = (value: any, column: ColumnConfig): string => {
    if (value === null || value === undefined || value === "") {
      return "-"
    }
    if (column.dataField.includes("amount") || column.dataField.includes("Amount")) {
      if (typeof value === "number") {
        return new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(value)
      }
    }
    if (column.dataField === "isLocked") {
      return value === "true" ? "Đã khóa" : "Chưa khóa"
    }
    return String(value)
  }

  const getFieldValue = (item: Receipt, dataField: string): any => {
    return (item as any)[dataField]
  }

  const handleRowClick = (receipt: Receipt) => {
    setSelectedReceipt(receipt)
  }

  // In phiếu thu theo layout riêng
  // Khi bấm in: hiện modal chọn ngôn ngữ/mẫu phiếu trước
  const handlePrint = () => {
    if (selectedReceipt) {
      setShowPrintOption(true)
    } else {
      alert("Vui lòng chọn phiếu thu để in!")
    }
  }

  // Xác nhận chọn ngôn ngữ/mẫu phiếu
  const handlePrintOptionConfirm = (lang: string, template: string) => {
    setPrintLang(lang)
    setPrintTemplate(template)
    setPrintReceipt(selectedReceipt)
    setShowPrintOption(false)
    setShowPrintModal(true)
  }

  // Xử lý chọn tất cả
  const isAllChecked = filteredData.length > 0 && selectedRowIds.length === filteredData.length
  const isIndeterminate = selectedRowIds.length > 0 && selectedRowIds.length < filteredData.length
  const handleCheckAll = (checked: boolean) => {
    if (checked) setSelectedRowIds(filteredData.map((r) => r.id))
    else setSelectedRowIds([])
  }
  const handleCheckRow = (id: string, checked: boolean) => {
    setSelectedRowIds((prev) => (checked ? [...prev, id] : prev.filter((i) => i !== id)))
    if (checked) {
      // Khi chọn checkbox, set luôn selectedReceipt để nút in hoạt động
      const found = filteredData.find((r) => r.id === id)
      if (found) setSelectedReceipt(found)
    } else {
      // Nếu bỏ chọn dòng hiện tại thì bỏ selectedReceipt nếu nó trùng id
      if (selectedReceipt?.id === id) setSelectedReceipt(null)
    }
  }

  return (
  <div className="flex flex-col md:h-[calc(100vh-100px)]">
      {/* Tiêu đề và các nút action */}
      <div className="flex items-center justify-between flex-shrink-0 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Danh sách phiếu thu</h1>
        </div>
        <div className="flex m-2 space-x-2">
          {/* Nút In ấn */}
          <div className="relative group">
            <button
              className="inline-flex items-center justify-center px-4 py-2 text-sm text-gray-600 transition-all bg-white border border-gray-300 rounded-lg hover:bg-white hover:text-red-600 hover:border-red-600"
              aria-label="In ấn"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden ml-2 sm:inline">In ấn</span>
            </button>
            <div className="absolute z-20 px-3 py-1 mt-2 text-xs text-white transition-opacity duration-200 -translate-x-1/2 bg-gray-800 rounded shadow-lg opacity-0 pointer-events-none left-1/2 whitespace-nowrap group-hover:opacity-100">
              In ấn
            </div>
          </div>
          {/* Nút Nhập Excel */}
          <div className="relative group">
            <button
              className="inline-flex items-center justify-center px-4 py-2 text-sm text-gray-600 transition-all bg-white border border-gray-300 rounded-lg hover:bg-white hover:text-red-600 hover:border-red-600"
              aria-label="Nhập Excel"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden ml-2 sm:inline">Nhập Excel</span>
            </button>
            <div className="absolute z-20 px-3 py-1 mt-2 text-xs text-white transition-opacity duration-200 -translate-x-1/2 bg-gray-800 rounded shadow-lg opacity-0 pointer-events-none left-1/2 whitespace-nowrap group-hover:opacity-100">
              Nhập Excel
            </div>
          </div>
          {/* Nút Thêm mới */}
          <div className="relative group">
            <button
              onClick={() => navigate("/receipt-management/receipt-detail")}
              className="inline-flex items-center justify-center px-4 py-2 text-sm text-white transition-all bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 hover:text-white hover:border-red-700"
              aria-label="Thêm mới"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden ml-2 sm:inline">Thêm mới</span>
            </button>
            <div className="absolute z-20 px-3 py-1 mt-2 text-xs text-white transition-opacity duration-200 -translate-x-1/2 bg-gray-800 rounded shadow-lg opacity-0 pointer-events-none left-1/2 whitespace-nowrap group-hover:opacity-100">
              Thêm mới
            </div>
          </div>
        </div>
      </div>

  {/* Container cho Toolbar, Bảng 1 và Bảng 2 */}
  <div className="flex flex-col flex-1 overflow-hidden bg-white rounded-lg shadow">
        {/* Toolbar */}
        <div className="flex-shrink-0">
          <ReceiptTableToolbar
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            isRefreshing={isRefreshing}
            onRefresh={handleRefresh}
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            onExport={() => alert("Xuất excel!")}
            onPrint={handlePrint}
            onSettings={() => alert("Thiết lập cột!")}
          />
        </div>

        {/* Modal chọn ngôn ngữ/mẫu phiếu trước khi in */}
        {showPrintOption && (
          <PrintOptionModal
            open={showPrintOption}
            onClose={() => setShowPrintOption(false)}
            onConfirm={handlePrintOptionConfirm}
            defaultLang={printLang}
            defaultTemplate={printTemplate}
          />
        )}
        {/* Modal in ấn */}
        {showPrintModal && printReceipt && (
          <ReceiptPrintModal
            receipt={printReceipt}
            onClose={() => setShowPrintModal(false)}
            lang={printLang as "vi" | "en" | "ko"}
            setLang={setPrintLang}
          />
        )}

  {/* Bảng 1 (List View) */}
  <div className={`flex flex-col min-h-0 ${!showDetailTable ? "h-full" : ""}`} style={{ height: showDetailTable ? `${table1Height}px` : 'auto' }}>
          <div className="relative flex-1 overflow-y-auto">
            <table className="min-w-full text-sm table-auto">
              <thead className="sticky top-0 z-[1] bg-[#f5f5f5] border-b border-[#e0e0e0] text-[#212121]">
                <tr>
                  <th className="sticky left-0  bg-[#f5f5f5]  px-4 py-3 text-left text-[#212121] font-bold">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-blue-600"
                      checked={isAllChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate
                      }}
                      onChange={(e) => handleCheckAll(e.target.checked)}
                      title="Chọn tất cả"
                    />
                  </th>
                  {listViewColumns.map((column) => (
                    <th
                      key={column.dataField}
                      className="px-4 py-3 text-sm font-bold text-left select-none group whitespace-nowrap"
                      style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
                    >
                      {column.displayName}
                    </th>
                  ))}
                  <th
                    className="sticky right-0  bg-[#f5f5f5]  px-4 py-3 text-center text-sm font-bold text-[#212121] whitespace-nowrap"
                    style={{ width: "100px", minWidth: "100px", maxWidth: "100px" }}
                  >
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedData.map((receipt, idx) => (
                  <tr
                    key={receipt.id}
                    onClick={() => handleRowClick(receipt)}
                    className={`group transition-colors cursor-pointer 
                      ${selectedReceipt?.id === receipt.id ? "bg-red-50" : ""}
                      ${idx % 2 === 1 ? "bg-gray-50" : ""}
                      hover:bg-red-50`
                    }
                    title="Click để xem chi tiết"
                  >
                    <td className="px-4 py-0 z-15 group-hover:bg-red-50" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-blue-600"
                        checked={selectedRowIds.includes(receipt.id)}
                        onChange={(e) => handleCheckRow(receipt.id, e.target.checked)}
                        title="Chọn dòng này"
                      />
                    </td>
                    {listViewColumns.map((column) => (
                      <td
                        key={column.dataField}
                        className="px-4 py-0 truncate group-hover:bg-red-50 whitespace-nowrap"
                        style={{ width: column.width, minWidth: column.width }}
                      >
                        {formatValue(getFieldValue(receipt, column.dataField), column)}
                      </td>
                    ))}
                    <td
                      className="sticky right-0 px-1 py-3 text-center group-hover:bg-red-50 z-2"
                      style={{ width: "100px", minWidth: "100px", maxWidth: "100px" }}
                    >
                      <div className="flex items-center justify-center space-x-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
                        <div className="relative">
                          <button
                            className="peer p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa"
                            onClick={(e) => {
                              e.stopPropagation()
                              alert("Sửa phiếu thu!")
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <div className="absolute z-30 px-2 py-1 mb-2 text-xs text-white transition-opacity transform -translate-x-1/2 bg-gray-800 rounded opacity-0 pointer-events-none bottom-full left-1/2 peer-hover:opacity-100 whitespace-nowrap">
                            Sửa
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            className="peer p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa"
                            onClick={(e) => {
                              e.stopPropagation()
                              alert("Xóa phiếu thu!")
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="absolute z-30 px-2 py-1 mb-2 text-xs text-white transition-opacity transform -translate-x-1/2 bg-gray-800 rounded opacity-0 pointer-events-none bottom-full left-1/2 peer-hover:opacity-100 whitespace-nowrap">
                            Xóa
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Thêm Pagination component */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            startIndex={startIndex}
            endIndex={endIndex}
            className="flex-shrink-0" // Đảm bảo pagination không bị co lại
          />
          
        </div>

        {/* Nút thu gọn/mở rộng bảng 2 */}
        <div 
          className="relative flex items-center justify-center py-2 select-none" 
          style={{ backgroundColor: "#eee", cursor: "row-resize", touchAction: "none" }}
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        >
          <button
            type="button"
            className="px-4 py-1 bg-gray-900 text-white rounded shadow flex items-center gap-2 text-[13px] font-[Noto Sans] hover:bg-gray-700 transition-all"
            style={{ position: "absolute", left: "50%", top: "-9px", transform: "translateX(-50%)" }}
            onClick={() => setShowDetailTable((prev) => !prev)}
          >
            {showDetailTable ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Thu gọn</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Mở rộng</span>
              </>
            )}
          </button>
        </div>

        {/* Bảng 2 (Detail View) */}
        {showDetailTable && (
          <div className="flex-1 overflow-hidden " style={{ height: `calc(100vh - ${table1Height + 200}px)` }}>
            <div className="h-full overflow-y-auto">
              <table className="min-w-full table-auto">
                <thead className="sticky top-0 z-10 bg-[#f5f5f5]  text-[#212121] whitespace-nowrap text-sm">
                  <tr>
                    {detailViewColumns.map((column) => (
                      <th
                        key={column.dataField}
                        className="px-4 py-3 text-left text-sm font-bold select-none group bg-[#f5f5f5]  text-[#212121]"
                      >
                        {column.displayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm whitespace-nowrap border-b border-[#e0e0e0]">
                  {selectedReceipt
                    ? // Luôn render 4 dòng giống nhau, đều là dữ liệu của selectedReceipt
                      [0, 1, 2, 3].map((rowIdx) => (
                        <tr key={rowIdx} className="group hover:bg-gray-50">
                          {detailViewColumns.map((column) => (
                            <td key={column.dataField} className="px-4 py-3 group-hover:bg-gray-50">
                              {formatValue(getFieldValue(selectedReceipt, column.dataField), column)}
                            </td>
                          ))}
                        </tr>
                      ))
                    : // Nếu chưa chọn thì render 4 dòng trống
                      [0, 1, 2, 3].map((rowIdx) => (
                        <tr key={rowIdx} className="group hover:bg-gray-50">
                          {detailViewColumns.map((column) => (
                            <td key={column.dataField} className="px-4 py-3 group-hover:bg-gray-50 h-[44px]">
                              {/* Để trống */}
                            </td>
                          ))}
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
