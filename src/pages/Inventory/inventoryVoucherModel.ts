import { DEFAULT_CURRENCY_CODE } from "@/lib/currency"
import type {
  ChitDateValue,
  InventoryInputType,
  InventoryInputApi,
  InventoryInputLine,
  InventoryOutputApi,
  InventoryOutputLine,
  InventoryVoucher,
  InventoryVoucherApi,
} from "@/types/voucher"

import {
  createRowKey,
  mapInventoryInputToApiPayload,
  mapInventoryOutputToApiPayload,
  normalizeInventoryInputApi,
  normalizeInventoryOutputApi,
} from "@/pages/VoucherManagement/chitUtils"

export type InventoryVoucherType = InventoryVoucher["CHIT_TYPE"]
export type InventoryLine = InventoryInputLine | InventoryOutputLine

const trimText = (value: unknown): string => String(value ?? "").trim()
const toFlag = (value: boolean): "1" | "0" => (value ? "1" : "0")
const toBool = (value: unknown): boolean => value === true || value === "1" || String(value).toLowerCase() === "true"

export function getInventoryLedger(chitType: InventoryVoucherType): InventoryInputType {
  if (chitType === "IR") {
    return "AP"
  }

  return chitType === "IO" ? "AR" : "INV"
}

export function formatInventoryDate(value: ChitDateValue): ChitDateValue {
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
    return Number.isNaN(parsed.getTime()) ? text : formatDate(parsed)
  }

  const trimmed = String(value).trim()
  if (/^\d{8}$/.test(trimmed)) {
    return trimmed
  }

  const cleaned = trimmed.replace(/[-/.:\s]/g, "")
  if (/^\d{8}$/.test(cleaned)) {
    return cleaned
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? trimmed : formatDate(parsed)
}

