import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import DateBox from "devextreme-react/date-box"
import SelectBox from "devextreme-react/select-box"
import TextArea from "devextreme-react/text-area"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"

import { getApiErrorMessage } from "@/api/apiTypes"
import { getEInvoice } from "@/api/einvoiceApi"
import { createEInvoiceMinute, getEInvoiceMinute, updateEInvoiceMinute } from "@/api/einvoiceMinuteApi"
import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup"
import { LookupPopupProvider } from "@/components/lookup/LookupPopupHost"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import useShortcutHelp from "@/hooks/useShortcutHelp"
import { LanguageContext } from "@/lib/i18nLoader"
import { buildAppPath } from "@/lib/login"
import { useSysCodes } from "@/lib/sysCodeContext"
import { createPopupShortcutWrapperAttr, isPopupShortcutScopeTopMost, usePopupShortcutScopeId } from "@/lib/popupShortcutScope"
import { createShortcutBindings } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import { flushActiveEditorValue } from "@/lib/shortcuts/shortcutUtils"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { EInvoice } from "@/types/einvoice"
import type { EInvoiceMinute, EInvoiceMinuteLine, EInvoiceMinuteLineTotals, EInvoiceMinuteReason } from "@/types/einvoiceMinute"
import { EINVOICE_MINUTE_LINE_SIDE_AFTER, EINVOICE_MINUTE_LINE_SIDE_AFTER_TOTAL, EINVOICE_MINUTE_LINE_SIDE_BEFORE, EINVOICE_MINUTE_LINE_SIDE_BEFORE_TOTAL } from "@/types/einvoiceMinute"
import {
    applyInvoiceToMinute,
    applyTotalsToMinuteTotalLine,
    buildMinuteTypeOptions,
    calcMinuteLinesTotals,
    createDefaultMinute,
    createDefaultMinuteReason,
    createDraftMinuteNumber,
    defaultMinuteTitle,
    EINV_BBAN_TYPE_CODE_TYPE,
    formatMinuteInvoiceRefSummaryText,
    hasMinuteRefInvoice,
    isMinuteEditable,
    mapMinuteToApiPayload,
    minuteTotalLineToTotals,
    normalizeMinute,
    parseMinuteDate,
    renumberMinuteReasons,
    toMinuteDateText,
} from "../einvoiceMinuteModel"
import { useEInvoiceDecimalResolver } from "../einvoiceDecimalSettings"
import { fieldRequiredMessage } from "../einvoiceI18n"
import { DEFAULT_CURRENCY_CODE, normalizeCurrencyCode } from "@/lib/currency"
import EInvoiceEditorShell, { EInvoiceEditorSection } from "./EInvoiceEditorShell"
import EInvoiceInvoiceSelectPopup from "./EInvoiceInvoiceSelectPopup"
import EInvoiceMinuteLineGridSection from "./EInvoiceMinuteLineGridSection"

type EInvoiceMinuteEditorPopupProps = {
    visible: boolean
    companyCd: string
    minuteId: number
    initialMinute?: EInvoiceMinute | null
    onClose: () => void
    onSaved: (minute: EInvoiceMinute) => void | Promise<void>
}

function trimText(value: string | null | undefined): string {
    return typeof value === "string" ? value.trim() : ""
}

