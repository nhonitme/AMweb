"use client"

import { useState, useEffect } from "react"
import { X, AlertTriangle, Loader2, Trash2, AlertCircle } from "lucide-react"
import type { DeleteConfig } from "@/types/form"

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  config: DeleteConfig
  itemName?: string
  itemCount?: number
  customMessage?: string
  /** Gọi khi xóa thất bại, truyền message ra ngoài để hiển thị alert */
  onError?: (message: string) => void
  /** Gọi khi xóa thành công, truyền message ra ngoài để show undo */
  onSuccess?: (message: string) => void
}

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  config,
  itemName,
  itemCount = 1,
  customMessage,
  onError,
  onSuccess,
}: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [internalErrorMessage, setInternalErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setInternalErrorMessage(null)
    }
  }, [isOpen])

  const handleConfirm = async () => {
    setIsDeleting(true)
    setInternalErrorMessage(null)
    const isMultiple = itemCount > 1

    try {
      await onConfirm()

      const successMsg = customMessage
        ? customMessage
        : isMultiple
          ? `Đã xóa ${itemCount} mục thành công`
          : `Đã xóa "${itemName}" thành công`

      onSuccess?.(successMsg)
      onClose()
    } catch (error: any) {
      const errMsg = error?.message || "Có lỗi xảy ra khi xóa!"
      setInternalErrorMessage(errMsg)
      onError?.(errMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    if (!isDeleting) {
      onClose()
    }
  }

  if (!isOpen) return null

  const isMultiple = itemCount > 1
  let displayMessage = customMessage // Ưu tiên customMessage nếu có

  if (!displayMessage) {
    if (isMultiple) {
      // Ưu tiên multipleMessage, nếu không có thì dùng message và thay thế {count}
      displayMessage = config.multipleMessage
        ? config.multipleMessage.replace("{count}", itemCount.toString())
        : config.message.replace("{count}", itemCount.toString())
    } else {
      // Ưu tiên singleMessage, nếu không có thì dùng message và thay thế {item}
      displayMessage = config.singleMessage
        ? config.singleMessage.replace("{item}", itemName || "mục này")
        : config.message.replace("{item}", itemName || "mục này")
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{config.title}</h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <p className="text-gray-700">{displayMessage}</p>

            {!isMultiple && itemName && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <strong>Mục sẽ bị xóa:</strong> {itemName}
                </p>
              </div>
            )}

            {isMultiple && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <strong>Số lượng mục sẽ bị xóa:</strong> {itemCount}
                </p>
              </div>
            )}

            {internalErrorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle size={16} className="text-red-600" />
                  <span className="text-sm font-medium text-red-800">{internalErrorMessage}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleClose}
              disabled={isDeleting}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {config.cancelText || "Hủy"}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang xóa...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>{config.confirmText || "Xóa"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
