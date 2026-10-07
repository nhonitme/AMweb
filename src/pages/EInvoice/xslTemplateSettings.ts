/** Read/write Mau2-style xsl:param values so designer options persist in XSLT. */

export type XslTemplateSettings = {
  fontFamily: string
  fontSizePx: number
  titleFontSizePx: number
  labelEnFontSizePx: number
  fontColor: string
  fontStyle: "normal" | "italic" | "bold" | "bold-italic"
  logoMaxSizePx: number
  logoOffsetXPx: number
  logoOffsetYPx: number
  backgroundSizePercent: number
  backgroundOpacityPercent: number
  backgroundOffsetXPx: number
  backgroundOffsetYPx: number
  nenSizePercent: number
  nenOpacityPercent: number
  nenOffsetXPx: number
  nenOffsetYPx: number
  borderWidthPx: number
  borderSlicePercent: number
  borderColor: string
  logoImage: string
  backgroundImage: string
  nenImage: string
  vienHdImage: string
  showColMaHang: boolean
  showColDvt: boolean
  showColSLuong: boolean
  showColDGia: boolean
  showColThTien: boolean
  showColTSuat: boolean
  showColTienThue: boolean
  showColThanhToan: boolean
  showQrCode: boolean
  /** Hiện nhãn tiếng Anh trong ngoặc (class label-en). */
  showLabelEn: boolean
}

export type XslItemColumnToggleKey =
  | "showColMaHang"
  | "showColDvt"
  | "showColSLuong"
  | "showColDGia"
  | "showColThTien"
  | "showColTSuat"
  | "showColTienThue"
  | "showColThanhToan"

export const XSL_ITEM_COLUMN_TOGGLES: { key: XslItemColumnToggleKey; label: string; detect: string }[] = [
  { key: "showColMaHang", label: "Mã hàng", detect: "showColMaHang" },
  { key: "showColDvt", label: "Đơn vị tính", detect: "showColDvt" },
  { key: "showColSLuong", label: "Số lượng", detect: "showColSLuong" },
  { key: "showColDGia", label: "Đơn giá", detect: "showColDGia" },
  { key: "showColThTien", label: "Thành tiền", detect: "showColThTien" },
  { key: "showColTSuat", label: "Thuế suất", detect: "showColTSuat" },
  { key: "showColTienThue", label: "Tiền thuế GTGT", detect: "showColTienThue" },
  { key: "showColThanhToan", label: "Thành tiền thanh toán", detect: "showColThanhToan" },
]

export const defaultXslTemplateSettings: XslTemplateSettings = {
  fontFamily: "Times New Roman",
  fontSizePx: 12,
  titleFontSizePx: 16,
  labelEnFontSizePx: 11,
  fontColor: "#000000",
  fontStyle: "normal",
  logoMaxSizePx: 72,
  logoOffsetXPx: 0,
  logoOffsetYPx: 0,
  backgroundSizePercent: 42,
  backgroundOpacityPercent: 20,
  backgroundOffsetXPx: 0,
  backgroundOffsetYPx: 0,
  nenSizePercent: 100,
  nenOpacityPercent: 10,
  nenOffsetXPx: 0,
  nenOffsetYPx: 0,
  borderWidthPx: 16,
  borderSlicePercent: 11,
  borderColor: "#000000",
  logoImage: "",
  backgroundImage: "",
  nenImage: "",
  vienHdImage: "",
  showColMaHang: false,
  showColDvt: true,
  showColSLuong: true,
  showColDGia: true,
  showColThTien: true,
  showColTSuat: true,
  showColTienThue: false,
  showColThanhToan: false,
  showQrCode: false,
  showLabelEn: true,
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2 && ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"')))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function readParam(xsl: string, name: string): string | null {
  const match = xsl.match(new RegExp(`<xsl:param\\s+name="${name}"\\s+select="([^"]*)"\\s*/>`, "i"))
  return match ? unquote(match[1]) : null
}

