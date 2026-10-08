import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { Column, Editing } from "devextreme-react/data-grid"
import LoadPanel from "devextreme-react/load-panel"
import TabPanel, { Item as TabPanelItem, type TabPanelTypes } from "devextreme-react/tab-panel"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { InitializedEvent, RowPreparedEvent, RowUpdatingEvent } from "devextreme/ui/data_grid"
import notify from "devextreme/ui/notify"

import {
    saveEInvoiceUserSetting,
    deleteEInvoiceSellerXslTemplates,
} from "@/api/einvoiceSettingApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import PageGrid from "@/components/datagrid/PageGrid"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import { useWorkspaceTabs } from "@/components/workspaceTabs/WorkspaceTabs"
import DxPage from "@/dx/DxPage"
import {
    useEInvoiceSettingDecimalsInvalidate,
    useEInvoiceSettingDecimalsQuery,
    useEInvoiceSettingSellersInvalidate,
    useEInvoiceSettingSellersQuery,
    useEInvoiceUserSettingsInvalidate,
} from "@/hooks/queries/useEInvoiceSettingQueries"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import { LanguageContext } from "@/lib/i18nLoader"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import { loadEInvoiceUserSettings } from "@/lib/einvoiceUserSettingCache"
import type { EInvoiceSeller } from "@/types/einvoice"
import type {
    EInvoiceDecimalApplyTarget,
    EInvoiceDecimalCurrencyScope,
    EInvoiceDecimalFieldScope,
    EInvoiceDecimalRoundMode,
    EInvoiceDecimalSetting,
    EInvoiceSellerSetting,
    EInvoiceTemplateSetting,
    EInvoiceUserSetting,
} from "@/types/einvoiceSetting"
import { formatEInvoiceUserSettingKeyLabel, normalizeEInvoiceUserSettingValueType, normalizeBooleanSettingValue } from "./einvoiceUserSettingModel"
import { useEInvoiceUserSettingValueCellRenderers } from "./components/EInvoiceUserSettingValueCell"
import { createEInvoiceTemplateSettingCellRenderers } from "./components/EInvoiceTemplateSettingCells"
import EInvoiceDecimalDemoPreview from "./components/EInvoiceDecimalDemoPreview"
import EInvoiceDecimalSettingsPanel from "./components/EInvoiceDecimalSettingsPanel"
import "./components/einvoiceSettingPanel.css"
import EInvoiceSellerInfoPanel from "./components/EInvoiceSellerInfoPanel"
import { EInvoiceTableShell } from "./components/EInvoiceTableShell"
import EInvoiceMailSettingPanel from "./components/EInvoiceMailSettingPanel"
import EInvoiceTemplateFormPopup from "./components/EInvoiceTemplateFormPopup"
import { openEInvoiceSellerPreview } from "./einvoiceSellerPreviewViewer"
import { confirm } from "devextreme/ui/dialog"

type GridKey = string | number
type SelectOption<TValue extends string | number> = {
    value: TValue
    text: string
}

function normalizeText(value: unknown): string {
    return typeof value === "string" ? value.trim() : ""
}

function normalizeOptionalText(value: unknown): string | null {
    const text = normalizeText(value)
    return text ? text : null
}

function normalizeFlag(value: unknown, defaultValue = 0): number {
    const numeric = Number(value ?? defaultValue)
    return numeric === 1 ? 1 : 0
}

function normalizeNumber(value: unknown, defaultValue = 0): number {
    const numeric = Number(value ?? defaultValue)
    return Number.isFinite(numeric) ? numeric : defaultValue
}

function normalizePositiveId(value: unknown): number {
    const numeric = Math.trunc(normalizeNumber(value, 0))
    return numeric > 0 ? numeric : 0
}

function normalizeApplyTarget(value: unknown): EInvoiceDecimalApplyTarget {
    const normalized = normalizeText(value).toUpperCase()
    return normalized === "INTERNAL_REPORT" || normalized === "UI" ? normalized : "TAX_XML"
}

function normalizeFieldScope(value: unknown): EInvoiceDecimalFieldScope {
    return normalizeText(value).toUpperCase() === "DETAIL" ? "DETAIL" : "HEADER"
}

function normalizeCurrencyScope(value: unknown): EInvoiceDecimalCurrencyScope {
    const normalized = normalizeText(value).toUpperCase()
    return normalized === "VND" || normalized === "FC" ? normalized : "ANY"
}

function normalizeRoundMode(value: unknown): EInvoiceDecimalRoundMode {
    const normalized = normalizeText(value).toUpperCase()
    if (normalized === "TRUNCATE" || normalized === "CEIL" || normalized === "FLOOR") {
        return normalized
    }
    return "ROUND"
}

