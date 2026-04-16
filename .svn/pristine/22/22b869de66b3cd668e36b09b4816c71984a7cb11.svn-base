"use client";
import { useState, useRef, useEffect } from "react";
import { TableSettings } from "@/components/table/TableSettings";
import { useNavigate } from "react-router-dom";
import { Save, Plus, ArrowLeft, Filter, Banknote, Receipt, X, Search } from "lucide-react";
import { TableToolbar } from "@/components/table/TableToolbar";
import Pagination from "@/components/table/Pagination";

// Các trường chi tiết chứng từ mẫu, có thể chỉnh lại theo detail design
const detailFields = [
  { id: "fullName", label: "Họ và tên", required: true },
  { id: "soChungTu", label: "Số chứng từ", required: true },
  { id: "date", label: "Tại ngày", required: true },
  { id: "categoryName", label: "Tên danh mục", required: true },
  { id: "reference", label: "Tham chiếu", required: false },
  { id: "email", label: "Email", required: false },
  { id: "displayColumns", label: "Cột hiển thị", required: false },
  { id: "note", label: "Ghi chú", required: false },
  { id: "debtDate", label: "Số ngày nợ", required: false },
  { id: "paymentDeadline", label: "Hạn thanh toán", required: true },
  { id: "description1", label: "Mô tả 1", required: false, multilingual: true },
]

// Định nghĩa lại ColumnConfigLocal để tương thích TableSettings
import type { ColumnConfig } from "@/types/table"
// Cấu hình cột mới cho bảng Danh sách chi tiết chứng từ
const defaultColumns: ColumnConfig[] = [
  {
    id: "customerName",
    dataField: "customerName",
    displayName: "Tên khách hàng",
    width: 150,
    visible: true,
    pinned: false,
    originalOrder: 0,
  },
  {
    id: "customerCode",
    dataField: "customerCode",
    displayName: "Mã khách hàng",
    width: 120,
    visible: true,
    pinned: false,
    originalOrder: 1,
  },
  {
    id: "costObject",
    dataField: "costObject",
    displayName: "Đối tượng tập hợp chi phí",
    width: 180,
    visible: true,
    pinned: false,
    originalOrder: 2,
  },
  {
    id: "costObject2",
    dataField: "costObject2",
    displayName: "Đối tượng tập hợp chi phí 2",
    width: 180,
    visible: true,
    pinned: false,
    originalOrder: 3,
  },
  {
    id: "moTa2_vi",
    dataField: "moTa2_vi",
    displayName: "Mô tả 2 (Tiếng Việt)",
    width: 200,
    visible: true,
    pinned: false,
    originalOrder: 4,
  },
  {
    id: "moTa2_en",
    dataField: "moTa2_en",
    displayName: "Mô tả 2 (Tiếng Anh)",
    width: 200,
    visible: true,
    pinned: false,
    originalOrder: 5,
  },
  {
    id: "moTa2_ko",
    dataField: "moTa2_ko",
    displayName: "Mô tả 2 (Tiếng Hàn)",
    width: 200,
    visible: true,
    pinned: false,
    originalOrder: 6,
  },
  {
    id: "country",
    dataField: "country",
    displayName: "Quốc gia",
    width: 100,
    visible: true,
    pinned: false,
    originalOrder: 7,
  },
  { id: "debit", dataField: "debit", displayName: "Nợ", width: 120, visible: true, pinned: false, originalOrder: 8 },
  { id: "credit", dataField: "credit", displayName: "Có", width: 120, visible: true, pinned: false, originalOrder: 9 },
  {
    id: "amount",
    dataField: "amount",
    displayName: "Số tiền",
    width: 120,
    visible: true,
    pinned: false,
    originalOrder: 10,
  },
  {
    id: "amountFC",
    dataField: "amountFC",
    displayName: "FC số tiền",
    width: 120,
    visible: true,
    pinned: false,
    originalOrder: 11,
  },
  {
    id: "exchangeRate",
    dataField: "exchangeRate",
    displayName: "Tỉ giá giao dịch",
    width: 120,
    visible: true,
    pinned: false,
    originalOrder: 12,
  },
  {
    id: "vatTax",
    dataField: "vatTax",
    displayName: "Thuế VAT",
    width: 120,
    visible: true,
    pinned: false,
    originalOrder: 13,
  },
  {
    id: "inventory",
    dataField: "inventory",
    displayName: "Hàng tồn kho",
    width: 120,
    visible: true,
    pinned: false,
    originalOrder: 14,
  },
  {
    id: "assetPrepaid",
    dataField: "assetPrepaid",
    displayName: "Tài sản cố định/ chi phí trả trước",
    width: 180,
    visible: true,
    pinned: false,
    originalOrder: 15,
  },
  {
    id: "contractNumber",
    dataField: "contractNumber",
    displayName: "Số hợp đồng",
    width: 140,
    visible: true,
    pinned: false,
    originalOrder: 16,
  },
  {
    id: "bankName",
    dataField: "bankName",
    displayName: "Tên ngân hàng",
    width: 150,
    visible: true,
    pinned: false,
    originalOrder: 17,
  },
  {
    id: "managementCode",
    dataField: "managementCode",
    displayName: "Mã quản lý",
    width: 130,
    visible: true,
    pinned: false,
    originalOrder: 18,
  },
  {
    id: "managementCode2",
    dataField: "managementCode2",
    displayName: "Mã quản lý 2",
    width: 130,
    visible: true,
    pinned: false,
    originalOrder: 19,
  },
  {
    id: "noteCode",
    dataField: "noteCode",
    displayName: "Mã ghi chú",
    width: 120,
    visible: true,
    pinned: false,
    originalOrder: 20,
  },
  {
    id: "noteCode2",
    dataField: "noteCode2",
    displayName: "Mã ghi chú 2",
    width: 120,
    visible: true,
    pinned: false,
    originalOrder: 21,
  },
]

