import React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  startIndex: number
  endIndex: number
  className?: string
}

const itemsPerPageOptions = [10, 25, 50, 100, 200]

const pageSizeButtonClass = (active: boolean) =>
  [
    "inline-flex items-center justify-center rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
    active
      ? "bg-red-600 text-white shadow-sm"
      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
  ].join(" ")

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  startIndex,
  endIndex,
  className = "",
}: PaginationProps) {
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page)
    }
  }

  const renderPageSizeOptions = () => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-gray-700">Hiển thị:</span>
      {itemsPerPageOptions.map((option) => {
        const active = option === itemsPerPage

        return (
          <button
            key={option}
            type="button"
            onClick={() => onItemsPerPageChange(option)}
            className={pageSizeButtonClass(active)}
            aria-pressed={active}
          >
            {option}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className={`border-t border-gray-200 bg-white ${className}`}>
      <div className="px-1 py-1 sm:px-6">
        <div className="flex items-center justify-between sm:hidden">
          <div className="flex-1">
            <p className="text-gray-700">
              <span className="font-medium">{startIndex + 1}</span>
              {" - "}
              <span className="font-medium">{Math.min(endIndex, totalItems)}</span>
              {" của "}
              <span className="font-medium">{totalItems.toLocaleString("vi-VN")}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-sm text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="hidden sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-gray-700">
              <span className="font-medium">{startIndex + 1}</span>
              {" - "}
              <span className="font-medium">{Math.min(endIndex, totalItems)}</span>
              {" của "}
              <span className="font-medium">{totalItems.toLocaleString("vi-VN")}</span>
            </p>
            {renderPageSizeOptions()}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Trang đầu"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-sm text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Trang cuối"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-3 sm:hidden">
          {renderPageSizeOptions()}
          <div className="flex items-center justify-end space-x-1">
            <button
              type="button"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Trang đầu"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Trang cuối"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
