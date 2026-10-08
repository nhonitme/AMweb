import { isForeignCurrencyCode } from "@/lib/currency"
import type {
    ChitInfo,
    ChitType,
    InventoryInputApi,
    InventoryInputLine,
    InventoryOutputApi,
    InventoryOutputLine,
} from "@/types/voucher"

import {
    getActiveChitDetails,
    isInventoryInputLinkedAccountingVoucherType,
    isInventoryOutputLinkedAccountingVoucherType,
    normalizeInventoryInputApi,
    normalizeInventoryOutputApi,
} from "../chitUtils"

export type ChitEditorDetailRow = ChitInfo["DETAILS"][number]

export type ChitDetailAccountField = "DEBIT" | "CREDIT"

export type ChitDetailRowValidationWarnings = Partial<Record<string, ChitDetailAccountField[]>>

export type ChitDetailSaveValidationFailure = {
    isValid: false
    message: string
    rowKey: string
    rowIndex: number
    focusField: ChitDetailAccountField
    missingFields: ChitDetailAccountField[]
}

export type ChitDetailSaveValidationSuccess = {
    isValid: true
    details: ChitEditorDetailRow[]
}

export type ChitDetailSaveValidationResult = ChitDetailSaveValidationSuccess | ChitDetailSaveValidationFailure

type DetailRowRecord = ChitEditorDetailRow & Record<string, unknown>

type TranslateFn = (key: string, fallback: string) => string

type InventoryAttachKind = "input" | "output"

function trimReferenceText(value: unknown): string {
    return String(value ?? "").trim()
}

function normalizeReferenceNumber(value: unknown): number | null {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed : null
}

export function getDetailRowKey(row: ChitEditorDetailRow, index: number): string {
    const detail = row as DetailRowRecord
    const candidate =
        detail?.CHITDETAIL_ID ??
        detail?.ROW_KEY ??
        detail?.DETAIL_ID ??
        detail?.ID ??
        detail?.TEMP_ID ??
        detail?.DETAIL_TEMP_ID ??
        index
    return String(candidate)
}

export function getDetailRowAmount(row: ChitEditorDetailRow): number {
    const detail = row as DetailRowRecord
    const amountCandidate = detail?.AMOUNT ?? detail?.amount ?? detail?.SUPPLY_AMOUNT ?? detail?.TOTAL_AMOUNT ?? 0
    const parsed = Number(amountCandidate)
    return Number.isFinite(parsed) ? parsed : 0
}

export function getDetailInventoryInputs(row: ChitEditorDetailRow | null | undefined): InventoryInputLine[] {
    return Array.isArray(row?.INVENTORY_INPUTS) ? row.INVENTORY_INPUTS : []
}

export function getDetailInventoryOutputs(row: ChitEditorDetailRow | null | undefined): InventoryOutputLine[] {
    return Array.isArray(row?.INVENTORY_OUTPUTS) ? row.INVENTORY_OUTPUTS : []
}

export function hasActiveInventoryReferenceLines(row: ChitEditorDetailRow): boolean {
    return (
        getDetailInventoryInputs(row).some((line) => !line.ISDEL && Number(line.INPUT_ID ?? 0) > 0) ||
        getDetailInventoryOutputs(row).some((line) => !line.ISDEL && Number(line.OUTPUT_ID ?? 0) > 0)
    )
}

export function getLinkedReferenceSourceIds(details: ChitEditorDetailRow[], chitType: ChitType): number[] {
    const sourceIds = new Set<number>()
    const collectSourceId = (sourceId: unknown) => {
        const parsed = Number(sourceId ?? 0)
        if (Number.isFinite(parsed) && parsed > 0) {
            sourceIds.add(parsed)
        }
    }

    details.forEach((detail) => {
        if (isInventoryInputLinkedAccountingVoucherType(chitType)) {
            getDetailInventoryInputs(detail).forEach((input) => {
                if (!input.ISDEL) {
                    collectSourceId(input.INVENTORY_ID)
                }
            })
            return
        }

        if (isInventoryOutputLinkedAccountingVoucherType(chitType)) {
            getDetailInventoryOutputs(detail).forEach((output) => {
                if (!output.ISDEL) {
                    collectSourceId(output.INVENTORY_ID)
                }
            })
        }
    })

    return Array.from(sourceIds)
}