export default function ReceiptDetailPage() {
  // Thêm danh sách tài khoản Nợ/Có mẫu
  const [debitCreditAccountsList] = useState([
    { id: 1, code: "111", name: "Tiền mặt" },
    { id: 2, code: "112", name: "Tiền gửi ngân hàng" },
    { id: 3, code: "131", name: "Phải thu khách hàng" },
    { id: 4, code: "152", name: "Nguyên vật liệu" },
    { id: 5, code: "211", name: "Tài sản cố định hữu hình" },
    { id: 6, code: "331", name: "Phải trả người bán" },
    { id: 7, code: "411", name: "Vốn đầu tư của chủ sở hữu" },
  ])

  // State cho popup Nợ/Có
  const [showDebitCreditPopup, setShowDebitCreditPopup] = useState(false)
  const [selectedDebitCreditRowIndex, setSelectedDebitCreditRowIndex] = useState<number | null>(null)
  const [currentDebitCreditField, setCurrentDebitCreditField] = useState<string | null>(null) // 'debit' or 'credit'
  const [debitCreditSearchTerm, setDebitCreditSearchTerm] = useState("")
  const [debitCreditPage, setDebitCreditPage] = useState(1)
  const [debitCreditItemsPerPage, setDebitCreditItemsPerPage] = useState(10)

  // Lọc danh sách tài khoản Nợ/Có theo search
  const filteredDebitCreditList = debitCreditAccountsList.filter((acc: any) => {
    const term = debitCreditSearchTerm.trim().toLowerCase()
    if (!term) return true
    return acc.name.toLowerCase().includes(term) || acc.code.toLowerCase().includes(term)
  })

  // Phân trang tài khoản Nợ/Có
  const debitCreditTotalPages = Math.max(1, Math.ceil(filteredDebitCreditList.length / debitCreditItemsPerPage))
  const debitCreditStartIndex = (debitCreditPage - 1) * debitCreditItemsPerPage
  const debitCreditEndIndex = debitCreditStartIndex + debitCreditItemsPerPage
  const pagedDebitCreditList = filteredDebitCreditList.slice(debitCreditStartIndex, debitCreditEndIndex)

  // Hàm mở popup Nợ/Có
  const handleOpenDebitCreditPopup = (rowIndex: number, fieldId: string) => {
    setSelectedDebitCreditRowIndex(rowIndex)
    setCurrentDebitCreditField(fieldId)
    setShowDebitCreditPopup(true)
  }

  // Hàm xử lý chọn tài khoản Nợ/Có từ popup
  const handleSelectDebitCredit = (account: any) => {
    if (selectedDebitCreditRowIndex !== null && currentDebitCreditField) {
      const updatedDetails = [...details]
      updatedDetails[selectedDebitCreditRowIndex] = {
        ...updatedDetails[selectedDebitCreditRowIndex],
        [currentDebitCreditField]: account.code, // Lưu mã tài khoản vào ô
      }
      setDetails(updatedDetails)
      console.log("Selected debit/credit account and updated details:", updatedDetails[selectedDebitCreditRowIndex])
    }
    setShowDebitCreditPopup(false)
    setSelectedDebitCreditRowIndex(null)
    setCurrentDebitCreditField(null)
  }
  // Danh sách khách hàng mẫu (khai báo đầu function để các state và logic phía dưới dùng được)
  const [customerList] = useState([
    {
      id: 1,
      customerName: "Công ty TNHH ABC",
      customerCode: "KH001",
      country: "Việt Nam",
      bankName: "Vietcombank",
      managementCode: "VCB001",
    },
    {
      id: 2,
      customerName: "Công ty CP XYZ",
      customerCode: "KH002",
      country: "Hàn Quốc",
      bankName: "Shinhan Bank",
      managementCode: "SHB002",
    },
    {
      id: 3,
      customerName: "Tập đoàn DEF",
      customerCode: "KH003",
      country: "Nhật Bản",
      bankName: "MUFG Bank",
      managementCode: "MUFG003",
    },
    {
      id: 4,
      customerName: "Doanh nghiệp GHI",
      customerCode: "KH004",
      country: "Thái Lan",
      bankName: "Bangkok Bank",
      managementCode: "BBL004",
    },
    {
      id: 5,
      customerName: "Công ty JKL Co., Ltd",
      customerCode: "KH005",
      country: "Singapore",
      bankName: "DBS Bank",
      managementCode: "DBS005",
    },
  ])

  // Dữ liệu mẫu cho Đối tượng tập hợp chi phí
  const [costObjectList] = useState([
    { id: 1, code: "CP001", name: "Chi phí Marketing" },
    { id: 2, code: "CP002", name: "Chi phí Vận hành" },
    { id: 3, code: "CP003", name: "Chi phí Nghiên cứu & Phát triển" },
    { id: 4, code: "CP004", name: "Chi phí Bán hàng" },
    { id: 5, code: "CP005", name: "Chi phí Quản lý" },
    { id: 6, code: "CP006", name: "Chi phí Sản xuất" },
    { id: 7, code: "CP007", name: "Chi phí Dịch vụ" },
  ])

  // Danh sách quốc gia với ký hiệu cờ
  const [countryListWithSymbols] = useState([
    { code: "VN", name: "Việt Nam", symbol: "🇻🇳" },
    { code: "KR", name: "Hàn Quốc", symbol: "🇰🇷" },
    { code: "US", name: "Hoa Kỳ", symbol: "🇺🇸" },
    { code: "TH", name: "Thái Lan", symbol: "🇹🇭" },
    { code: "SG", name: "Singapore", symbol: "🇸🇬" },
    { code: "JP", name: "Nhật Bản", symbol: "🇯🇵" },
    { code: "CN", name: "Trung Quốc", symbol: "🇨🇳" },
  ])

  // State cho search và phân trang popup khách hàng
  const [customerSearchTerm, setCustomerSearchTerm] = useState("")
  const [customerPage, setCustomerPage] = useState(1)
  const [customerItemsPerPage, setCustomerItemsPerPage] = useState(10)

  // Lọc danh sách khách hàng theo search
  const filteredCustomerList = customerList.filter((c: any) => {
    const term = customerSearchTerm.trim().toLowerCase()
    if (!term) return true
    return (
      c.customerName.toLowerCase().includes(term) ||
      c.customerCode.toLowerCase().includes(term) ||
      c.country.toLowerCase().includes(term) ||
      c.bankName.toLowerCase().includes(term) ||
      c.managementCode.toLowerCase().includes(term)
    )
  })

  // Phân trang khách hàng
  const customerTotalPages = Math.max(1, Math.ceil(filteredCustomerList.length / customerItemsPerPage))
  const customerStartIndex = (customerPage - 1) * customerItemsPerPage
  const customerEndIndex = customerStartIndex + customerItemsPerPage
  const pagedCustomerList = filteredCustomerList.slice(customerStartIndex, customerEndIndex)

  // State cho popup Đối tượng tập hợp chi phí
  const [showCostObjectPopup, setShowCostObjectPopup] = useState(false)
  const [selectedCostObjectRowIndex, setSelectedCostObjectRowIndex] = useState<number | null>(null)
  const [currentCostObjectField, setCurrentCostObjectField] = useState<string | null>(null) // 'costObject' or 'costObject2'
  const [costObjectSearchTerm, setCostObjectSearchTerm] = useState("")
  const [costObjectPage, setCostObjectPage] = useState(1)
  const [costObjectItemsPerPage, setCostObjectItemsPerPage] = useState(10)

  // Lọc danh sách Đối tượng tập hợp chi phí theo search
  const filteredCostObjectList = costObjectList.filter((co: any) => {
    const term = costObjectSearchTerm.trim().toLowerCase()
    if (!term) return true
    return co.name.toLowerCase().includes(term) || co.code.toLowerCase().includes(term)
  })

  // Phân trang Đối tượng tập hợp chi phí
  const costObjectTotalPages = Math.max(1, Math.ceil(filteredCostObjectList.length / costObjectItemsPerPage))
  const costObjectStartIndex = (costObjectPage - 1) * costObjectItemsPerPage
  const costObjectEndIndex = costObjectStartIndex + costObjectItemsPerPage
  const pagedCostObjectList = filteredCostObjectList.slice(costObjectStartIndex, costObjectEndIndex)

  // Hook chuyển trang
  const navigate = useNavigate();
  // Hàm lưu phiếu thu và chi tiết
  const handleSave = () => {
    // TODO: Gọi API lưu phiếu thu và chi tiết
    alert("Đã lưu phiếu thu và chi tiết!")
    navigate("/receipt-management")
  }
  const [form, setForm] = useState<any>({})
  const [details, setDetails] = useState<any[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  // Cấu hình cột động
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns)
  const [showSettings, setShowSettings] = useState<boolean>(false)
  // State cho đa ngôn ngữ mô tả
  const [multilingualFields, setMultilingualFields] = useState<{
    [key: string]: { vi: string; en: string; ko: string }
  }>({
    description1: { vi: "", en: "", ko: "" },
  })
  // Thêm state mới để quản lý việc hiển thị tất cả các ngôn ngữ cho mô tả 1
  const [showAllDescriptionLanguages, setShowAllDescriptionLanguages] = useState(false)
  // State cho popup khách hàng
  const [showCustomerPopup, setShowCustomerPopup] = useState(false)
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null)
  // State cho popup thanh toán chứng từ
  const [showPaymentPopup, setShowPaymentPopup] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState("VND")
  const [selectedOtherCurrency, setSelectedOtherCurrency] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<any>(null)
  const [customerDebts, setCustomerDebts] = useState<any[]>([])
  const [hideDebt, setHideDebt] = useState(false)
  const [selectedDebtIds, setSelectedDebtIds] = useState<number[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")

  // Dữ liệu mẫu chứng từ công nợ
  // Lấy ngày hôm nay dạng yyyy-mm-dd
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, "0")
  const dd = String(today.getDate()).padStart(2, "0")
  const todayStr = `${yyyy}-${mm}-${dd}`

  const debtList = [
    {
      id: 1,
      customerId: 1,
      soChungTu: "CT001",
      ngayGiaoDich: todayStr,
      soHoaDon: "HD001",
      ngayHoaDon: todayStr,
      moTa: "Thanh toán hàng hóa",
      hanThanhToan: todayStr,
      soTien: 50000000,
      soTienConLai: 30000000,
      soTienTra: 0,
    },
    {
      id: 2,
      customerId: 1,
      soChungTu: "CT002",
      ngayGiaoDich: todayStr,
      soHoaDon: "HD002",
      ngayHoaDon: todayStr,
      moTa: "Dịch vụ tư vấn",
      hanThanhToan: todayStr,
      soTien: 25000000,
      soTienConLai: 25000000,
      soTienTra: 0,
    },
    {
      id: 3,
      customerId: 2,
      soChungTu: "CT003",
      ngayGiaoDich: todayStr,
      soHoaDon: "HD003",
      ngayHoaDon: todayStr,
      moTa: "Xuất khẩu sản phẩm",
      hanThanhToan: todayStr,
      soTien: 75000000,
      soTienConLai: 75000000,
      soTienTra: 0,
    },
  ]

  const exchangeRates = {
    KRW: 18, // 1 USD = 18 VND (ví dụ)
    SGD: 17000, // 1 SGD = 17000 VND
    CNY: 3200, // 1 CNY = 3200 VND
    THB: 650, // 1 THB = 650 VND
  }
  // Sticky positions (nếu có ghim cột)
  // Tính toán vị trí left cho các cột pinned
  const stickyPositions = (() => {
    const visibleColumns = columns.filter((col) => col.visible)
    const pinnedColumns = visibleColumns.filter((col) => col.pinned)
    const positions: { [key: string]: number } = {}
    let currentLeft = 0
    pinnedColumns.forEach((col) => {
      positions[col.id] = currentLeft
      currentLeft += col.width
    })
    return positions
  })()

  // Hàm lấy style sticky cho header cột
  const getHeaderColumnStyle = (col: ColumnConfig) => {
    if (!col.pinned) return {}
    return {
      position: "sticky" as const,
      left: stickyPositions[col.id],
      zIndex: 11,
      background: "#f5f5f5",
    }
  }
  // Hàm lấy style sticky cho cell
  const getCellColumnStyle = (col: ColumnConfig) => {
    if (!col.pinned) return {}
    return {
      position: "sticky" as const,
      left: stickyPositions[col.id],
      zIndex: 10,
      background: "white",
    }
  }

  // Hàm cập nhật cột (visible, width, pinned, displayName...)
  const handleColumnChange = (columnId: string, field: keyof ColumnConfig, value: any) => {
    setColumns((cols) => cols.map((col) => (col.id === columnId ? { ...col, [field]: value } : col)))
  }
  // Đặt lại về mặc định
  const handleResetColumns = () => setColumns(defaultColumns)

  const handleChange = (id: string, value: any) => {
    setForm((prev: Record<string, any>) => ({ ...prev, [id]: value }))
  }

  // Hàm xử lý thay đổi cho trường đa ngôn ngữ
  const handleMultilingualChange = (fieldId: string, language: string, value: string) => {
    setMultilingualFields((prev) => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [language]: value,
      },
    }))
  }

  // Hàm xử lý chọn khách hàng từ popup
  const handleSelectCustomer = (customer: any) => {
    if (selectedRowIndex !== null) {
      const updatedDetails = [...details]
      updatedDetails[selectedRowIndex] = {
        ...updatedDetails[selectedRowIndex],
        customerName: customer.customerName,
        customerCode: customer.customerCode,
        country: customer.country,
        bankName: customer.bankName,
        managementCode: customer.managementCode,
        fullName: customer.customerName, // Điền luôn Họ và tên cho bảng
      }
      setDetails(updatedDetails)
      console.log("Selected customer and updated details:", updatedDetails[selectedRowIndex])
    }
    // Điền luôn Họ và tên trên form nhập chi tiết
    setForm((prev: Record<string, any>) => ({ ...prev, fullName: customer.customerName }))
    setShowCustomerPopup(false)
    setSelectedRowIndex(null)
  }

  // Hàm mở popup khách hàng
  const handleOpenCustomerPopup = (rowIndex: number) => {
    setSelectedRowIndex(rowIndex)
    setShowCustomerPopup(true)
  }

  // Hàm mở popup Đối tượng tập hợp chi phí
  const handleOpenCostObjectPopup = (rowIndex: number, fieldId: string) => {
    setSelectedCostObjectRowIndex(rowIndex)
    setCurrentCostObjectField(fieldId)
    setShowCostObjectPopup(true)
  }

  // Hàm xử lý chọn Đối tượng tập hợp chi phí từ popup
  const handleSelectCostObject = (costObject: any) => {
    if (selectedCostObjectRowIndex !== null && currentCostObjectField) {
      const updatedDetails = [...details]
      updatedDetails[selectedCostObjectRowIndex] = {
        ...updatedDetails[selectedCostObjectRowIndex],
        [currentCostObjectField]: costObject.name, // Điền tên đối tượng vào ô
        // Nếu cần lưu mã đối tượng, có thể thêm một trường khác, ví dụ:
        // [`${currentCostObjectField}Code`]: costObject.code,
      }
      setDetails(updatedDetails)
      console.log("Selected cost object and updated details:", updatedDetails[selectedCostObjectRowIndex])
    }
    setShowCostObjectPopup(false)
    setSelectedCostObjectRowIndex(null)
    setCurrentCostObjectField(null)
  }

  // Hàm mở popup thanh toán chứng từ
  const handleOpenPaymentPopup = () => {
    setShowPaymentPopup(true)
  }

  // Hàm chọn khách hàng trong popup thanh toán
  const handleSelectPaymentCustomer = (customer: any) => {
    setSelectedPaymentCustomer(customer)
    // Lọc chứng từ công nợ của khách hàng
    const customerDebtList = debtList.filter((debt) => debt.customerId === customer.id)
    setCustomerDebts(customerDebtList)
  }

  // Hàm chọn/bỏ chọn chứng từ để thanh toán
  const handleSelectDebt = (debtId: number) => {
    setSelectedDebtIds((prev) => {
      if (prev.includes(debtId)) {
        return prev.filter((id) => id !== debtId)
      } else {
        return [...prev, debtId]
      }
    })
  }

  // Hàm thanh toán chứng từ đã chọn
  const handlePayment = () => {
    const selectedDebts = customerDebts.filter((debt) => selectedDebtIds.includes(debt.id))
    // TODO: Xử lý logic thanh toán và cập nhật vào bảng chính
    console.log("Thanh toán các chứng từ:", selectedDebts)
    setShowPaymentPopup(false)
    setSelectedPaymentCustomer(null)
    setCustomerDebts([])
    setSelectedDebtIds([])
  }

  // Hàm tính toán tỷ giá
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return amount
    if (fromCurrency === "USD" && toCurrency !== "VND") {
      return amount * (exchangeRates[toCurrency as keyof typeof exchangeRates] || 1)
    }
    return amount
  }

  const handleAddDetail = () => {
    // Khi thêm dòng mới, đảm bảo các trường đa ngôn ngữ được khởi tạo đúng cách
    const newDetailRow = {
      ...form,
      description1_vi: multilingualFields.description1.vi,
      description1_en: multilingualFields.description1.en,
      description1_ko: multilingualFields.description1.ko,
      // Thêm các trường khác nếu cần
    }
    if (editingIndex !== null) {
      // Sửa dòng
      setDetails((prev) => prev.map((d, i) => (i === editingIndex ? { ...newDetailRow } : d)))
      setEditingIndex(null)
    } else {
      setDetails((prev) => [...prev, { ...newDetailRow }])
    }
    setForm({})
    setMultilingualFields({ description1: { vi: "", en: "", ko: "" } }) // Reset multilingual fields
  }

  // State lưu lỗi từng trường ở popup thanh toán chứng từ
  const [searchErrors, setSearchErrors] = useState<{ [key: string]: string }>({})

  // Hàm tìm kiếm popup Thanh toán chứng từ
  const handleSearch = () => {
    const errors: { [key: string]: string } = {}
    if (!selectedCustomer) errors.selectedCustomer = "Vui lòng chọn khách hàng"
    if (!selectedCurrency) errors.selectedCurrency = "Vui lòng chọn loại tiền"
    if (!startDate) errors.startDate = "Vui lòng nhập từ ngày"
    if (!endDate) errors.endDate = "Vui lòng nhập đến ngày"
    setSearchErrors(errors)
    if (Object.keys(errors).length > 0) return

    // Tìm khách hàng theo selectedCustomer
    const customer = customerList.find((c) => String(c.id) === String(selectedCustomer))
    setSelectedPaymentCustomer(customer || null)

    // Lọc chứng từ công nợ theo khách hàng
    if (customer) {
      let customerDebtList = debtList.filter((debt) => debt.customerId === customer.id)
      // Lọc theo ngày giao dịch
      customerDebtList = customerDebtList.filter(
        (debt) => debt.ngayGiaoDich >= startDate && debt.ngayGiaoDich <= endDate,
      )
      // Có thể bổ sung lọc theo loại tiền nếu cần
      setCustomerDebts(customerDebtList)
    } else {
      setCustomerDebts([])
    }
    // Reset các chứng từ đã chọn khi tìm kiếm mới
    setSelectedDebtIds([])
  }

  return (
    <div className="w-full mx-auto text-[13px]">
      {/* Nút quay lại */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#ccc] rounded-lg bg-white text-[#666]  hover:border-red-600 hover:text-red-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại 
        </button>
      </div>
      {/* Gộp form nhập chi tiết và bảng danh sách chi tiết vào cùng 1 khối */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        {/* Form nhập chi tiết chứng từ */}
        <h2 className="text-lg font-semibold mb-4">Chi tiết chứng từ</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Nhóm 1 */}
          <div className="space-y-3">
            {/* Họ và tên */}
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700 text-[13px]">
                Họ và tên <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={form.fullName || ""}
                onChange={(e) => handleChange("fullName", e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                placeholder="Họ và tên"
              />
            </div>
            {/* Email */}
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700 text-[13px]">Email</label>
              <input
                type="text"
                value={form.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                placeholder="Email"
              />
            </div>
            {/* Tên danh mục */}
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700 text-[13px]">
                Tên danh mục <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={form.categoryName || ""}
                onChange={(e) => handleChange("categoryName", e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                placeholder="Tên danh mục"
              />
            </div>
          </div>

          {/* Nhóm 2 */}
          <div className="space-y-3">
            {/* Tham chiếu */}
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700 text-[13px]">Tham chiếu</label>
              <input
                type="text"
                value={form.reference || ""}
                onChange={(e) => handleChange("reference", e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                placeholder="Tham chiếu"
              />
            </div>
            {/* Ghi chú */}
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700 text-[13px]">Ghi chú</label>
              <input
                type="text"
                value={form.note || ""}
                onChange={(e) => handleChange("note", e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                placeholder="Ghi chú"
              />
            </div>
            {/* Mô tả 1 */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-gray-700 text-[13px]">Mô tả 1</label>
                <button
                  type="button"
                  onClick={() => setShowAllDescriptionLanguages(!showAllDescriptionLanguages)}
                  className="text-blue-600 hover:text-blue-800 text-xs"
                >
                  {showAllDescriptionLanguages ? "Chỉ 1 ngôn ngữ" : "Thêm 3 ngôn ngữ"}
                </button>
              </div>
              {showAllDescriptionLanguages ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={multilingualFields.description1.vi || ""}
                    onChange={(e) => handleMultilingualChange("description1", "vi", e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                    placeholder="Mô tả 1 (Tiếng Việt)"
                  />
                  <input
                    type="text"
                    value={multilingualFields.description1.en || ""}
                    onChange={(e) => handleMultilingualChange("description1", "en", e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                    placeholder="Mô tả 1 (English)"
                  />
                  <input
                    type="text"
                    value={multilingualFields.description1.ko || ""}
                    onChange={(e) => handleMultilingualChange("description1", "ko", e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                    placeholder="Mô tả 1 (한국어)"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={multilingualFields.description1.vi || ""}
                  onChange={(e) => handleMultilingualChange("description1", "vi", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                  placeholder="Mô tả 1 (Tiếng Việt)"
                />
              )}
            </div>
          </div>

          {/* Nhóm 3 */}
          <div className="space-y-3">
            {/* Số chứng từ */}
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700 text-[13px]">
                Số chứng từ <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={form.soChungTu || ""}
                onChange={(e) => handleChange("soChungTu", e.target.value)}
                onBlur={() => {
                  if (!form.soChungTu) {
                    handleChange("soChungTu", `AUTO-${Date.now()}`)
                  }
                }}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                placeholder="Số chứng từ"
              />
            </div>
            {/* Tại ngày */}
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700 text-[13px]">
                Tại ngày <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="date"
                value={form.date || ""}
                onChange={(e) => handleChange("date", e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
              />
            </div>
            {/* Số ngày nợ (70%) và Hạn thanh toán (30%) cùng 1 dòng */}
            <div className="flex gap-2">
              <div className="flex flex-col flex-1" style={{ flexBasis: "70%" }}>
                <label className="mb-1 font-medium text-gray-700 text-[13px]">Số ngày nợ</label>
                <input
                  type="text"
                  value={form.debtDate || ""}
                  onChange={(e) => handleChange("debtDate", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                  placeholder="Số ngày nợ"
                />
              </div>
              <div className="flex flex-col flex-1" style={{ flexBasis: "30%" }}>
                <label className="mb-1 font-medium text-gray-700 text-[13px]">
                  Hạn thanh toán <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="date"
                  value={form.paymentDeadline || ""}
                  onChange={(e) => handleChange("paymentDeadline", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 border-gray-300 transition-colors text-[13px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4 gap-2">
          <button
            type="button"
            className="flex items-center justify-center gap-2 px-4 py-2 border border-[#ccc] rounded-lg bg-white text-[#666] hover:border-red-600 hover:text-red-600 transition-colors text-[13px]"
            // TODO: Thêm logic thu tiền khách hàng
          >
            <Banknote className="w-4 h-4" />
            <span className="hidden sm:inline">Thu tiền khách hàng</span>
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 px-4 py-2 border border-[#ccc] rounded-lg bg-white text-[#666] hover:border-red-600 hover:text-red-600 transition-colors text-[13px]"
            onClick={handleOpenPaymentPopup}
          >
            <Receipt className="w-4 h-4" />
            <span className="hidden sm:inline">Thanh toán chứng từ</span>
          </button>
          <button
            onClick={handleAddDetail}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-red-600 rounded-lg bg-red-600 text-white hover:bg-red-700 hover:border-red-700  transition-colors text-[13px]"
            title={editingIndex !== null ? "Cập nhật dòng" : "Thêm dòng"}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{editingIndex !== null ? "Cập nhật" : "Thêm"}</span>
          </button>
        </div>

        {/* Bảng danh sách chi tiết */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Danh sách chi tiết chứng từ</h2>
            {/* Nút mở popup cài đặt cột dạng slide phải */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 border border-[#ccc] rounded-lg bg-white text-[#666] hover:border-red-600 hover:text-red-600 transition-colors relative group"
              title="Cài đặt cột"
              aria-label="Cài đặt cột"
              type="button"
            >
              <Filter size={20} className="group-hover:text-red-600 transition-colors" />
              {/* Tooltip */}
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 px-2 py-1 rounded bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all">
                Cài đặt cột
              </span>
            </button>
            {showSettings && (
              <TableSettings
                columns={columns}
                onColumnChange={handleColumnChange}
                onClose={() => setShowSettings(false)}
                onReset={handleResetColumns}
                stickyPositions={stickyPositions}
              />
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-[#f5f5f5] border-t border-b border-gray-300 text-[13px]">
                <tr>
                  {columns
                    .filter((c) => c.visible)
                    .map((col) => (
                      <th
                        key={col.id}
                        className="px-3 py-2 font-semibold text-[#212121] border-b border-l border-gray-300 text-left text-[13px]"
                        style={{ width: `${col.width}px`, minWidth: `${col.width}px`, ...getHeaderColumnStyle(col) }}
                      >
                        {col.displayName}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {details.length === 0 && (
                  <tr>
                    {columns
                      .filter((c) => c.visible)
                      .map((col) => (
                        <td
                          key={col.id}
                          className="px-3 py-2 border border-gray-300 bg-white text-[13px]"
                          style={{ width: `${col.width}px`, minWidth: `${col.width}px`, ...getCellColumnStyle(col) }}
                        >
                          {/* Trường nhập liệu cho từng loại cột */}
                          {col.id === "customerName" ? (
                            <input
                              type="text"
                              placeholder={`Nhập ${col.displayName}`}
                              onClick={() => handleOpenCustomerPopup(0)}
                              readOnly
                              className="w-full border-none focus:outline-none text-[13px] cursor-pointer "
                            />
                          ) : col.id === "costObject" || col.id === "costObject2" ? (
                            <input
                              type="text"
                              placeholder={`Chọn ${col.displayName}`}
                              onClick={() => handleOpenCostObjectPopup(0, col.id)}
                              readOnly
                              className="w-full border-none focus:outline-none text-[13px] cursor-pointer "
                            />
                          ) : col.id === "country" ? (
                            <select
                              value={""} // Default empty for new row
                              onChange={(e) => {
                                const newRow = columns.reduce<Record<string, string>>((acc, c) => {
                                  acc[c.id] = c.id === col.id ? e.target.value : ""
                                  return acc
                                }, {})
                                setDetails([newRow])
                              }}
                              className="w-full border-none focus:outline-none text-[13px]"
                            >
                              <option value="">Chọn quốc gia...</option>
                              {countryListWithSymbols.map((country) => (
                                <option key={country.code} value={country.name}>
                                  {country.name} {country.symbol}
                                </option>
                              ))}
                            </select>
                          ) : col.id === "debit" || col.id === "credit" ? (
                            <input
                              type="text"
                              placeholder={`Chọn ${col.displayName}`}
                              onClick={() => handleOpenDebitCreditPopup(0, col.id)}
                              readOnly
                              className="w-full border-none focus:outline-none text-[13px] cursor-pointer"
                            />
                          ) : col.id === "amount" ||
                            col.id === "amountFC" ||
                            col.id === "exchangeRate" ||
                            col.id === "vatTax" ? (
                            <input
                              type="number"
                              placeholder={`Nhập ${col.displayName}`}
                              onChange={(e) => {
                                const newRow = columns.reduce<Record<string, string>>((acc, c) => {
                                  acc[c.id] = c.id === col.id ? e.target.value : ""
                                  return acc
                                }, {})
                                setDetails([newRow])
                              }}
                              className="w-full border-none focus:outline-none text-[13px]"
                              min="0"
                            />
                          ) : col.id === "customerCode" ||
                            col.id === "moTa2_vi" ||
                            col.id === "moTa2_en" ||
                            col.id === "moTa2_ko" ||
                            col.id === "inventory" ||
                            col.id === "assetPrepaid" ||
                            col.id === "contractNumber" ||
                            col.id === "bankName" ||
                            col.id === "managementCode" ||
                            col.id === "managementCode2" ||
                            col.id === "noteCode" ||
                            col.id === "noteCode2" ? (
                            <input
                              type="text"
                              placeholder={`Nhập ${col.displayName}`}
                              onChange={(e) => {
                                const newRow = columns.reduce<Record<string, string>>((acc, c) => {
                                  acc[c.id] = c.id === col.id ? e.target.value : ""
                                  return acc
                                }, {})
                                setDetails([newRow])
                              }}
                              className="w-full border-none focus:outline-none text-[13px]"
                            />
                          ) : null}
                        </td>
                      ))}
                  </tr>
                )}
                {details.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50">
                    {columns
                      .filter((c) => c.visible)
                      .map((col) => (
                        <td
                          key={col.id}
                          className="px-3 py-2 border border-gray-300 bg-white text-[13px]"
                          style={{ width: `${col.width}px`, minWidth: `${col.width}px`, ...getCellColumnStyle(col) }}
                        >
                          {col.id === "customerName" ? (
                            <input
                              type="text"
                              value={row[col.id] || ""}
                              placeholder={`Nhập ${col.displayName}`}
                              onClick={() => handleOpenCustomerPopup(idx)}
                              readOnly // Trường này chỉ dùng để hiển thị và mở popup, không nhập trực tiếp
                              className="w-full border-none focus:outline-none text-[13px] cursor-pointer "
                            />
                          ) : col.id === "costObject" || col.id === "costObject2" ? (
                            <input
                              type="text"
                              value={row[col.id] || ""}
                              placeholder={`Chọn ${col.displayName}`}
                              onClick={() => handleOpenCostObjectPopup(idx, col.id)}
                              readOnly
                              className="w-full border-none focus:outline-none text-[13px] cursor-pointer "
                            />
                          ) : col.id === "country" ? (
                            <select
                              value={row[col.id] || ""}
                              onChange={(e) => {
                                const updatedDetails = [...details]
                                updatedDetails[idx][col.id] = e.target.value
                                setDetails(updatedDetails)
                              }}
                              className="w-full border-none focus:outline-none text-[13px]"
                            >
                              <option value="">Chọn quốc gia...</option>
                              {countryListWithSymbols.map((country) => (
                                <option key={country.code} value={country.name}>
                                  {country.name} {country.symbol}
                                </option>
                              ))}
                            </select>
                          ) : col.id === "debit" || col.id === "credit" ? (
                            <input
                              type="text"
                              value={row[col.id] || ""}
                              placeholder={`Chọn ${col.displayName}`}
                              onClick={() => handleOpenDebitCreditPopup(idx, col.id)}
                              readOnly
                              className="w-full border-none focus:outline-none text-[13px] cursor-pointer"
                            />
                          ) : col.id === "amount" ||
                            col.id === "amountFC" ||
                            col.id === "exchangeRate" ||
                            col.id === "vatTax" ? (
                            <input
                              type="number"
                              value={row[col.id] || ""}
                              onChange={(e) => {
                                const updatedDetails = [...details]
                                updatedDetails[idx][col.id] = e.target.value
                                setDetails(updatedDetails)
                              }}
                              className="w-full border-none focus:outline-none text-[13px]"
                              min="0"
                            />
                          ) : col.id === "customerCode" ||
                            col.id === "moTa2_vi" ||
                            col.id === "moTa2_en" ||
                            col.id === "moTa2_ko" ||
                            col.id === "inventory" ||
                            col.id === "assetPrepaid" ||
                            col.id === "contractNumber" ||
                            col.id === "bankName" ||
                            col.id === "managementCode" ||
                            col.id === "managementCode2" ||
                            col.id === "noteCode" ||
                            col.id === "noteCode2" ? (
                            <input
                              type="text"
                              value={row[col.id] || ""}
                              onChange={(e) => {
                                console.log(`Typing in ${col.displayName}:`, e.target.value) // Log để kiểm tra nhập liệu
                                const updatedDetails = [...details]
                                updatedDetails[idx][col.id] = e.target.value
                                setDetails(updatedDetails)
                              }}
                              className="w-full border-none focus:outline-none text-[13px]"
                            />
                          ) : null}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-red-600 rounded-lg bg-red-600 text-white text-[13px] hover:bg-red-700 hover:border-red-700 transition-colors"
              title="Lưu phiếu thu"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Lưu phiếu thu</span>
            </button>
          </div>
        </div>

        {/* Popup chọn khách hàng */}
        {showCustomerPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-11/12 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Chọn khách hàng</h3>
                  <button
                    onClick={() => setShowCustomerPopup(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Search toolbar */}
              <div className="">
                {/* Sử dụng TableToolbar cho search */}
                <TableToolbar
                  searchTerm={customerSearchTerm}
                  onSearch={setCustomerSearchTerm}
                  isRefreshing={false}
                  onRefresh={async () => {}}
                  onSettings={() => {}}
                  selectedCount={0}
                />
              </div>
              <div className="p-6 pt-0 overflow-y-auto max-h-[40vh]">
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-[#f5f5f5]">
                      <tr>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Tên khách hàng
                        </th>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Mã khách hàng
                        </th>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Quốc gia
                        </th>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Tên ngân hàng
                        </th>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Mã số quản lý
                        </th>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedCustomerList.map((customer: any) => (
                        <tr key={customer.id} className="hover:bg-blue-50">
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">{customer.customerName}</td>
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">{customer.customerCode}</td>
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">{customer.country}</td>
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">{customer.bankName}</td>
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">{customer.managementCode}</td>
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">
                            <button
                              onClick={() => handleSelectCustomer(customer)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-[13px]"
                            >
                              Chọn
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Pagination dưới bảng */}
              <div className="">
                <Pagination
                  currentPage={customerPage}
                  totalPages={customerTotalPages}
                  totalItems={filteredCustomerList.length}
                  itemsPerPage={customerItemsPerPage}
                  onPageChange={setCustomerPage}
                  onItemsPerPageChange={setCustomerItemsPerPage}
                  startIndex={customerStartIndex}
                  endIndex={customerEndIndex}
                />
              </div>
            </div>
          </div>
        )}

        {/* Popup chọn Đối tượng tập hợp chi phí */}
        {showCostObjectPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-11/12 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Chọn Đối tượng tập hợp chi phí</h3>
                  <button
                    onClick={() => setShowCostObjectPopup(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {/* Search toolbar */}
              <div className="">
                <TableToolbar
                  searchTerm={costObjectSearchTerm}
                  onSearch={setCostObjectSearchTerm}
                  isRefreshing={false}
                  onRefresh={async () => {}}
                  onSettings={() => {}}
                  selectedCount={0}
                />
              </div>
              <div className="p-6 pt-0 overflow-y-auto max-h-[40vh]">
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-[#f5f5f5]">
                      <tr>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Mã Đối tượng tập hợp chi phí
                        </th>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Tên Đối tượng tập hợp chi phí
                        </th>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedCostObjectList.map((costObject: any) => (
                        <tr key={costObject.id} className="hover:bg-blue-50">
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">{costObject.code}</td>
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">{costObject.name}</td>
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">
                            <button
                              onClick={() => handleSelectCostObject(costObject)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-[13px]"
                            >
                              Chọn
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Pagination dưới bảng */}
              <div className="">
                <Pagination
                  currentPage={costObjectPage}
                  totalPages={costObjectTotalPages}
                  totalItems={filteredCostObjectList.length}
                  itemsPerPage={costObjectItemsPerPage}
                  onPageChange={setCostObjectPage}
                  onItemsPerPageChange={setCostObjectItemsPerPage}
                  startIndex={costObjectStartIndex}
                  endIndex={costObjectEndIndex}
                />
              </div>
            </div>
          </div>
        )}

        {showDebitCreditPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-11/12 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Chọn {currentDebitCreditField === "debit" ? "Tài khoản Nợ" : "Tài khoản Có"}
                  </h3>
                  <button
                    onClick={() => setShowDebitCreditPopup(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="">
                <TableToolbar
                  searchTerm={debitCreditSearchTerm}
                  onSearch={setDebitCreditSearchTerm}
                  isRefreshing={false}
                  onRefresh={async () => {}}
                  onSettings={() => {}}
                  selectedCount={0}
                />
              </div>
              <div className="p-6 pt-0 overflow-y-auto max-h-[40vh]">
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-[#f5f5f5]">
                      <tr>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Số
                        </th>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Mô tả
                        </th>
                        <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                          Hành động
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedDebitCreditList.map((account: any) => (
                        <tr key={account.id} className="hover:bg-blue-50">
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">{account.code}</td>
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">{account.name}</td>
                          <td className="px-3 py-2 text-[13px] border-b border-gray-300">
                            <button
                              onClick={() => handleSelectDebitCredit(account)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-[13px]"
                            >
                              Chọn
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="">
                <Pagination
                  currentPage={debitCreditPage}
                  totalPages={debitCreditTotalPages}
                  totalItems={filteredDebitCreditList.length}
                  itemsPerPage={debitCreditItemsPerPage}
                  onPageChange={setDebitCreditPage}
                  onItemsPerPageChange={setDebitCreditItemsPerPage}
                  startIndex={debitCreditStartIndex}
                  endIndex={debitCreditEndIndex}
                />
              </div>
            </div>
          </div>
        )}

        {/* Popup thanh toán chứng từ */}
        {showPaymentPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-11/12 max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Thanh toán chứng từ</h3>
                  <button
                    onClick={() => setShowPaymentPopup(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[80vh]">
                {/* Phần trên - Bộ lọc */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Khách hàng */}
                    <div>
                      <label className="block text-[13px] font-medium text-gray-700 mb-1">
                        Khách hàng <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedCustomer}
                        onChange={(e) => {
                          setSelectedCustomer(e.target.value)
                          setSearchErrors((prev) => ({ ...prev, selectedCustomer: "" }))
                        }}
                        className={`w-full border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500 ${searchErrors.selectedCustomer ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                      >
                        <option value="">Tìm kiếm khách hàng...</option>
                        {customerList.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.customerName}
                          </option>
                        ))}
                      </select>
                      {searchErrors.selectedCustomer && (
                        <div className="text-red-500 text-xs mt-1">{searchErrors.selectedCustomer}</div>
                      )}
                    </div>

                    {/* Loại tiền */}
                    <div className="flex flex-col">
                      <label className="mb-2 font-semibold text-gray-700 text-[13px]">
                        Loại tiền <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-6 flex-wrap">
                        {/* Checkbox VND */}
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="currency"
                            value="VND"
                            checked={selectedCurrency === "VND"}
                            onChange={() => {
                              setSelectedCurrency("VND")
                              setSearchErrors((prev) => ({ ...prev, selectedCurrency: "" }))
                            }}
                            className={`w-4 h-4 accent-blue-600 ${searchErrors.selectedCurrency ? "border-red-500" : ""}`}
                          />
                          <span className="text-[13px]">VND</span>
                        </label>
                        {/* Checkbox USD hoặc ngoại tệ */}
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="currency"
                            value="USD"
                            checked={
                              selectedCurrency === "USD" || ["KRW", "SGD", "CNY", "THB"].includes(selectedCurrency)
                            }
                            onChange={() => {
                              setSelectedCurrency("USD")
                              setSelectedOtherCurrency("")
                              setSearchErrors((prev) => ({ ...prev, selectedCurrency: "" }))
                            }}
                            className={`w-4 h-4 accent-blue-600 ${searchErrors.selectedCurrency ? "border-red-500" : ""}`}
                          />
                          <span className="text-[13px]">
                            {["KRW", "SGD", "CNY", "THB"].includes(selectedCurrency) ? selectedCurrency : "USD"}
                          </span>
                          {(selectedCurrency === "USD" || ["KRW", "SGD", "CNY", "THB"].includes(selectedCurrency)) && (
                            <select
                              value={selectedOtherCurrency}
                              onChange={(e) => {
                                const val = e.target.value
                                setSelectedOtherCurrency(val)
                                if (val) {
                                  setSelectedCurrency(val) // Đổi selectedCurrency thành loại ngoại tệ đã chọn
                                } else {
                                  setSelectedCurrency("USD") // Nếu chọn lại rỗng thì về USD
                                }
                              }}
                              className="ml-2 border border-gray-300 rounded px-2 py-1 text-[13px] bg-white w-[120px] focus:outline-none focus:border-blue-500"
                            >
                              <option value="">Chọn loại ngoại tệ</option>
                              <option value="KRW">KRW 🇰🇷</option>
                              <option value="SGD">SGD 🇸🇬</option>
                              <option value="CNY">CNY 🇨🇳</option>
                              <option value="THB">THB 🇹🇭</option>
                            </select>
                          )}
                        </label>
                        {/* Checkbox Cả hai */}
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="currency"
                            value="BOTH"
                            checked={selectedCurrency === "BOTH"}
                            onChange={() => {
                              setSelectedCurrency("BOTH")
                              setSearchErrors((prev) => ({ ...prev, selectedCurrency: "" }))
                              setSelectedOtherCurrency("")
                            }}
                            className={`w-4 h-4 accent-blue-600 ${searchErrors.selectedCurrency ? "border-red-500" : ""}`}
                          />
                          <span className="text-[13px]">
                            {selectedCurrency === "BOTH" && selectedOtherCurrency
                              ? `Cả hai (VND & ${selectedOtherCurrency})`
                              : "Cả hai (VND & USD)"}
                          </span>
                          {selectedCurrency === "BOTH" && (
                            <select
                              value={selectedOtherCurrency}
                              onChange={(e) => setSelectedOtherCurrency(e.target.value)}
                              className="ml-2 border border-gray-300 rounded px-2 py-1 text-[13px] bg-white w-[120px] focus:outline-none focus:border-blue-500"
                            >
                              <option value="">Chọn loại ngoại tệ</option>
                              <option value="KRW">KRW 🇰🇷</option>
                              <option value="SGD">SGD 🇸🇬</option>
                              <option value="CNY">CNY 🇨🇳</option>
                              <option value="THB">THB 🇹🇭</option>
                            </select>
                          )}
                        </label>
                      </div>
                      {searchErrors.selectedCurrency && (
                        <div className="text-red-500 text-xs mt-1">{searchErrors.selectedCurrency}</div>
                      )}
                    </div>

                    {/* Ngày giao dịch */}
                    <div>
                      <label className="block text-[13px] font-medium text-gray-700 mb-1">
                        Từ ngày <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value)
                          setSearchErrors((prev) => ({ ...prev, startDate: "" }))
                        }}
                        className={`w-full border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500 ${searchErrors.startDate ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                      />
                      {searchErrors.startDate && (
                        <div className="text-red-500 text-xs mt-1">{searchErrors.startDate}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-gray-700 mb-1">
                        Đến ngày <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value)
                          setSearchErrors((prev) => ({ ...prev, endDate: "" }))
                        }}
                        className={`w-full border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500 ${searchErrors.endDate ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                      />
                      {searchErrors.endDate && <div className="text-red-500 text-xs mt-1">{searchErrors.endDate}</div>}
                    </div>
                  </div>

                  {/* Button tìm kiếm chuẩn hóa UI/UX */}
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={handleSearch}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg border border-red-600 bg-red-600 text-white text-[13px] font-[Noto Sans] font-semibold shadow hover:bg-red-700 hover:border-red-700 transition-colors"
                      type="button"
                    >
                      {/* Icon tìm kiếm dùng lucide-react */}
                      <Search className="w-4 h-4" />
                      <span>Tìm kiếm</span>
                    </button>
                  </div>
                </div>

                {/* Phần dưới - Chọn khách hàng */}
                {/* Luôn hiển thị bảng chứng từ công nợ của ... */}
                <div className="mb-6">
                  <h4 className="text-[14px] font-semibold mb-3">
                    Chứng từ công nợ của {selectedPaymentCustomer ? selectedPaymentCustomer.customerName : "..."}
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead className="bg-[#f5f5f5]">
                        <tr>
                          <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                            <input
                              type="checkbox"
                              checked={
                                customerDebts.length > 0 &&
                                selectedDebtIds.length ===
                                  customerDebts.filter((debt) => !hideDebt || debt.soTienConLai > 0).length
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDebtIds(
                                    customerDebts
                                      .filter((debt) => !hideDebt || debt.soTienConLai > 0)
                                      .map((debt) => debt.id),
                                  )
                                } else {
                                  setSelectedDebtIds([])
                                }
                              }}
                              className="w-4 h-4"
                              disabled={customerDebts.length === 0}
                            />
                          </th>
                          <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                            Số chứng từ
                          </th>
                          <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                            Ngày giao dịch
                          </th>
                          <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                            Số hóa đơn
                          </th>
                          <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                            Ngày hóa đơn
                          </th>
                          <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                            Mô tả
                          </th>
                          <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                            Hạn thanh toán
                          </th>
                          <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                            Số tiền
                          </th>
                          <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                            Số tiền còn lại
                          </th>
                          <th className="px-3 py-2 text-left text-[13px] font-semibold text-[#212121] border-b border-gray-300">
                            Số tiền trả
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Nếu chưa có khách hàng hoặc chưa search, luôn show 1 dòng trống */}
                        {selectedPaymentCustomer === null || customerDebts.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="text-center text-gray-400 py-6">
                              {/* Dòng trống */}
                            </td>
                          </tr>
                        ) : (
                          customerDebts
                            .filter((debt) => !hideDebt || debt.soTienConLai > 0)
                            .map((debt) => (
                              <tr key={debt.id} className="hover:bg-blue-50">
                                <td className="px-3 py-2 text-[13px] border-b border-gray-300">
                                  <input
                                    type="checkbox"
                                    checked={selectedDebtIds.includes(debt.id)}
                                    onChange={() => handleSelectDebt(debt.id)}
                                    className="w-4 h-4"
                                  />
                                </td>
                                <td className="px-3 py-2 text-[13px] border-b border-gray-300">{debt.soChungTu}</td>
                                <td className="px-3 py-2 text-[13px] border-b border-gray-300">{debt.ngayGiaoDich}</td>
                                <td className="px-3 py-2 text-[13px] border-b border-gray-300">{debt.soHoaDon}</td>
                                <td className="px-3 py-2 text-[13px] border-b border-gray-300">{debt.ngayHoaDon}</td>
                                <td className="px-3 py-2 text-[13px] border-b border-gray-300">{debt.moTa}</td>
                                <td className="px-3 py-2 text-[13px] border-b border-gray-300">{debt.hanThanhToan}</td>
                                <td className="px-3 py-2 text-[13px] border-b border-gray-300">
                                  {debt.soTien.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-[13px] border-b border-gray-300">
                                  {debt.soTienConLai.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 text-[13px] border-b border-gray-300">
                                  <input
                                    type="number"
                                    value={debt.soTienTra}
                                    onChange={(e) => {
                                      const updatedDebts = customerDebts.map((d) =>
                                        d.id === debt.id ? { ...d, soTienTra: Number(e.target.value) } : d,
                                      )
                                      setCustomerDebts(updatedDebts)
                                    }}
                                    className="w-full border rounded px-2 py-1 text-[13px]"
                                    min="0"
                                    max={debt.soTienConLai}
                                  />
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setHideDebt(!hideDebt)}
                      className={`px-4 py-2 rounded-lg text-[13px] font-[Noto Sans] border border-[#ccc] bg-white text-[#666] transition-colors hover:text-red-600 hover:border-red-600 ${hideDebt ? "bg-blue-600 border-blue-600 text-white" : ""}`}
                    >
                      {hideDebt ? "Hiện tất cả" : "Ẩn công nợ"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPaymentPopup(false)}
                      className="px-4 py-2 rounded-lg text-[13px] font-[Noto Sans] border border-[#ccc] bg-white text-[#666] transition-colors hover:bg-gray-300 hover:border-gray-300 hover:text-gray-500"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handlePayment}
                      disabled={selectedDebtIds.length === 0}
                      className={`px-4 py-2 rounded-lg text-[13px] font-[Noto Sans] border border-[#ccc] bg-white text-[#666] transition-colors hover:bg-red-600 hover:border-red-600 hover:text-white ${selectedDebtIds.length > 0 ? "" : "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300 hover:bg-gray-300 hover:border-gray-300 hover:text-gray-500"}`}
                    >
                      Thanh toán
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
