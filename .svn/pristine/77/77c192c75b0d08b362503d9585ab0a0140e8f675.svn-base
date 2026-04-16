"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import * as Icons from "lucide-react"

import BankExcelImportModal from "./BankExcelImportModal"
import BankPrintModal from "./BankPrintModal"


/** Mô tả cấu trúc một đối tượng ngân hàng */
interface NganHang {
  id: string
  bankName: string // Tên ngân hàng (bắt buộc)
  bankCode: string // Mã ngân hàng (Select)(bắt buộc)
  province: string // Tỉnh (Select)(bắt buộc)
  branch: string // Chi Nhánh (Select)(bắt buộc)
  accountNumber: string
  accountName: string
  currencyType: string // Loại Tiền(Select)
  notes: string
  createdDate: string
  status: "active" | "inactive"
}

interface ColumnConfig {
  id: string
  dataField: string
  displayName: string
  width: number
  visible: boolean
  pinned: boolean
  originalOrder: number
}

// Các lựa chọn cho dropdowns
const BANK_CODES = ["VCB", "ACB", "BIDV", "TPB", "MBB", "STB", "CTG", "VPB", "HDB"]
const PROVINCES = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Hải Phòng", "Quảng Ninh", "Nghệ An", "Bình Dương"]
const BRANCHES = [
  "Chi nhánh Hoàn Kiếm",
  "Chi nhánh Ba Đình",
  "Chi nhánh Đống Đa",
  "Chi nhánh Quận 1",
  "Chi nhánh Thủ Đức",
  "Chi nhánh Hải An",
  "Chi nhánh Vinh",
  "Chi nhánh Tân Uyên",
]
const CURRENCY_TYPES = ["VND", "USD", "EUR", "JPY", "KRW"]

// Tạo dữ liệu mẫu lớn để test hiệu suất
const generateMockData = (count: number): NganHang[] => {
  const data: NganHang[] = []

  for (let i = 1; i <= count; i++) {
    data.push({
      id: i.toString(),
      bankName: `Ngân hàng ABC ${i}`,
      bankCode: BANK_CODES[i % BANK_CODES.length],
      province: PROVINCES[i % PROVINCES.length],
      branch: BRANCHES[i % BRANCHES.length],
      accountNumber: `ACCT${i.toString().padStart(6, "0")}`,
      accountName: `Tài khoản ${i} của Cty ABC`,
      currencyType: CURRENCY_TYPES[i % CURRENCY_TYPES.length],
      notes: `Ghi chú cho ngân hàng ${i}`,
      createdDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        .toISOString()
        .split("T")[0],
      status: "active",
    })
  }

  return data
}

