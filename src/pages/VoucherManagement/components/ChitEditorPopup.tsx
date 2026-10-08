import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import "./ChitEditorPopup.css"
import Button from "devextreme-react/button"
import Form, { Item } from "devextreme-react/form"
import type dxForm from "devextreme/ui/form"
import LoadPanel from "devextreme-react/load-panel"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import notify from "devextreme/ui/notify"
import { useLocation, useNavigate } from "react-router-dom"

import GridColumnSettingsPopup, {
    type GridColumnSettingsPopupTab,
    type GridColumnSettingsPopupTabSaveItem,
} from "@/components/datagrid/GridColumnSettingsPopup"
import { type GridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import { LookupPopupProvider } from "@/components/lookup/LookupPopupHost"
import { ReferenceLookup } from "@/components/lookup"
import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import useShortcutHelp from "@/hooks/useShortcutHelp"
import useStateRef from "@/hooks/useStateRef"
import { getCurrentCompanyCd } from "@/lib/login"
import { LanguageContext } from "@/lib/i18nLoader"
import {
    createPopupShortcutWrapperAttr,
    isPopupShortcutScopeTopMost,
    usePopupShortcutScopeId,
} from "@/lib/popupShortcutScope"
import { createShortcutBindings } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"
import type { ChitInfo, ChitLedger, ChitType } from "@/types/voucher"
import {
    createDateRequiredRule,
    createRequiredRule,
    createTrimmedRequiredRule,
    createVoucherDateBoxEditorOptions,
    createVoucherEditorOptions,
} from "../forms/documentFieldConfig"
import {
    cloneChit,
    getChitTypeLabel,
    getVoucherEditorDetailGridId,
    isInventoryLinkedAccountingVoucherType,
} from "../chitUtils"
import { openVoucherReportViewer } from "../voucherReportViewer"
import { VoucherInfoDescriptionFields } from "./VoucherInfoDescriptionFields"
import {
    mergeInventoryIntoDetails,
    normalizeInventoryDraftForEditor as normalizeDraftForEditor,
} from "@/pages/Inventory/inventoryVoucherUtils"
import type { ChitDetailGridHandle } from "./ChitDetailGridPopup"
import { getVoucherDetailColumnsComponent } from "./ChitDetailColumnsPopup"
import ChitDocumentEditorPanel from "./ChitDocumentEditorPanel"
import MultiReferencePopup from "./MultiReferencePopup"
import { getActiveDetailRows, type ChitEditorDetailRow } from "./chitEditorUtils"
import { POPUP_FADE_ANIMATION } from "./chitEditorConstants"
import {
    type EnsureAccountingInventoryLinksForSave,
    useChitEditorDraft,
} from "./useChitEditorDraft"
import { useChitEditorReference } from "./useChitEditorReference"

interface ChitEditorPopupProps {
    visible: boolean
    value: ChitInfo
    ledger: ChitLedger
    chitType: ChitType
    voucherLabel?: string
    isUpdate: boolean
    readOnly?: boolean
    loading: boolean
    onClose: () => void
    onSave: (record: ChitInfo) => Promise<void>
    onSaveAndNew?: (record: ChitInfo) => Promise<void>
    printReportCode?: string | null
    screenCd?: string
}

type DetailRow = ChitEditorDetailRow

export function ChitEditorPopup({
    visible,
    value,
    ledger: _ledger,
    chitType,
    voucherLabel,
    isUpdate,
    readOnly = false,
    loading,
    onClose,
    onSave,
    onSaveAndNew,
    printReportCode,
    screenCd: screenCdProp,
}: ChitEditorPopupProps) {
    const location = useLocation()
    const navigate = useNavigate()
    const [draft, setDraft, draftRef] = useStateRef<ChitInfo>(() => normalizeDraftForEditor(cloneChit(value), chitType))
    const [detailLayoutVersion, setDetailLayoutVersion] = useState(0)
    const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
    const [columnSettingsTabs, setColumnSettingsTabs] = useState<GridColumnSettingsPopupTab[]>([])

    const detailGridRef = useRef<ChitDetailGridHandle | null>(null)
    const formRef = useRef<dxForm | null>(null)
    const ensureAccountingInventoryLinksForSaveRef = useRef<EnsureAccountingInventoryLinksForSave>(async (details) => details)
    const popupShortcutScopeId = usePopupShortcutScopeId("chit-editor")
    const detailColumnSettingStateRef = useRef<GridColumnSettingState | null>(null)

    const { translate } = useContext(LanguageContext) as {
        translate?: (key: string, fallback?: string) => string
    }

    const t = useCallback(
        (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
        [translate],
    )
    const screenCd = useMemo(() => {
        const override = typeof screenCdProp === "string" ? screenCdProp.trim() : ""
        return override || location.pathname
    }, [location.pathname, screenCdProp])
    const detailGridId = useMemo(() => getVoucherEditorDetailGridId(chitType), [chitType])
    const activeDetails = useMemo(() => getActiveDetailRows(draft.DETAILS as DetailRow[]), [draft.DETAILS])
    const canSaveEmptyLinkedVoucher = useMemo(
        () => isInventoryLinkedAccountingVoucherType(chitType) && Number(draft.CHIT_ID ?? 0) > 0,
        [chitType, draft.CHIT_ID],
    )
    const canSaveDraft = useMemo(
        () => activeDetails.length > 0 || canSaveEmptyLinkedVoucher,
        [activeDetails.length, canSaveEmptyLinkedVoucher],
    )

    const shortcutActions = useMemo(
        () => [
            SHORTCUT_ACTIONS.SAVE,
            SHORTCUT_ACTIONS.SAVE_AND_NEW,
            SHORTCUT_ACTIONS.SAVE_AND_CLOSE,
            SHORTCUT_ACTIONS.PRINT,
            SHORTCUT_ACTIONS.CLOSE,
            SHORTCUT_ACTIONS.ADD_ROW,
            SHORTCUT_ACTIONS.DELETE_ROW,
            SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH,
            SHORTCUT_ACTIONS.DUPLICATE,
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

    const prevSyncValueRef = useRef(value)
    const prevSyncChitTypeRef = useRef(chitType)

    useEffect(() => {
        if (visible) {
            return
        }

        setColumnSettingsVisible(false)
        setColumnSettingsTabs([])
    }, [visible])

    const chitLabel = useMemo(() => {
        const normalizedVoucherLabel = typeof voucherLabel === "string" ? voucherLabel.trim() : ""
        return normalizedVoucherLabel || getChitTypeLabel(chitType, t)
    }, [chitType, t, voucherLabel])
    const DetailColumns = useMemo(() => getVoucherDetailColumnsComponent(chitType), [chitType])
    const title = useMemo(
        () => (isUpdate ? `${t("lblEdit", "Edit")} ${chitLabel}` : `${t("lblAddNew", "Add")} ${chitLabel}`),
        [isUpdate, chitLabel, t],
    )

    const handleFieldDataChanged = useCallback((event: { dataField?: string; value?: unknown }) => {
        if (typeof event.dataField !== "string") return
        setDraft((current) => ({
            ...current,
            [event.dataField as keyof ChitInfo]: event.value as never,
        }))
    }, [setDraft])

    const handleDetailsChange = useCallback((rows: ChitInfo["DETAILS"], amount: number) => {
        const activeRows = getActiveDetailRows(rows as DetailRow[])
        setDraft((current) => ({
            ...current,
            DETAILS: mergeInventoryIntoDetails(rows as DetailRow[], current.DETAILS as DetailRow[]),
            DETAIL_COUNT: activeRows.length,
            AMOUNT: amount,
        }))
    }, [setDraft])

    const editorDraft = useChitEditorDraft({
        visible,
        isUpdate,
        chitType,
        chitYmd: draft.CHIT_YMD,
        draftRef,
        setDraft,
        detailGridRef,
        formRef,
        ensureAccountingInventoryLinksForSaveRef,
        onSave,
        onSaveAndNew,
        t,
    })

    const {
        handleSave,
        handleSaveAndNew,
        handleDuplicateDraft,
        resetPreviewChitNo,
    } = editorDraft

    const editorReference = useChitEditorReference({
        visible,
        chitType,
        activeDetails,
        chitId: Number(draft.CHIT_ID ?? 0) > 0 ? Number(draft.CHIT_ID) : null,
        draftRef,
        setDraft,
        syncDraftDetailsFromEditors: editorDraft.syncDraftDetailsFromEditors,
        detailGridRef,
        t,
        navigate,
    })

    const {
        referenceConfig,
        referenceEnabled,
        multiReferencePopupVisible,
        selectedReferenceSourceIds,
        pendingUnlinkReferenceSourceIds,
        openMultiReferencePopup,
        closeMultiReferencePopup,
        handleReferenceSelected,
        handleConfirmMultiReferenceSelection,
        resetReferenceState,
        ensureAccountingInventoryLinksForSave,
    } = editorReference

    ensureAccountingInventoryLinksForSaveRef.current = ensureAccountingInventoryLinksForSave

    useEffect(() => {
        if (prevSyncValueRef.current === value && prevSyncChitTypeRef.current === chitType) {
            return
        }
        prevSyncValueRef.current = value
        prevSyncChitTypeRef.current = chitType
        setDraft(normalizeDraftForEditor(cloneChit(value), chitType))
        setDetailLayoutVersion((current) => current + 1)
        resetReferenceState()
        resetPreviewChitNo()
    }, [chitType, resetPreviewChitNo, resetReferenceState, setDraft, value])

    const openColumnSettings = useCallback(() => {
        setColumnSettingsVisible(true)
        setColumnSettingsTabs([
            {
                key: detailGridId,
                title: t("lblDetail", "Detail List"),
                items: [],
                loading: true,
            },
        ])

        const detailComponent = detailGridRef.current?.getGridInstance() ?? null

        void (detailColumnSettingStateRef.current
            ? detailColumnSettingStateRef.current.loadEditorItems(detailComponent).then((detailItems) => {
                setColumnSettingsTabs([
                    {
                        key: detailGridId,
                        title: t("lblDetail", "Detail List"),
                        items: detailItems,
                        loading: false,
                    },
                ])
            })
            : Promise.resolve())
    }, [detailGridId, t])

    const handleColumnSettingsSave = useCallback(async (tabs: GridColumnSettingsPopupTabSaveItem[]) => {
        const detailItems = tabs.find((item) => item.key === detailGridId)?.items ?? []
        const detailComponent = detailGridRef.current?.getGridInstance() ?? null

        const savedDetailItems =
            detailColumnSettingStateRef.current && detailComponent
                ? await detailColumnSettingStateRef.current.applyEditorItemsToComponent(detailComponent, detailItems)
                : detailColumnSettingStateRef.current
                    ? await detailColumnSettingStateRef.current.saveEditorItems(detailItems)
                    : detailItems

        setColumnSettingsTabs([
            {
                key: detailGridId,
                title: t("lblDetail", "Detail List"),
                items: savedDetailItems,
                loading: false,
            },
        ])
        setColumnSettingsVisible(false)
    }, [detailGridId, t])

    const handleColumnSettingsReset = useCallback(async (activeTabKey?: string) => {
        if (activeTabKey !== detailGridId || !detailColumnSettingStateRef.current) {
            return
        }

        const resetDetailItems = await detailColumnSettingStateRef.current.resetEditorItems(
            detailGridRef.current?.getGridInstance() ?? null,
        )
        setColumnSettingsTabs([
            {
                key: detailGridId,
                title: t("lblDetail", "Detail List"),
                items: resetDetailItems,
                loading: false,
            },
        ])
    }, [detailGridId, t])

    const handlePrint = useCallback(() => {
        const reportCode = String(printReportCode ?? "").trim()
        if (!reportCode) {
            notify(t("REPORT_NOT_CONFIGURED", "Report is not configured"), "warning", 2500)
            return
        }

        const chitId = Number(draft.CHIT_ID ?? 0)
        if (!Number.isFinite(chitId) || chitId <= 0) {
            notify(t("SAVE_BEFORE_PRINT", "Save the voucher before printing"), "warning", 2500)
            return
        }

        openVoucherReportViewer({
            reportCode,
            chitIds: [chitId],
            companyCd: draft.COMPANY_CD,
            notifyUnableToOpen: (message) => notify(t("UNABLE_OPEN_REPORT_VIEWER", message), "error", 3000),
        })
    }, [draft.CHIT_ID, draft.COMPANY_CD, printReportCode, t])

    const handleClosePopup = useCallback(() => {
        if (!loading) {
            onClose()
        }
    }, [loading, onClose])

    const handleAddDetailRow = useCallback(() => {
        detailGridRef.current?.addRow()
    }, [])

    const handleDeleteDetailRow = useCallback(() => {
        detailGridRef.current?.deleteCurrentRow()
    }, [])

    const handleQuickItemSearch = useCallback(() => {
        detailGridRef.current?.focusSearch()
    }, [])

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
                    [SHORTCUT_ACTIONS.PRINT]: () => {
                        handlePrint()
                    },
                    [SHORTCUT_ACTIONS.SAVE_AND_CLOSE]: () => {
                        void handleSave()
                    },
                    [SHORTCUT_ACTIONS.CLOSE]: () => handleClosePopup(),
                    [SHORTCUT_ACTIONS.ADD_ROW]: () => handleAddDetailRow(),
                    [SHORTCUT_ACTIONS.DELETE_ROW]: () => handleDeleteDetailRow(),
                    [SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH]: () => handleQuickItemSearch(),
                    [SHORTCUT_ACTIONS.DUPLICATE]: () => {
                        void handleDuplicateDraft()
                    },
                    [SHORTCUT_ACTIONS.HELP]: () => openShortcutHelp(),
                },
                {
                    [SHORTCUT_ACTIONS.SAVE]: { enabled: !loading && canSaveDraft, allowInInput: true },
                    [SHORTCUT_ACTIONS.SAVE_AND_NEW]: { enabled: !loading && canSaveDraft && Boolean(onSaveAndNew), allowInInput: true },
                    [SHORTCUT_ACTIONS.SAVE_AND_CLOSE]: { enabled: !loading && canSaveDraft, allowInInput: true },
                    [SHORTCUT_ACTIONS.PRINT]: { enabled: !loading && Boolean(printReportCode), allowInInput: true },
                    [SHORTCUT_ACTIONS.CLOSE]: { allowInInput: true },
                    [SHORTCUT_ACTIONS.ADD_ROW]: { enabled: !loading },
                    [SHORTCUT_ACTIONS.DELETE_ROW]: { enabled: !loading },
                    [SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH]: { enabled: true, allowInInput: true },
                    [SHORTCUT_ACTIONS.DUPLICATE]: { enabled: !loading, allowInInput: true },
                },
            ),
        [
            handleAddDetailRow,
            handleClosePopup,
            handleDeleteDetailRow,
            handleDuplicateDraft,
            handleQuickItemSearch,
            handleSave,
            handlePrint,
            handleSaveAndNew,
            loading,
            onSaveAndNew,
            printReportCode,
            openShortcutHelp,
            canSaveDraft,
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

    const formData = useMemo(() => ({ ...draft, CHIT_TYPE_LABEL: chitLabel }), [draft, chitLabel])

    return (
        <Popup
            visible={visible}
            wrapperAttr={{ class: "chit-editor-popup", ...createPopupShortcutWrapperAttr(popupShortcutScopeId) }}
            title={title}
            showTitle={true}
            showCloseButton={false}
            dragEnabled={false}
            deferRendering={false}
            hideOnOutsideClick={!loading}
            width="100vw"
            height="100vh"
            maxWidth="100vw"
            maxHeight="100vh"
            container="body"
            position={{ my: "center", at: "center", of: window }}
            animation={POPUP_FADE_ANIMATION}
            onHiding={handleClosePopup}
        >
            <ToolbarItem
                toolbar="top"
                location="after"
                render={() => (
                    <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm">
                        {/* TEMP disabled: linking moved to IR/IO. referenceSourceConfig is empty; restore config + this block together. */}
                        {referenceEnabled ? (
                            <div className="min-w-[200px] w-full max-w-[220px] flex-shrink-0">
                                <ReferenceLookup
                                    ledger={referenceConfig!.ledger}
                                    chitType={referenceConfig!.chitType}
                                    value={selectedReferenceSourceIds[0] ?? null}
                                    selectedSourceIds={selectedReferenceSourceIds}
                                    onSelect={handleReferenceSelected}
                                    excludeLinkedSources={false}
                                    useGlobalLinkedStatus={true}
                                    placeholder={t(
                                        referenceConfig?.hintKey ?? "REFERENCE",
                                        referenceConfig?.hintFallback ?? "Chọn phiếu xuất kho",
                                    )}
                                    hintKey={referenceConfig?.hintKey}
                                    hintFallback={referenceConfig?.hintFallback}
                                    multiReferenceHint={t("REFERENCE_SELECT_MULTIPLE", "Chọn nhiều phiếu xuất kho")}
                                    onOpenMultiReference={openMultiReferencePopup}
                                    disabled={loading}
                                />
                            </div>
                        ) : null}

                        <Button
                            icon="columnchooser"
                            stylingMode="text"
                            disabled={loading}
                            hint={t("SYS_GRID_COLUMN_SETTING", "Sys Grid Column Setting")}
                            onClick={() => {
                                openColumnSettings()
                            }}
                        />

                        <Button
                            icon="close"
                            stylingMode="text"
                            disabled={loading}
                            hint={t("CANCEL", "Cancel")}
                            onClick={handleClosePopup}
                        />
                    </div>
                )}
            />
            <MultiReferencePopup
                visible={multiReferencePopupVisible}
                referenceConfig={referenceConfig}
                selectedSourceIds={selectedReferenceSourceIds}
                pendingUnlinkSourceIds={pendingUnlinkReferenceSourceIds}
                excludeLinkedSources={true}
                currentLinkedChitId={Number(draft.CHIT_ID ?? 0) || null}
                currentLinkedChitType={chitType}
                onClose={closeMultiReferencePopup}
                onConfirm={handleConfirmMultiReferenceSelection}
                translate={t}
                useGlobalLinkedStatus={true}
            />
            <LookupPopupProvider>
                <div className="relative flex h-full flex-col overflow-hidden bg-[#f3f4f6]">
                    <LoadPanel visible={loading} showPane={true} showIndicator={true} shading={true} />
                    <ShortcutHelpPopup
                        visible={shortcutHelpVisible}
                        shortcuts={shortcutHelpItems}
                        onClose={closeShortcutHelp}
                    />

                    <div className="chit-voucher-fields-panel flex-shrink-0 px-4 pt-3 pb-3">
                        <Form ref={formRef} formData={formData} labelLocation="top" colCount={3} readOnly={readOnly} onFieldDataChanged={handleFieldDataChanged}>
                                    <Item
                                        dataField="AMOUNT"
                                        editorType="dxNumberBox"
                                        label={{ text: t("AMOUNT", "Amount") }}
                                        editorOptions={{ stylingMode: "outlined", format: "#,##0.00", readOnly: true }}
                                    />
                                    <Item
                                        dataField="PAYER_INFO"
                                        editorType="dxTextBox"
                                        label={{ text: t("lblPayer", "Payer Info") }}
                                        editorOptions={createVoucherEditorOptions()}
                                    />
                                    <Item
                                        dataField="CHIT_NO"
                                        editorType="dxTextBox"
                                        label={{ text: t("CHIT_NO", "Document No") }}
                                        editorOptions={createVoucherEditorOptions({
                                            validationMessageMode: "always",
                                        })}
                                        validationRules={[
                                            createRequiredRule(t("MSG_MUST_ITEM", "Document No is required")),
                                            createTrimmedRequiredRule(t("MSG_MUST_ITEM", "Document No is required")),
                                        ]}
                                    />
                                    <Item
                                        dataField="DESCRIPTION_VIET"
                                        colSpan={2}
                                        editorType="dxTextBox"
                                        label={{ text: t("DESCRIPTION_VIET", "Description (VI)") }}
                                        editorOptions={createVoucherEditorOptions()}
                                    />
                                    <Item
                                        dataField="CHIT_YMD"
                                        editorType="dxDateBox"
                                        label={{ text: t("CHIT_YMD", "Note Date") }}
                                        editorOptions={createVoucherDateBoxEditorOptions({
                                            validationMessageMode: "always",
                                        })}
                                        validationRules={[
                                            createRequiredRule(t("MSG_MUST_ITEM", "Chit date is required")),
                                            createDateRequiredRule(t("MSG_MUST_ITEM", "Chit date is required")),
                                        ]}
                                    />
                                </Form>
                                <VoucherInfoDescriptionFields
                                    companyCd={getCurrentCompanyCd()}
                                    readOnly={readOnly}
                                    t={t}
                                    excludeFields={["DESCRIPTION_VIET"]}
                                    values={{
                                        DESCRIPTION_VIET: formData.DESCRIPTION_VIET,
                                        DESCRIPTION_ENG: formData.DESCRIPTION_ENG,
                                        DESCRIPTION_KOR: formData.DESCRIPTION_KOR,
                                    }}
                                    onChange={(field, value) => {
                                        handleFieldDataChanged({ dataField: field, value })
                                    }}
                                />
                    </div>

                    <div className="min-h-0 flex-1 px-4 pb-3">
                        <div className="flex h-full min-h-0 flex-col">
                            <ChitDocumentEditorPanel
                                gridRef={detailGridRef}
                                companyCd={draft.COMPANY_CD}
                                chitType={chitType}
                                baseDate={draft.CHIT_YMD}
                                details={draft.DETAILS}
                                onChange={handleDetailsChange}
                                isVisible={visible}
                                readOnly={readOnly}
                                layoutVersion={detailLayoutVersion}
                                DetailColumns={DetailColumns}
                                screenCd={screenCd}
                                gridId={detailGridId}
                                columnSettingStateRef={detailColumnSettingStateRef}
                            />
                        </div>
                    </div>

                    <div className="chit-editor-footer flex flex-shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-4 py-3">
                        {!readOnly ? (
                        <Button
                            text={t("TIT_SAVE", "Save")}
                            icon="save"
                            type="default"
                            stylingMode="contained"
                            elementAttr={{ class: "chit-editor-save-btn" }}
                            onClick={handleSave}
                            disabled={loading || !canSaveDraft}
                        />
                        ) : null}
                        {!readOnly && onSaveAndNew ? (
                            <Button
                                text={t("SAVE_AND_NEW", "Save and create new")}
                                icon="plus"
                                type="default"
                                stylingMode="outlined"
                                onClick={() => {
                                    void handleSaveAndNew()
                                }}
                                disabled={loading || !canSaveDraft}
                            />
                        ) : null}
                        {printReportCode ? (
                            <Button
                                text={t("PRINT", "Print")}
                                icon="print"
                                stylingMode="outlined"
                                onClick={handlePrint}
                                disabled={loading}
                            />
                        ) : null}
                        <Button
                            text={t("CANCEL", "Cancel")}
                            icon="close"
                            stylingMode="outlined"
                            onClick={handleClosePopup}
                            disabled={loading}
                        />
                    </div>
                </div>
                <GridColumnSettingsPopup
                    visible={columnSettingsVisible}
                    title={t("AUDIT_SETTING_SHOW_HIDE", "Column Settings")}
                    tabs={columnSettingsTabs}
                    onClose={() => setColumnSettingsVisible(false)}
                    onReset={handleColumnSettingsReset}
                    onSaveTabs={handleColumnSettingsSave}
                />
            </LookupPopupProvider>
        </Popup>
    )
}

export default ChitEditorPopup
