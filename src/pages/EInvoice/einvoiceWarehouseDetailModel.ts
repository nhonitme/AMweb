import type { EInvoice, EInvoiceDetail } from "@/types/einvoice"

export const EINV_PXK_THUC_NHAP_TTRUONG = "Thực nhập"
export const EINV_PXK_SYNC_THUC_XUAT_NHAP = "PXK_SYNC_THUC_XUAT_NHAP"

export type EInvoiceWarehouseDetailRow = EInvoiceDetail & {
  SLTHUCNHAP?: number | null
}

type TtKhacRow = {
  TTruong?: string
  DLieu?: string
  KDLieu?: string
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim()
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseExtraObject(extraJson: string | null | undefined): Record<string, unknown> {
  const text = trimText(extraJson)
  if (!text) {
    return {}
  }

  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }

    return { ...(parsed as Record<string, unknown>) }
  } catch {
    return {}
  }
}

function serializeExtraObject(extra: Record<string, unknown>): string | null {
  const entries = Object.entries(extra).filter(([, value]) => value !== undefined && value !== null && value !== "")
  if (entries.length === 0) {
    return null
  }

  return JSON.stringify(Object.fromEntries(entries))
}

function normalizeTtKhacFieldName(value: unknown): string {
  return trimText(String(value ?? ""))
}

function isThucNhapFieldName(value: unknown): boolean {
  const normalized = normalizeTtKhacFieldName(value).toLowerCase()
  return normalized === "thực nhập" || normalized === "thuc nhap" || normalized === "slthucnhap"
}

function readTtKhacRows(extraJson: string | null | undefined): TtKhacRow[] {
  const text = trimText(extraJson)
  if (!text) {
    return []
  }

  if (text.startsWith("<")) {
    return []
  }

  try {
    const parsed = JSON.parse(text) as unknown
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item && typeof item === "object" && !Array.isArray(item))
        .map((item) => item as TtKhacRow)
    }

    if (!parsed || typeof parsed !== "object") {
      return []
    }

    const objectValue = parsed as Record<string, unknown>
    if (Array.isArray(objectValue.TTin)) {
      return objectValue.TTin
        .filter((item) => item && typeof item === "object" && !Array.isArray(item))
        .map((item) => item as TtKhacRow)
    }

    const direct = objectValue[EINV_PXK_THUC_NHAP_TTRUONG] ?? objectValue.SLThucNhap ?? objectValue.SLTHUCNHAP
    if (direct !== undefined && direct !== null && direct !== "") {
      return [{ TTruong: EINV_PXK_THUC_NHAP_TTRUONG, DLieu: String(direct), KDLieu: "number" }]
    }

    return Object.entries(objectValue)
      .filter(([key]) => key !== EINV_PXK_SYNC_THUC_XUAT_NHAP)
      .map(([key, value]) => ({
        TTruong: key,
        DLieu: value === null || value === undefined ? "" : String(value),
      }))
  } catch {
    return []
  }
}

function serializeTtKhacRows(rows: TtKhacRow[]): string | null {
  const normalized = rows
    .map((row) => ({
      TTruong: normalizeTtKhacFieldName(row.TTruong),
      DLieu: trimText(row.DLieu),
      KDLieu: trimText(row.KDLieu) || undefined,
    }))
    .filter((row) => row.TTruong.length > 0 && row.DLieu.length > 0)

  if (normalized.length === 0) {
    return null
  }

  return JSON.stringify(
    normalized.map((row) => ({
      TTruong: row.TTruong,
      ...(row.KDLieu ? { KDLieu: row.KDLieu } : {}),
      DLieu: row.DLieu,
    })),
  )
}

export function readWarehouseDetailThucNhap(extraJson: string | null | undefined): number | null {
  const row = readTtKhacRows(extraJson).find((item) => isThucNhapFieldName(item.TTruong))
  return toNullableNumber(row?.DLieu)
}

export function writeWarehouseDetailThucNhap(extraJson: string | null | undefined, value: number | null | undefined): string | null {
  const rows = readTtKhacRows(extraJson).filter((item) => !isThucNhapFieldName(item.TTruong))
  const numeric = toNullableNumber(value)
  if (numeric !== null) {
    rows.push({
      TTruong: EINV_PXK_THUC_NHAP_TTRUONG,
      KDLieu: "number",
      DLieu: String(numeric),
    })
  }

  return serializeTtKhacRows(rows)
}

export function enrichWarehouseDetailRow<T extends EInvoiceDetail>(detail: T): T & { SLTHUCNHAP: number | null } {
  const fromColumn = toNullableNumber((detail as EInvoiceDetail & { SLTHUCNHAP?: number | null }).SLTHUCNHAP)
  return {
    ...detail,
    SLTHUCNHAP: fromColumn ?? readWarehouseDetailThucNhap(detail.EXTRA_JSON),
  }
}

export function serializeWarehouseDetailExtra<T extends EInvoiceDetail & { SLTHUCNHAP?: number | null }>(detail: T): T {
  return {
    ...detail,
    EXTRA_JSON: writeWarehouseDetailThucNhap(detail.EXTRA_JSON, detail.SLTHUCNHAP) ?? "",
  }
}

function isTruthyFlag(value: unknown): boolean {
  if (value === true || value === 1) {
    return true
  }

  const text = trimText(String(value ?? "")).toLowerCase()
  return text === "1" || text === "true" || text === "yes"
}

export function isPxkSyncThucXuatNhap(extraJson: string | null | undefined): boolean {
  const extra = parseExtraObject(extraJson)
  if (extra[EINV_PXK_SYNC_THUC_XUAT_NHAP] === undefined) {
    return true
  }

  return isTruthyFlag(extra[EINV_PXK_SYNC_THUC_XUAT_NHAP])
}

export function setPxkSyncThucXuatNhap(extraJson: string | null | undefined, enabled: boolean): string | null {
  const extra = parseExtraObject(extraJson)
  if (enabled) {
    extra[EINV_PXK_SYNC_THUC_XUAT_NHAP] = true
  } else {
    delete extra[EINV_PXK_SYNC_THUC_XUAT_NHAP]
  }

  return serializeExtraObject(extra)
}

export function applyPxkDetailQuantitySync<T extends EInvoiceWarehouseDetailRow>(
  detail: T,
  syncEnabled: boolean,
): T {
  if (!syncEnabled) {
    return detail
  }

  const thucNhap = toNullableNumber(detail.SLTHUCNHAP)
  const thucXuat = toNullableNumber(detail.SLUONG)
  const source = thucNhap ?? thucXuat

  if (source === null) {
    return detail
  }

  return {
    ...detail,
    SLUONG: source,
    SLTHUCNHAP: source,
  }
}

export function applyPxkDetailSyncToInvoice(invoice: EInvoice, syncEnabled: boolean): EInvoice {
  return {
    ...invoice,
    DETAILS: invoice.DETAILS.map((detail) => {
      const synced = applyPxkDetailQuantitySync(enrichWarehouseDetailRow(detail), syncEnabled)
      return serializeWarehouseDetailExtra(synced)
    }),
  }
}

export function preparePxkInvoiceForSave(invoice: EInvoice): EInvoice {
  const syncEnabled = isPxkSyncThucXuatNhap(invoice.EXTRA_JSON)
  const withSyncFlag = {
    ...invoice,
    EXTRA_JSON: setPxkSyncThucXuatNhap(invoice.EXTRA_JSON, syncEnabled) ?? "",
  }

  return applyPxkDetailSyncToInvoice(withSyncFlag, syncEnabled)
}
