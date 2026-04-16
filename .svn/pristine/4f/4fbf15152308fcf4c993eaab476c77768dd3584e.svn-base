
import React, { useState } from "react"

interface PrintOptionModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (lang: string, template: string) => void
  defaultLang?: string
  defaultTemplate?: string
}

const LANG_OPTIONS = [
  { value: "ko", label: "Tiếng Hàn Quốc" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "Tiếng Anh" },
  { value: "vi-en", label: "Song ngữ Việt / Anh" },
  { value: "vi-ko", label: "Song ngữ Việt / Hàn" },
]

const TEMPLATE_OPTIONS = [
  { value: "other", label: "Mẫu phiếu khác mới (ngoại tệ)" },
  { value: "other-manage", label: "Mẫu phiếu khác mới (ngoại tệ - Mã số quản lý)" },
  { value: "receipt-foreign", label: "Phiếu thu/chi ngoại tệ" },
  { value: "manage", label: "Mã số quản lý" },
  { value: "accounting", label: "Phiếu hạch toán kế toán" },
  { value: "purchase", label: "Phiếu nhập mua" },
  { value: "debit-note", label: "Giấy Báo Nợ" },
  { value: "credit-note", label: "Giấy Báo Có" },
  { value: "bidv", label: "Phiếu ủy nhiệm chi (BIDV)" },
  { value: "ibk", label: "Phiếu ủy nhiệm chi (IBK)" },
  { value: "vietin", label: "Phiếu ủy nhiệm chi (VIETIN)" },
  { value: "shinhan", label: "Lệnh Chuyển Tiền (SHINHAN)" },
]

export default function PrintOptionModal({ open, onClose, onConfirm, defaultLang = "vi", defaultTemplate = "receipt-foreign" }: PrintOptionModalProps) {
  const [lang, setLang] = useState(defaultLang)
  const [template, setTemplate] = useState(defaultTemplate)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center min-h-screen">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={onClose} />
      {/* Modal content */}
      <div className="relative z-50 bg-white rounded-lg shadow-lg p-4 w-[340px] max-w-full mx-2 animate-fadeIn">
        <div className="font-semibold text-base mb-2">In ấn</div>
        <div className="mb-2">
          {LANG_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center space-x-2 mb-1 cursor-pointer">
              <input
                type="radio"
                name="print-lang"
                value={opt.value}
                checked={lang === opt.value}
                onChange={() => setLang(opt.value)}
                className="accent-blue-600 w-4 h-4"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        <div className="mb-2 max-h-32 overflow-y-auto border-t border-b py-2">
          {TEMPLATE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center space-x-2 mb-1 cursor-pointer">
              <input
                type="radio"
                name="print-template"
                value={opt.value}
                checked={template === opt.value}
                onChange={() => setTemplate(opt.value)}
                className="accent-blue-600 w-4 h-4"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        <button
          className="w-full py-1.5 mt-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
          onClick={() => onConfirm(lang, template)}
        >
          In
        </button>
        <button
          className="w-full py-1.5 mt-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold"
          onClick={onClose}
        >
          Đóng
        </button>
      </div>
    </div>
  )
}
