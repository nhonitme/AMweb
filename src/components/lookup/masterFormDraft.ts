type LookupDraft = {
  values: Record<string, unknown>
  touched: Set<string>
}

let draft: LookupDraft = createEmptyDraft()

function createEmptyDraft(): LookupDraft {
  return { values: {}, touched: new Set<string>() }
}

export function seedMasterFormDraft(rowData: Record<string, unknown> | null | undefined): void {
  const next: LookupDraft = createEmptyDraft()

  if (rowData && typeof rowData === "object") {
    next.values = { ...rowData }
  }

  draft = next
}

export function clearMasterFormDraft(): void {
  draft = createEmptyDraft()
}

export function patchMasterFormDraft(patch: Record<string, unknown> | null | undefined): void {
  if (!patch || typeof patch !== "object") {
    return
  }

  Object.keys(patch).forEach((field) => {
    draft.values[field] = patch[field]
    draft.touched.add(field)
  })
}

export function readMasterFormDraft(field: string): unknown {
  return draft.values[field]
}

export function getMasterFormDraftChanges(): Record<string, unknown> {
  const changes: Record<string, unknown> = {}
  draft.touched.forEach((field) => {
    changes[field] = draft.values[field]
  })
  return changes
}

export function mergeMasterFormDraft<T extends object>(base: T | null | undefined): T {
  const result = { ...((base ?? {}) as T) } as Record<string, unknown>

  draft.touched.forEach((field) => {
    result[field] = draft.values[field]
  })

  return result as T
}
