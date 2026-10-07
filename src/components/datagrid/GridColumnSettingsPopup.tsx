import { type DragEvent as ReactDragEvent, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import NumberBox from "devextreme-react/number-box"
import Popup from "devextreme-react/popup"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"
import { GripVertical } from "lucide-react"

import { useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import { resolveSysGridColumnDisplayCaption } from "@/lib/gridColumnSettingUtils"
import { getApiErrorMessage } from "@/api/apiTypes"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import {
  createPopupShortcutWrapperAttr,
  isPopupShortcutScopeTopMost,
  usePopupShortcutScopeId,
} from "@/lib/popupShortcutScope"
import { createShortcutBindings } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import type { GridColumnSettingEditorItem, GridColumnTemplateOption } from "@/types/sysGridColumnSetting"

export type GridColumnSettingsPopupTab = {
  key: string
  title: string
  items: GridColumnSettingEditorItem[]
  loading?: boolean
}

export type GridColumnSettingsPopupTabSaveItem = {
  key: string
  items: GridColumnSettingEditorItem[]
}

export type GridColumnSettingsPopupTemplateCreatePayload = {
  isDefaultTemplate: boolean
  templateName: string
}

type GridColumnSettingsPopupProps = {
  visible: boolean
  title?: string
  items?: GridColumnSettingEditorItem[]
  loading?: boolean
  tabs?: GridColumnSettingsPopupTab[]
  templates?: GridColumnTemplateOption[]
  selectedTemplateId?: number
  templateLoading?: boolean
  onClose: () => void
  onReset?: (activeTabKey?: string) => void | Promise<void>
  onSave?: (items: GridColumnSettingEditorItem[]) => void | Promise<void>
  onSaveTabs?: (tabs: GridColumnSettingsPopupTabSaveItem[]) => void | Promise<void>
  onTemplateChange?: (templateId: number) => void | Promise<void>
  onCreateTemplate?: (payload: GridColumnSettingsPopupTemplateCreatePayload) => void | Promise<void>
  onSetDefaultTemplate?: (templateId: number) => void | Promise<void>
}

type DropPosition = "before" | "after"

type DropTarget = {
  columnName: string
  position: DropPosition
}

function cloneItems(items: GridColumnSettingEditorItem[]): GridColumnSettingEditorItem[] {
  return items.map((item) => ({
    ...item,
  }))
}

function assignReorderedVisibleIndexes(items: GridColumnSettingEditorItem[]): GridColumnSettingEditorItem[] {
  const orderedSlots = items
    .map((item, index) => ({
      slot: typeof item.visibleIndex === "number" ? item.visibleIndex : Number.MAX_SAFE_INTEGER + index,
    }))
    .sort((left, right) => left.slot - right.slot)
    .map((item, index) => (Number.isFinite(item.slot) ? item.slot : index))

  return items.map((item, index) => ({
    ...item,
    visibleIndex: orderedSlots[index] ?? index,
  }))
}

function reorderItems(
  items: GridColumnSettingEditorItem[],
  sourceColumnName: string,
  targetColumnName: string,
  position: DropPosition,
) {
  const nextItems = [...items]
  const sourceIndex = nextItems.findIndex((item) => item.columnName === sourceColumnName)
  const targetIndex = nextItems.findIndex((item) => item.columnName === targetColumnName)

  if (sourceIndex < 0 || targetIndex < 0 || sourceColumnName === targetColumnName) {
    return cloneItems(nextItems)
  }

  const [sourceItem] = nextItems.splice(sourceIndex, 1)
  const normalizedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
  const nextIndex = position === "after" ? normalizedTargetIndex + 1 : normalizedTargetIndex

  nextItems.splice(Math.max(0, Math.min(nextIndex, nextItems.length)), 0, sourceItem)
  return assignReorderedVisibleIndexes(nextItems)
}

function resolveDropPosition(event: ReactDragEvent<HTMLDivElement>): DropPosition {
  const { top, height } = event.currentTarget.getBoundingClientRect()
  return event.clientY - top >= height / 2 ? "after" : "before"
}

function buildItemsSignature(items: GridColumnSettingEditorItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      allowHiding: item.allowHiding ? 1 : 0,
      caption: item.caption,
      columnName: item.columnName.toUpperCase(),
      fixedPosition: item.fixedPosition,
      isVisible: item.isVisible ? 1 : 0,
      sortIndex: item.sortIndex ?? null,
      sortOrder: item.sortOrder,
      visibleIndex: item.visibleIndex ?? null,
      width: item.width ?? null,
    })),
  )
}

