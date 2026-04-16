"use client"

import { useState, useCallback, useMemo, startTransition, useDeferredValue, useEffect } from "react"
import { X, Printer, FileText, Download, Calendar, Building2, ZoomIn, ZoomOut } from "lucide-react"

interface PrintModalProps {
  isOpen: boolean
  onClose: () => void
  data: any[]
  companyInfo?: {
    name: string
    address: string
    taxCode: string
  }
}

interface PrintLanguage {
  code: "vi" | "en" | "ko"
  name: string
  flag: string
}

interface RowData {
  id: string
  code: string
  nameVi: string
  nameEn: string
  nameKo: string
  notes: string
}

const languages: PrintLanguage[] = [
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
]

const translations = {
  vi: {
    title: "DANH SÁCH ĐỐI TƯỢNG TẬP HỢP CHI PHÍ",
    printDate: "Ngày in",
    columns: {
      stt: "STT",
      code: "Mã đối tượng",
      nameVi: "Tên đối tượng (Tiếng Việt)",
      nameEn: "Tên đối tượng (Tiếng Anh)",
      nameKo: "Tên đối tượng (Tiếng Hàn)",
      notes: "Ghi chú",
    },
    footer: {
      preparedBy: "Người lập biểu",
      accountant: "Kế toán trưởng",
      director: "Giám đốc",
      signature: "(Ký họ tên)",
      date: "Ngày ... tháng ... năm ...",
    },
    summary: "Tổng cộng có {count} đối tượng tập hợp chi phí",
  },
  en: {
    title: "COST CENTER OBJECTS LIST",
    printDate: "Print Date",
    columns: {
      stt: "No.",
      code: "Object Code",
      nameVi: "Object Name (Vietnamese)",
      nameEn: "Object Name (English)",
      nameKo: "Object Name (Korean)",
      notes: "Notes",
    },
    footer: {
      preparedBy: "Prepared by",
      accountant: "Chief Accountant",
      director: "Director",
      signature: "(Signature)",
      date: "Date ... Month ... Year ...",
    },
    summary: "Total: {count} cost center objects",
  },
  ko: {
    title: "비용집계 대상 목록",
    printDate: "인쇄 날짜",
    columns: {
      stt: "번호",
      code: "대상 코드",
      nameVi: "대상명 (베트남어)",
      nameEn: "대상명 (영어)",
      nameKo: "대상명 (한국어)",
      notes: "비고",
    },
    footer: {
      preparedBy: "작성자",
      accountant: "회계 책임자",
      director: "이사",
      signature: "(서명)",
      date: "날짜 ... 월 ... 년 ...",
    },
    summary: "총 {count}개의 비용집계 대상",
  },
}

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
  let timeout: number
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = window.setTimeout(() => func(...args), wait)
  }
}

