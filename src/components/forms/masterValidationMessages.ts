export type MasterTranslate = (key: string, fallback: string) => string

/** Older translations sometimes have no placeholder. Always identify the field. */
export function masterValidationMessage(t: MasterTranslate, key: string, caption: string, fallback: string) {
  const template = t(key, fallback)
  if (/\{0\}|\{field\}/.test(template)) {
    return template.replace(/\{0\}|\{field\}/g, caption)
  }
  return `${caption}: ${template}`
}

export function requiredMasterMessage(t: MasterTranslate, caption: string) {
  return masterValidationMessage(t, "MSG_MUST_ITEM", caption, "{0} không được để trống")
}

export function duplicateMasterMessage(t: MasterTranslate, caption: string) {
  return masterValidationMessage(t, "MsgEqualCode", caption, "{0} đã tồn tại")
}
