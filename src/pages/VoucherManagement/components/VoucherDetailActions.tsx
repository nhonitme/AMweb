import { useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react"

import type { LinkedInventoryTarget } from "@/pages/Inventory/inventoryAccountingLinkUtils"

export interface VoucherDetailActionsProps {
  rowKey: string
  showInventoryButton: boolean
  hasVatData: boolean
  isVatActive: boolean
  inventoryLabel: string
  inventoryHint: string
  vatLabel: string
  vatHint: string
  inventoryPending?: boolean
  inventoryDisabled?: boolean
  inventoryTargets?: LinkedInventoryTarget[]
  vatDisabled?: boolean
  onInventoryClick?: (target?: LinkedInventoryTarget) => void
  onVatClick: () => void
}

const ACTION_BUTTON_CLASS =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded border px-1.5 text-xs font-medium transition-colors disabled:cursor-wait disabled:opacity-50"

function stopActionEvent(event: ReactMouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>) {
  event.preventDefault()
  event.stopPropagation()
  event.nativeEvent.stopImmediatePropagation()
}

function inventoryButtonColors(pending: boolean, linked: boolean): string {
  if (pending) {
    return "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
  }
  if (linked) {
    return "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
  }
  return "border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
}

function vatButtonColors(isActive: boolean, hasData: boolean): string {
  if (isActive) {
    return "border-sky-500 bg-sky-100 text-sky-800 ring-1 ring-sky-300 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-100"
  }
  if (hasData) {
    return "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
  }
  return "border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
}

export default function VoucherDetailActions({
  rowKey,
  showInventoryButton,
  hasVatData,
  isVatActive,
  inventoryLabel,
  inventoryHint,
  vatLabel,
  vatHint,
  inventoryPending = false,
  inventoryDisabled = false,
  inventoryTargets = [],
  vatDisabled = false,
  onInventoryClick,
  onVatClick,
}: VoucherDetailActionsProps) {
  const [choosingInventory, setChoosingInventory] = useState(false)
  const linked = inventoryTargets.length > 0

  return (
    <div className="inline-flex flex-col items-center justify-center gap-1 leading-none" data-row-key={rowKey}>
      <div className="inline-flex items-center justify-center gap-0.5">
        {showInventoryButton ? (
          <button
            type="button"
            title={inventoryHint}
            aria-label={inventoryHint}
            disabled={inventoryDisabled}
            onPointerDownCapture={stopActionEvent}
            onMouseDownCapture={stopActionEvent}
            onClick={(event) => {
              stopActionEvent(event)
              if (inventoryTargets.length > 1) {
                setChoosingInventory((value) => !value)
                return
              }
              onInventoryClick?.(inventoryTargets[0])
            }}
            className={`${ACTION_BUTTON_CLASS} ${inventoryButtonColors(inventoryPending, linked)}`}
          >
            <span className="dx-icon dx-icon-box !m-0 flex items-center justify-center text-[14px] leading-none" aria-hidden />
            <span className="leading-none">{inventoryLabel}</span>
            {linked ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden /> : null}
          </button>
        ) : null}

        <button
          type="button"
          title={vatHint}
          aria-label={vatHint}
          aria-pressed={isVatActive}
          disabled={vatDisabled}
          onPointerDownCapture={stopActionEvent}
          onMouseDownCapture={stopActionEvent}
          onClick={(event) => {
            stopActionEvent(event)
            onVatClick()
          }}
          className={`${ACTION_BUTTON_CLASS} ${vatButtonColors(isVatActive, hasVatData)}`}
        >
          <span className="dx-icon dx-icon-percent !m-0 flex items-center justify-center text-[14px] leading-none" aria-hidden />
          <span className="leading-none">{vatLabel}</span>
          {hasVatData && !isVatActive ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          ) : null}
        </button>
      </div>

      {showInventoryButton && choosingInventory && inventoryTargets.length > 1 ? (
        <select
          className="w-full min-w-[7rem] rounded border border-emerald-300 text-xs"
          value=""
          disabled={inventoryDisabled}
          aria-label={inventoryHint}
          onPointerDownCapture={stopActionEvent}
          onMouseDownCapture={stopActionEvent}
          onClick={stopActionEvent}
          onChange={(event) => {
            const target = inventoryTargets.find(
              (item) => `${item.chitType}:${item.chitId}` === event.target.value,
            )
            setChoosingInventory(false)
            if (target) {
              onInventoryClick?.(target)
            }
          }}
        >
          <option value="" disabled>
            {inventoryHint}
          </option>
          {inventoryTargets.map((target) => (
            <option key={`${target.chitType}:${target.chitId}`} value={`${target.chitType}:${target.chitId}`}>
              {target.chitNo
                ? `${target.chitType} · ${target.chitNo}`
                : `${target.chitType} · ${target.chitId}`}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  )
}
