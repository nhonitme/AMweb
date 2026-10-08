import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import DataGrid, { Column, Paging, RowDragging, Scrolling, Selection, Sorting } from "devextreme-react/data-grid"
import LoadPanel from "devextreme-react/load-panel"
import notify from "devextreme/ui/notify"
import { GripVertical } from "lucide-react"
import type { RowDraggingChangeEvent, RowDraggingReorderEvent, RowDraggingStartEvent, SelectionChangedEvent } from "devextreme/ui/data_grid"

import { getApiErrorMessage } from "@/api/apiTypes"
import {
  useReportSignatureMappingMutations,
  useReportSignatureMappingQuery,
} from "@/hooks/queries/adminQueries"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import { LanguageContext } from "@/lib/i18nLoader"
import type { ReportSignatureMapping, ReportSignatureMappingSignature } from "@/types/reportSignatureMapping"

type ReportSignatureMappingEditorProps = {
  reportKey: string
  reportCode?: string
  onClose: () => void
  onSaved: () => void
}

type ReportSignatureGridRow = ReportSignatureMappingSignature & {
  BASE_ORDER: number
  IS_SELECTED: boolean
  SELECTED_ORDER: number | null
}

function getSelectedCodesFromMapping(data: ReportSignatureMapping): string[] {
  return data.SIGNATURES
    .filter((item) => item.IS_SELECTED)
    .sort((left, right) => (left.SELECTED_ORDER ?? Number.MAX_SAFE_INTEGER) - (right.SELECTED_ORDER ?? Number.MAX_SAFE_INTEGER))
    .map((item) => item.SIGN_CODE)
}