function createDefaultSeller(companyCd: string): EInvoiceSellerSetting {
    return {
        ROW_KEY: 0,
        SELLER_ID: 0,
        COMPANY_CD: companyCd,
        SELLER_CD: "",
        SELLER_NM: "",
        SELLER_TAX_CD: "",
        SELLER_ADDRESS: "",
        MDDKDOANH: null,
        TDDKDOANH: null,
        DCDDKDOANH: null,
        THDON: null,
        KHMSHDON: null,
        KHHDON: null,
        FROM_SHDON: "1",
        TO_SHDON: null,
        MCHANG: null,
        TCHANG: null,
        SDTHOAI: null,
        DCTDTU: null,
        STKNHANG: null,
        TNHANG: null,
        FAX: null,
        WEBSITE: null,
        LOGO_PATH: null,
        BACKGROUND_PATH: null,
        INVOICE_BACKGROUND_PATH: null,
        INVOICE_BORDER_PATH: null,
        USE_MULTI_TAX_RATE: 0,
        XSL_TEMPLATE_NM: null,
        HAS_XSL_TEMPLATE: 0,
    }
}

function normalizeSellerRow(row: Partial<EInvoiceSeller>, companyCd: string): EInvoiceSellerSetting {
    const sellerId = normalizePositiveId(row.SELLER_ID)
    return {
        ...createDefaultSeller(companyCd),
        ROW_KEY: sellerId,
        SELLER_ID: sellerId,
        XSL_ID: normalizePositiveId(row.XSL_ID),
        COMPANY_CD: companyCd,
        SELLER_CD: normalizeText(row.SELLER_CD),
        MCCQT: normalizeOptionalText(row.MCCQT),
        SELLER_NM: normalizeText(row.SELLER_NM),
        SELLER_TAX_CD: normalizeText(row.SELLER_TAX_CD),
        SELLER_ADDRESS: normalizeText(row.SELLER_ADDRESS),
        MDDKDOANH: normalizeOptionalText(row.MDDKDOANH),
        TDDKDOANH: normalizeOptionalText(row.TDDKDOANH),
        DCDDKDOANH: normalizeOptionalText(row.DCDDKDOANH),
        THDON: normalizeOptionalText(row.THDON),
        KHMSHDON: normalizeOptionalText(row.KHMSHDON),
        KHHDON: normalizeOptionalText(row.KHHDON),
        FROM_SHDON: normalizeOptionalText(row.FROM_SHDON) ?? "1",
        TO_SHDON: normalizeOptionalText(row.TO_SHDON),
        MCHANG: normalizeOptionalText(row.MCHANG),
        TCHANG: normalizeOptionalText(row.TCHANG),
        SDTHOAI: normalizeOptionalText(row.SDTHOAI),
        DCTDTU: normalizeOptionalText(row.DCTDTU),
        STKNHANG: normalizeOptionalText(row.STKNHANG),
        TNHANG: normalizeOptionalText(row.TNHANG),
        FAX: normalizeOptionalText(row.FAX),
        WEBSITE: normalizeOptionalText(row.WEBSITE),
        LOGO_PATH: normalizeOptionalText(row.LOGO_PATH),
        BACKGROUND_PATH: normalizeOptionalText(row.BACKGROUND_PATH),
        INVOICE_BACKGROUND_PATH: normalizeOptionalText(row.INVOICE_BACKGROUND_PATH),
        INVOICE_BORDER_PATH: normalizeOptionalText(row.INVOICE_BORDER_PATH),
        USE_MULTI_TAX_RATE: normalizeFlag(row.USE_MULTI_TAX_RATE),
        XSL_TEMPLATE_NM: normalizeOptionalText(row.XSL_TEMPLATE_NM),
        HAS_XSL_TEMPLATE: normalizeFlag(row.HAS_XSL_TEMPLATE),
        XSL_IS_DEFAULT: normalizeFlag(row.XSL_IS_DEFAULT),
        XSL_IS_ACTIVE: normalizeFlag(row.XSL_IS_ACTIVE, 1),
    }
}

function normalizeTemplateRow(row: Partial<EInvoiceSeller>, companyCd: string): EInvoiceTemplateSetting {
    const normalized = normalizeSellerRow(row, companyCd)
    const xslId = normalizePositiveId(row.XSL_ID)
    return {
        ...normalized,
        ROW_KEY: xslId > 0 ? xslId : normalized.SELLER_ID,
    }
}

function dedupeSellerRows(rows: EInvoiceSellerSetting[]): EInvoiceSellerSetting[] {
    const bySellerId = new Map<number, EInvoiceSellerSetting>()

    for (const row of rows) {
        const sellerId = normalizePositiveId(row.SELLER_ID)
        if (sellerId <= 0) {
            continue
        }

        const existing = bySellerId.get(sellerId)
        if (!existing || (row.XSL_IS_DEFAULT === 1 && existing.XSL_IS_DEFAULT !== 1)) {
            bySellerId.set(sellerId, { ...row, ROW_KEY: sellerId })
        }
    }

    return [...bySellerId.values()].sort((left, right) => {
        if (left.XSL_IS_ACTIVE !== right.XSL_IS_ACTIVE) {
            return (right.XSL_IS_ACTIVE ?? 0) - (left.XSL_IS_ACTIVE ?? 0)
        }
        if (left.XSL_IS_DEFAULT !== right.XSL_IS_DEFAULT) {
            return (right.XSL_IS_DEFAULT ?? 0) - (left.XSL_IS_DEFAULT ?? 0)
        }
        return normalizeText(left.SELLER_CD).localeCompare(normalizeText(right.SELLER_CD))
    })
}

