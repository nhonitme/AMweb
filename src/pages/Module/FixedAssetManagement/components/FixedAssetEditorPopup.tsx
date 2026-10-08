import { requiredMasterMessage } from "@/components/forms/masterValidationMessages";
import { lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Button from 'devextreme-react/button'
import Form, { GroupItem, Item, Tab, TabbedItem } from 'devextreme-react/form'
import type dxForm from 'devextreme/ui/form'
import type { SelectionChangedEvent as TabPanelSelectionChangedEvent } from 'devextreme/ui/tab_panel'
import LoadPanel from 'devextreme-react/load-panel'
import Popup, { ToolbarItem } from 'devextreme-react/popup'
import { confirm } from 'devextreme/ui/dialog'

import { LookupPopupProvider } from '@/components/lookup/LookupPopupHost'
import GridColumnSettingsPopup, {
  type GridColumnSettingsPopupTab,
  type GridColumnSettingsPopupTabSaveItem,
} from '@/components/datagrid/GridColumnSettingsPopup'
import type { GridColumnSettingState } from '@/components/datagrid/useGridColumnSettingState'
import { getAcclistLookupStore } from '@/components/lookup/AcclistLookupStore'
import { EtcType } from '@/api/systemApi'
import {
  ACCOUNT_LOOKUP_SEARCH_FIELDS,
  formatAccountDisplay,
  getAccountLookupCode,
  getAccountLookupNameBySuffix,
  type AccountLookupItem,
} from '@/components/lookup/accountLookupUtils'
import { createOutlinedEditorOptions } from '@/components/forms/devExtremeEditorOptions'
import { createSysCodeSelectBoxEditorOptions } from '@/components/forms/sysCodeSelectBoxOptions'
import { attachFormFieldTabNavigation } from '@/components/forms/formFieldTabNavigation'
import ShortcutHelpPopup from '@/components/shortcuts/ShortcutHelpPopup'
import useShortcutBindings from '@/hooks/useShortcutBindings'
import useShortcutHelp from '@/hooks/useShortcutHelp'
import useStateRef from '@/hooks/useStateRef'
import { LanguageContext } from '@/lib/i18nLoader'
import {
  createPopupShortcutWrapperAttr,
  isPopupShortcutScopeTopMost,
  usePopupShortcutScopeId,
} from '@/lib/popupShortcutScope'
import { flushActiveEditorValue } from '@/lib/shortcuts/shortcutUtils'
import { createShortcutBindings } from '@/lib/shortcuts/shortcutBindings'
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts/shortcutDefinitions'
import type { SysCode } from '@/api/sysCodeService'
import { getApiErrorMessage } from '@/api/apiTypes'
import type { FixedAssetGridRow } from '@/types/fixedAsset'
import { getDataLanguageSuffix } from '@/utils/language'

import type { FixedAssetAllocationGridHandle } from './FixedAssetAllocationGridPopup'
import {
  cloneFixedAssetGridRow,
  getFixedAssetValidationIssue,
  normalizeFixedAssetRowForForm,
  normalizeFixedAssetYmdFields,
} from '../fixedAssetUtils'
import {
  FIXED_ASSET_FORM_FIELD_TAB_ORDER,
  FIXED_ASSET_FORM_TAB_PANEL_SELECTOR,
} from '../fixedAssetFormTabOrder'
import {
  FIXED_ASSET_DEPRE_MANUAL_FIELDS,
  FIXED_ASSET_DEPRE_PREVIEW_TRIGGER_FIELDS,
  useFixedAssetDepreciationPreview,
} from '../hooks/useFixedAssetDepreciationPreview'
import {
  FIXED_ASSET_ALLOCATION_GRID_ID,
  FIXED_ASSET_SCREEN_CD,
} from '../Columns/fixedAssetGridIds'
import { createFaStatusDisplayExpr } from '../fixedAssetStatus'

const FixedAssetAllocationGridPopup = lazy(async () => {
  const module = await import('./FixedAssetAllocationGridPopup')
  return { default: module.FixedAssetAllocationGridPopup }
})

type FixedAssetEditorPopupProps = {
  visible: boolean
  value: FixedAssetGridRow
  isUpdate: boolean
  loading: boolean
  errorMessage?: string
  statusCodes: SysCode[]
  onClose: () => void
  onSave: (record: FixedAssetGridRow) => Promise<void>
  onSaveAndNew?: (record: FixedAssetGridRow) => Promise<void>
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export default function FixedAssetEditorPopup({
  visible,
  value,
  isUpdate,
  loading,
  errorMessage,
  statusCodes,
  onClose,
  onSave,
  onSaveAndNew,
}: FixedAssetEditorPopupProps) {
  const [validationMessage, setValidationMessage] = useState('')
  const popupShortcutScopeId = usePopupShortcutScopeId('fixed-asset-editor')
  const allocationGridRef = useRef<FixedAssetAllocationGridHandle | null>(null)
  const allocationColumnSettingStateRef = useRef<GridColumnSettingState | null>(null)
  const formRef = useRef<{ instance: () => dxForm } | null>(null)
  const formContainerRef = useRef<HTMLDivElement | null>(null)
  const [draft, setDraft, draftRef] = useStateRef<FixedAssetGridRow>(() => cloneFixedAssetGridRow(value))
  const [formInitialData, setFormInitialData] = useState<FixedAssetGridRow>(() => cloneFixedAssetGridRow(value))
  const [formMountKey, setFormMountKey] = useState(0)
  const [activeFormTabIndex, setActiveFormTabIndex] = useState(0)
  const [allocationDirty, setAllocationDirty] = useState(false)
  const [allocationNeedsReview, setAllocationNeedsReview] = useState(false)
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
  const [columnSettingsTabs, setColumnSettingsTabs] = useState<GridColumnSettingsPopupTab[]>([])
  const [depreciationHeader, setDepreciationHeader] = useState({
    FIRST_DEPRE_AMT: toNumber(value.FIRST_DEPRE_AMT),
    NORMAL_DEPRE_AMT: toNumber(value.NORMAL_DEPRE_AMT),
    LAST_DEPRE_AMT: toNumber(value.LAST_DEPRE_AMT),
  })
  const closingRef = useRef(false)
  const allocationDirtyRef = useRef(false)
  allocationDirtyRef.current = allocationDirty

  const { translate, lang } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
    lang: string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const statusSelectBoxOptions = useMemo(
    () => ({
      ...createSysCodeSelectBoxEditorOptions(
        statusCodes,
        t('FA_STATUS_SELECT', 'Chọn trạng thái'),
        (key, fallback) => t(key, fallback ?? ''),
      ),
      displayExpr: createFaStatusDisplayExpr((key, fallback) => t(key, fallback ?? ''), statusCodes),
      showClearButton: false,
    }),
    [statusCodes, t],
  )

  const title = t(isUpdate ? 'lblEdit' : 'lblAddNew', isUpdate ? 'Sửa tài sản cố định' : 'Thêm tài sản cố định')

  const dataLanguageSuffix = useMemo(() => getDataLanguageSuffix(lang), [lang])

  const accountSelectBoxOptions = useMemo(
    () =>
      createOutlinedEditorOptions({
        dataSource: getAcclistLookupStore({ etcType: EtcType.cbxFixedAssetAccount }),
        valueExpr: 'CD',
        displayExpr: (item: AccountLookupItem | null) => {
          const accountCd = getAccountLookupCode(item)
          const accountNm = getAccountLookupNameBySuffix(item, dataLanguageSuffix)
          return formatAccountDisplay(accountCd, accountNm)
        },
        searchEnabled: true,
        searchExpr: [...ACCOUNT_LOOKUP_SEARCH_FIELDS],
        placeholder: t('ACC_SELECT', 'Chọn tài khoản'),
        showClearButton: true,
      }),
    [dataLanguageSuffix, t],
  )

  const handlePreviewError = useCallback((message: string) => {
    setValidationMessage(message)
  }, [])

  const handlePreviewApplied = useCallback(
    (amounts: {
      FIRST_DEPRE_AMT: number
      NORMAL_DEPRE_AMT: number
      LAST_DEPRE_AMT: number
    }) => {
      setDepreciationHeader(amounts)
    },
    [],
  )

  const {
    resetPreviewState,
    markManualDepreField,
    handlePreviewTriggerFieldChanged,
    scheduleDepreciationPreview,
  } = useFixedAssetDepreciationPreview({
    visible,
    draftRef,
    formRef,
    onPreviewError: handlePreviewError,
    onPreviewApplied: handlePreviewApplied,
  })

  const shortcutActions = useMemo(
    () => [
      SHORTCUT_ACTIONS.SAVE,
      SHORTCUT_ACTIONS.SAVE_AND_NEW,
      SHORTCUT_ACTIONS.SAVE_AND_CLOSE,
      SHORTCUT_ACTIONS.CLOSE,
      SHORTCUT_ACTIONS.ADD_ROW,
      SHORTCUT_ACTIONS.DELETE_ROW,
      SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH,
      SHORTCUT_ACTIONS.HELP,
    ],
    [],
  )

  const {
    shortcutHelpVisible,
    shortcutHelpItems,
    openShortcutHelp,
    closeShortcutHelp,
  } = useShortcutHelp(shortcutActions)

  useEffect(() => {
    if (!visible) {
      return
    }

    const initial = normalizeFixedAssetRowForForm(cloneFixedAssetGridRow(value))
    draftRef.current = initial
    setDraft(initial)
    setFormInitialData(initial)
    setFormMountKey((current) => current + 1)
    setActiveFormTabIndex(0)
    setAllocationDirty(false)
    setAllocationNeedsReview(false)
    setDepreciationHeader({
      FIRST_DEPRE_AMT: toNumber(initial.FIRST_DEPRE_AMT),
      NORMAL_DEPRE_AMT: toNumber(initial.NORMAL_DEPRE_AMT),
      LAST_DEPRE_AMT: toNumber(initial.LAST_DEPRE_AMT),
    })
    resetPreviewState()
  }, [draftRef, resetPreviewState, setDraft, value, visible])

  useEffect(() => {
    if (!visible) {
      return undefined
    }

    let detachTabNavigation: (() => void) | undefined
    const timer = window.setTimeout(() => {
      const formRoot =
        (formContainerRef.current?.querySelector('.fixed-asset-form--compact') as HTMLElement | null) ??
        formContainerRef.current

      if (!formRoot) {
        return
      }

      detachTabNavigation = attachFormFieldTabNavigation({
        formRoot,
        getForm: () => formRef.current?.instance() ?? null,
        tabPanelSelector: FIXED_ASSET_FORM_TAB_PANEL_SELECTOR,
        fieldTabOrder: FIXED_ASSET_FORM_FIELD_TAB_ORDER,
      })
    }, 0)

    return () => {
      window.clearTimeout(timer)
      detachTabNavigation?.()
    }
  }, [formMountKey, visible])

  const handleFormTabSelectionChanged = useCallback((event: TabPanelSelectionChangedEvent) => {
    const nextIndex = event.component.option('selectedIndex')
    if (typeof nextIndex === 'number') {
      setActiveFormTabIndex(nextIndex)
    }
  }, [])

  const tabPanelOptions = useMemo(
    () => ({
      deferRendering: false,
      focusStateEnabled: false,
      selectedIndex: activeFormTabIndex,
      onSelectionChanged: handleFormTabSelectionChanged,
    }),
    [activeFormTabIndex, handleFormTabSelectionChanged],
  )

  const handleFieldDataChanged = useCallback(
    (event: { dataField?: string; value?: unknown }) => {
      if (typeof event.dataField !== 'string') {
        return
      }

      const dataField = event.dataField as keyof FixedAssetGridRow
      draftRef.current = {
        ...draftRef.current,
        [dataField]: event.value,
      } as FixedAssetGridRow

      const isPreviewTrigger = FIXED_ASSET_DEPRE_PREVIEW_TRIGGER_FIELDS.includes(
        dataField as (typeof FIXED_ASSET_DEPRE_PREVIEW_TRIGGER_FIELDS)[number],
      )

      if (isPreviewTrigger) {
        handlePreviewTriggerFieldChanged()
      }

      if (dataField === 'ORIGINAL_AMT' || dataField === 'ACCUM_DEPRE_AMT') {
        const remain = toNumber(draftRef.current.ORIGINAL_AMT) - toNumber(draftRef.current.ACCUM_DEPRE_AMT)
        draftRef.current.REMAIN_DEPRE_AMT = remain
        formRef.current?.instance()?.updateData('REMAIN_DEPRE_AMT', remain)
      }

      if (
        dataField === 'FIRST_DEPRE_AMT' ||
        dataField === 'NORMAL_DEPRE_AMT' ||
        dataField === 'LAST_DEPRE_AMT'
      ) {
        setDepreciationHeader({
          FIRST_DEPRE_AMT: toNumber(draftRef.current.FIRST_DEPRE_AMT),
          NORMAL_DEPRE_AMT: toNumber(draftRef.current.NORMAL_DEPRE_AMT),
          LAST_DEPRE_AMT: toNumber(draftRef.current.LAST_DEPRE_AMT),
        })
      }

      if (
        dataField === 'FIRST_DEPRE_AMT' ||
        dataField === 'NORMAL_DEPRE_AMT' ||
        dataField === 'LAST_DEPRE_AMT' ||
        dataField === 'ORIGINAL_AMT' ||
        dataField === 'ACCUM_DEPRE_AMT' ||
        dataField === 'USEFUL_LIFE_MONTH' ||
        dataField === 'USE_START_YMD'
      ) {
        const hasAllocations = (draftRef.current.ALLOCATIONS ?? []).some((row) => !row.ISDEL)
        if (hasAllocations) {
          setAllocationNeedsReview(true)
          setAllocationDirty(true)
        }
      }

      if (isPreviewTrigger) {
        scheduleDepreciationPreview()
      }

      if (
        FIXED_ASSET_DEPRE_MANUAL_FIELDS.includes(
          dataField as (typeof FIXED_ASSET_DEPRE_MANUAL_FIELDS)[number],
        )
      ) {
        markManualDepreField(dataField)
      }
    },
    [
      draftRef,
      handlePreviewTriggerFieldChanged,
      markManualDepreField,
      scheduleDepreciationPreview,
    ],
  )

  const handleAllocationsChange = useCallback(
    (rows: FixedAssetGridRow['ALLOCATIONS']) => {
      setDraft((prev) => ({
        ...prev,
        ALLOCATIONS: rows,
      }))
    },
    [setDraft],
  )

  const handleAllocationDirty = useCallback(() => {
    setAllocationDirty(true)
  }, [])

  const handleAllocationReallocated = useCallback(() => {
    setAllocationNeedsReview(false)
    setAllocationDirty(true)
  }, [])

  const flushPendingFormEditors = useCallback(async () => {
    await flushActiveEditorValue()
  }, [])

  const resolveInvalidFormTabIndex = useCallback((form: dxForm): number => {
    for (const { field, formTabIndex } of FIXED_ASSET_FORM_FIELD_TAB_ORDER) {
      const editor = form.getEditor(field) as { element?: () => HTMLElement } | undefined
      const editorElement = editor?.element?.()
      if (editorElement?.classList.contains('dx-invalid')) {
        return formTabIndex
      }
    }
    return 0
  }, [])

  const buildRecordForSave = useCallback(async () => {
    setValidationMessage('')
    await flushPendingFormEditors()

    const form = formRef.current?.instance()
    const validationResult = form?.validate()
    if (validationResult && !validationResult.isValid) {
      setValidationMessage((validationResult.brokenRules ?? []).map(rule => rule.message).filter(Boolean).join('\n'))
      if (form) {
        setActiveFormTabIndex(resolveInvalidFormTabIndex(form))
      }
      return null
    }

    const formData = (form?.option('formData') ?? {}) as FixedAssetGridRow
    const currentDraft = {
      ...draftRef.current,
      ...formData,
    }
    const syncedAllocations = allocationGridRef.current
      ? await allocationGridRef.current.savePendingChanges()
      : currentDraft.ALLOCATIONS

    const record: FixedAssetGridRow = normalizeFixedAssetYmdFields({
      ...currentDraft,
      ALLOCATIONS: syncedAllocations,
      REMAIN_DEPRE_AMT: toNumber(currentDraft.ORIGINAL_AMT) - toNumber(currentDraft.ACCUM_DEPRE_AMT),
    })

    const validationIssue = getFixedAssetValidationIssue(record, t)
    if (validationIssue) {
      setActiveFormTabIndex(validationIssue.tabIndex)
      setValidationMessage(validationIssue.message)
      return null
    }

    return record
  }, [draftRef, flushPendingFormEditors, resolveInvalidFormTabIndex, t])

  const handleSave = useCallback(async () => {
    const record = await buildRecordForSave()
    if (!record) {
      return
    }

    try {
      await onSave(record)
    } catch (error) {
      setValidationMessage(getApiErrorMessage(error, t('SAVE_FAILED', 'Không lưu được tài sản.')))
      return
    }
    setAllocationDirty(false)
    setAllocationNeedsReview(false)
  }, [buildRecordForSave, onSave, t])

  const handleSaveAndNew = useCallback(async () => {
    const record = await buildRecordForSave()
    if (!record) {
      return
    }

    try {
      if (onSaveAndNew) {
        await onSaveAndNew(record)
      } else {
        await onSave(record)
      }
    } catch (error) {
      setValidationMessage(getApiErrorMessage(error, t('SAVE_FAILED', 'Không lưu được tài sản.')))
      return
    }

    setAllocationDirty(false)
    setAllocationNeedsReview(false)
  }, [buildRecordForSave, onSave, onSaveAndNew, t])

  const handleClosePopup = useCallback(async () => {
    if (loading || closingRef.current) {
      return
    }

    if (allocationDirtyRef.current) {
      const confirmed = await confirm(
        t(
          'FA_ALLOC_DISCARD_CONFIRM',
          'Phân bổ / khấu hao đã thay đổi. Bạn có chắc muốn đóng mà không lưu?',
        ),
        t('MSG_CONFIRM', 'Xác nhận'),
      )
      if (!confirmed) {
        return
      }
      allocationDirtyRef.current = false
      setAllocationDirty(false)
      setAllocationNeedsReview(false)
    }

    // Mark intentional close so onHiding does not ask again.
    closingRef.current = true
    onClose()
  }, [loading, onClose, t])

  useEffect(() => {
    if (!visible) {
      closingRef.current = false
    }
  }, [visible])

  const handleAddAllocationRow = useCallback(() => {
    allocationGridRef.current?.addRow()
  }, [])

  const handleDeleteAllocationRow = useCallback(() => {
    allocationGridRef.current?.deleteCurrentRow()
  }, [])

  const handleQuickAllocationSearch = useCallback(() => {
    allocationGridRef.current?.focusSearch()
  }, [])

  const openColumnSettings = useCallback(() => {
    setColumnSettingsVisible(true)
    setColumnSettingsTabs([
      {
        key: FIXED_ASSET_ALLOCATION_GRID_ID,
        title: t('ALLOCATION_INFO', 'Phân bổ khấu hao'),
        items: [],
        loading: true,
      },
    ])

    const component = allocationGridRef.current?.getGridInstance() ?? null
    void (allocationColumnSettingStateRef.current
      ? allocationColumnSettingStateRef.current.loadEditorItems(component).then((items) => {
          setColumnSettingsTabs([
            {
              key: FIXED_ASSET_ALLOCATION_GRID_ID,
              title: t('ALLOCATION_INFO', 'Phân bổ khấu hao'),
              items,
              loading: false,
            },
          ])
        })
      : Promise.resolve())
  }, [t])

  const handleColumnSettingsSave = useCallback(
    async (tabs: GridColumnSettingsPopupTabSaveItem[]) => {
      const items =
        tabs.find((item) => item.key === FIXED_ASSET_ALLOCATION_GRID_ID)?.items ?? []
      const component = allocationGridRef.current?.getGridInstance() ?? null
      const state = allocationColumnSettingStateRef.current
      const savedItems =
        state && component
          ? await state.applyEditorItemsToComponent(component, items)
          : state
            ? await state.saveEditorItems(items)
            : items

      setColumnSettingsTabs([
        {
          key: FIXED_ASSET_ALLOCATION_GRID_ID,
          title: t('ALLOCATION_INFO', 'Phân bổ khấu hao'),
          items: savedItems,
          loading: false,
        },
      ])
      setColumnSettingsVisible(false)
    },
    [t],
  )

  const handleColumnSettingsReset = useCallback(
    async (activeTabKey?: string) => {
      if (
        activeTabKey !== FIXED_ASSET_ALLOCATION_GRID_ID ||
        !allocationColumnSettingStateRef.current
      ) {
        return
      }

      const items = await allocationColumnSettingStateRef.current.resetEditorItems(
        allocationGridRef.current?.getGridInstance() ?? null,
      )
      setColumnSettingsTabs([
        {
          key: FIXED_ASSET_ALLOCATION_GRID_ID,
          title: t('ALLOCATION_INFO', 'Phân bổ khấu hao'),
          items,
          loading: false,
        },
      ])
    },
    [t],
  )

  const shortcutBindings = useMemo(
    () =>
      createShortcutBindings(
        shortcutActions,
        {
          [SHORTCUT_ACTIONS.SAVE]: () => {
            void handleSave()
          },
          [SHORTCUT_ACTIONS.SAVE_AND_NEW]: () => {
            void handleSaveAndNew()
          },
          [SHORTCUT_ACTIONS.SAVE_AND_CLOSE]: () => {
            void handleSave()
          },
          [SHORTCUT_ACTIONS.CLOSE]: () => {
            void handleClosePopup()
          },
          [SHORTCUT_ACTIONS.ADD_ROW]: () => handleAddAllocationRow(),
          [SHORTCUT_ACTIONS.DELETE_ROW]: () => handleDeleteAllocationRow(),
          [SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH]: () => handleQuickAllocationSearch(),
          [SHORTCUT_ACTIONS.HELP]: () => openShortcutHelp(),
        },
        {
          [SHORTCUT_ACTIONS.SAVE]: { enabled: !loading, allowInInput: true },
          [SHORTCUT_ACTIONS.SAVE_AND_NEW]: { enabled: !loading && Boolean(onSaveAndNew), allowInInput: true },
          [SHORTCUT_ACTIONS.SAVE_AND_CLOSE]: { enabled: !loading, allowInInput: true },
          [SHORTCUT_ACTIONS.CLOSE]: { allowInInput: true },
          [SHORTCUT_ACTIONS.ADD_ROW]: { enabled: !loading },
          [SHORTCUT_ACTIONS.DELETE_ROW]: { enabled: !loading },
          [SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH]: { enabled: true, allowInInput: true },
        },
      ),
    [
      handleAddAllocationRow,
      handleClosePopup,
      handleDeleteAllocationRow,
      handleQuickAllocationSearch,
      handleSave,
      handleSaveAndNew,
      loading,
      onSaveAndNew,
      openShortcutHelp,
      shortcutActions,
    ],
  )

  const shouldHandleShortcutEvent = useCallback(
    () => isPopupShortcutScopeTopMost(popupShortcutScopeId),
    [popupShortcutScopeId],
  )

  useShortcutBindings(shortcutBindings, {
    enabled: visible,
    shouldHandleEvent: shouldHandleShortcutEvent,
  })

  return (
    <Popup
      visible={visible}
      deferRendering
      wrapperAttr={{
        ...createPopupShortcutWrapperAttr(popupShortcutScopeId),
        class: 'fixed-asset-editor-popup',
      }}
      title={title}
      showTitle
      showCloseButton={false}
      dragEnabled={false}
      hideOnOutsideClick={false}
      width="100vw"
      height="100vh"
      maxWidth="100vw"
      maxHeight="100vh"
      container="body"
      position={{ my: 'center', at: 'center', of: window }}
      animation={{ show: { duration: 150 }, hide: { duration: 100 } }}
      onHiding={(event) => {
        if (loading) {
          event.cancel = true
          return
        }

        // Close already confirmed / in progress — allow hide once.
        if (closingRef.current) {
          return
        }

        if (allocationDirtyRef.current) {
          event.cancel = true
          void handleClosePopup()
        }
      }}
    >
      <ToolbarItem
        toolbar="top"
        location="after"
        render={() => (
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm">
            <Button
              icon="columnchooser"
              stylingMode="text"
              disabled={loading}
              hint={t('SYS_GRID_COLUMN_SETTING', 'Thiết lập cột lưới')}
              onClick={openColumnSettings}
            />
            <Button
              icon="close"
              stylingMode="text"
              disabled={loading}
              hint={t('CANCEL', 'Hủy')}
              onClick={() => {
                void handleClosePopup()
              }}
            />
          </div>
        )}
      />

      <LookupPopupProvider>
        <div className="fixed-asset-editor relative flex h-full flex-col overflow-hidden bg-slate-50">
          {validationMessage || errorMessage ? (
            <div role="alert" className="m-3 whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-3 text-red-700">
              {validationMessage || errorMessage}
            </div>
          ) : null}
          <LoadPanel visible={loading} showPane showIndicator shading />
          <ShortcutHelpPopup
            visible={shortcutHelpVisible}
            shortcuts={shortcutHelpItems}
            onClose={closeShortcutHelp}
          />

          <div className="fixed-asset-editor__body min-h-0 flex-1 overflow-hidden px-3 pb-2">
            <div
              ref={formContainerRef}
              className="fixed-asset-general-info fixed-asset-general-info--compact rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <Form
                key={formMountKey}
                ref={formRef}
                formData={formInitialData}
                colCount={6}
                labelLocation="top"
                focusStateEnabled
                className="fixed-asset-form fixed-asset-form--compact"
                onFieldDataChanged={handleFieldDataChanged}
              >
                <Item dataField="ACQ_CHITINFO_ID" visible={false} />
                <Item dataField="ACQ_CHITDETAIL_ID" visible={false} />

                <TabbedItem
                  colSpan={6}
                  cssClass="fixed-asset-form-tabs fixed-asset-form-tabs--compact"
                  tabPanelOptions={tabPanelOptions}
                >
                  <Tab
                    title={t('GENERAL_INFO', 'Thông tin chung')}
                    colCount={6}
                    cssClass="fixed-asset-form-tab"
                  >
                    <GroupItem
                      colSpan={3}
                      colCount={3}
                      caption={t('ASSET_BASIC_INFO', 'Thông tin tài sản')}
                      cssClass="fixed-asset-form-group fixed-asset-form-group--compact fixed-asset-form-group--primary"
                    >
                      <Item
                        dataField="ASSET_CD"
                        label={{ text: t('ASSET_CD', 'Mã tài sản') }}
                        editorOptions={createOutlinedEditorOptions({ validationMessageMode: 'always' })}
                        validationRules={[
                          { type: 'required', message: requiredMasterMessage(t, t('ASSET_CD', 'Mã tài sản')) },
                        ]}
                      />
                      <Item
                        dataField="ASSET_NM"
                        label={{ text: t('ASSET_NM', 'Tên tài sản') }}
                        colSpan={2}
                        editorOptions={createOutlinedEditorOptions({ validationMessageMode: 'always' })}
                        validationRules={[
                          { type: 'required', message: requiredMasterMessage(t, t('ASSET_NM', 'Tên tài sản')) },
                        ]}
                      />
                      <Item
                        dataField="ACC_CD"
                        label={{ text: t('ACC_CD', 'Mã tài khoản') }}
                        editorType="dxSelectBox"
                        editorOptions={accountSelectBoxOptions}
                      />
                      <Item
                        dataField="ORIGINAL_AMT"
                        label={{ text: t('ORIGINAL_AMT', 'Nguyên giá') }}
                        editorType="dxNumberBox"
                        editorOptions={createOutlinedEditorOptions({ min: 0, format: '#,##0.##' })}
                      />
                      <Item
                        dataField="STATUS"
                        label={{ text: t('STATUS', 'Trạng thái') }}
                        editorType="dxSelectBox"
                        editorOptions={statusSelectBoxOptions}
                      />
                    </GroupItem>

                    <GroupItem
                      colSpan={3}
                      colCount={3}
                      caption={t('ASSET_USAGE_INFO', 'Thông tin sử dụng')}
                      cssClass="fixed-asset-form-group fixed-asset-form-group--compact fixed-asset-form-group--secondary"
                    >
                      <Item
                        dataField="RECEIVE_YMD"
                        label={{ text: t('RECEIVE_YMD', 'Ngày tiếp nhận') }}
                        editorType="dxDateBox"
                        editorOptions={createOutlinedEditorOptions({
                          type: 'date',
                          displayFormat: 'dd/MM/yyyy',
                          dateSerializationFormat: 'yyyyMMdd',
                        })}
                      />
                      <Item
                        dataField="USE_START_YMD"
                        label={{ text: t('USE_START_YMD', 'Ngày SD') }}
                        editorType="dxDateBox"
                        editorOptions={createOutlinedEditorOptions({
                          type: 'date',
                          displayFormat: 'dd/MM/yyyy',
                          dateSerializationFormat: 'yyyyMMdd',
                          validationMessageMode: 'always',
                        })}
                        validationRules={[
                          { type: 'required', message: requiredMasterMessage(t, t('USE_START_YMD', 'Ngày bắt đầu sử dụng')) },
                        ]}
                      />
                       {/* <Item
                        dataField="ACQ_CHIT_NO"
                        label={{ text: t('ACQ_CHIT_NO', 'CT hình thành') }}
                        editorOptions={createOutlinedEditorOptions()}
                      /> */}
                       <Item
                        
                      />
                      <Item
                        dataField="NOTE"
                        label={{ text: t('NOTE', 'Ghi chú') }}
                        colSpan={3}
                        editorOptions={createOutlinedEditorOptions({
                          placeholder: t('NOTE', 'Ghi chú') + '...',
                        })}
                      />
                    </GroupItem>
                  </Tab>

                  <Tab
                    title={t('RECOGNITION_DEPRECIATION', 'Ghi nhận & khấu hao')}
                    colCount={6}
                    cssClass="fixed-asset-form-tab"
                  >
                    <Item
                      dataField="DEPRE_START_YM"
                      label={{ text: t('DEPRE_START_YM', 'Từ tháng') }}
                      editorOptions={createOutlinedEditorOptions({ placeholder: 'YYYYMM' })}
                      visible={false}
                    />
                    <Item
                      dataField="DEPRE_END_YM"
                      label={{ text: t('DEPRE_END_YM', 'Đến tháng') }}
                      editorOptions={createOutlinedEditorOptions({ placeholder: 'YYYYMM' })}
                      visible={false}
                    />
                    <Item
                      dataField="USEFUL_LIFE_MONTH"
                      label={{ text: t('USEFUL_LIFE_MONTH', 'Tổng tháng KH') }}
                      editorType="dxNumberBox"
                      editorOptions={createOutlinedEditorOptions({
                        min: 0.01,
                        max: 12000,
                        format: '#0.##',
                        step: 0.1,
                        showSpinButtons: true,
                        placeholder: t('USEFUL_LIFE_MONTH_HINT', 'VD: 12.3 = 12 tháng 3 ngày'),
                      })}
                    />
                    <Item
                      dataField="NORMAL_MONTH_COUNT"
                      label={{ text: t('NORMAL_MONTH_COUNT', 'Tháng giữa') }}
                      editorType="dxNumberBox"
                      editorOptions={createOutlinedEditorOptions({ min: 0, showSpinButtons: true })}
                      visible={false}
                    />
                    <Item
                      dataField="ACCUM_DEPRE_AMT"
                      label={{ text: t('ACCUM_DEPRE_AMT', 'HM lũy kế') }}
                      editorType="dxNumberBox"
                      editorOptions={createOutlinedEditorOptions({ min: 0, format: '#,##0.##' })}
                    />
                    <Item
                      dataField="REMAIN_DEPRE_AMT"
                      label={{ text: t('REMAIN_DEPRE_AMT', 'Còn lại KH') }}
                      editorType="dxNumberBox"
                      editorOptions={createOutlinedEditorOptions({
                        min: 0,
                        format: '#,##0.##',
                        readOnly: true,
                        focusStateEnabled: false,
                        tabIndex: -1,
                      })}
                    />
                    <Item
                      dataField="FIRST_DEPRE_AMT"
                      label={{ text: t('FIRST_DEPRE_AMT', 'KH đầu') }}
                      editorType="dxNumberBox"
                      editorOptions={createOutlinedEditorOptions({ min: 0, format: '#,##0.##' })}
                    />
                    <Item
                      dataField="NORMAL_DEPRE_AMT"
                      label={{ text: t('NORMAL_DEPRE_AMT', 'KH giữa') }}
                      editorType="dxNumberBox"
                      editorOptions={createOutlinedEditorOptions({ min: 0, format: '#,##0.##' })}
                    />
                    <Item
                      dataField="LAST_DEPRE_AMT"
                      label={{ text: t('LAST_DEPRE_AMT', 'KH cuối') }}
                      editorType="dxNumberBox"
                      editorOptions={createOutlinedEditorOptions({ min: 0, format: '#,##0.##' })}
                    />
                  </Tab>
                </TabbedItem>
              </Form>
            </div>

            <div className="fixed-asset-allocation-panel mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="fixed-asset-allocation-section__header">
                <h3 className="fixed-asset-allocation-section__title">
                  {t('ALLOCATION_INFO', 'Phân bổ khấu hao')}
                </h3>
              </div>
              {allocationNeedsReview ? (
                <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {t(
                    'FA_ALLOC_HEADER_CHANGED',
                    'Số tiền khấu hao đã thay đổi. Vui lòng kiểm tra hoặc phân bổ lại chi tiết.',
                  )}
                </div>
              ) : null}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <Suspense
                  fallback={
                    <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-500">
                      {t('Loading allocations...', 'Đang tải phân bổ...')}
                    </div>
                  }
                >
                  <FixedAssetAllocationGridPopup
                    ref={allocationGridRef}
                    companyCd={draft.COMPANY_CD}
                    assetId={toNumber(draft.ASSET_ID)}
                    allocations={draft.ALLOCATIONS}
                    depreciationHeader={depreciationHeader}
                    onChange={handleAllocationsChange}
                    onDirty={handleAllocationDirty}
                    onReallocated={handleAllocationReallocated}
                    height="100%"
                    isVisible={visible}
                    screenCd={FIXED_ASSET_SCREEN_CD}
                    gridId={FIXED_ASSET_ALLOCATION_GRID_ID}
                    persistColumnSettings
                    columnSettingStateRef={allocationColumnSettingStateRef}
                  />
                </Suspense>
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-4 py-3">
            <Button
              icon="save"
              text={t('TIT_SAVE', 'Lưu')}
              type="default"
              stylingMode="contained"
              onClick={() => {
                void handleSave()
              }}
              disabled={loading}
            />
            {onSaveAndNew ? (
              <Button
                icon="save"
                text={t('SAVE_AND_NEW', 'Lưu và thêm mới')}
                type="default"
                stylingMode="outlined"
                onClick={() => {
                  void handleSaveAndNew()
                }}
                disabled={loading}
              />
            ) : null}
            <Button
              icon="close"
              text={t('CANCEL', 'Hủy')}
              stylingMode="outlined"
              onClick={() => {
                void handleClosePopup()
              }}
              disabled={loading}
            />
          </div>
          <GridColumnSettingsPopup
            visible={columnSettingsVisible}
            title={t('AUDIT_SETTING_SHOW_HIDE', 'Thiết lập cột')}
            tabs={columnSettingsTabs}
            onClose={() => setColumnSettingsVisible(false)}
            onReset={handleColumnSettingsReset}
            onSaveTabs={handleColumnSettingsSave}
          />
        </div>
      </LookupPopupProvider>
    </Popup>
  )
}