export default function PrintModal({ isOpen, onClose, data, companyInfo }: PrintModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<PrintLanguage>(languages[0])
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [displayedItems, setDisplayedItems] = useState(50)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Use deferred value for better performance
  const deferredData = useDeferredValue(data)

  // Memoized default company info
  const defaultCompanyInfo = useMemo(
    () => ({
      name: "Công ty TNHH ABC Technology",
      address: "123 Đường ABC, Quận Ba Đình, Hà Nội",
      taxCode: "0123456789",
    }),
    [],
  )

  const company = companyInfo || defaultCompanyInfo
  const t = translations[selectedLanguage.code]

  // Memoized current date
  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString(
        selectedLanguage.code === "vi" ? "vi-VN" : selectedLanguage.code === "en" ? "en-US" : "ko-KR",
      ),
    [selectedLanguage.code],
  )

  // Optimized handlers with useCallback
  const handlePrint = useCallback(() => {
    const printElement = document.getElementById("print-content")
    if (!printElement) {
      console.error("Không tìm thấy #print-content")
      return
    }

    // Tạo iframe ẩn
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    // Lấy tất cả style hiện tại
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join("")

    // Viết HTML vào iframe
    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print</title>
          ${styles}
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
        </body>
      </html>
    `)
    doc.close()

    // Đợi nội dung load rồi in
    iframe.onload = () => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      // Dọn dẹp iframe sau khi in
      setTimeout(() => document.body.removeChild(iframe), 1000)
    }
  }, [])

  const handlePrintAll = useCallback(() => {
    // Đảm bảo có dữ liệu trước khi in
    if (!deferredData || deferredData.length === 0) {
      alert("Không có dữ liệu để in!")
      return
    }

    // Get current translations based on selected language
    const currentTranslations = translations[selectedLanguage.code]
    const currentDate = new Date().toLocaleDateString(
      selectedLanguage.code === "vi" ? "vi-VN" : selectedLanguage.code === "en" ? "en-US" : "ko-KR",
    )

    // Tạo HTML content hoàn chỉnh
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="${selectedLanguage.code}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Print - ${currentTranslations.title}</title>
        <style>
          @page { 
            size: A4 portrait; 
            margin: 15mm; 
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Times New Roman', serif;
            font-size: 13px;
            line-height: 1.3;
            color: black;
            background: white;
          }
          
          .print-content {
            width: 100%;
            padding: 0;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 32px;
            padding-bottom: 16px;
            border-bottom: 2px solid #1f2937;
          }
          
          .print-header h1 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .print-header p {
            font-size: 13px;
            margin-bottom: 4px;
          }
          
          .print-title {
            text-align: center;
            margin-bottom: 24px;
          }
          
          .print-title h2 {
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          
          .title-info {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin-top: 8px;
          }
          
          .print-table {
            margin-bottom: 32px;
            width: 100%;
          }
          
          .print-table table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid black;
          }
          
          .print-th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
            padding: 6px 4px;
            border: 1px solid black;
            font-size: 12px;
            vertical-align: middle;
          }
          
          .print-td {
            padding: 4px;
            border: 1px solid black;
            vertical-align: top;
            font-size: 12px;
          }
          
          .print-td.center {
            text-align: center;
          }
          
          .print-td.bold {
            font-weight: bold;
          }
          
          .print-summary {
            margin-bottom: 24px;
            font-weight: bold;
            font-size: 13px;
          }
          
          .print-footer {
            margin-top: 32px;
            page-break-inside: avoid;
          }
          
          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 32px;
          }
          
          .signature-item {
            text-align: center;
          }
          
          .signature-item .title {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 4px;
          }
          
          .signature-item .date {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
          }
          
          .signature-item .note {
            font-size: 12px;
            color: #666;
            margin-bottom: 64px;
          }
          
          .signature-item .line {
            border-bottom: 2px solid black;
            width: 128px;
            margin: 0 auto;
          }
          
          /* Đảm bảo màu sắc được in */
          * { 
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
        </style>
      </head>
      <body>
        <div class="print-content">
          <!-- Header - Company Info -->
          <div class="print-header">
            <h1>${company.name}</h1>
            <p><strong>Địa chỉ:</strong> ${company.address}</p>
            <p><strong>Mã số thuế:</strong> ${company.taxCode}</p>
          </div>

          <!-- Title -->
          <div class="print-title">
            <h2>${currentTranslations.title}</h2>
            <div class="title-info">
              <span>${currentTranslations.printDate}: ${currentDate}</span>
              <span>Trang: 1</span>
            </div>
          </div>

          <!-- Table -->
          <div class="print-table">
            <table>
              <thead>
                <tr>
                  <th class="print-th" style="width: 40px;">${currentTranslations.columns.stt}</th>
                  <th class="print-th" style="width: 80px;">${currentTranslations.columns.code}</th>
                  <th class="print-th">${currentTranslations.columns.nameVi}</th>
                  <th class="print-th">${currentTranslations.columns.nameEn}</th>
                  <th class="print-th">${currentTranslations.columns.nameKo}</th>
                  <th class="print-th">${currentTranslations.columns.notes}</th>
                </tr>
              </thead>
              <tbody>
                ${deferredData
                  .map(
                    (item, index) => `
                  <tr>
                    <td class="print-td center">${index + 1}</td>
                    <td class="print-td bold">${item.code || ""}</td>
                    <td class="print-td">${item.nameVi || ""}</td>
                    <td class="print-td">${item.nameEn || "-"}</td>
                    <td class="print-td">${item.nameKo || "-"}</td>
                    <td class="print-td">${item.notes || "-"}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <!-- Summary -->
          <div class="print-summary">
            <p>${currentTranslations.summary.replace("{count}", deferredData.length.toString())}</p>
          </div>

          <!-- Footer - Signatures -->
          <div class="print-footer">
            <div class="signature-grid">
              <div class="signature-item">
                <div class="title">${currentTranslations.footer.preparedBy}</div>
                <div class="date">${currentTranslations.footer.date}</div>
                <div class="note">${currentTranslations.footer.signature}</div>
                <div class="line"></div>
              </div>
              <div class="signature-item">
                <div class="title">${currentTranslations.footer.accountant}</div>
                <div class="date">${currentTranslations.footer.date}</div>
                <div class="note">${currentTranslations.footer.signature}</div>
                <div class="line"></div>
              </div>
              <div class="signature-item">
                <div class="title">${currentTranslations.footer.director}</div>
                <div class="date">${currentTranslations.footer.date}</div>
                <div class="note">${currentTranslations.footer.signature}</div>
                <div class="line"></div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

    // Tạo iframe ẩn để in
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.left = "-9999px"
    iframe.style.top = "-9999px"
    iframe.style.width = "1px"
    iframe.style.height = "1px"
    iframe.style.opacity = "0"
    iframe.style.border = "none"

    document.body.appendChild(iframe)

    // Đợi iframe load xong
    iframe.onload = () => {
      const doc = iframe.contentWindow?.document
      if (!doc) {
        console.error("Không thể truy cập document của iframe")
        document.body.removeChild(iframe)
        return
      }

      // Viết HTML vào iframe
      doc.open()
      doc.write(htmlContent)
      doc.close()

      // Đợi một chút để đảm bảo nội dung được render
      setTimeout(() => {
        try {
          // Focus vào iframe và in
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()

          // Dọn dẹp sau khi in
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
          }, 1000)
        } catch (error) {
          console.error("Lỗi khi in:", error)
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe)
          }
        }
      }, 500)
    }

    // Xử lý lỗi nếu iframe không load được
    iframe.onerror = () => {
      console.error("Lỗi khi tải iframe")
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }

    // Đặt src để trigger load event
    iframe.src = "about:blank"
  }, [deferredData, company, selectedLanguage])

  const handleDownloadPDF = useCallback(() => {
    alert(`Đang tải xuống PDF bằng ${selectedLanguage.name}...`)
  }, [selectedLanguage.name])

  // Debounced zoom handlers with startTransition
  const debouncedZoomIn = useMemo(
    () =>
      debounce(() => {
        startTransition(() => {
          setZoomLevel((prev) => Math.min(prev + 10, 150))
        })
      }, 200),
    [],
  )

  const debouncedZoomOut = useMemo(
    () =>
      debounce(() => {
        startTransition(() => {
          setZoomLevel((prev) => Math.max(prev - 10, 50))
        })
      }, 200),
    [],
  )

  const handleZoomIn = useCallback(() => {
    debouncedZoomIn()
  }, [debouncedZoomIn])

  const handleZoomOut = useCallback(() => {
    debouncedZoomOut()
  }, [debouncedZoomOut])

  const handleLanguageChange = useCallback((language: PrintLanguage) => {
    startTransition(() => {
      setSelectedLanguage(language)
    })
  }, [])

  const handlePreviewModeToggle = useCallback(() => {
    startTransition(() => {
      setIsPreviewMode((prev) => !prev)
    })
  }, [])

  const handleLoadMore = useCallback(async () => {
    setIsLoadingMore(true)
    // Simulate loading delay
    await new Promise((resolve) => setTimeout(resolve, 500))
    setDisplayedItems((prev) => Math.min(prev + 50, deferredData.length))
    setIsLoadingMore(false)
  }, [deferredData.length])

  // Memoized PrintContent component
  const PrintContent = useMemo(() => {
    return (
      <div id="print-content" className="print-content bg-white">
        {/* Header - Company Info */}
        <div className="print-header text-center mb-8 pb-4 border-b-2 border-gray-800">
          <h1 className="text-lg font-bold text-gray-900 mb-2 uppercase tracking-wide">{company.name}</h1>
          <p className="text-sm text-gray-700 mb-1">
            <strong>Địa chỉ:</strong> {company.address}
          </p>
          <p className="text-sm text-gray-700">
            <strong>Mã số thuế:</strong> {company.taxCode}
          </p>
        </div>

        {/* Title */}
        <div className="print-title text-center mb-6">
          <h2 className="text-base font-bold text-gray-900 uppercase mb-3 tracking-wider">{t.title}</h2>
          <div className="flex justify-between items-center text-sm text-gray-700">
            <span>
              {t.printDate}: {currentDate}
            </span>
            <span>Trang: 1</span>
          </div>
        </div>

        {/* Table */}
        <div className="print-table mb-8 preview-container">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="print-th border-2 border-gray-800 px-2 py-2 text-center text-xs font-bold bg-gray-100 w-12">
                  {t.columns.stt}
                </th>
                <th className="print-th border-2 border-gray-800 px-2 py-2 text-center text-xs font-bold bg-gray-100 w-24">
                  {t.columns.code}
                </th>
                <th className="print-th border-2 border-gray-800 px-2 py-2 text-center text-xs font-bold bg-gray-100">
                  {t.columns.nameVi}
                </th>
                <th className="print-th border-2 border-gray-800 px-2 py-2 text-center text-xs font-bold bg-gray-100">
                  {t.columns.nameEn}
                </th>
                <th className="print-th border-2 border-gray-800 px-2 py-2 text-center text-xs font-bold bg-gray-100">
                  {t.columns.nameKo}
                </th>
                <th className="print-th border-2 border-gray-800 px-2 py-2 text-center text-xs font-bold bg-gray-100">
                  {t.columns.notes}
                </th>
              </tr>
            </thead>
            <tbody>
              {deferredData.slice(0, displayedItems).map((item, index) => (
                <tr key={item.id || index} className="print-row">
                  <td className="print-td border border-gray-600 px-2 py-1.5 text-center text-xs">{index + 1}</td>
                  <td className="print-td border border-gray-600 px-2 py-1.5 text-xs font-medium">{item.code}</td>
                  <td className="print-td border border-gray-600 px-2 py-1.5 text-xs">{item.nameVi}</td>
                  <td className="print-td border border-gray-600 px-2 py-1.5 text-xs">{item.nameEn || "-"}</td>
                  <td className="print-td border border-gray-600 px-2 py-1.5 text-xs">{item.nameKo || "-"}</td>
                  <td className="print-td border border-gray-600 px-2 py-1.5 text-xs">{item.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="print-summary mb-8">
          <p className="text-sm font-medium text-gray-900">
            {t.summary.replace("{count}", displayedItems.toString())}{" "}
            {displayedItems < deferredData.length ? `(Hiển thị ${displayedItems}/${deferredData.length})` : ""}
          </p>
        </div>

        {/* Footer - Signatures */}
        <div className="print-footer">
          <div className="grid grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <p className="font-bold text-sm mb-1">{t.footer.preparedBy}</p>
              <p className="text-xs text-gray-600 mb-1">{t.footer.date}</p>
              <p className="text-xs text-gray-600 mb-16">{t.footer.signature}</p>
              <div className="border-b-2 border-gray-800 w-32 mx-auto"></div>
            </div>
            <div className="text-center">
              <p className="font-bold text-sm mb-1">{t.footer.accountant}</p>
              <p className="text-xs text-gray-600 mb-1">{t.footer.date}</p>
              <p className="text-xs text-gray-600 mb-16">{t.footer.signature}</p>
              <div className="border-b-2 border-gray-800 w-32 mx-auto"></div>
            </div>
            <div className="text-center">
              <p className="font-bold text-sm mb-1">{t.footer.director}</p>
              <p className="text-xs text-gray-600 mb-1">{t.footer.date}</p>
              <p className="text-xs text-gray-600 mb-16">{t.footer.signature}</p>
              <div className="border-b-2 border-gray-800 w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }, [deferredData, selectedLanguage.code, company, currentDate, t, displayedItems])

  useEffect(() => {
    setDisplayedItems(50)
  }, [deferredData.length])

  if (!isOpen) return null

  if (isPreviewMode) {
    return (
      <div className="fixed inset-0 bg-gray-100 z-50 overflow-auto">
        {/* Preview Header - NO PRINT */}
        <div className="no-print bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">Xem trước bản in</h3>
                <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 hover:bg-white rounded transition-colors"
                    title="Thu nhỏ"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-sm font-medium px-2">{zoomLevel}%</span>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 hover:bg-white rounded transition-colors"
                    title="Phóng to"
                  >
                    <ZoomIn size={16} />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePreviewModeToggle}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <X size={16} />
                  <span>Đóng</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="max-w-4xl mx-auto p-8">
          <div
            className="bg-white shadow-2xl mx-auto print-here"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
              width: "210mm",
              minHeight: "297mm",
              padding: "20mm",
            }}
          >
            {PrintContent}
          </div>
          {/* Load More Button - Only in preview mode */}
          {displayedItems < deferredData.length && (
            <div className="text-center mt-8 no-print">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
              >
                {isLoadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Đang tải...</span>
                  </>
                ) : (
                  <>
                    <span>Tải thêm 50 mục ({deferredData.length - displayedItems} còn lại)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Printer className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">In báo cáo</h3>
                <p className="text-sm text-gray-600">Chọn ngôn ngữ và định dạng in</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Language Selection */}
            <div>
              <label className="block font-medium text-gray-700 mb-3">Chọn ngôn ngữ in</label>
              <div className="grid grid-cols-1 gap-3">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageChange(language)}
                    className={`flex items-center space-x-3 p-4 border-2 rounded-lg transition-all ${
                      selectedLanguage.code === language.code
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl">{language.flag}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">{language.name}</div>
                      <div className="text-sm text-gray-500">
                        {language.code === "vi" && "Báo cáo bằng tiếng Việt"}
                        {language.code === "en" && "Report in English"}
                        {language.code === "ko" && "한국어 보고서"}
                      </div>
                    </div>
                    {selectedLanguage.code === language.code && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Print Options */}
            <div>
              <label className="block font-medium text-gray-700 mb-3">Thông tin báo cáo</label>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText size={20} className="text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">Định dạng</div>
                      <div className="text-sm text-gray-600">A4, Portrait</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar size={20} className="text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">Ngày in</div>
                      <div className="text-sm text-gray-600">{currentDate}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Building2 size={20} className="text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">Công ty</div>
                      <div className="text-sm text-gray-600">{company.name}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FileText size={16} className="text-blue-600" />
                <span className="font-medium text-blue-900">Thông tin báo cáo</span>
              </div>
              <div className="text-sm text-blue-800">
                <p>
                  Số lượng bản ghi: <strong>{deferredData.length}</strong>
                </p>
                <p>
                  Ngôn ngữ: <strong>{selectedLanguage.name}</strong>
                </p>
                <p>
                  Tiêu đề: <strong>{t.title}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="flex items-center px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X size={16} className="text-gray-500" />
               <span class="hidden sm:block ">Hủy</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={handlePreviewModeToggle}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FileText size={16} />
                <span class="hidden sm:block ">Xem trước</span>
              </button>

              <button
                onClick={handleDownloadPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download size={16} />
                <span class="hidden sm:block ">Tải PDF</span>
              </button>

              <button
                onClick={handlePrintAll}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Printer size={16} />
                <span class="hidden sm:block ">In ngay</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles - CHỈ IN PHẦN PRINT-CONTENT */}
      <style jsx global>{`
        /* CSS isolation cho container preview */
        .preview-container {
          contain: layout paint;
          overflow-y: auto;
        }

        @media print {
          /* Ẩn tất cả các thành phần */
          * {
            visibility: hidden !important;
          }
          
          /* Chỉ hiển thị nội dung cần in */
          #print-content,
          #print-content * {
            visibility: visible !important;
          }

          #temp-print-content,
          #temp-print-content * {
            visibility: visible !important;
          }
          
          /* Đặt lại vị trí và kích thước cho nội dung in */
          #print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            font-family: 'Times New Roman', serif !important;
            background: white !important;
          }

          #temp-print-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            font-family: 'Times New Roman', serif !important;
            background: white !important;
          }
          
          /* Thiết lập trang in */
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          
          /* Đảm bảo không có phần tử nào khác hiển thị */
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Styling chi tiết cho bảng in */
          .print-content {
            font-size: 13px !important;
            line-height: 1.3 !important;
            color: black !important;
          }

          #temp-print-content {
            font-size: 11px !important;
            line-height: 1.3 !important;
            color: black !important;
          }
          
          .print-header h1 {
            font-size: 16px !important;
            font-weight: bold !important;
            margin-bottom: 8px !important;
          }
          
          .print-title h2 {
            font-size: 15px !important;
            font-weight: bold !important;
            margin-bottom: 12px !important;
          }
          
          .print-table table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid;
          }
          
          .print-th {
            background-color: #f5f5f5 !important;
            font-weight: bold !important;
            text-align: center !important;
            padding: 4px !important;
            border: 1px solid black !important;
            font-size: 12px !important;
          }
          
          .print-td {
            padding: 3px 4px !important;
            border: 1px solid black !important;
            vertical-align: top !important;
            font-size: 12px !important;
          }
          
          .print-row {
            page-break-inside: avoid;
          }
          
          .print-footer {
            page-break-inside: avoid;
            margin-top: 20px !important;
          }
          
          .print-summary {
            margin-bottom: 20px !important;
            font-weight: bold !important;
          }
          
          /* Đảm bảo màu sắc được in */
          * { 
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Ẩn hoàn toàn các class no-print */
          .no-print {
            display: none !important;
            visibility: hidden !important;
          }
        }
        
        /* Styles cho preview mode */
        .print-content {
          font-family: 'Times New Roman', serif;
          line-height: 1.4;
        }
      `}</style>
    </>
  )
} 
