"use client"

import React, { useEffect, useState, useCallback } from "react"
import { X, Undo2 } from "lucide-react"

interface ToastProps {
  message: string
  onUndo?: () => void
  onClose: () => void
  duration?: number // in milliseconds, default 5000ms
}

export function Toast({ message, onUndo, onClose, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, duration)
  }, [duration, onClose])

  const handleClose = useCallback(() => {
    setIsVisible(false)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    onClose()
  }, [onClose])

  const handleUndo = useCallback(() => {
    if (onUndo) {
      onUndo()
    }
    handleClose()
  }, [onUndo, handleClose])

  useEffect(() => {
    if (isVisible) {
      startTimer()
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isVisible, startTimer])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm sm:max-w-md md:max-w-lg">
      <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg flex items-center justify-between space-x-4 animate-slide-in-up">
        <div className="flex-1 text-sm font-medium">{message}</div>
        <div className="flex items-center space-x-2">
          {onUndo && (
            <button
              onClick={handleUndo}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-xs font-semibold transition-colors"
            >
              <Undo2 size={14} />
              <span>Hoàn tác</span>
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
