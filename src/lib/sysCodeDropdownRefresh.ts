import type { SysCode } from "@/api/sysCodeService"

const SYS_CODE_LIST_TYPE = Symbol.for("amnote.sysCodeList.codeType")

type TaggedSysCodeList = SysCode[] & {
  [SYS_CODE_LIST_TYPE]?: string
}

type SysCodeDropdownRefreshHandler = (codeType: string) => Promise<SysCode[]>

let refreshHandler: SysCodeDropdownRefreshHandler | null = null
const pendingRefreshes = new Map<string, Promise<SysCode[]>>()

function normalizeCodeType(codeType: string): string {
  return codeType.trim().toUpperCase()
}

export function tagSysCodeList(items: SysCode[], codeType: string): SysCode[] {
  const normalizedCodeType = normalizeCodeType(codeType)
  if (!normalizedCodeType) {
    return items
  }

  try {
    Object.defineProperty(items as TaggedSysCodeList, SYS_CODE_LIST_TYPE, {
      configurable: true,
      enumerable: false,
      value: normalizedCodeType,
    })
  } catch {
    // If a caller passes a frozen array, keep the data source usable without metadata.
  }

  return items
}

export function getTaggedSysCodeType(items: SysCode[] | null | undefined): string {
  return normalizeCodeType(String((items as TaggedSysCodeList | null | undefined)?.[SYS_CODE_LIST_TYPE] ?? ""))
}

export function setSysCodeDropdownRefreshHandler(handler: SysCodeDropdownRefreshHandler | null): () => void {
  refreshHandler = handler

  return () => {
    if (refreshHandler === handler) {
      refreshHandler = null
    }
  }
}

export async function refreshEmptySysCodeDropdown(items: SysCode[]): Promise<SysCode[]> {
  if (items.length > 0) {
    return items
  }

  const codeType = getTaggedSysCodeType(items)
  if (!codeType || !refreshHandler) {
    return items
  }

  const pendingRefresh = pendingRefreshes.get(codeType)
  if (pendingRefresh) {
    return pendingRefresh
  }

  const refresh = refreshHandler(codeType).finally(() => {
    pendingRefreshes.delete(codeType)
  })
  pendingRefreshes.set(codeType, refresh)
  return refresh
}
