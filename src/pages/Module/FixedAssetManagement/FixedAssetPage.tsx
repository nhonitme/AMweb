import { downloadFile } from "@/lib/fileUtils"
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Column, Button as DataGridButton } from 'devextreme-react/data-grid'
import LoadPanel from 'devextreme-react/load-panel'
import { confirm } from 'devextreme/ui/dialog'
import notify from 'devextreme/ui/notify'
import type dxDataGrid from 'devextreme/ui/data_grid'
import type {
  ColumnButtonClickEvent,
  InitializedEvent,
  RowDblClickEvent,
} from 'devextreme/ui/data_grid'

import {
  createFixedAsset,
  deleteFixedAssets,
  exportFixedAssetsToExcel,
  getFixedAssetById,
  updateFixedAsset,
} from '@/api/fixedAssetApi'
import { getApiErrorMessage } from '@/api/apiTypes'
import { BaseDataGrid } from '@/components/datagrid/BaseDataGrid'
import MasterDataPageLayout from '@/components/datagrid/MasterDataPageLayout'
import BaseExcelImportPopup from '@/components/forms/BaseExcelImportPopup'
import DxPage from '@/dx/DxPage'
import {
  useFixedAssetListInvalidate,
  useFixedAssetListQuery,
} from '@/hooks/queries/adminQueries'
import { useMasterListLoadError } from '@/hooks/queries/master/masterQueryHelpers'
import { LanguageContext } from '@/lib/i18nLoader'
import { useSysCodes } from '@/lib/sysCodeContext'
import { getCurrentCompanyCd } from '@/lib/login'
import { normalizeMessageLanguageKey } from '@/utils/language'
import type { FixedAssetGridRow, FixedAssetListItem } from '@/types/fixedAsset'

import { FixedAssetColumns } from './Columns/FixedAssetColumns'
import { useFixedAssetImportConfig } from './Columns/FixedAssetImportConfig'
import {
  FIXED_ASSET_MASTER_GRID_ID,
  FIXED_ASSET_MENU_CODE,
  FIXED_ASSET_SCREEN_CD,
} from './Columns/fixedAssetGridIds'
import FixedAssetEditorPopup from './components/FixedAssetEditorPopup'
import FixedAssetPageToolbar from './components/FixedAssetPageToolbar'
import { openReportViewerPage } from '@/pages/Reports/openReportViewerPage'
import { buildMasterGridReportViewerPageUrl } from '@/pages/Reports/reportViewerConfig'
import {
  buildFixedAssetSaveRequest,
  cloneFixedAssetGridRow,
  createDefaultFixedAssetRow,
  createRowKey,
  mergeDetailFieldsIntoGridRow,
  normalizeFixedAssetYmdFields,
  validateFixedAssetRow,
} from './fixedAssetUtils'
import {
  createEmptyFixedAssetListFilters,
  FA_STATUS_CODE_TYPE,
  getActiveFaStatusCodes,
  normalizeFixedAssetStatus,
  normalizeFixedAssetStatusFilter,
  type FixedAssetListFilters,
} from './fixedAssetStatus'
import './FixedAssetPage.scss'

const screenCd = FIXED_ASSET_SCREEN_CD
const masterGridId = FIXED_ASSET_MASTER_GRID_ID
const menuCode = FIXED_ASSET_MENU_CODE

const mapListToGridRows = (items: FixedAssetListItem[]): FixedAssetGridRow[] =>
  items.map((item) =>
    normalizeFixedAssetYmdFields({
      ...item,
      STATUS: normalizeFixedAssetStatus(item.STATUS),
      NOTE: null,
      ACQ_CHITINFO_ID: null,
      ACQ_CHITDETAIL_ID: null,
      ALLOCATIONS: [],
    }),
  )

const buildDuplicateRow = (source: FixedAssetGridRow): FixedAssetGridRow =>
  normalizeFixedAssetYmdFields({
    ...createDefaultFixedAssetRow(getCurrentCompanyCd()),
    ...source,
    ASSET_ID: 0,
    ASSET_CD: '',
    COMPANY_CD: getCurrentCompanyCd(),
    ACQ_CHITINFO_ID: null,
    ACQ_CHITDETAIL_ID: null,
    ALLOCATIONS: source.ALLOCATIONS.map((row, index) => ({
      ...row,
      ALLOC_ID: null,
      ASSET_ID: 0,
      ALLOC_SEQ: index + 1,
      ROW_KEY: createRowKey(),
      ISDEL: false,
    })),
  })

