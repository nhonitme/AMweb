"use client"

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react"
import * as XLSX from "xlsx"
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowLeft,
  ArrowRight,
  Play,
  FileText,
  AlertTriangle,
  Loader2,
} from "lucide-react"

interface ExcelImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: any[], method: "add" | "update" | "overwrite") => void
  existingData?: any[] // Thêm prop để truyền dữ liệu hiện có
}

interface ColumnMapping {
  softwareColumn: string
  excelColumn: string
  required: boolean
  description: string
}

interface ValidationResult {
  rowIndex: number
  isValid: boolean
  errors: string[]
  data: Record<string, any>
}

interface ExcelData {
  [key: string]: any
}

const COLUMN_MAPPINGS: ColumnMapping[] = [
  { softwareColumn: "bankName", excelColumn: "", required: true, description: "Tên ngân hàng (bắt buộc)" },
  {
    softwareColumn: "bankCode",
    excelColumn: "",
    required: true,
    description: "Mã ngân hàng (bắt buộc, chọn từ danh sách)",
  },
  { softwareColumn: "province", excelColumn: "", required: true, description: "Tỉnh (bắt buộc, chọn từ danh sách)" },
  { softwareColumn: "branch", excelColumn: "", required: true, description: "Chi Nhánh (bắt buộc, chọn từ danh sách)" },
  { softwareColumn: "accountNumber", excelColumn: "", required: false, description: "Số tài khoản (tùy chọn)" },
  {
    softwareColumn: "accountName",
    excelColumn: "",
    required: false,
    description: "Tên tài khoản ngân hàng (tùy chọn)",
  },
  {
    softwareColumn: "currencyType",
    excelColumn: "",
    required: false,
    description: "Loại Tiền (tùy chọn, chọn từ danh sách)",
  },
  { softwareColumn: "notes", excelColumn: "", required: false, description: "Ghi chú (tùy chọn)" },
]

// Các lựa chọn cho dropdowns (phải giống với BankManagementPage)
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

