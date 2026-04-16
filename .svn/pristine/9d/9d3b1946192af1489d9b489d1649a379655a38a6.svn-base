import { type DragEvent as ReactDragEvent, useContext, useEffect, useMemo, useRef, useState } from "react"

import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import NumberBox from "devextreme-react/number-box"
import Popup from "devextreme-react/popup"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import { GripVertical } from "lucide-react"

import { LanguageContext } from "@/lib/i18nLoader"
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"

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

type GridColumnSettingsPopupProps = {
  visible: boolean
  title?: string
  items?: GridColumnSettingEditorItem[]
  loading?: boolean
  tabs?: GridColumnSettingsPopupTab[]
  onClose: () => void
  onReset?: (activeTabKey?: string) => void | Promise<void>
  onSave?: (items: GridColumnSettingEditorItem[]) => void | Promise<void>
  onSaveTabs?: (tabs: GridColumnSettingsPopupTabSaveItem[]) => void | Promise<void>
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

export function GridColumnSettingsPopup({
  visible,
  title,
  items = [],
  loading = false,
  tabs = [],
  onClose,
  onReset,
  onSave,
  onSaveTabs,
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
  const hydratedSourceSignatureRef = useRef("")

  const t = (key: string, fallback?: string) => translate ? translate(key, fallback) : (fallback ?? key)
  const dragTooltip = t("GRID_DRAG_TO_REORDER", "kéo và thả để chỉnh sửa vị trí")
  const tabbedMode = tabs.length > 0
  const sourceSignature = useMemo(
    () => (tabbedMode ? buildTabsSignature(tabs) : buildItemsSignature(items)),
    [items, tabbedMode, tabs],
  )

  useEffect(() => {
    if (!visible) {
      setResetting(false)
      hydratedSourceSignatureRef.current = ""
      return
    }

    if (hydratedSourceSignatureRef.current === sourceSignature) {
      return
    }

    hydratedSourceSignatureRef.current = sourceSignature

    setSearchText("")
    setDraggingColumnName("")
    setDropTarget(null)

    if (!tabbedMode) {
      setDraftItems(cloneItems(items))
      setDraftItemsByTab({})
      setActiveTabKey("")
      return
    }

    const nextDraftItemsByTab = Object.fromEntries(
      tabs.map((tab) => [tab.key, cloneItems(tab.items)] as const),
    )

    setDraftItems([])
    setDraftItemsByTab(nextDraftItemsByTab)
    setActiveTabKey((currentKey) => {
      if (currentKey && tabs.some((tab) => tab.key === currentKey)) {
        return currentKey
      }

      return tabs[0]?.key ?? ""
    })
  }, [items, sourceSignature, tabbedMode, tabs, visible])

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
      { value: "none", label: t("GRID_NOT_FIXED", "Not fixed") },
      { value: "left", label: t("GRID_FIXED_LEFT", "Fixed left") },
      { value: "right", label: t("GRID_FIXED_RIGHT", "Fixed right") },
    ],
    [translate],
  )

  const updateDraftCollection = (updater: (currentItems: GridColumnSettingEditorItem[]) => GridColumnSettingEditorItem[]) => {
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
    setDraggingColumnName(columnName)
    setDropTarget(null)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", columnName)
  }

  const handleDragOver = (columnName: string) => (event: ReactDragEvent<HTMLDivElement>) => {
    if (!draggingColumnName) {
      return
    }

    event.preventDefault()

    if (draggingColumnName === columnName) {
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
    event.preventDefault()

    const sourceColumnName = draggingColumnName || event.dataTransfer.getData("text/plain")
    const position =
      dropTarget?.columnName === columnName
        ? dropTarget.position
        : resolveDropPosition(event)

    setDraggingColumnName("")
    setDropTarget(null)

    if (!sourceColumnName || sourceColumnName === columnName) {
      return
    }

    updateDraftCollection((currentItems) => reorderItems(currentItems, sourceColumnName, columnName, position))
  }

  const handleDragEnd = () => {
    setDraggingColumnName("")
    setDropTarget(null)
  }

  const handleSave = () => {
    if (tabbedMode) {
      const nextTabs = tabs.map((tab) => ({
        key: tab.key,
        items: cloneItems(draftItemsByTab[tab.key] ?? []),
      }))

      if (onSaveTabs) {
        void onSaveTabs(nextTabs)
        return
      }

      if (nextTabs[0] && onSave) {
        void onSave(nextTabs[0].items)
      }
      return
    }

    if (onSave) {
      void onSave(cloneItems(draftItems))
    }
  }

  const handleReset = async () => {
    if (!onReset || activeLoading || resetting) {
      return
    }

    setResetting(true)

    try {
      await onReset(tabbedMode ? activeTab?.key : undefined)
    } finally {
      setResetting(false)
    }
  }

  return (
    <Popup
      visible={visible}
      title={title ?? t("AUDIT_SETTING_SHOW_HIDE", "Column Settings")}
      showTitle={true}
      dragEnabled={false}
      hideOnOutsideClick={false}
      width="min(1080px, calc(100vw - 2rem))"
      maxWidth={1080}
      height="min(80vh, 820px)"
      onHiding={onClose}
    >
      <div className="flex h-full flex-col gap-4">
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
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                  onClick={() => {
                    setActiveTabKey(tab.key)
                    setSearchText("")
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[260px] flex-1">
            <TextBox
              mode="search"
              stylingMode="outlined"
              value={searchText}
              showClearButton={true}
              placeholder={t("Search_column", "Search column")}
              onValueChanged={(event) => setSearchText(String(event.value ?? ""))}
            />
          </div>
          <Button
            stylingMode="text"
            text={t("SHOW_ALL_COLUMNS", "Show all")}
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
            text={t("UNFIX_ALL_COLUMNS", "Unfix all")}
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

        <div className="grid grid-cols-[56px_44px_minmax(220px,2fr)_110px_130px_170px] gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
          <div className="flex items-center justify-center" title={dragTooltip}>
            <GripVertical size={16} className="text-slate-500" />
          </div>
          <div>{t("VISIBLE_INDEX", "Order")}</div>
          <div>{t("COLUMN_CAPTION", "Column")}</div>
          <div>{t("IS_VISIBLE", "Visible")}</div>
          <div>{t("COLUMN_WIDTH", "Width")}</div>
          <div>{t("FIXED_POSITION", "Fixed")}</div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200">
          {activeLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              {t("LOADING", "Loading...")}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              {t("NO_DATA", "No data")}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredItems.map((item, index) => (
                <div
                  key={item.columnName}
                  className={`relative grid grid-cols-[56px_44px_minmax(220px,2fr)_110px_130px_170px] items-center gap-3 px-4 py-3 transition-colors ${
                    draggingColumnName === item.columnName ? "bg-slate-100 opacity-60" : "bg-white"
                  }`}
                  onDragOver={handleDragOver(item.columnName)}
                  onDrop={handleDrop(item.columnName)}
                >
                  {dropTarget?.columnName === item.columnName && dropTarget.position === "before" ? (
                    <div className="absolute inset-x-0 top-0 border-t-2 border-emerald-500" />
                  ) : null}
                  {dropTarget?.columnName === item.columnName && dropTarget.position === "after" ? (
                    <div className="absolute inset-x-0 bottom-0 border-b-2 border-emerald-500" />
                  ) : null}

                  <div className="flex items-center justify-center">
                    <div
                      className="inline-flex cursor-grab items-center justify-center rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-600 active:cursor-grabbing"
                      title={dragTooltip}
                      aria-label={dragTooltip}
                      draggable={true}
                      onDragStart={handleDragStart(item.columnName)}
                      onDragEnd={handleDragEnd}
                    >
                      <GripVertical size={16} />
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-slate-500">
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">{item.caption}</div>
                    <div className="truncate text-xs text-slate-500">{item.columnName}</div>
                  </div>

                  <CheckBox
                    value={item.isVisible}
                    disabled={!item.allowHiding}
                    onValueChanged={(event) => {
                      updateItem(item.columnName, (currentItem) => ({
                        ...currentItem,
                        isVisible: Boolean(event.value),
                      }))
                    }}
                  />

                  <NumberBox
                    value={item.width ?? undefined}
                    min={40}
                    max={2000}
                    step={10}
                    showSpinButtons={true}
                    stylingMode="outlined"
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

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          {onReset ? (
            <Button
              stylingMode="outlined"
              text={t("Reset", "Reset")}
              disabled={activeLoading || resetting}
              onClick={() => {
                void handleReset()
              }}
            />
          ) : null}
          <Button
            stylingMode="outlined"
            text={t("MSG_BTNCAN", "Cancel")}
            disabled={resetting}
            onClick={onClose}
          />
          <Button
            type="default"
            text={t("dxDataGrid-editingSaveRowChanges", "Save")}
            disabled={activeLoading || resetting}
            onClick={handleSave}
          />
        </div>
      </div>
    </Popup>
  )
}

export default GridColumnSettingsPopup
