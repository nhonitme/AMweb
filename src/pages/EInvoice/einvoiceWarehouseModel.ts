import type { EInvoice, EInvoiceApi, EInvoicePxkInfo, EInvoicePxkInfoApi } from "@/types/einvoice"

const trimText = (value: string | null | undefined): string => (typeof value === "string" ? value.trim() : "")

export type EInvoiceWarehouseVariant = "B" | "N"

export interface EInvoiceWarehouseFields {
    NBAN_DCHI: string
    HDKTSo: string
    HDKTNgay: string | null
    LDDNBo: string
    HVTNXHang: string
    TNVChuyen: string
    HDSo: string
    PTVChuyen: string
}

const WAREHOUSE_FIELD_KEYS = [
    "NBAN_DCHI",
    "HDKTSo",
    "HDKTNgay",
    "LDDNBo",
    "HVTNXHang",
    "TNVChuyen",
    "HDSo",
    "PTVChuyen",
] as const satisfies ReadonlyArray<keyof EInvoiceWarehouseFields>

const WAREHOUSE_EXTRA_ALIASES: Record<keyof EInvoiceWarehouseFields, string[]> = {
    NBAN_DCHI: ["NBAN_DCHI"],
    HDKTSo: ["HDKTSo", "HDKTSO"],
    HDKTNgay: ["HDKTNgay", "HDKTNGAY"],
    LDDNBo: ["LDDNBo", "LDDNBO"],
    HVTNXHang: ["HVTNXHang", "HVTNXHANG"],
    TNVChuyen: ["TNVChuyen", "TNVCHUYEN"],
    HDSo: ["HDSo", "HDSO"],
    PTVChuyen: ["PTVChuyen", "PTVCHUYEN"],
}

export function createDefaultWarehouseFields(): EInvoiceWarehouseFields {
    return {
        NBAN_DCHI: "",
        HDKTSo: "",
        HDKTNgay: null,
        LDDNBo: "",
        HVTNXHang: "",
        TNVChuyen: "",
        HDSo: "",
        PTVChuyen: "",
    }
}

export function resolveEInvoiceWarehouseVariant(khhHDON: string | null | undefined): EInvoiceWarehouseVariant | null {
    const text = trimText(khhHDON).toUpperCase()
    if (text.length < 4) {
        return null
    }

    const letter = text.charAt(3)
    if (letter === "B") {
        return "B"
    }

    if (letter === "N") {
        return "N"
    }

    return null
}

export function resolveEInvoicePxkType(khhHDON: string | null | undefined): string {
    const variant = resolveEInvoiceWarehouseVariant(khhHDON)
    if (variant === "B") {
        return "AGENCY"
    }
    if (variant === "N") {
        return "INTERNAL"
    }
    return ""
}

export function isEInvoiceWarehouseConsignment(
    khmsHDON: string | null | undefined,
    khhHDON: string | null | undefined,
): boolean {
    return resolveEInvoiceFormNumber(khmsHDON) === 6 && resolveEInvoiceWarehouseVariant(khhHDON) === "B"
}

export function isEInvoiceWarehouseInternal(
    khmsHDON: string | null | undefined,
    khhHDON: string | null | undefined,
): boolean {
    return resolveEInvoiceFormNumber(khmsHDON) === 6 && resolveEInvoiceWarehouseVariant(khhHDON) === "N"
}

export function resolveEInvoiceFormNumber(khmsHDON: string | null | undefined): number | null {
    const match = trimText(khmsHDON).match(/^(\d+)/)
    if (!match) {
        return null
    }

    const parsed = Number(match[1])
    return Number.isFinite(parsed) ? parsed : null
}

export function isEInvoiceWarehouseForm(khmsHDON: string | null | undefined): boolean {
    return resolveEInvoiceFormNumber(khmsHDON) === 6
}

export type EInvoiceWarehouseValidationMessage = {
    fieldKey: string
    fieldFallback: string
}

function isValidWarehouseDate(value: string | null | undefined): boolean {
    const text = trimText(value).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return false
    }

    const [yearText, monthText, dayText] = text.split("-")
    const year = Number(yearText)
    const month = Number(monthText)
    const day = Number(dayText)
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return false
    }

    const date = new Date(year, month - 1, day)
    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    )
}

