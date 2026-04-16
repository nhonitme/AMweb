type GridValidationRow = {
  key?: unknown
  data?: Record<string, unknown> | null
}

type GridValidationEventLike = {
  data?: Record<string, unknown> | null
  row?: GridValidationRow | null
}

const toPositiveNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }

  return undefined
}

export const resolveGridValidationRowId = (
  event: GridValidationEventLike,
  idField: string,
): number | undefined =>
  toPositiveNumber(event.data?.[idField]) ??
  toPositiveNumber(event.row?.data?.[idField]) ??
  toPositiveNumber(event.row?.key)
