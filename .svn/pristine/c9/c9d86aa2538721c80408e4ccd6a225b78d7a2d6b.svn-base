"use client"

import { FileSpreadsheet } from "lucide-react"

interface ExcelExportButtonProps {
  onExport: () => void
}

export default function ExcelExportButton({ onExport }: ExcelExportButtonProps) {
  return (
    <div className="relative group">
      <button
        onClick={onExport}
        className="p-2 text-gray-600 hover:text-green-600 hover:bg-white rounded-md transition-all"
        title="Xuất Excel"
      >
        <FileSpreadsheet size={16} />
      </button>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        Xuất Excel
      </div>
    </div>
  )
}