export default function EInvoiceMinuteEditorPopup({
    visible,
    companyCd,
    minuteId,
    initialMinute = null,
    onClose,
    onSaved,
}: EInvoiceMinuteEditorPopupProps) {
    const [record, setRecord] = useState<EInvoiceMinute>(() => initialMinute ?? createDefaultMinute(companyCd))
    const [loading, setLoading] = useState(false)
    const [invoicePopupVisible, setInvoicePopupVisible] = useState(false)
    const [focusedReasonKey, setFocusedReasonKey] = useState<string | null>(null)

    const { translate } = useContext(LanguageContext) as {
        translate?: (key: string, fallback?: string) => string
    }

    const t = useCallback(
        (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
        [translate],
    )

    const { getCodesByType } = useSysCodes()

    const readOnly = !isMinuteEditable(record)

    const currencyCode = useMemo(
        () => normalizeCurrencyCode(record.DVTTE) || DEFAULT_CURRENCY_CODE,
        [record.DVTTE],
    )
    const decimalResolver = useEInvoiceDecimalResolver("UI")
    const getDetailNumberFormat = useCallback(
        (fieldKey: string, fallbackPrecision: number, code: string | null | undefined = currencyCode) =>
            decimalResolver.getFormat("DETAIL", fieldKey, code, fallbackPrecision),
        [currencyCode, decimalResolver],
    )

    const minuteTypeOptions = useMemo(
        () => buildMinuteTypeOptions(getCodesByType(EINV_BBAN_TYPE_CODE_TYPE), t),
        [getCodesByType, t],
    )

    const updateField = useCallback(<K extends keyof EInvoiceMinute>(field: K, value: EInvoiceMinute[K]) => {
        setRecord((current) => {
            const next = { ...current, [field]: value }
            if (field === "TCHDON") {
                next.TBBAN = defaultMinuteTitle(value === 1 ? 1 : 2, t)
            }
            return next
        })
    }, [t])

    const loadMinute = useCallback(async () => {
        if (!visible) {
            return
        }

        if (initialMinute) {
            setRecord(initialMinute)
            return
        }

        if (minuteId <= 0) {
            const draft = createDefaultMinute(companyCd)
            draft.SBBAN = createDraftMinuteNumber()
            draft.TBBAN = defaultMinuteTitle(draft.TCHDON, t)
            setRecord(draft)
            return
        }

        setLoading(true)
        try {
            const response = await getEInvoiceMinute(minuteId)
            setRecord(normalizeMinute(response.data, companyCd))
        } catch (error) {
            notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
            onClose()
        } finally {
            setLoading(false)
        }
    }, [companyCd, initialMinute, minuteId, onClose, t, visible])

    useEffect(() => {
        void loadMinute()
    }, [loadMinute])

    const updateReason = useCallback((rowKey: string, patch: Partial<EInvoiceMinuteReason>) => {
        setRecord((current) => ({
            ...current,
            REASONS: current.REASONS.map((reason) => (reason.ROW_KEY === rowKey ? { ...reason, ...patch } : reason)),
        }))
    }, [])

    const addReason = useCallback(() => {
        setRecord((current) => {
            const nextReasons = [...current.REASONS, createDefaultMinuteReason(current.REASONS.length + 1, current.BBAN_ID)]
            return { ...current, REASONS: renumberMinuteReasons(nextReasons) }
        })
    }, [])

    const removeReason = useCallback((rowKey: string) => {
        setRecord((current) => {
            const active = current.REASONS.filter((reason) => reason.ROW_KEY !== rowKey)
            return {
                ...current,
                REASONS: renumberMinuteReasons(
                    active.length > 0 ? active : [createDefaultMinuteReason(1, current.BBAN_ID)],
                ),
            }
        })
    }, [])

    const handleInvoiceSelect = useCallback(async (invoices: EInvoice[]) => {
        const invoice = invoices[0]
        if (!invoice) {
            setInvoicePopupVisible(false)
            return
        }

        try {
            const response = await getEInvoice(invoice.INVOICE_ID)
            setRecord((current) => applyInvoiceToMinute(current, response.data))
        } catch (error) {
            notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
        } finally {
            setInvoicePopupVisible(false)
        }
    }, [t])

    const updateLinesBefore = useCallback((lines: EInvoiceMinuteLine[]) => {
        const totals = calcMinuteLinesTotals(lines)
        setRecord((current) => ({
            ...current,
            LINES_BEFORE: lines,
            TOTAL_BEFORE: applyTotalsToMinuteTotalLine(
                current.TOTAL_BEFORE,
                totals,
                EINVOICE_MINUTE_LINE_SIDE_BEFORE_TOTAL,
                current.BBAN_ID,
            ),
        }))
    }, [])

    const updateLinesAfter = useCallback((lines: EInvoiceMinuteLine[]) => {
        const totals = calcMinuteLinesTotals(lines)
        setRecord((current) => ({
            ...current,
            LINES_AFTER: lines,
            TOTAL_AFTER: applyTotalsToMinuteTotalLine(
                current.TOTAL_AFTER,
                totals,
                EINVOICE_MINUTE_LINE_SIDE_AFTER_TOTAL,
                current.BBAN_ID,
            ),
        }))
    }, [])

    const updateTotalsBefore = useCallback((totals: EInvoiceMinuteLineTotals) => {
        setRecord((current) => ({
            ...current,
            TOTAL_BEFORE: applyTotalsToMinuteTotalLine(
                current.TOTAL_BEFORE,
                totals,
                EINVOICE_MINUTE_LINE_SIDE_BEFORE_TOTAL,
                current.BBAN_ID,
            ),
        }))
    }, [])

    const updateTotalsAfter = useCallback((totals: EInvoiceMinuteLineTotals) => {
        setRecord((current) => ({
            ...current,
            TOTAL_AFTER: applyTotalsToMinuteTotalLine(
                current.TOTAL_AFTER,
                totals,
                EINVOICE_MINUTE_LINE_SIDE_AFTER_TOTAL,
                current.BBAN_ID,
            ),
        }))
    }, [])

    const beforeTotals = useMemo(() => minuteTotalLineToTotals(record.TOTAL_BEFORE), [record.TOTAL_BEFORE])
    const afterTotals = useMemo(() => minuteTotalLineToTotals(record.TOTAL_AFTER), [record.TOTAL_AFTER])

    const validateBeforeSave = useCallback(() => {
        const requiredFields: Array<{ value: string; fieldKey: string; fieldFallback: string }> = [
            { value: record.SBBAN, fieldKey: "SBBAN", fieldFallback: "Minute no." },
            { value: record.NBBAN, fieldKey: "NBBAN", fieldFallback: "Minute date" },
            { value: record.NBAN, fieldKey: "NBAN", fieldFallback: "Seller" },
            { value: record.MSTNBAN, fieldKey: "MSTNBAN", fieldFallback: "Seller tax code" },
            { value: record.NMUA, fieldKey: "NMUA", fieldFallback: "Buyer" },
            { value: record.KHMSHDON, fieldKey: "KHMSHDON", fieldFallback: "Form symbol" },
        ]

        const missing = requiredFields.find((item) => !trimText(item.value))
        if (missing) {
            notify(fieldRequiredMessage(t, missing.fieldKey, missing.fieldFallback), "warning", 3000)
            return false
        }

        const hasReason = record.REASONS.some((reason) => reason.ISDEL !== 1 && trimText(reason.LDO).length > 0)
        if (!hasReason) {
            notify(fieldRequiredMessage(t, "BBAN_REASONS", "Lý do điều chỉnh/thay thế"), "warning", 3000)
            return false
        }

        return true
    }, [record, t])

    const saveMinute = useCallback(async () => {
        if (readOnly) {
            return
        }

        await flushActiveEditorValue()

        if (!validateBeforeSave()) {
            return
        }

        setLoading(true)
        try {
            const payload = mapMinuteToApiPayload(record)
            const response = record.BBAN_ID > 0 ? await updateEInvoiceMinute(payload) : await createEInvoiceMinute(payload)
            const saved = normalizeMinute(response.data, companyCd)
            notify(t("SAVE_SUCCESS", "Saved successfully"), "success", 2500)
            await onSaved(saved)
        } catch (error) {
            notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 5000)
        } finally {
            setLoading(false)
        }
    }, [companyCd, onSaved, readOnly, record, t, validateBeforeSave])

    const activeReasons = useMemo(
        () => renumberMinuteReasons(record.REASONS.filter((reason) => reason.ISDEL !== 1)),
        [record.REASONS],
    )

    const getCurrentReasonRowKey = useCallback(() => {
        if (focusedReasonKey && activeReasons.some((reason) => reason.ROW_KEY === focusedReasonKey)) {
            return focusedReasonKey
        }

        return activeReasons[activeReasons.length - 1]?.ROW_KEY ?? null
    }, [activeReasons, focusedReasonKey])

    const handleDeleteReasonRow = useCallback(() => {
        if (readOnly) {
            return
        }

        const rowKey = getCurrentReasonRowKey()
        if (!rowKey) {
            return
        }

        removeReason(rowKey)
    }, [getCurrentReasonRowKey, readOnly, removeReason])

    const popupShortcutScopeId = usePopupShortcutScopeId("einvoice-minute-editor")

    const shortcutActions = useMemo(
        () => [
            SHORTCUT_ACTIONS.SAVE,
            SHORTCUT_ACTIONS.CLOSE,
            SHORTCUT_ACTIONS.ADD_ROW,
            SHORTCUT_ACTIONS.DELETE_ROW,
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

    const handleClosePopup = useCallback(() => {
        if (loading) {
            return
        }

        if (shortcutHelpVisible) {
            closeShortcutHelp()
            return
        }

        onClose()
    }, [closeShortcutHelp, loading, onClose, shortcutHelpVisible])

    const shortcutBindings = useMemo(
        () =>
            createShortcutBindings(
                shortcutActions,
                {
                    [SHORTCUT_ACTIONS.SAVE]: () => {
                        void saveMinute()
                    },
                    [SHORTCUT_ACTIONS.CLOSE]: () => handleClosePopup(),
                    [SHORTCUT_ACTIONS.ADD_ROW]: () => addReason(),
                    [SHORTCUT_ACTIONS.DELETE_ROW]: () => handleDeleteReasonRow(),
                    [SHORTCUT_ACTIONS.HELP]: () => {
                        if (shortcutHelpVisible) {
                            closeShortcutHelp()
                            return
                        }

                        openShortcutHelp()
                    },
                },
                {
                    [SHORTCUT_ACTIONS.SAVE]: { enabled: !readOnly && !loading, allowInInput: true },
                    [SHORTCUT_ACTIONS.CLOSE]: { allowInInput: true },
                    [SHORTCUT_ACTIONS.ADD_ROW]: { enabled: !readOnly && !loading },
                    [SHORTCUT_ACTIONS.DELETE_ROW]: { enabled: !readOnly && !loading },
                    [SHORTCUT_ACTIONS.HELP]: { allowInInput: true },
                },
            ),
        [
            addReason,
            closeShortcutHelp,
            handleClosePopup,
            handleDeleteReasonRow,
            loading,
            openShortcutHelp,
            readOnly,
            saveMinute,
            shortcutActions,
            shortcutHelpVisible,
        ],
    )

    const shouldHandleShortcutEvent = useCallback(
        () => isPopupShortcutScopeTopMost(popupShortcutScopeId),
        [popupShortcutScopeId],
    )

    useShortcutBindings(shortcutBindings, {
        enabled: visible && !invoicePopupVisible,
        shouldHandleEvent: shouldHandleShortcutEvent,
    })

    const editorTitle = record.BBAN_ID > 0 ? t("BBAN_EDIT", "Biên bản hóa đơn") : t("BBAN_ADD", "Thêm biên bản hóa đơn")
    const editorSubtitle = trimText(record.SBBAN) || undefined

    const hasRefInvoice = hasMinuteRefInvoice(record)

    return (
        <LookupPopupProvider>
            <EInvoiceEditorShell
                visible={visible}
                title={editorTitle}
                subtitle={editorSubtitle}
                width="min(1280px, 98vw)"
                height="min(920px, 96vh)"
                loading={loading}
                closeDisabled={loading}
                animation={POPUP_FADE_ANIMATION}
                wrapperAttr={createPopupShortcutWrapperAttr(popupShortcutScopeId)}
                onClose={handleClosePopup}
                onHiding={handleClosePopup}
                footer={
                    <>
                        <Button text={t("CANCEL", "Cancel")} stylingMode="outlined" disabled={loading} onClick={handleClosePopup} />
                        <Button text={t("SAVE", "Save")} icon="save" type="default" stylingMode="contained" disabled={loading || readOnly} onClick={() => void saveMinute()} />
                    </>
                }
            >
                <EInvoiceEditorSection title={t("BBAN_GENERAL", "Thông tin biên bản")}>
                    <div className="einvoice-editor__field-grid einvoice-editor__field-grid--3">
                        <TextBox label={t("SBBAN", "Số biên bản")} value={record.SBBAN} readOnly={readOnly} onValueChanged={(event) => updateField("SBBAN", String(event.value ?? ""))} />
                        <DateBox
                            label={t("NBBAN", "Ngày biên bản")}
                            type="date"
                            displayFormat="yyyy-MM-dd"
                            dateSerializationFormat="yyyy-MM-dd"
                            value={parseMinuteDate(record.NBBAN)}
                            readOnly={readOnly}
                            onValueChanged={(event) => updateField("NBBAN", toMinuteDateText(event.value))}
                        />
                        <SelectBox
                            label={t("TCHDON", "Tính chất")}
                            dataSource={minuteTypeOptions}
                            valueExpr="value"
                            displayExpr="text"
                            value={record.TCHDON}
                            readOnly={readOnly}
                            onValueChanged={(event) => updateField("TCHDON", Number(event.value ?? 2))}
                        />
                    </div>
                    <div className="einvoice-editor__field" style={{ marginTop: 12 }}>
                        <TextBox label={t("TBBAN", "Tên biên bản")} value={record.TBBAN} readOnly={readOnly} onValueChanged={(event) => updateField("TBBAN", String(event.value ?? ""))} />
                    </div>
                    <div
                        className={[
                            "einvoice-editor__ref-bar",
                            hasRefInvoice ? "einvoice-editor__ref-bar--selected" : "einvoice-editor__ref-bar--empty",
                        ].join(" ")}
                    >
                        <span className="einvoice-editor__ref-bar-label">{t("BBAN_REF_INVOICE", "Hóa đơn gốc")}</span>
                        <Button
                            text={t("SELECT_REF_INVOICE", "Chọn hóa đơn gốc")}
                            icon="search"
                            stylingMode={hasRefInvoice ? "outlined" : "contained"}
                            type={hasRefInvoice ? "normal" : "default"}
                            disabled={readOnly || loading}
                            onClick={() => setInvoicePopupVisible(true)}
                        />
                        {record.REF_INVOICE_ID > 0 ? (
                            <a
                                href={buildAppPath(companyCd, `/einvoice/manage?invoiceId=${record.REF_INVOICE_ID}`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="einvoice-editor__ref-link"
                                title={t("OPEN_REF_INVOICE", "Mở hóa đơn gốc")}
                            >
                                {formatMinuteInvoiceRefSummaryText(record) || `#${record.REF_INVOICE_ID}`}
                            </a>
                        ) : null}
                    </div>
                </EInvoiceEditorSection>

                <EInvoiceEditorSection title={t("BBAN_PARTIES", "Người bán / Người mua")}>
                    <div className="einvoice-editor__field-grid einvoice-editor__field-grid--3">
                        <TextBox label={t("NBAN", "Người bán")} value={record.NBAN} readOnly={readOnly} onValueChanged={(event) => updateField("NBAN", String(event.value ?? ""))} />
                        <TextBox label={t("MSTNBAN", "MST người bán")} value={record.MSTNBAN} readOnly={readOnly} onValueChanged={(event) => updateField("MSTNBAN", String(event.value ?? ""))} />
                        <TextBox label={t("DCNBAN", "Địa chỉ người bán")} value={record.DCNBAN} readOnly={readOnly} onValueChanged={(event) => updateField("DCNBAN", String(event.value ?? ""))} />
                        <TextBox label={t("NMUA", "Người mua")} value={record.NMUA} readOnly={readOnly} onValueChanged={(event) => updateField("NMUA", String(event.value ?? ""))} />
                        <TextBox label={t("MSTNMUA", "MST người mua")} value={record.MSTNMUA} readOnly={readOnly} onValueChanged={(event) => updateField("MSTNMUA", String(event.value ?? ""))} />
                        <TextBox label={t("DCNMUA", "Địa chỉ người mua")} value={record.DCNMUA} readOnly={readOnly} onValueChanged={(event) => updateField("DCNMUA", String(event.value ?? ""))} />
                    </div>
                </EInvoiceEditorSection>

                <EInvoiceEditorSection title={t("BBAN_REF_INVOICE", "Hóa đơn gốc")}>
                    <div className="einvoice-editor__field-grid einvoice-editor__field-grid--4">
                        <TextBox label={t("KHMSHDON", "Ký hiệu mẫu số")} value={record.KHMSHDON} readOnly={readOnly} onValueChanged={(event) => updateField("KHMSHDON", String(event.value ?? ""))} />
                        <TextBox label={t("KHHDON", "Ký hiệu hóa đơn")} value={record.KHHDON} readOnly={readOnly} onValueChanged={(event) => updateField("KHHDON", String(event.value ?? ""))} />
                        <TextBox label={t("SHDON", "Số hóa đơn")} value={record.SHDON} readOnly={readOnly} onValueChanged={(event) => updateField("SHDON", String(event.value ?? ""))} />
                        <DateBox
                            label={t("NLAP", "Ngày lập HĐ gốc")}
                            type="date"
                            displayFormat="yyyy-MM-dd"
                            dateSerializationFormat="yyyy-MM-dd"
                            value={parseMinuteDate(record.NLAP)}
                            readOnly={readOnly}
                            onValueChanged={(event) => updateField("NLAP", toMinuteDateText(event.value))}
                        />
                    </div>
                </EInvoiceEditorSection>

                <EInvoiceEditorSection
                    title={t("BBAN_REASONS", "Lý do điều chỉnh/thay thế")}
                    headerAction={
                        <Button text={t("ADD_REASON", "Thêm lý do")} icon="plus" stylingMode="outlined" disabled={readOnly} onClick={addReason} />
                    }
                >
                    <div className="einvoice-editor__stack">
                        {activeReasons.map((reason, index) => (
                            <div key={reason.ROW_KEY} className="einvoice-editor__reason-row">
                                <TextBox value={String(index + 1)} readOnly={true} />
                                <TextArea
                                    value={reason.LDO}
                                    minHeight={58}
                                    autoResizeEnabled={true}
                                    readOnly={readOnly}
                                    onFocusIn={() => setFocusedReasonKey(reason.ROW_KEY)}
                                    onValueChanged={(event) => updateReason(reason.ROW_KEY, { LDO: String(event.value ?? "") })}
                                />
                                <Button icon="trash" stylingMode="text" disabled={readOnly || activeReasons.length <= 1} onClick={() => removeReason(reason.ROW_KEY)} />
                            </div>
                        ))}
                    </div>
                </EInvoiceEditorSection>

                <EInvoiceMinuteLineGridSection
                    title={t("BBAN_LINES_BEFORE", "Trước điều chỉnh")}
                    lines={record.LINES_BEFORE}
                    totals={beforeTotals}
                    lineSide={EINVOICE_MINUTE_LINE_SIDE_BEFORE}
                    bbanId={record.BBAN_ID}
                    readOnly={readOnly}
                    currencyCode={currencyCode}
                    t={t}
                    getDetailNumberFormat={getDetailNumberFormat}
                    onChange={updateLinesBefore}
                    onTotalsChange={updateTotalsBefore}
                />

                <EInvoiceMinuteLineGridSection
                    title={t("BBAN_LINES_AFTER", "Sau điều chỉnh")}
                    lines={record.LINES_AFTER}
                    totals={afterTotals}
                    lineSide={EINVOICE_MINUTE_LINE_SIDE_AFTER}
                    bbanId={record.BBAN_ID}
                    readOnly={readOnly}
                    currencyCode={currencyCode}
                    t={t}
                    getDetailNumberFormat={getDetailNumberFormat}
                    onChange={updateLinesAfter}
                    onTotalsChange={updateTotalsAfter}
                />
            </EInvoiceEditorShell>

            <ShortcutHelpPopup
                visible={shortcutHelpVisible}
                shortcuts={shortcutHelpItems}
                onClose={closeShortcutHelp}
            />

            {invoicePopupVisible ? (
                <EInvoiceInvoiceSelectPopup
                    visible={invoicePopupVisible}
                    companyCd={companyCd}
                    selectionMode="single"
                    isSigned={1}
                    onClose={() => setInvoicePopupVisible(false)}
                    onSelect={handleInvoiceSelect}
                />
            ) : null}
        </LookupPopupProvider>
    )
}