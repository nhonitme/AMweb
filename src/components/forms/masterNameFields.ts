import { orderCompanyLangFields } from "@/lib/companyLang"

export function getMasterNameFields(base: string): string[] {
  const requiredField = `${base}_VIET`
  const fields = orderCompanyLangFields([requiredField, `${base}_ENG`, `${base}_KOR`], (field) => field)

  // Existing catalog write APIs require the original Vietnamese name.
  if (!fields.includes(requiredField)) fields.push(requiredField)
  return fields
}
