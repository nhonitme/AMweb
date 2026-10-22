import type { MenuTreeNode } from "@/types/menu"
import { resolveMenuCaption } from "@/utils/resolveConfigCaption"

export type ExportNameTranslator = (key: string, fallback?: string) => string

const FILE_NAME_INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g
const SHEET_NAME_INVALID_CHARS = /[\[\]:*?\/\\]/g

export function findMenuByCode(tree: MenuTreeNode[], menuCode: string): MenuTreeNode | null {
  const normalizedCode = menuCode.trim().toUpperCase()
  if (!normalizedCode) return null

  for (const node of tree) {
    if (node.code.trim().toUpperCase() === normalizedCode) return node
    const found = node.children?.length ? findMenuByCode(node.children, normalizedCode) : null
    if (found) return found
  }

  return null
}

export function resolveMenuExportLabel(
  tree: MenuTreeNode[],
  menuCode: string,
  translate: ExportNameTranslator,
): string {
  const menu = findMenuByCode(tree, menuCode)
  if (!menu) return ""
  // Same chain as sidebar titles: LABEL_TEXT → MENU_CODE → CAPTION/MENU_NAME.
  return resolveMenuCaption(menu, (key, fallback) => translate(key, fallback)).trim()
}

function cleanNamePart(value: string): string {
  return value
    .replace(FILE_NAME_INVALID_CHARS, "_")
    .replace(/[. ]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function buildExportFileName(
  label: string,
  extension: string,
): string {
  const normalizedExtension = extension.trim().replace(/^\.+/, "").toLowerCase()
  if (!normalizedExtension) throw new Error("Export file extension is required")
  const cleanLabel = cleanNamePart(label)
  if (!cleanLabel) throw new Error("Sys Menu export label is unavailable")
  const timestamp = new Date().toISOString().replace(/[:.-]/g, "")
  return `${cleanLabel}_${timestamp}.${normalizedExtension}`
}

export function buildExportSheetName(label: string): string {
  const cleanLabel = label.replace(SHEET_NAME_INVALID_CHARS, " ").trim()
  if (!cleanLabel) throw new Error("Sys Menu export label is unavailable")
  return cleanLabel.slice(0, 31)
}
