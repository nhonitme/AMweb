/** Shared edit draft for MST / name / address — Form custom `render` sits outside React context. */

import type dxDataGrid from "devextreme/ui/data_grid"

export type CustomerIdentityDraft = {
  TAX_CD: string
  CUSTOMER_NM_VIET: string
  ADDRESS: string
}

type CustomerEditSession = {
  key: string | number | null
  identity: CustomerIdentityDraft
  dirty: boolean
}

const emptyIdentity = (): CustomerIdentityDraft => ({
  TAX_CD: "",
  CUSTOMER_NM_VIET: "",
  ADDRESS: "",
})

let session: CustomerEditSession = {
  key: null,
  identity: emptyIdentity(),
  dirty: false,
}

let gridGetter: (() => dxDataGrid | null) | null = null

function pickIdentity(data: Partial<CustomerIdentityDraft> | null | undefined): CustomerIdentityDraft {
  return {
    TAX_CD: String(data?.TAX_CD ?? ""),
    CUSTOMER_NM_VIET: String(data?.CUSTOMER_NM_VIET ?? ""),
    ADDRESS: String(data?.ADDRESS ?? ""),
  }
}

function identityHasData(identity: CustomerIdentityDraft): boolean {
  return Boolean(identity.TAX_CD || identity.CUSTOMER_NM_VIET || identity.ADDRESS)
}

export function registerCustomerEditGrid(getter: () => dxDataGrid | null): void {
  gridGetter = getter
}

export function beginCustomerEditSession(
  key: string | number | null | undefined,
  data?: Partial<CustomerIdentityDraft> | null,
): CustomerIdentityDraft {
  session = {
    key: key ?? null,
    identity: pickIdentity(data),
    dirty: false,
  }
  return session.identity
}

export function getCustomerEditSessionKey(): string | number | null {
  return session.key
}

export function getCustomerEditIdentity(): CustomerIdentityDraft {
  return { ...session.identity }
}

export function patchCustomerEditIdentity(patch: Partial<CustomerIdentityDraft>): CustomerIdentityDraft {
  session = {
    ...session,
    identity: {
      ...session.identity,
      ...patch,
    },
    dirty: true,
  }
  return { ...session.identity }
}

export function isCustomerEditIdentityDirty(): boolean {
  return session.dirty
}

export function clearCustomerEditSession(): void {
  session = {
    key: null,
    identity: emptyIdentity(),
    dirty: false,
  }
}

/** Prefer session; if empty, read the row currently being edited in the grid. */
export function resolveCustomerIdentitySeed(): CustomerIdentityDraft {
  if (identityHasData(session.identity)) {
    return { ...session.identity }
  }

  const fromGrid = readIdentityFromGrid()
  if (fromGrid && identityHasData(fromGrid.identity)) {
    session = {
      key: fromGrid.key,
      identity: fromGrid.identity,
      dirty: false,
    }
    return { ...session.identity }
  }

  return { ...session.identity }
}

function readIdentityFromGrid(): { key: string | number | null; identity: CustomerIdentityDraft } | null {
  const grid = gridGetter?.()
  if (!grid) return null

  try {
    const editKey = grid.option("editing.editRowKey") as string | number | null | undefined
    if (editKey != null) {
      const rowIndex = grid.getRowIndexByKey(editKey)
      const visible = typeof rowIndex === "number" && rowIndex >= 0 ? grid.getVisibleRows()?.[rowIndex] : undefined
      if (visible?.data) {
        return { key: editKey, identity: pickIdentity(visible.data as Partial<CustomerIdentityDraft>) }
      }

      const items = grid.getDataSource()?.items?.() as Array<Partial<CustomerIdentityDraft> & { CUSTOMER_ID?: number }> | undefined
      const found = items?.find((item) => item.CUSTOMER_ID === editKey)
      if (found) {
        return { key: editKey, identity: pickIdentity(found) }
      }
    }

    const newRow = grid.getVisibleRows()?.find((row) => row.isNewRow)
    if (newRow?.data) {
      return { key: null, identity: pickIdentity(newRow.data as Partial<CustomerIdentityDraft>) }
    }
  } catch {
    return null
  }

  return null
}

export function mergeIdentityIntoSavingChanges(event: {
  changes?: Array<{ type?: string; key?: unknown; data?: unknown }>
}): CustomerIdentityDraft {
  const identity = resolveCustomerIdentitySeed()
  const sessionKey = getCustomerEditSessionKey()

  if (event.changes?.length) {
    for (const change of event.changes) {
      if (change.type === "insert" || change.type === "update") {
        change.data = {
          ...((change.data ?? {}) as Record<string, unknown>),
          ...identity,
        }
      }
    }
  } else if (sessionKey != null) {
    event.changes = [
      {
        type: "update",
        key: sessionKey,
        data: { ...identity },
      },
    ]
  }

  return identity
}