export function validateEInvoiceWarehouseFieldsBeforeSave(
    record: EInvoiceWarehouseFields,
    khmsHDON: string | null | undefined,
    khhHDON: string | null | undefined,
): EInvoiceWarehouseValidationMessage | null {
    if (!isEInvoiceWarehouseForm(khmsHDON)) {
        return null
    }

    if (isEInvoiceWarehouseConsignment(khmsHDON, khhHDON)) {
        if (!trimText(record.HDKTSo)) {
            return {
                fieldKey: "HDKTSo",
                fieldFallback: "Contract no.",
            }
        }

        if (!isValidWarehouseDate(record.HDKTNgay)) {
            return {
                fieldKey: "HDKTNgay",
                fieldFallback: "Contract date",
            }
        }
    }

    if (!trimText(record.TNVChuyen)) {
        return {
            fieldKey: "TNVChuyen",
            fieldFallback: "Transporter",
        }
    }

    if (!trimText(record.PTVChuyen)) {
        return {
            fieldKey: "PTVChuyen",
            fieldFallback: "Transport means",
        }
    }

    if (isEInvoiceWarehouseInternal(khmsHDON, khhHDON) && !trimText(record.LDDNBo)) {
        return {
            fieldKey: "LDDNBo",
            fieldFallback: "Internal dispatch order",
        }
    }

    return null
}

function readWarehouseField(record: Record<string, unknown>, key: keyof EInvoiceWarehouseFields): string {
    for (const alias of WAREHOUSE_EXTRA_ALIASES[key]) {
        const value = record[alias]
        if (typeof value === "string" && value.trim().length > 0) {
            return value.trim()
        }
        if (typeof value === "number" && Number.isFinite(value)) {
            return String(value)
        }
    }
    return ""
}

function normalizeDateText(value: string | Date | null | undefined): string | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const year = value.getFullYear()
        const month = `${value.getMonth() + 1}`.padStart(2, "0")
        const day = `${value.getDate()}`.padStart(2, "0")
        return `${year}-${month}-${day}`
    }

    const text = typeof value === "string" ? value.trim() : String(value ?? "").trim()
    return text.length > 0 ? text.slice(0, 10) : null
}

export function parseWarehouseFieldsFromExtra(extraJson: string | null | undefined): EInvoiceWarehouseFields {
    const defaults = createDefaultWarehouseFields()
    const text = trimText(extraJson)
    if (!text) {
        return defaults
    }

    try {
        const parsed = JSON.parse(text) as Record<string, unknown>
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return defaults
        }

        const hdktNgay = readWarehouseField(parsed, "HDKTNgay")
        return {
            NBAN_DCHI: readWarehouseField(parsed, "NBAN_DCHI"),
            HDKTSo: readWarehouseField(parsed, "HDKTSo"),
            HDKTNgay: hdktNgay.length > 0 ? hdktNgay.slice(0, 10) : null,
            LDDNBo: readWarehouseField(parsed, "LDDNBo"),
            HVTNXHang: readWarehouseField(parsed, "HVTNXHang"),
            TNVChuyen: readWarehouseField(parsed, "TNVChuyen"),
            HDSo: readWarehouseField(parsed, "HDSo"),
            PTVChuyen: readWarehouseField(parsed, "PTVChuyen"),
        }
    } catch {
        return defaults
    }
}

export function mergeWarehouseFieldsToExtra(
    extraJson: string | null | undefined,
    fields: EInvoiceWarehouseFields,
): string {
    let base: Record<string, unknown> = {}

    const text = trimText(extraJson)
    if (text) {
        try {
            const parsed = JSON.parse(text) as unknown
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                base = { ...(parsed as Record<string, unknown>) }
            }
        } catch {
            base = {}
        }
    }

    for (const key of WAREHOUSE_FIELD_KEYS) {
        const value = key === "HDKTNgay" ? trimText(fields.HDKTNgay) : trimText(fields[key])
        if (value.length > 0) {
            base[key] = value
        } else {
            delete base[key]
        }
    }

    return Object.keys(base).length > 0 ? JSON.stringify(base) : ""
}

export function stripWarehouseFieldsFromExtra(extraJson: string | null | undefined): string {
    const text = trimText(extraJson)
    if (!text) {
        return ""
    }

    try {
        const parsed = JSON.parse(text) as unknown
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return text
        }

        const base = { ...(parsed as Record<string, unknown>) }
        for (const aliases of Object.values(WAREHOUSE_EXTRA_ALIASES)) {
            for (const alias of aliases) {
                delete base[alias]
            }
        }

        return Object.keys(base).length > 0 ? JSON.stringify(base) : ""
    } catch {
        return text
    }
}

