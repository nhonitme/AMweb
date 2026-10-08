import type {
  EInvoiceDeclaration,
  EInvoiceDeclarationApi,
  EInvoiceDeclarationDetail,
  EInvoiceDeclarationDetailApi,
  EInvoiceDeclarationDetailType,
} from "@/types/einvoiceDeclaration"
import type { CompanyInfo } from "@/types/companyInfo"
import type { SysCode } from "@/api/sysCodeService"
import { isSysCodeActive, isSysCodeDeleted } from "@/api/sysCodeService"
import type { EInvoicePluginCertificate } from "@/api/einvoiceSigningPluginApi"
import { resolveCertificateOrganizationName } from "@/api/einvoiceSigningPluginApi"

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function trimCompanyText(value: string | null | undefined): string {
  return toText(value).trim()
}

function buildDeclarationPlaceFromCompanyInfo(companyInfo: CompanyInfo): string {
  return [trimCompanyText(companyInfo.SIDO), trimCompanyText(companyInfo.GUMYUN)].filter((value) => value.length > 0).join(", ")
}

function toNumber(value: unknown, fallback = 0): number {
  const numberValue = typeof value === "number" ? value : Number(value ?? fallback)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function toFlag(value: unknown): number {
  return toNumber(value, 0) === 1 ? 1 : 0
}

function toDateText(value: unknown): string {
  const text = toText(value).trim()
  return text.length >= 10 ? text.slice(0, 10) : text
}

function parseDateTimeValue(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const text = value.trim()
  if (!text) {
    return null
  }

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (match) {
    const parsed = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4] ?? 0),
      Number(match[5] ?? 0),
      Number(match[6] ?? 0),
    )
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatCertificateDateTime(value: string | Date | null | undefined): string {
  const parsed = value instanceof Date ? value : parseDateTimeValue(toText(value))
  if (!parsed) {
    return ""
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, "0")
  const day = String(parsed.getDate()).padStart(2, "0")
  const hours = String(parsed.getHours()).padStart(2, "0")
  const minutes = String(parsed.getMinutes()).padStart(2, "0")
  const seconds = String(parsed.getSeconds()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

function toDetailDateText(value: unknown, detailType: EInvoiceDeclarationDetailType): string {
  if (detailType === "CTS") {
    return formatCertificateDateTime(toText(value))
  }

  return toDateText(value)
}

function toGenderValue(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value === 0 || value === 1) {
      return value
    }
    return null
  }

  const text = toText(value).trim().toUpperCase()
  if (text === "M" || text === "1" || text === "NAM") {
    return 1
  }

  if (text === "F" || text === "0" || text === "NU") {
    return 0
  }

  const numeric = toNumber(value, Number.NaN)
  if (numeric === 0 || numeric === 1) {
    return numeric
  }

  return null
}

const VALID_DETAIL_TYPES: ReadonlySet<EInvoiceDeclarationDetailType> = new Set([
  "CTS",
  "TCGP",
  "TCTN",
  "DVHTPT",
  "DVDUQTCUU",
  "TNSDUNG",
  "DKTH",
])

function toDetailType(value: unknown): EInvoiceDeclarationDetailType {
  const detailType = toText(value, "CTS").trim().toUpperCase() as EInvoiceDeclarationDetailType
  if (VALID_DETAIL_TYPES.has(detailType)) {
    return detailType
  }
  return "CTS"
}