function formatTemplateOption(row: EInvoiceTemplateSetting): string {
    const sellerName = normalizeText(row.SELLER_NM)
    const formNo = normalizeText(row.KHMSHDON)
    const serial = normalizeText(row.KHHDON)
    const templateName = normalizeText(row.XSL_TEMPLATE_NM)
    const identity = [formNo, serial].filter(Boolean).join(" / ")
    const summary = [identity, sellerName].filter(Boolean).join(" - ")
    return templateName ? `${summary || row.XSL_ID} (${templateName})` : summary || String(row.XSL_ID ?? row.SELLER_ID)
}

function resolveTemplateFormNumber(khmsHDON: string | null | undefined): number | null {
    const match = normalizeText(khmsHDON).match(/^(\d+)/)
    if (!match) {
        return null
    }

    const parsed = Number(match[1])
    return Number.isFinite(parsed) ? parsed : null
}

/** GTGT (1) and sales invoice (2) — focus templates for common-config preview. */
function isFocusDecimalPreviewTemplate(row: EInvoiceTemplateSetting): boolean {
    const formNo = resolveTemplateFormNumber(row.KHMSHDON)
    return formNo === 1 || formNo === 2
}

function pickActiveFocusDecimalPreviewTemplate(
    templates: EInvoiceTemplateSetting[],
): EInvoiceTemplateSetting | null {
    const active = templates.filter(
        (row) =>
            normalizePositiveId(row.XSL_ID) > 0
            && normalizePositiveId(row.SELLER_ID) > 0
            && normalizeFlag(row.XSL_IS_ACTIVE) === 1
            && isFocusDecimalPreviewTemplate(row),
    )

    if (active.length === 0) {
        return null
    }

    const preferredDefault = active.find((row) => normalizeFlag(row.XSL_IS_DEFAULT) === 1)
    if (preferredDefault) {
        return preferredDefault
    }

    const gtgt = active.find((row) => resolveTemplateFormNumber(row.KHMSHDON) === 1)
    if (gtgt) {
        return gtgt
    }

    return active[0]
}

function sortTemplateOptions(left: EInvoiceTemplateSetting, right: EInvoiceTemplateSetting): number {
    if (left.XSL_IS_ACTIVE !== right.XSL_IS_ACTIVE) {
        return (right.XSL_IS_ACTIVE ?? 0) - (left.XSL_IS_ACTIVE ?? 0)
    }
    if (left.XSL_IS_DEFAULT !== right.XSL_IS_DEFAULT) {
        return (right.XSL_IS_DEFAULT ?? 0) - (left.XSL_IS_DEFAULT ?? 0)
    }
    return normalizeText(left.KHMSHDON).localeCompare(normalizeText(right.KHMSHDON))
        || normalizeText(left.KHHDON).localeCompare(normalizeText(right.KHHDON))
        || normalizeText(left.XSL_TEMPLATE_NM).localeCompare(normalizeText(right.XSL_TEMPLATE_NM))
}

function createDefaultDecimalSetting(companyCd: string, xslId = 0): EInvoiceDecimalSetting {
    return {
        SETTING_ID: 0,
        COMPANY_CD: companyCd,
        XSL_ID: normalizePositiveId(xslId),
        APPLY_TARGET: "TAX_XML",
        FIELD_SCOPE: "DETAIL",
        FIELD_NAME: "",
        LABEL_TEXT: null,
        CAPTION: null,
        CURRENCY_SCOPE: "ANY",
        DECIMAL_SCALE: 2,
        ROUND_MODE: "ROUND",
        IS_ACTIVE: 1,
        SORT_ORDER: 0,
        NOTE: "",
    }
}

function normalizeDecimalSettingRow(row: Partial<EInvoiceDecimalSetting>, companyCd: string): EInvoiceDecimalSetting {
    const sourceCompanyCd = typeof row.COMPANY_CD === "string" ? row.COMPANY_CD : companyCd
    return {
        ...createDefaultDecimalSetting(companyCd),
        SETTING_ID: normalizeNumber(row.SETTING_ID, 0),
        COMPANY_CD: sourceCompanyCd,
        XSL_ID: normalizePositiveId(row.XSL_ID),
        APPLY_TARGET: normalizeApplyTarget(row.APPLY_TARGET),
        FIELD_SCOPE: normalizeFieldScope(row.FIELD_SCOPE),
        FIELD_NAME: normalizeText(row.FIELD_NAME).toUpperCase(),
        LABEL_TEXT: normalizeText(row.LABEL_TEXT) || null,
        CAPTION: normalizeText(row.CAPTION) || null,
        CURRENCY_SCOPE: normalizeCurrencyScope(row.CURRENCY_SCOPE),
        DECIMAL_SCALE: Math.max(0, Math.min(12, Math.trunc(normalizeNumber(row.DECIMAL_SCALE, 2)))),
        ROUND_MODE: normalizeRoundMode(row.ROUND_MODE),
        IS_ACTIVE: normalizeFlag(row.IS_ACTIVE, 1),
        SORT_ORDER: Math.trunc(normalizeNumber(row.SORT_ORDER, 0)),
        NOTE: normalizeText(row.NOTE),
    }
}

