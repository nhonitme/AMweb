export type ConfigCaptionTranslator = (key: string, fallback: string) => string

export type ConfigCaptionFields = {
  LABEL_TEXT?: string | null
  CAPTION?: string | null
  FIELD_NAME?: string | null
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Canon: key = LABEL_TEXT if set, else FIELD_NAME. Never t(CAPTION).
 * display = t(key) or CAPTION or key.
 */
export function resolveConfigCaption(
  fields: ConfigCaptionFields,
  translate: ConfigCaptionTranslator,
): string {
  const labelText = normalizeText(fields.LABEL_TEXT)
  const fieldName = normalizeText(fields.FIELD_NAME)
  const caption = normalizeText(fields.CAPTION)
  const key = labelText || fieldName
  const fallback = caption || key

  if (!key) {
    return fallback
  }

  const translated = translate(key, fallback)
  return translated !== fallback ? translated : fallback
}

export type MenuCaptionSource = {
  code?: string | null
  name?: string | null
  labelText?: string | null
  caption?: string | null
  LABEL_TEXT?: string | null
  CAPTION?: string | null
  MENU_CODE?: string | null
  MENU_NAME?: string | null
}

export function resolveMenuCaption(
  source: MenuCaptionSource | null | undefined,
  translate: ConfigCaptionTranslator,
): string {
  if (!source) {
    return ""
  }

  try {
    const labelText = normalizeText(source.labelText || source.LABEL_TEXT)
    const code = normalizeText(source.code || source.MENU_CODE)
    const caption = normalizeText(source.caption || source.CAPTION || source.name || source.MENU_NAME)
    const primaryKey = labelText || code
    const fallback = caption || primaryKey

    if (!primaryKey) {
      return fallback
    }

    const translatedPrimary = translate(primaryKey, fallback)
    if (translatedPrimary !== fallback) {
      return translatedPrimary
    }

    if (labelText && code && code !== labelText) {
      const translatedCode = translate(code, fallback)
      if (translatedCode !== fallback) {
        return translatedCode
      }
    }

    return translatedPrimary || fallback
  } catch {
    return source.caption || source.CAPTION || source.name || source.MENU_NAME || source.code || source.MENU_CODE || ""
  }
}

export type ReportOptionCaptionSource = {
  OPTION_CODE?: string | null
  OPTION_NAME?: string | null
  LABEL_TEXT?: string | null
  CAPTION?: string | null
}

export function resolveReportOptionCaption(
  source: ReportOptionCaptionSource | null | undefined,
  translate: ConfigCaptionTranslator,
): string {
  if (!source) {
    return ""
  }

  try {
    const labelText = normalizeText(source.LABEL_TEXT)
    const optionCode = normalizeText(source.OPTION_CODE)
    const caption = normalizeText(source.CAPTION || source.OPTION_NAME)
    const primaryKey = labelText || optionCode
    const fallback = caption || primaryKey

    if (!primaryKey) {
      return fallback
    }

    const translatedPrimary = translate(primaryKey, fallback)
    if (translatedPrimary !== fallback) {
      return translatedPrimary
    }

    // LABEL_TEXT miss → try OPTION_CODE (same chain as resolveMenuCaption)
    if (labelText && optionCode && optionCode !== labelText) {
      const translatedCode = translate(optionCode, fallback)
      if (translatedCode !== fallback) {
        return translatedCode
      }
    }

    return translatedPrimary || fallback
  } catch {
    return source.CAPTION || source.OPTION_NAME || source.OPTION_CODE || ""
  }
}

export type ReportItemCaptionSource = {
  LABEL_TEXT?: string | null
  CAPTION?: string | null
  ITEM_NAME?: string | null
}

/**
 * FS indicator line: t(LABEL_TEXT) → CAPTION / ITEM_NAME (trimmed).
 * Preserves leading indent spaces from ITEM_NAME (SP builds indent + CAPTION).
 */
export function resolveReportItemCaption(
  source: ReportItemCaptionSource | null | undefined,
  translate: ConfigCaptionTranslator,
): string {
  if (!source) {
    return ""
  }

  const itemName = typeof source.ITEM_NAME === "string" ? source.ITEM_NAME : ""
  const indentMatch = /^(\s*)/.exec(itemName)
  const indent = indentMatch?.[1] ?? ""
  const itemNameTrimmed = itemName.trim()
  const caption = normalizeText(source.CAPTION)
  const labelText = normalizeText(source.LABEL_TEXT)
  const fallback = caption || itemNameTrimmed

  if (!labelText) {
    return itemName || fallback
  }

  const displayFallback = fallback || labelText
  const translated = translate(labelText, displayFallback)
  const display = translated !== displayFallback ? translated : displayFallback

  if (!indent) {
    return display || itemName
  }

  if (display === itemName || display === itemNameTrimmed) {
    return itemName
  }

  return `${indent}${display}`
}