function readIntParam(xsl: string, name: string, fallback: number): number {
  const raw = readParam(xsl, name)
  if (!raw) return fallback
  const numeric = raw.replace(/px$/i, "").trim()
  const parsed = Number.parseInt(numeric, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readBoolParam(xsl: string, name: string, fallback: boolean): boolean {
  const raw = readParam(xsl, name)
  if (raw == null) return fallback
  const normalized = raw.trim().toLowerCase()
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true
  if (normalized === "0" || normalized === "false" || normalized === "no") return false
  return fallback
}

function boolParamValue(value: boolean): string {
  return value ? "1" : "0"
}

export function getSupportedItemColumnToggles(xslContent: string | null | undefined): typeof XSL_ITEM_COLUMN_TOGGLES {
  if (!xslContent) return []
  return XSL_ITEM_COLUMN_TOGGLES.filter(item => {
    const paramPattern = new RegExp(`xsl:param\\s+name="${item.detect}"`, "i")
    const flagName = `${item.key.replace(/^showCol/, "col")}On`
    return paramPattern.test(xslContent) || xslContent.includes(`$${flagName}`)
  })
}

/** True when XSL actually branches columns (not only leftover params). */
export function hasItemColumnConditionalSupport(xslContent: string | null | undefined): boolean {
  if (!xslContent) return false
  return xslContent.includes("$itemColKeys") || /xsl:if[^>]*\$colMaHangOn/.test(xslContent) || /xsl:if[^>]*\$colTienThueOn/.test(xslContent)
}

export function buildColumnParamMap(
  settings: Pick<XslTemplateSettings, XslItemColumnToggleKey | "showQrCode" | "showLabelEn">,
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const item of XSL_ITEM_COLUMN_TOGGLES) {
    map[item.key] = boolParamValue(Boolean(settings[item.key]))
  }
  map.showQrCode = boolParamValue(Boolean(settings.showQrCode))
  map.showLabelEn = boolParamValue(Boolean(settings.showLabelEn))
  return map
}

export function hasLabelEnSupport(xslContent: string | null | undefined): boolean {
  if (!xslContent) return false
  return /class="label-en"|class='label-en'|label-en=/.test(xslContent)
}

export function hasInvoiceQrSupport(xslContent: string | null | undefined): boolean {
  if (!xslContent) return false
  return /class="seller-qr-box"|class='seller-qr-box'/.test(xslContent) && /\$qrCodeOn/.test(xslContent)
}

function readOpacityPercent(xsl: string, name: string, fallback: number): number {
  const raw = readParam(xsl, name)
  if (!raw) return fallback
  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.round(parsed <= 1 ? parsed * 100 : parsed)
}

function toXPathStringLiteral(value: string): string {
  if (!value.includes("'")) return `'${value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")}'`
  const parts = value.split("'")
  const segments: string[] = []
  parts.forEach((part, index) => {
    if (part.length > 0) {
      segments.push(`'${part.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")}'`)
    }
    if (index < parts.length - 1) segments.push(`&quot;'&quot;`)
  })
  return segments.length ? `concat(${segments.join(", ")})` : "''"
}

function upsertParam(xsl: string, name: string, value: string): string {
  const literal = toXPathStringLiteral(value)
  const pattern = new RegExp(`(<xsl:param\\s+name="${name}"\\s+select=")[^"]*("\\s*/>)`, "i")
  if (pattern.test(xsl)) {
    return xsl.replace(pattern, `$1${literal}$2`)
  }
  const insertion = `\t<xsl:param name="${name}" select="${literal}" />\n`
  const params = [...xsl.matchAll(/\s*<xsl:param\b[^>]*\/>\s*/gi)]
  if (params.length > 0) {
    const last = params[params.length - 1]
    const index = last.index ?? 0
    return `${xsl.slice(0, index + last[0].length)}${insertion}${xsl.slice(index + last[0].length)}`
  }
  // Never prepend before <?xml — that breaks Saxon ("Data at the root level is invalid").
  const stylesheetOpen = xsl.match(/<xsl:stylesheet\b[^>]*>/i) || xsl.match(/<xsl:transform\b[^>]*>/i)
  if (stylesheetOpen && typeof stylesheetOpen.index === "number") {
    const at = stylesheetOpen.index + stylesheetOpen[0].length
    return `${xsl.slice(0, at)}\n${insertion}${xsl.slice(at)}`
  }
  return xsl
}

function replaceCssInBlock(xsl: string, selector: string, property: string, value: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`(${escapedSelector}\\s*\\{(?:(?!\\}).)*?${property}\\s*:\\s*)([^;]+)(;)`, "is")
  return pattern.test(xsl) ? xsl.replace(pattern, `$1${value}$3`) : xsl
}