export function getPersistedLinkedReferenceSourceIds(details: ChitEditorDetailRow[], chitType: ChitType): number[] {
    const sourceIds = new Set<number>()
    const collectSourceId = (sourceId: unknown) => {
        const parsed = Number(sourceId ?? 0)
        if (Number.isFinite(parsed) && parsed > 0) {
            sourceIds.add(parsed)
        }
    }

    details.forEach((detail) => {
        const detailId = Number(detail.CHITDETAIL_ID ?? 0)
        if (!Number.isFinite(detailId) || detailId <= 0 || detail.ISDEL) {
            return
        }

        if (isInventoryInputLinkedAccountingVoucherType(chitType)) {
            getDetailInventoryInputs(detail).forEach((input) => {
                if (!input.ISDEL) {
                    collectSourceId(input.INVENTORY_ID)
                }
            })
            return
        }

        if (isInventoryOutputLinkedAccountingVoucherType(chitType)) {
            getDetailInventoryOutputs(detail).forEach((output) => {
                if (!output.ISDEL) {
                    collectSourceId(output.INVENTORY_ID)
                }
            })
        }
    })

    return Array.from(sourceIds)
}

export function normalizeReferenceSourceIds(values: Iterable<unknown>): number[] {
    const sourceIds = new Set<number>()
    Array.from(values).forEach((value) => {
        const parsed = Number(value ?? 0)
        if (Number.isFinite(parsed) && parsed > 0) {
            sourceIds.add(parsed)
        }
    })
    return Array.from(sourceIds).sort((left, right) => left - right)
}

export function getReferenceSourceId(source: ChitInfo): number | null {
    const parsed = Number(source.CHIT_ID ?? 0)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function isLinkedToCurrentReferenceSource(source: ChitInfo): boolean {
    const sourceRecord = source as ChitInfo & Record<string, unknown>
    return Boolean(sourceRecord.IS_LINKED_TO_CURRENT_SOURCE)
}

export function getReferenceLinkedChitDetailIds(source: ChitInfo): number[] {
    const sourceRecord = source as ChitInfo & Record<string, unknown>
    const linkedDetailIds = sourceRecord.REFERENCE_LINKED_CHITDETAIL_IDS
    return Array.isArray(linkedDetailIds) ? normalizeReferenceSourceIds(linkedDetailIds) : []
}

export function getInventoryLineSourceDetailId(line: InventoryInputLine | InventoryOutputLine): number {
    return Number(line.CHITDETAIL_ID ?? 0)
}

export function calculateInventoryLineAmount(line: InventoryInputLine | InventoryOutputLine): number {
    if (line.AMOUNT_CC != null) {
        const explicitAmount = Number(line.AMOUNT_CC)
        if (Number.isFinite(explicitAmount)) {
            return explicitAmount
        }
    }

    const quantity = Number(line.QUANTITY ?? 0)
    const unitPrice = Number(line.UNIT_PRICE_CC ?? 0)

    return (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0)
}

export function calculateInventoryLinesAmount(lines: Array<InventoryInputLine | InventoryOutputLine>): number {
    return lines.reduce((total, line) => total + (line.ISDEL ? 0 : calculateInventoryLineAmount(line)), 0)
}

export function hasChitDetailContent(detail: ChitEditorDetailRow): boolean {
    const row = detail as DetailRowRecord
    const textFields = [
        row.DEBIT,
        row.CREDIT,
        row.CUSTOMER_CD,
        row.BANK_CD,
        row.DEPARTMENT_CD,
        row.MG_CD,
        row.MR_CD,
        row.MR_CD2,
        row.VAT_CHIT_NO,
        row.VAT_INPUT_CD,
        row.CHITDETAIL_VAT_CD,
        row.PRODUCT_CD,
        row.PRODUCT_NM_VIET,
        row.UNIT_CD,
        row.UNIT_NM,
        row.DETAIL_DESCRIPTION_VIET,
        row.DETAIL_DESCRIPTION_ENG,
        row.DETAIL_DESCRIPTION_KOR,
    ]

    if (textFields.some((value) => String(value ?? "").trim().length > 0)) {
        return true
    }

    if (isForeignCurrencyCode(row.FC_TYPE)) {
        return true
    }

    const numericFields = [row.QUANTITY, row.UNIT_PRICE, row.AMOUNT, row.PRODUCT_AMOUNT, row.VAT_AMOUNT, row.FC_AMOUNT]
    return numericFields.some((value) => {
        const parsed = Number(value ?? 0)
        return Number.isFinite(parsed) && parsed !== 0
    })
}

export function isChitDetailBlankRow(detail: ChitEditorDetailRow): boolean {
    return !hasChitDetailContent(detail)
}

export function getChitDetailMissingAccountFields(detail: ChitEditorDetailRow): ChitDetailAccountField[] {
    if (isChitDetailBlankRow(detail)) {
        return []
    }

    const missing: ChitDetailAccountField[] = []
    if (!String(detail.DEBIT ?? "").trim()) {
        missing.push("DEBIT")
    }
    if (!String(detail.CREDIT ?? "").trim()) {
        missing.push("CREDIT")
    }

    return missing
}

function buildDetailSaveValidationMessage(
    rowIndex: number,
    missingFields: ChitDetailAccountField[],
    t: TranslateFn,
): string {
    const rowLabel = String(rowIndex + 1)
    if (missingFields.includes("DEBIT") && missingFields.includes("CREDIT")) {
        return t(
            "DETAIL_DEBIT_CREDIT_REQUIRED",
            "Dòng {0}: Bắt buộc nhập Tài khoản Nợ và Tài khoản Có.",
        ).replace("{0}", rowLabel)
    }

    if (missingFields.includes("DEBIT")) {
        return t(
            "DETAIL_DEBIT_REQUIRED",
            "Dòng {0}: Bắt buộc nhập Tài khoản Nợ.",
        ).replace("{0}", rowLabel)
    }

    return t(
        "DETAIL_CREDIT_REQUIRED",
        "Dòng {0}: Bắt buộc nhập Tài khoản Có.",
    ).replace("{0}", rowLabel)
}

export function filterNonBlankChitDetails(details: ChitEditorDetailRow[]): ChitEditorDetailRow[] {
    return details.filter((detail) => !isChitDetailBlankRow(detail))
}

export function validateChitDetailsForSave(
    details: ChitEditorDetailRow[],
    translate?: TranslateFn,
): ChitDetailSaveValidationResult {
    const t: TranslateFn = translate ?? ((_key, fallback) => fallback)
    const rows = filterNonBlankChitDetails(details)

    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index]
        const missingFields = getChitDetailMissingAccountFields(row)
        if (missingFields.length === 0) {
            continue
        }

        return {
            isValid: false,
            message: buildDetailSaveValidationMessage(index, missingFields, t),
            rowKey: String(row.ROW_KEY ?? ""),
            rowIndex: index,
            focusField: missingFields[0],
            missingFields,
        }
    }

    return {
        isValid: true,
        details: rows,
    }
}