export default function ReportSignatureMappingEditor({
  reportKey,
  reportCode,
  onClose,
  onSaved,
}: ReportSignatureMappingEditorProps) {
  const [mapping, setMapping] = useState<ReportSignatureMapping | null>(null)
  const [displayOrder, setDisplayOrder] = useState<string[]>([])
  const [selectedCodes, setSelectedCodes] = useState<string[]>([])
  const [initialSignIds, setInitialSignIds] = useState<string | null>(null)

  const {
    data: mappingData,
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchMapping,
  } = useReportSignatureMappingQuery(reportKey, reportCode)
  const { saveMutation } = useReportSignatureMappingMutations(reportKey, reportCode)
  const loading = isLoading || isFetching
  const saving = saveMutation.isPending

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  useMasterListLoadError(isError, loadError, t, "Failed to load report signatures")

  const syncSelectedToDisplayOrder = useCallback((order: string[], selected: string[]) => {
    const selectedSet = new Set(selected)
    return order.filter((code) => selectedSet.has(code))
  }, [])

  const insertSelectedByDisplayOrder = useCallback((order: string[], selected: string[], code: string) => {
    if (selected.includes(code)) {
      return selected
    }

    const codeDisplayIndex = order.indexOf(code)
    if (codeDisplayIndex < 0) {
      return [...selected, code]
    }

    let insertAt = selected.length
    for (let index = 0; index < selected.length; index += 1) {
      if (order.indexOf(selected[index]) > codeDisplayIndex) {
        insertAt = index
        break
      }
    }

    return [...selected.slice(0, insertAt), code, ...selected.slice(insertAt)]
  }, [])

  useEffect(() => {
    if (!mappingData) {
      return
    }

    setMapping(mappingData)
    setDisplayOrder(mappingData.SIGNATURES.map((item) => item.SIGN_CODE))
    setSelectedCodes(getSelectedCodesFromMapping(mappingData))
    setInitialSignIds(mappingData.SIGN_IDS)
  }, [mappingData])

  const signatureLookup = useMemo(() => {
    const entries = (mapping?.SIGNATURES ?? []).map((item, index) => [
      item.SIGN_CODE,
      {
        ...item,
        BASE_ORDER: index,
      } satisfies ReportSignatureGridRow,
    ] as const)
    return new Map(entries)
  }, [mapping])

  const selectedOrderLookup = useMemo(() => {
    const lookup = new Map<string, number>()
    selectedCodes.forEach((code, index) => {
      lookup.set(code, index + 1)
    })
    return lookup
  }, [selectedCodes])

  const gridRows = useMemo(() => {
    return displayOrder
      .map((code) => {
        const item = signatureLookup.get(code)
        if (!item) {
          return null
        }

        const selectedOrder = selectedOrderLookup.get(code) ?? null
        return {
          ...item,
          IS_SELECTED: selectedOrder != null,
          SELECTED_ORDER: selectedOrder,
        } satisfies ReportSignatureGridRow
      })
      .filter((item): item is ReportSignatureGridRow => Boolean(item))
  }, [displayOrder, selectedOrderLookup, signatureLookup])

  const currentSignIds = useMemo(
    () => (selectedCodes.length > 0 ? selectedCodes.join("|") : null),
    [selectedCodes],
  )

  const isDirty = currentSignIds !== initialSignIds

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<ReportSignatureGridRow, string>) => {
      const added = (event.currentSelectedRowKeys ?? []) as string[]
      const removed = (event.currentDeselectedRowKeys ?? []) as string[]

      setSelectedCodes((current) => {
        let next = current.filter((code) => !removed.includes(code))
        for (const code of added) {
          next = insertSelectedByDisplayOrder(displayOrder, next, code)
        }
        return next
      })
    },
    [displayOrder, insertSelectedByDisplayOrder],
  )

  const handleRowDragStart = useCallback((event: RowDraggingStartEvent<ReportSignatureGridRow, string>) => {
    const signCode = String(event.itemData?.SIGN_CODE ?? "").trim()
    if (!signCode || !selectedCodes.includes(signCode) || selectedCodes.length <= 1) {
      event.cancel = true
    }
  }, [selectedCodes])

  const handleRowDragChange = useCallback((event: RowDraggingChangeEvent<ReportSignatureGridRow, string>) => {
    const signCode = String(event.itemData?.SIGN_CODE ?? "").trim()
    if (!signCode || !selectedCodes.includes(signCode)) {
      event.cancel = true
      return
    }

    if (event.toIndex < 0 || event.toIndex > displayOrder.length) {
      event.cancel = true
    }
  }, [displayOrder.length, selectedCodes])

  const handleRowReorder = useCallback((event: RowDraggingReorderEvent<ReportSignatureGridRow, string>) => {
    const signCode = String(event.itemData?.SIGN_CODE ?? "").trim()
    if (!signCode) {
      return
    }

    setDisplayOrder((current) => {
      const fromIndex = current.indexOf(signCode)
      if (fromIndex < 0) {
        return current
      }

      const next = [...current]
      const [movedItem] = next.splice(fromIndex, 1)
      const targetIndex = Math.max(0, Math.min(event.toIndex, next.length))
      next.splice(targetIndex, 0, movedItem)

      setSelectedCodes((selected) => syncSelectedToDisplayOrder(next, selected))
      return next
    })
  }, [syncSelectedToDisplayOrder])

  const handleSave = useCallback(async () => {
    if (!mapping) {
      return
    }

    try {
      const updated = await saveMutation.mutateAsync({
        REPORT_CODE: mapping.REPORT_CODE || null,
        SIGN_CODES: selectedCodes,
      })

      setMapping(updated)
      setDisplayOrder(updated.SIGNATURES.map((item) => item.SIGN_CODE))
      setSelectedCodes(getSelectedCodesFromMapping(updated))
      setInitialSignIds(updated.SIGN_IDS)

      notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000)
      onSaved()
    } catch (error) {
      notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")), "error", 4000)
    }
  }, [mapping, onSaved, saveMutation, selectedCodes, t])

  const dragTooltip = t("REPORT_SIGNATURE_DRAG_HINT", "Drag selected rows to reorder")

  return (
    <div className="report-signature-editor relative space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <Button
            icon="refresh"
            stylingMode="outlined"
            text={t("btnRefresh", "Làm mới")}
            type="normal"
            disabled={loading || saving}
            onClick={() => void refetchMapping()}
          />
          <Button
            disabled={selectedCodes.length === 0 || loading || saving}
            icon="clear"
            stylingMode="outlined"
            text={t("CLEAR_SELECTION", "Clear selection")}
            type="normal"
            onClick={() => setSelectedCodes([])}
          />
        </div>

        <DataGrid
          dataSource={gridRows}
          keyExpr="SIGN_CODE"
          selectedRowKeys={selectedCodes}
          onSelectionChanged={handleSelectionChanged}
          columnAutoWidth={true}
          hoverStateEnabled={true}
          rowAlternationEnabled={false}
          repaintChangesOnly={false}
          showBorders={true}
          height={580}
          noDataText={loading ? "" : t("NO_DATA", "No signatures available")}
        >
          <Selection mode="multiple" showCheckBoxesMode="always" selectAllMode="allPages" />
          <Scrolling mode="standard" />
          <Paging enabled={false} />
          <Sorting mode="none" />
          <RowDragging
            allowReordering={true}
            showDragIcons={false}
            handle=".report-signature-drag-handle"
            onDragStart={handleRowDragStart}
            onDragChange={handleRowDragChange}
            onReorder={handleRowReorder}
          />

          <Column
            caption=""
            width={52}
            alignment="center"
            allowSorting={false}
            cellRender={({ data }: { data: ReportSignatureGridRow }) =>
              data.IS_SELECTED ? (
                <div
                  className="report-signature-drag-handle inline-flex cursor-grab items-center justify-center rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
                  title={dragTooltip}
                  aria-label={dragTooltip}
                >
                  <GripVertical size={16} />
                </div>
              ) : (
                <span className="select-none text-slate-200">—</span>
              )
            }
          />

          <Column
            caption={t("ORDER", "Order")}
            width={70}
            alignment="center"
            allowSorting={false}
            cellRender={({ data }: { data: ReportSignatureGridRow }) =>
              data.SELECTED_ORDER != null ? (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {data.SELECTED_ORDER}
                </span>
              ) : null
            }
          />

          <Column dataField="SIGN_CODE" caption={t("SIGN_CODE", "Sign Code")} width={110} allowSorting={false} />
          <Column
            dataField="DISPLAY_LABEL"
            caption={t("DISPLAY_LABEL", "Display Label")}
            allowSorting={false}
            cellRender={({ data }: { data: ReportSignatureGridRow }) => {
              const value = data.DISPLAY_LABEL?.trim()
              return value ? t(value, value) : ""
            }}
          />
          <Column
            dataField="SIGN_TITLE"
            caption={t("SIGN_TITLE", "Signer Title")}
            allowSorting={false}
            cellRender={({ data }: { data: ReportSignatureGridRow }) => {
              const value = data.SIGN_TITLE?.trim()
              return value ? t(value, value) : ""
            }}
          />
          <Column dataField="SIGN_NAME" caption={t("SIGN_NAME", "Signer Name")} allowSorting={false} />
        </DataGrid>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          <Button
            stylingMode="outlined"
            text={t("dxDataGrid-editingCancelRowChanges", "Cancel")}
            type="normal"
            disabled={saving}
            onClick={onClose}
          />
          <Button
            disabled={!isDirty || saving || loading}
            icon="save"
            stylingMode="contained"
            text={saving ? t("SAVING", "Saving...") : t("dxDataGrid-editingSaveRowChanges", "Save")}
            type="default"
            onClick={() => void handleSave()}
          />
        </div>
      </section>

      <LoadPanel
        visible={loading || saving}
        showIndicator={true}
        showPane={true}
        shading={false}
      />
    </div>
  )
}