function upsertCssInBlock(xsl: string, selector: string, property: string, value: string): string {
  const replaced = replaceCssInBlock(xsl, selector, property, value)
  if (replaced !== xsl) return replaced
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`(${escapedSelector}\\s*\\{(?:(?!\\}).)*?)(\\s*\\})`, "is")
  return pattern.test(xsl) ? xsl.replace(pattern, `$1\t${property}: ${value};\n\t\t\t\t\t$2`) : xsl
}

function replaceVienhdBorder(xsl: string, widthPx: number, slicePercent: number): string {
  let result = xsl.replace(
    /(border:\s*)(?:<xsl:value-of select="\$borderWidthPx"\s*\/>|\d+)(px solid transparent)/i,
    `$1${widthPx}$2`,
  )
  result = result.replace(
    /(border-image:\s*var\(--vienhd-image\)\s*)(?:<xsl:value-of select="\$borderSlicePercent"\s*\/>|\d+)(% round)/i,
    `$1${slicePercent}$2`,
  )
  return result
}

function normalizeFontStyle(value: string | null | undefined): XslTemplateSettings["fontStyle"] {
  const normalized = (value ?? "normal").trim().toLowerCase()
  return normalized === "italic" || normalized === "bold" || normalized === "bold-italic" ? normalized : "normal"
}

function opacityCss(percent: number): string {
  return String(Math.min(100, Math.max(0, percent)) / 100)
}

function nenBackgroundSizeCss(percent: number): string {
  return percent >= 100 ? "cover" : `${percent}% auto`
}

function centerOffsetCss(offsetXPx: number, offsetYPx: number): string {
  return `calc(50% + ${offsetXPx}px) calc(50% + ${offsetYPx}px)`
}

function logoTransformCss(offsetXPx: number, offsetYPx: number): string {
  return `translate(${offsetXPx}px, ${offsetYPx}px)`
}