export function normalizeEInvoicePxkInfo(
    pxkInfo: EInvoicePxkInfoApi | null | undefined,
    invoiceId = 0,
): EInvoicePxkInfo | null {
    if (!pxkInfo) {
        return null
    }

    return {
        PXK_ID: Number(pxkInfo.PXK_ID ?? 0),
        INVOICE_ID: Number(pxkInfo.INVOICE_ID ?? invoiceId),
        PXK_TYPE: trimText(pxkInfo.PXK_TYPE),
        NBAN_DCHI: trimText(pxkInfo.NBAN_DCHI),
        LDDNBO: trimText(pxkInfo.LDDNBO),
        HDKTSO: trimText(pxkInfo.HDKTSO),
        HDKTNGAY: normalizeDateText(pxkInfo.HDKTNGAY),
        HVTNXHANG: trimText(pxkInfo.HVTNXHANG),
        TNVCHUYEN: trimText(pxkInfo.TNVCHUYEN),
        HDSO: trimText(pxkInfo.HDSO),
        PTVCHUYEN: trimText(pxkInfo.PTVCHUYEN),
        EXTRA_JSON: trimText(pxkInfo.EXTRA_JSON),
        ISDEL: Number(pxkInfo.ISDEL ?? 0),
    }
}

function readWarehouseFieldsFromPxkInfo(pxkInfo: EInvoicePxkInfoApi): EInvoiceWarehouseFields {
    return {
        NBAN_DCHI: trimText(pxkInfo.NBAN_DCHI),
        HDKTSo: trimText(pxkInfo.HDKTSO),
        HDKTNgay: normalizeDateText(pxkInfo.HDKTNGAY),
        LDDNBo: trimText(pxkInfo.LDDNBO),
        HVTNXHang: trimText(pxkInfo.HVTNXHANG),
        TNVChuyen: trimText(pxkInfo.TNVCHUYEN),
        HDSo: trimText(pxkInfo.HDSO),
        PTVChuyen: trimText(pxkInfo.PTVCHUYEN),
    }
}

export function createEInvoicePxkInfoFromWarehouseFields(
    record: EInvoice & Partial<EInvoiceWarehouseFields>,
    khhHDON: string | null | undefined,
): EInvoicePxkInfoApi {
    const existing = record.PXK_INFO
    return {
        PXK_ID: existing?.PXK_ID ?? 0,
        INVOICE_ID: record.INVOICE_ID,
        PXK_TYPE: trimText(existing?.PXK_TYPE) || resolveEInvoicePxkType(khhHDON),
        NBAN_DCHI: trimText(record.NBAN_DCHI),
        LDDNBO: trimText(record.LDDNBo),
        HDKTSO: trimText(record.HDKTSo),
        HDKTNGAY: normalizeDateText(record.HDKTNgay),
        HVTNXHANG: trimText(record.HVTNXHang),
        TNVCHUYEN: trimText(record.TNVChuyen),
        HDSO: trimText(record.HDSo),
        PTVCHUYEN: trimText(record.PTVChuyen),
        EXTRA_JSON: trimText(existing?.EXTRA_JSON),
        ISDEL: 0,
    }
}

export type EInvoiceWithWarehouseFields = EInvoice & EInvoiceWarehouseFields

export function applyWarehouseFieldsToInvoice(invoice: EInvoice): EInvoiceWithWarehouseFields {
    const warehouse = invoice.PXK_INFO
        ? readWarehouseFieldsFromPxkInfo(invoice.PXK_INFO)
        : parseWarehouseFieldsFromExtra(invoice.EXTRA_JSON)
    return {
        ...invoice,
        ...warehouse,
    }
}

export function applyWarehouseFieldsToApiPayload(record: EInvoiceWithWarehouseFields): EInvoiceApi {
    const { NBAN_DCHI, HDKTSo, HDKTNgay, LDDNBo, HVTNXHang, TNVChuyen, HDSo, PTVChuyen, ...rest } = record
    return {
        ...rest,
        PXK_INFO: createEInvoicePxkInfoFromWarehouseFields({
            ...record,
            NBAN_DCHI,
            HDKTSo,
            HDKTNgay,
            LDDNBo,
            HVTNXHang,
            TNVChuyen,
            HDSo,
            PTVChuyen,
        }, record.KHHDON),
        EXTRA_JSON: stripWarehouseFieldsFromExtra(record.EXTRA_JSON) || null,
    }
}