function buildTabsSignature(tabs: GridColumnSettingsPopupTab[]): string {
  return JSON.stringify(
    tabs.map((tab) => ({
      items: buildItemsSignature(tab.items),
      key: tab.key,
      loading: tab.loading ? 1 : 0,
      title: tab.title,
    })),
  )
}

function isDragHandleTarget(target: EventTarget | null): boolean {
  const element = target instanceof HTMLElement ? target : null
  if (!element) {
    return false
  }

  return !element.closest(".dx-texteditor, .dx-checkbox, .dx-selectbox, button, input, textarea, select")
}

export function GridColumnSettingsPopup({
  visible,
  title,
  items = [],
  loading = false,
  tabs = [],
  templates = [],
  selectedTemplateId = 0,
  templateLoading = false,
  onClose,
  onReset,
  onSave,
  onSaveTabs,
  onTemplateChange,
  onCreateTemplate,
  onSetDefaultTemplate,
}: GridColumnSettingsPopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const [searchText, setSearchText] = useState("")
  const [draftItems, setDraftItems] = useState<GridColumnSettingEditorItem[]>([])
  const [draftItemsByTab, setDraftItemsByTab] = useState<Record<string, GridColumnSettingEditorItem[]>>({})
  const [activeTabKey, setActiveTabKey] = useState("")
  const [draggingColumnName, setDraggingColumnName] = useState("")
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [resetting, setResetting] = useState(false)
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [newTemplateIsDefault, setNewTemplateIsDefault] = useState(false)
  const [templateBusy, setTemplateBusy] = useState(false)
  const hydratedSourceSignatureRef = useRef("")
  const draftDirtyRef = useRef(false)
  const draggingColumnNameRef = useRef("")
  const popupShortcutScopeId = usePopupShortcutScopeId("grid-column-settings")
  const companyLangRevision = useCompanyLangRevision()

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback) : (fallback ?? key)),
    [translate],
  )
  const translateCaption = useCallback(
    (key: string, fallback: string) => t(key, fallback),
    [t],
  )
  const dragTooltip = t("GRID_DRAG_TO_REORDER", "Kéo để sắp xếp thứ tự cột")
  const tabbedMode = tabs.length > 0
  const templateMode = !tabbedMode && (
    templates.length > 0 ||
    Boolean(onTemplateChange) ||
    Boolean(onCreateTemplate) ||
    Boolean(onSetDefaultTemplate)
  )

  const resolveDisplayCaption = useCallback(
    (item: GridColumnSettingEditorItem) =>
      resolveSysGridColumnDisplayCaption(
        item.labelText,
        item.columnLabelText,
        item.columnName,
        item.caption,
        translateCaption,
      ),
    [translateCaption],
  )
  const sourceSignature = useMemo(
    () =>
      `${companyLangRevision}::${tabbedMode ? buildTabsSignature(tabs) : buildItemsSignature(items)}`,
    [companyLangRevision, items, tabbedMode, tabs],
  )

  useEffect(() => {
    if (!visible) {
      setResetting(false)
      setCreatingTemplate(false)
      setTemplateBusy(false)
      hydratedSourceSignatureRef.current = ""
      draftDirtyRef.current = false
      return
    }

    if (hydratedSourceSignatureRef.current === sourceSignature) {
      return
    }

    if (draftDirtyRef.current) {
      hydratedSourceSignatureRef.current = sourceSignature
      return
    }

    hydratedSourceSignatureRef.current = sourceSignature
    draftDirtyRef.current = false

    setSearchText("")
    draggingColumnNameRef.current = ""
    setDraggingColumnName("")
    setDropTarget(null)
    setCreatingTemplate(false)
    setNewTemplateName("")
    setNewTemplateIsDefault(false)

    if (!tabbedMode) {
      setDraftItems(
        cloneItems(items).map((item) => ({
          ...item,
          caption: resolveDisplayCaption(item),
        })),
      )
      setDraftItemsByTab({})
      setActiveTabKey("")
      return
    }

    const nextDraftItemsByTab = Object.fromEntries(
      tabs.map((tab) => [
        tab.key,
        cloneItems(tab.items).map((item) => ({
          ...item,
          caption: resolveDisplayCaption(item),
        })),
      ] as const),
    )

    setDraftItems([])
    setDraftItemsByTab(nextDraftItemsByTab)
    setActiveTabKey((currentKey) => {
      if (currentKey && tabs.some((tab) => tab.key === currentKey)) {
        return currentKey
      }

      return tabs[0]?.key ?? ""
    })
  }, [items, resolveDisplayCaption, sourceSignature, tabbedMode, tabs, visible])

  useEffect(() => {
    draftDirtyRef.current = false
  }, [selectedTemplateId])

  const activeTab = useMemo(() => {
    if (!tabbedMode) {
      return null
    }

    return tabs.find((tab) => tab.key === activeTabKey) ?? tabs[0] ?? null
  }, [activeTabKey, tabbedMode, tabs])

  const activeItems = useMemo(() => {
    if (!tabbedMode) {
      return draftItems
    }

    if (!activeTab) {
      return []
    }

    return draftItemsByTab[activeTab.key] ?? []
  }, [activeTab, draftItems, draftItemsByTab, tabbedMode])

  const activeLoading = tabbedMode ? Boolean(activeTab?.loading) : loading
  const templateBusyState = templateBusy || templateLoading
  const activeTemplate = useMemo(
    () => templates.find((item) => item.templateId === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  )

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) {
      return activeItems
    }

    return activeItems.filter((item) =>
      item.caption.toLowerCase().includes(keyword) || item.columnName.toLowerCase().includes(keyword),
    )
  }, [activeItems, searchText])

  const fixedOptions = useMemo(
    () => [
      { value: "none", label: t("GRID_NOT_FIXED", "Không cố định") },
      { value: "left", label: t("GRID_FIXED_LEFT", "Cố định trái") },
      { value: "right", label: t("GRID_FIXED_RIGHT", "Cố định phải") },
    ],
    [t],
  )

  const updateDraftCollection = (updater: (currentItems: GridColumnSettingEditorItem[]) => GridColumnSettingEditorItem[]) => {
    draftDirtyRef.current = true
    if (!tabbedMode) {
      setDraftItems((currentItems) => updater(currentItems))
      return
    }

    if (!activeTab) {
      return
    }

    setDraftItemsByTab((currentTabs) => ({
      ...currentTabs,
      [activeTab.key]: updater(currentTabs[activeTab.key] ?? []),
    }))
  }

  const updateItem = (columnName: string, updater: (item: GridColumnSettingEditorItem) => GridColumnSettingEditorItem) => {
    updateDraftCollection((currentItems) =>
      currentItems.map((item) => (item.columnName === columnName ? updater(item) : item)),
    )
  }

  const handleDragStart = (columnName: string) => (event: ReactDragEvent<HTMLDivElement>) => {
    if (templateBusyState || !isDragHandleTarget(event.target)) {
      event.preventDefault()
      return
    }

    event.stopPropagation()
    draggingColumnNameRef.current = columnName
    setDraggingColumnName(columnName)
    setDropTarget(null)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", columnName)
  }

  const handleDragOver = (columnName: string) => (event: ReactDragEvent<HTMLDivElement>) => {
    const sourceColumnName = draggingColumnNameRef.current || draggingColumnName
    if (!sourceColumnName || templateBusyState) {
      return
    }

    event.preventDefault()

    if (sourceColumnName === columnName) {
      if (dropTarget !== null) {
        setDropTarget(null)
      }
      return
    }

    const position = resolveDropPosition(event)
    if (dropTarget?.columnName === columnName && dropTarget.position === position) {
      return
    }

    event.dataTransfer.dropEffect = "move"
    setDropTarget({ columnName, position })
  }

  const handleDrop = (columnName: string) => (event: ReactDragEvent<HTMLDivElement>) => {
    if (templateBusyState) {
      return
    }

    event.preventDefault()

    const sourceColumnName = draggingColumnNameRef.current || draggingColumnName || event.dataTransfer.getData("text/plain")
    const position =
      dropTarget?.columnName === columnName
        ? dropTarget.position
        : resolveDropPosition(event)

    draggingColumnNameRef.current = ""
    setDraggingColumnName("")
    setDropTarget(null)

    if (!sourceColumnName || sourceColumnName === columnName) {
      return
    }

    updateDraftCollection((currentItems) => reorderItems(currentItems, sourceColumnName, columnName, position))
  }

  const handleDragEnd = () => {
    draggingColumnNameRef.current = ""
    setDraggingColumnName("")
    setDropTarget(null)
  }

  const reportSaveError = (error: unknown) => {
    notify(getApiErrorMessage(error, t("SAVE_FAILED", "Không lưu được thiết lập cột")), "error", 4000)
  }

  const handleSave = useCallback(() => {
    if (activeLoading || resetting || templateBusyState) {
      return
    }

    try {
      if (tabbedMode) {
        const nextTabs = tabs.map((tab) => ({
          key: tab.key,
          items: cloneItems(draftItemsByTab[tab.key] ?? []),
        }))

        if (onSaveTabs) {
          void Promise.resolve(onSaveTabs(nextTabs)).catch(reportSaveError)
          return
        }

        if (nextTabs[0] && onSave) {
          void Promise.resolve(onSave(nextTabs[0].items)).catch(reportSaveError)
        }
        return
      }

      if (onSave) {
        void Promise.resolve(onSave(cloneItems(draftItems))).catch(reportSaveError)
      }
    } catch (error) {
      reportSaveError(error)
    }
  }, [activeLoading, draftItems, draftItemsByTab, onSave, onSaveTabs, resetting, tabbedMode, tabs, templateBusyState])

  const handleReset = async () => {
    if (!onReset || activeLoading || resetting || templateBusyState) {
      return
    }

    setResetting(true)

    try {
      await onReset(tabbedMode ? activeTab?.key : undefined)
    } finally {
      setResetting(false)
    }
  }

  const handleTemplateSelectionChange = async (templateId: number) => {
    if (!onTemplateChange || templateId === selectedTemplateId || templateBusyState) {
      return
    }

    setTemplateBusy(true)

    try {
      await onTemplateChange(templateId)
    } finally {
      setTemplateBusy(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!onCreateTemplate || templateBusyState) {
      return
    }

    const normalizedTemplateName = newTemplateName.trim()

    if (!normalizedTemplateName) {
      return
    }

    setTemplateBusy(true)

    try {
      await onCreateTemplate({
        isDefaultTemplate: newTemplateIsDefault,
        templateName: normalizedTemplateName,
      })
      setCreatingTemplate(false)
      setNewTemplateName("")
      setNewTemplateIsDefault(false)
    } finally {
      setTemplateBusy(false)
    }
  }

  const shortcutBindings = useMemo(
    () =>
      createShortcutBindings(
        [SHORTCUT_ACTIONS.SAVE, SHORTCUT_ACTIONS.CLOSE],
        {
          [SHORTCUT_ACTIONS.SAVE]: () => handleSave(),
          [SHORTCUT_ACTIONS.CLOSE]: () => onClose(),
        },
        {
          [SHORTCUT_ACTIONS.SAVE]: { allowInInput: true, commitActiveEditor: true },
          [SHORTCUT_ACTIONS.CLOSE]: { allowInInput: true },
        },
      ),
    [handleSave, onClose],
  )

  useShortcutBindings(shortcutBindings, {
    enabled: visible,
    shouldHandleEvent: () => isPopupShortcutScopeTopMost(popupShortcutScopeId),
  })

  const handleSetDefaultTemplateClick = async () => {
    if (!activeTemplate || !onSetDefaultTemplate || activeTemplate.isDefaultTemplate || templateBusyState) {
      return
    }

    setTemplateBusy(true)

    try {
      await onSetDefaultTemplate(activeTemplate.templateId)
    } finally {
      setTemplateBusy(false)
    }
  }

  return (
    <Popup
      visible={visible}
      title={title ?? t("AUDIT_SETTING_SHOW_HIDE", "Thiết lập cột hiển thị")}
      showTitle={true}
      dragEnabled={true}
      hideOnOutsideClick={false}
      width="min(980px, calc(100vw - 2rem))"
      maxWidth={980}
      height="min(80vh, 820px)"
      wrapperAttr={createPopupShortcutWrapperAttr(popupShortcutScopeId)}
      onHiding={onClose}
    >
      <div className="flex h-full flex-col gap-3">
        {tabbedMode && tabs.length > 1 ? (
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {tabs.map((tab) => {
              const active = tab.key === activeTab?.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                  onClick={() => {
                    setActiveTabKey(tab.key)
                    setSearchText("")
                    draggingColumnNameRef.current = ""
                    setDraggingColumnName("")
                    setDropTarget(null)
                  }}
                >
                  {tab.title}
                </button>
              )
            })}
          </div>
        ) : null}

        {templateMode ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[260px] flex-1">
                <div className="mb-1 text-xs font-semibold text-slate-600">
                  {t("GRID_TEMPLATE", "Mẫu hiển thị")}
                </div>
                <SelectBox
                  items={templates}
                  valueExpr="templateId"
                  displayExpr="templateName"
                  value={selectedTemplateId}
                  stylingMode="outlined"
                  searchEnabled={true}
                  disabled={templateBusyState || templates.length === 0}
                  onValueChanged={(event) => {
                    const nextValue = Number(event.value)
                    void handleTemplateSelectionChange(Number.isFinite(nextValue) ? nextValue : 0)
                  }}
                />
              </div>

              {onSetDefaultTemplate ? (
                <Button
                  stylingMode="outlined"
                  text={t("GRID_SET_DEFAULT_TEMPLATE", "Đặt làm mặc định")}
                  disabled={!activeTemplate || activeTemplate.isDefaultTemplate || templateBusyState}
                  onClick={() => {
                    void handleSetDefaultTemplateClick()
                  }}
                />
              ) : null}

              {onCreateTemplate ? (
                <Button
                  stylingMode="outlined"
                  text={creatingTemplate ? t("MSG_BTNCAN", "Hủy") : t("GRID_NEW_TEMPLATE", "Tạo mẫu mới")}
                  disabled={templateBusyState}
                  onClick={() => {
                    if (creatingTemplate) {
                      setCreatingTemplate(false)
                      setNewTemplateName("")
                      setNewTemplateIsDefault(false)
                      return
                    }

                    setCreatingTemplate(true)
                    setNewTemplateName(activeTemplate?.templateName ?? "")
                    setNewTemplateIsDefault(false)
                  }}
                />
              ) : null}
            </div>

            {creatingTemplate ? (
              <div className="mt-3 grid gap-3 border-t border-slate-200 pt-3 lg:grid-cols-[minmax(280px,1fr)_auto_auto]">
                <TextBox
                  value={newTemplateName}
                  stylingMode="outlined"
                  placeholder={t("GRID_TEMPLATE_NAME", "Tên mẫu (ví dụ: Theo dõi công nợ)")}
                  onValueChanged={(event) => {
                    const nextName = String(event.value ?? "")
                    setNewTemplateName(nextName)
                  }}
                />
                <div className="flex items-center">
                  <CheckBox
                    value={newTemplateIsDefault}
                    text={t("GRID_TEMPLATE_DEFAULT", "Dùng làm mặc định")}
                    onValueChanged={(event) => setNewTemplateIsDefault(Boolean(event.value))}
                  />
                </div>
                <div className="flex items-center justify-end">
                  <Button
                    type="default"
                    text={t("GRID_CREATE_TEMPLATE", "Tạo mẫu")}
                    disabled={!newTemplateName.trim() || templateBusyState}
                    onClick={() => {
                      void handleCreateTemplate()
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[240px] flex-1">
            <TextBox
              mode="search"
              stylingMode="outlined"
              value={searchText}
              showClearButton={true}
              placeholder={t("Search_column", "Tìm theo tên cột...")}
              onValueChanged={(event) => setSearchText(String(event.value ?? ""))}
            />
          </div>
          <Button
            stylingMode="text"
            text={t("SHOW_ALL_COLUMNS", "Hiện tất cả")}
            disabled={templateBusyState}
            onClick={() => {
              updateDraftCollection((currentItems) =>
                currentItems.map((item) => ({
                  ...item,
                  isVisible: item.allowHiding ? true : item.isVisible,
                })),
              )
            }}
          />
          <Button
            stylingMode="text"
            text={t("UNFIX_ALL_COLUMNS", "Bỏ cố định tất cả")}
            disabled={templateBusyState}
            onClick={() => {
              updateDraftCollection((currentItems) =>
                currentItems.map((item) => ({
                  ...item,
                  fixedPosition: item.allowHiding ? "none" : item.fixedPosition,
                })),
              )
            }}
          />
        </div>

        <div className="grid grid-cols-[48px_40px_minmax(220px,2fr)_88px_120px_150px] gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
          <div className="flex items-center justify-center" title={dragTooltip}>
            <GripVertical size={16} className="text-slate-500" />
          </div>
          <div>{t("VISIBLE_INDEX", "STT")}</div>
          <div>{t("COLUMN_CAPTION", "Tên cột")}</div>
          <div className="text-center">{t("IS_VISIBLE", "Hiện")}</div>
          <div>{t("COLUMN_WIDTH", "Độ rộng")}</div>
          <div>{t("FIXED_POSITION", "Cố định")}</div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200"
          onDragOver={(event) => {
            if (draggingColumnName) {
              event.preventDefault()
            }
          }}
        >
          {activeLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              {t("LOADING", "Đang tải...")}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              {t("NO_DATA", "Không có cột nào")}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredItems.map((item, index) => (
                <div
                  key={item.columnName}
                  draggable={!templateBusyState}
                  className={`relative grid grid-cols-[48px_40px_minmax(220px,2fr)_88px_120px_150px] items-center gap-2 px-3 py-2.5 transition-colors ${
                    draggingColumnName === item.columnName ? "bg-slate-100 opacity-60" : "bg-white"
                  }`}
                  onDragStart={handleDragStart(item.columnName)}
                  onDragOver={handleDragOver(item.columnName)}
                  onDrop={handleDrop(item.columnName)}
                  onDragEnd={handleDragEnd}
                >
                  {dropTarget?.columnName === item.columnName && dropTarget.position === "before" ? (
                    <div className="absolute inset-x-0 top-0 border-t-2 border-blue-500" />
                  ) : null}
                  {dropTarget?.columnName === item.columnName && dropTarget.position === "after" ? (
                    <div className="absolute inset-x-0 bottom-0 border-b-2 border-blue-500" />
                  ) : null}

                  <div className="flex items-center justify-center">
                    <div
                      className="inline-flex cursor-grab items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-600 active:cursor-grabbing"
                      title={dragTooltip}
                      aria-label={dragTooltip}
                    >
                      <GripVertical size={16} />
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-slate-500">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <TextBox
                      value={item.caption}
                      stylingMode="outlined"
                      disabled={templateBusyState}
                      inputAttr={{ "aria-label": `${t("COLUMN_CAPTION", "Tên cột")}: ${item.caption || item.columnName}` }}
                      onValueChanged={(event) => {
                        updateItem(item.columnName, (currentItem) => ({
                          ...currentItem,
                          caption: String(event.value ?? ""),
                        }))
                      }}
                    />
                  </div>

                  <div className="flex justify-center">
                    <CheckBox
                      value={item.isVisible}
                      disabled={!item.allowHiding || templateBusyState}
                      onValueChanged={(event) => {
                        if (!event.event) {
                          return
                        }

                        updateItem(item.columnName, (currentItem) => ({
                          ...currentItem,
                          isVisible: Boolean(event.value),
                        }))
                      }}
                    />
                  </div>

                  <NumberBox
                    value={item.width ?? undefined}
                    min={40}
                    max={2000}
                    step={10}
                    showSpinButtons={true}
                    stylingMode="outlined"
                    disabled={templateBusyState}
                    onValueChanged={(event) => {
                      updateItem(item.columnName, (currentItem) => ({
                        ...currentItem,
                        width: typeof event.value === "number" && Number.isFinite(event.value) ? event.value : null,
                      }))
                    }}
                  />

                  <SelectBox
                    items={fixedOptions}
                    valueExpr="value"
                    displayExpr="label"
                    value={item.fixedPosition}
                    stylingMode="outlined"
                    disabled={templateBusyState}
                    onValueChanged={(event) => {
                      updateItem(item.columnName, (currentItem) => ({
                        ...currentItem,
                        fixedPosition: event.value === "left" || event.value === "right" ? event.value : "none",
                      }))
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          {onReset ? (
            <Button
              stylingMode="outlined"
              text={t("Reset", "Đặt lại")}
              disabled={activeLoading || resetting || templateBusyState}
              onClick={() => {
                void handleReset()
              }}
            />
          ) : null}
          <Button
            stylingMode="outlined"
            text={t("MSG_BTNCAN", "Hủy")}
            disabled={resetting || templateBusyState}
            onClick={onClose}
          />
          <Button
            type="default"
            text={t("dxDataGrid-editingSaveRowChanges", "Lưu")}
            disabled={activeLoading || resetting || templateBusyState}
            onClick={handleSave}
          />
        </div>
      </div>
    </Popup>
  )
}

export default GridColumnSettingsPopup
