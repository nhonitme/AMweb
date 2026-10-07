import type { MouseEvent, PointerEvent } from "react"

type InteractionEvent = MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>

type Props = {
  hint?: string
  onDelete: () => void
}

function stopEvent(event: InteractionEvent) {
  event.preventDefault()
  event.stopPropagation()
  event.nativeEvent.stopImmediatePropagation()
}

export default function DeleteRowButton({ hint, onDelete }: Props) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <button
        type="button"
        title={hint}
        onPointerDownCapture={stopEvent}
        onMouseDownCapture={stopEvent}
        onClick={(event) => {
          stopEvent(event)
          onDelete()
        }}
        className="flex items-center justify-center p-1 rounded text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <span className="dx-icon dx-icon-trash" />
      </button>
    </div>
  )
}