function createDefaultUserSetting(companyCd: string): EInvoiceUserSetting {
    return {
        SETTING_ID: 0,
        COMPANY_CD: companyCd,
        USER_ID: "",
        SETTING_KEY: "",
        SETTING_VALUE: null,
        VALUE_TYPE: "STRING",
        ISDEL: 0,
    }
}

function normalizeUserSettingRow(row: Partial<EInvoiceUserSetting>, companyCd: string): EInvoiceUserSetting {
    const normalized = {
        ...createDefaultUserSetting(companyCd),
        SETTING_ID: normalizeNumber(row.SETTING_ID, 0),
        COMPANY_CD: normalizeText(row.COMPANY_CD),
        USER_ID: normalizeText(row.USER_ID),
        SETTING_KEY: normalizeText(row.SETTING_KEY),
        SETTING_VALUE: normalizeOptionalText(row.SETTING_VALUE),
        VALUE_TYPE: normalizeEInvoiceUserSettingValueType(row.VALUE_TYPE),
        ISDEL: normalizeFlag(row.ISDEL),
    }

    if (normalized.VALUE_TYPE === "BOOLEAN") {
        normalized.SETTING_VALUE = normalizeBooleanSettingValue(normalized.SETTING_VALUE)
    }

    return normalized
}

function findCompanyUserSettingOverride(
    rows: EInvoiceUserSetting[],
    companyCd: string,
    userId: string,
    settingKey: string,
): EInvoiceUserSetting | undefined {
    return rows.find(
        (item) =>
            normalizeText(item.COMPANY_CD) === companyCd &&
            normalizeText(item.USER_ID) === userId &&
            normalizeText(item.SETTING_KEY) === settingKey &&
            normalizePositiveId(item.SETTING_ID) > 0,
    )
}

function toCompanyUserSettingPayload(
    row: EInvoiceUserSetting,
    companyCd: string,
    existingRows: EInvoiceUserSetting[] = [],
): EInvoiceUserSetting {
    const userId = normalizeText(row.USER_ID)
    const settingKey = normalizeText(row.SETTING_KEY)
    const companyOverride = findCompanyUserSettingOverride(existingRows, companyCd, userId, settingKey)
    const resolvedSettingId = normalizePositiveId(row.SETTING_ID) || normalizePositiveId(companyOverride?.SETTING_ID)

    if (normalizeText(row.COMPANY_CD) === companyCd) {
        return {
            ...row,
            SETTING_ID: resolvedSettingId,
            COMPANY_CD: companyCd,
        }
    }

    return {
        ...row,
        SETTING_ID: resolvedSettingId,
        COMPANY_CD: companyCd,
    }
}

function mergeRow<T>(oldData: T | undefined, newData: Partial<T> | undefined, fallback: T): T {
    return {
        ...fallback,
        ...(oldData ?? {}),
        ...(newData ?? {}),
    }
}