export function buildChitDetailRowValidationWarnings(
    rowKey: string,
    missingFields: ChitDetailAccountField[],
): ChitDetailRowValidationWarnings {
    if (!rowKey || missingFields.length === 0) {
        return {}
    }

    return {
        [rowKey]: missingFields,
    }
}

function attachInventoryLinesToDetails(
    details: ChitEditorDetailRow[],
    lines: InventoryInputLine[] | InventoryOutputLine[],
    kind: InventoryAttachKind,
): ChitEditorDetailRow[] {
    const byDetailId = new Map<number, Array<InventoryInputLine | InventoryOutputLine>>()
    const byDetailCd = new Map<string, Array<InventoryInputLine | InventoryOutputLine>>()

    lines.forEach((line) => {
        const detailId = normalizeReferenceNumber(line.CHITDETAIL_ID) ?? 0
        const detailCd = trimReferenceText(line.CHITDETAIL_CD)

        if (detailId > 0) {
            const list = byDetailId.get(detailId) ?? []
            list.push({ ...line })
            byDetailId.set(detailId, list)
            return
        }

        if (detailCd.length > 0) {
            const list = byDetailCd.get(detailCd) ?? []
            list.push({ ...line })
            byDetailCd.set(detailCd, list)
        }
    })

    return details.map((detail) => {
        const detailId = normalizeReferenceNumber(detail.CHITDETAIL_ID) ?? 0
        const detailCd = trimReferenceText(detail.CHITDETAIL_CD)
        const existingInputs = getDetailInventoryInputs(detail)
        const existingOutputs = getDetailInventoryOutputs(detail)

        if (kind === "input") {
            const linkedLines =
                (detailId > 0 ? byDetailId.get(detailId) : undefined) ??
                (detailCd.length > 0 ? byDetailCd.get(detailCd) : undefined) ??
                existingInputs
            const inventoryInputs = (linkedLines as InventoryInputLine[]).map((input) => ({ ...input, ISDEL: false }))

            return {
                ...detail,
                INVENTORY_INPUTS: inventoryInputs,
                HASINVENTORY: inventoryInputs.length > 0 || existingOutputs.length > 0,
            } as ChitEditorDetailRow
        }

        const linkedLines =
            (detailId > 0 ? byDetailId.get(detailId) : undefined) ??
            (detailCd.length > 0 ? byDetailCd.get(detailCd) : undefined) ??
            existingOutputs
        const inventoryOutputs = (linkedLines as InventoryOutputLine[]).map((output) => ({ ...output, ISDEL: false }))

        return {
            ...detail,
            INVENTORY_OUTPUTS: inventoryOutputs,
            HASINVENTORY: existingInputs.length > 0 || inventoryOutputs.length > 0,
        } as ChitEditorDetailRow
    })
}

