export type SysCodeTranslate = (key: string, fallback: string) => string
export type SysCodeValueMode = "number" | "string"
export type SysCodeLike = {
  CODE_CD?: unknown
  CODE_NAME?: unknown
} | null | undefined

function normalizeSysCodePart(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  return String(value).trim()
}

export function getSysCodeName(item: SysCodeLike): string {
  return normalizeSysCodePart(item?.CODE_NAME)
}

export function getSysCodeCd(item: SysCodeLike): string {
  return normalizeSysCodePart(item?.CODE_CD)
}

export function getSysCodeDisplayText(
  item: SysCodeLike,
  translate?: SysCodeTranslate,
): string {
  const codeName = getSysCodeName(item)
  if (!codeName) {
    return ""
  }

  return translate ? translate(codeName, codeName) : codeName
}

export function formatSysCodeOptionText(
  item: SysCodeLike,
  translate?: SysCodeTranslate,
): string {
  const codeCd = getSysCodeCd(item)
  const name = getSysCodeDisplayText(item, translate)
  if (codeCd && name && name !== codeCd) {
    return `${codeCd} - ${name}`
  }

  return name
}

export function createSysCodeDisplayExpr(translate?: SysCodeTranslate) {
  return (item: SysCodeLike) => getSysCodeDisplayText(item, translate)
}

export function createSysCodeOptionDisplayExpr(translate?: SysCodeTranslate) {
  return (item: SysCodeLike) => formatSysCodeOptionText(item, translate)
}

export function getSysCodeValue(
  item: SysCodeLike,
  valueMode: SysCodeValueMode = "string",
): number | string {
  const codeCd = getSysCodeCd(item)
  if (valueMode === "string") {
    return codeCd
  }

  const numericValue = Number(codeCd)
  return Number.isNaN(numericValue) ? codeCd : numericValue
}

export function createSysCodeValueExpr(valueMode: SysCodeValueMode = "string") {
  return (item: SysCodeLike) => getSysCodeValue(item, valueMode)
}
