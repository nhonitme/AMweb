import {
  forwardRef,
  type MutableRefObject,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import Button from 'devextreme-react/button'
import DataGrid, { Column, ColumnFixing, Editing, Pager, Paging, Scrolling } from 'devextreme-react/data-grid'
import TextBox from 'devextreme-react/text-box'
import notify from 'devextreme/ui/notify'
import type dxDataGrid from 'devextreme/ui/data_grid'
import type {
  CellClickEvent,
  ColumnCellTemplateData,
  ContentReadyEvent,
  InitializedEvent,
  KeyDownEvent,
  ToolbarPreparingEvent,
} from 'devextreme/ui/data_grid'

import DeleteRowButton from '@/components/datagrid/DeleteRowButton'
import { useInlineGridSearch } from '@/components/datagrid/gridSearch'
import {
  useGridColumnSettingState,
  type GridColumnSettingState,
} from '@/components/datagrid/useGridColumnSettingState'
import { useVoucherSpreadsheetAddRow } from '@/components/datagrid/useVoucherSpreadsheetAddRow'
import { useVoucherSpreadsheetGridLayout } from '@/components/datagrid/useVoucherSpreadsheetGridLayout'
import VoucherSpreadsheetSummaryBar from '@/components/datagrid/VoucherSpreadsheetSummaryBar'
import {
  createSpreadsheetContinueRowKeyDownHandler,
  formatSpreadsheetSummaryNumber,
  prepareVoucherSpreadsheetToolbar,
  shouldKeepCurrentRowKeyOnDataSourceChange,
  VOUCHER_SPREADSHEET_GRID_CLASS,
  voucherSpreadsheetKeyboardNavigation,
} from '@/components/datagrid/voucherSpreadsheetGrid'
import { LanguageContext } from '@/lib/i18nLoader'
import type { FixedAssetAllocationRow } from '@/types/fixedAsset'

import { FixedAssetAllocationColumns } from '../Columns/FixedAssetAllocationColumns'
import { getAcclistLookupStore } from '@/components/lookup/AcclistLookupStore'
import { EtcType } from '@/api/systemApi'
import { rememberAccountDisplayNamesFromRow } from '@/components/lookup/accountLookupUtils'
import { departmentLookupStore } from '@/components/lookup/departmentLookupStore'
import {
  applyHeaderAmountsToSingleAmountRow,
  FA_ALLOC_RATE_TOLERANCE,
  formatAllocationSummaryPair,
  getAllocationAmountMismatchMessages,
  reallocatePercentRows,
  sumActiveAllocationAmounts,
  type DepreciationHeaderAmounts,
} from '../fixedAssetAllocationCalc'
import {
  cloneAllocationRow,
  createEmptyAllocationRow,
  createRowKey,
  getActiveAllocationRows,
  isBlankAllocationDraft,
  validateActiveAllocationRowsRequired,
} from '../fixedAssetUtils'

function resolveAllocationRowKey(
  rowKey: string | number | undefined,
  data: FixedAssetAllocationRow | undefined,
): string | null {
  // ROW_KEY là identity do AMNote quản lý và phải được ưu tiên.
  // Trong batch insert DevExtreme có thể sinh key tạm dạng _DX_KEY_...;
  // không dùng key tạm đó làm identity của application.
  if (typeof data?.ROW_KEY === 'string' && data.ROW_KEY.length > 0) {
    return data.ROW_KEY
  }

  if (
    typeof rowKey === 'string' &&
    rowKey.length > 0 &&
    !rowKey.startsWith('_DX_KEY_')
  ) {
    return rowKey
  }

  return null
}

export interface FixedAssetAllocationGridHandle {
  savePendingChanges: () => Promise<FixedAssetAllocationRow[]>
  addRow: () => void
  deleteCurrentRow: () => void
  focusSearch: () => void
  getCurrentRowKey: () => string | null
  getGridInstance: () => dxDataGrid<FixedAssetAllocationRow, string> | null
}

type FixedAssetAllocationGridPopupProps = {
  companyCd: string
  assetId: number
  allocations: FixedAssetAllocationRow[]
  onChange: (rows: FixedAssetAllocationRow[]) => void
  depreciationHeader: DepreciationHeaderAmounts
  onDirty?: () => void
  onReallocated?: () => void
  height?: number | string
  isVisible?: boolean
  screenCd?: string
  gridId?: string
  persistColumnSettings?: boolean
  columnSettingStateRef?: MutableRefObject<GridColumnSettingState | null>
}

const COLUMN_SETTING_EXCLUDED_NAMES = ['ALLOCATION_ACTIONS'] as const

export const FixedAssetAllocationGridPopup = forwardRef<
  FixedAssetAllocationGridHandle,
  FixedAssetAllocationGridPopupProps
>(function FixedAssetAllocationGridPopup(
  {
    companyCd,
    assetId,
    allocations,
    onChange,
    depreciationHeader,
    onDirty,
    onReallocated,
    height = '100%',
    isVisible = true,
    screenCd,
    gridId,
    persistColumnSettings = false,
    columnSettingStateRef,
  },
  ref,
) {
  const gridRef = useRef<dxDataGrid<FixedAssetAllocationRow, string> | null>(null)
  const searchContainerRef = useRef<HTMLDivElement | null>(null)
  const currentRowKeyRef = useRef<string | null>(null)
  const allocationsRef = useRef(allocations)
  const deleteFlowRef = useRef(false)
  // Khi parent bấm Save, onSaved của DevExtreme có thể chạy trước khi isNewRow được clear.
  // Dùng ref này để chặn hook sync state quá sớm làm rơi các dòng insert mới.
  const saveFlowRef = useRef(false)
  const [deletedDraftRows, setDeletedDraftRows] = useState<FixedAssetAllocationRow[]>([])
  const [footerRowCount, setFooterRowCount] = useState(0)
  const columnSettingState = useGridColumnSettingState({
    enabled: persistColumnSettings,
    screenCd,
    gridId,
    excludedColumnNames: COLUMN_SETTING_EXCLUDED_NAMES,
  })

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  allocationsRef.current = allocations

  const visibleAllocations = useMemo(() => getActiveAllocationRows(allocations), [allocations])
  const softDeletedCount = useMemo(
    () =>
      allocations.reduce((count, item) => count + (item.ISDEL ? 1 : 0), 0) +
      deletedDraftRows.length,
    [allocations, deletedDraftRows.length],
  )

  const syncFooterRowCount = useCallback(() => {
    const grid = gridRef.current
    const pendingInsertCount = grid
      ? grid.getVisibleRows().filter((row) => row.rowType === 'data' && row.isNewRow).length
      : 0
    setFooterRowCount(visibleAllocations.length + pendingInsertCount)
  }, [visibleAllocations.length])

  useEffect(() => {
    syncFooterRowCount()
  }, [syncFooterRowCount])

  const { searchText, searchVisible, showSearch, handleSearchTextChange, handleSearchEnter } =
    useInlineGridSearch(gridRef)

  const { containerRef, gridHeight, notifyGridContentReady, notifyGridDisposing } =
    useVoucherSpreadsheetGridLayout({
      gridRef,
      isVisible,
      layoutVersion: visibleAllocations.length,
    })

  const readActiveRowsFromGrid = useCallback((): FixedAssetAllocationRow[] => {
    const grid = gridRef.current

    if (grid) {
      // Skip unfinished insert rows — committing them via saveEditData would create blank lines.
      const visibleDataRows = grid
        .getVisibleRows()
        .filter((row) => row.rowType === 'data' && row.data && !row.isNewRow)

      if (visibleDataRows.length > 0) {
        const rowByKey = new Map<string, FixedAssetAllocationRow>()

        visibleDataRows.forEach((row, index) => {
          const rowData = row.data as FixedAssetAllocationRow
          const resolvedRowKey =
            resolveAllocationRowKey(row.key, rowData) ?? rowData.ROW_KEY ?? createRowKey()

          rowByKey.set(
            resolvedRowKey,
            cloneAllocationRow({
              ...rowData,
              COMPANY_CD: companyCd,
              ASSET_ID: assetId,
              ALLOC_SEQ: index + 1,
              ROW_KEY: resolvedRowKey,
              ISDEL: false,
            }),
          )
        })

        return Array.from(rowByKey.values()).map((item, index) =>
          cloneAllocationRow({
            ...item,
            ALLOC_SEQ: index + 1,
          }),
        )
      }

      const source = grid.option('dataSource')
      if (Array.isArray(source) && source.length > 0) {
        return (source as FixedAssetAllocationRow[]).map((item, index) =>
          cloneAllocationRow({
            ...item,
            COMPANY_CD: companyCd,
            ASSET_ID: assetId,
            ALLOC_SEQ: index + 1,
            ROW_KEY: item.ROW_KEY || createRowKey(),
            ISDEL: false,
          }),
        )
      }
    }

    return visibleAllocations.map((item, index) =>
      cloneAllocationRow({
        ...item,
        ALLOC_SEQ: index + 1,
        ISDEL: false,
      }),
    )
  }, [assetId, companyCd, visibleAllocations])


  const readRowsForValidation = useCallback((): FixedAssetAllocationRow[] => {
    const rowByKey = new Map<string, FixedAssetAllocationRow>()

    // Bắt đầu từ toàn bộ dòng active trong state để không bị mất các dòng đang ẩn do filter/search.
    visibleAllocations.forEach((item, index) => {
      const rowKey = item.ROW_KEY || createRowKey()
      rowByKey.set(
        rowKey,
        cloneAllocationRow({
          ...item,
          COMPANY_CD: companyCd,
          ASSET_ID: assetId,
          ALLOC_SEQ: index + 1,
          ROW_KEY: rowKey,
          ISDEL: false,
        }),
      )
    })

    const grid = gridRef.current
    if (grid) {
      // Với validation phải lấy cả isNewRow. Hàm readActiveRowsFromGrid cố ý bỏ qua
      // isNewRow để sync/save, nên không được dùng hàm đó cho validation trước khi Add.
      grid
        .getVisibleRows()
        .filter((row) => row.rowType === 'data' && row.data)
        .forEach((row, index) => {
          const rowData = row.data as FixedAssetAllocationRow
          const resolvedRowKey = resolveAllocationRowKey(row.key, rowData) ?? rowData.ROW_KEY ?? createRowKey()

          rowByKey.set(
            resolvedRowKey,
            cloneAllocationRow({
              ...rowData,
              COMPANY_CD: companyCd,
              ASSET_ID: assetId,
              ALLOC_SEQ: index + 1,
              ROW_KEY: resolvedRowKey,
              ISDEL: false,
            }),
          )
        })
    }

    return Array.from(rowByKey.values()).map((item, index) =>
      cloneAllocationRow({
        ...item,
        ALLOC_SEQ: index + 1,
      }),
    )
  }, [assetId, companyCd, visibleAllocations])

  const isRowStillInGridDataSource = useCallback((rowKey: string) => {
    const source = gridRef.current?.option('dataSource')
    return (
      Array.isArray(source) &&
      (source as FixedAssetAllocationRow[]).some((row) => row.ROW_KEY === rowKey)
    )
  }, [])

  /** Tránh E4008: cùng ROW_KEY không được xuất hiện 2 lần trong state/dataSource. */
  const dedupeAllocationRows = useCallback((rows: FixedAssetAllocationRow[]) => {
    const byKey = new Map<string, FixedAssetAllocationRow>()

    rows.forEach((item) => {
      const existing = byKey.get(item.ROW_KEY)
      if (!existing) {
        byKey.set(item.ROW_KEY, cloneAllocationRow(item))
        return
      }

      // Ưu tiên bản active nếu đang có cả bản soft-delete (race merge/grid stale).
      if (existing.ISDEL && !item.ISDEL) {
        byKey.set(item.ROW_KEY, cloneAllocationRow(item))
      }
    })

    return Array.from(byKey.values())
  }, [])

  const buildMergedRows = useCallback(() => {
    const activeRows = readActiveRowsFromGrid()

    const activeRowMap = new Map(activeRows.map((item) => [item.ROW_KEY, item] as const))
    const mergedRows: FixedAssetAllocationRow[] = []

    allocationsRef.current.forEach((item) => {
      if (item.ISDEL) {
        mergedRows.push(cloneAllocationRow(item))
        // Grid có thể còn snapshot cũ của dòng vừa soft-delete — không append lại phía dưới.
        activeRowMap.delete(item.ROW_KEY)
        return
      }

      const activeRow = activeRowMap.get(item.ROW_KEY)
      if (!activeRow) {
        // getVisibleRows() có thể bỏ dòng đang bị search/filter ẩn — giữ nếu vẫn còn trong dataSource.
        // Không giữ khi đã ra khỏi dataSource (soft-delete) kẻo hồi sinh dòng xóa khi sync/save.
        if (isRowStillInGridDataSource(item.ROW_KEY)) {
          mergedRows.push(cloneAllocationRow(item))
        }
        return
      }

      mergedRows.push(cloneAllocationRow(activeRow))
      activeRowMap.delete(item.ROW_KEY)
    })

    // Append newly committed grid rows only (isNewRow already excluded in readActiveRowsFromGrid).
    activeRowMap.forEach((item) => {
      mergedRows.push(cloneAllocationRow(item))
    })

    return dedupeAllocationRows(mergedRows)
  }, [dedupeAllocationRows, isRowStillInGridDataSource, readActiveRowsFromGrid])

  // Dùng riêng cho flow Save: phải lấy cả những dòng insert đang còn isNewRow.
  // readActiveRowsFromGrid() cố ý bỏ isNewRow nên không được dùng để tạo payload Save.
  const buildMergedRowsIncludingPending = useCallback(() => {
    const activeRows = readRowsForValidation()
    const activeRowMap = new Map(activeRows.map((item) => [item.ROW_KEY, item] as const))
    const mergedRows: FixedAssetAllocationRow[] = []

    allocationsRef.current.forEach((item) => {
      if (item.ISDEL) {
        mergedRows.push(cloneAllocationRow(item))
        activeRowMap.delete(item.ROW_KEY)
        return
      }

      const activeRow = activeRowMap.get(item.ROW_KEY)
      if (activeRow) {
        mergedRows.push(cloneAllocationRow(activeRow))
        activeRowMap.delete(item.ROW_KEY)
        return
      }

      // Giống buildMergedRows: chỉ giữ dòng active còn trong dataSource (filter/search).
      if (isRowStillInGridDataSource(item.ROW_KEY)) {
        mergedRows.push(cloneAllocationRow(item))
      }
    })

    // Đây chính là các dòng mới chưa từng có trong allocationsRef.current.
    activeRowMap.forEach((item) => {
      mergedRows.push(cloneAllocationRow(item))
    })

    let activeSeq = 0
    return dedupeAllocationRows(mergedRows).map((item) =>
      item.ISDEL
        ? cloneAllocationRow(item)
        : cloneAllocationRow({
            ...item,
            COMPANY_CD: companyCd,
            ASSET_ID: assetId,
            ALLOC_SEQ: ++activeSeq,
          }),
    )
  }, [assetId, companyCd, dedupeAllocationRows, isRowStillInGridDataSource, readRowsForValidation])

  const emitRowsChange = useCallback(
    (rows: FixedAssetAllocationRow[]) => {
      const uniqueRows = dedupeAllocationRows(rows)
      // Cập nhật ref ngay để sync/save cùng turn không đọc state soft-delete cũ.
      allocationsRef.current = uniqueRows
      onChange(uniqueRows)
      onDirty?.()
      return uniqueRows
    },
    [dedupeAllocationRows, onChange, onDirty],
  )

  const depreciationHeaderRef = useRef(depreciationHeader)
  depreciationHeaderRef.current = depreciationHeader

  const syncRows = useCallback(() => emitRowsChange(buildMergedRows()), [buildMergedRows, emitRowsChange])

  const { handleAddRow, handleSaved } = useVoucherSpreadsheetAddRow({
    gridRef,
    syncRows,
    dataSource: visibleAllocations,
    shouldSkipSavedSync: () => deleteFlowRef.current || saveFlowRef.current,
  })

  const handleReallocate = useCallback(async () => {
    const grid = gridRef.current
    if (grid) {
      grid.closeEditCell()

      const hasUnfinishedNewRow = grid.getVisibleRows().some((row) => row.isNewRow)
      // Never saveEditData while an insert row is open — that commits a blank line.
      // Keep the unfinished new row on the grid; only reallocate already-committed rows.
      if (!hasUnfinishedNewRow && grid.hasEditData()) {
        await grid.saveEditData()
      }
    }

    const currentRows = buildMergedRows()
    const activeRows = getActiveAllocationRows(currentRows)
    if (activeRows.length === 0) {
      notify(t('ALLOC_NO_ROWS', 'Chưa có dòng phân bổ để phân bổ lại.'), 'warning', 2500)
      return
    }

    const types = new Set(
      activeRows.map((row) => String(row.ALLOC_TYPE ?? '').trim().toUpperCase()).filter(Boolean),
    )
    if (types.size > 1) {
      notify(
        t(
          'ALLOC_TYPE_MIXED',
          'Một tài sản chỉ nên dùng một kiểu phân bổ: Theo % hoặc Theo tiền.',
        ),
        'error',
        3500,
      )
      return
    }

    const allocType = [...types][0] || 'PERCENT'
    if (allocType === 'AMOUNT') {
      if (activeRows.length === 1) {
        const nextRows = applyHeaderAmountsToSingleAmountRow(
          currentRows,
          depreciationHeaderRef.current,
        )
        if (nextRows) {
          emitRowsChange(nextRows)
          onReallocated?.()
          notify(
            t(
              'ALLOC_REALLOCATED_AMOUNT_SINGLE',
              'Đã đổ số tiền KH đầu / giữa / cuối xuống dòng phân bổ.',
            ),
            'success',
            2500,
          )
          return
        }
      }

      const messages = getAllocationAmountMismatchMessages(depreciationHeaderRef.current, currentRows, t)
      if (messages.length === 0) {
        notify(t('ALLOC_ALREADY_BALANCED', 'Tổng phân bổ đã khớp số khấu hao.'), 'success', 2500)
        return
      }
      notify(messages.join('\n'), 'warning', 5000)
      return
    }

    const rateTotal = activeRows.reduce((sum, row) => {
      const rate = typeof row.ALLOC_RATE === 'number' ? row.ALLOC_RATE : Number(row.ALLOC_RATE)
      return sum + (Number.isFinite(rate) ? rate : 0)
    }, 0)

    if (Math.abs(rateTotal - 100) > FA_ALLOC_RATE_TOLERANCE) {
      const rateText = String(Number(rateTotal.toFixed(4)))
      notify(
        t(
          'ALLOC_RATE_MUST_100_BEFORE_REALLOCATE',
          'Tổng tỷ lệ phân bổ phải bằng 100% trước khi phân bổ lại. Hiện tại: {0}%.',
        ).replace('{0}', rateText),
        'error',
        4000,
      )
      return
    }

    const nextRows = reallocatePercentRows(currentRows, depreciationHeaderRef.current)
    const reallocatedActive = getActiveAllocationRows(nextRows)
    const hasNegative = reallocatedActive.some(
      (row) =>
        Number(row.FIRST_ALLOC_AMT) < 0 ||
        Number(row.NORMAL_ALLOC_AMT) < 0 ||
        Number(row.LAST_ALLOC_AMT) < 0,
    )
    if (hasNegative) {
      notify(
        t(
          'ALLOC_REALLOCATE_NEGATIVE',
          'Không thể phân bổ lại: làm tròn khiến một dòng bị số âm. Hãy điều chỉnh tỷ lệ hoặc gộp bớt dòng.',
        ),
        'error',
        4500,
      )
      return
    }

    emitRowsChange(nextRows)
    onReallocated?.()
    notify(t('ALLOC_REALLOCATED', 'Đã phân bổ lại theo tỷ lệ.'), 'success', 2000)
  }, [buildMergedRows, emitRowsChange, onReallocated, t])

  const handleRateApplied = useCallback(() => {
    onDirty?.()
  }, [onDirty])

  const validateRowsBeforeAdd = useCallback((): boolean => {
    const grid = gridRef.current
    if (!grid) {
      return false
    }

    // Đẩy giá trị editor hiện tại vào row/change trước khi đọc dữ liệu để validation.
    grid.closeEditCell()

    // Validation phải kiểm tra cả dòng insert chưa commit (isNewRow), không chỉ các dòng đã commit.
    const validationMessage = validateActiveAllocationRowsRequired(readRowsForValidation(), t)
    if (!validationMessage) {
      return true
    }

    notify(validationMessage, 'error', 3000)
    return false
  }, [readRowsForValidation, t])

  const handleAddRowWithSync = useCallback(async () => {
    if (!validateRowsBeforeAdd()) {
      return
    }

    // Chỉ gọi handleAddRow: hook đã save/sync (nếu có sửa) rồi addRow.
    // Không saveEditData sau addRow — sẽ commit dòng insert trống vào dataSource.
    await handleAddRow()
  }, [handleAddRow, validateRowsBeforeAdd])

  const focusSearchInput = useCallback(() => {
    const input = searchContainerRef.current?.querySelector(
      'input.dx-texteditor-input, input',
    ) as HTMLInputElement | null
    input?.focus()
    input?.select?.()
  }, [])

  const getCurrentRowKey = useCallback(() => {
    const grid = gridRef.current
    const editingRowKey = grid?.option('editing.editRowKey') as unknown

    if (typeof editingRowKey === 'string') {
      const editingRow = grid
        ?.getVisibleRows()
        .find((row) => row.key === editingRowKey)
      const resolvedEditingRowKey = resolveAllocationRowKey(
        editingRowKey,
        editingRow?.data as FixedAssetAllocationRow | undefined,
      )
      if (resolvedEditingRowKey) {
        return resolvedEditingRowKey
      }
    }

    const currentRowKey = currentRowKeyRef.current
    if (currentRowKey) {
      return currentRowKey
    }

    return visibleAllocations[visibleAllocations.length - 1]?.ROW_KEY ?? null
  }, [visibleAllocations])

  const softDeleteRowByKey = useCallback(
    async (targetKey: string | null) => {
      if (!targetKey) {
        return
      }

      const grid = gridRef.current
      if (!grid) {
        return
      }

      deleteFlowRef.current = true

      try {
        const unfinishedNewRow = grid
          .getVisibleRows()
          .find(
            (row) =>
              row.isNewRow &&
              resolveAllocationRowKey(row.key, row.data as FixedAssetAllocationRow) === targetKey,
          )

        // Dòng insert chưa commit: chỉ loại đúng insert change của dòng này.
        // Tuyệt đối không dùng cancelEditData() vì batch mode sẽ hủy toàn bộ pending changes.
        if (unfinishedNewRow) {
          grid.closeEditCell()

          const effectiveRows = readRowsForValidation()
          if (getActiveAllocationRows(effectiveRows).length <= 1) {
            notify(t('ALLOC_KEEP_ONE_ROW', 'Phải giữ lại ít nhất một dòng phân bổ.'), 'warning', 2500)
            return
          }

          const draftData = unfinishedNewRow.data as FixedAssetAllocationRow
          const deletedDraft = cloneAllocationRow({
            ...draftData,
            COMPANY_CD: companyCd,
            ASSET_ID: assetId,
            ROW_KEY: targetKey,
            ISDEL: true,
          })

          const dxTemporaryKey = unfinishedNewRow.key
          const changes = (grid.option('editing.changes') ?? []) as Array<{
            type?: string
            key?: unknown
            data?: Partial<FixedAssetAllocationRow>
          }>

          const nextChanges = changes.filter((change) => {
            if (change.type !== 'insert') {
              return true
            }

            const changeRowKey = change.data?.ROW_KEY
            if (changeRowKey === targetKey) {
              return false
            }

            return change.key !== dxTemporaryKey
          })

          grid.option('editing.changes', nextChanges)
          setDeletedDraftRows((prev) => [...prev, deletedDraft])
          onDirty?.()
          syncFooterRowCount()

          if (currentRowKeyRef.current === targetKey) {
            currentRowKeyRef.current =
              effectiveRows.filter((item) => item.ROW_KEY !== targetKey).at(-1)?.ROW_KEY ?? null
          }
          return
        }

        const hasUnfinishedNewRow = grid.getVisibleRows().some((row) => row.isNewRow)
        if (!hasUnfinishedNewRow && grid.hasEditData()) {
          await grid.saveEditData()
        }

        const currentRows = buildMergedRows()
        if (getActiveAllocationRows(currentRows).length <= 1) {
          notify(t('ALLOC_KEEP_ONE_ROW', 'Phải giữ lại ít nhất một dòng phân bổ.'), 'warning', 2500)
          return
        }

        let changed = false
        const nextRows = currentRows.map((item) => {
          if (item.ROW_KEY !== targetKey || item.ISDEL) {
            return item
          }

          changed = true
          return cloneAllocationRow({
            ...item,
            ISDEL: true,
          })
        })

        if (!changed) {
          return
        }

        if (currentRowKeyRef.current === targetKey) {
          currentRowKeyRef.current = getActiveAllocationRows(nextRows).at(-1)?.ROW_KEY ?? null
        }

        emitRowsChange(nextRows)
      } finally {
        // DevExtreme có thể fire onSaved sau khi await saveEditData trả về;
        // giữ skip-sync thêm một microtask để không hồi sinh dòng vừa soft-delete.
        queueMicrotask(() => {
          deleteFlowRef.current = false
        })
      }
    },
    [assetId, buildMergedRows, companyCd, emitRowsChange, onDirty, readRowsForValidation, syncFooterRowCount, t],
  )

  const undeleteLastRow = useCallback(async () => {
    const grid = gridRef.current
    const hasUnfinishedNewRow = grid?.getVisibleRows().some((row) => row.isNewRow) ?? false

    if (grid && !hasUnfinishedNewRow && grid.hasEditData()) {
      await grid.saveEditData()
    } else {
      grid?.closeEditCell()
    }

    const currentRows = buildMergedRows()

    // Ưu tiên hoàn tác dòng mới chưa từng commit vào parent state.
    const deletedDraft = deletedDraftRows.at(-1)
    if (deletedDraft) {
      const alreadyActive = getActiveAllocationRows(currentRows).some(
        (item) => item.ROW_KEY === deletedDraft.ROW_KEY,
      )
      if (alreadyActive) {
        setDeletedDraftRows((prev) => prev.slice(0, -1))
        currentRowKeyRef.current = deletedDraft.ROW_KEY
        return
      }

      const restoredDraft = cloneAllocationRow({
        ...deletedDraft,
        ISDEL: false,
        ALLOC_SEQ: getActiveAllocationRows(currentRows).length + 1,
      })
      const nextRows = [...currentRows, restoredDraft]

      setDeletedDraftRows((prev) => prev.slice(0, -1))
      currentRowKeyRef.current = restoredDraft.ROW_KEY
      emitRowsChange(nextRows)
      requestAnimationFrame(() => {
        gridRef.current?.navigateToRow?.(restoredDraft.ROW_KEY)
      })
      return
    }

    // Hoàn tác dòng ISDEL xuất hiện sau cùng trong mảng (giống grid chứng từ).
    const deletedRow = [...currentRows].reverse().find((item) => item.ISDEL)
    if (!deletedRow) {
      return
    }

    // Chỉ gỡ ISDEL trên đúng bản ghi đã xóa; bỏ các bản trùng key nếu có (tránh E4008).
    const nextRows = currentRows
      .filter((item) => item.ROW_KEY !== deletedRow.ROW_KEY || item.ISDEL)
      .map((item) =>
        item.ROW_KEY === deletedRow.ROW_KEY
          ? cloneAllocationRow({
              ...item,
              ISDEL: false,
            })
          : item,
      )

    currentRowKeyRef.current = deletedRow.ROW_KEY
    emitRowsChange(nextRows)
    requestAnimationFrame(() => {
      gridRef.current?.navigateToRow?.(deletedRow.ROW_KEY)
    })
  }, [buildMergedRows, deletedDraftRows, emitRowsChange])

  const handleCellClick = useCallback((event: CellClickEvent<FixedAssetAllocationRow, string>) => {
    if (event.rowType !== 'data') {
      return
    }

    currentRowKeyRef.current = resolveAllocationRowKey(event.key, event.data)
  }, [])

  const handleContinueRow = useCallback(() => {
    void handleAddRowWithSync()
  }, [handleAddRowWithSync])

  const handleKeyDown = useMemo(
    () => createSpreadsheetContinueRowKeyDownHandler<FixedAssetAllocationRow>(handleContinueRow),
    [handleContinueRow],
  )

  useImperativeHandle(
    ref,
    () => ({
      savePendingChanges: async () => {
        const grid = gridRef.current

        // Đóng editor hiện tại để giá trị đang gõ được đưa vào batch changes trước khi đọc payload.
        grid?.closeEditCell()

        // Bỏ insert trống: Save không được commit dòng mới chưa nhập (tránh dòng trống + E4008).
        if (grid) {
          const unfinishedNewRows = grid
            .getVisibleRows()
            .filter((row) => row.isNewRow && row.data)

          unfinishedNewRows.forEach((unfinishedNewRow) => {
            const draftData = unfinishedNewRow.data as FixedAssetAllocationRow
            if (!isBlankAllocationDraft(draftData)) {
              return
            }

            const targetKey =
              resolveAllocationRowKey(unfinishedNewRow.key, draftData) ?? draftData.ROW_KEY
            const dxTemporaryKey = unfinishedNewRow.key
            const changes = (grid.option('editing.changes') ?? []) as Array<{
              type?: string
              key?: unknown
              data?: Partial<FixedAssetAllocationRow>
            }>

            grid.option(
              'editing.changes',
              changes.filter((change) => {
                if (change.type !== 'insert') {
                  return true
                }

                if (targetKey && change.data?.ROW_KEY === targetKey) {
                  return false
                }

                return change.key !== dxTemporaryKey
              }),
            )
          })
        }

        // Chụp payload trước saveEditData. Với dataSource controlled bởi React:
        // không để DX insert cùng ROW_KEY rồi emit lại → E4008.
        // Insert còn lại (đã có dữ liệu): đưa vào state qua emit; chỉ flush 'update' bằng saveEditData.
        const rowsToSave = buildMergedRowsIncludingPending().filter(
          (row) => row.ISDEL || !isBlankAllocationDraft(row),
        )
        allocationsRef.current = rowsToSave

        if (grid) {
          const changes = (grid.option('editing.changes') ?? []) as Array<{
            type?: string
            key?: unknown
            data?: Partial<FixedAssetAllocationRow>
          }>
          const updateChanges = changes.filter((change) => change.type !== 'insert')

          if (updateChanges.length !== changes.length) {
            grid.option('editing.changes', updateChanges)
          }

          if (grid.hasEditData()) {
            saveFlowRef.current = true
            try {
              await grid.saveEditData()
            } finally {
              queueMicrotask(() => {
                saveFlowRef.current = false
              })
            }
          }
        }

        return emitRowsChange(rowsToSave)
      },
      addRow: () => {
        void handleAddRowWithSync()
      },
      deleteCurrentRow: () => {
        void softDeleteRowByKey(getCurrentRowKey())
      },
      focusSearch: () => {
        if (!searchVisible) {
          showSearch()
        }

        requestAnimationFrame(() => {
          focusSearchInput()
        })
      },
      getCurrentRowKey,
      getGridInstance: () => gridRef.current,
    }),
    [
      buildMergedRowsIncludingPending,
      emitRowsChange,
      focusSearchInput,
      getCurrentRowKey,
      handleAddRowWithSync,
      searchVisible,
      showSearch,
      softDeleteRowByKey,
    ],
  )

  const handleInitialized = useCallback((event: InitializedEvent<FixedAssetAllocationRow, string>) => {
    gridRef.current = event.component ?? null
  }, [])

  const handleContentReady = useCallback(
    (event: ContentReadyEvent<FixedAssetAllocationRow, string>) => {
      notifyGridContentReady()
      syncFooterRowCount()
    },
    [
      notifyGridContentReady,
      syncFooterRowCount,
    ],
  )

  const handleDisposing = useCallback(() => {
    notifyGridDisposing()
  }, [notifyGridDisposing])

  const handleToolbarPreparing = useCallback((event: ToolbarPreparingEvent<FixedAssetAllocationRow, string>) => {
    prepareVoucherSpreadsheetToolbar(event)
  }, [])

  useEffect(() => {
    if (
      !isVisible ||
      !columnSettingState.enabled ||
      !gridRef.current ||
      !columnSettingState.cachedEditorItems.length
    ) {
      return
    }

    columnSettingState.syncEditorItemsToComponent(
      gridRef.current,
      columnSettingState.cachedEditorItems,
    )
  }, [
    columnSettingState.cachedEditorItems,
    columnSettingState.enabled,
    columnSettingState.syncEditorItemsToComponent,
    isVisible,
  ])

  useEffect(() => {
    if (!isVisible || !columnSettingState.enabled || !gridRef.current) {
      return
    }

    let cancelled = false

    void columnSettingState.loadEditorItems(gridRef.current).then((items) => {
      if (cancelled || !gridRef.current || items.length === 0) {
        return
      }

      columnSettingState.syncEditorItemsToComponent(gridRef.current, items)
    })

    return () => {
      cancelled = true
    }
  }, [
    columnSettingState.enabled,
    columnSettingState.loadEditorItems,
    columnSettingState.syncEditorItemsToComponent,
    isVisible,
  ])

  useEffect(() => {
    if (!isVisible) {
      currentRowKeyRef.current = null

      if (gridRef.current?.hasEditData?.()) {
        void gridRef.current.cancelEditData()
      }

      return
    }

    void getAcclistLookupStore({ etcType: EtcType.cbxFixedAssetDebitAccount }).load()
    void getAcclistLookupStore({ etcType: EtcType.cbxFixedAssetCreditAccount }).load()
    void departmentLookupStore.load()

    visibleAllocations.forEach((row) => {
      rememberAccountDisplayNamesFromRow(row.DEBIT_ACCT_CD ?? '', row, 'DEBIT_ACCT_NM')
      rememberAccountDisplayNamesFromRow(row.CREDIT_ACCT_CD ?? '', row, 'CREDIT_ACCT_NM')
    })

    const currentRowKey = currentRowKeyRef.current
    const visibleRowKeys = visibleAllocations.map((item) => item.ROW_KEY)
    if (shouldKeepCurrentRowKeyOnDataSourceChange(gridRef.current, currentRowKey, visibleRowKeys)) {
      return
    }

    currentRowKeyRef.current = visibleAllocations[0]?.ROW_KEY ?? null
  }, [isVisible, visibleAllocations])

  const summaryItems = useMemo(() => {
    const totals = sumActiveAllocationAmounts(visibleAllocations)
    return [
      {
        key: 'rows',
        label: t('ROW_COUNT', 'Số dòng'),
        value: formatSpreadsheetSummaryNumber(footerRowCount),
      },
      {
        key: 'rate',
        label: t('ALLOC_RATE', 'Tỷ lệ %'),
        // value: `${Number(totals.rateTotal.toFixed(4))}% / 100%`,
        value: `${Number(totals.rateTotal.toFixed(4))}%`,
      },
      {
        key: 'first',
        label: t('FIRST_ALLOC_AMT', 'Tiền đầu'),
        value: formatAllocationSummaryPair(totals.firstTotal, depreciationHeader.FIRST_DEPRE_AMT, t),
      },
      {
        key: 'normal',
        label: t('NORMAL_ALLOC_AMT', 'Tiền giữa'),
        value: formatAllocationSummaryPair(totals.normalTotal, depreciationHeader.NORMAL_DEPRE_AMT, t),
      },
      {
        key: 'last',
        label: t('LAST_ALLOC_AMT', 'Tiền cuối'),
        value: formatAllocationSummaryPair(totals.lastTotal, depreciationHeader.LAST_DEPRE_AMT, t),
      },
    ]
  }, [depreciationHeader, footerRowCount, t, visibleAllocations])

  const rootStyle = height !== undefined ? { height } : undefined
  const hasConfiguredColumnWidths = columnSettingState.cachedEditorItems.some(
    (item) => typeof item.width === 'number',
  )

  if (columnSettingStateRef) {
    columnSettingStateRef.current = columnSettingState
  }

  return (
    <div
      className="flex min-h-0 w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white"
      style={rootStyle}
    >
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <Button
          stylingMode="contained"
          icon="plus"
          hint={t('ADD_ROW', 'Thêm dòng')}
          onClick={() => {
            void handleAddRowWithSync()
          }}
        />
        <Button
          stylingMode="outlined"
          text={t('Undelete', 'Hoàn tác')}
          hint={t('RESTORE_LAST_DELETED_ROW', 'Khôi phục dòng vừa xóa')}
          disabled={softDeletedCount === 0}
          onClick={() => {
            void undeleteLastRow()
          }}
        />
        <Button
          stylingMode="outlined"
          text={t('REALLOCATE', 'Phân bổ lại')}
          hint={t('REALLOCATE_HINT', 'Tính lại tiền phân bổ theo tỷ lệ hiện tại')}
          onClick={() => {
            void handleReallocate()
          }}
        />
        <div className="ml-auto flex items-center gap-2">
          {searchVisible ? (
            <div ref={searchContainerRef}>
              <TextBox
                width={260}
                mode="search"
                stylingMode="outlined"
                value={searchText}
                showClearButton
                placeholder={t('Search detail...', 'Tìm dòng phân bổ...')}
                onValueChanged={(event) => handleSearchTextChange(String(event.value ?? ''))}
                onEnterKey={handleSearchEnter}
              />
            </div>
          ) : null}
          <Button
            stylingMode="text"
            icon="search"
            hint={t('Search detail', 'Tìm kiếm')}
            onClick={showSearch}
          />
        </div>
      </div>

      <div
        ref={containerRef}
        className={`fixed-asset-allocation-grid min-h-0 flex-1 ${VOUCHER_SPREADSHEET_GRID_CLASS}`}
      >
        <DataGrid<FixedAssetAllocationRow, string>
          loadPanel={{ enabled: false }}
          dataSource={visibleAllocations}
          keyExpr="ROW_KEY"
          width="100%"
          height={gridHeight}
          showBorders
          columnAutoWidth={!hasConfiguredColumnWidths}
          rowAlternationEnabled
          allowColumnResizing
          allowColumnReordering
          wordWrapEnabled={false}
          focusedRowEnabled
          hoverStateEnabled={false}
          highlightChanges={false}
          keyboardNavigation={voucherSpreadsheetKeyboardNavigation}
          onInitialized={handleInitialized}
          onContentReady={handleContentReady}
          onDisposing={handleDisposing}
          onToolbarPreparing={handleToolbarPreparing}
          onCellClick={handleCellClick}
          onSaved={handleSaved}
          onKeyDown={handleKeyDown as (event: KeyDownEvent<FixedAssetAllocationRow, string>) => void}
          onInitNewRow={(event) => {
            const existingCount = event.component
              .getVisibleRows()
              .filter((row) => row.rowType === 'data' && !row.isNewRow).length
            const nextSeq = Math.max(
              existingCount + 1,
              getActiveAllocationRows(allocationsRef.current).length + 1,
            )
            const currentType =
              getActiveAllocationRows(allocationsRef.current)[0]?.ALLOC_TYPE ?? 'PERCENT'
            const nextRow = createEmptyAllocationRow(companyCd, assetId, nextSeq, currentType)
            Object.assign(event.data, nextRow)
            currentRowKeyRef.current = nextRow.ROW_KEY
            // Footer cập nhật ngay khi có dòng insert (chưa commit vào state).
            requestAnimationFrame(() => {
              syncFooterRowCount()
            })
          }}
        >
          <ColumnFixing enabled />
          <Paging enabled={false} />
          <Pager visible={false} />
          <Scrolling
            mode="standard"
            useNative={false}
            showScrollbar="always"
            scrollByContent
            scrollByThumb
          />
          <Editing
            mode="batch"
            allowAdding
            allowUpdating
            allowDeleting={false}
            confirmDelete={false}
            startEditAction="click"
            selectTextOnEditStart
            newRowPosition="last"
          />
          <Column
            name="ALLOCATION_ACTIONS"
            caption=""
            width={60}
            fixed
            fixedPosition="left"
            visibleIndex={0}
            cssClass="fixed-asset-allocation-actions-cell"
            allowFixing={false}
            allowEditing={false}
            allowFiltering={false}
            allowSorting={false}
            allowReordering={false}
            showInColumnChooser={false}
            cellRender={(cellInfo: ColumnCellTemplateData<FixedAssetAllocationRow, string>) => {
              const rowKey = resolveAllocationRowKey(cellInfo.row?.key, cellInfo.data)
              if (!rowKey) {
                return null
              }

              // Không dùng getVisibleRows() trong cellRender — lúc render có thể trả về [] khiến nút xóa bị ẩn.
              const isUnfinishedNewRow = Boolean(cellInfo.row?.isNewRow)
              const canDelete = isUnfinishedNewRow || visibleAllocations.length > 1

              return (
                <div
                  className={
                    canDelete
                      ? 'flex h-full w-full items-center justify-center'
                      : 'pointer-events-none flex h-full w-full items-center justify-center opacity-35'
                  }
                >
                  <DeleteRowButton
                    hint={t('DELETE_ROW', 'Xóa dòng')}
                    onDelete={() => {
                      if (!canDelete) {
                        return
                      }

                      void softDeleteRowByKey(rowKey)
                    }}
                  />
                </div>
              )
            }}
          />
          <FixedAssetAllocationColumns
            depreciationHeader={depreciationHeader}
            onRateApplied={handleRateApplied}
          />
        </DataGrid>
      </div>

      <VoucherSpreadsheetSummaryBar items={summaryItems} />
    </div>
  )
})