export function formatDateForApi(value: Date | null): string | undefined {
  if (!value || Number.isNaN(value.getTime())) {
    return undefined
  }

  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseDate(value: string | null | undefined): Date | null {
  const text = toDateText(value)
  if (!text) {
    return null
  }

  const date = new Date(`${text}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function createDeclarationToday(): string {
  return formatDateForApi(new Date()) ?? ""
}

export function isDeclarationSigned(record: Pick<EInvoiceDeclaration, "IS_SIGNED"> | null | undefined): boolean {
  if (!record) {
    return false
  }

  return toNumber(record.IS_SIGNED, 0) === 1
}

export function isDeclarationEditable(record: Pick<EInvoiceDeclaration, "IS_SIGNED"> | null | undefined): boolean {
  return !isDeclarationSigned(record)
}

export function formatDeclarationCqtStatusText(
  status: number | null | undefined,
  options: DeclarationMethodOption[],
): string {
  const value = toNumber(status, 0)
  const matched = options.find((option) => option.value === value)?.text
  if (matched) {
    return matched
  }

  if (options.length === 0) {
    return ""
  }

  return String(value)
}

export function formatDeclarationSignedLabel(
  record: Pick<EInvoiceDeclaration, "IS_SIGNED"> | null | undefined,
  signedYes: string,
  signedNo: string,
): string {
  return isDeclarationSigned(record) ? signedYes : signedNo
}

export function formatDeclarationStatusSummary(
  record: Pick<EInvoiceDeclaration, "IS_SIGNED" | "CQT_STATUS"> | null | undefined,
  statusOptions: DeclarationMethodOption[],
  signedYes: string,
  signedNo: string,
): string {
  if (!record) {
    return ""
  }

  const signedLabel = formatDeclarationSignedLabel(record, signedYes, signedNo)
  const statusLabel = formatDeclarationCqtStatusText(record.CQT_STATUS, statusOptions)
  return `${signedLabel} · ${statusLabel}`
}

export function formatDeclarationTaxpayerSummaryText(
  record: Pick<EInvoiceDeclaration, "TNNT" | "MST" | "CQTQLY" | "ERROR_MESSAGE"> | null | undefined,
): string {
  if (!record) {
    return ""
  }

  return [
    trimCompanyText(record.TNNT),
    trimCompanyText(record.MST),
    trimCompanyText(record.CQTQLY),
    trimCompanyText(record.ERROR_MESSAGE),
  ]
    .filter((line) => line.length > 0)
    .join("\n")
}

export const EINV_DECLARATION_METHOD_CODE_TYPE = "EINV_DECLARATION_METHOD"
export const EINV_CERTIFICATE_METHOD_CODE_TYPE = "EINV_CERTIFICATE_METHOD"
export const EINV_TKHAI_CQT_STATUS_CODE_TYPE = "EINV_TKHAI_CQT_STATUS"
export const GENDER_CODE_TYPE = "GENDER"

export type DeclarationMethodOption = {
  value: number
  text: string
}

type SysCodeTranslate = (key: string, fallback: string) => string

function getActiveSortedSysCodes(codes: SysCode[]): SysCode[] {
  return codes
    .filter((code) => Number(code.IS_ACTIVE ?? 0) === 1 && String(code.ISDEL ?? "0") !== "1")
    .sort((left, right) => Number(left.SORT_ORDER ?? 0) - Number(right.SORT_ORDER ?? 0))
}

function buildNumericSysCodeOptions(
  codes: SysCode[],
  translate: SysCodeTranslate,
  isValidValue: (value: number) => boolean,
): DeclarationMethodOption[] {
  return getActiveSortedSysCodes(codes)
    .map((code) => {
      const value = Number(code.CODE_CD)
      if (!Number.isFinite(value) || !isValidValue(value)) {
        return null
      }

      const langKey = toText(code.CODE_NAME).trim()
      const fallback = langKey || String(code.CODE_CD)
      return {
        value,
        text: langKey ? translate(langKey, fallback) : fallback,
      }
    })
    .filter((option): option is DeclarationMethodOption => option !== null)
}

export function buildDeclarationMethodOptions(codes: SysCode[], translate: SysCodeTranslate): DeclarationMethodOption[] {
  return buildNumericSysCodeOptions(codes, translate, (value) => value > 0)
}

export function buildCertificateMethodOptions(codes: SysCode[], translate: SysCodeTranslate): DeclarationMethodOption[] {
  return buildNumericSysCodeOptions(codes, translate, (value) => value > 0)
}

export function buildGenderOptions(codes: SysCode[], translate: SysCodeTranslate): DeclarationMethodOption[] {
  return buildNumericSysCodeOptions(codes, translate, (value) => value === 0 || value === 1)
}

export type GenderSelectOption = {
  value: string
  text: string
}

export function buildGenderSelectOptions(codes: SysCode[], translate: SysCodeTranslate): GenderSelectOption[] {
  return getActiveSortedSysCodes(codes)
    .map((code) => {
      const codeCd = toText(code.CODE_CD).trim()
      if (codeCd !== "0" && codeCd !== "1") {
        return null
      }

      const langKey = toText(code.CODE_NAME).trim()
      const fallback = langKey || codeCd
      return {
        value: codeCd,
        text: langKey ? translate(langKey, fallback) : fallback,
      }
    })
    .filter((option): option is GenderSelectOption => option !== null)
}

export function genderToSelectValue(gtinh: number | null | undefined): string | null {
  if (gtinh === 0 || gtinh === 1) {
    return String(gtinh)
  }

  return null
}

export function genderFromSelectValue(value: unknown): number | null {
  return toGenderValue(value)
}

export function buildTkhaiCqtStatusOptions(codes: SysCode[], translate: SysCodeTranslate): DeclarationMethodOption[] {
  return buildNumericSysCodeOptions(codes, translate, (value) => value >= 0 && value <= 4)
}

export function createDefaultDeclarationDetail(index: number, detailType: EInvoiceDeclarationDetailType, tkhaiId = 0, companyCd = ""): EInvoiceDeclarationDetail {
  return {
    ROW_KEY: `new-${detailType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    DETAIL_ID: 0,
    TKHAI_ID: tkhaiId,
    COMPANY_CD: companyCd,
    DETAIL_TYPE: detailType,
    STT: index,
    TTCHUC: "",
    SERI: "",
    CTS_HTHUC: detailType === "CTS" ? 1 : null,
    TTCGP: "",
    MSTTCGP: "",
    TTCTN: "",
    MSTTCTN: "",
    TDVHTPT: "",
    MSTDVHTPT: "",
    TDVI: "",
    MSTDUQ: "",
    HDBRMVAO: detailType === "DVDUQTCUU" ? 3 : null,
    TDLHDTNGAY: "",
    TDLHDDNGAY: "",
    TGUQTNGAY: "",
    TGUQDNGAY: "",
    TLHDON: "",
    KHMSHDON: null,
    KHHDON: "",
    TENDKTH: "",
    MSTDKTH: "",
    MDICH: "",
    TNGAY: createDeclarationToday(),
    DNGAY: "",
    GCHU: "",
    RAW_DETAIL_XML: "",
    ISDEL: 0,
  }
}

export function buildCertificateDetailNote(certificate: EInvoicePluginCertificate): string {
  const noteParts = [
    certificate.taxCode.trim() ? `MST ${certificate.taxCode.trim()}` : "",
    certificate.isUsbToken ? "USB Token" : "",
    certificate.thumbprint.trim() ? `FP ${certificate.thumbprint.trim()}` : "",
  ].filter((value) => value.length > 0)

  return noteParts.join(" · ")
}

export function isCertificateAlreadyInDeclarationDetails(
  details: EInvoiceDeclarationDetail[],
  certificate: Pick<EInvoicePluginCertificate, "serialNumber" | "thumbprint">,
): boolean {
  const serial = certificate.serialNumber.trim().toUpperCase()
  const thumbprint = certificate.thumbprint.trim().toUpperCase()

  return getActiveDeclarationDetails(details)
    .filter((detail) => detail.DETAIL_TYPE === "CTS")
    .some((detail) => {
      if (serial.length > 0 && detail.SERI.trim().toUpperCase() === serial) {
        return true
      }

      if (thumbprint.length > 0 && detail.GCHU.toUpperCase().includes(thumbprint)) {
        return true
      }

      return false
    })
}

export function findDeclarationCertificateMatch(
  detail: Pick<EInvoiceDeclarationDetail, "SERI" | "GCHU">,
  certificates: EInvoicePluginCertificate[],
): EInvoicePluginCertificate | undefined {
  const serial = detail.SERI.trim().toUpperCase()
  const thumbprintFromNote = detail.GCHU.match(/FP\s+([A-F0-9]+)/i)?.[1]?.toUpperCase()

  return certificates.find((certificate) => {
    const certificateSerial = certificate.serialNumber.trim().toUpperCase()
    const certificateThumbprint = certificate.thumbprint.replace(/\s/g, "").toUpperCase()

    if (serial.length > 0 && certificateSerial === serial) {
      return true
    }

    if (thumbprintFromNote && certificateThumbprint === thumbprintFromNote) {
      return true
    }

    return false
  })
}

export function applyCtsDatesFromCertificates(
  details: EInvoiceDeclarationDetail[],
  certificates: EInvoicePluginCertificate[],
): EInvoiceDeclarationDetail[] {
  return details.map((detail) => {
    if (detail.ISDEL === 1 || detail.DETAIL_TYPE !== "CTS") {
      return detail
    }

    const matched = findDeclarationCertificateMatch(detail, certificates)
    if (!matched) {
      return detail
    }

    return {
      ...detail,
      TNGAY: formatCertificateDateTime(matched.notBefore),
      DNGAY: formatCertificateDateTime(matched.notAfter),
    }
  })
}

export function createDeclarationDetailFromCertificate(
  certificate: EInvoicePluginCertificate,
  index: number,
  tkhaiId = 0,
  companyCd = "",
  ctsMethod = 1,
): EInvoiceDeclarationDetail {
  return {
    ...createDefaultDeclarationDetail(index, "CTS", tkhaiId, companyCd),
    TTCHUC: resolveCertificateOrganizationName(certificate),
    SERI: certificate.serialNumber.trim(),
    CTS_HTHUC: ctsMethod,
    TNGAY: formatCertificateDateTime(certificate.notBefore),
    DNGAY: formatCertificateDateTime(certificate.notAfter),
    GCHU: buildCertificateDetailNote(certificate),
  }
}

export function createDeclarationDetailFromSysCode(
  sysCode: SysCode,
  detailType: Extract<EInvoiceDeclarationDetailType, "TCGP" | "TCTN">,
  index: number,
  tkhaiId = 0,
  companyCd = "",
): EInvoiceDeclarationDetail {
  const name = trimCompanyText(sysCode.CODE_NAME)
  const codeCd = trimCompanyText(sysCode.CODE_CD)
  const base = createDefaultDeclarationDetail(index, detailType, tkhaiId, companyCd)

  if (detailType === "TCGP") {
    return {
      ...base,
      TTCGP: name,
      MSTTCGP: codeCd,
    }
  }

  return {
    ...base,
    TTCTN: name,
    MSTTCTN: codeCd,
  }
}

export function isProviderAlreadyInDeclarationDetails(
  details: EInvoiceDeclarationDetail[],
  detailType: Extract<EInvoiceDeclarationDetailType, "TCGP" | "TCTN">,
  codeCd: string,
): boolean {
  const normalizedCode = trimCompanyText(codeCd)
  if (!normalizedCode) {
    return false
  }

  return getActiveDeclarationDetailsByType(details, detailType).some((detail) => {
    const taxCode = detailType === "TCGP" ? detail.MSTTCGP : detail.MSTTCTN
    return trimCompanyText(taxCode) === normalizedCode
  })
}

export function getActiveDeclarationProviderSysCodes(
  sysCodes: SysCode[] | undefined,
  details: EInvoiceDeclarationDetail[],
  detailType: Extract<EInvoiceDeclarationDetailType, "TCGP" | "TCTN">,
): SysCode[] {
  return (sysCodes ?? [])
    .filter((code) => isActiveSysCode(code))
    .filter((code) => !isProviderAlreadyInDeclarationDetails(details, detailType, code.CODE_CD))
    .sort((left, right) => toNumber(left.SORT_ORDER, 0) - toNumber(right.SORT_ORDER, 0))
}

function isActiveSysCode(code: SysCode | undefined): boolean {
  return Boolean(code && isSysCodeActive(code.IS_ACTIVE) && !isSysCodeDeleted(code.ISDEL))
}

type DeclarationProviderSysCodeMap = Pick<
  Record<string, SysCode[]>,
  "EINV_TCGP" | "EINV_TCTN" | "EINV_TCGP_DEFAULT" | "EINV_TCTN_DEFAULT"
>

export const EINV_TCGP_CODE_TYPE = "EINV_TCGP"
export const EINV_TCTN_CODE_TYPE = "EINV_TCTN"
export const EINV_TCGP_DEFAULT_CODE_TYPE = "EINV_TCGP_DEFAULT"
export const EINV_TCTN_DEFAULT_CODE_TYPE = "EINV_TCTN_DEFAULT"

function buildProviderDetailsFromSysCodes(
  codes: SysCode[] | undefined,
  detailType: Extract<EInvoiceDeclarationDetailType, "TCGP" | "TCTN">,
  companyCd: string,
  tkhaiId: number,
): EInvoiceDeclarationDetail[] {
  return (codes ?? [])
    .filter((code) => isActiveSysCode(code))
    .sort((left, right) => toNumber(left.SORT_ORDER, 0) - toNumber(right.SORT_ORDER, 0))
    .map((code, index) => createDeclarationDetailFromSysCode(code, detailType, index + 1, tkhaiId, companyCd))
}

export function createDefaultDeclarationProviderDetails(
  companyCd: string,
  tkhaiId = 0,
  sysCodeMap?: DeclarationProviderSysCodeMap,
): EInvoiceDeclarationDetail[] {
  const details = [
    ...buildProviderDetailsFromSysCodes(sysCodeMap?.EINV_TCGP_DEFAULT, "TCGP", companyCd, tkhaiId),
    ...buildProviderDetailsFromSysCodes(sysCodeMap?.EINV_TCTN_DEFAULT, "TCTN", companyCd, tkhaiId),
  ]

  return renumberDeclarationDetails(details)
}

export function applyDefaultDeclarationProviders(
  declaration: EInvoiceDeclaration,
  sysCodeMap?: DeclarationProviderSysCodeMap,
): EInvoiceDeclaration {
  return {
    ...declaration,
    DETAILS: createDefaultDeclarationProviderDetails(declaration.COMPANY_CD, declaration.TKHAI_ID, sysCodeMap),
  }
}

export function buildDeclarationProviderSysCodeMap(getCodesByType: (codeType: string) => SysCode[]): DeclarationProviderSysCodeMap {
  return {
    EINV_TCGP: getCodesByType(EINV_TCGP_CODE_TYPE),
    EINV_TCTN: getCodesByType(EINV_TCTN_CODE_TYPE),
    EINV_TCGP_DEFAULT: getCodesByType(EINV_TCGP_DEFAULT_CODE_TYPE),
    EINV_TCTN_DEFAULT: getCodesByType(EINV_TCTN_DEFAULT_CODE_TYPE),
  }
}

export function applyCompanyInfoToDeclaration(
  declaration: EInvoiceDeclaration,
  companyInfo: CompanyInfo | null | undefined,
): EInvoiceDeclaration {
  if (!companyInfo) {
    return declaration
  }

  const place = buildDeclarationPlaceFromCompanyInfo(companyInfo)
  const ownerName = trimCompanyText(companyInfo.OWNER_NM)
  const phone = trimCompanyText(companyInfo.TEL)

  return {
    ...declaration,
    TNNT: trimCompanyText(companyInfo.COMPANY_NM) || declaration.TNNT,
    MST: trimCompanyText(companyInfo.TAX_CD) || declaration.MST,
    CQTQLY: trimCompanyText(companyInfo.TCQTQLy) || declaration.CQTQLY,
    MCQTQLY: trimCompanyText(companyInfo.MCQTQLy) || declaration.MCQTQLY,
    TNDDPLUAT: ownerName || declaration.TNDDPLUAT,
    CCCDAN: trimCompanyText(companyInfo.CCCDan) || declaration.CCCDAN,
    DCLHE: trimCompanyText(companyInfo.ADDRESS) || declaration.DCLHE,
    DCTDTU: trimCompanyText(companyInfo.EMAIL) || declaration.DCTDTU,
    DTLHE: phone || declaration.DTLHE,
    DTDDPLUAT: phone || declaration.DTDDPLUAT,
    NLHE: ownerName || declaration.NLHE,
    DDANH: place || declaration.DDANH,
  }
}

export function createDefaultDeclarationWithCompanyInfo(
  companyCd: string,
  companyInfo?: CompanyInfo | null,
  sysCodeMap?: DeclarationProviderSysCodeMap,
): EInvoiceDeclaration {
  const declaration = applyCompanyInfoToDeclaration(createDefaultDeclaration(companyCd), companyInfo)
  return applyDefaultDeclarationProviders(declaration, sysCodeMap)
}

export function createDefaultDeclaration(companyCd: string): EInvoiceDeclaration {
  return {
    TKHAI_ID: 0,
    COMPANY_CD: companyCd,
    PBAN: "",
    MSO: "",
    TEN: "",
    HTHUC: 1,
    TNNT: "",
    MST: "",
    CQTQLY: "",
    MCQTQLY: "",
    TNDDPLUAT: "",
    DTDDPLUAT: "",
    CCCDAN: "",
    SHCHIEU: "",
    MQTNDDPLUAT: "VN",
    QTICH: "Việt Nam",
    NSDDPLUAT: "",
    GTINH: null,
    DCLHE: "",
    DCTDTU: "",
    NLHE: "",
    DTLHE: "",
    DDANH: "",
    NLAP: createDeclarationToday(),
    CMA: 0,
    CMTMTTIEN: 0,
    KCMTMTTIEN: 0,
    KCMA: 0,
    NNTDBKKHAN: 0,
    NNTKTDNUBND: 0,
    CQXLTSCONG: 0,
    CDLTTDCQT: 0,
    CDLQTCTN: 0,
    TCNNGOAI: 0,
    CDDU: 1,
    CDLTHDTHU: 0,
    CBTHOP: 0,
    CTTCTGDICH: 0,
    HDGTGT: 0,
    HDGTGTTHBLAI: 0,
    HDBHANG: 0,
    HDBHTHBLAI: 0,
    HDTMAI: 0,
    HDNCCNNGOAI: 0,
    HDBTSCONG: 0,
    HDBHDTQGIA: 0,
    HDKHAC: 0,
    CTU: 0,
    XML: "",
    IS_SIGNED: 0,
    CQT_STATUS: 0,
    MCCQT: "",
    MTDIEP: "",
    MGDDTU: "",
    ERROR_MESSAGE: "",
    ISDEL: 0,
    DETAILS: [],
  }
}

export function normalizeDeclarationDetail(record: EInvoiceDeclarationDetailApi, index: number, companyCd: string, tkhaiId = 0): EInvoiceDeclarationDetail {
  const detailId = toNumber(record.DETAIL_ID, 0)
  const detailType = toDetailType(record.DETAIL_TYPE)
  return {
    ...createDefaultDeclarationDetail(index + 1, detailType, tkhaiId, companyCd),
    ROW_KEY: detailId > 0 ? `detail-${detailId}` : `detail-${detailType}-${index}`,
    DETAIL_ID: detailId,
    TKHAI_ID: toNumber(record.TKHAI_ID, tkhaiId),
    COMPANY_CD: toText(record.COMPANY_CD, companyCd),
    DETAIL_TYPE: detailType,
    STT: toNumber(record.STT, index + 1),
    TTCHUC: toText(record.TTCHUC),
    SERI: toText(record.SERI),
    CTS_HTHUC: record.CTS_HTHUC === null || record.CTS_HTHUC === undefined ? null : toNumber(record.CTS_HTHUC, 1),
    TTCGP: toText(record.TTCGP),
    MSTTCGP: toText(record.MSTTCGP),
    TTCTN: toText(record.TTCTN),
    MSTTCTN: toText(record.MSTTCTN),
    TDVHTPT: toText(record.TDVHTPT),
    MSTDVHTPT: toText(record.MSTDVHTPT),
    TDVI: toText(record.TDVI),
    MSTDUQ: toText(record.MSTDUQ),
    HDBRMVAO: record.HDBRMVAO === null || record.HDBRMVAO === undefined ? null : toNumber(record.HDBRMVAO, 3),
    TDLHDTNGAY: toDateText(record.TDLHDTNGAY),
    TDLHDDNGAY: toDateText(record.TDLHDDNGAY),
    TGUQTNGAY: toDateText(record.TGUQTNGAY),
    TGUQDNGAY: toDateText(record.TGUQDNGAY),
    TLHDON: toText(record.TLHDON),
    KHMSHDON: record.KHMSHDON === null || record.KHMSHDON === undefined ? null : toNumber(record.KHMSHDON, 0),
    KHHDON: toText(record.KHHDON),
    TENDKTH: toText(record.TENDKTH),
    MSTDKTH: toText(record.MSTDKTH),
    MDICH: toText(record.MDICH),
    TNGAY: toDetailDateText(record.TNGAY, detailType),
    DNGAY: toDetailDateText(record.DNGAY, detailType),
    GCHU: toText(record.GCHU),
    RAW_DETAIL_XML: toText(record.RAW_DETAIL_XML),
    ISDEL: toFlag(record.ISDEL),
  }
}

export function normalizeDeclaration(record: EInvoiceDeclarationApi, companyCd: string): EInvoiceDeclaration {
  const tkhaiId = toNumber(record.TKHAI_ID, 0)
  const details = Array.isArray(record.DETAILS)
    ? record.DETAILS.map((detail, index) => normalizeDeclarationDetail(detail, index, companyCd, tkhaiId))
    : []

  return {
    ...createDefaultDeclaration(companyCd),
    TKHAI_ID: tkhaiId,
    COMPANY_CD: toText(record.COMPANY_CD, companyCd),
    PBAN: toText(record.PBAN),
    MSO: toText(record.MSO),
    TEN: toText(record.TEN),
    HTHUC: record.HTHUC === null || record.HTHUC === undefined ? null : toNumber(record.HTHUC, 1),
    TNNT: toText(record.TNNT),
    MST: toText(record.MST),
    CQTQLY: toText(record.CQTQLY),
    MCQTQLY: toText(record.MCQTQLY),
    TNDDPLUAT: toText(record.TNDDPLUAT),
    DTDDPLUAT: toText(record.DTDDPLUAT),
    CCCDAN: toText(record.CCCDAN),
    SHCHIEU: toText(record.SHCHIEU),
    MQTNDDPLUAT: toText(record.MQTNDDPLUAT).trim().toUpperCase() || "VN",
    QTICH: toText(record.QTICH) || "Việt Nam",
    NSDDPLUAT: toDateText(record.NSDDPLUAT),
    GTINH: null,
    DCLHE: toText(record.DCLHE),
    DCTDTU: toText(record.DCTDTU),
    NLHE: toText(record.NLHE),
    DTLHE: toText(record.DTLHE),
    DDANH: toText(record.DDANH),
    NLAP: toDateText(record.NLAP),
    CMA: toFlag(record.CMA),
    CMTMTTIEN: toFlag(record.CMTMTTIEN),
    KCMTMTTIEN: toFlag(record.KCMTMTTIEN),
    KCMA: toFlag(record.KCMA),
    NNTDBKKHAN: toFlag(record.NNTDBKKHAN),
    NNTKTDNUBND: 0,
    CQXLTSCONG: toFlag(record.CQXLTSCONG),
    CDLTTDCQT: toFlag(record.CDLTTDCQT),
    CDLQTCTN: toFlag(record.CDLQTCTN),
    TCNNGOAI: toFlag(record.TCNNGOAI),
    CDDU: toFlag(record.CDDU),
    CDLTHDTHU: toFlag(record.CDLTHDTHU),
    CBTHOP: toFlag(record.CBTHOP),
    CTTCTGDICH: toFlag(record.CTTCTGDICH),
    HDGTGT: toFlag(record.HDGTGT),
    HDGTGTTHBLAI: toFlag(record.HDGTGTTHBLAI),
    HDBHANG: toFlag(record.HDBHANG),
    HDBHTHBLAI: toFlag(record.HDBHTHBLAI),
    HDTMAI: toFlag(record.HDTMAI),
    HDNCCNNGOAI: toFlag(record.HDNCCNNGOAI),
    HDBTSCONG: toFlag(record.HDBTSCONG),
    HDBHDTQGIA: toFlag(record.HDBHDTQGIA),
    HDKHAC: toFlag(record.HDKHAC),
    CTU: toFlag(record.CTU),
    XML: toText(record.XML),
    IS_SIGNED: toNumber(record.IS_SIGNED, 0) === 1 ? 1 : 0,
    CQT_STATUS: toNumber(record.CQT_STATUS, 0),
    MCCQT: toText(record.MCCQT),
    ERROR_MESSAGE: toText(record.ERROR_MESSAGE),
    ISDEL: toFlag(record.ISDEL),
    DETAILS: renumberDeclarationDetails(details),
  }
}

export function normalizeDeclarationRows(records: EInvoiceDeclarationApi[], companyCd: string): EInvoiceDeclaration[] {
  return records.map((record) => normalizeDeclaration(record, companyCd))
}

function buildDeclarationDetailRowKey(detailType: EInvoiceDeclarationDetailType): string {
  return `new-${detailType}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createDeclarationCopy(source: EInvoiceDeclaration, companyCd: string): EInvoiceDeclaration {
  const today = createDeclarationToday()
  const details = getActiveDeclarationDetails(source.DETAILS).map((detail) => ({
    ...detail,
    ROW_KEY: buildDeclarationDetailRowKey(detail.DETAIL_TYPE),
    DETAIL_ID: 0,
    TKHAI_ID: 0,
    COMPANY_CD: companyCd,
    TNGAY: detail.DETAIL_TYPE === "TCTN" || detail.DETAIL_TYPE === "TCGP" ? today : detail.TNGAY,
    DNGAY: detail.DETAIL_TYPE === "CTS" ? detail.DNGAY : "",
    RAW_DETAIL_XML: "",
    ISDEL: 0,
  }))

  return {
    ...source,
    TKHAI_ID: 0,
    COMPANY_CD: companyCd,
    NLAP: today,
    XML: "",
    IS_SIGNED: 0,
    ERROR_MESSAGE: "",
    ISDEL: 0,
    DETAILS: renumberDeclarationDetails(details),
  }
}

export function prepareDeclarationCopy(
  source: EInvoiceDeclaration,
  companyCd: string,
  certificates: EInvoicePluginCertificate[] = [],
): EInvoiceDeclaration {
  const copied = createDeclarationCopy(source, companyCd)
  return {
    ...copied,
    DETAILS: applyCtsDatesFromCertificates(copied.DETAILS, certificates),
  }
}

export function getActiveDeclarationDetails(details: EInvoiceDeclarationDetail[]): EInvoiceDeclarationDetail[] {
  return details.filter((detail) => detail.ISDEL !== 1)
}

export function getActiveDeclarationDetailsByType(
  details: EInvoiceDeclarationDetail[],
  detailType: EInvoiceDeclarationDetailType,
): EInvoiceDeclarationDetail[] {
  return details.filter((detail) => detail.ISDEL !== 1 && detail.DETAIL_TYPE === detailType)
}

export function renumberDeclarationDetails(details: EInvoiceDeclarationDetail[]): EInvoiceDeclarationDetail[] {
  const typeIndexes: Record<EInvoiceDeclarationDetailType, number> = {
    CTS: 0,
    TCGP: 0,
    TCTN: 0,
    DVHTPT: 0,
    DVDUQTCUU: 0,
    TNSDUNG: 0,
    DKTH: 0,
  }

  return details.map((detail) => {
    if (detail.ISDEL === 1) {
      return detail
    }

    typeIndexes[detail.DETAIL_TYPE] += 1
    return { ...detail, STT: typeIndexes[detail.DETAIL_TYPE] }
  })
}

export function mapDeclarationToApiPayload(record: EInvoiceDeclaration): EInvoiceDeclarationApi {
  return {
    TKHAI_ID: record.TKHAI_ID,
    COMPANY_CD: record.COMPANY_CD,
    HTHUC: record.HTHUC,
    TNNT: record.TNNT,
    MST: record.MST,
    CQTQLY: record.CQTQLY,
    MCQTQLY: record.MCQTQLY,
    TNDDPLUAT: record.TNDDPLUAT,
    DTDDPLUAT: record.DTDDPLUAT,
    CCCDAN: record.CCCDAN,
    SHCHIEU: record.SHCHIEU,
    MQTNDDPLUAT: record.MQTNDDPLUAT,
    QTICH: record.QTICH,
    NSDDPLUAT: record.NSDDPLUAT || null,
    GTINH: null,
    DCLHE: record.DCLHE,
    DCTDTU: record.DCTDTU,
    NLHE: record.NLHE,
    DTLHE: record.DTLHE,
    DDANH: record.DDANH,
    NLAP: record.NLAP || null,
    CMA: record.CMA,
    CMTMTTIEN: record.CMTMTTIEN,
    KCMTMTTIEN: record.KCMTMTTIEN,
    KCMA: record.KCMA,
    NNTDBKKHAN: record.NNTDBKKHAN,
    NNTKTDNUBND: 0,
    CQXLTSCONG: record.CQXLTSCONG,
    CDLTTDCQT: record.CDLTTDCQT,
    CDLQTCTN: record.CDLQTCTN,
    TCNNGOAI: record.TCNNGOAI,
    CDDU: record.CDDU,
    CDLTHDTHU: record.CDLTHDTHU,
    CBTHOP: record.CBTHOP,
    CTTCTGDICH: record.CTTCTGDICH,
    HDGTGT: record.HDGTGT,
    HDGTGTTHBLAI: record.HDGTGTTHBLAI,
    HDBHANG: record.HDBHANG,
    HDBHTHBLAI: record.HDBHTHBLAI,
    HDTMAI: record.HDTMAI,
    HDNCCNNGOAI: record.HDNCCNNGOAI,
    HDBTSCONG: record.HDBTSCONG,
    HDBHDTQGIA: record.HDBHDTQGIA,
    HDKHAC: record.HDKHAC,
    CTU: record.CTU,
    IS_SIGNED: toNumber(record.IS_SIGNED, 0) === 1 ? 1 : 0,
    ERROR_MESSAGE: record.ERROR_MESSAGE,
    ISDEL: record.ISDEL,
    DETAILS: getActiveDeclarationDetails(record.DETAILS).map<EInvoiceDeclarationDetailApi>((detail) => ({
      DETAIL_ID: detail.DETAIL_ID,
      TKHAI_ID: detail.TKHAI_ID,
      COMPANY_CD: detail.COMPANY_CD,
      DETAIL_TYPE: detail.DETAIL_TYPE,
      STT: detail.STT,
      TTCHUC: detail.TTCHUC,
      SERI: detail.SERI,
      CTS_HTHUC: detail.CTS_HTHUC,
      TTCGP: detail.TTCGP,
      MSTTCGP: detail.MSTTCGP,
      TTCTN: detail.TTCTN,
      MSTTCTN: detail.MSTTCTN,
      TDVHTPT: detail.TDVHTPT,
      MSTDVHTPT: detail.MSTDVHTPT,
      TDVI: detail.TDVI,
      MSTDUQ: detail.MSTDUQ,
      HDBRMVAO: detail.HDBRMVAO,
      TDLHDTNGAY: detail.TDLHDTNGAY || null,
      TDLHDDNGAY: detail.TDLHDDNGAY || null,
      TGUQTNGAY: detail.TGUQTNGAY || null,
      TGUQDNGAY: detail.TGUQDNGAY || null,
      TLHDON: detail.TLHDON,
      KHMSHDON: detail.KHMSHDON,
      KHHDON: detail.KHHDON,
      TENDKTH: detail.TENDKTH,
      MSTDKTH: detail.MSTDKTH,
      MDICH: detail.MDICH,
      TNGAY: detail.TNGAY || null,
      DNGAY: detail.DNGAY || null,
      GCHU: detail.GCHU,
      RAW_DETAIL_XML: detail.RAW_DETAIL_XML,
      ISDEL: detail.ISDEL,
    })),
  }
}