export default function EInvoiceSettingPage() {
    const location = useLocation()
    const { openWorkspacePath } = useWorkspaceTabs()
    const companyCd = getCurrentCompanyCd()
    const templateGridRef = useRef<dxDataGrid<EInvoiceTemplateSetting, GridKey> | null>(null)
    const userGridRef = useRef<dxDataGrid<EInvoiceUserSetting, GridKey> | null>(null)
    const [sellerRows, setSellerRows] = useState<EInvoiceSellerSetting[]>([])
    const [templateRows, setTemplateRows] = useState<EInvoiceTemplateSetting[]>([])
    const [decimalRows, setDecimalRows] = useState<EInvoiceDecimalSetting[]>([])
    const [userRows, setUserRows] = useState<EInvoiceUserSetting[]>([])
    const [userSettingsLoading, setUserSettingsLoading] = useState(false)
    const [activeTabIndex, setActiveTabIndex] = useState(0)
    const [selectedDecimalTemplateId, setSelectedDecimalTemplateId] = useState(0)
    const [decimalCurrencyScope, setDecimalCurrencyScope] = useState<"VND" | "FC">("VND")
    const [sellerPreviewLoading, setSellerPreviewLoading] = useState(false)
    const [mailSettingsLoading, setMailSettingsLoading] = useState(false)
    const [templateForm, setTemplateForm] = useState<{ mode: "create" | "edit"; template?: EInvoiceTemplateSetting | null } | null>(null)

    const {
        data: sellerData,
        isLoading: sellersLoading,
        isFetching: sellersFetching,
        isError: sellersError,
        error: sellersLoadError,
    } = useEInvoiceSettingSellersQuery()
    const {
        data: decimalData,
        isLoading: decimalsLoading,
        isFetching: decimalsFetching,
        isError: decimalsError,
        error: decimalsLoadError,
        refetch: refetchDecimals,
    } = useEInvoiceSettingDecimalsQuery(selectedDecimalTemplateId, true, {
        includeInactive: true,
    })
    const invalidateDecimals = useEInvoiceSettingDecimalsInvalidate()
    const invalidateSellers = useEInvoiceSettingSellersInvalidate()
    const invalidateUserSettings = useEInvoiceUserSettingsInvalidate()
    const loading = sellersLoading || sellersFetching || decimalsLoading || decimalsFetching || userSettingsLoading || sellerPreviewLoading || mailSettingsLoading

    const { translate } = useContext(LanguageContext) as {
        translate?: (key: string, fallback?: string) => string
    }

    const t = useCallback(
        (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
        [translate],
    )

    const { renderValueCell, renderValueEditor } = useEInvoiceUserSettingValueCellRenderers(t)

    const handleViewSellerPreview = useCallback(
        (seller: EInvoiceSellerSetting) => {
            const sellerId = Number(seller.SELLER_ID ?? 0)
            const xslId = Number(seller.XSL_ID ?? 0)
            if (sellerId <= 0) {
                return
            }

            setSellerPreviewLoading(true)
            void openEInvoiceSellerPreview({
                sellerId,
                xslId: Number.isFinite(xslId) && xslId > 0 ? xslId : undefined,
                notifyUnableToOpen: (message) => notify(message, "error", 4000),
                notifyInfo: (message) => notify(message, "info", 8000),
                notifySuccess: (message) => notify(message, "success", 4000),
            }).finally(() => {
                setSellerPreviewLoading(false)
            })
        },
        [t],
    )

    useMasterListLoadError(sellersError, sellersLoadError, t, "EInvoiceSettingPage.sellers")
    useMasterListLoadError(decimalsError, decimalsLoadError, t, "EInvoiceSettingPage.decimals")
    const reloadSellers = useCallback(async () => {
        // Single refresh path: clear session/memory cache then force active query refetch.
        await invalidateSellers()
        templateGridRef.current?.clearSelection?.()
    }, [invalidateSellers])
    const reloadDecimals = useCallback(async () => {
        await invalidateDecimals()
        await refetchDecimals()
    }, [invalidateDecimals, refetchDecimals])

    const getSelectedTemplates = useCallback((): EInvoiceTemplateSetting[] => {
        const selectedKeys = new Set((templateGridRef.current?.getSelectedRowKeys() ?? []) as GridKey[])
        return templateRows.filter((row) => selectedKeys.has(row.ROW_KEY))
    }, [templateRows])

    const handleToolbarViewPreview = useCallback(() => {
        const selectedTemplates = getSelectedTemplates()
        if (selectedTemplates.length === 0) {
            notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
            return
        }

        if (selectedTemplates.length > 1) {
            notify(t("PREVIEW_SINGLE", "Select exactly one record to preview"), "warning", 3500)
            return
        }

        handleViewSellerPreview(selectedTemplates[0])
    }, [getSelectedTemplates, handleViewSellerPreview, t])

    const handleOpenDesigner = useCallback(() => {
        const selectedTemplates = getSelectedTemplates()
        if (selectedTemplates.length !== 1) {
            notify(t("PREVIEW_SINGLE", "Hãy chọn đúng một mẫu hóa đơn để thiết kế"), "warning", 3500)
            return
        }
        const xslId = normalizePositiveId(selectedTemplates[0].XSL_ID)
        if (xslId <= 0) {
            notify(t("SELLER_XSL_MISSING", "Chưa chọn mẫu hóa đơn"), "warning", 3500)
            return
        }
        const sellerId = normalizePositiveId(selectedTemplates[0].SELLER_ID)
        const query = new URLSearchParams()
        query.set("xslId", String(xslId))
        if (sellerId > 0) query.set("sellerId", String(sellerId))
        openWorkspacePath(
            buildAppPath(companyCd, `/einvoice/setting/designer?${query.toString()}`),
            { title: t("EINVOICE_TEMPLATE_DESIGNER", "Thiết kế mẫu hóa đơn") },
        )
    }, [companyCd, getSelectedTemplates, openWorkspacePath, t])

    const handleAddTemplate = useCallback(() => {
        if (sellerRows.length === 0) {
            notify(t("SELLER_REQUIRED_FIRST", "Cần có thông tin người bán trước khi thêm mẫu số ký hiệu"), "warning", 4000)
            return
        }
        setTemplateForm({ mode: "create", template: null })
    }, [sellerRows.length, t])

    const handleEditTemplate = useCallback(() => {
        const selectedTemplates = getSelectedTemplates()
        if (selectedTemplates.length !== 1) {
            notify(t("PREVIEW_SINGLE", "Hãy chọn đúng một mẫu hóa đơn để sửa"), "warning", 3500)
            return
        }
        const selected = selectedTemplates[0]
        if (normalizeFlag(selected.XSL_IS_ACTIVE) === 1) {
            notify(t("TEMPLATE_EDIT_PUBLISHED_BLOCKED", "Không sửa được mẫu đã phát hành"), "warning", 4000)
            return
        }
        setTemplateForm({ mode: "edit", template: selected })
    }, [getSelectedTemplates, t])

    const handleDeleteTemplates = useCallback(async () => {
        const selectedTemplates = getSelectedTemplates()
        if (selectedTemplates.length === 0) {
            notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
            return
        }

        const published = selectedTemplates.filter((row) => normalizeFlag(row.XSL_IS_ACTIVE) === 1)
        if (published.length > 0) {
            notify(
                t("TEMPLATE_DELETE_PUBLISHED_BLOCKED", "Chỉ xoá được mẫu chưa phát hành. Hãy bỏ chọn mẫu đã phát hành."),
                "warning",
                4500,
            )
            return
        }

        const xslIds = selectedTemplates
            .map((row) => normalizePositiveId(row.XSL_ID))
            .filter((id) => id > 0)
        if (xslIds.length === 0) {
            notify(t("SELLER_XSL_MISSING", "Chưa chọn mẫu hóa đơn"), "warning", 3500)
            return
        }

        const confirmed = await confirm(
            t("MSG_CONFIRM_DELETE_ROWS", "Bạn có chắc muốn xoá các mẫu đã chọn?"),
            t("MSG_BTNOK", "Xác nhận"),
        )
        if (!confirmed) return

        try {
            await deleteEInvoiceSellerXslTemplates(xslIds)
            notify(t("MSG_DELETE_SUCCESS", "Đã xoá mẫu số ký hiệu"), "success", 2500)
            await reloadSellers()
        } catch (error) {
            notify(getApiErrorMessage(error, t("DELETE_FAILED", "Không xoá được mẫu số ký hiệu")), "error", 4500)
        }
    }, [getSelectedTemplates, reloadSellers, t])

    const templateToolbarItems = useMemo(
        () => [
            {
                key: "edit-template",
                icon: "edit",
                text: t("EDIT", "Sửa"),
                hint: t("EDIT_INVOICE_TEMPLATE", "Sửa mẫu số ký hiệu (chưa phát hành)"),
                stylingMode: "outlined" as const,
                disabled: loading,
                onClick: handleEditTemplate,
            },
            {
                key: "view-preview",
                icon: "print",
                text: t("VIEW", "Xem"),
                hint: t("SELLER_PREVIEW_HINT", "Xem trước mẫu hóa đơn"),
                stylingMode: "outlined" as const,
                disabled: loading,
                onClick: handleToolbarViewPreview,
            },
            {
                key: "designer",
                icon: "preferences",
                text: t("DESIGN", "Thiết kế"),
                hint: t("INVOICE_TEMPLATE_DESIGNER", "Thiết kế mẫu hóa đơn"),
                stylingMode: "outlined" as const,
                disabled: loading,
                onClick: handleOpenDesigner,
            },
        ],
        [handleEditTemplate, handleOpenDesigner, handleToolbarViewPreview, loading, t],
    )

    const {
        renderTemplateMultiTaxRateCell,
        renderTemplateIsDefaultCell,
        renderTemplateStatusCell,
    } = useMemo(() => createEInvoiceTemplateSettingCellRenderers(t), [t])

    const renderUserSettingKeyCell = useCallback(
        (cellInfo: { data?: EInvoiceUserSetting }) => formatEInvoiceUserSettingKeyLabel(t, cellInfo.data?.SETTING_KEY ?? ""),
        [t],
    )

    const decimalTemplateOptions = useMemo<SelectOption<number>[]>(
        () => [
            {
                value: 0,
                text: t("DECIMAL_COMMON_CONFIG", "Cấu hình chung"),
            },
            ...[...templateRows]
                .filter((row) => normalizePositiveId(row.XSL_ID) > 0)
                .sort(sortTemplateOptions)
                .map((row) => ({
                    value: normalizePositiveId(row.XSL_ID),
                    text: formatTemplateOption(row),
                })),
        ],
        [t, templateRows],
    )

    const selectedDecimalTemplate = useMemo(
        () =>
            selectedDecimalTemplateId > 0
                ? templateRows.find((row) => normalizePositiveId(row.XSL_ID) === selectedDecimalTemplateId) ?? null
                : null,
        [selectedDecimalTemplateId, templateRows],
    )

    const activeFocusPreviewTemplate = useMemo(
        () => pickActiveFocusDecimalPreviewTemplate(templateRows),
        [templateRows],
    )

    const decimalPreviewTemplate = useMemo(() => {
        if (selectedDecimalTemplateId > 0) {
            return selectedDecimalTemplate
        }

        return activeFocusPreviewTemplate
    }, [activeFocusPreviewTemplate, selectedDecimalTemplate, selectedDecimalTemplateId])

    const missingActiveDecimalPreviewTemplate = useMemo(
        () => selectedDecimalTemplateId <= 0 && activeFocusPreviewTemplate === null,
        [activeFocusPreviewTemplate, selectedDecimalTemplateId],
    )

    const screenCd = useMemo(() => location.pathname, [location.pathname])

    useEffect(() => {
        if (!sellerData) {
            return
        }

        const normalizedRows = sellerData.map((row) => normalizeSellerRow(row, companyCd))
        setTemplateRows(sellerData.map((row) => normalizeTemplateRow(row, companyCd)))
        setSellerRows(dedupeSellerRows(normalizedRows))
    }, [companyCd, sellerData])

    const loadUserSettings = useCallback(async (forceRefresh = false) => {
        setUserSettingsLoading(true)
        try {
            const rows = await loadEInvoiceUserSettings({}, forceRefresh)
            setUserRows(rows.map((row) => normalizeUserSettingRow(row, companyCd)))
        } catch (error) {
            notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
        } finally {
            setUserSettingsLoading(false)
        }
    }, [companyCd, t])

    useEffect(() => {
        void loadUserSettings()
    }, [loadUserSettings])

    useEffect(() => {
        if (selectedDecimalTemplateId <= 0) {
            return
        }

        const exists = templateRows.some((row) => normalizePositiveId(row.XSL_ID) === selectedDecimalTemplateId)
        if (!exists) {
            setSelectedDecimalTemplateId(0)
        }
    }, [selectedDecimalTemplateId, templateRows])

    useEffect(() => {
        if (!decimalData) {
            return
        }

        setDecimalRows(decimalData.map((row) => normalizeDecimalSettingRow(row, companyCd)))
    }, [companyCd, decimalData])

    const handleUserUpdating = useCallback(
        (event: RowUpdatingEvent<EInvoiceUserSetting, GridKey>) => {
            event.promise = (async () => {
                const row = normalizeUserSettingRow(
                    mergeRow<EInvoiceUserSetting>(event.oldData, event.newData as Partial<EInvoiceUserSetting>, createDefaultUserSetting(companyCd)),
                    companyCd,
                )
                await saveEInvoiceUserSetting(toCompanyUserSettingPayload(row, companyCd, userRows))
                notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 2500)
                await invalidateUserSettings()
                await loadUserSettings(true)
            })()
        },
        [companyCd, invalidateUserSettings, loadUserSettings, t, userRows],
    )

    const handleTemplateGridInitialized = useCallback((event: InitializedEvent<EInvoiceTemplateSetting, GridKey>) => {
        templateGridRef.current = event.component ?? null
    }, [])

    const handleTemplateRowPrepared = useCallback((event: RowPreparedEvent<EInvoiceTemplateSetting>) => {
        if (event.rowType !== "data" || !event.rowElement || !event.data) {
            return
        }

        event.rowElement.classList.toggle(
            "einvoice-table__row--published",
            normalizeFlag(event.data.XSL_IS_ACTIVE) === 1,
        )
    }, [])

    const handleUserGridInitialized = useCallback((event: InitializedEvent<EInvoiceUserSetting, GridKey>) => {
        userGridRef.current = event.component ?? null
    }, [])

    const handleTabSelectionChanged = useCallback((event: TabPanelTypes.SelectionChangedEvent) => {
        const itemIndex = event.component.option("selectedIndex")
        setActiveTabIndex(typeof itemIndex === "number" ? itemIndex : 0)
    }, [])

    return (
        <DxPage>
            <div className="flex h-full min-h-0 flex-col bg-slate-50">
                <TabPanel
                    animationEnabled
                    deferRendering={false}
                    height="100%"
                    selectedIndex={activeTabIndex}
                    swipeEnabled={false}
                    onSelectionChanged={handleTabSelectionChanged}
                >
                    <TabPanelItem title={t("SELLER_SETTING", "Thông tin người bán")}>
                        <EInvoiceSellerInfoPanel
                            sellers={sellerRows}
                            loading={sellersLoading || sellersFetching}
                            onRefresh={reloadSellers}
                        />
                    </TabPanelItem>
                    <TabPanelItem title={t("INVOICE_TEMPLATE_SETTING", "Mẫu hóa đơn")}>
                        <div className="flex h-full min-h-0 flex-col gap-3 p-3">
                            <GridToolbar
                                gridRef={templateGridRef}
                                onRefresh={reloadSellers}
                                onAdd={handleAddTemplate}
                                onDelete={() => void handleDeleteTemplates()}
                                customItems={templateToolbarItems}
                                showAdd
                                showDelete
                                showImport={false}
                                showExportPdf={false}
                                showExportXlsx={false}
                                shortcutsEnabled={false}
                            />
                            <div className="min-h-0 flex-1 overflow-hidden">
                                <EInvoiceTableShell className="h-full">
                                <PageGrid<EInvoiceTemplateSetting>
                                    dataSource={templateRows}
                                    keyExpr="ROW_KEY"
                                    gridId="einvoice-setting-template-grid"
                                    screenCd={screenCd}
                                    wordWrapEnabled={false}
                                    selectMode="multiple"
                                    onInitialized={handleTemplateGridInitialized}
                                    onRowPrepared={handleTemplateRowPrepared}
                                    pageSize={50}
                                >
                                    <Column
                                        dataField="KHMSHDON"
                                        caption={t("KHMSHDON", "Mẫu số HĐ")}
                                        width={120}
                                        allowEditing={false}
                                    />
                                    <Column
                                        dataField="KHHDON"
                                        caption={t("KHHDON", "Ký hiệu HĐ")}
                                        width={110}
                                        allowEditing={false}
                                    />
                                    <Column
                                        dataField="MCCQT" caption={t("MCCQT_MTT_103", "MCCQT (MTT từ thông báo 103)")} width={240} allowEditing={false} />
                                    <Column dataField="FROM_SHDON"
                                        caption={t("FROM_SHDON", "Từ số")}
                                        width={100}
                                        allowEditing={false}
                                    />
                                    <Column
                                        dataField="TO_SHDON"
                                        caption={t("TO_SHDON", "Đến số")}
                                        width={100}
                                        allowEditing={false}
                                    />
                                    <Column
                                        dataField="USE_MULTI_TAX_RATE"
                                        caption={t("USE_MULTI_TAX_RATE", "Đa thuế suất")}
                                        width={120}
                                        alignment="center"
                                        allowEditing={false}
                                        allowSorting
                                        cellRender={renderTemplateMultiTaxRateCell}
                                    />
                                    <Column
                                        dataField="XSL_IS_DEFAULT"
                                        caption={t("IS_DEFAULT", "Mặc định")}
                                        width={110}
                                        alignment="center"
                                        allowEditing={false}
                                        allowSorting
                                        cellRender={renderTemplateIsDefaultCell}
                                    />
                                    <Column
                                        dataField="XSL_IS_ACTIVE"
                                        caption={t("STATUS", "Trạng thái")}
                                        width={110}
                                        alignment="center"
                                        allowEditing={false}
                                        allowSorting
                                        cellRender={renderTemplateStatusCell}
                                    />
                                </PageGrid>
                                </EInvoiceTableShell>
                            </div>
                        </div>
                    </TabPanelItem>
                    <TabPanelItem title={t("DECIMAL_SETTING", "Cấu hình số thập phân")}>
                        <div className="flex h-full min-h-0 flex-col p-3">
                            <div className="einvoice-decimal-workspace">
                                <div className="einvoice-decimal-workspace__settings">
                                    <EInvoiceDecimalSettingsPanel
                                        templateOptions={decimalTemplateOptions}
                                        selectedTemplateId={selectedDecimalTemplateId}
                                        onSelectedTemplateIdChange={setSelectedDecimalTemplateId}
                                        currencyScope={decimalCurrencyScope}
                                        onCurrencyScopeChange={setDecimalCurrencyScope}
                                        rows={decimalRows}
                                        onRowsChange={setDecimalRows}
                                        companyCd={companyCd}
                                        onSaved={reloadDecimals}
                                        t={t}
                                    />
                                </div>
                                <div className="einvoice-decimal-workspace__preview">
                                    <EInvoiceDecimalDemoPreview
                                        template={decimalPreviewTemplate}
                                        missingActiveTemplate={missingActiveDecimalPreviewTemplate}
                                        currencyScope={decimalCurrencyScope}
                                        decimalSettings={decimalRows}
                                        t={t}
                                    />
                                </div>
                            </div>
                        </div>
                    </TabPanelItem>
                    <TabPanelItem title={t("USER_SETTING", "User settings")}>
                        <div className="flex h-full min-h-0 flex-col gap-3 p-3">
                            <GridToolbar
                                gridRef={userGridRef}
                                onRefresh={loadUserSettings}
                                showAdd={false}
                                showDelete={false}
                                showImport={false}
                                showExportPdf={false}
                                showExportXlsx={false}
                            />
                            <div className="min-h-0 flex-1 overflow-hidden">
                                <EInvoiceTableShell className="h-full">
                                <PageGrid<EInvoiceUserSetting>
                                    dataSource={userRows}
                                    keyExpr="SETTING_ID"
                                    gridId="einvoice-setting-user-grid"
                                    screenCd={screenCd}
                                    actionButtons
                                    actionButtonsPosition="start"
                                    onInitialized={handleUserGridInitialized}
                                    onRowUpdating={handleUserUpdating}
                                    pageSize={50}
                                >
                                    <Editing mode="row" allowUpdating useIcons />
                                    <Column dataField="USER_ID" caption={t("USER_ID", "User")} width={150} allowEditing={false} />
                                    <Column
                                        dataField="SETTING_KEY"
                                        caption={t("SETTING_KEY", "Setting")}
                                        width={280}
                                        allowEditing={false}
                                        cellRender={renderUserSettingKeyCell}
                                    />
                                    <Column
                                        dataField="SETTING_VALUE"
                                        caption={t("SETTING_VALUE", "Setting value")}
                                        minWidth={280}
                                        alignment="center"
                                        cellRender={renderValueCell}
                                        editCellRender={renderValueEditor}
                                    />
                                </PageGrid>
                                </EInvoiceTableShell>
                            </div>
                        </div>
                    </TabPanelItem>
                    <TabPanelItem title={t("MAIL_SETTING", "Cấu hình mail")}>
                        <EInvoiceMailSettingPanel onLoadingChange={setMailSettingsLoading} />
                    </TabPanelItem>
                </TabPanel>
                <LoadPanel shading shadingColor="rgba(15, 23, 42, 0.18)" showIndicator showPane visible={loading} />
                {templateForm && (
                    <EInvoiceTemplateFormPopup
                        visible
                        mode={templateForm.mode}
                        existingTemplates={templateRows}
                        template={templateForm.template}
                        t={t}
                        onClose={() => setTemplateForm(null)}
                        onSaved={async () => {
                            await reloadSellers()
                        }}
                    />
                )}
            </div>
        </DxPage>
    )
}