export function attachInventoryInputsToPurchaseDetails(
    details: ChitEditorDetailRow[],
    inputs: InventoryInputLine[],
): ChitEditorDetailRow[] {
    return attachInventoryLinesToDetails(details, inputs, "input")
}

export function attachInventoryOutputsToSalesDetails(
    details: ChitEditorDetailRow[],
    outputs: InventoryOutputLine[],
): ChitEditorDetailRow[] {
    return attachInventoryLinesToDetails(details, outputs, "output")
}

export function mergeApiInventoryByChitDetailId(
    details: ChitEditorDetailRow[],
    inputs: InventoryInputApi[],
    outputs: InventoryOutputApi[],
): ChitEditorDetailRow[] {
    const inputMap = new Map<number, InventoryInputLine[]>()
    const outputMap = new Map<number, InventoryOutputLine[]>()
    const inputItems = Array.isArray(inputs) ? inputs : []
    const outputItems = Array.isArray(outputs) ? outputs : []

    inputItems.forEach((item) => {
        const key = Number(item.CHITDETAIL_ID ?? 0)
        if (key <= 0) {
            return
        }
        const list = inputMap.get(key) ?? []
        list.push(normalizeInventoryInputApi(item, String(key)))
        inputMap.set(key, list)
    })

    outputItems.forEach((item) => {
        const key = Number(item.CHITDETAIL_ID ?? 0)
        if (key <= 0) {
            return
        }
        const list = outputMap.get(key) ?? []
        list.push(normalizeInventoryOutputApi(item, String(key)))
        outputMap.set(key, list)
    })

    return details.map((row) => {
        const chitDetailId = Number(row.CHITDETAIL_ID ?? 0)
        const inventoryInputs =
            chitDetailId > 0 ? inputMap.get(chitDetailId) ?? getDetailInventoryInputs(row) : getDetailInventoryInputs(row)
        const inventoryOutputs =
            chitDetailId > 0 ? outputMap.get(chitDetailId) ?? getDetailInventoryOutputs(row) : getDetailInventoryOutputs(row)

        return {
            ...row,
            INVENTORY_INPUTS: inventoryInputs,
            INVENTORY_OUTPUTS: inventoryOutputs,
            HASINVENTORY: inventoryInputs.length > 0 || inventoryOutputs.length > 0,
        }
    })
}

export function getDetailRowLabel(row: ChitEditorDetailRow, index: number): string {
    const detail = row as DetailRowRecord
    const description = ""

    const debit = String(detail?.DEBIT ?? "").trim()
    const credit = String(detail?.CREDIT ?? "").trim()
    const amount = getDetailRowAmount(row)
    const fallback = [debit || "?", credit || "?", amount > 0 ? amount.toLocaleString() : ""].filter(Boolean).join(" / ")

    return description ? `${index + 1}. ${description}` : `${index + 1}. ${fallback || "Detail row"}`
}

export function mapDraftForSave(draft: ChitInfo): ChitInfo {
    return {
        ...draft,
        DETAILS: draft.DETAILS.map((detail) => ({
            ...detail,
            HASINVENTORY: getDetailInventoryInputs(detail).length > 0 || getDetailInventoryOutputs(detail).length > 0,
            INVENTORY_INPUTS: getDetailInventoryInputs(detail),
            INVENTORY_OUTPUTS: getDetailInventoryOutputs(detail),
        })) as ChitInfo["DETAILS"],
    }
}

export function getActiveDetailRows(details: ChitEditorDetailRow[]): ChitEditorDetailRow[] {
    return getActiveChitDetails(details as ChitInfo["DETAILS"]) as ChitEditorDetailRow[]
}