const BankManagementPage: React.FC = () => {
  // --- State dữ liệu ---
  const [bankList, setBankList] = useState<NganHang[]>(() => generateMockData(500)) // Tạo 500 bản ghi để test

  // Modal Excel
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  // Modal Print
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)

  // Hàm xử lý import từ Excel với các phương pháp khác nhau
  const handleImportFromExcel = useCallback(
    (rows: any[], method: "add" | "update" | "overwrite") => {
      console.log("Processing import with method:", method)
      console.log("Import data:", rows)
      console.log("Current data count:", bankList.length)

      if (method === "overwrite") {
        setBankList((prevList) => {
          const updatedList = [...prevList] // Start with a copy of the current list
          let addedCount = 0
          let updatedCount = 0

          rows.forEach((row, idx) => {
            const existingIndex = updatedList.findIndex(
              (item) => item.bankCode === row.bankCode && item.bankName === row.bankName,
            ) // Use bankCode and bankName as unique identifier for overwrite/update

            if (existingIndex !== -1) {
              // Update existing record
              updatedList[existingIndex] = {
                ...updatedList[existingIndex],
                bankName: row.bankName || updatedList[existingIndex].bankName,
                bankCode: row.bankCode || updatedList[existingIndex].bankCode,
                province: row.province || updatedList[existingIndex].province,
                branch: row.branch || updatedList[existingIndex].branch,
                accountNumber: row.accountNumber || updatedList[existingIndex].accountNumber,
                accountName: row.accountName || updatedList[existingIndex].accountName,
                currencyType: row.currencyType || updatedList[existingIndex].currencyType,
                notes: row.notes || updatedList[existingIndex].notes,
              }
              updatedCount++
            } else {
              // Add new record
              const newItem: NganHang = {
                id: `${Date.now()}-${idx}`, // Generate a unique ID
                bankName: row.bankName,
                bankCode: row.bankCode,
                province: row.province,
                branch: row.branch,
                accountNumber: row.accountNumber || "",
                accountName: row.accountName || "",
                currencyType: row.currencyType || "",
                notes: row.notes || "",
                createdDate: new Date().toISOString().split("T")[0],
                status: "active" as const,
              }
              updatedList.push(newItem)
              addedCount++
            }
          })

          console.log(
            `Overwrite completed. Added ${addedCount} new records, updated ${updatedCount} records. Total: ${updatedList.length}`,
          )
          return updatedList
        })
      } else if (method === "update") {
        // Cập nhật: Chỉ cập nhật các bản ghi đã tồn tại
        setBankList((prevList) => {
          const updatedList = [...prevList]
          let updatedCount = 0

          rows.forEach((row) => {
            const existingIndex = updatedList.findIndex(
              (item) => item.bankCode === row.bankCode && item.bankName === row.bankName,
            )
            if (existingIndex !== -1) {
              // Giữ nguyên ID và một số thông tin cũ, chỉ cập nhật thông tin mới
              updatedList[existingIndex] = {
                ...updatedList[existingIndex], // Giữ nguyên id, createdDate, status
                bankName: row.bankName || updatedList[existingIndex].bankName,
                bankCode: row.bankCode || updatedList[existingIndex].bankCode,
                province: row.province || updatedList[existingIndex].province,
                branch: row.branch || updatedList[existingIndex].branch,
                accountNumber: row.accountNumber || updatedList[existingIndex].accountNumber,
                accountName: row.accountName || updatedList[existingIndex].accountName,
                currencyType: row.currencyType || updatedList[existingIndex].currencyType,
                notes: row.notes || updatedList[existingIndex].notes,
              }
              updatedCount++
              console.log(`Updated existing record: ${row.bankCode} - ${row.bankName}`)
            }
          })

          console.log(`Update completed. Updated ${updatedCount} records out of ${rows.length} input records`)
          return updatedList
        })
      } else {
        // Thêm mới: Chỉ thêm các bản ghi mới (method === "add")
        const items = rows.map((row, idx) => ({
          id: `${Date.now()}-${idx}`,
          bankName: row.bankName,
          bankCode: row.bankCode,
          province: row.province,
          branch: row.branch,
          accountNumber: row.accountNumber || "",
          accountName: row.accountName || "",
          currencyType: row.currencyType || "",
          notes: row.notes || "",
          createdDate: new Date().toISOString().split("T")[0],
          status: "active" as const,
        }))

        setBankList((prev) => {
          const newList = [...prev, ...items]
          console.log(`Add completed. Added ${items.length} new records. Total: ${newList.length}`)
          return newList
        })
      }

      setIsExcelModalOpen(false)
    },
    [bankList.length],
  )

  // Modal thêm/sửa
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<NganHang | null>(null)
  const [formData, setFormData] = useState({
    bankName: "",
    bankCode: "",
    province: "",
    branch: "",
    accountNumber: "",
    accountName: "",
    currencyType: "",
    notes: "",
  })

  // Search, chọn, bulk, export/print, phân trang
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null)
  const [showPrintMenu, setShowPrintMenu] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Hover state for rows
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null)

  // Toolbar states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([
    {
      id: "1",
      dataField: "bankName",
      displayName: "Tên ngân hàng",
      width: 200,
      visible: true,
      pinned: false,
      originalOrder: 0,
    },
    {
      id: "2",
      dataField: "bankCode",
      displayName: "Mã ngân hàng",
      width: 120,
      visible: true,
      pinned: false,
      originalOrder: 1,
    },
    {
      id: "3",
      dataField: "province",
      displayName: "Tỉnh",
      width: 150,
      visible: true,
      pinned: false,
      originalOrder: 2,
    },
    {
      id: "4",
      dataField: "branch",
      displayName: "Chi nhánh",
      width: 180,
      visible: true,
      pinned: false,
      originalOrder: 3,
    },
    {
      id: "5",
      dataField: "accountNumber",
      displayName: "Số tài khoản",
      width: 180,
      visible: true,
      pinned: false,
      originalOrder: 4,
    },
    {
      id: "6",
      dataField: "accountName",
      displayName: "Tên tài khoản",
      width: 200,
      visible: true,
      pinned: false,
      originalOrder: 5,
    },
    {
      id: "7",
      dataField: "currencyType",
      displayName: "Loại tiền",
      width: 100,
      visible: true,
      pinned: false,
      originalOrder: 6,
    },
    {
      id: "8",
      dataField: "notes",
      displayName: "Ghi chú",
      width: 250,
      visible: true,
      pinned: false,
      originalOrder: 7,
    },
    {
      id: "9",
      dataField: "createdDate",
      displayName: "Ngày tạo",
      width: 120,
      visible: true,
      pinned: false,
      originalOrder: 8,
    },
    {
      id: "10",
      dataField: "status",
      displayName: "Trạng thái",
      width: 120,
      visible: true,
      pinned: false,
      originalOrder: 9,
    },
  ])

  // Memoized calculations để tối ưu hiệu suất
  const getOrderedColumns = useMemo(() => {
    const visibleColumns = columnConfigs.filter((col) => col.visible)
    const pinnedColumns = visibleColumns.filter((col) => col.pinned).sort((a, b) => a.originalOrder - b.originalOrder)
    const unpinnedColumns = visibleColumns
      .filter((col) => !col.pinned)
      .sort((a, b) => a.originalOrder - b.originalOrder)

    return [...pinnedColumns, ...unpinnedColumns]
  }, [columnConfigs])

  // Tính toán vị trí sticky cho các cột
  const stickyPositions = useMemo(() => {
    const orderedColumns = getOrderedColumns
    const pinnedColumns = orderedColumns.filter((col) => col.pinned)
    const positions: { [key: string]: number } = {}

    const checkboxWidth = 30
    let currentLeft = checkboxWidth

    pinnedColumns.forEach((col) => {
      positions[col.id] = currentLeft
      currentLeft += col.width
    })

    return positions
  }, [getOrderedColumns])

  // Hàm để lấy style cho cột
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

  // Hàm để lấy style cho header cột
  const getHeaderColumnStyle = useCallback(
    (column: ColumnConfig) => {
      if (!column.pinned) return {}

      return {
        position: "sticky" as const,
        left: stickyPositions[column.id],
        zIndex: 11,
        backgroundColor: "#fef2f2", // bg-red-50
      }
    },
    [stickyPositions],
  )

  // Tối ưu: Memoize filtered data
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return bankList

    const lowerSearchTerm = searchTerm.toLowerCase()
    return bankList.filter(
      (item) =>
        item.bankName.toLowerCase().includes(lowerSearchTerm) ||
        item.bankCode.toLowerCase().includes(lowerSearchTerm) ||
        item.province.toLowerCase().includes(lowerSearchTerm) ||
        item.branch.toLowerCase().includes(lowerSearchTerm) ||
        item.accountNumber.toLowerCase().includes(lowerSearchTerm) ||
        item.accountName.toLowerCase().includes(lowerSearchTerm) ||
        item.currencyType.toLowerCase().includes(lowerSearchTerm) ||
        item.notes.toLowerCase().includes(lowerSearchTerm),
    )
  }, [bankList, searchTerm])

  // Tối ưu: Memoize pagination
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const displayed = filteredData.slice(startIndex, endIndex)

    return { totalPages, startIndex, endIndex, displayed }
  }, [filteredData, currentPage, itemsPerPage])

  const { totalPages, startIndex, endIndex, displayed } = paginationData

  // --- CRUD Handlers ---
  const handleAdd = useCallback(() => {
    setEditingItem(null)
    setFormData({
      bankName: "",
      bankCode: "",
      province: "",
      branch: "",
      accountNumber: "",
      accountName: "",
      currencyType: "",
      notes: "",
    })
    setIsModalOpen(true)
  }, [])

  const handleEdit = useCallback((item: NganHang) => {
    setEditingItem(item)
    setFormData({
      bankName: item.bankName,
      bankCode: item.bankCode,
      province: item.province,
      branch: item.branch,
      accountNumber: item.accountNumber,
      accountName: item.accountName,
      currencyType: item.currencyType,
      notes: item.notes,
    })
    setIsModalOpen(true)
    setShowActionMenu(null)
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      const itemToDelete = bankList.find((item) => item.id === id)
      if (!itemToDelete) {
        alert("Không tìm thấy đối tượng cần xóa!")
        return
      }

      const confirmMessage = `Bạn có chắc chắn muốn xóa ngân hàng "${itemToDelete.bankName} - ${itemToDelete.bankCode}" không?`

      if (window.confirm(confirmMessage)) {
        setBankList((prev) => prev.filter((x) => x.id !== id))
        setSelectedItems((prev) => prev.filter((selectedId) => selectedId !== id))
        console.log(`Đã xóa thành công ngân hàng: ${itemToDelete.bankName} - ${itemToDelete.bankCode}`)
      }

      setShowActionMenu(null)
    },
    [bankList],
  )

  const handleBulkDelete = useCallback(() => {
    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất một đối tượng để xóa!")
      return
    }

    const itemsCanDelete: string[] = []

    selectedItems.forEach((id) => {
      const item = bankList.find((x) => x.id === id)
      if (item) {
        itemsCanDelete.push(`${item.bankName} - ${item.bankCode}`)
      }
    })

    if (itemsCanDelete.length > 0) {
      const confirmMessage = `Bạn có chắc chắn muốn xóa ${itemsCanDelete.length} ngân hàng đã chọn không?\n\n${itemsCanDelete.slice(0, 5).join("\n")}${itemsCanDelete.length > 5 ? `\n... và ${itemsCanDelete.length - 5} đối tượng khác` : ""}`

      if (window.confirm(confirmMessage)) {
        setBankList((prev) => prev.filter((x) => !selectedItems.includes(x.id)))
        setSelectedItems([])
        console.log(`Đã xóa thành công ${itemsCanDelete.length} ngân hàng`)
      }
    }
  }, [selectedItems, bankList])

  const handleSelectAll = useCallback(
    (checked: boolean) => setSelectedItems(checked ? displayed.map((item) => item.id) : []),
    [displayed],
  )

  const handleSelectOne = useCallback(
    (id: string, checked: boolean) =>
      setSelectedItems((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id))),
    [],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (editingItem) {
        setBankList((prev) => prev.map((x) => (x.id === editingItem.id ? { ...x, ...formData } : x)))
      } else {
        const newItem: NganHang = {
          id: Date.now().toString(),
          ...formData,
          createdDate: new Date().toISOString().split("T")[0],
          status: "active",
        }
        setBankList((prev) => [...prev, newItem])
      }
      setIsModalOpen(false)
    },
    [editingItem, formData],
  )

  const handlePrint = useCallback(() => {
    setIsPrintModalOpen(true)
    setShowPrintMenu(false)
  }, [])

  // Toolbar handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      console.log("Dữ liệu đã được làm mới")
    } catch (error) {
      console.error("Lỗi khi làm mới dữ liệu:", error)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const handleExportExcel = useCallback(() => {
    // Import thư viện xlsx động
    import("xlsx")
      .then((XLSX) => {
        // Chuẩn bị dữ liệu xuất với tất cả các cột
        const exportData = bankList.map((item) => ({
          ID: item.id,
          "Tên ngân hàng": item.bankName,
          "Mã ngân hàng": item.bankCode,
          Tỉnh: item.province,
          "Chi nhánh": item.branch,
          "Số tài khoản": item.accountNumber,
          "Tên tài khoản ngân hàng": item.accountName,
          "Loại tiền": item.currencyType,
          "Ghi chú": item.notes,
          "Ngày tạo": item.createdDate,
          "Trạng thái": item.status === "active" ? "Hoạt động" : "Không hoạt động",
        }))

        // Tạo workbook và worksheet
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(exportData)

        // Thiết lập độ rộng cột
        const colWidths = [
          { wch: 10 }, // ID
          { wch: 25 }, // Tên ngân hàng
          { wch: 15 }, // Mã ngân hàng
          { wch: 20 }, // Tỉnh
          { wch: 25 }, // Chi nhánh
          { wch: 25 }, // Số tài khoản
          { wch: 30 }, // Tên tài khoản ngân hàng
          { wch: 12 }, // Loại tiền
          { wch: 40 }, // Ghi chú
          { wch: 12 }, // Ngày tạo
          { wch: 12 }, // Trạng thái
        ]
        ws["!cols"] = colWidths

        // Thêm worksheet vào workbook
        XLSX.utils.book_append_sheet(wb, ws, "Quản lý ngân hàng")

        // Tạo tên file với timestamp
        const now = new Date()
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, "-")
        const filename = `quan-ly-ngan-hang-${timestamp}.xlsx`

        // Xuất file bằng cách tạo buffer và blob
        try {
          const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
          const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })

          // Tạo link download
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = filename
          link.style.display = "none"

          // Thêm vào DOM, click và xóa
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          // Giải phóng URL object
          URL.revokeObjectURL(url)

          console.log(`Đã xuất ${exportData.length} bản ghi ra file Excel: ${filename}`)
        } catch (writeError) {
          console.error("Lỗi khi tạo file Excel:", writeError)
          alert("Có lỗi xảy ra khi tạo file Excel. Vui lòng thử lại.")
        }
      })
      .catch((error) => {
        console.error("Lỗi khi tải thư viện Excel:", error)
        alert("Có lỗi xảy ra khi tải thư viện Excel. Vui lòng thử lại.")
      })
  }, [bankList])

  const handleColumnConfigChange = useCallback((columnId: string, field: keyof ColumnConfig, value: any) => {
    setColumnConfigs((prev) => prev.map((col) => (col.id === columnId ? { ...col, [field]: value } : col)))
  }, [])

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }, [])

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Element
      if (showPrintMenu && !t.closest(".print-dropdown")) setShowPrintMenu(false)
      if (showActionMenu && !t.closest(".action-dropdown")) setShowActionMenu(null)
      if (showSettingsPanel && !t.closest(".settings-panel") && !t.closest(".settings-trigger")) {
        setShowSettingsPanel(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [showPrintMenu, showActionMenu, showSettingsPanel])

  // Tối ưu: Debounce search để tránh re-render liên tục
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset về trang 1 khi search
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm])

  return (
    <div className="space-y-0">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý ngân hàng</h1>
          <p className="text-gray-600 mt-1">
            Quản lý các tài khoản ngân hàng ({bankList.length.toLocaleString()} bản ghi)
          </p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {/* In ấn */}
          <div className="relative print-dropdown">
            <button
              onClick={() => handlePrint()}
              className="inline-flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
            >
              <Icons.Printer size={16} /> <span className="hidden sm:block">In ấn</span>
            </button>
          </div>
          {/* Xuất Excel */}
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2 hover:bg-green-700"
          >
            <Icons.Upload size={16} /> <span className="hidden sm:block">Nhập Excel</span>
          </button>
          {/* Thêm mới */}
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2 hover:bg-blue-700"
          >
            <Icons.Plus size={16} /> <span className="hidden sm:block">Thêm mới</span>
          </button>
        </div>
      </div>

      {/* SEARCH & BULK ACTION */}
      <div className="bg-white rounded-xl shadow border ">
        <div className="block sm:flex items-center justify-between p-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Icons.Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm tên ngân hàng, mã, số TK…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
            </div>

            {/* Toolbar với 3 icon */}
            <div className="flex items-center bg-gray-50 rounded-lg p-1 space-x-1">
              {/* Icon Load lại */}
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

              {/* Icon Xuất Excel */}
              <div className="relative group">
                <button
                  onClick={handleExportExcel}
                  className="p-2 text-gray-600 hover:text-green-600 hover:bg-white rounded-md transition-all"
                  title="Xuất Excel"
                >
                  <Icons.FileSpreadsheet size={16} />
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Xuất Excel
                </div>
              </div>

              {/* Icon Thiết lập */}
              <div className="relative group">
                <button
                  onClick={() => setShowSettingsPanel(true)}
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
          </div>

          {selectedItems.length > 0 && (
            <div className="flex mt-4 sm:mt-0 items-center space-x-4">
              <span className="text-sm text-gray-600">Đã chọn {selectedItems.length} mục</span>
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2 hover:bg-red-700"
              >
                <Icons.Trash2 size={16} /> <span>Xóa</span>
              </button>
            </div>
          )}
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-red-50">
              <tr>
                <th
                  className="sticky left-0 z-20 bg-red-50 px-4 py-3 text-left"
                  style={{
                    width: "30px",
                    minWidth: "30px",
                    maxWidth: "30px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.length === displayed.length && displayed.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                </th>
                {getOrderedColumns.map((col) => (
                  <th
                    key={col.id}
                    className="px-4 py-3 text-left text-sm font-semibold text-red-700"
                    style={{
                      width: col.width,
                      minWidth: col.width,
                      ...getHeaderColumnStyle(col),
                    }}
                  >
                    <div className="flex items-center">
                      {col.displayName}
                      {col.pinned && <Icons.Pin size={12} className="ml-1 text-red-500" />}
                    </div>
                  </th>
                ))}
                <th
                  className="sticky right-0 z-10 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700"
                  style={{
                    width: "100px",
                    minWidth: "100px",
                    maxWidth: "100px",
                  }}
                >
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayed.map((item) => {
                return (
                  <tr
                    key={item.id}
                    className="group hover:bg-gray-50"
                    onMouseEnter={() => setHoveredRowId(item.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                  >
                    <td
                      className="sticky left-0 z-15 bg-white px-4 py-3 group-hover:bg-gray-50"
                      style={{
                        width: "30px",
                        minWidth: "30px",
                        maxWidth: "30px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => handleSelectOne(item.id, e.target.checked)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </td>
                    {getOrderedColumns.map((col) => (
                      <td
                        key={col.id}
                        className="px-4 py-3 group-hover:bg-gray-50"
                        style={{
                          width: col.width,
                          minWidth: col.width,
                          ...getColumnStyle(col),
                        }}
                      >
                        {
                          // Render based on dataField
                          col.dataField === "notes" ? (
                            <span className="text-sm text-gray-600 truncate max-w-xs block" title={item.notes}>
                              {item.notes}
                            </span>
                          ) : col.dataField === "status" ? (
                            <span
                              className={`text-sm font-medium ${
                                item.status === "active" ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {item.status === "active" ? "Hoạt động" : "Không hoạt động"}
                            </span>
                          ) : (
                            <span>{item[col.dataField as keyof NganHang]}</span>
                          )
                        }
                      </td>
                    ))}
                    {/* Cột hành động (Edit/Delete) */}
                    <td
                      className="sticky group-hover:bg-gray-50 right-0 z-10 px-1 py-3 text-center"
                      style={{
                        width: "100px",
                        minWidth: "100px",
                        maxWidth: "100px",
                      }}
                    >
                      <div className="flex items-center justify-center space-x-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
                        {/* Sửa */}
                        <div className="relative">
                          <button
                            onClick={() => handleEdit(item)}
                            className="peer p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Icons.Edit size={16} />
                          </button>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                            Sửa
                          </div>
                        </div>

                        {/* Xóa */}
                        <div className="relative">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="peer p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Icons.Trash2 size={16} />
                          </button>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                            Xóa
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredData.length === 0 && (
            <div className="text-center py-8">
              <Icons.Banknote size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Không tìm thấy dữ liệu nào</p>
            </div>
          )}
        </div>

        {/* ENHANCED PAGINATION */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredData.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
          startIndex={startIndex}
          endIndex={endIndex}
        />
      </div>

      {/* SETTINGS PANEL */}
      {showSettingsPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50">
          <div className="bg-white h-full w-96 shadow-xl settings-panel flex flex-col">
            <div className="flex-1 flex flex-col h-full ">
              <div className="flex justify-between p-4 border-b ">
                <h3 className="text-lg font-semibold text-gray-900">
                  Thiết lập bảng dữ liệu
                  <div className="text-sm text-gray-400 ">Tùy chỉnh hiển thị các cột trong bảng dữ liệu</div>
                </h3>
                <button onClick={() => setShowSettingsPanel(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <Icons.X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {columnConfigs.map((column) => (
                    <div key={column.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      {/* Checkbox và tên cột */}
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={column.visible}
                          onChange={(e) => handleColumnConfigChange(column.id, "visible", e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{column.dataField}</div>
                          <div className="text-sm text-gray-500">Tên cột dữ liệu</div>
                        </div>
                        {column.pinned && (
                          <div className="flex items-center text-blue-600">
                            <Icons.Pin size={14} />
                            <span className="text-xs ml-1">Đã ghim</span>
                          </div>
                        )}
                      </div>

                      {/* Tên hiển thị và Độ rộng cột trên cùng 1 dòng */}
                      <div className="grid grid-cols-5 gap-3">
                        <div className="col-span-3">
                          <label className="block font-medium text-gray-700 mb-1">Tên cột hiển thị</label>
                          <input
                            type="text"
                            value={column.displayName}
                            onChange={(e) => handleColumnConfigChange(column.id, "displayName", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!column.visible}
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="block font-medium text-gray-700 mb-1">Width</label>
                          <input
                            type="number"
                            value={column.width}
                            onChange={(e) =>
                              handleColumnConfigChange(column.id, "width", Number.parseInt(e.target.value) || 100)
                            }
                            min="50"
                            max="500"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={!column.visible}
                          />
                        </div>
                      </div>

                      {/* Ghim cột */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={column.pinned}
                          onChange={(e) => handleColumnConfigChange(column.id, "pinned", e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={!column.visible}
                        />
                        <label className="text-gray-700">Ghim cột bên trái</label>
                      </div>

                      {/* Hiển thị vị trí sticky nếu được ghim */}
                      {column.pinned && column.visible && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-2">
                          <div className="text-xs text-blue-700">
                            <Icons.Info size={12} className="inline mr-1" />
                            Vị trí sticky: {stickyPositions[column.id]}px từ trái
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons - Fixed at bottom */}
              <div className="p-6 border-t border-gray-200 flex space-x-3">
                <button
                  onClick={() => {
                    // Reset to default
                    setColumnConfigs([
                      {
                        id: "1",
                        dataField: "bankName",
                        displayName: "Tên ngân hàng",
                        width: 200,
                        visible: true,
                        pinned: false,
                        originalOrder: 0,
                      },
                      {
                        id: "2",
                        dataField: "bankCode",
                        displayName: "Mã ngân hàng",
                        width: 120,
                        visible: true,
                        pinned: false,
                        originalOrder: 1,
                      },
                      {
                        id: "3",
                        dataField: "province",
                        displayName: "Tỉnh",
                        width: 150,
                        visible: true,
                        pinned: false,
                        originalOrder: 2,
                      },
                      {
                        id: "4",
                        dataField: "branch",
                        displayName: "Chi nhánh",
                        width: 180,
                        visible: true,
                        pinned: false,
                        originalOrder: 3,
                      },
                      {
                        id: "5",
                        dataField: "accountNumber",
                        displayName: "Số tài khoản",
                        width: 180,
                        visible: true,
                        pinned: false,
                        originalOrder: 4,
                      },
                      {
                        id: "6",
                        dataField: "accountName",
                        displayName: "Tên tài khoản",
                        width: 200,
                        visible: true,
                        pinned: false,
                        originalOrder: 5,
                      },
                      {
                        id: "7",
                        dataField: "currencyType",
                        displayName: "Loại tiền",
                        width: 100,
                        visible: true,
                        pinned: false,
                        originalOrder: 6,
                      },
                      {
                        id: "8",
                        dataField: "notes",
                        displayName: "Ghi chú",
                        width: 250,
                        visible: true,
                        pinned: false,
                        originalOrder: 7,
                      },
                      {
                        id: "9",
                        dataField: "createdDate",
                        displayName: "Ngày tạo",
                        width: 120,
                        visible: true,
                        pinned: false,
                        originalOrder: 8,
                      },
                      {
                        id: "10",
                        dataField: "status",
                        displayName: "Trạng thái",
                        width: 120,
                        visible: true,
                        pinned: false,
                        originalOrder: 9,
                      },
                    ])
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Đặt lại mặc định
                </button>
                <button
                  onClick={() => setShowSettingsPanel(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal - Truyền dữ liệu hiện có */}
      <BankExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImport={handleImportFromExcel}
        existingData={bankList}
      />

      {/* Print Modal */}
      <BankPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={bankList}
        companyInfo={{
          name: "Công ty TNHH ABC Technology",
          address: "123 Đường ABC, Quận Ba Đình, Hà Nội",
          taxCode: "0123456789",
        }}
      />

      {/* MODAL THÊM/SỬA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? "Chỉnh sửa ngân hàng" : "Thêm mới ngân hàng"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Icons.X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Tên ngân hàng & Mã ngân hàng */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Tên ngân hàng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bankName}
                    onChange={(e) => setFormData((d) => ({ ...d, bankName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="Nhập tên ngân hàng"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Mã ngân hàng <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.bankCode}
                    onChange={(e) => setFormData((d) => ({ ...d, bankCode: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">Chọn mã ngân hàng</option>
                    {BANK_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tỉnh & Chi nhánh */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Tỉnh <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.province}
                    onChange={(e) => setFormData((d) => ({ ...d, province: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">Chọn tỉnh</option>
                    {PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Chi nhánh <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.branch}
                    onChange={(e) => setFormData((d) => ({ ...d, branch: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">Chọn chi nhánh</option>
                    {BRANCHES.map((br) => (
                      <option key={br} value={br}>
                        {br}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Số tài khoản & Tên tài khoản */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">Số tài khoản</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData((d) => ({ ...d, accountNumber: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="Nhập số tài khoản"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-2">Tên tài khoản ngân hàng</label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData((d) => ({ ...d, accountName: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="Nhập tên tài khoản"
                  />
                </div>
              </div>

              {/* Loại tiền & Ghi chú */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">Loại tiền</label>
                  <select
                    value={formData.currencyType}
                    onChange={(e) => setFormData((d) => ({ ...d, currencyType: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">Chọn loại tiền</option>
                    {CURRENCY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-2">Ghi chú</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((d) => ({ ...d, notes: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                    placeholder="Nhập ghi chú"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                >
                  <Icons.Save size={16} /> <span>{editingItem ? "Cập nhật" : "Thêm mới"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BankManagementPage
