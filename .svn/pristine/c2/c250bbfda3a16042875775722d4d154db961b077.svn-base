import React, { useCallback, useMemo } from "react"
import { X } from "lucide-react"

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

interface ReceiptPrintModalProps {
  receipt: Receipt
  onClose: () => void
  lang: "vi" | "en" | "ko"
  setLang: (lang: "vi" | "en" | "ko") => void
}

// Hàm chuyển số thành chữ tiếng Việt đơn giản (demo)
function numberToWords(num: number): string {
  if (!num) return "Không đồng"
  // TODO: Có thể dùng thư viện number-to-words-vi nếu cần chuẩn
  return `${num.toLocaleString()} đồng chẵn`
}

// Thông tin công ty mặc định
const defaultCompanyInfo = {
  name: "CÔNG TY TNHH Demo Amnote",
  address: "87 Nguyễn Thị Thập, KĐTM Him Lam, Phường Tân Hưng, TP.HCM",
  taxCode: "0302809615"
}


const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({ receipt, onClose, lang, setLang }) => {
  
  // Memoized current date
  const currentDate = useMemo(
    () => new Date().toLocaleDateString("vi-VN"),
    []
  )

  // Hàm in chuyên nghiệp theo chuẩn PrintModal
  const handlePrintReceipt = useCallback(() => {
    // Tạo HTML content hoàn chỉnh cho in
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Print - Phiếu Thu ${receipt.receiptNo}</title>
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
            text-align: left;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid #1f2937;
          }
          
          .print-header h1 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .print-header p {
            font-size: 13px;
            margin-bottom: 3px;
          }
          
          .print-title {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 16px;
          }
          .print-title-left {
            flex: 1;
          }
          .print-title-center {
            flex: 1;
            text-align: center;
          }
          .print-title-right {
            flex: 1;
            text-align: right;
            font-size: 13px;
            font-weight: 600;
          }
          .print-title h2 {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            color: #d32f2f;
          }
          .print-title .date {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 4px;
          }
          
          .print-info {
            margin-bottom: 16px;
            font-size: 13px;
          }
          
          .print-info div {
            margin-bottom: 3px;
          }
          
          .print-info .label {
            display: inline-block;
            width: 110px;
          }
          
          .print-info .value {
            font-weight: 600;
          }
          
          .print-table {
            margin-bottom: 20px;
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
            font-size: 13px;
            vertical-align: middle;
          }
          
          .print-td {
            padding: 6px 4px;
            border: 1px solid black;
            vertical-align: top;
            font-size: 13px;
          }
          
          .print-td.right {
            text-align: right;
          }
          
          .print-td.bold {
            font-weight: bold;
          }
          
          .print-footer {
            margin-top: 32px;
            page-break-inside: avoid;
          }
          
          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 40px;
          }
          
          .signature-item {
            text-align: center;
          }
          
          .signature-item .title {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 4px;
          }
          
          .signature-item .note {
            font-size: 12px;
            font-style: italic;
            margin-bottom: 60px;
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
            <h1>${defaultCompanyInfo.name}</h1>
            <p><strong>Địa chỉ:</strong> ${defaultCompanyInfo.address}</p>
            <p><strong>M.S.T:</strong> ${defaultCompanyInfo.taxCode}</p>
          </div>

          <!-- Title -->
          <div class="print-title">
            <div class="print-title-left"></div>
            <div class="print-title-center">
              <h2>PHIẾU THU</h2>
              <div class="date">
                ${(() => {
                  // Format ngày dạng 'Ngày DD Tháng MM Năm YYYY' (in hoa chữ đầu)
                  const d = receipt.transactionDate ? new Date(receipt.transactionDate) : new Date();
                  const day = d.getDate();
                  const month = d.getMonth() + 1;
                  const year = d.getFullYear();
                  return `Ngày ${day} Tháng ${month} Năm ${year}`;
                })()}
              </div>
            </div>
            <div class="print-title-right">
              Số chứng từ: <strong>${receipt.receiptNo}</strong>
            </div>
          </div>

          <!-- Receipt Info -->
          <div class="print-info">
            <div><span class="label">Đơn vị:</span> <span class="value">${receipt.customerName || ""}</span></div>
            <div><span class="label">Địa chỉ:</span> <span class="value">${receipt.country || ""}</span></div>
            <div><span class="label">Nội dung:</span> <span class="value">${receipt.description1 || ""}</span></div>
            <div><span class="label">Số tiền:</span> <span class="value">${receipt.amount?.toLocaleString() || "0"} VND</span></div>
            <div><span class="label">Viết bằng chữ:</span> <span class="value" style="font-style: italic;">${numberToWords(receipt.amount)}</span></div>
            <div><span class="label">Kèm theo:</span> ............................................. Chứng từ gốc</div>
          </div>

          <!-- Table -->
          <div class="print-table">
            <table>
              <thead>
                <tr>
                  <th class="print-th">Mô tả</th>
                  <th class="print-th">Nợ</th>
                  <th class="print-th">Có</th>
                  <th class="print-th">Số tiền</th>
                  <th class="print-th">FC Số tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="print-td">${receipt.description1 || ""}</td>
                  <td class="print-td">${receipt.debit || ""}</td>
                  <td class="print-td">${receipt.credit || ""}</td>
                  <td class="print-td right">${receipt.amount?.toLocaleString() || "0"}</td>
                  <td class="print-td right">${receipt.fcAmount?.toLocaleString() || "0"}</td>
                </tr>
                <tr>
                  <td class="print-td bold right" colspan="3">Tổng cộng</td>
                  <td class="print-td bold right">${receipt.amount?.toLocaleString() || "0"}</td>
                  <td class="print-td bold right">${receipt.fcAmount?.toLocaleString() || "0"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Date above signatures -->
          <div style="width:100%;display:flex;justify-content:flex-end;margin-bottom:8px;">
            <div style="font-size:13px;">
              ${(() => {
                // Format ngày dạng 'Ngày DD Tháng MM Năm YYYY' (in hoa chữ đầu)
                const d = receipt.transactionDate ? new Date(receipt.transactionDate) : new Date();
                const day = d.getDate();
                const month = d.getMonth() + 1;
                const year = d.getFullYear();
                return `Ngày ${day} Tháng ${month} Năm ${year}`;
              })()}
            </div>
          </div>
            <!-- Date at the bottom right -->
          <!-- Footer - Signatures -->
          <div class="print-footer">
            <div class="signature-grid">
              <div class="signature-item">
                <div class="title">Người lập biểu</div>
                <div class="note">(Ký, họ tên)</div>
              </div>
              <div class="signature-item">
                <div class="title">Kế toán trưởng</div>
                <div class="note">(Ký, họ tên)</div>
              </div>
              <div class="signature-item">
                <div class="title">Giám đốc</div>
                <div class="note">(Ký, họ tên, đóng dấu)</div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

    // Tạo iframe ẩn để in theo chuẩn PrintModal
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
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          
          // Dọn dẹp iframe sau khi in
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
  }, [receipt, defaultCompanyInfo])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-30 print:bg-transparent print:static">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-[900px] relative print:shadow-none print:p-0 print:rounded-none print:w-auto print:max-w-none print:bg-white flex flex-col max-h-[90vh]">
        {/* Nút đóng */}
        <button
          className="absolute top-2 right-2 p-2 text-gray-500 hover:text-red-600 print:hidden"
          onClick={onClose}
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>
        {/* Nội dung scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Header công ty */}
          <div className="text-left mb-4 border-b border-gray-800 pb-2">
            <div className="text-[16px] font-bold uppercase tracking-wide">{defaultCompanyInfo.name}</div>
            <div className="text-[13px] mt-1">{defaultCompanyInfo.address}</div>
            <div className="text-[13px]">M.S.T : {defaultCompanyInfo.taxCode}</div>
          </div>
          {/* Tiêu đề phiếu - layout 3 phần */}
          <div className="flex flex-row items-start justify-between mt-2 mb-4">
            <div className="flex-1"></div>
            <div className="flex-1 text-center">
              <div className="text-[18px] font-bold uppercase tracking-widest mb-1 text-red-600">PHIẾU THU</div>
              <div className="text-[15px] ">
                {(() => {
                  // Format ngày dạng 'Ngày DD Tháng MM Năm YYYY' (in hoa chữ đầu)
                  const d = receipt.transactionDate ? new Date(receipt.transactionDate) : new Date();
                  const day = d.getDate();
                  const month = d.getMonth() + 1;
                  const year = d.getFullYear();
                  return `Ngày ${day} Tháng ${month} Năm ${year}`;
                })()}
              </div>
            </div>
            <div className="flex-1 text-right">
              <div className="text-[13px] mt-1">Số chứng từ: <span className="font-semibold">{receipt.receiptNo}</span></div>
            </div>
          </div>
          {/* Thông tin chính */}
          <div className="mb-4 text-[13px]">
            <div><span className="inline-block w-28">Đơn vị:</span> <span className="font-semibold">{receipt.customerName}</span></div>
            <div><span className="inline-block w-28">Địa chỉ:</span> <span className="font-semibold">{receipt.country || ""}</span></div>
            <div><span className="inline-block w-28">Nội dung:</span> <span className="font-semibold">{receipt.description1}</span></div>
            <div><span className="inline-block w-28">Số tiền:</span> <span className="font-semibold">{receipt.amount?.toLocaleString()} VND</span></div>
            <div><span className="inline-block w-28">Viết bằng chữ:</span> <span className="italic">{numberToWords(receipt.amount)}</span></div>
            <div><span className="inline-block w-28">Kèm theo:</span> ............................................. Chứng từ gốc</div>
          </div>
          {/* Bảng chi tiết */}
          <div className="mb-4">
            <table className="w-full border border-black text-[13px]">
              <thead>
                <tr className="bg-[#f5f5f5]">
                  <th className="border border-black px-2 py-1 font-semibold">Mô tả</th>
                  <th className="border border-black px-2 py-1 font-semibold">Nợ</th>
                  <th className="border border-black px-2 py-1 font-semibold">Có</th>
                  <th className="border border-black px-2 py-1 font-semibold">Số tiền</th>
                  <th className="border border-black px-2 py-1 font-semibold">FC Số tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-2 py-1">{receipt.description1}</td>
                  <td className="border border-black px-2 py-1">{receipt.debit}</td>
                  <td className="border border-black px-2 py-1">{receipt.credit}</td>
                  <td className="border border-black px-2 py-1 text-right">{receipt.amount?.toLocaleString()}</td>
                  <td className="border border-black px-2 py-1 text-right">{receipt.fcAmount?.toLocaleString() || "0"}</td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-black px-2 py-1 text-right" colSpan={3}>Tổng cộng</td>
                  <td className="border border-black px-2 py-1 text-right">{receipt.amount?.toLocaleString()}</td>
                  <td className="border border-black px-2 py-1 text-right">{receipt.fcAmount?.toLocaleString() || "0"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Ngày tháng bên phải khi in, phía trên khu vực ký tên */}
          <div className="w-full flex justify-end mb-2">
            <div className="text-[13px]">
              {(() => {
                // Format ngày dạng 'Ngày DD Tháng MM Năm YYYY' (in hoa chữ đầu)
                const d = receipt.transactionDate ? new Date(receipt.transactionDate) : new Date();
                const day = d.getDate();
                const month = d.getMonth() + 1;
                const year = d.getFullYear();
                return `Ngày ${day} Tháng ${month} Năm ${year}`;
              })()}
            </div>
          </div>
          {/* Footer ký tên */}
          <div className="grid grid-cols-3 gap-8 mt-8 text-[13px] flex-shrink-0">
            <div className="text-center">
              <div className="font-semibold">Người lập biểu</div>
              <div className="italic text-xs">(Ký, họ tên)</div>
              <div className="mt-12">&nbsp;</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">Kế toán trưởng</div>
              <div className="italic text-xs">(Ký, họ tên)</div>
              <div className="mt-12">&nbsp;</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">Giám đốc</div>
              <div className="italic text-xs">(Ký, họ tên, đóng dấu)</div>
              <div className="mt-12">&nbsp;</div>
            </div>
          </div>
        </div>
        {/* Ngày in và nút in - luôn cố định dưới popup */}
        <div className="mt-8 flex justify-between items-center print:hidden flex-shrink-0">
          <div className="text-sm text-gray-500">Ngày in: {currentDate}</div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={handlePrintReceipt}
            >
              In phiếu
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceiptPrintModal
