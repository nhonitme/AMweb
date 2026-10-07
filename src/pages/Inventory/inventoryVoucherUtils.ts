import type {
  ChitApi,
  ChitDetailApi,
  ChitInfo,
  ChitType,
  InventoryInputLine,
  InventoryOutputLine,
} from "@/types/voucher"

import {
  calculateChitAmount,
  cloneChitDetail,
  createDefaultChit,
  createDefaultChitDetail,
  createRowKey,
  getActiveChitDetails,
  mapChitDetailToApiPayload,
  mapInventoryInputToApiPayload,
  mapInventoryOutputToApiPayload,
  normalizeDateTime,
} from "@/pages/VoucherManagement/chitUtils"
import { DEFAULT_CURRENCY_CODE } from "@/lib/currency"

type InventoryVoucherDetailRow = ChitInfo["DETAILS"][number]
type InventoryOnlyChitType = Extract<ChitType, "IR" | "IO">

const trimText = (value: unknown): string => String(value ?? "").trim()

const toFlag = (value: boolean): "1" | "0" => (value ? "1" : "0")

const normalizeDate = (value: ChitInfo["CHIT_YMD"]): ChitInfo["CHIT_YMD"] => {
  if (value == null || value === "") {
    return value
  }

  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}${month}${day}`
  }

  if (value instanceof Date) {
    return formatDate(value)
  }

  if (typeof value === "number") {
    const text = String(value).trim()
    if (/^\d{8}$/.test(text)) {
      return text
    }

    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return formatDate(parsed)
    }

    return text
  }

  const trimmed = String(value).trim()
  if (!trimmed) {
    return trimmed
  }

  if (/^\d{8}$/.test(trimmed)) {
    return trimmed
  }

  const cleaned = trimmed.replace(/[-/.:\s]/g, "")
  if (/^\d{8}$/.test(cleaned)) {
    return cleaned
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return formatDate(parsed)
  }

  return trimmed
}

function getDetailInventoryInputs(row: InventoryVoucherDetailRow | null | undefined): InventoryInputLine[] {
  return Array.isArray(row?.INVENTORY_INPUTS) ? row.INVENTORY_INPUTS : []
}

function getDetailInventoryOutputs(row: InventoryVoucherDetailRow | null | undefined): InventoryOutputLine[] {
  return Array.isArray(row?.INVENTORY_OUTPUTS) ? row.INVENTORY_OUTPUTS : []
}

function calculateInventoryLineAmount(line: InventoryInputLine | InventoryOutputLine) {
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

function calculateInventoryLinesAmount(lines: Array<InventoryInputLine | InventoryOutputLine>) {
  return lines.reduce((total, line) => total + (line.ISDEL ? 0 : calculateInventoryLineAmount(line)), 0)
}

function hasActiveInventoryLine(line: InventoryInputLine | InventoryOutputLine) {
  return !line.ISDEL
}

export function hasInventoryLineContent(line: InventoryInputLine | InventoryOutputLine) {
  if (line.ISDEL) {
    return false
  }

  const textFields = [
    line.PRODUCT_CD,
    line.PRODUCT_NM_VIET,
    line.STORE_CD,
    line.STORE_NM_VIET,
    line.UNIT_CD,
    line.UNIT_NM_VIET,
    line.SUMMARY,
  ]

  if (textFields.some((value) => String(value ?? "").trim().length > 0)) {
    return true
  }

  const numericFields = [line.PRODUCT_ID, line.STORE_ID, line.UNIT_ID, line.QUANTITY, line.UNIT_PRICE_CC, line.AMOUNT_CC]
  return numericFields.some((value) => {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) && parsed !== 0
  })
}

function getActiveInventoryDetailRows(details: InventoryVoucherDetailRow[]) {
  return getActiveChitDetails(details as ChitInfo["DETAILS"]) as InventoryVoucherDetailRow[]
}

export function isInventoryOnlyVoucherType(chitType: ChitType): chitType is InventoryOnlyChitType {
  return chitType === "IR" || chitType === "IO"
}

export function hasInventoryEntriesInDetails(details: InventoryVoucherDetailRow[]) {
  return details.some(
    (detail) =>
      getDetailInventoryInputs(detail).some((line) => hasActiveInventoryLine(line)) ||
      getDetailInventoryOutputs(detail).some((line) => hasActiveInventoryLine(line)),
  )
}

function createDefaultInventoryInputLine(
  companyCd: string,
  headerDate: ChitInfo["CHIT_YMD"],
  sort = 1,
): InventoryInputLine {
  return {
    ROW_KEY: createRowKey(),
    INPUT_ID: null,
    INPUT_CD: "",
    CHIT_ID: null,
    CHIT_CD: "",
    CHIT_TYPE: "IR",
    COMPANY_CD: companyCd,
    PRODUCT_ID: null,
    PRODUCT_CD: "",
    PRODUCT_NM_VIET: "",
    PRODUCT_NM_ENG: "",
    PRODUCT_NM_KOR: "",
    PRODUCT_NM_CHINA: "",
    STORE_ID: null,
    STORE_CD: "",
    STORE_NM_VIET: "",
    STORE_NM_ENG: "",
    STORE_NM_KOR: "",
    STORE_NM_CHINA: "",
    UNIT_ID: null,
    UNIT_CD: "",
    UNIT_NM_VIET: "",
    UNIT_NM_ENG: "",
    UNIT_NM_KOR: "",
    UNIT_NM_CHINA: "",
    QUANTITY: null,
    UNIT_PRICE_CC: null,
    FC_TYPE: DEFAULT_CURRENCY_CODE,
    UNIT_PRICE_FC: 0,
    EXCHANGE_RATES: 0,
    AMOUNT_CC: null,
    AMOUNT_FC: 0,
    SUMMARY: "",
    INVENTORY_YMD: headerDate ?? null,
    STATE: "1",
    CHITDETAIL_ID: null,
    CHITDETAIL_CD: "",
    SORT: sort,
    ISDEL: false,
  }
}

function createDefaultInventoryOutputLine(
  companyCd: string,
  headerDate: ChitInfo["CHIT_YMD"],
  sort = 1,
): InventoryOutputLine {
  return {
    ROW_KEY: createRowKey(),
    OUTPUT_ID: null,
    OUTPUT_CD: "",
    CHIT_ID: null,
    CHIT_CD: "",
    CHIT_TYPE: "IO",
    COMPANY_CD: companyCd,
    PRODUCT_ID: null,
    PRODUCT_CD: "",
    PRODUCT_NM_VIET: "",
    PRODUCT_NM_ENG: "",
    PRODUCT_NM_KOR: "",
    PRODUCT_NM_CHINA: "",
    STORE_ID: null,
    STORE_CD: "",
    STORE_NM_VIET: "",
    STORE_NM_ENG: "",
    STORE_NM_KOR: "",
    STORE_NM_CHINA: "",
    TO_STORE_ID: null,
    TO_STORE_CD: "",
    TO_STORE_NM_VIET: "",
    TO_STORE_NM_ENG: "",
    TO_STORE_NM_KOR: "",
    TO_STORE_NM_CHINA: "",
    UNIT_ID: null,
    UNIT_CD: "",
    UNIT_NM_VIET: "",
    UNIT_NM_ENG: "",
    UNIT_NM_KOR: "",
    UNIT_NM_CHINA: "",
    QUANTITY: null,
    UNIT_PRICE_CC: null,
    FC_TYPE: DEFAULT_CURRENCY_CODE,
    UNIT_PRICE_FC: 0,
    EXCHANGE_RATES: 0,
    AMOUNT_CC: null,
    AMOUNT_FC: 0,
    SUMMARY: "",
    INVENTORY_YMD: headerDate ?? null,
    STATE: "1",
    CHITDETAIL_ID: null,
    CHITDETAIL_CD: "",
    SORT: sort,
    ISDEL: false,
  }
}

export function createInventoryOnlyDetailRow(
  companyCd: string,
  headerDate: ChitInfo["CHIT_YMD"],
  source?: InventoryVoucherDetailRow | null,
): InventoryVoucherDetailRow {
  const base = createDefaultChitDetail(1, companyCd)

  return {
    ...base,
    ...(source ?? {}),
    ROW_KEY: source?.ROW_KEY ?? createRowKey(source?.CHITDETAIL_ID),
    COMPANY_CD: companyCd || source?.COMPANY_CD || "",
    CHITDETAIL_ID: null,
    CHITDETAIL_CD: "",
    CHIT_YMD: source?.CHIT_YMD ?? headerDate ?? null,
    INVENTORY_YMD: source?.INVENTORY_YMD ?? headerDate ?? null,
    SORT: 1,
    INVENTORY_INPUTS: source ? getDetailInventoryInputs(source).map((line) => ({ ...line })) : [],
    INVENTORY_OUTPUTS: source ? getDetailInventoryOutputs(source).map((line) => ({ ...line })) : [],
    HASINVENTORY: false,
  }
}

export function normalizeInventoryOnlyDetails(
  details: InventoryVoucherDetailRow[],
  companyCd: string,
  headerDate: ChitInfo["CHIT_YMD"],
  chitType: ChitType,
): InventoryVoucherDetailRow[] {
  if (!isInventoryOnlyVoucherType(chitType)) {
    return details
  }

  const clonedDetails = (Array.isArray(details) ? details : []).map(
    (detail) => cloneChitDetail(detail as ChitInfo["DETAILS"][number]) as InventoryVoucherDetailRow,
  )
  const activeRows = getActiveInventoryDetailRows(clonedDetails)
  const deletedRows = clonedDetails.filter((detail) => detail.ISDEL)
  const primaryRow = activeRows[0] ?? null
  const mergedInputs = activeRows.flatMap((detail) => getDetailInventoryInputs(detail).map((line) => ({ ...line })))
  const mergedOutputs = activeRows.flatMap((detail) => getDetailInventoryOutputs(detail).map((line) => ({ ...line })))
  const normalizedRow = createInventoryOnlyDetailRow(companyCd, headerDate, primaryRow)
  const hasInputEntries = mergedInputs.some((line) => hasActiveInventoryLine(line))
  const hasOutputEntries = mergedOutputs.some((line) => hasActiveInventoryLine(line))

  normalizedRow.INVENTORY_INPUTS = mergedInputs
  normalizedRow.INVENTORY_OUTPUTS = mergedOutputs
  normalizedRow.HASINVENTORY = hasInputEntries || hasOutputEntries
  normalizedRow.AMOUNT =
    chitType === "IR" ? calculateInventoryLinesAmount(mergedInputs) : calculateInventoryLinesAmount(mergedOutputs)

  const removedActiveRows = activeRows
    .slice(1)
    .map((detail) => ({ ...(cloneChitDetail(detail as ChitInfo["DETAILS"][number]) as InventoryVoucherDetailRow), ISDEL: true }))

  return [normalizedRow, ...deletedRows, ...removedActiveRows]
}

export function prepareInventoryOnlyDetailsForSave(
  details: InventoryVoucherDetailRow[],
  companyCd: string,
  headerDate: ChitInfo["CHIT_YMD"],
  chitType: ChitType,
): InventoryVoucherDetailRow[] {
  const normalizedDetails = normalizeInventoryOnlyDetails(details, companyCd, headerDate, chitType)

  return normalizedDetails.map((detail) => {
    const inventoryInputs = getDetailInventoryInputs(detail)
      .filter((line) => hasActiveInventoryLine(line))
      .map((line, index) => ({
        ...line,
        SORT: line.SORT ?? index + 1,
      }))
    const inventoryOutputs = getDetailInventoryOutputs(detail)
      .filter((line) => hasActiveInventoryLine(line))
      .map((line, index) => ({
        ...line,
        SORT: line.SORT ?? index + 1,
      }))
    const amount =
      chitType === "IR" ? calculateInventoryLinesAmount(inventoryInputs) : calculateInventoryLinesAmount(inventoryOutputs)

    return {
      ...detail,
      CHITDETAIL_ID: null,
      CHITDETAIL_CD: "",
      SORT: 1,
      AMOUNT: amount,
      INVENTORY_INPUTS: inventoryInputs,
      INVENTORY_OUTPUTS: inventoryOutputs,
      HASINVENTORY: inventoryInputs.length > 0 || inventoryOutputs.length > 0,
    }
  })
}

function ensureInventoryEditorDefaultLine(
  details: InventoryVoucherDetailRow[],
  companyCd: string,
  headerDate: ChitInfo["CHIT_YMD"],
  chitType: InventoryOnlyChitType,
): InventoryVoucherDetailRow[] {
  const primaryDetail = details[0] ?? createInventoryOnlyDetailRow(companyCd, headerDate)
  const restDetails = details.slice(1)

  if (chitType === "IR") {
    const inputs = getDetailInventoryInputs(primaryDetail)
    const nextInputs = inputs.some((line) => hasActiveInventoryLine(line))
      ? inputs
      : [...inputs, createDefaultInventoryInputLine(companyCd, headerDate)]

    return [
      {
        ...primaryDetail,
        INVENTORY_INPUTS: nextInputs,
        HASINVENTORY: nextInputs.some((line) => hasActiveInventoryLine(line)) ||
          getDetailInventoryOutputs(primaryDetail).some((line) => hasActiveInventoryLine(line)),
      },
      ...restDetails,
    ]
  }

  const outputs = getDetailInventoryOutputs(primaryDetail)
  const nextOutputs = outputs.some((line) => hasActiveInventoryLine(line))
    ? outputs
    : [...outputs, createDefaultInventoryOutputLine(companyCd, headerDate)]

  return [
    {
      ...primaryDetail,
      INVENTORY_OUTPUTS: nextOutputs,
      HASINVENTORY: getDetailInventoryInputs(primaryDetail).some((line) => hasActiveInventoryLine(line)) ||
        nextOutputs.some((line) => hasActiveInventoryLine(line)),
    },
    ...restDetails,
  ]
}

export function normalizeInventoryDraftForEditor(record: ChitInfo, chitType: ChitType): ChitInfo {
  if (!isInventoryOnlyVoucherType(chitType)) {
    return record
  }

  const normalizedDetails = ensureInventoryEditorDefaultLine(
    normalizeInventoryOnlyDetails(
      (record.DETAILS ?? []) as InventoryVoucherDetailRow[],
      record.COMPANY_CD,
      record.CHIT_YMD,
      chitType,
    ),
    record.COMPANY_CD,
    record.CHIT_YMD,
    chitType,
  )
  const activeDetails = getActiveInventoryDetailRows(normalizedDetails)

  return {
    ...record,
    DETAILS: normalizedDetails as ChitInfo["DETAILS"],
    DETAIL_COUNT: activeDetails.length,
    AMOUNT: calculateChitAmount(activeDetails),
  }
}

export function mergeInventoryIntoDetails(
  details: InventoryVoucherDetailRow[],
  sourceDetails: InventoryVoucherDetailRow[],
) {
  const inputMap = new Map<string, InventoryInputLine[]>()
  const outputMap = new Map<string, InventoryOutputLine[]>()

  sourceDetails.forEach((row, index) => {
    const key = String(row.CHITDETAIL_ID ?? row.ROW_KEY ?? index)
    inputMap.set(key, getDetailInventoryInputs(row))
    outputMap.set(key, getDetailInventoryOutputs(row))
  })

  return details.map((row, index) => {
    const key = String(row.CHITDETAIL_ID ?? row.ROW_KEY ?? index)
    const inputs = inputMap.get(key) ?? getDetailInventoryInputs(row)
    const outputs = outputMap.get(key) ?? getDetailInventoryOutputs(row)

    return {
      ...row,
      INVENTORY_INPUTS: inputs,
      INVENTORY_OUTPUTS: outputs,
      HASINVENTORY: inputs.some((line) => hasActiveInventoryLine(line)) || outputs.some((line) => hasActiveInventoryLine(line)),
    }
  })
}

export function createInventoryVoucherDraft(
  chitType: InventoryOnlyChitType,
  companyCd: string,
  userId = "",
): ChitInfo {
  const baseDraft = createDefaultChit(chitType, companyCd, userId)
  const detail = createInventoryOnlyDetailRow(companyCd, baseDraft.CHIT_YMD)

  if (chitType === "IR") {
    detail.INVENTORY_INPUTS = [createDefaultInventoryInputLine(companyCd, baseDraft.CHIT_YMD)]
  } else {
    detail.INVENTORY_OUTPUTS = [createDefaultInventoryOutputLine(companyCd, baseDraft.CHIT_YMD)]
  }

  return normalizeInventoryDraftForEditor(
    {
      ...baseDraft,
      DETAILS: [detail],
      DETAIL_COUNT: 1,
      AMOUNT: 0,
    },
    chitType,
  )
}

export function mapInventoryVoucherToApiPayload(record: ChitInfo): ChitApi {
  const normalizedDetails = prepareInventoryOnlyDetailsForSave(
    (record.DETAILS ?? []) as InventoryVoucherDetailRow[],
    record.COMPANY_CD,
    record.CHIT_YMD,
    record.CHIT_TYPE,
  ).filter((detail) => !detail.ISDEL)
  const primaryDetail = normalizedDetails[0] ?? createInventoryOnlyDetailRow(record.COMPANY_CD, record.CHIT_YMD)
  const activeInventoryInputs = getDetailInventoryInputs(primaryDetail).filter((line) => hasActiveInventoryLine(line))
  const activeInventoryOutputs = getDetailInventoryOutputs(primaryDetail).filter((line) => hasActiveInventoryLine(line))
  const inventoryInputs = activeInventoryInputs.map((line, index) =>
    mapInventoryInputToApiPayload({
      ...line,
      SORT: line.SORT ?? index + 1,
    }),
  )
  const inventoryOutputs = activeInventoryOutputs.map((line, index) =>
    mapInventoryOutputToApiPayload({
      ...line,
      SORT: line.SORT ?? index + 1,
    }),
  )
  const totalAmount =
    record.CHIT_TYPE === "IR"
      ? calculateInventoryLinesAmount(activeInventoryInputs)
      : calculateInventoryLinesAmount(activeInventoryOutputs)
  const detailPayload: ChitDetailApi = {
    ...mapChitDetailToApiPayload(primaryDetail),
    CHITDETAIL_ID: null,
    COMPANY_CD: trimText(record.COMPANY_CD),
    CHIT_ID: record.CHIT_ID,
    CHITDETAIL_CD: "",
    CHIT_YMD: normalizeDate(record.CHIT_YMD),
    INVENTORY_YMD: normalizeDateTime(primaryDetail.INVENTORY_YMD ?? record.CHIT_YMD ?? null),
    AMOUNT: totalAmount,
    SORT: 1,
    ISDEL: "0",
    HASINVENTORY: toFlag(inventoryInputs.length > 0 || inventoryOutputs.length > 0),
    INVENTORY_INPUTS: inventoryInputs,
    INVENTORY_OUTPUTS: inventoryOutputs,
  }

  return {
    CHIT_ID: record.CHIT_ID,
    COMPANY_CD: trimText(record.COMPANY_CD),
    CHIT_CD: trimText(record.CHIT_CD),
    CHIT_NO: trimText(record.CHIT_NO),
    CHIT_YMD: normalizeDate(record.CHIT_YMD),
    CHIT_TYPE: record.CHIT_TYPE,
    AMOUNT: totalAmount,
    PAYER_INFO: trimText(record.PAYER_INFO),
    ISDEL: toFlag(record.ISDEL),
    IS_LOCK: toFlag(record.IS_LOCK),
    ISEXCEL: toFlag(record.ISEXCEL),
    EMAIL_EPAY: trimText(record.EMAIL_EPAY),
    IS_CONFIRMED: toFlag(record.IS_CONFIRMED),
    NOTE: trimText(record.NOTE),
    DAY_OF_PAYMENT: record.DAY_OF_PAYMENT,
    TIME_FOR_PAYMENT: trimText(record.TIME_FOR_PAYMENT),
    IS_PAYMENT: toFlag(record.IS_PAYMENT),
    CHIT_CD_COGS: trimText(record.CHIT_CD_COGS),
    DESCRIPTION_VIET: trimText(record.DESCRIPTION_VIET),
    DESCRIPTION_ENG: trimText(record.DESCRIPTION_ENG),
    DESCRIPTION_KOR: trimText(record.DESCRIPTION_KOR),
    DETAILS: [detailPayload],
  }
}