export default function BankExcelImportModal({ isOpen, onClose, onImport, existingData = [] }: ExcelImportModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedSheet, setSelectedSheet] = useState("")
  const [headerRow, setHeaderRow] = useState(1)
  const [importMethod, setImportMethod] = useState<"add" | "update" | "overwrite">("add")
  const [availableSheets, setAvailableSheets] = useState<string[]>([])
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>(COLUMN_MAPPINGS)
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  const [filterType, setFilterType] = useState<"all" | "valid" | "invalid">("all")
  const [isLoading, setIsLoading] = useState(false)
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
  const [excelData, setExcelData] = useState<ExcelData[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tạo map của các ID hiện có để validation
  const existingBankCodesAndNames = useMemo(() => {
    return new Set(existingData.map((item) => `${item.bankCode}-${item.bankName}`))
  }, [existingData])

  // Memoized filtered results
  const getFilteredResults = useMemo(() => {
    switch (filterType) {
      case "valid":
        return validationResults.filter((r) => r.isValid)
      case "invalid":
        return validationResults.filter((r) => !r.isValid)
      default:
        return validationResults
    }
  }, [validationResults, filterType])

  const validCount = useMemo(() => validationResults.filter((r) => r.isValid).length, [validationResults])
  const invalidCount = useMemo(() => validationResults.filter((r) => !r.isValid).length, [validationResults])

  // Reset state when modal closes
  const resetState = useCallback(() => {
    setCurrentStep(1)
    setSelectedFile(null)
    setSelectedSheet("")
    setHeaderRow(1)
    setImportMethod("add")
    setAvailableSheets([])
    setAvailableColumns([])
    setColumnMappings(COLUMN_MAPPINGS)
    setValidationResults([])
    setSelectedRows([])
    setFilterType("all")
    setIsLoading(false)
    setWorkbook(null)
    setExcelData([])
  }, [])

  // Auto-map columns when available columns change
  const autoMapColumns = useCallback((columns: string[]) => {
    setColumnMappings((prev) => {
      const newMappings = [...prev]

      // Auto-map based on common names first, then by order
      const commonNameMap: { [key: string]: string } = {
        "tên ngân hàng": "bankName",
        "mã ngân hàng": "bankCode",
        tỉnh: "province",
        "chi nhánh": "branch",
        "số tài khoản": "accountNumber",
        "tên tài khoản ngân hàng": "accountName",
        "loại tiền": "currencyType",
        "ghi chú": "notes",
      }

      const mappedSoftwareColumns = new Set()

      newMappings.forEach((mapping, index) => {
        const matchingExcelColumn = columns.find((col) => commonNameMap[col.toLowerCase()] === mapping.softwareColumn)
        if (matchingExcelColumn && !mappedSoftwareColumns.has(mapping.softwareColumn)) {
          newMappings[index] = { ...newMappings[index], excelColumn: matchingExcelColumn }
          mappedSoftwareColumns.add(mapping.softwareColumn)
        } else {
          // If not found by common name, try sequential mapping for unmapped ones
          const availableExcelColumns = columns.filter((col) => !newMappings.some((m) => m.excelColumn === col))
          if (availableExcelColumns.length > 0 && !newMappings[index].excelColumn) {
            newMappings[index] = { ...newMappings[index], excelColumn: availableExcelColumns[0] }
          }
        }
      })
      return newMappings
    })
  }, [])

  const loadColumnsFromSheet = useCallback(
    (wb: XLSX.WorkBook, sheetName: string, headerRowNum: number) => {
      try {
        const worksheet = wb.Sheets[sheetName]
        if (!worksheet) return

        // Convert sheet to JSON to get headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          range: headerRowNum - 1, // Convert to 0-based index
        }) as any[][]

        if (jsonData.length > 0) {
          const headers = jsonData[0]
            .filter((header: any) => header !== undefined && header !== null && header !== "")
            .map((header: any) => String(header).trim())

          setAvailableColumns(headers)

          // Check if the first column is "ID" and adjust auto-mapping
          if (headers.length > 0 && headers[0].toLowerCase() === "id") {
            autoMapColumns(headers.slice(1)) // Start mapping from the second column
          } else {
            autoMapColumns(headers) // Map all columns
          }
        }
      } catch (error) {
        console.error("Error loading columns:", error)
        setAvailableColumns([])
      }
    },
    [autoMapColumns],
  )

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setIsLoading(true)
      try {
        setSelectedFile(file)

        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer()
        const wb = XLSX.read(arrayBuffer, { type: "array" })

        setWorkbook(wb)
        setAvailableSheets(wb.SheetNames)
        setSelectedSheet(wb.SheetNames[0] || "")

        // Auto-load columns from first sheet
        if (wb.SheetNames.length > 0) {
          loadColumnsFromSheet(wb, wb.SheetNames[0], headerRow)
        }
      } catch (error) {
        console.error("Error reading Excel file:", error)
        alert("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại file.")
      } finally {
        setIsLoading(false)
      }
    },
    [headerRow, loadColumnsFromSheet],
  )

  const handleSheetChange = useCallback(
    (sheetName: string) => {
      setSelectedSheet(sheetName)
      if (workbook && sheetName) {
        loadColumnsFromSheet(workbook, sheetName, headerRow)
      }
    },
    [workbook, headerRow, loadColumnsFromSheet],
  )

  const handleHeaderRowChange = useCallback(
    (newHeaderRow: number) => {
      setHeaderRow(newHeaderRow)
      if (workbook && selectedSheet) {
        loadColumnsFromSheet(workbook, selectedSheet, newHeaderRow)
      }
    },
    [workbook, selectedSheet, loadColumnsFromSheet],
  )

  const handleDownloadTemplate = useCallback(() => {
    const headers = [
      "Tên ngân hàng*",
      "Mã ngân hàng*",
      "Tỉnh*",
      "Chi nhánh*",
      "Số tài khoản",
      "Tên tài khoản ngân hàng",
      "Loại tiền",
      "Ghi chú",
    ]
    const sampleData = [
      [
        "Ngân hàng Á Châu",
        "ACB",
        "Hồ Chí Minh",
        "Chi nhánh Quận 1",
        "123456789",
        "CTY TNHH ABC",
        "VND",
        "Tài khoản chính",
      ],
      [
        "Ngân hàng Ngoại Thương",
        "VCB",
        "Hà Nội",
        "Chi nhánh Hoàn Kiếm",
        "987654321",
        "CTY XYZ",
        "USD",
        "Tài khoản USD",
      ],
      ["Ngân hàng Công Thương", "CTG", "Đà Nẵng", "Chi nhánh Sông Hàn", "112233445", "Dự án A", "VND", ""],
    ]

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData])

    // Set column widths
    ws["!cols"] = [
      { width: 25 }, // Tên ngân hàng
      { width: 15 }, // Mã ngân hàng
      { width: 20 }, // Tỉnh
      { width: 25 }, // Chi nhánh
      { width: 20 }, // Số tài khoản
      { width: 30 }, // Tên tài khoản ngân hàng
      { width: 15 }, // Loại tiền
      { width: 40 }, // Ghi chú
    ]

    // Add instructions sheet
    const instructionsData = [
      ["HƯỚNG DẪN NHẬP DỮ LIỆU"],
      [""],
      ["Các cột có dấu '*' là bắt buộc."],
      ["Các cột 'Mã ngân hàng', 'Tỉnh', 'Chi nhánh', 'Loại tiền' phải chọn từ danh sách đã định nghĩa trong hệ thống."],
      ["Vui lòng kiểm tra các giá trị hợp lệ trước khi nhập."],
    ]

    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData)
    instructionsWs["!cols"] = [{ width: 80 }]

    XLSX.utils.book_append_sheet(wb, ws, "Dữ liệu mẫu")
    XLSX.utils.book_append_sheet(wb, instructionsWs, "Hướng dẫn")
    XLSX.writeFile(wb, "mau-quan-ly-ngan-hang.xlsx")
  }, [])

  const handleColumnMappingChange = useCallback((index: number, excelColumn: string) => {
    setColumnMappings((prev) => {
      const newMappings = [...prev]
      newMappings[index] = { ...newMappings[index], excelColumn }
      return newMappings
    })
  }, [])

  const validateMappings = useCallback(() => {
    const requiredMappings = columnMappings.filter((m) => m.required)
    return requiredMappings.every((m) => m.excelColumn.trim() !== "")
  }, [columnMappings])

  const loadDataFromExcel = useCallback(() => {
    if (!workbook || !selectedSheet) {
      console.log("No workbook or sheet selected")
      return []
    }

    try {
      const worksheet = workbook.Sheets[selectedSheet]
      if (!worksheet) {
        console.log("Worksheet not found")
        return []
      }

      // Convert entire sheet to JSON with header row
      const allData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "", // Default value for empty cells
        raw: false, // Convert all values to strings
      }) as any[][]

      if (allData.length <= headerRow) {
        console.log("No data rows found after header")
        return []
      }

      // Get headers from the specified header row
      const headers = allData[headerRow - 1] || []
      console.log("Headers:", headers)

      // Get data rows (starting from headerRow index)
      const dataRows = allData.slice(headerRow)
      console.log("Data rows:", dataRows)

      // Convert data rows to objects
      const processedData = dataRows
        .map((row, index) => {
          const rowData: ExcelData = {}
          let hasData = false

          headers.forEach((header: string, colIndex: number) => {
            if (header && header.trim()) {
              const cellValue = row[colIndex]
              rowData[header.trim()] = cellValue || ""
              if (cellValue && String(cellValue).trim()) {
                hasData = true
              }
            }
          })

          // Only include rows that have at least some data
          return hasData ? rowData : null
        })
        .filter((row) => row !== null) as ExcelData[]

      console.log("Processed data:", processedData)
      return processedData
    } catch (error) {
      console.error("Error loading data from Excel:", error)
      return []
    }
  }, [workbook, selectedSheet, headerRow])

  const validateData = useCallback(
    (data: ExcelData[]): ValidationResult[] => {
      console.log("Validating data:", data)
      console.log("Column mappings:", columnMappings)
      console.log("Existing data for validation:", existingData)
      console.log("Import method:", importMethod)

      return data.map((row, index) => {
        const errors: string[] = []
        const mappedData: Record<string, any> = {}

        // Map Excel columns to software columns
        columnMappings.forEach((mapping) => {
          if (mapping.excelColumn && mapping.excelColumn.trim()) {
            const value = row[mapping.excelColumn]
            mappedData[mapping.softwareColumn] = value || ""

            // Validate required fields
            if (mapping.required && (!value || String(value).trim() === "")) {
              errors.push(`${mapping.description.split("(")[0].trim()} không được để trống`)
            }

            // Specific validations for select fields
            if (mapping.softwareColumn === "bankCode" && value && !BANK_CODES.includes(String(value).trim())) {
              errors.push(`Mã ngân hàng "${value}" không hợp lệ. Vui lòng chọn từ danh sách cho phép.`)
            }
            if (mapping.softwareColumn === "province" && value && !PROVINCES.includes(String(value).trim())) {
              errors.push(`Tỉnh "${value}" không hợp lệ. Vui lòng chọn từ danh sách cho phép.`)
            }
            if (mapping.softwareColumn === "branch" && value && !BRANCHES.includes(String(value).trim())) {
              errors.push(`Chi nhánh "${value}" không hợp lệ. Vui lòng chọn từ danh sách cho phép.`)
            }
            if (mapping.softwareColumn === "currencyType" && value && !CURRENCY_TYPES.includes(String(value).trim())) {
              errors.push(`Loại tiền "${value}" không hợp lệ. Vui lòng chọn từ danh sách cho phép.`)
            }
          } else if (mapping.required) {
            errors.push(`Cột "${mapping.softwareColumn}" chưa được ghép với cột Excel`)
          }
        })

        // Additional validations based on import method
        const bankNameValue = String(mappedData.bankName || "").trim()
        const bankCodeValue = String(mappedData.bankCode || "").trim()
        const uniqueKey = `${bankCodeValue}-${bankNameValue}`

        if (bankNameValue && bankCodeValue) {
          // Check for duplicate bankName/bankCode in the same import
          const duplicateInFile = data.findIndex((otherRow, otherIndex) => {
            if (otherIndex === index) return false
            const otherBankNameMapping = columnMappings.find((m) => m.softwareColumn === "bankName")
            const otherBankCodeMapping = columnMappings.find((m) => m.softwareColumn === "bankCode")
            if (!otherBankNameMapping?.excelColumn || !otherBankCodeMapping?.excelColumn) return false

            const otherBankName = String(otherRow[otherBankNameMapping.excelColumn] || "").trim()
            const otherBankCode = String(otherRow[otherBankCodeMapping.excelColumn] || "").trim()
            return otherBankName === bankNameValue && otherBankCode === bankCodeValue
          })

          if (duplicateInFile !== -1) {
            errors.push(
              `Ngân hàng "${bankNameValue} - ${bankCodeValue}" bị trùng lặp trong file (dòng ${duplicateInFile + headerRow + 1})`,
            )
          }

          // Validation based on import method against existing data
          const existsInSystem = existingBankCodesAndNames.has(uniqueKey)

          if (importMethod === "add") {
            // For ADD method: bank must not exist
            if (existsInSystem) {
              errors.push(
                `Ngân hàng "${bankNameValue} - ${bankCodeValue}" đã tồn tại trong hệ thống. Phương pháp "Thêm mới" chỉ cho phép thêm ngân hàng chưa tồn tại.`,
              )
            }
          } else if (importMethod === "update") {
            // For UPDATE method: bank must exist
            if (!existsInSystem) {
              errors.push(
                `Ngân hàng "${bankNameValue} - ${bankCodeValue}" không tồn tại trong hệ thống. Phương pháp "Cập nhật" chỉ cho phép sửa các ngân hàng đã tồn tại.`,
              )
            } else {
              console.log(`Found existing item for bank "${uniqueKey}": exists`)
            }
          }
          // For 'overwrite' method, no additional validation needed
        } else {
          // If bankName or bankCode is missing (should be caught by required field validation)
          if (importMethod === "update" && (!bankNameValue || !bankCodeValue)) {
            errors.push(
              `Phương pháp "Cập nhật" yêu cầu "Tên ngân hàng" và "Mã ngân hàng" để xác định bản ghi cần cập nhật.`,
            )
          }
        }

        const result = {
          rowIndex: index + headerRow + 1, // +1 because Excel rows are 1-based, +headerRow to account for header
          isValid: errors.length === 0,
          errors,
          data: mappedData,
        }

        // Debug log cho từng dòng khi là phương pháp cập nhật
        if (importMethod === "update") {
          console.log(`Row ${result.rowIndex} (Update method):`, {
            bankName: mappedData.bankName,
            bankCode: mappedData.bankCode,
            exists: existingBankCodesAndNames.has(uniqueKey),
            isValid: result.isValid,
            errors: result.errors,
          })
        }

        return result
      })
    },
    [columnMappings, headerRow, existingBankCodesAndNames, existingData, importMethod],
  )

  const handleNextStep = useCallback(async () => {
    if (currentStep === 1) {
      if (!selectedFile || !selectedSheet) {
        alert("Vui lòng chọn file và sheet!")
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!validateMappings()) {
        alert("Vui lòng ghép đầy đủ các cột bắt buộc!")
        return
      }

      setIsLoading(true)
      try {
        console.log("Loading data from Excel...")
        // Load data from Excel
        const data = loadDataFromExcel()
        console.log("Loaded Excel data:", data)

        if (data.length === 0) {
          alert("Không tìm thấy dữ liệu trong file Excel. Vui lòng kiểm tra lại dòng tiêu đề và dữ liệu.")
          setIsLoading(false)
          return
        }

        setExcelData(data)

        // Validate data
        console.log("Validating data...")
        const results = validateData(data)
        console.log("Validation results:", results)

        setValidationResults(results)
        setSelectedRows(results.filter((r) => r.isValid).map((r) => r.rowIndex))
        setCurrentStep(3)
      } catch (error) {
        console.error("Error processing data:", error)
        alert("Lỗi khi xử lý dữ liệu. Vui lòng kiểm tra lại file và cấu hình.")
      } finally {
        setIsLoading(false)
      }
    }
  }, [currentStep, selectedFile, selectedSheet, validateMappings, loadDataFromExcel, validateData])

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  const handleSelectRows = useCallback(
    (type: "all" | "valid" | "invalid") => {
      setFilterType(type)
      switch (type) {
        case "all":
          setSelectedRows(validationResults.map((r) => r.rowIndex))
          break
        case "valid":
          setSelectedRows(validationResults.filter((r) => r.isValid).map((r) => r.rowIndex))
          break
        case "invalid":
          setSelectedRows(validationResults.filter((r) => !r.isValid).map((r) => r.rowIndex))
          break
      }
    },
    [validationResults],
  )

  const handleRowSelect = useCallback((rowIndex: number, checked: boolean) => {
    setSelectedRows((prev) => (checked ? [...prev, rowIndex] : prev.filter((r) => r !== rowIndex)))
  }, [])

  const handleDownloadErrors = useCallback(() => {
    const errorRows = validationResults.filter((r) => !r.isValid)
    const headers = [
      "Dòng",
      "Lỗi",
      "Tên ngân hàng",
      "Mã ngân hàng",
      "Tỉnh",
      "Chi nhánh",
      "Số tài khoản",
      "Tên tài khoản ngân hàng",
      "Loại tiền",
      "Ghi chú",
    ]
    const errorData = errorRows.map((row) => [
      row.rowIndex.toString(),
      row.errors.join("; "),
      row.data.bankName || "",
      row.data.bankCode || "",
      row.data.province || "",
      row.data.branch || "",
      row.data.accountNumber || "",
      row.data.accountName || "",
      row.data.currencyType || "",
      row.data.notes || "",
    ])

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...errorData])
    XLSX.utils.book_append_sheet(wb, ws, "Lỗi nhập dữ liệu ngân hàng")
    XLSX.writeFile(wb, "loi-nhap-du-lieu-ngan-hang.xlsx")
  }, [validationResults])

  const handleImport = useCallback(() => {
    const selectedData = validationResults
      .filter((r) => selectedRows.includes(r.rowIndex) && r.isValid)
      .map((r) => r.data)

    if (selectedData.length === 0) {
      alert("Không có dữ liệu hợp lệ nào được chọn!")
      return
    }

    console.log("Importing data:", selectedData)
    console.log("Import method:", importMethod)

    // Call the onImport function with the selected data and import method
    onImport(selectedData, importMethod)
    resetState()
    onClose()
    alert(
      `Đã ${importMethod === "add" ? "thêm mới" : importMethod === "update" ? "cập nhật" : "ghi đè"} thành công ${selectedData.length} bản ghi!`,
    )
  }, [validationResults, selectedRows, onImport, importMethod, resetState, onClose])

  const handleClose = useCallback(() => {
    if (currentStep > 1) {
      if (window.confirm("Bạn có chắc chắn muốn hủy quá trình nhập dữ liệu?")) {
        resetState()
        onClose()
      }
    } else {
      resetState()
      onClose()
    }
  }, [currentStep, resetState, onClose])

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      resetState()
    }
  }, [isOpen, resetState])

  // Early return if modal is not open
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="text-blue-600" size={20} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Nhập dữ liệu từ Excel</h3>
              <p className="text-sm text-gray-600">Nhập danh sách ngân hàng từ file Excel</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-100 p-6 text-black">
          <div className="w-full">
            <div className="flex items-center justify-between mb-2 w-full">
              {[1, 2, 3].map((step, idx, arr) => (
                <React.Fragment key={step}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step ? "bg-green-600 text-white" : "bg-white text-gray-400"
                    }`}
                  >
                    {currentStep > step ? <CheckCircle size={16} /> : step}
                  </div>
                  {idx < arr.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 ${currentStep > step ? "bg-green-300" : "bg-gray-300"}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-500 w-full">
              <span className={currentStep >= 1 ? "text-black font-medium" : ""}>Chọn tệp</span>
              <span className={currentStep >= 2 ? "text-black font-medium" : ""}>Ghép dữ liệu</span>
              <span className={currentStep >= 3 ? "text-black font-medium" : ""}>Kiểm tra</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Step 1: File Selection */}
          {currentStep === 1 && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* File Selection */}
                <div className="space-y-4">
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Chọn tệp Excel <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Đang xử lý...</span>
                          </>
                        ) : (
                          <span>Chọn tệp Excel</span>
                        )}
                      </button>
                      <p className="text-sm text-gray-500 mt-2">Hỗ trợ định dạng .xlsx, .xls</p>
                      {selectedFile && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <FileSpreadsheet size={16} className="text-green-600" />
                            <span className="text-sm font-medium text-green-800">{selectedFile.name}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={handleDownloadTemplate}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <Download size={16} />
                      <span>Tải tệp mẫu Excel (có hướng dẫn)</span>
                    </button>
                  </div>
                </div>

                {/* Configuration */}
                <div className="space-y-4">
                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Sheet chứa dữ liệu <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={!selectedFile || isLoading}
                    >
                      <option value="">Chọn sheet</option>
                      {availableSheets.map((sheet) => (
                        <option key={sheet} value={sheet}>
                          {sheet}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-2">
                      Dòng tiêu đề
                      <div className="text-xs text-gray-500 mt-1">Nhập số dòng chứa tiêu đề cột (ví dụ: 1)</div>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={headerRow}
                      onChange={(e) => handleHeaderRowChange(Number.parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={!selectedFile || isLoading}
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-700 mb-3">Phương pháp nhập dữ liệu</label>
                    <div className="space-y-3">
                      <label className="flex items-start">
                        <input
                          type="radio"
                          name="importMethod"
                          value="add"
                          checked={importMethod === "add"}
                          onChange={(e) => setImportMethod(e.target.value as any)}
                          className="text-green-600 focus:ring-green-500 mt-1"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-medium">Thêm mới (không ghi đè dữ liệu cũ)</span>
                          <p className="text-xs text-gray-500 mt-1">
                            Chỉ thêm các ngân hàng chưa tồn tại trong hệ thống
                          </p>
                        </div>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="radio"
                          name="importMethod"
                          value="update"
                          checked={importMethod === "update"}
                          onChange={(e) => setImportMethod(e.target.value as any)}
                          className="text-green-600 focus:ring-green-500 mt-1"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-medium">Cập nhật (chỉ sửa bản ghi đã tồn tại)</span>
                          <p className="text-xs text-gray-500 mt-1">
                            Chỉ cập nhật các ngân hàng đã tồn tại, không thêm ngân hàng mới
                          </p>
                        </div>
                      </label>
                      <label className="flex items-start">
                        <input
                          type="radio"
                          name="importMethod"
                          value="overwrite"
                          checked={importMethod === "overwrite"}
                          onChange={(e) => setImportMethod(e.target.value as any)}
                          className="text-green-600 focus:ring-green-500 mt-1"
                        />
                        <div className="ml-3">
                          <span className="text-sm font-medium">Ghi đè (ghi đè hoặc thêm mới)</span>
                          <p className="text-xs text-gray-500 mt-1">
                            Cập nhật bản ghi nếu đã tồn tại (dựa vào Tên ngân hàng & Mã ngân hàng), thêm mới nếu chưa.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Show available columns preview */}
                  {availableColumns.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Info size={16} className="text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          Các cột được tìm thấy ({availableColumns.length})
                        </span>
                      </div>
                      <div className="text-xs text-blue-800 max-h-20 overflow-y-auto">
                        {availableColumns.join(", ")}
                      </div>
                    </div>
                  )}

                  {/* Show existing data info */}
                  {existingData.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Info size={16} className="text-amber-600" />
                        <span className="text-sm font-medium text-amber-900">Dữ liệu hiện có trong hệ thống</span>
                      </div>
                      <div className="text-xs text-amber-800">
                        <p>
                          Tổng số ngân hàng: <strong>{existingData.length}</strong>
                        </p>
                        <p>
                          Ví dụ mã-tên: {Array.from(existingBankCodesAndNames).slice(0, 5).join(", ")}
                          {existingBankCodesAndNames.size > 5 ? "..." : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {currentStep === 2 && (
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ghép cột dữ liệu</h3>
                <p className="text-sm text-gray-600">
                  Ghép các cột trong phần mềm với các cột trong file Excel của bạn
                </p>
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Đã tự động ghép cột theo tên tương đồng và thứ tự
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg table-fixed">
                  <colgroup>
                    <col style={{ width: "80px" }} />
                    <col style={{ width: "160px" }} />
                    <col style={{ width: "180px" }} />
                    <col style={{ width: "300px" }} />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                        Bắt buộc
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                        Cột trên phần mềm
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                        Cột trên Excel
                      </th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                        Diễn giải
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {columnMappings.map((mapping, index) => (
                      <tr key={mapping.softwareColumn} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-center">
                          {mapping.required ? (
                            <div className="flex items-center justify-center">
                              <AlertCircle size={16} className="text-red-500" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Info size={16} className="text-gray-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900 truncate" title={mapping.softwareColumn}>
                            {mapping.softwareColumn}
                            {mapping.required && <span className="text-red-500 ml-1">*</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={mapping.excelColumn}
                            onChange={(e) => handleColumnMappingChange(index, e.target.value)}
                            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                              mapping.required && !mapping.excelColumn ? "border-red-300 bg-red-50" : "border-gray-300"
                            }`}
                          >
                            <option value="">Chọn cột Excel</option>
                            {availableColumns.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                          {mapping.required && !mapping.excelColumn && (
                            <p className="text-xs text-red-600 mt-1">Cột bắt buộc phải được ghép</p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          <div className="break-words">
                            {mapping.description}
                            {mapping.softwareColumn === "bankCode" && (
                              <div className="mt-1 text-xs text-blue-600">
                                <strong>Giá trị hợp lệ:</strong> {BANK_CODES.join(", ")}
                              </div>
                            )}
                            {mapping.softwareColumn === "province" && (
                              <div className="mt-1 text-xs text-blue-600">
                                <strong>Giá trị hợp lệ:</strong> {PROVINCES.slice(0, 5).join(", ")}...
                              </div>
                            )}
                            {mapping.softwareColumn === "branch" && (
                              <div className="mt-1 text-xs text-blue-600">
                                <strong>Giá trị hợp lệ:</strong> {BRANCHES.slice(0, 5).join(", ")}...
                              </div>
                            )}
                            {mapping.softwareColumn === "currencyType" && (
                              <div className="mt-1 text-xs text-blue-600">
                                <strong>Giá trị hợp lệ:</strong> {CURRENCY_TYPES.join(", ")}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info size={16} className="text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Lưu ý quan trọng về các cột chọn:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        Các cột như "Mã ngân hàng", "Tỉnh", "Chi nhánh", "Loại tiền" phải có giá trị **chính xác** từ
                        danh sách đã định nghĩa trong hệ thống.
                      </li>
                      <li>Hệ thống sẽ kiểm tra xem giá trị nhập có tồn tại trong danh sách cho phép hay không.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Data Validation */}
          {currentStep === 3 && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Kiểm tra dữ liệu</h3>

                {/* Debug info */}
                {process.env.NODE_ENV === "development" && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs">
                    <p>
                      <strong>Debug:</strong> Tổng số dòng validation: {validationResults.length}
                    </p>
                    <p>
                      <strong>Excel data:</strong> {excelData.length} dòng
                    </p>
                    <p>
                      <strong>Import method:</strong> {importMethod}
                    </p>
                  </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle size={20} className="text-green-600" />
                      <div>
                        <p className="text-sm text-green-600">Dòng hợp lệ</p>
                        <p className="text-2xl font-bold text-green-700">{validCount}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle size={20} className="text-red-600" />
                      <div>
                        <p className="text-sm text-red-600">Dòng không hợp lệ</p>
                        <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <FileText size={20} className="text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-600">Đã chọn nhập</p>
                        <p className="text-2xl font-bold text-blue-700">{selectedRows.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleSelectRows("all")}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      onClick={() => handleSelectRows("valid")}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                    >
                      Chọn dòng hợp lệ
                    </button>
                    <button
                      onClick={() => handleSelectRows("invalid")}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                    >
                      Chọn dòng lỗi
                    </button>
                  </div>

                  {invalidCount > 0 && (
                    <button
                      onClick={handleDownloadErrors}
                      className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm"
                    >
                      <Download size={16} />
                      <span>Tải file lỗi</span>
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex space-x-1 mb-4">
                  {[
                    { key: "all", label: "Tất cả", count: validationResults.length },
                    { key: "valid", label: "Hợp lệ", count: validCount },
                    { key: "invalid", label: "Không hợp lệ", count: invalidCount },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilterType(tab.key as any)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        filterType === tab.key
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              {validationResults.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full table-fixed">
                      <colgroup>
                        <col style={{ width: "50px" }} />
                        <col style={{ width: "60px" }} />
                        <col style={{ width: "80px" }} />
                        <col style={{ width: "100px" }} />
                        <col style={{ width: "140px" }} />
                        <col style={{ width: "140px" }} />
                        <col style={{ width: "120px" }} />
                        <col style={{ width: "140px" }} />
                        <col style={{ width: "100px" }} />
                        <col style={{ width: "250px" }} />
                      </colgroup>
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-4 text-left whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={
                                selectedRows.length === getFilteredResults.length && getFilteredResults.length > 0
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRows(getFilteredResults.map((r) => r.rowIndex))
                                } else {
                                  setSelectedRows([])
                                }
                              }}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                            Dòng
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                            Trạng thái
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                            Tên NH
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                            Mã NH
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                            Tỉnh
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                            Chi nhánh
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                            Số TK
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                            Loại tiền
                          </th>
                          <th className="px-4 py-4 text-left text-sm font-medium text-gray-700 whitespace-nowrap">
                            Chi tiết lỗi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getFilteredResults.map((result) => (
                          <tr key={result.rowIndex} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(result.rowIndex)}
                                onChange={(e) => handleRowSelect(result.rowIndex, e.target.checked)}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">{result.rowIndex}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center space-x-2">
                                {result.isValid ? (
                                  <>
                                    <CheckCircle size={16} className="text-green-500" />
                                    <span className="text-sm text-green-700 whitespace-nowrap">
                                      {importMethod === "add"
                                        ? "Thêm mới"
                                        : importMethod === "update"
                                          ? "Cập nhật"
                                          : "Ghi đè"}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle size={16} className="text-red-500" />
                                    <span className="text-sm text-red-700 whitespace-nowrap">Lỗi</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 truncate" title={result.data.bankName || ""}>
                              {result.data.bankName || ""}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 truncate" title={result.data.bankCode || ""}>
                              {result.data.bankCode || ""}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 truncate" title={result.data.province || ""}>
                              {result.data.province || ""}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900 truncate" title={result.data.branch || ""}>
                              {result.data.branch || ""}
                            </td>
                            <td
                              className="px-4 py-4 text-sm text-gray-900 truncate"
                              title={result.data.accountNumber || ""}
                            >
                              {result.data.accountNumber || ""}
                            </td>
                            <td
                              className="px-4 py-4 text-sm text-gray-900 truncate"
                              title={result.data.currencyType || ""}
                            >
                              {result.data.currencyType || ""}
                            </td>
                            <td className="px-4 py-4">
                              {result.errors.length > 0 && (
                                <div className="text-sm text-red-600">
                                  {result.errors.map((error, idx) => (
                                    <div key={idx} className="flex items-start space-x-1 mb-1">
                                      <span className="text-red-500">•</span>
                                      <span className="break-words">{error}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-8 text-center">
                  <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Không có dữ liệu</h3>
                  <p className="text-gray-600">
                    Không tìm thấy dữ liệu để hiển thị. Vui lòng kiểm tra lại file Excel và cấu hình cột.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {currentStep > 1 && (
                <button
                  onClick={handlePrevStep}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span className="hidden sm:block">Quay lại</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleClose}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
                <span className="hidden sm:block">Hủy</span>
              </button>

              {currentStep < 3 ? (
                <button
                  onClick={handleNextStep}
                  disabled={
                    isLoading ||
                    (currentStep === 1 && (!selectedFile || !selectedSheet)) ||
                    (currentStep === 2 && !validateMappings())
                  }
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isLoading ||
                    (currentStep === 1 && (!selectedFile || !selectedSheet)) ||
                    (currentStep === 2 && !validateMappings())
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="hidden sm:block">Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:block">Tiếp tục</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleImport}
                  disabled={
                    selectedRows.filter((r) => validationResults.find((v) => v.rowIndex === r)?.isValid).length === 0
                  }
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play size={16} />
                  <span className="hidden sm:block">
                    {" "}
                    Thực hiện (
                    {selectedRows.filter((r) => validationResults.find((v) => v.rowIndex === r)?.isValid).length})
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