export function formatInventoryDateTime(value: ChitDateValue): ChitDateValue {
  if (value == null || value === "") {
    return value
  }

  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hour = String(date.getHours()).padStart(2, "0")
    const minute = String(date.getMinutes()).padStart(2, "0")
    const second = String(date.getSeconds()).padStart(2, "0")
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`
  }

  const date = value instanceof Date ? value : new Date(String(value).trim())
  return Number.isNaN(date.getTime()) ? String(value) : formatDateTime(date)
}

export function calculateInventoryLineAmount(line: InventoryLine): number {
  const explicitAmount = Number(line.AMOUNT_CC ?? 0)
  if (Number.isFinite(explicitAmount) && explicitAmount !== 0) {
    return explicitAmount
  }

  const quantity = Number(line.QUANTITY ?? 0)
  const unitPrice = Number(line.UNIT_PRICE_CC ?? 0)
  return (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0)
}

export function calculateInventoryAmount(lines: readonly InventoryLine[]): number {
  return lines.reduce((total, line) => total + (line.ISDEL ? 0 : calculateInventoryLineAmount(line)), 0)
}

function getInventoryVoucherAmount(record: InventoryVoucher): number {
  if (record.CHIT_TYPE === "IR") {
    return calculateInventoryAmount(record.INPUTS)
  }

  if (record.CHIT_TYPE === "IO") {
    return calculateInventoryAmount(record.OUTPUTS)
  }

  return Math.max(calculateInventoryAmount(record.INPUTS), calculateInventoryAmount(record.OUTPUTS))
}

export function hasInventoryLineContent(line: InventoryLine): boolean {
  if (line.ISDEL) {
    return false
  }

  if ((Number(line.CHITDETAIL_ID ?? 0) > 0) || String(line.CHITDETAIL_CD ?? "").trim().length > 0) {
    return true
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
  const transferTextFields = "TO_STORE_CD" in line
    ? [line.TO_STORE_CD, line.TO_STORE_NM_VIET]
    : []

  if ([...textFields, ...transferTextFields].some((value) => trimText(value).length > 0)) {
    return true
  }

  const numericFields = [
    line.PRODUCT_ID,
    line.STORE_ID,
    line.UNIT_ID,
    line.QUANTITY,
    line.UNIT_PRICE_CC,
    line.AMOUNT_CC,
    ...("TO_STORE_ID" in line ? [line.TO_STORE_ID] : []),
  ]
  return numericFields.some((value) => {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) && parsed !== 0
  })
}

export function createDefaultInventoryInputLine(
  companyCd: string,
  headerDate: ChitDateValue,
  sort = 1,
): InventoryInputLine {
  return {
    ROW_KEY: createRowKey(),
    INPUT_ID: null,
    INPUT_CD: "",
    INVENTORY_ID: null,
    INVENTORY_CD: "",
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

export function createDefaultInventoryOutputLine(
  companyCd: string,
  headerDate: ChitDateValue,
  sort = 1,
): InventoryOutputLine {
  return {
    COGS_DEBIT: "",
    COGS_CREDIT: "",
    ROW_KEY: createRowKey(),
    OUTPUT_ID: null,
    OUTPUT_CD: "",
    INVENTORY_ID: null,
    INVENTORY_CD: "",
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
    QUANTITY: 1,
    UNIT_PRICE_CC: null,
    FC_TYPE: DEFAULT_CURRENCY_CODE,
    UNIT_PRICE_FC: 0,
    EXCHANGE_RATES: 0,
    AMOUNT_CC: null,
    AMOUNT_FC: 0,
    SUMMARY: "",
    INVENTORY_YMD: headerDate ?? null,
    INPUT_INVENTORY_YMD: headerDate ?? null,
    OUTPUT_INVENTORY_YMD: headerDate ?? null,
    STATE: "1",
    CHITDETAIL_ID: null,
    CHITDETAIL_CD: "",
    SORT: sort,
    ISDEL: false,
  }
}

export function createDefaultInventoryVoucher(
  chitType: InventoryVoucherType,
  companyCd: string,
  _userId = "",
): InventoryVoucher {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const headerDate = formatInventoryDate(today)
  const base: InventoryVoucher = {
    CHIT_ID: null,
    COMPANY_CD: companyCd,
    INPUT_TYPE: getInventoryLedger(chitType),
    CHIT_CD: "",
    CHIT_NO: "",
    CHIT_YMD: headerDate,
    CHIT_TYPE: chitType,
    AMOUNT: 0,
    TOTAL_QTY: 0,
    REMARK: "",
    PAYER_INFO: "",
    ISDEL: false,
    IS_LOCK: false,
    ISEXCEL: false,
    EMAIL_EPAY: "",
    IS_CONFIRMED: false,
    NOTE: "",
    DAY_OF_PAYMENT: null,
    TIME_FOR_PAYMENT: "",
    IS_PAYMENT: false,
    CHIT_CD_COGS: "",
    DESCRIPTION_VIET: "",
    DESCRIPTION_ENG: "",
    DESCRIPTION_KOR: "",
    INPUTS: [],
    OUTPUTS: [],
  }

  return ensureInventoryDefaultLine(base)
}

function resetInventoryInputLineForNewVoucher(
  line: InventoryInputLine,
  companyCd: string,
  headerDate: ChitDateValue,
  sort: number,
): InventoryInputLine {
  return {
    ...line,
    ROW_KEY: createRowKey(),
    INPUT_ID: null,
    INPUT_CD: "",
    INVENTORY_ID: null,
    INVENTORY_CD: "",
    CHIT_TYPE: "IR",
    COMPANY_CD: companyCd || line.COMPANY_CD,
    INVENTORY_YMD: line.INVENTORY_YMD ?? headerDate ?? null,
    STATE: line.STATE || "1",
    CHITDETAIL_ID: null,
    CHITDETAIL_CD: "",
    SORT: sort,
    ISDEL: false,
  }
}

function resetInventoryOutputLineForNewVoucher(
  line: InventoryOutputLine,
  companyCd: string,
  headerDate: ChitDateValue,
  sort: number,
  chitType: InventoryVoucherType = "IO",
  inputInventoryYmd?: ChitDateValue,
): InventoryOutputLine {
  return {
    ...line,
    ROW_KEY: createRowKey(),
    OUTPUT_ID: null,
    OUTPUT_CD: "",
    INVENTORY_ID: null,
    INVENTORY_CD: "",
    CHIT_TYPE: chitType,
    COMPANY_CD: companyCd || line.COMPANY_CD,
    INVENTORY_YMD: line.OUTPUT_INVENTORY_YMD ?? line.INVENTORY_YMD ?? headerDate ?? null,
    INPUT_INVENTORY_YMD: inputInventoryYmd ?? line.INPUT_INVENTORY_YMD ?? headerDate ?? null,
    OUTPUT_INVENTORY_YMD: line.OUTPUT_INVENTORY_YMD ?? line.INVENTORY_YMD ?? headerDate ?? null,
    STATE: line.STATE || "1",
    CHITDETAIL_ID: null,
    CHITDETAIL_CD: "",
    SORT: sort,
    ISDEL: false,
  }
}

export function createInventoryVoucherCopy(
  source: InventoryVoucher,
  chitType: InventoryVoucherType,
  companyCd: string,
  userId = "",
): InventoryVoucher {
  const base = createDefaultInventoryVoucher(chitType, companyCd, userId)
  const targetCompanyCd = companyCd || source.COMPANY_CD || base.COMPANY_CD
  const headerDate = source.CHIT_YMD ?? base.CHIT_YMD
  const inputs = chitType === "IR"
    ? source.INPUTS
      .filter((line) => !line.ISDEL)
      .map((line, index) => resetInventoryInputLineForNewVoucher(line, targetCompanyCd, headerDate, index + 1))
    : chitType === "IA"
      ? source.INPUTS
        .filter((line) => !line.ISDEL)
        .map((line, index) => ({
          ...resetInventoryInputLineForNewVoucher(line, targetCompanyCd, headerDate, index + 1),
          CHIT_TYPE: "IA",
        }))
    : []
  const outputs = chitType === "IO"
    ? source.OUTPUTS
      .filter((line) => !line.ISDEL)
      .map((line, index) => resetInventoryOutputLineForNewVoucher(line, targetCompanyCd, headerDate, index + 1))
    : chitType === "IA"
      ? source.OUTPUTS
        .filter((line) => !line.ISDEL)
        .map((line, index) => resetInventoryOutputLineForNewVoucher(
          line,
          targetCompanyCd,
          headerDate,
          index + 1,
          "IA",
          inputs[index]?.INVENTORY_YMD,
        ))
    : []
  const activeLines = chitType === "IR" ? inputs : outputs

  return ensureInventoryDefaultLine({
    ...base,
    ...source,
    COGS: null,
    CHIT_ID: null,
    COMPANY_CD: targetCompanyCd,
    INPUT_TYPE: getInventoryLedger(chitType),
    CHIT_CD: "",
    CHIT_NO: "",
    CHIT_YMD: headerDate,
    CHIT_TYPE: chitType,
    AMOUNT: calculateInventoryAmount(activeLines),
    ISDEL: false,
    IS_LOCK: false,
    ISEXCEL: false,
    EMAIL_EPAY: "",
    IS_CONFIRMED: false,
    INPUTS: inputs,
    OUTPUTS: outputs,
  })
}

export function normalizeInventoryVoucherApi(
  item: InventoryVoucherApi,
  chitType: InventoryVoucherType,
  companyCd: string,
): InventoryVoucher {
  const inputType =
    item.INPUT_TYPE === "AP" || item.INPUT_TYPE === "AR" || item.INPUT_TYPE === "INV"
      ? item.INPUT_TYPE
      : getInventoryLedger(chitType)
  const inputs = (item.INPUTS ?? []).map((line, index) =>
    normalizeInventoryInputApi({
      ...line,
      INVENTORY_ID: line.INVENTORY_ID ?? item.CHIT_ID ?? null,
      INVENTORY_CD: line.INVENTORY_CD ?? item.CHIT_CD ?? "",
      CHIT_TYPE: chitType === "IA" ? "IA" : "IR",
      COMPANY_CD: line.COMPANY_CD ?? item.COMPANY_CD ?? companyCd,
      SORT: line.SORT ?? index + 1,
    } as InventoryInputApi),
  )
  const outputs = (item.OUTPUTS ?? []).map((line, index) =>
    normalizeInventoryOutputApi({
      ...line,
      INVENTORY_ID: line.INVENTORY_ID ?? item.CHIT_ID ?? null,
      INVENTORY_CD: line.INVENTORY_CD ?? item.CHIT_CD ?? "",
      CHIT_TYPE: chitType === "IA" ? "IA" : "IO",
      COMPANY_CD: line.COMPANY_CD ?? item.COMPANY_CD ?? companyCd,
      SORT: line.SORT ?? index + 1,
    } as InventoryOutputApi),
  )
  const normalizedOutputs = chitType === "IA"
    ? outputs.map((line, index) => {
      const pairedInput = inputs[index]
      const outputDate = line.INVENTORY_YMD ?? item.CHIT_YMD ?? null

      return {
        ...line,
        CHIT_TYPE: "IA",
        TO_STORE_ID: line.TO_STORE_ID ?? pairedInput?.STORE_ID ?? null,
        TO_STORE_CD: trimText(line.TO_STORE_CD) || pairedInput?.STORE_CD || "",
        TO_STORE_NM_VIET: trimText(line.TO_STORE_NM_VIET) || pairedInput?.STORE_NM_VIET || "",
        TO_STORE_NM_ENG: trimText(line.TO_STORE_NM_ENG) || pairedInput?.STORE_NM_ENG || "",
        TO_STORE_NM_KOR: trimText(line.TO_STORE_NM_KOR) || pairedInput?.STORE_NM_KOR || "",
        TO_STORE_NM_CHINA: trimText(line.TO_STORE_NM_CHINA) || pairedInput?.STORE_NM_CHINA || "",
        INPUT_INVENTORY_YMD: pairedInput?.INVENTORY_YMD ?? item.CHIT_YMD ?? null,
        OUTPUT_INVENTORY_YMD: outputDate,
        INVENTORY_YMD: outputDate,
      }
    })
    : outputs
  const normalizedRecord: InventoryVoucher = {
    COGS: item.COGS,
    CHIT_ID: item.CHIT_ID ?? null,
    COMPANY_CD: trimText(item.COMPANY_CD) || companyCd,
    INPUT_TYPE: inputType,
    CHIT_CD: trimText(item.CHIT_CD),
    CHIT_NO: trimText(item.CHIT_NO),
    CHIT_YMD: item.CHIT_YMD ?? null,
    CHIT_TYPE: chitType,
    AMOUNT: item.AMOUNT ?? (chitType === "IR" ? calculateInventoryAmount(inputs) : calculateInventoryAmount(normalizedOutputs)),
    TOTAL_QTY: item.TOTAL_QTY ?? normalizedOutputs.reduce((sum, line) => sum + (line.ISDEL ? 0 : Number(line.QUANTITY ?? 0)), 0),
    REMARK: trimText(item.REMARK) || trimText(item.NOTE),
    PAYER_INFO: trimText(item.PAYER_INFO),
    ISDEL: toBool(item.ISDEL),
    IS_LOCK: toBool(item.IS_LOCK),
    ISEXCEL: toBool(item.ISEXCEL),
    EMAIL_EPAY: trimText(item.EMAIL_EPAY),
    IS_CONFIRMED: toBool(item.IS_CONFIRMED),
    NOTE: trimText(item.NOTE) || trimText(item.REMARK),
    DAY_OF_PAYMENT: item.DAY_OF_PAYMENT ?? null,
    TIME_FOR_PAYMENT: trimText(item.TIME_FOR_PAYMENT),
    IS_PAYMENT: toBool(item.IS_PAYMENT),
    CHIT_CD_COGS: trimText(item.CHIT_CD_COGS),
    DESCRIPTION_VIET: trimText(item.DESCRIPTION_VIET),
    DESCRIPTION_ENG: trimText(item.DESCRIPTION_ENG),
    DESCRIPTION_KOR: trimText(item.DESCRIPTION_KOR),
    INPUTS: inputs,
    OUTPUTS: normalizedOutputs,
  }

  return ensureInventoryDefaultLine({
    ...normalizedRecord,
    AMOUNT: normalizedRecord.AMOUNT ?? getInventoryVoucherAmount(normalizedRecord),
  })
}

export function ensureInventoryDefaultLine(record: InventoryVoucher): InventoryVoucher {
  if (record.CHIT_TYPE === "IR") {
    const activeInputs = record.INPUTS.filter((line) => !line.ISDEL)
    return {
      ...record,
      INPUTS: activeInputs.length > 0 ? record.INPUTS : [...record.INPUTS, createDefaultInventoryInputLine(record.COMPANY_CD, record.CHIT_YMD)],
      OUTPUTS: [],
    }
  }

  if (record.CHIT_TYPE === "IA") {
    const activeOutputs = record.OUTPUTS.filter((line) => !line.ISDEL)
    const outputs = activeOutputs.length > 0
      ? record.OUTPUTS.map((line) => {
        const pairedInput = record.INPUTS.find((input) => input.SORT === line.SORT)
        return {
          ...line,
          CHIT_TYPE: "IA",
          TO_STORE_ID: line.TO_STORE_ID ?? pairedInput?.STORE_ID ?? null,
          TO_STORE_CD: trimText(line.TO_STORE_CD) || pairedInput?.STORE_CD || "",
          TO_STORE_NM_VIET: trimText(line.TO_STORE_NM_VIET) || pairedInput?.STORE_NM_VIET || "",
          TO_STORE_NM_ENG: trimText(line.TO_STORE_NM_ENG) || pairedInput?.STORE_NM_ENG || "",
          TO_STORE_NM_KOR: trimText(line.TO_STORE_NM_KOR) || pairedInput?.STORE_NM_KOR || "",
          TO_STORE_NM_CHINA: trimText(line.TO_STORE_NM_CHINA) || pairedInput?.STORE_NM_CHINA || "",
          INPUT_INVENTORY_YMD: line.INPUT_INVENTORY_YMD ?? pairedInput?.INVENTORY_YMD ?? record.CHIT_YMD ?? null,
          OUTPUT_INVENTORY_YMD: line.OUTPUT_INVENTORY_YMD ?? line.INVENTORY_YMD ?? record.CHIT_YMD ?? null,
        }
      })
      : [
        {
          ...createDefaultInventoryOutputLine(record.COMPANY_CD, record.CHIT_YMD),
          CHIT_TYPE: "IA",
          INPUT_INVENTORY_YMD: record.CHIT_YMD ?? null,
          OUTPUT_INVENTORY_YMD: record.CHIT_YMD ?? null,
        },
      ]

    return {
      ...record,
      INPUTS: record.INPUTS.map((line) => ({ ...line, CHIT_TYPE: "IA" })),
      OUTPUTS: outputs,
    }
  }

  const activeOutputs = record.OUTPUTS.filter((line) => !line.ISDEL)
  return {
    ...record,
    INPUTS: [],
    OUTPUTS: activeOutputs.length > 0 ? record.OUTPUTS : [...record.OUTPUTS, createDefaultInventoryOutputLine(record.COMPANY_CD, record.CHIT_YMD)],
  }
}

function createAdjustmentInputFromOutput(
  record: InventoryVoucher,
  output: InventoryOutputLine,
  existingInput: InventoryInputLine | undefined,
  sort: number,
): InventoryInputLine {
  const inputDate = output.INPUT_INVENTORY_YMD ?? existingInput?.INVENTORY_YMD ?? record.CHIT_YMD ?? null

  return {
    ...createDefaultInventoryInputLine(record.COMPANY_CD, record.CHIT_YMD),
    INPUT_ID: existingInput?.INPUT_ID ?? null,
    INPUT_CD: existingInput?.INPUT_CD ?? "",
    INVENTORY_ID: existingInput?.INVENTORY_ID ?? record.CHIT_ID,
    INVENTORY_CD: existingInput?.INVENTORY_CD ?? record.CHIT_CD,
    CHIT_TYPE: "IA",
    COMPANY_CD: record.COMPANY_CD,
    PRODUCT_ID: output.PRODUCT_ID,
    PRODUCT_CD: output.PRODUCT_CD,
    PRODUCT_NM_VIET: output.PRODUCT_NM_VIET,
    PRODUCT_NM_ENG: output.PRODUCT_NM_ENG,
    PRODUCT_NM_KOR: output.PRODUCT_NM_KOR,
    PRODUCT_NM_CHINA: output.PRODUCT_NM_CHINA,
    STORE_ID: output.TO_STORE_ID ?? existingInput?.STORE_ID ?? output.STORE_ID,
    STORE_CD: trimText(output.TO_STORE_CD) || existingInput?.STORE_CD || output.STORE_CD,
    STORE_NM_VIET: trimText(output.TO_STORE_NM_VIET) || existingInput?.STORE_NM_VIET || output.STORE_NM_VIET,
    STORE_NM_ENG: trimText(output.TO_STORE_NM_ENG) || existingInput?.STORE_NM_ENG || output.STORE_NM_ENG,
    STORE_NM_KOR: trimText(output.TO_STORE_NM_KOR) || existingInput?.STORE_NM_KOR || output.STORE_NM_KOR,
    STORE_NM_CHINA: trimText(output.TO_STORE_NM_CHINA) || existingInput?.STORE_NM_CHINA || output.STORE_NM_CHINA,
    UNIT_ID: output.UNIT_ID,
    UNIT_CD: output.UNIT_CD,
    UNIT_NM_VIET: output.UNIT_NM_VIET,
    UNIT_NM_ENG: output.UNIT_NM_ENG,
    UNIT_NM_KOR: output.UNIT_NM_KOR,
    UNIT_NM_CHINA: output.UNIT_NM_CHINA,
    QUANTITY: output.QUANTITY,
    UNIT_PRICE_CC: output.UNIT_PRICE_CC,
    FC_TYPE: output.FC_TYPE,
    UNIT_PRICE_FC: output.UNIT_PRICE_FC,
    EXCHANGE_RATES: output.EXCHANGE_RATES,
    AMOUNT_CC: output.AMOUNT_CC,
    AMOUNT_FC: output.AMOUNT_FC,
    SUMMARY: output.SUMMARY,
    INVENTORY_YMD: inputDate,
    STATE: output.STATE,
    CHITDETAIL_ID: output.CHITDETAIL_ID,
    CHITDETAIL_CD: output.CHITDETAIL_CD,
    SORT: sort,
    ISDEL: false,
  }
}

export function mapInventoryVoucherToApiPayload(record: InventoryVoucher): InventoryVoucherApi {
  const adjustmentOutputs = record.CHIT_TYPE === "IA"
    ? record.OUTPUTS.filter(hasInventoryLineContent).map((line, index) => ({
      ...line,
      CHIT_TYPE: "IA",
      INVENTORY_YMD: formatInventoryDateTime(line.OUTPUT_INVENTORY_YMD ?? line.INVENTORY_YMD ?? record.CHIT_YMD),
      SORT: line.SORT ?? index + 1,
    }))
    : []
  const activeInputs = record.CHIT_TYPE === "IR"
    ? record.INPUTS.filter(hasInventoryLineContent).map((line, index) => ({
      ...line,
      SORT: line.SORT ?? index + 1,
    }))
    : record.CHIT_TYPE === "IA"
      ? adjustmentOutputs.map((line, index) =>
        createAdjustmentInputFromOutput(record, line, record.INPUTS.filter((input) => !input.ISDEL)[index], index + 1),
      )
    : []
  const activeOutputs = record.CHIT_TYPE === "IO"
    ? record.OUTPUTS.filter(hasInventoryLineContent).map((line, index) => ({
      ...line,
      SORT: line.SORT ?? index + 1,
    }))
    : record.CHIT_TYPE === "IA"
      ? adjustmentOutputs
    : []
  if (record.CHIT_TYPE === "IO") {
    for (const line of activeOutputs) {
      if (line.AMOUNT_CC === null || !Number.isFinite(line.AMOUNT_CC) || line.AMOUNT_CC < 0) {
        throw new Error(`Dòng xuất kho ${line.PRODUCT_CD}: giá vốn không hợp lệ hoặc chưa được nhập.`)
      }
    }
  }
  const totalAmount = record.CHIT_TYPE === "IR"
    ? calculateInventoryAmount(activeInputs)
    : record.CHIT_TYPE === "IO"
      ? calculateInventoryAmount(activeOutputs)
      : Math.max(calculateInventoryAmount(activeInputs), calculateInventoryAmount(activeOutputs))
  const quantityLines = record.CHIT_TYPE === "IR" ? activeInputs : activeOutputs
  const totalQty = quantityLines.reduce((sum, line) => sum + Number(line.QUANTITY ?? 0), 0)
  return {
    CHIT_ID: record.CHIT_ID,
    COMPANY_CD: trimText(record.COMPANY_CD),
    INPUT_TYPE: record.INPUT_TYPE,
    CHIT_CD: trimText(record.CHIT_CD),
    CHIT_NO: trimText(record.CHIT_NO),
    CHIT_YMD: formatInventoryDate(record.CHIT_YMD),
    CHIT_TYPE: record.CHIT_TYPE,
    AMOUNT: totalAmount,
    TOTAL_QTY: totalQty,
    REMARK: trimText(record.REMARK) || trimText(record.NOTE),
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
    INPUTS: activeInputs.map(mapInventoryInputToApiPayload),
    OUTPUTS: activeOutputs.map(mapInventoryOutputToApiPayload),
  }
}
