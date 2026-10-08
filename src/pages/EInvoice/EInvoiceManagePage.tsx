import { Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import notify from "devextreme/ui/notify"
import { useLocation, useNavigate } from "react-router-dom"
import { Column } from "devextreme-react/data-grid"
import LoadPanel from "devextreme-react/load-panel"
import type dxDataGrid from "devextreme/ui/data_grid"
import type {
    ColumnCellTemplateData,
    InitializedEvent,
    OptionChangedEvent,
    RowDblClickEvent,
    SelectionChangedEvent,
} from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"

import {
    deleteEInvoices,
    getEInvoiceMailHistory,
    getEInvoiceSigningPayload,
    issueMttInvoice,
    prepareMttBatch,
    saveMttBatch,
    downloadMttBatchXml,
    getEInvoiceTransmissionMessages,
    saveEInvoiceSignature,
    sendEInvoiceMail,
    updateEInvoiceBuyerEmail,
} from "@/api/einvoiceApi"
import { signXmlWithPlugin } from "@/api/einvoiceSigningPluginApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import PageGrid from "@/components/datagrid/PageGrid"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import DxPage from "@/dx/DxPage"
import { useEInvoicePagedListInvalidate, useEInvoicePagedListQuery } from "@/hooks/queries/useEInvoiceListQuery"
import {
    useEInvoiceSellersQuery,
    useEInvoiceUserSettingDefaultsQuery,
} from "@/hooks/queries/useEInvoiceEditorQueries"
import { saveEInvoiceDetailCache } from "@/lib/einvoiceDetailCache"
import { LanguageContext } from "@/lib/i18nLoader"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import {
    DEFAULT_PAGE_SIZE,
    SERVER_PAGING_REMOTE_OPERATIONS,
    createMirrorPagedStore,
    resolvePageNumber,
    resolvePageSize,
    syncMirroredGridPage,
} from "@/lib/paging"
import { useSysCodes } from "@/lib/sysCodeContext"
import { formatDateToYmd, formatYmdForDisplay } from "@/pages/Accounting/accountingDateUtils"
import type { EInvoice } from "@/types/einvoice"
import type { EInvoiceEmailHistory } from "@/types/einvoiceMailHistory"
import type { EInvoiceTransmissionMessage } from "@/types/einvoiceTransmission"
import {
    buildEInvoiceMailStatusOptions,
    buildInvoiceStatusOptions,
    buildEInvoiceTchdonOptions,
    EINV_INVOICE_STATUS_CODE_TYPE,
    EINV_MAIL_STATUS_CODE_TYPE,
    EINV_TCHDON_CODE_TYPE,
    formatEInvoiceBuyerSummaryText,
    formatEInvoiceDisplayNo,
    formatEInvoiceStatusSummary,
    truncateEInvoiceErrorMessage,
    isEInvoiceMttIssued,
    isEInvoiceReadyToSendMail,
    isEInvoiceSigned,
    normalizeEInvoiceRows,
} from "./einvoiceModel"
import EInvoiceExcelImportPopup from "./components/EInvoiceExcelImportPopup"
import EInvoiceEditorPopup from "./components/EInvoiceEditorPopup"
import EInvoicePrintOptionsPopup from "./components/EInvoicePrintOptionsPopup"
import EInvoiceSendMailPopup, { type EInvoiceSendMailRequest } from "./components/EInvoiceSendMailPopup"
import EInvoiceTransmissionMessagesPopup from "./components/EInvoiceTransmissionMessagesPopup"
import EInvoiceEditMailPopup from "./components/EInvoiceEditMailPopup"
import EInvoiceMailHistoryPopup from "./components/EInvoiceMailHistoryPopup"
import { formatEInvoiceDecimalValue, getEInvoiceMoneyFallbackPrecision, useEInvoiceDecimalResolver } from "./einvoiceDecimalSettings"
import { useEInvoiceCertificateSigning } from "./hooks/useEInvoiceCertificateSigning"
import { useEInvoiceSigningPluginSetupPrompt } from "./hooks/useEInvoiceSigningPluginSetupPrompt"
import { openEInvoiceReportViewer, downloadEInvoicesBatch, buildPrintRequestFromInvoice, type EInvoicePrintConfirmPayload } from "./einvoiceReportViewer"
import { openEInvoiceXmlPreviewWithNotify } from "./einvoiceXmlViewer"
import { openEInvoiceTransmissionHtmlPreview } from "./einvoiceTransmissionPreviewViewer"
import { createEInvoiceIssueMttToolbarItem, createEInvoiceSignSendCqtToolbarItem } from "./einvoiceSignToolbar"
import { createEInvoiceSendMailToolbarItem } from "./einvoiceSendMailToolbar"
import {
    buildEInvoiceCqtStatusOptions,
    buildEInvoiceSignStatusOptions,
    clearEInvoiceAdvancedFilterField,
    cloneEInvoiceAdvancedFilters,
    createEmptyEInvoiceAdvancedFilters,
    buildEInvoiceAdvancedFilterChips,
    EINV_CQT_STATUS_CODE_TYPE,
    EINV_SIGN_STATUS_CODE_TYPE,
    hasEInvoiceAdvancedFilters,
    normalizeEInvoiceAdvancedFilters,
    toEInvoiceSearchFilterParams,
    type EInvoiceAdvancedFilterChip,
    type EInvoiceAdvancedFilters,
} from "./einvoiceAdvancedSearch"
import { EInvoiceAdvancedSearchPanel } from "./components/EInvoiceAdvancedSearchPanel"
import { EInvoiceActiveFilterChips } from "./components/EInvoiceActiveFilterChips"
import { EInvoiceManageStatusCell } from "./components/EInvoiceManageStatusCell"
import { EInvoiceTableShell } from "./components/EInvoiceTableShell"
import {
    EInvoiceDocNoCell,
    EInvoicePartyCell,
} from "./components/einvoiceTableUi"

type GridKey = string | number
type EInvoiceGridCellInfo = ColumnCellTemplateData<EInvoice, GridKey>

interface PendingSignInvoice {
    invoiceId: number
}

type EInvoiceListQueryState = {
    lang: string
    fromYmd: string
    toYmd: string
    keyword: string
    invoiceId: number
    filters: EInvoiceAdvancedFilters
}

type InvoiceStatusActionKey = "edit-mail" | "mail-history" | "transmission-history"

const EINVOICE_COPY_EXCLUDE_FIELDS = ["INVOICE_ID", "COMPANY_CD", "DETAILS", "MTRACUU"]

function trimGridCellText(value: unknown): string {
    return String(value ?? "").trim()
}

function createMonthStartDate(): Date {
    const date = new Date()
    date.setDate(1)
    date.setHours(0, 0, 0, 0)
    return date
}

function createToday(): Date {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
}

function formatText(template: string, values: Array<string | number>): string {
    return values.reduce<string>((text, value, index) => text.replace(`{${index}}`, String(value)), template)
}

function readQueryNumber(search: string, key: string): number {
    const value = Number(new URLSearchParams(search).get(key) ?? 0)
    return Number.isFinite(value) && value > 0 ? value : 0
}

function readQueryText(search: string, key: string): string {
    return (new URLSearchParams(search).get(key) ?? "").trim()
}

function normalizeSearchAlias(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\u0111/g, "d")
        .replace(/\u0110/g, "D")
}