export function readXslTemplateSettings(xslContent: string | null | undefined): XslTemplateSettings {
  if (!xslContent) return { ...defaultXslTemplateSettings }
  const fontStyleRaw = readParam(xslContent, "fontStyle")
  return {
    fontFamily: readParam(xslContent, "fontFamily") || defaultXslTemplateSettings.fontFamily,
    fontSizePx: readIntParam(xslContent, "fontSizePx", defaultXslTemplateSettings.fontSizePx),
    titleFontSizePx: readIntParam(xslContent, "titleFontSizePx", defaultXslTemplateSettings.titleFontSizePx),
    labelEnFontSizePx: readIntParam(xslContent, "labelEnFontSizePx", defaultXslTemplateSettings.labelEnFontSizePx),
    fontColor: readParam(xslContent, "fontColor") || defaultXslTemplateSettings.fontColor,
    fontStyle: normalizeFontStyle(fontStyleRaw),
    logoMaxSizePx: readIntParam(xslContent, "logoMaxSizePx", defaultXslTemplateSettings.logoMaxSizePx),
    logoOffsetXPx: readIntParam(xslContent, "logoOffsetXPx", defaultXslTemplateSettings.logoOffsetXPx),
    logoOffsetYPx: readIntParam(xslContent, "logoOffsetYPx", defaultXslTemplateSettings.logoOffsetYPx),
    backgroundSizePercent: readIntParam(xslContent, "backgroundSizePercent", defaultXslTemplateSettings.backgroundSizePercent),
    backgroundOpacityPercent: readOpacityPercent(xslContent, "backgroundOpacity", defaultXslTemplateSettings.backgroundOpacityPercent),
    backgroundOffsetXPx: readIntParam(xslContent, "backgroundOffsetXPx", defaultXslTemplateSettings.backgroundOffsetXPx),
    backgroundOffsetYPx: readIntParam(xslContent, "backgroundOffsetYPx", defaultXslTemplateSettings.backgroundOffsetYPx),
    nenSizePercent: readIntParam(xslContent, "nenSizePercent", defaultXslTemplateSettings.nenSizePercent),
    nenOpacityPercent: readOpacityPercent(xslContent, "nenOpacity", defaultXslTemplateSettings.nenOpacityPercent),
    nenOffsetXPx: readIntParam(xslContent, "nenOffsetXPx", defaultXslTemplateSettings.nenOffsetXPx),
    nenOffsetYPx: readIntParam(xslContent, "nenOffsetYPx", defaultXslTemplateSettings.nenOffsetYPx),
    borderWidthPx: readIntParam(xslContent, "borderWidthPx", defaultXslTemplateSettings.borderWidthPx),
    borderSlicePercent: readIntParam(xslContent, "borderSlicePercent", defaultXslTemplateSettings.borderSlicePercent),
    borderColor: readParam(xslContent, "borderColor") || defaultXslTemplateSettings.borderColor,
    logoImage: readParam(xslContent, "logoImage") || "",
    backgroundImage: readParam(xslContent, "backgroundImage") || "",
    nenImage: readParam(xslContent, "nenImage") || "",
    vienHdImage: readParam(xslContent, "vienHdImage") || "",
    showColMaHang: readBoolParam(xslContent, "showColMaHang", defaultXslTemplateSettings.showColMaHang),
    showColDvt: readBoolParam(xslContent, "showColDvt", defaultXslTemplateSettings.showColDvt),
    showColSLuong: readBoolParam(xslContent, "showColSLuong", defaultXslTemplateSettings.showColSLuong),
    showColDGia: readBoolParam(xslContent, "showColDGia", defaultXslTemplateSettings.showColDGia),
    showColThTien: readBoolParam(xslContent, "showColThTien", defaultXslTemplateSettings.showColThTien),
    showColTSuat: readBoolParam(xslContent, "showColTSuat", defaultXslTemplateSettings.showColTSuat),
    showColTienThue: readBoolParam(xslContent, "showColTienThue", defaultXslTemplateSettings.showColTienThue),
    showColThanhToan: readBoolParam(xslContent, "showColThanhToan", defaultXslTemplateSettings.showColThanhToan),
    showQrCode: readBoolParam(xslContent, "showQrCode", defaultXslTemplateSettings.showQrCode),
    showLabelEn: readBoolParam(xslContent, "showLabelEn", defaultXslTemplateSettings.showLabelEn),
  }
}

export function clearXslImageParams(xslContent: string): string {
  if (!xslContent) return xslContent
  let result = xslContent
  result = upsertParam(result, "logoImage", "")
  result = upsertParam(result, "backgroundImage", "")
  result = upsertParam(result, "nenImage", "")
  result = upsertParam(result, "vienHdImage", "")
  return result
}