export default function FixedAssetPage() {
  const gridRef = useRef<dxDataGrid<FixedAssetGridRow, number> | null>(null)
  const detailPromiseRef = useRef<Map<number, Promise<FixedAssetGridRow>>>(new Map())

  const [rows, setRows] = useState<FixedAssetGridRow[]>([])
  const [statusFilterDraft, setStatusFilterDraft] = useState(() => createEmptyFixedAssetListFilters().status)
  const [accFilterDraft, setAccFilterDraft] = useState(() => createEmptyFixedAssetListFilters().accCd)
  const [appliedFilters, setAppliedFilters] = useState<FixedAssetListFilters>(createEmptyFixedAssetListFilters())
  const [editorError, setEditorError] = useState("")
  const [editorVisible, setEditorVisible] = useState(false)
  const [editorLoading, setEditorLoading] = useState(false)
  const [editorSessionKey, setEditorSessionKey] = useState(0)
  const [isUpdate, setIsUpdate] = useState(false)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const [editorRow, setEditorRow] = useState<FixedAssetGridRow>(() =>
    createDefaultFixedAssetRow(getCurrentCompanyCd()),
  )

  const beginEditorSession = useCallback(() => {
    setEditorError("")
    setEditorSessionKey((current) => current + 1)
  }, [])

  const { translate, lang } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
    lang: string
  }

  const { sysCodeMap, getCodesByType, refreshSysCodes } = useSysCodes()

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const tRef = useRef(t)
  tRef.current = t

  const importConfig = useFixedAssetImportConfig()
  const langCode = normalizeMessageLanguageKey(lang)

  const statusCodes = useMemo(
    () => getActiveFaStatusCodes(getCodesByType(FA_STATUS_CODE_TYPE)),
    [getCodesByType, sysCodeMap],
  )

  const listQuery = useMemo(() => {
    const status = normalizeFixedAssetStatusFilter(appliedFilters.status)
    const accCd = appliedFilters.accCd?.trim() || undefined
    return {
      ...(status ? { status } : {}),
      ...(accCd ? { accCd } : {}),
    }
  }, [appliedFilters.accCd, appliedFilters.status])

  const {
    data: fixedAssetItems = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchFixedAssets,
  } = useFixedAssetListQuery(listQuery)
  const invalidateFixedAssets = useFixedAssetListInvalidate()
  const loading = isLoading || isFetching

  useMasterListLoadError(
    isError,
    loadError,
    (key, fallback) => tRef.current(key, fallback ?? key),
    'Failed to load fixed assets',
  )

  useEffect(() => {
    detailPromiseRef.current.clear()
    setRows(mapListToGridRows(fixedAssetItems))
    gridRef.current?.clearSelection()
  }, [fixedAssetItems])

  const loadData = useCallback(async () => {
    try {
      await Promise.all([refreshSysCodes(), refetchFixedAssets()])
    } catch (error) {
      console.error('Failed to refresh fixed assets', error)
      notify(
        getApiErrorMessage(error, tRef.current('LOAD_FAILED', 'Không tải được danh sách tài sản.')),
        'error',
        3000,
      )
    }
  }, [refetchFixedAssets, refreshSysCodes])

  const handleSearchSubmit = useCallback(() => {
    setAppliedFilters({
      status: statusFilterDraft,
      accCd: accFilterDraft,
    })
  }, [accFilterDraft, statusFilterDraft])

  const persistRow = useCallback(
    async (row: FixedAssetGridRow, editMode: boolean): Promise<boolean> => {
      const validationMessage = validateFixedAssetRow(row, t)
      if (validationMessage) {
        throw new Error(validationMessage)
      }

      const payload = buildFixedAssetSaveRequest(row)

      if (editMode) {
        await updateFixedAsset(Number(row.ASSET_ID), payload)
        notify(t('MSG_EDIT_SUCCESS', 'Đã cập nhật tài sản cố định.'), 'success', 3000)
        return true
      }

      await createFixedAsset(payload)
      notify(t('MSG_INSERT_SUCCESS', 'Đã tạo tài sản cố định.'), 'success', 3000)
      return true
    },
    [t],
  )

  const fetchAssetDetail = useCallback(async (row: FixedAssetGridRow): Promise<FixedAssetGridRow> => {
    const assetId = Number(row.ASSET_ID ?? 0)
    if (assetId <= 0) {
      return cloneFixedAssetGridRow(row)
    }

    const inFlight = detailPromiseRef.current.get(assetId)
    if (inFlight) {
      return inFlight
    }

    const promise = (async () => {
      try {
        const detail = await getFixedAssetById(assetId)

        const merged = mergeDetailFieldsIntoGridRow(row, detail.ASSET, detail.ALLOCATIONS)
        setRows((current) =>
          current.map((item) =>
            item.ASSET_ID === assetId
              ? mergeDetailFieldsIntoGridRow(item, detail.ASSET, detail.ALLOCATIONS)
              : item,
          ),
        )

        return cloneFixedAssetGridRow(merged)
      } finally {
        detailPromiseRef.current.delete(assetId)
      }
    })()

    detailPromiseRef.current.set(assetId, promise)
    return promise
  }, [])

  /** Mở popup sửa/nhân bản: luôn gọi API detail (không trả cache ALLOCATIONS cũ). */
  const resolveRowForEdit = useCallback(
    async (row: FixedAssetGridRow): Promise<FixedAssetGridRow> => {
      const assetId = Number(row.ASSET_ID ?? 0)
      if (assetId <= 0) {
        return cloneFixedAssetGridRow(row)
      }

      try {
        return await fetchAssetDetail(row)
      } catch (error) {
        console.error('Load fixed asset detail failed', error)
        notify(
          getApiErrorMessage(error, t('LOAD_FAILED', 'Không tải được chi tiết tài sản.')),
          'error',
          3000,
        )
        throw error
      }
    },
    [fetchAssetDetail, t],
  )

  const openEditor = useCallback(
    async (row: FixedAssetGridRow, editMode: boolean) => {
      beginEditorSession()
      setIsUpdate(editMode)

      if (!editMode) {
        setEditorRow(cloneFixedAssetGridRow(row))
        setEditorVisible(true)
        return
      }

      // Không gắn ALLOCATIONS từ cache list — chờ API detail để tránh hiện dữ liệu cũ.
      setEditorRow(
        cloneFixedAssetGridRow({
          ...row,
          ALLOCATIONS: [],
        }),
      )
      setEditorVisible(true)
      setEditorLoading(true)
      setEditorError("")

      try {
        const resolved = await resolveRowForEdit(row)
        setEditorRow(cloneFixedAssetGridRow(resolved))
      } catch {
        setEditorVisible(false)
      } finally {
        setEditorLoading(false)
      }
    },
    [beginEditorSession, resolveRowForEdit],
  )

  const handleOpenAdd = useCallback(() => {
    beginEditorSession()
    setIsUpdate(false)
    setEditorRow(createDefaultFixedAssetRow(getCurrentCompanyCd()))
    setEditorVisible(true)
  }, [beginEditorSession])

  const handleOpenEdit = useCallback(
    (row: FixedAssetGridRow) => {
      void openEditor(row, true)
    },
    [openEditor],
  )

  const handleDuplicate = useCallback(
    (row: FixedAssetGridRow) => {
      void (async () => {
        beginEditorSession()
        setIsUpdate(false)
        setEditorRow(
          cloneFixedAssetGridRow({
            ...row,
            ALLOCATIONS: [],
          }),
        )
        setEditorVisible(true)
        setEditorLoading(true)

        try {
          const source = await resolveRowForEdit(row)
          setEditorRow(buildDuplicateRow(source))
        } catch {
          setEditorVisible(false)
        } finally {
          setEditorLoading(false)
        }
      })()
    },
    [beginEditorSession, resolveRowForEdit],
  )

  const handleCloseEditor = useCallback(() => {
    if (editorLoading) {
      return
    }
    setEditorVisible(false)
  }, [editorLoading])

  const handleSave = useCallback(
    async (record: FixedAssetGridRow) => {
      setEditorLoading(true)
      setEditorError("")

      try {
        const saved = await persistRow(record, isUpdate)
        if (!saved) {
          return
        }

        const assetId = Number(record.ASSET_ID ?? 0)
        if (assetId > 0) {
          detailPromiseRef.current.delete(assetId)
        }

        setEditorVisible(false)
        await invalidateFixedAssets()
      } catch (error) {
        console.error('Save fixed asset failed', error)
        setEditorError(getApiErrorMessage(error, t('SAVE_FAILED', 'Không lưu được tài sản.')))
        throw error
      } finally {
        setEditorLoading(false)
      }
    },
    [invalidateFixedAssets, isUpdate, persistRow, t],
  )

  const handleSaveAndNew = useCallback(
    async (record: FixedAssetGridRow) => {
      setEditorLoading(true)
      setEditorError("")

      try {
        const saved = await persistRow(record, isUpdate)
        if (!saved) {
          return
        }

        const assetId = Number(record.ASSET_ID ?? 0)
        if (assetId > 0) {
          detailPromiseRef.current.delete(assetId)
        }

        await invalidateFixedAssets()
        beginEditorSession()
        setIsUpdate(false)
        setEditorRow(createDefaultFixedAssetRow(getCurrentCompanyCd()))
      } catch (error) {
        console.error('Save fixed asset failed', error)
        setEditorError(getApiErrorMessage(error, t('SAVE_FAILED', 'Không lưu được tài sản.')))
        throw error
      } finally {
        setEditorLoading(false)
      }
    },
    [beginEditorSession, invalidateFixedAssets, isUpdate, persistRow, t],
  )

  const deleteAssetsByIds = useCallback(
    async (assetIds: number[]) => {
      if (!assetIds.length) {
        notify(t('MSG_CONFIRM_DELETE_SELECTED_ROWS', 'Vui lòng chọn tài sản cần xóa.'), 'warning', 2000)
        return
      }

      const confirmText = t('MSG_CONFIRM_DELETE_RECORD', 'Bạn có chắc muốn xóa {0} bản ghi?').replace(
        '{0}',
        String(assetIds.length),
      )
      const confirmed = await confirm(confirmText, t('MSG_CONFIRM_DELETE', 'Xác nhận xóa'))
      if (!confirmed) {
        return
      }

      try {
        await deleteFixedAssets(assetIds)
        notify(t('MSG_DELETE_SUCCESS', 'Đã xóa tài sản cố định.'), 'success', 3000)
        assetIds.forEach((assetId) => {
          detailPromiseRef.current.delete(assetId)
        })
        await invalidateFixedAssets()
      } catch (error) {
        console.error('Delete fixed asset failed', error)
        notify(getApiErrorMessage(error, t('MSG_DELETE_ERROR', 'Không xóa được tài sản.')), 'error', 3000)
      }
    },
    [invalidateFixedAssets, t],
  )

  const handleDelete = useCallback(async () => {
    const selectedKeys = (gridRef.current?.getSelectedRowKeys() || []) as Array<string | number>
    const assetIds = selectedKeys
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)

    await deleteAssetsByIds(assetIds)
  }, [deleteAssetsByIds])

  const handleDeleteRow = useCallback(
    (row: FixedAssetGridRow) => {
      const assetId = Number(row.ASSET_ID ?? 0)
      if (!Number.isFinite(assetId) || assetId <= 0) {
        notify(t('MSG_CONFIRM_DELETE_SELECTED_ROWS', 'Vui lòng chọn tài sản cần xóa.'), 'warning', 2000)
        return
      }
      void deleteAssetsByIds([assetId])
    },
    [deleteAssetsByIds, t],
  )

  const handleExportExcel = useCallback(async () => {
    try {
      const keys = (gridRef.current?.getSelectedRowKeys() || []) as number[]
      const assetId = keys.length === 1 ? Number(keys[0]) : undefined
      const status = normalizeFixedAssetStatusFilter(appliedFilters.status)
      const accCd = appliedFilters.accCd?.trim() || undefined
      const loadDownloadBlob = (signal: AbortSignal) => exportFixedAssetsToExcel({
        assetId: assetId && assetId > 0 ? assetId : undefined,
        status,
        accCd,
        lang: langCode,
      }, signal)
      await downloadFile({ fileName: `fixed_asset_register_${new Date().toISOString().replace(/[:.-]/g, '')}.xlsx`, load: loadDownloadBlob })
    } catch (error) {
      console.error('Export fixed assets Excel failed', error)
      notify(getApiErrorMessage(error, t('Export failed', 'Không xuất được Excel.')), 'error', 3000)
    }
  }, [appliedFilters.accCd, appliedFilters.status, langCode, t])

  const handleExportPdf = useCallback(() => {
    const keys = (gridRef.current?.getSelectedRowKeys() || []) as number[]
    const selectedAssetId = keys.length > 0 ? Number(keys[0]) : undefined
    const assetId =
      typeof selectedAssetId === 'number' && Number.isFinite(selectedAssetId) && selectedAssetId > 0
        ? selectedAssetId
        : undefined

    const status = normalizeFixedAssetStatusFilter(appliedFilters.status)
    const accCd = appliedFilters.accCd?.trim() || undefined
    const targetUrl = buildMasterGridReportViewerPageUrl({
      companyCd: getCurrentCompanyCd(),
      assetId: assetId ? String(assetId) : undefined,
      status: status || undefined,
      accCd,
      reportCode: 'FIXED_ASSET_INFO',
      menuCode,
      screenCd,
      gridId: masterGridId,
    })
    if (!openReportViewerPage(targetUrl)) {
      notify(t('UNABLE_TO_OPEN_REPORT_VIEWER', 'Không mở được trình xem báo cáo'), 'error', 3000)
    }
  }, [appliedFilters.accCd, appliedFilters.status, t])

  const handleRowDblClick = useCallback(
    (event: RowDblClickEvent<FixedAssetGridRow, number>) => {
      if (event.data) {
        handleOpenEdit(event.data)
      }
    },
    [handleOpenEdit],
  )

  const handleGridInitialized = useCallback((event: InitializedEvent<FixedAssetGridRow, number>) => {
    gridRef.current = event.component ?? null
  }, [])

  const handleAccFilterChange = useCallback((value: string) => {
    setAccFilterDraft(value)
  }, [])

  const columnsNode = useMemo(
    () => <FixedAssetColumns statusCodes={statusCodes} />,
    [statusCodes],
  )

  return (
    <DxPage>
      <MasterDataPageLayout
        className="fixed-asset-page"
        toolbar={
          <FixedAssetPageToolbar
            gridRef={gridRef}
            statusCodes={statusCodes}
            statusFilterDraft={statusFilterDraft}
            accFilterDraft={accFilterDraft}
            onStatusFilterChange={setStatusFilterDraft}
            onAccFilterChange={handleAccFilterChange}
            onSearchSubmit={handleSearchSubmit}
            onAdd={handleOpenAdd}
            onRefresh={loadData}
            onDelete={handleDelete}
            // onImport={() => setIsExcelModalOpen(true)}
            onExportXlsx={() => void handleExportExcel()}
            onExportPdf={handleExportPdf}
            translate={t}
          />
        }
        overlays={
          <BaseExcelImportPopup
            visible={isExcelModalOpen}
            onClose={() => setIsExcelModalOpen(false)}
            title={t('FA_REGISTER', 'Import danh mục tài sản cố định')}
            moduleCd={importConfig.moduleCd}
            templateUrl="/System/DownloadTemplate"
            templateFileName={importConfig.templateName}
            params={{ lang: localStorage.getItem('lang') ?? undefined }}
            onImported={() => void invalidateFixedAssets()}
          />
        }
      >
        <div className="fixed-asset-page__grid">
          <BaseDataGrid<FixedAssetGridRow>
            dataSource={rows}
            keyExpr="ASSET_ID"
            screenCd={screenCd}
            gridId={masterGridId}
            onAdd={handleOpenAdd}
            onInitialized={handleGridInitialized}
            onRowDblClick={handleRowDblClick}
            onContextMenuUpdate={handleOpenEdit}
            onContextMenuCopy={handleDuplicate}
            onContextMenuDelete={handleDeleteRow}
            focusRowEnabled
            selectMode="multiple"
            actionButtons
            actionButtonsPosition="start"
          >
            <Column
              type="buttons"
              width={90}
              showInColumnChooser={false}
              allowHiding={false}
              fixed
              fixedPosition="left"
            >
              <DataGridButton
                icon="edit"
                hint={t('UpdateMsg', 'Sửa')}
                onClick={(event: ColumnButtonClickEvent<FixedAssetGridRow, number>) => {
                  const row = event.row?.data
                  if (row) {
                    handleOpenEdit(row)
                  }
                }}
              />
              <DataGridButton
                icon="trash"
                hint={t('btndelete', 'Xóa')}
                onClick={(event: ColumnButtonClickEvent<FixedAssetGridRow, number>) => {
                  const row = event.row?.data
                  if (row) {
                    handleDeleteRow(row)
                  }
                }}
              />
            </Column>
            {columnsNode}
          </BaseDataGrid>

          <LoadPanel
            visible={loading}
            showIndicator
            showPane
            shading
            shadingColor="rgba(0, 0, 0, 0.15)"
            position={{ of: '.fixed-asset-page__grid' }}
          />
        </div>
      </MasterDataPageLayout>

      <FixedAssetEditorPopup
        key={editorSessionKey}
        visible={editorVisible}
        value={editorRow}
        isUpdate={isUpdate}
        loading={editorLoading}
        errorMessage={editorError}
        statusCodes={statusCodes}
        onClose={handleCloseEditor}
        onSave={handleSave}
        onSaveAndNew={handleSaveAndNew}
      />
    </DxPage>
  )
}