export default function EInvoiceManagePage({ cashRegister = false }: { cashRegister?: boolean }) {
    const location = useLocation()
    const navigate = useNavigate()
    const gridRef = useRef<dxDataGrid<EInvoice, GridKey> | null>(null)
    const linkedInvoiceHandledRef = useRef("")
    const createActionHandledRef = useRef(false)
    const initialLoadTriggeredRef = useRef(false)
    const initialPagingEventsSuppressedRef = useRef(false)
    const reloadResetDoneRef = useRef(false)
    const linkedKeywordAppliedRef = useRef("")
    const companyCdRef = useRef("")
    const langRef = useRef("")
    const applyListQueryRef = useRef<
        (nextKeyword?: string, targetPage?: number, targetPageSize?: number, nextFilters?: EInvoiceAdvancedFilters) => boolean
    >(() => false)
    const [actionLoading, setActionLoading] = useState(false)
    const [fromDate, setFromDate] = useState<Date | null>(() => createMonthStartDate())
    const [toDate, setToDate] = useState<Date | null>(() => createToday())
    const [keyword, setKeyword] = useState("")
    const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false)
    const [advancedDraft, setAdvancedDraft] = useState<EInvoiceAdvancedFilters>(() => createEmptyEInvoiceAdvancedFilters())
    const [advancedApplied, setAdvancedApplied] = useState<EInvoiceAdvancedFilters>(() => createEmptyEInvoiceAdvancedFilters())
    const [pageNumber, setPageNumber] = useState(1)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const rowsRef = useRef<EInvoice[]>([])
    const totalRecordsRef = useRef(0)
    const [listQuery, setListQuery] = useState<EInvoiceListQueryState>({
        lang: "",
        fromYmd: "",
        toYmd: "",
        keyword: "",
        invoiceId: 0,
        filters: createEmptyEInvoiceAdvancedFilters(),
    })
    const [listFetchEnabled, setListFetchEnabled] = useState(false)
    const [popupVisible, setPopupVisible] = useState(false)
    const [editingInvoiceId, setEditingInvoiceId] = useState(0)
    const [copyFromInvoiceId, setCopyFromInvoiceId] = useState(0)
    const [editorReadOnly, setEditorReadOnly] = useState(false)
    const [formInitialInvoice, setFormInitialInvoice] = useState<EInvoice | null>(null)
    const [deleteDisabled, setDeleteDisabled] = useState(false)
    const [hasSelection, setHasSelection] = useState(false)
    const [canSendMail, setCanSendMail] = useState(false)
    const [invoiceImportVisible, setInvoiceImportVisible] = useState(false)
    const [printOptionsVisible, setPrintOptionsVisible] = useState(false)
    const [sendMailVisible, setSendMailVisible] = useState(false)
    const [pendingSendMailInvoices, setPendingSendMailInvoices] = useState<EInvoice[]>([])
    const [pendingPrintInvoices, setPendingPrintInvoices] = useState<EInvoice[]>([])
    const [transmissionPopupVisible, setTransmissionPopupVisible] = useState(false)
    const [transmissionLoading, setTransmissionLoading] = useState(false)
    const [transmissionTitle, setTransmissionTitle] = useState("")
    const [transmissionMessages, setTransmissionMessages] = useState<EInvoiceTransmissionMessage[]>([])
    const [transmissionInvoiceId, setTransmissionInvoiceId] = useState<number | null>(null)
    const [editMailVisible, setEditMailVisible] = useState(false)
    const [editMailInvoice, setEditMailInvoice] = useState<EInvoice | null>(null)
    const [mailHistoryVisible, setMailHistoryVisible] = useState(false)
    const [mailHistoryLoading, setMailHistoryLoading] = useState(false)
    const [mailHistoryTitle, setMailHistoryTitle] = useState("")
    const [mailHistoryItems, setMailHistoryItems] = useState<EInvoiceEmailHistory[]>([])

    const { lang, translate } = useContext(LanguageContext) as {
        lang: string
        translate: (key: string, fallback?: string) => string
    }

    const t = useCallback(
        (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
        [translate],
    )

    const { getCodesByType } = useSysCodes()
    const invoiceStatusOptions = useMemo(
        () => buildInvoiceStatusOptions(getCodesByType(EINV_INVOICE_STATUS_CODE_TYPE), t),
        [getCodesByType, t],
    )
    const tchdonOptions = useMemo(
        () => buildEInvoiceTchdonOptions(getCodesByType(EINV_TCHDON_CODE_TYPE), t),
        [getCodesByType, t],
    )
    const cqtStatusOptions = useMemo(
        () => buildEInvoiceCqtStatusOptions(getCodesByType(EINV_CQT_STATUS_CODE_TYPE), t),
        [getCodesByType, t],
    )
    const signStatusOptions = useMemo(
        () => buildEInvoiceSignStatusOptions(getCodesByType(EINV_SIGN_STATUS_CODE_TYPE), t),
        [getCodesByType, t],
    )
    const mailStatusOptions = useMemo(
        () => buildEInvoiceMailStatusOptions(getCodesByType(EINV_MAIL_STATUS_CODE_TYPE), t),
        [getCodesByType, t],
    )

    const screenCd = useMemo(() => location.pathname, [location.pathname])
    const linkedInvoiceId = useMemo(() => readQueryNumber(location.search, "invoiceId"), [location.search])
    const linkedKeyword = useMemo(() => readQueryText(location.search, "keyword"), [location.search])
    const createActionRequested = useMemo(
        () => readQueryText(location.search, "action").toLowerCase() === "create",
        [location.search],
    )
    const companyCd = getCurrentCompanyCd()
    const decimalResolver = useEInvoiceDecimalResolver("UI")
    const { promptIfPluginMissing, setupPopup } = useEInvoiceSigningPluginSetupPrompt()
    // Prefetch editor deps while user is on the list — avoids cold load/jitter on Create.
    useEInvoiceSellersQuery("", true)
    useEInvoiceUserSettingDefaultsQuery(true)
    const hasLinkedFilter = linkedInvoiceId > 0 || linkedKeyword.length > 0
    const isDateRangeValid = hasLinkedFilter || !fromDate || !toDate || fromDate <= toDate

    companyCdRef.current = companyCd
    langRef.current = lang

    const invalidatePagedList = useEInvoicePagedListInvalidate()
    const {
        data: listResponse,
        isLoading: isListLoading,
        isFetching: isListFetching,
        isError: isListError,
        error: listError,
        refetch: refetchEInvoices,
    } = useEInvoicePagedListQuery(
        {
            lang: listQuery.lang,
            fromYmd: listQuery.fromYmd,
            toYmd: listQuery.toYmd,
            keyword: listQuery.keyword,
            invoiceId: listQuery.invoiceId,
            pageNumber,
            pageSize,
            includeDetails: true,
            cashRegister,
            ...toEInvoiceSearchFilterParams(listQuery.filters),
        },
        listFetchEnabled,
    )
    const loading = actionLoading || (listFetchEnabled && (isListLoading || isListFetching))

    // DX needs totalCount for multi-page pager. Fetch stays on React Query;
    // this store only mirrors the already-loaded page + server total.
    const dataSource = useMemo(
        () => createMirrorPagedStore<EInvoice>(
            "INVOICE_ID",
            () => rowsRef.current,
            () => totalRecordsRef.current,
        ),
        [],
    )

    const refreshList = useCallback(async () => {
        await invalidatePagedList()
        if (!listFetchEnabled || !isDateRangeValid) {
            await refetchEInvoices()
        }
    }, [invalidatePagedList, isDateRangeValid, listFetchEnabled, refetchEInvoices])

    const renderHeaderDecimalCell = useCallback(
        (fieldKey: string) => (cellInfo: EInvoiceGridCellInfo) => (
            <span className="einvoice-table__money">
                {formatEInvoiceDecimalValue(
                    cellInfo.value,
                    decimalResolver,
                    "HEADER",
                    fieldKey,
                    cellInfo.data?.DVTTE,
                    getEInvoiceMoneyFallbackPrecision(cellInfo.data?.DVTTE),
                )}
            </span>
        ),
        [decimalResolver],
    )

    const renderInvoiceNoCell = useCallback((cellInfo: EInvoiceGridCellInfo) => {
        const series = [String(cellInfo.data?.KHMSHDON ?? "").trim(), String(cellInfo.data?.KHHDON ?? "").trim()]
            .filter(Boolean)
            .join("/")
        const invoiceNo = String(cellInfo.data?.SHDON ?? "").trim()

        return (
            <EInvoiceDocNoCell
                series={series}
                numberLabel={invoiceNo ? `${t("SHDON", "Số")}: ${invoiceNo}` : t("NO_INVOICE_NO", "Chưa cấp số")}
            />
        )
    }, [t])

    const renderBuyerSummaryCell = useCallback((cellInfo: EInvoiceGridCellInfo) => {
        const row = cellInfo.data
        const personName = trimGridCellText(row?.NMUA_HVTNMHANG)
        const companyName = trimGridCellText(row?.NMUA_TEN)
        const taxCode = trimGridCellText(row?.NMUA_MST)
        const lookupCode = trimGridCellText(row?.MTRACUU)
        const mccqt = trimGridCellText(row?.MCCQT)
        const errorMessage = trimGridCellText(row?.ERROR_MESSAGE)
        const primaryName = companyName || personName || "—"
        const metaLines = [
            taxCode ? `MST: ${taxCode}` : "",
            lookupCode ? `${t("MTRACUU", "Mã tra cứu")}: ${lookupCode}` : "",
            mccqt ? { text: `MCCQT: ${mccqt}`, codeOk: !cashRegister || Number(row?.INVOICE_STATUS) !== 0 && Number(row?.INVOICE_STATUS) !== 6 } : "",
            cashRegister && !isEInvoiceMttIssued(row) ? t("MTT_NOT_ISSUED", "Chưa phát hành") : "",
            cashRegister && isEInvoiceMttIssued(row) && !isEInvoiceSigned(row) ? t("MTT_WAIT_SEND", "Chờ gửi CQT") : "",
            cashRegister && Number(row?.IS_SIGNED) === 1 && Number(row?.INVOICE_STATUS) === 0 ? "Chờ kết quả kiểm tra gói từ CQT" : "",
            companyName && personName ? personName : "",
        ].filter(Boolean)

        return (
            <EInvoicePartyCell
                name={primaryName}
                metaLines={metaLines}
                error={errorMessage ? truncateEInvoiceErrorMessage(errorMessage) : undefined}
            />
        )
    }, [cashRegister, t])

    const closeTransmissionPopup = useCallback(() => {
        if (transmissionLoading) {
            return
        }

        setTransmissionPopupVisible(false)
        setTransmissionMessages([])
        setTransmissionInvoiceId(null)
        setTransmissionTitle("")
    }, [transmissionLoading])

    const handleShowTransmissionMessages = useCallback(
        async (row: EInvoice) => {
            const invoiceId = Number(row.INVOICE_ID ?? 0)
            if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
                return
            }

            const titleParts = [
                formatEInvoiceDisplayNo(row),
                typeof row.NMUA_TEN === "string" ? row.NMUA_TEN.trim() : "",
            ].filter(Boolean)

            setTransmissionTitle(
                titleParts.length > 0
                    ? `${t("DECL_TRANSMISSION_INFO", "Thông tin truyền nhận")} - ${titleParts.join(" - ")}`
                    : t("DECL_TRANSMISSION_INFO", "Thông tin truyền nhận"),
            )
            setTransmissionMessages([])
            setTransmissionInvoiceId(invoiceId)
            setTransmissionPopupVisible(true)
            setTransmissionLoading(true)

            try {
                const response = await getEInvoiceTransmissionMessages(invoiceId)
                setTransmissionMessages(response.data)
            } catch (error) {
                notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
            } finally {
                setTransmissionLoading(false)
            }
        },
        [t],
    )

    const handleViewTransmissionMessage = useCallback(
        async (message: EInvoiceTransmissionMessage) => {
            try {
                const opened = await openEInvoiceTransmissionHtmlPreview(message, {
                    invoiceId: transmissionInvoiceId,
                })
                if (!opened) {
                    notify(t("PREVIEW_OPEN_FAILED", "Could not open preview"), "warning", 3000)
                }
            } catch (error) {
                notify(getApiErrorMessage(error, t("PREVIEW_FAILED", "Preview failed")), "error", 4000)
            }
        },
        [t, transmissionInvoiceId],
    )

    const closeEditMailPopup = useCallback(() => {
        if (actionLoading) {
            return
        }

        setEditMailVisible(false)
        setEditMailInvoice(null)
    }, [actionLoading])

    const handleOpenEditMail = useCallback((row: EInvoice) => {
        if (Number(row.INVOICE_ID ?? 0) <= 0) {
            return
        }

        setEditMailInvoice(row)
        setEditMailVisible(true)
    }, [])

    const handleConfirmEditMail = useCallback(
        async (invoice: EInvoice, toEmail: string) => {
            const invoiceId = Number(invoice.INVOICE_ID ?? 0)
            if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
                notify(t("INVALID_DATA", "Invalid data"), "warning", 2500)
                return
            }

            setActionLoading(true)
            try {
                await updateEInvoiceBuyerEmail(invoiceId, toEmail)
                notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000)
                setEditMailVisible(false)
                setEditMailInvoice(null)
                await refreshList()
            } catch (error) {
                notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")), "error", 4000)
            } finally {
                setActionLoading(false)
            }
        },
        [refreshList, t],
    )

    const closeMailHistoryPopup = useCallback(() => {
        if (mailHistoryLoading) {
            return
        }

        setMailHistoryVisible(false)
        setMailHistoryItems([])
        setMailHistoryTitle("")
    }, [mailHistoryLoading])

    const handleShowMailHistory = useCallback(
        async (row: EInvoice) => {
            const invoiceId = Number(row.INVOICE_ID ?? 0)
            if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
                return
            }

            const titleParts = [
                formatEInvoiceDisplayNo(row),
                typeof row.NMUA_TEN === "string" ? row.NMUA_TEN.trim() : "",
            ].filter(Boolean)

            setMailHistoryTitle(
                titleParts.length > 0
                    ? `${t("MAIL_HISTORY", "Lịch sử gửi mail")} - ${titleParts.join(" - ")}`
                    : t("MAIL_HISTORY", "Lịch sử gửi mail"),
            )
            setMailHistoryItems([])
            setMailHistoryVisible(true)
            setMailHistoryLoading(true)

            try {
                const response = await getEInvoiceMailHistory(invoiceId)
                setMailHistoryItems(response.data)
            } catch (error) {
                notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
            } finally {
                setMailHistoryLoading(false)
            }
        },
        [t],
    )

    const handleInvoiceStatusAction = useCallback(
        (row: EInvoice | undefined, actionKey: InvoiceStatusActionKey | string | undefined) => {
            if (!row || Number(row.INVOICE_ID ?? 0) <= 0) {
                return
            }

            if (actionKey === "edit-mail") {
                handleOpenEditMail(row)
                return
            }

            if (actionKey === "mail-history") {
                void handleShowMailHistory(row)
                return
            }

            if (actionKey === "transmission-history") {
                void handleShowTransmissionMessages(row)
            }
        },
        [handleOpenEditMail, handleShowMailHistory, handleShowTransmissionMessages],
    )

    const renderInvoiceStatusCell = useCallback(
        (cellInfo: EInvoiceGridCellInfo) => (
            <EInvoiceManageStatusCell
                data={cellInfo.data}
                t={t}
                onAction={handleInvoiceStatusAction}
            />
        ),
        [handleInvoiceStatusAction, t],
    )

    const buildInvoiceStatusSearchText = useCallback(
        (invoice: EInvoice | null | undefined) => {
            const statusText = formatEInvoiceStatusSummary(
                invoice,
                invoiceStatusOptions,
                t("IS_SIGNED", "Signed"),
                t("SIGNED_NO", "Not signed"),
                tchdonOptions,
                mailStatusOptions,
            )
            const signed = isEInvoiceSigned(invoice)
            const signedAlias = signed ? "signed da ky" : "not signed unsigned chua ky"
            const mailStatusValue = Number(invoice?.MAIL_STATUS ?? 0)
            const mailAlias = !signed
                ? ""
                : mailStatusValue === 1
                    ? "mail sent email sent da gui"
                    : mailStatusValue === 2
                        ? "mail error send failed gui loi"
                        : "mail not sent email not sent chua gui"
            return `${statusText} ${normalizeSearchAlias(statusText)} ${signedAlias} ${mailAlias}`.trim()
        },
        [invoiceStatusOptions, mailStatusOptions, t, tchdonOptions],
    )

    const calculateInvoiceStatusFilterExpression = useCallback(
        (filterValue: unknown, selectedFilterOperation: string | null, _target: string) => [
            (row: EInvoice) => buildInvoiceStatusSearchText(row),
            selectedFilterOperation ?? "contains",
            filterValue,
        ],
        [buildInvoiceStatusSearchText],
    )

    const buildListQueryParams = useCallback(
        (nextKeyword?: string, nextFilters?: EInvoiceAdvancedFilters): EInvoiceListQueryState => {
            const resolvedKeyword = typeof nextKeyword === "string" ? nextKeyword.trim() : keyword.trim()
            const resolvedFilters = normalizeEInvoiceAdvancedFilters(
                nextFilters ? cloneEInvoiceAdvancedFilters(nextFilters) : advancedApplied,
            )

            return {
                lang: langRef.current,
                fromYmd: hasLinkedFilter ? "" : (formatDateToYmd(fromDate) ?? ""),
                toYmd: hasLinkedFilter ? "" : (formatDateToYmd(toDate) ?? ""),
                keyword: resolvedKeyword,
                invoiceId: linkedInvoiceId || 0,
                filters: resolvedFilters,
            }
        },
        [advancedApplied, fromDate, hasLinkedFilter, keyword, linkedInvoiceId, toDate],
    )

    const applyListQuery = useCallback(
        (
            nextKeyword?: string,
            targetPage = 1,
            targetPageSize = pageSize,
            nextFilters?: EInvoiceAdvancedFilters,
        ) => {
            if (!isDateRangeValid) {
                return false
            }

            const query = buildListQueryParams(nextKeyword, nextFilters)
            if (query.fromYmd && query.toYmd && query.fromYmd > query.toYmd) {
                notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
                rowsRef.current = []
                totalRecordsRef.current = 0
                setPageNumber(1)
                setListFetchEnabled(false)
                gridRef.current?.clearSelection()
                setHasSelection(false)
                setCanSendMail(false)
                setDeleteDisabled(false)
                syncMirroredGridPage(gridRef.current, 1, initialPagingEventsSuppressedRef)
                return false
            }

            const resolvedPageNumber = resolvePageNumber(targetPage)
            const resolvedPageSize = resolvePageSize(targetPageSize)

            setKeyword(query.keyword)
            setAdvancedApplied(query.filters)
            setAdvancedDraft(cloneEInvoiceAdvancedFilters(query.filters))
            setListQuery(query)
            setPageNumber(resolvedPageNumber)
            setPageSize(resolvedPageSize)
            setListFetchEnabled(true)
            return true
        },
        [buildListQueryParams, isDateRangeValid, pageSize, t],
    )
    applyListQueryRef.current = applyListQuery

    const loadData = useCallback(
        (nextKeyword?: string, targetPage = pageNumber, targetPageSize = pageSize) => {
            applyListQuery(nextKeyword, targetPage, targetPageSize)
        },
        [applyListQuery, pageNumber, pageSize],
    )

    const { certificatePopupVisible, openSigningPopup, certificateSelectPopup } = useEInvoiceCertificateSigning<PendingSignInvoice>({
        t,
        promptIfPluginMissing,
        onRefresh: refreshList,
        setActionLoading,
        signBatch: async (items, certificateThumbprint) => {
            if (cashRegister) {
                const { data: payload } = await prepareMttBatch(items.map(item => item.invoiceId))
                const signed = await signXmlWithPlugin({
                    requestId: `mtt-${payload.BATCH_ID}`,
                    companyCd,
                    certificateThumbprint,
                    signType: "NNT",
                    xml: payload.RAW_XML,
                })
                const { data: count } = await saveMttBatch(payload.BATCH_ID, signed.signedXml)
                return count
            }
            let successCount = 0
            for (const [index, signRequest] of items.entries()) {
                const payloadResponse = await getEInvoiceSigningPayload(signRequest.invoiceId)
                const payload = payloadResponse.data
                if (payload.IS_SIGNED) {
                    continue
                }

                const rawXml = String(payload.RAW_XML ?? "").trim()
                if (!rawXml) {
                    throw new Error(
                        formatText(t("SIGN_EMPTY_XML_FOR_ID", "E-invoice {0} has empty signing XML"), [signRequest.invoiceId]),
                    )
                }

                const requiresBke = Boolean(payload.REQUIRES_BKE)
                const bkeRawXml = String(payload.BKE_RAW_XML ?? "").trim()
                if (requiresBke && !bkeRawXml) {
                    throw new Error(
                        formatText(
                            t(
                                "SIGN_EMPTY_BKE_XML_FOR_ID",
                                "E-invoice {0} (thế/điều chỉnh nhiều HĐ) requires bảng kê XML before signing",
                            ),
                            [signRequest.invoiceId],
                        ),
                    )
                }

                const signed = await signXmlWithPlugin({
                    requestId: `einvoice-${companyCd}-${signRequest.invoiceId}-${Date.now()}-${index + 1}`,
                    invoiceId: signRequest.invoiceId,
                    companyCd,
                    certificateThumbprint,
                    signType: "SELLER",
                    xml: rawXml,
                })

                let signedBkeXml: string | undefined
                if (requiresBke) {
                    const signedBke = await signXmlWithPlugin({
                        requestId: `einvoice-bke-${companyCd}-${signRequest.invoiceId}-${Date.now()}-${index + 1}`,
                        invoiceId: signRequest.invoiceId,
                        companyCd,
                        certificateThumbprint,
                        signType: "SELLER",
                        xml: bkeRawXml,
                    })
                    signedBkeXml = signedBke.signedXml
                }

                await saveEInvoiceSignature(signRequest.invoiceId, {
                    XML: signed.signedXml,
                    ...(signedBkeXml ? { BKE_XML: signedBkeXml } : {}),
                    CERTIFICATE_SUBJECT: signed.certificateSubject,
                    CERTIFICATE_THUMBPRINT: signed.certificateThumbprint,
                    CERTIFICATE_SERIAL_NUMBER: signed.certificateSerialNumber,
                    SIGNED_AT: signed.signedAt,
                })

                successCount += 1
            }

            return successCount
        },
    })

    useEffect(() => {
        if (!listFetchEnabled) {
            return
        }

        if (!isListError || !listError) {
            return
        }

        notify(getApiErrorMessage(listError, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
    }, [isListError, listError, listFetchEnabled, t])

    useEffect(() => {
        if (!listResponse || !listFetchEnabled) {
            return
        }

        const {
            totalRecords,
            totalPages,
            pageNumber: responsePageNumber,
            pageSize: responsePageSize,
        } = listResponse

        if (totalRecords > 0 && pageNumber > totalPages) {
            setPageNumber(totalPages)
            return
        }

        const normalizedRows = normalizeEInvoiceRows(listResponse.data, companyCd)
        for (const invoice of normalizedRows) {
            if (Number(invoice.INVOICE_ID ?? 0) > 0) {
                try {
                    saveEInvoiceDetailCache(invoice)
                } catch {
                    // Ignore cache write failures (e.g. sessionStorage quota).
                }
            }
        }

        rowsRef.current = normalizedRows
        totalRecordsRef.current = totalRecords

        // New search/page/reload must drop prior ticks — DevExtreme keeps selectedRowKeys across datasource reloads.
        gridRef.current?.clearSelection()
        setHasSelection(false)
        setCanSendMail(false)
        setDeleteDisabled(false)

        if (responsePageNumber > 0 && responsePageNumber !== pageNumber) {
            setPageNumber(responsePageNumber)
        }
        if (responsePageSize > 0 && responsePageSize !== pageSize) {
            setPageSize(responsePageSize)
        }

        syncMirroredGridPage(gridRef.current, responsePageNumber > 0 ? responsePageNumber : pageNumber, initialPagingEventsSuppressedRef)
    }, [companyCd, listFetchEnabled, listResponse, pageNumber, pageSize])

    useEffect(() => {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
        if (nav?.type !== "reload") {
            return
        }

        // One-shot on browser reload. Do NOT depend on applyListQuery identity —
        // that callback changes after each apply (pageNumber/pageSize) and caused a tight loop.
        if (reloadResetDoneRef.current) {
            return
        }
        reloadResetDoneRef.current = true

        const empty = createEmptyEInvoiceAdvancedFilters()
        setKeyword("")
        setAdvancedDraft(empty)
        setAdvancedApplied(empty)
        setAdvancedSearchOpen(false)
        setFromDate(createMonthStartDate())
        setToDate(createToday())
        setPageNumber(1)
        setPageSize(DEFAULT_PAGE_SIZE)
        initialLoadTriggeredRef.current = true
        linkedKeywordAppliedRef.current = ""
        initialPagingEventsSuppressedRef.current = true
        applyListQueryRef.current("", 1, DEFAULT_PAGE_SIZE, empty)

        const params = new URLSearchParams(location.search)
        params.delete("keyword")
        const nextSearch = params.toString()
        const currentSearch = location.search.startsWith("?") ? location.search.slice(1) : location.search
        if (nextSearch !== currentSearch) {
            navigate(
                {
                    pathname: buildAppPath(companyCd, "/einvoice/manage"),
                    search: nextSearch ? `?${nextSearch}` : "",
                },
                { replace: true },
            )
        }
    }, [companyCd, location.search, navigate])

    useEffect(() => {
        if (initialLoadTriggeredRef.current || !isDateRangeValid) {
            return
        }

        initialLoadTriggeredRef.current = true
        initialPagingEventsSuppressedRef.current = true
        applyListQuery(keyword, 1, DEFAULT_PAGE_SIZE)
    }, [applyListQuery, isDateRangeValid, keyword])

    useEffect(() => {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
        if (nav?.type === "reload") {
            return
        }

        if (!linkedKeyword) {
            linkedKeywordAppliedRef.current = ""
            return
        }

        if (linkedKeywordAppliedRef.current === linkedKeyword) {
            return
        }

        linkedKeywordAppliedRef.current = linkedKeyword
        initialPagingEventsSuppressedRef.current = true
        applyListQuery(linkedKeyword, 1, pageSize)
    }, [applyListQuery, linkedKeyword, pageSize])

    const openCreate = useCallback(() => {
        setFormInitialInvoice(null)
        setCopyFromInvoiceId(0)
        setEditingInvoiceId(0)
        setEditorReadOnly(false)
        setPopupVisible(true)
    }, [])

    useEffect(() => {
        if (!createActionRequested) {
            createActionHandledRef.current = false
            return
        }

        if (createActionHandledRef.current) {
            return
        }

        createActionHandledRef.current = true
        openCreate()

        const params = new URLSearchParams(location.search)
        params.delete("action")
        const nextSearch = params.toString()
        navigate(
            {
                pathname: buildAppPath(companyCd, "/einvoice/manage"),
                search: nextSearch ? `?${nextSearch}` : "",
            },
            { replace: true },
        )
    }, [companyCd, createActionRequested, location.search, navigate, openCreate])

    const openEdit = useCallback((row: EInvoice) => {
        const invoiceId = Number(row.INVOICE_ID ?? 0)
        if (invoiceId <= 0) {
            return
        }

        setFormInitialInvoice(null)
        setCopyFromInvoiceId(0)
        setEditorReadOnly(isEInvoiceSigned(row) || (cashRegister && isEInvoiceMttIssued(row)))
        setEditingInvoiceId(invoiceId)
        setPopupVisible(true)
    }, [cashRegister])

    const resetEditorState = useCallback(() => {
        setFormInitialInvoice(null)
        setCopyFromInvoiceId(0)
        setEditingInvoiceId(0)
        setEditorReadOnly(false)
    }, [])

    const getSelectedInvoiceIds = useCallback(() => {
        return ((gridRef.current?.getSelectedRowKeys() ?? []) as GridKey[])
            .map((key) => Number(key))
            .filter((value) => Number.isFinite(value) && value > 0)
    }, [])

    const validateDateRange = useCallback(() => {
        if (hasLinkedFilter || !fromDate || !toDate || fromDate <= toDate) {
            return true
        }

        notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
        return false
    }, [fromDate, hasLinkedFilter, t, toDate])

    const closePopup = useCallback(() => {
        setPopupVisible(false)
        resetEditorState()
    }, [resetEditorState])

    useEffect(() => {
        if (linkedInvoiceId <= 0) {
            return
        }

        const linkedKey = `${linkedInvoiceId}`
        if (linkedInvoiceHandledRef.current === linkedKey) {
            return
        }

        linkedInvoiceHandledRef.current = linkedKey
        setFormInitialInvoice(null)
        setCopyFromInvoiceId(0)
        setEditorReadOnly(false)
        setEditingInvoiceId(linkedInvoiceId)
        setPopupVisible(true)
    }, [linkedInvoiceId])

    const handleFormSaved = useCallback(
        async (invoice: EInvoice, createNext: boolean) => {
            setFormInitialInvoice(null)
            setCopyFromInvoiceId(0)
            if (createNext) {
                setEditingInvoiceId(0)
            } else {
                setEditingInvoiceId(Number(invoice.INVOICE_ID))
            }
            await refreshList()
        },
        [refreshList],
    )

    const handleContextMenuUpdate = useCallback(
        (row: EInvoice) => {
            const invoiceId = Number(row.INVOICE_ID ?? 0)
            if (invoiceId > 0) {
                openEdit(row)
            }
        },
        [openEdit],
    )

    const handleContextMenuCopy = useCallback(
        (row: EInvoice) => {
            const invoiceId = Number(row.INVOICE_ID ?? 0)
            if (invoiceId <= 0) {
                return
            }

            setFormInitialInvoice(null)
            setCopyFromInvoiceId(invoiceId)
            setEditingInvoiceId(0)
            setEditorReadOnly(false)
            setPopupVisible(true)
        },
        [],
    )

    const handleGridInitialized = useCallback((event: InitializedEvent<EInvoice, GridKey>) => {
        gridRef.current = event.component ?? null
    }, [])

    const handleRowDblClick = useCallback(
        (event: RowDblClickEvent<EInvoice, GridKey>) => {
            const row = event.data
            if (row) {
                openEdit(row)
            }
        },
        [openEdit],
    )

    const getSelectedInvoices = useCallback((): EInvoice[] => {
        return (gridRef.current?.getSelectedRowsData() ?? []) as EInvoice[]
    }, [])

    const handleSelectionChanged = useCallback((event: SelectionChangedEvent<EInvoice, GridKey>) => {
        const selectedRows = event.selectedRowsData ?? []
        setHasSelection(selectedRows.length > 0)
        setCanSendMail(selectedRows.some((row) => isEInvoiceReadyToSendMail(row)))
        setDeleteDisabled(selectedRows.some((row) => isEInvoiceSigned(row) || (cashRegister && isEInvoiceMttIssued(row))))
    }, [cashRegister])

    const handleDelete = useCallback(async () => {
        const selectedInvoices = getSelectedInvoices()
        const ids = selectedInvoices
            .map((row) => Number(row.INVOICE_ID ?? 0))
            .filter((value) => Number.isFinite(value) && value > 0)

        if (ids.length === 0) {
            notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
            return
        }

        const blockedIds = selectedInvoices
            .filter((row) => isEInvoiceSigned(row) || (cashRegister && isEInvoiceMttIssued(row)))
            .map((row) => Number(row.INVOICE_ID))
        const deletableIds = ids.filter((id) => !blockedIds.includes(id))

        if (blockedIds.length > 0) {
            notify(
                cashRegister
                    ? t("MTT_DELETE_BLOCKED", "Hóa đơn MTT đã phát hành hoặc đã ký không được xóa")
                    : t("SIGNED_DELETE_BLOCKED", "Signed record cannot be deleted"),
                "warning",
                3500,
            )
        }

        if (deletableIds.length === 0) {
            return
        }

        const confirmed = await confirm(
            t("MSG_CONFIRM_DELETE_RECORD", "Are you sure you want to delete {0} record?").replace("{0}", String(deletableIds.length)),
            t("MSG_CONFIRM_DELETE", "Confirm delete"),
        )
        if (!confirmed) {
            return
        }

        setActionLoading(true)
        try {
            await deleteEInvoices(deletableIds)
            notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
            setDeleteDisabled(false)
            await refreshList()
        } catch (error) {
            notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 4000)
        } finally {
            setActionLoading(false)
        }
    }, [cashRegister, getSelectedInvoices, refreshList, t])

    const handleViewXml = useCallback(async () => {
        const ids = getSelectedInvoiceIds()
        if (ids.length === 0) {
            notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
            return
        }

        if (ids.length > 1) {
            notify(t("XML_PREVIEW_SINGLE", "Select exactly one record to view XML"), "warning", 3500)
            return
        }

        const selectedInvoice = getSelectedInvoices()[0]
        const titleParts = [
            typeof selectedInvoice?.KHHDON === "string" ? selectedInvoice.KHHDON.trim() : "",
            typeof selectedInvoice?.SHDON === "string" ? selectedInvoice.SHDON.trim() : "",
        ].filter(Boolean)
        const title = titleParts.length > 0 ? `E-Invoice XML ${titleParts.join("-")}` : undefined

        setActionLoading(true)
        try {
            await openEInvoiceXmlPreviewWithNotify({
                invoiceId: ids[0],
                title,
                notifyUnableToOpen: (message) => notify(message, "error", 4000),
            })
        } finally {
            setActionLoading(false)
        }
    }, [getSelectedInvoiceIds, getSelectedInvoices, t])

    const handlePrintPdf = useCallback(
        (event?: MouseEvent) => {
            if (event?.ctrlKey) {
                void handleViewXml()
                return
            }

            const ids = getSelectedInvoiceIds()
            if (ids.length === 0) {
                notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
                return
            }

            setPendingPrintInvoices(getSelectedInvoices())
            setPrintOptionsVisible(true)
        },
        [getSelectedInvoices, handleViewXml, t],
    )

    const closePrintOptionsPopup = useCallback(() => {
        if (actionLoading) {
            return
        }

        setPrintOptionsVisible(false)
        setPendingPrintInvoices([])
    }, [actionLoading])

    const handleConfirmPrintOptions = useCallback(
        ({ format, printRequest }: EInvoicePrintConfirmPayload) => {
            if (pendingPrintInvoices.length === 0) {
                return
            }

            setPrintOptionsVisible(false)

            if (cashRegister && format === "xml") {
                setActionLoading(true)
                void downloadMttBatchXml(pendingPrintInvoices.map(invoice => Number(invoice.INVOICE_ID)))
                    .catch(error => notify(getApiErrorMessage(error, "Không thể xuất gói XML MTT"), "error", 5000))
                    .finally(() => { setActionLoading(false); setPendingPrintInvoices([]) })
                return
            }

            const shouldDownload = pendingPrintInvoices.length > 1 || format === "xml"
            if (shouldDownload) {
                setActionLoading(true)
                void downloadEInvoicesBatch({
                    items: pendingPrintInvoices.map((invoice) => ({
                        invoiceId: Number(invoice.INVOICE_ID),
                        printRequest: buildPrintRequestFromInvoice(invoice, printRequest),
                    })),
                    format,
                    notifyUnableToOpen: (message) => notify(message, "error", 4000),
                    notifyInfo: (message) => notify(message, "info", 8000),
                    notifySuccess: (message) => notify(message, "success", 4000),
                }).finally(() => {
                    setActionLoading(false)
                    setPendingPrintInvoices([])
                })
                return
            }

            const firstInvoice = pendingPrintInvoices[0]
            const invoiceId = Number(firstInvoice.INVOICE_ID)
            void openEInvoiceReportViewer({
                invoiceIds: [invoiceId],
                companyCd,
                printRequest: buildPrintRequestFromInvoice(firstInvoice, printRequest),
                notifyUnableToOpen: (message) => notify(message, "error", 4000),
                notifyInfo: (message) => notify(message, "info", 8000),
                notifySuccess: (message) => notify(message, "success", 4000),
            }).finally(() => {
                setPendingPrintInvoices([])
            })
        },
        [cashRegister, companyCd, pendingPrintInvoices],
    )

    const handleIssueMtt = useCallback(async () => {
        const selectedInvoices = getSelectedInvoices()
        if (selectedInvoices.length === 0) {
            notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
            return
        }

        const issueRequests = selectedInvoices.filter(
            (invoice) => !isEInvoiceSigned(invoice) && !isEInvoiceMttIssued(invoice) && Number(invoice.INVOICE_ID) > 0,
        )
        const skipped = selectedInvoices.length - issueRequests.length
        if (skipped > 0) {
            notify(
                formatText(t("MTT_ISSUE_SKIP", "Bỏ qua {0} hóa đơn đã phát hành hoặc đã ký"), [skipped]),
                "warning",
                3000,
            )
        }
        if (issueRequests.length === 0) {
            return
        }

        const confirmed = await confirm(
            formatText(t("MTT_ISSUE_CONFIRM", "Phát hành {0} hóa đơn MTT (cấp số và mã)?"), [issueRequests.length]),
            t("MTT_ISSUE", "Phát hành"),
        )
        if (!confirmed) {
            return
        }

        setActionLoading(true)
        try {
            let successCount = 0
            for (const invoice of issueRequests) {
                await issueMttInvoice(Number(invoice.INVOICE_ID))
                successCount += 1
            }
            notify(
                formatText(t("MTT_ISSUE_SUCCESS", "Đã phát hành {0} hóa đơn MTT"), [successCount]),
                "success",
                4000,
            )
            await refreshList()
        } catch (error) {
            notify(getApiErrorMessage(error, t("MTT_ISSUE_FAILED", "Phát hành MTT thất bại")), "error", 5000)
        } finally {
            setActionLoading(false)
        }
    }, [getSelectedInvoices, refreshList, t])

    const handleSignXml = useCallback(async () => {
        const selectedInvoices = getSelectedInvoices()
        if (selectedInvoices.length === 0) {
            notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
            return
        }

        const confirmed = await confirm(
            formatText(
                cashRegister
                    ? t("MTT_SIGN_CONFIRM_BATCH", "Ký gửi CQT {0} hóa đơn MTT đã phát hành?")
                    : t("SIGN_CONFIRM_BATCH", "Sign {0} selected record(s)?"),
                [selectedInvoices.length],
            ),
            t("SIGN_SEND_CQT", "Ký và gửi CQT"),
        )
        if (!confirmed) {
            return
        }

        setActionLoading(true)
        try {
            const signRequests: PendingSignInvoice[] = []
            const signedIds: number[] = []
            const notIssuedIds: number[] = []

            for (const invoice of selectedInvoices) {
                const invoiceId = Number(invoice.INVOICE_ID)
                if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
                    continue
                }

                if (isEInvoiceSigned(invoice)) {
                    signedIds.push(invoiceId)
                    continue
                }

                if (cashRegister && !isEInvoiceMttIssued(invoice)) {
                    notIssuedIds.push(invoiceId)
                    continue
                }

                signRequests.push({ invoiceId })
            }

            if (signedIds.length > 0) {
                notify(formatText(t("SIGN_SKIP_SIGNED", "Skipped {0} already signed record(s)"), [signedIds.length]), "warning", 3000)
            }
            if (notIssuedIds.length > 0) {
                notify(
                    formatText(t("MTT_SIGN_SKIP_NOT_ISSUED", "Bỏ qua {0} hóa đơn chưa phát hành"), [notIssuedIds.length]),
                    "warning",
                    3000,
                )
            }

            if (signRequests.length === 0) {
                return
            }

            await openSigningPopup(signRequests)
        } catch (error) {
      if (await promptIfPluginMissing(error)) {
        return
      }
            notify(getApiErrorMessage(error, t("SIGN_FAILED", "Sign XML failed")), "error", 5000)
        } finally {
            setActionLoading(false)
        }
    }, [cashRegister, getSelectedInvoices, openSigningPopup, promptIfPluginMissing, t])

    const handleSendMail = useCallback(() => {
        const selectedInvoices = getSelectedInvoices()
        const sendableInvoices = selectedInvoices.filter((row) => isEInvoiceReadyToSendMail(row))

        if (sendableInvoices.length === 0) {
            notify(t("SEND_MAIL_NOT_READY", "Select signed invoices with assigned invoice number"), "warning", 3500)
            return
        }

        const notReadyCount = selectedInvoices.length - sendableInvoices.length
        if (notReadyCount > 0) {
            notify(
                formatText(t("SEND_MAIL_SKIP_NOT_READY", "Skipped {0} invoice(s) that are not signed or missing invoice number"), [
                    notReadyCount,
                ]),
                "warning",
                3500,
            )
        }

        setPendingSendMailInvoices(sendableInvoices)
        setSendMailVisible(true)
    }, [getSelectedInvoices, t])

    const closeSendMailPopup = useCallback(() => {
        if (actionLoading) {
            return
        }

        setSendMailVisible(false)
        setPendingSendMailInvoices([])
    }, [actionLoading])

    const handleConfirmSendMail = useCallback(
        async (request: EInvoiceSendMailRequest) => {
            if (request.items.length === 0) {
                notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
                return
            }

            setActionLoading(true)
            try {
                const response = await sendEInvoiceMail({
                    items: request.items.map((item) => ({
                        invoiceId: item.invoiceId,
                        toEmail: item.toEmail,
                    })),
                })

                const sentCount = Number(response.data?.Sent ?? 0)
                const skippedCount = Number(response.data?.Skipped ?? 0)

                if (sentCount > 0 && skippedCount === 0) {
                    notify(
                        formatText(t("SEND_MAIL_SUCCESS_COUNT", "Sent {0} email(s) successfully"), [sentCount]),
                        "success",
                        4000,
                    )
                } else if (sentCount > 0) {
                    notify(
                        formatText(t("SEND_MAIL_PARTIAL_SUCCESS", "Sent {0} email(s), failed {1}"), [sentCount, skippedCount]),
                        "warning",
                        5000,
                    )
                } else {
                    notify(getApiErrorMessage(null, t("SEND_MAIL_FAILED", "Send mail failed")), "error", 5000)
                    return
                }

                setSendMailVisible(false)
                setPendingSendMailInvoices([])
                await refreshList()
            } catch (error) {
                notify(getApiErrorMessage(error, t("SEND_MAIL_FAILED", "Send mail failed")), "error", 5000)
            } finally {
                setActionLoading(false)
            }
        },
        [refreshList, t],
    )

    const afterAddItems = useMemo(
        () => [
            ...(cashRegister
                ? [
                    createEInvoiceIssueMttToolbarItem(t, {
                        visible: hasSelection,
                        loading,
                        onIssue: handleIssueMtt,
                    }),
                ]
                : []),
            createEInvoiceSignSendCqtToolbarItem(t, {
                visible: hasSelection,
                loading,
                onSign: handleSignXml,
                label: cashRegister ? t("MTT_SIGN_SEND_CQT", "Ký gửi CQT") : undefined,
            }),
            createEInvoiceSendMailToolbarItem(t, {
                visible: canSendMail,
                loading,
                onSendMail: handleSendMail,
            }),
        ],
        [cashRegister, canSendMail, handleIssueMtt, handleSendMail, handleSignXml, hasSelection, loading, t],
    )

    const toolbarItems = useMemo(
        () => [
            {
                key: "print-pdf",
                icon: "print",
                hint: t("PRINT_PDF", "Print PDF"),
                stylingMode: "text" as const,
                disabled: loading,
                onClick: handlePrintPdf,
            },
        ],
        [handlePrintPdf, loading, t],
    )

    const handleRefresh = useCallback(() => {
        if (!validateDateRange()) {
            return
        }

        void refreshList()
    }, [refreshList, validateDateRange])

    const handleRangeSearch = useCallback(() => {
        if (!validateDateRange()) {
            return
        }

        initialPagingEventsSuppressedRef.current = true
        applyListQuery(keyword, 1, pageSize, advancedDraft)
    }, [advancedDraft, applyListQuery, keyword, pageSize, validateDateRange])

    const handleToggleAdvancedSearch = useCallback(() => {
        setAdvancedSearchOpen((open) => !open)
    }, [])

    const handleAdvancedSearchSubmit = useCallback(() => {
        if (!validateDateRange()) {
            return
        }

        initialPagingEventsSuppressedRef.current = true
        applyListQuery(keyword, 1, pageSize, advancedDraft)
    }, [advancedDraft, applyListQuery, keyword, pageSize, validateDateRange])

    const handleAdvancedSearchReset = useCallback(() => {
        const empty = createEmptyEInvoiceAdvancedFilters()
        setAdvancedDraft(empty)
        if (!validateDateRange()) {
            return
        }

        initialPagingEventsSuppressedRef.current = true
        applyListQuery(keyword, 1, pageSize, empty)
    }, [applyListQuery, keyword, pageSize, validateDateRange])

    const handleRemoveFilterChip = useCallback((chipKey: EInvoiceAdvancedFilterChip["key"]) => {
        if (chipKey === "dateRange") {
            return
        }

        let resolved = clearEInvoiceAdvancedFilterField(advancedApplied, chipKey)
        if (chipKey === "shdonFrom") {
            resolved = { ...resolved, shdonFrom: "", shdonTo: "" }
        }

        if (!validateDateRange()) {
            return
        }

        initialPagingEventsSuppressedRef.current = true
        applyListQuery(keyword, 1, pageSize, resolved)
    }, [advancedApplied, applyListQuery, keyword, pageSize, validateDateRange])

    const activeFilterChips = useMemo(() => {
        const fromDisplay = formatYmdForDisplay(listQuery.fromYmd)
        const toDisplay = formatYmdForDisplay(listQuery.toYmd)
        const dateLabel = fromDisplay && toDisplay ? `${fromDisplay} - ${toDisplay}` : undefined

        const invoiceStatusLabel = advancedApplied.invoiceStatus === null
            ? undefined
            : invoiceStatusOptions.find((item) => item.value === advancedApplied.invoiceStatus)?.text

        const tchdonLabel = advancedApplied.tchdon === null
            ? undefined
            : tchdonOptions.find((item) => item.value === advancedApplied.tchdon)?.text

        const mailStatusLabel = advancedApplied.mailStatus === null
            ? undefined
            : mailStatusOptions.find((item) => item.value === advancedApplied.mailStatus)?.text

        const signStatusLabel = advancedApplied.isSigned === null
            ? undefined
            : signStatusOptions.find((item) => item.value === advancedApplied.isSigned)?.text

        const cqtStatusLabel = advancedApplied.cqtStatus === null
            ? undefined
            : cqtStatusOptions.find((item) => item.value === advancedApplied.cqtStatus)?.text

        return buildEInvoiceAdvancedFilterChips(advancedApplied, {
            t,
            formatDateRange: dateLabel,
            invoiceStatusLabel,
            tchdonLabel,
            mailStatusLabel,
            signStatusLabel,
            cqtStatusLabel,
        })
    }, [advancedApplied, cqtStatusOptions, invoiceStatusOptions, listQuery.fromYmd, listQuery.toYmd, mailStatusOptions, signStatusOptions, t, tchdonOptions])

    const handleOptionChanged = useCallback((event: OptionChangedEvent<EInvoice, GridKey>) => {
        if (!String(event.fullName).startsWith("paging.")) {
            return
        }

        if (initialPagingEventsSuppressedRef.current) {
            return
        }

        if (loading) {
            return
        }

        if (event.fullName === "paging.pageIndex") {
            const pageIndex = Number(event.value ?? 0)
            const nextPageSize = Number(event.component?.pageSize?.() ?? pageSize)
            loadData(keyword, pageIndex + 1, nextPageSize)
            return
        }

        if (event.fullName === "paging.pageSize") {
            const nextPageSize = Number(event.value ?? pageSize)
            event.component.pageIndex(0)
            loadData(keyword, 1, nextPageSize)
        }
    }, [keyword, loadData, loading, pageSize])

    const gridChildren = useMemo(
        () => (
            <>
                <Column
                    name="INVOICE_DISPLAY_NO"
                    caption={t("DISPLAY_NO", "Ký hiệu / Số HĐ")}
                    width={150}
                    fixed={true}
                    fixedPosition="left"
                    calculateCellValue={(row: EInvoice) => formatEInvoiceDisplayNo(row)}
                    cellRender={renderInvoiceNoCell}
                />
                <Column
                    dataField="NLAP"
                    caption={t("NLAP", "Ngày lập")}
                    dataType="date"
                    format="dd/MM/yyyy"
                    width={100}
                    alignment="center"
                />
                <Column
                    name="BUYER_SUMMARY"
                    caption={t("BUYER_SUMMARY", "Người mua")}
                    minWidth={220}
                    calculateCellValue={(row: EInvoice) => formatEInvoiceBuyerSummaryText(row)}
                    cellRender={renderBuyerSummaryCell}
                />
                <Column
                    dataField="TGTCTHUE"
                    caption={t("TGTCTHUE", "Tiền trước thuế")}
                    dataType="number"
                    alignment="right"
                    cellRender={renderHeaderDecimalCell("TGTCTHUE")}
                    width={120}
                />
                <Column
                    dataField="TGTTTHUE"
                    caption={t("TGTTTHUE", "Tiền thuế")}
                    dataType="number"
                    alignment="right"
                    cellRender={renderHeaderDecimalCell("TGTTTHUE")}
                    width={110}
                />
                <Column
                    dataField="TGTTTBSO"
                    caption={t("TGTTTBSO", "Tổng thanh toán")}
                    dataType="number"
                    alignment="right"
                    cellRender={renderHeaderDecimalCell("TGTTTBSO")}
                    width={125}
                />
                <Column
                    dataField="DVTTE"
                    caption={t("DVTTE", "ĐVT")}
                    width={60}
                    alignment="center"
                />
                <Column
                    name="STATUS_SUMMARY"
                    dataField="STATUS_SUMMARY"
                    caption={t("STATUS_SUMMARY", "Trạng thái")}
                    minWidth={240}
                    allowSearch={true}
                    calculateCellValue={buildInvoiceStatusSearchText}
                    calculateFilterExpression={calculateInvoiceStatusFilterExpression}
                    cellRender={renderInvoiceStatusCell}
                />
            </>
        ),
        [
            buildInvoiceStatusSearchText,
            calculateInvoiceStatusFilterExpression,
            renderBuyerSummaryCell,
            renderHeaderDecimalCell,
            renderInvoiceNoCell,
            renderInvoiceStatusCell,
            t,
        ],
    )

    const openInvoiceImport = useCallback(() => {
        setInvoiceImportVisible(true)
    }, [])

    const closeInvoiceImport = useCallback(() => {
        setInvoiceImportVisible(false)
    }, [])

    return (
        <DxPage>
            <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
                <GridToolbar
                    gridRef={gridRef}
                    onAdd={openCreate}
                    onRefresh={handleRefresh}
                    onRangeSearch={handleRangeSearch}
                    fromDate={fromDate}
                    toDate={toDate}
                    onFromDateChange={setFromDate}
                    onToDateChange={setToDate}
                    showDateRange={true}
                    showAdvancedSearchToggle={true}
                    advancedSearchOpen={advancedSearchOpen}
                    onToggleAdvancedSearch={handleToggleAdvancedSearch}
                    onDelete={handleDelete}
                    deleteDisabled={deleteDisabled}
                    afterAddItems={afterAddItems}
                    customItems={toolbarItems}
                    onImport={openInvoiceImport}
                    showImport={!cashRegister}
                    showExportPdf={false}
                    showExportXlsx={false}
                    shortcutsEnabled={
                        !popupVisible
                        && !certificatePopupVisible
                        && !invoiceImportVisible
                        && !transmissionPopupVisible
                        && !editMailVisible
                        && !mailHistoryVisible
                        && !sendMailVisible
                        && !printOptionsVisible
                    }
                />

                <EInvoiceAdvancedSearchPanel
                    visible={advancedSearchOpen}
                    value={advancedDraft}
                    invoiceStatusOptions={invoiceStatusOptions}
                    tchdonOptions={tchdonOptions}
                    cqtStatusOptions={cqtStatusOptions}
                    signStatusOptions={signStatusOptions}
                    mailStatusOptions={mailStatusOptions}
                    t={t}
                    onChange={setAdvancedDraft}
                    onSearch={handleAdvancedSearchSubmit}
                    onReset={handleAdvancedSearchReset}
                    onCollapse={() => setAdvancedSearchOpen(false)}
                />

                {(hasEInvoiceAdvancedFilters(advancedApplied) || Boolean(listQuery.fromYmd && listQuery.toYmd)) ? (
                    <EInvoiceActiveFilterChips
                        chips={activeFilterChips}
                        t={t}
                        onRemove={handleRemoveFilterChip}
                    />
                ) : null}

                <div className="relative min-h-0 flex-1 overflow-hidden">
                    <EInvoiceTableShell className="h-full">
                        <PageGrid<EInvoice>
                            dataSource={dataSource}
                            keyExpr="INVOICE_ID"
                            screenCd={screenCd}
                            gridId="einvoice-info-grid"
                            copyExcludeFields={EINVOICE_COPY_EXCLUDE_FIELDS}
                            wordWrapEnabled={true}
                            onAdd={openCreate}
                            onContextMenuUpdate={handleContextMenuUpdate}
                            onContextMenuCopy={handleContextMenuCopy}
                            onInitialized={handleGridInitialized}
                            onSelectionChanged={handleSelectionChanged}
                            onRowDblClick={handleRowDblClick}
                            selectMode="multiple"
                            pagingEnabled={true}
                            showPager={true}
                            pageSize={pageSize}
                            defaultPageSize={DEFAULT_PAGE_SIZE}
                            remoteOperations={SERVER_PAGING_REMOTE_OPERATIONS}
                            loadPanelEnabled={false}
                            onOptionChanged={handleOptionChanged}
                        >
                            {gridChildren}
                        </PageGrid>
                    </EInvoiceTableShell>

                    <LoadPanel
                        visible={loading}
                        showIndicator={true}
                        showPane={true}
                        shading={true}
                        shadingColor="rgba(0, 0, 0, 0.15)"
                    />
                </div>

                {transmissionPopupVisible ? (
                    <EInvoiceTransmissionMessagesPopup
                        visible={transmissionPopupVisible}
                        title={transmissionTitle}
                        loading={transmissionLoading}
                        messages={transmissionMessages}
                        t={t}
                        onClose={closeTransmissionPopup}
                        onViewHtml={handleViewTransmissionMessage}
                    />
                ) : null}

                {mailHistoryVisible ? (
                    <EInvoiceMailHistoryPopup
                        visible={mailHistoryVisible}
                        title={mailHistoryTitle}
                        loading={mailHistoryLoading}
                        items={mailHistoryItems}
                        onClose={closeMailHistoryPopup}
                    />
                ) : null}

                {editMailVisible ? (
                    <EInvoiceEditMailPopup
                        visible={editMailVisible}
                        invoice={editMailInvoice}
                        loading={actionLoading}
                        onClose={closeEditMailPopup}
                        onConfirm={handleConfirmEditMail}
                    />
                ) : null}

                {popupVisible ? (
                    <EInvoiceEditorPopup
                        cashRegister={cashRegister}
                        visible={popupVisible}
                        invoiceId={editingInvoiceId}
                        initialInvoice={formInitialInvoice}
                        copyFromInvoiceId={copyFromInvoiceId}
                        readOnly={editorReadOnly}
                        onClose={closePopup}
                        onSaved={handleFormSaved}
                    />
                ) : null}

                <Suspense fallback={null}>
                    {invoiceImportVisible ? (
                        <EInvoiceExcelImportPopup
                            visible={invoiceImportVisible}
                            title={t("IMPORT_MULTI_TITLE", "Import e-invoices")}
                            description={t("IMPORT_MULTI_DESC", "Select the Excel file that contains multiple e-invoices. Each invoice can include one or many item lines.")}
                            onClose={closeInvoiceImport}
                            onImported={() => void refreshList()}
                        />
                    ) : null}

                    {certificateSelectPopup}

                    {printOptionsVisible ? (
                        <EInvoicePrintOptionsPopup
                            visible={printOptionsVisible}
                            invoiceCount={pendingPrintInvoices.length}
                            loading={actionLoading}
                            onClose={closePrintOptionsPopup}
                            onConfirm={handleConfirmPrintOptions}
                        />
                    ) : null}

                    {sendMailVisible ? (
                        <EInvoiceSendMailPopup
                            visible={sendMailVisible}
                            invoices={pendingSendMailInvoices}
                            loading={actionLoading}
                            onClose={closeSendMailPopup}
                            onConfirm={handleConfirmSendMail}
                        />
                    ) : null}

                    {setupPopup}
                </Suspense>
            </div>
        </DxPage>
    )
}