export function buildDesignerPreviewCss(settings: XslTemplateSettings): string {
  const fontStyle = settings.fontStyle === "italic" || settings.fontStyle === "bold-italic" ? "italic" : "normal"
  const fontWeight = settings.fontStyle === "bold" || settings.fontStyle === "bold-italic" ? "700" : "normal"
  const backgroundOpacity = opacityCss(settings.backgroundOpacityPercent)
  const nenOpacity = opacityCss(settings.nenOpacityPercent)
  return [
    `#main{font-family:${settings.fontFamily},Arial,sans-serif;color:${settings.fontColor};font-size:${settings.fontSizePx}px;font-weight:${fontWeight};font-style:${fontStyle}}`,
    `#main .title-block h1{font-size:${settings.titleFontSizePx}px!important;font-style:normal!important;font-weight:700!important;color:${settings.fontColor}!important}`,
    `#main .title-block .sub-title,#main .title-block .sub-title .label-en{font-size:${settings.titleFontSizePx}px!important;font-style:italic!important;font-weight:700!important}`,
    `#main .label-en{font-size:${settings.labelEnFontSizePx}px!important;font-style:italic!important;font-weight:400!important${settings.showLabelEn ? "" : ";display:none!important"}}`,
    `#main .title-block .sub-title .label-en{font-weight:700!important}`,
    settings.showLabelEn ? "" : `#main .title-block .sub-title:has(> .label-en:only-child){display:none!important}`,
    `#main .logo-img{max-width:${settings.logoMaxSizePx}px!important;max-height:${settings.logoMaxSizePx}px!important;transform:${logoTransformCss(settings.logoOffsetXPx, settings.logoOffsetYPx)}!important}`,
    `#main .invoice-bg{background-size:${settings.backgroundSizePercent}% auto!important;opacity:${backgroundOpacity}!important;background-position:${centerOffsetCss(settings.backgroundOffsetXPx, settings.backgroundOffsetYPx)}!important}`,
    `#main .invoice-nen{background-size:${nenBackgroundSizeCss(settings.nenSizePercent)}!important;opacity:${nenOpacity}!important;background-position:${centerOffsetCss(settings.nenOffsetXPx, settings.nenOffsetYPx)}!important}`,
    `#main.vienhd .page,#main .vienhd.page,.vienhd.page{border-width:${settings.borderWidthPx}px!important;border-image-slice:${settings.borderSlicePercent}%!important}`,
    `#main .invoice-page{border-color:${settings.borderColor}!important}`,
  ].join("")
}

