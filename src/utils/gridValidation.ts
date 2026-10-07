import { getApiEnvelopeMessage } from "@/api/apiTypes"

type GridValidationRow = {
  key?: unknown
  data?: Record<string, unknown> | null
}

type GridValidationEventLike = {
  data?: Record<string, unknown> | null
  row?: GridValidationRow | null
}

type DuplicateCodeExistsChecker = (rowId: number | undefined, code: string) => Promise<boolean>

type DuplicateCodeValidationEvent = GridValidationEventLike & {
  value?: unknown
}

type DuplicateCodeValidationOptions = {
  idField: string
  exists: DuplicateCodeExistsChecker
  errorMessage?: string
}

type DuplicateCodeValidationResult = boolean | {
  isValid: boolean
  message?: string
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

export const createDuplicateCodeValidator =
  ({ idField, exists, errorMessage = "Không kiểm tra được dữ liệu" }: DuplicateCodeValidationOptions) =>
  async (event: DuplicateCodeValidationEvent): Promise<DuplicateCodeValidationResult> => {
    const code = String(event.value ?? "").trim()

    if (!code) {
      return true
    }

    try {
      const rowId = resolveGridValidationRowId(event, idField)
      const duplicated = await exists(rowId, code)
      return { isValid: !duplicated }
    } catch (err: unknown) {
      const responseData = (err as { response?: { data?: unknown } })?.response?.data
      return {
        isValid: false,
        message: getApiEnvelopeMessage(responseData, errorMessage),
      }
    }
  }
