import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal 
} from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  startIndex: number;
  endIndex: number;
  className?: string;
}

const itemsPerPageOptions = [10, 25, 50, 100, 200];

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  startIndex,
  endIndex,
  className = ''
}: PaginationProps) {
  
  // Generate page numbers to display
  const generatePageNumbers = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];

    // Calculate start and end of the range
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);

    // Generate the range
    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    // Add first page and dots if necessary
    if (start > 1) {
      rangeWithDots.push(1);
      if (start > 2) {
        rangeWithDots.push('...');
      }
    }

    // Add the main range
    rangeWithDots.push(...range);

    // Add last page and dots if necessary
    if (end < totalPages) {
      if (end < totalPages - 1) {
        rangeWithDots.push('...');
      }
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = generatePageNumbers();

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    onItemsPerPageChange(newItemsPerPage);
  };

  return (
    <div className={`bg-white border-t border-gray-200 ${className}`}>
      <div className="px-1 py-1 sm:px-6">
        {/* Mobile View */}
        <div className="flex items-center justify-between sm:hidden">
          <div className="flex-1">
            <p className="text-gray-700">
              <span className="font-medium">{startIndex + 1}</span>
              {' - '}
              <span className="font-medium">{Math.min(endIndex, totalItems)}</span>
              {' của '}
              <span className="font-medium">{totalItems.toLocaleString('vi-VN')}</span>
            </p>
          </div> 
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-700 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden sm:flex sm:items-center sm:justify-between">
          
          <div className="flex items-center space-x-4">
            <p className="text-gray-700">
              <span className="font-medium">{startIndex + 1}</span>
              {' - '}
              <span className="font-medium">{Math.min(endIndex, totalItems)}</span>
              {' của '}
              <span className="font-medium">{totalItems.toLocaleString('vi-VN')}</span>
            </p>
            <div className="flex items-center space-x-2">
              <label htmlFor="itemsPerPageMobile" className="text-gray-700">
                Hiển thị:
              </label>
              <select
                id="itemsPerPageMobile"
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="block w-auto px-2 py-1 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {itemsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
             <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Trang đầu"
              >
                <ChevronsLeft size={16} />
              </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-700 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
             <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Trang cuối"
              >
                <ChevronsRight size={16} />
              </button>
          </div>
        </div>

        {/* Page info for mobile (below the controls) */}
        <div className="mt-3 sm:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label htmlFor="itemsPerPageMobile" className="text-gray-700">
                Hiển thị:
              </label>
              <select
                id="itemsPerPageMobile"
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="block w-auto px-2 py-1 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {itemsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Trang đầu"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Trang cuối"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