export function applyXslTemplateSettings(xslContent: string, settings: Partial<XslTemplateSettings>): string {
  const merged: XslTemplateSettings = { ...readXslTemplateSettings(xslContent), ...settings }
  const fontStyleCss = merged.fontStyle === "italic" || merged.fontStyle === "bold-italic" ? "italic" : "normal"
  const fontWeightCss = merged.fontStyle === "bold" || merged.fontStyle === "bold-italic" ? "700" : "normal"
  const backgroundOpacity = opacityCss(merged.backgroundOpacityPercent)
  const nenOpacity = opacityCss(merged.nenOpacityPercent)
  const nenBackgroundSize = nenBackgroundSizeCss(merged.nenSizePercent)
  const backgroundPosition = centerOffsetCss(merged.backgroundOffsetXPx, merged.backgroundOffsetYPx)
  const nenPosition = centerOffsetCss(merged.nenOffsetXPx, merged.nenOffsetYPx)
  const logoTransform = logoTransformCss(merged.logoOffsetXPx, merged.logoOffsetYPx)

  let result = xslContent
  result = upsertParam(result, "fontFamily", merged.fontFamily)
  result = upsertParam(result, "fontSizePx", String(merged.fontSizePx))
  result = upsertParam(result, "titleFontSizePx", String(merged.titleFontSizePx))
  result = upsertParam(result, "labelEnFontSizePx", String(merged.labelEnFontSizePx))
  result = upsertParam(result, "fontColor", merged.fontColor)
  result = upsertParam(result, "fontStyle", merged.fontStyle)
  result = upsertParam(result, "logoMaxSizePx", String(merged.logoMaxSizePx))
  result = upsertParam(result, "logoOffsetXPx", String(merged.logoOffsetXPx))
  result = upsertParam(result, "logoOffsetYPx", String(merged.logoOffsetYPx))
  result = upsertParam(result, "backgroundSizePercent", String(merged.backgroundSizePercent))
  result = upsertParam(result, "backgroundOpacity", backgroundOpacity)
  result = upsertParam(result, "backgroundOffsetXPx", String(merged.backgroundOffsetXPx))
  result = upsertParam(result, "backgroundOffsetYPx", String(merged.backgroundOffsetYPx))
  result = upsertParam(result, "nenSizePercent", String(merged.nenSizePercent))
  result = upsertParam(result, "nenOpacity", nenOpacity)
  result = upsertParam(result, "nenOffsetXPx", String(merged.nenOffsetXPx))
  result = upsertParam(result, "nenOffsetYPx", String(merged.nenOffsetYPx))
  result = upsertParam(result, "borderWidthPx", String(merged.borderWidthPx))
  result = upsertParam(result, "borderSlicePercent", String(merged.borderSlicePercent))
  result = upsertParam(result, "borderColor", merged.borderColor)
  result = upsertParam(result, "logoImage", "")
  result = upsertParam(result, "backgroundImage", "")
  result = upsertParam(result, "nenImage", "")
  result = upsertParam(result, "vienHdImage", "")

  for (const toggle of getSupportedItemColumnToggles(xslContent)) {
    result = upsertParam(result, toggle.key, boolParamValue(merged[toggle.key]))
  }
  result = upsertParam(result, "showQrCode", boolParamValue(merged.showQrCode))
  result = upsertParam(result, "showLabelEn", boolParamValue(merged.showLabelEn))
  result = upsertParam(result, "qrCodeImage", "")

  result = replaceCssInBlock(result, "html, body", "font-family", `"${merged.fontFamily}", Arial, sans-serif`)
  result = replaceCssInBlock(result, "html, body", "font-size", `${merged.fontSizePx}px`)
  result = replaceCssInBlock(result, "html, body", "color", merged.fontColor)
  result = replaceCssInBlock(result, "html, body", "font-style", fontStyleCss)
  result = replaceCssInBlock(result, "html, body", "font-weight", fontWeightCss)
  result = replaceCssInBlock(result, ".logo-img", "max-width", `${merged.logoMaxSizePx}px`)
  result = replaceCssInBlock(result, ".logo-img", "max-height", `${merged.logoMaxSizePx}px`)
  result = upsertCssInBlock(result, ".logo-img", "transform", logoTransform)
  result = replaceCssInBlock(result, ".invoice-bg", "background-size", `${merged.backgroundSizePercent}% auto`)
  result = replaceCssInBlock(result, ".invoice-bg", "opacity", backgroundOpacity)
  result = upsertCssInBlock(result, ".invoice-bg", "background-position", backgroundPosition)
  result = replaceCssInBlock(result, ".page-bg", "background-size", `${merged.backgroundSizePercent}% auto`)
  result = replaceCssInBlock(result, ".page-bg", "opacity", backgroundOpacity)
  result = upsertCssInBlock(result, ".page-bg", "background-position", backgroundPosition)
  result = replaceCssInBlock(result, ".invoice-nen", "background-size", nenBackgroundSize)
  result = replaceCssInBlock(result, ".invoice-nen", "opacity", nenOpacity)
  result = upsertCssInBlock(result, ".invoice-nen", "background-position", nenPosition)
  result = replaceCssInBlock(result, ".page-nen", "background-size", `${merged.nenSizePercent}% auto`)
  result = replaceCssInBlock(result, ".page-nen", "opacity", nenOpacity)
  result = upsertCssInBlock(result, ".page-nen", "background-position", nenPosition)
  result = replaceCssInBlock(result, ".title", "font-size", `${merged.titleFontSizePx}px`)
  result = upsertCssInBlock(result, ".invoice-page", "border-color", merged.borderColor)
  result = replaceVienhdBorder(result, merged.borderWidthPx, merged.borderSlicePercent)

  return result
}
