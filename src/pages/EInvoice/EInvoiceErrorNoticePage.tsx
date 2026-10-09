import { Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import Button from "devextreme-react/button"
import DataGrid, { Column, Editing, FilterRow, Paging, Scrolling, Selection } from "devextreme-react/data-grid"
import DateBox from "devextreme-react/date-box"
import LoadPanel from "devextreme-react/load-panel"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { ColumnCellTemplateData, InitializedEvent, RowDblClickEvent, RowRemovingEvent, RowUpdatingEvent, SelectionChangedEvent } from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"

import {
  createEInvoiceErrorNotice,
  deleteEInvoiceErrorNotices,
  getEInvoiceErrorNotice,
  getEInvoiceErrorNoticeSigningPayload,
  getEInvoiceErrorNoticeTransmissionMessages,
  saveEInvoiceErrorNoticeSignature,
  sendEInvoiceErrorNoticeMail,
  updateEInvoiceErrorNotice,
} from "@/api/einvoiceErrorNoticeApi"
import { signXmlWithPlugin } from "@/api/einvoiceSigningPluginApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { getCompanyInfo } from "@/api/companyInfoApi"
import PageGrid from "@/components/datagrid/PageGrid"
import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import { useWorkspaceTabs } from "@/components/workspaceTabs/WorkspaceTabs"
import DxPage from "@/dx/DxPage"
import {
  useEInvoiceErrorNoticeListInvalidate,
  useEInvoiceErrorNoticeListQuery,
} from "@/hooks/queries/useEInvoiceListQuery"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import useShortcutHelp from "@/hooks/useShortcutHelp"
import { LanguageContext } from "@/lib/i18nLoader"
import { createCurrentMonthDateRange } from "@/lib/dateRangeDefaults"
import { EInvoiceTableShell } from "./components/EInvoiceTableShell"
import { EInvoiceErrorNoticeStatusCell } from "./components/EInvoiceErrorNoticeStatusCell"
import {
  EInvoicePartyCell,
} from "./components/einvoiceTableUi"
import { createPopupShortcutWrapperAttr, isPopupShortcutScopeTopMost, usePopupShortcutScopeId } from "@/lib/popupShortcutScope"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import { createShortcutBindings } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import { useSysCodes } from "@/lib/sysCodeContext"
import { formatDateToYmd } from "@/pages/Accounting/accountingDateUtils"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { EInvoice } from "@/types/einvoice"
import type { EInvoiceErrorNotice, EInvoiceErrorNoticeDetail } from "@/types/einvoiceErrorNotice"
import type { EInvoiceTransmissionMessage } from "@/types/einvoiceTransmission"
import EInvoiceInvoiceSelectPopup from "./components/EInvoiceInvoiceSelectPopup"
import EInvoiceErrorNoticeSendMailPopup, {
  type EInvoiceErrorNoticeSendMailRequest,
} from "./components/EInvoiceErrorNoticeSendMailPopup"
import EInvoiceTransmissionMessagesPopup from "./components/EInvoiceTransmissionMessagesPopup"
import EInvoiceEditorShell, { EInvoiceEditorSection } from "./components/EInvoiceEditorShell"
import {
  buildErrorNoticeSignStatusOptions,
  buildEInvoiceMailStatusOptions,
  buildTbaoLoaiOptions,
  buildEinvoiceKindOptions,
  createErrorNoticeCopy,
  createErrorNoticeDetailFromInvoice,
  createDefaultErrorNotice,
  createDefaultErrorNoticeWithCompanyInfo,
  createDefaultErrorNoticeDetail,
  EINV_LADHDDT_CODE_TYPE,
  EINV_MAIL_STATUS_CODE_TYPE,
  EINV_SIGN_STATUS_CODE_TYPE,
  EINV_TBAO_LOAI_CODE_TYPE,
  formatDateForApi,
  formatErrorNoticeHeaderSummaryText,
  formatErrorNoticeStatusSummary,
  formatErrorNoticeTaxOfficeSummaryText,
  formatErrorNoticeTaxpayerSummaryText,
  getActiveErrorNoticeDetails,
  isErrorNoticeReadyToSendMail,
  isErrorNoticeSigned,
  mapErrorNoticeToApiPayload,
  normalizeErrorNotice,
  normalizeErrorNoticeDetailPatch,
  normalizeErrorNoticeRows,
  parseErrorNoticeDate,
  renumberErrorNoticeDetails,
} from "./einvoiceErrorNoticeModel"
import { fieldRequiredMessage } from "./einvoiceI18n"
import { useEInvoiceCertificateSigning } from "./hooks/useEInvoiceCertificateSigning"
import { useEInvoiceSigningPluginSetupPrompt } from "./hooks/useEInvoiceSigningPluginSetupPrompt"
import { openEInvoiceErrorNoticePreview } from "./einvoiceErrorNoticePreviewViewer"
import { openEInvoiceErrorNoticeXmlPreviewWithNotify } from "./einvoiceDocumentXmlViewer"
import { openEInvoiceTransmissionHtmlPreview } from "./einvoiceTransmissionPreviewViewer"
import { createEInvoiceSignSendCqtToolbarItem } from "./einvoiceSignToolbar"
import { createEInvoiceSendMailToolbarItem } from "./einvoiceSendMailToolbar"

type GridKey = string | number
type ErrorNoticeGridCellInfo = ColumnCellTemplateData<EInvoiceErrorNotice, GridKey>
type ErrorNoticeDetailCellInfo = ColumnCellTemplateData<EInvoiceErrorNoticeDetail, GridKey>

type SelectOption<TValue extends string | number> = {
  value: TValue
  text: string
}

interface PendingSignNotice {
  tbaoId: number
  rawXml: string
}

interface ErrorNoticeEditorPopupProps {
  visible: boolean
  noticeId: number
  initialNotice?: EInvoiceErrorNotice | null
  readOnly?: boolean
  noticeTypeOptions: SelectOption<number>[]
  onClose: () => void
  onSaved: (notice: EInvoiceErrorNotice) => void | Promise<void>
}

const COPY_EXCLUDE_FIELDS = ["TBAO_ID", "COMPANY_CD", "DETAILS", "XML"]

function formatText(template: string, values: Array<string | number>): string {
  return values.reduce((text, value, index) => text.replace(`{${index}}`, String(value)), template)
}

function dateValueToText(value: unknown): string {
  if (value instanceof Date) {
    return formatDateForApi(value) ?? ""
  }

  if (typeof value === "string") {
    return value.slice(0, 10)
  }

  return ""
}

function trimLinkText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function createInvoiceIdentity(values: { MCCQT?: string | null; KHMSHDON?: string | null; KHHDON?: string | null; SHDON?: string | null; NLAP?: string | null; NGAY?: string | null }): string {
  const mccqt = trimLinkText(values.MCCQT)
  if (mccqt) {
    return `MCCQT:${mccqt.toUpperCase()}`
  }

  return [
    trimLinkText(values.KHMSHDON),
    trimLinkText(values.KHHDON),
    trimLinkText(values.SHDON),
    trimLinkText(values.NLAP ?? values.NGAY).slice(0, 10),
  ].join("|").toUpperCase()
}

function isBlankErrorNoticeDetail(detail: EInvoiceErrorNoticeDetail): boolean {
  return [detail.MCCQT, detail.KHMSHDON, detail.KHHDON, detail.SHDON, detail.LDO].every((value) => trimLinkText(value).length === 0)
}

function canOpenLinkedInvoice(detail: EInvoiceErrorNoticeDetail): boolean {
  return Number(detail.SOURCE_INVOICE_ID ?? 0) > 0 || createInvoiceIdentity(detail).replace(/\|/g, "").length > 0
}

function ErrorNoticeEditorPopup({ visible, noticeId, initialNotice = null, readOnly = false, noticeTypeOptions, onClose, onSaved }: ErrorNoticeEditorPopupProps) {
  const detailGridRef = useRef<dxDataGrid<EInvoiceErrorNoticeDetail, GridKey> | null>(null)
  const { openWorkspacePath } = useWorkspaceTabs()
  const companyCd = getCurrentCompanyCd()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<EInvoiceErrorNotice>(() => createDefaultErrorNotice(companyCd))
  const [invoicePickerVisible, setInvoicePickerVisible] = useState(false)

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const { getCodesByType } = useSysCodes()

  const invoiceTypeOptions = useMemo(
    () => buildEinvoiceKindOptions(getCodesByType(EINV_LADHDDT_CODE_TYPE), t),
    [getCodesByType, t],
  )

  useEffect(() => {
    if (!visible) {
      return
    }

    let cancelled = false
    const loadNotice = async () => {
      setLoading(true)
      try {
        if (noticeId > 0) {
          const response = await getEInvoiceErrorNotice(noticeId)
          if (!cancelled) {
            setFormData(normalizeErrorNotice(response.data, companyCd))
          }
          return
        }

        if (initialNotice) {
          if (!cancelled) {
            setFormData(initialNotice)
          }
          return
        }

        try {
          const response = await getCompanyInfo(companyCd)
          if (!cancelled) {
            setFormData(createDefaultErrorNoticeWithCompanyInfo(companyCd, response.data))
          }
        } catch {
          if (!cancelled) {
            setFormData(createDefaultErrorNoticeWithCompanyInfo(companyCd, null))
          }
        }
      } catch (error) {
        notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadNotice()

    return () => {
      cancelled = true
    }
  }, [companyCd, initialNotice, noticeId, t, visible])

  const activeDetails = useMemo(() => getActiveErrorNoticeDetails(formData.DETAILS), [formData.DETAILS])

  const updateForm = useCallback((changes: Partial<EInvoiceErrorNotice>) => {
    setFormData((previous) => ({ ...previous, ...changes }))
  }, [])

  const addDetail = useCallback(() => {
    if (readOnly) {
      return
    }

    setInvoicePickerVisible(true)
  }, [readOnly])

  const handleSelectInvoices = useCallback((invoices: EInvoice[]) => {
    if (invoices.length === 0) {
      return
    }

    let skippedCount = 0
    setFormData((previous) => {
      const baseDetails = previous.DETAILS.filter((detail) => detail.ISDEL === 1 || !isBlankErrorNoticeDetail(detail))
      const existingIdentities = new Set(getActiveErrorNoticeDetails(baseDetails).map(createInvoiceIdentity).filter((value) => value.replace(/\|/g, "").length > 0))
      const newDetails: EInvoiceErrorNoticeDetail[] = []

      invoices.forEach((invoice) => {
        const identity = createInvoiceIdentity({
          MCCQT: invoice.MCCQT,
          KHMSHDON: invoice.KHMSHDON,
          KHHDON: invoice.KHHDON,
          SHDON: invoice.SHDON,
          NLAP: invoice.NLAP,
        })

        if (identity.replace(/\|/g, "").length > 0 && existingIdentities.has(identity)) {
          skippedCount += 1
          return
        }

        existingIdentities.add(identity)
        newDetails.push(createErrorNoticeDetailFromInvoice(invoice, getActiveErrorNoticeDetails(baseDetails).length + newDetails.length + 1, previous.TBAO_ID, companyCd))
      })

      if (newDetails.length === 0) {
        return previous
      }

      return {
        ...previous,
        DETAILS: renumberErrorNoticeDetails([...baseDetails, ...newDetails]),
      }
    })

    setInvoicePickerVisible(false)
    if (skippedCount > 0) {
      notify(formatText(t("TBAO_DUPLICATE_INVOICE_SKIPPED", "Skipped {0} duplicate invoice(s)"), [skippedCount]), "warning", 3000)
    }
  }, [companyCd, t])

  const closeInvoicePicker = useCallback(() => {
    setInvoicePickerVisible(false)
  }, [])

  const handleDetailGridInitialized = useCallback((event: InitializedEvent<EInvoiceErrorNoticeDetail, GridKey>) => {
    detailGridRef.current = event.component ?? null
  }, [])

  const handleDetailRowUpdating = useCallback((event: RowUpdatingEvent<EInvoiceErrorNoticeDetail, GridKey>) => {
    const rowKey = String(event.oldData?.ROW_KEY ?? event.key ?? "")
    const patch = normalizeErrorNoticeDetailPatch(event.newData)
    event.cancel = true

    setFormData((previous) => ({
      ...previous,
      DETAILS: renumberErrorNoticeDetails(previous.DETAILS.map((detail) => (detail.ROW_KEY === rowKey ? { ...detail, ...patch } : detail))),
    }))
  }, [])

  const handleDetailRowRemoving = useCallback(
    (event: RowRemovingEvent<EInvoiceErrorNoticeDetail, GridKey>) => {
      event.cancel = true
      if (readOnly) {
        return
      }

      const rowKey = String(event.data?.ROW_KEY ?? event.key ?? "")
      setFormData((previous) => {
        const activeCount = getActiveErrorNoticeDetails(previous.DETAILS).length
        if (activeCount <= 1) {
          notify(fieldRequiredMessage(t, "DETAIL_LINE", "Detail line"), "warning", 2500)
          return previous
        }

        return {
          ...previous,
          DETAILS: renumberErrorNoticeDetails(previous.DETAILS.map((detail) => (detail.ROW_KEY === rowKey ? { ...detail, ISDEL: 1 } : detail))),
        }
      })
    },
    [readOnly, t],
  )

  const openLinkedInvoice = useCallback(
    (detail: EInvoiceErrorNoticeDetail) => {
      if (!canOpenLinkedInvoice(detail)) {
        return
      }

      const query = new URLSearchParams()
      const sourceInvoiceId = Number(detail.SOURCE_INVOICE_ID ?? 0)
      if (sourceInvoiceId > 0) {
        query.set("invoiceId", String(sourceInvoiceId))
      } else {
        query.set("keyword", [detail.MCCQT, detail.KHMSHDON, detail.KHHDON, detail.SHDON].map(trimLinkText).filter(Boolean).join(" "))
      }

      openWorkspacePath(buildAppPath(companyCd, `/einvoice/manage?${query.toString()}`), {
        title: t("EINVOICE_MANAGEMENT", "Quản lý hóa đơn điện tử"),
      })
    },
    [companyCd, openWorkspacePath, t],
  )

  const renderLinkedInvoiceCell = useCallback(
    (cellInfo: ErrorNoticeDetailCellInfo) => {
      const detail = cellInfo.data
      return (
        <Button
          icon="link"
          stylingMode="text"
          disabled={!detail || !canOpenLinkedInvoice(detail)}
          hint={t("OPEN_LINKED_INVOICE", "Open linked invoice")}
          onClick={() => detail && openLinkedInvoice(detail)}
        />
      )
    },
    [openLinkedInvoice, t],
  )

  const validateBeforeSave = useCallback((): boolean => {
    if (!formData.MCQT.trim()) {
      notify(fieldRequiredMessage(t, "MCQT", "Tax office code"), "warning", 3000)
      return false
    }

    if (!formData.TCQT.trim()) {
      notify(fieldRequiredMessage(t, "TCQT", "Tax office"), "warning", 3000)
      return false
    }

    if (!formData.TNNT.trim()) {
      notify(fieldRequiredMessage(t, "TNNT", "Taxpayer"), "warning", 3000)
      return false
    }

    if (!formData.DDANH.trim()) {
      notify(fieldRequiredMessage(t, "DDANH", "Place"), "warning", 3000)
      return false
    }

    if (formData.LOAI === 2 && !formData.SO.trim()) {
      notify(fieldRequiredMessage(t, "SO", "Số thông báo của CQT"), "warning", 3000)
      return false
    }

    if (formData.LOAI === 2 && !formData.NTBCCQT) {
      notify(fieldRequiredMessage(t, "NTBCCQT", "Ngày thông báo của CQT"), "warning", 3000)
      return false
    }

    if (activeDetails.length === 0) {
      notify(fieldRequiredMessage(t, "DETAIL_LINE", "Detail line"), "warning", 3000)
      return false
    }

    const invalidDetail = activeDetails.find((detail) => !detail.NGAY || Number(detail.LADHDDT ?? 0) <= 0)
    if (invalidDetail) {
      notify(formatText(t("TBAO_DETAIL_INVALID", "Invoice detail line {0} is invalid"), [invalidDetail.STT]), "warning", 3000)
      return false
    }

    return true
  }, [activeDetails, formData, t])

  const handleSave = useCallback(async () => {
    if (readOnly || loading || !validateBeforeSave()) {
      return
    }

    setLoading(true)
    try {
      await detailGridRef.current?.closeEditCell?.()
      const payload = mapErrorNoticeToApiPayload({
        ...formData,
        COMPANY_CD: companyCd,
        DETAILS: renumberErrorNoticeDetails(formData.DETAILS),
      })
      const response = payload.TBAO_ID && payload.TBAO_ID > 0 ? await updateEInvoiceErrorNotice(payload) : await createEInvoiceErrorNotice(payload)
      const saved = normalizeErrorNotice(response.data, companyCd)
      notify(t("SAVE_SUCCESS", "Saved successfully"), "success", 2500)
      await onSaved(saved)
      onClose()
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 5000)
    } finally {
      setLoading(false)
    }
  }, [companyCd, formData, loading, onClose, onSaved, readOnly, t, validateBeforeSave])

  const handlePrint = useCallback(() => {
    const tbaoId = Number(formData.TBAO_ID ?? 0)
    if (!Number.isFinite(tbaoId) || tbaoId <= 0) {
      notify(t("SAVE_BEFORE_PRINT", "Save the record before printing"), "warning", 2500)
      return
    }

    void openEInvoiceErrorNoticePreview({
      tbaoId,
      notifyUnableToOpen: (message) => notify(message, "error", 4000),
    })
  }, [formData.TBAO_ID, t])

  const popupShortcutScopeId = usePopupShortcutScopeId("einvoice-error-notice-editor")

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

  const getCurrentDetailRowKey = useCallback(() => {
    const editingRowKey = detailGridRef.current?.option("editing.editRowKey")
    if (typeof editingRowKey === "string" && activeDetails.some((item) => item.ROW_KEY === editingRowKey)) {
      return editingRowKey
    }

    const focusedRowKey = detailGridRef.current?.option("focusedRowKey") as GridKey | undefined
    if (focusedRowKey !== undefined && focusedRowKey !== null && activeDetails.some((item) => item.ROW_KEY === focusedRowKey)) {
      return String(focusedRowKey)
    }

    const selectedKeys = (detailGridRef.current?.getSelectedRowKeys() ?? []) as GridKey[]
    const primaryKey = selectedKeys[0]
    if (primaryKey !== undefined && primaryKey !== null && activeDetails.some((item) => item.ROW_KEY === primaryKey)) {
      return String(primaryKey)
    }

    return activeDetails[activeDetails.length - 1]?.ROW_KEY ?? null
  }, [activeDetails])

  const handleDeleteDetailRow = useCallback(() => {
    if (readOnly) {
      return
    }

    const rowKey = getCurrentDetailRowKey()
    if (!rowKey) {
      return
    }

    setFormData((previous) => {
      const activeCount = getActiveErrorNoticeDetails(previous.DETAILS).length
      if (activeCount <= 1) {
        notify(fieldRequiredMessage(t, "DETAIL_LINE", "Detail line"), "warning", 2500)
        return previous
      }

      return {
        ...previous,
        DETAILS: renumberErrorNoticeDetails(previous.DETAILS.map((detail) => (detail.ROW_KEY === rowKey ? { ...detail, ISDEL: 1 } : detail))),
      }
    })
  }, [getCurrentDetailRowKey, readOnly, t])

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
            void handleSave()
          },
          [SHORTCUT_ACTIONS.CLOSE]: () => handleClosePopup(),
          [SHORTCUT_ACTIONS.ADD_ROW]: () => addDetail(),
          [SHORTCUT_ACTIONS.DELETE_ROW]: () => handleDeleteDetailRow(),
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
      addDetail,
      closeShortcutHelp,
      handleClosePopup,
      handleDeleteDetailRow,
      handleSave,
      loading,
      openShortcutHelp,
      readOnly,
      shortcutActions,
      shortcutHelpVisible,
    ],
  )

  const shouldHandleShortcutEvent = useCallback(
    () => isPopupShortcutScopeTopMost(popupShortcutScopeId),
    [popupShortcutScopeId],
  )

  useShortcutBindings(shortcutBindings, {
    enabled: visible && !invoicePickerVisible,
    shouldHandleEvent: shouldHandleShortcutEvent,
  })

  const popupTitle = noticeId > 0 ? t("TBAO_EDIT", "Edit error notice") : t("TBAO_CREATE", "Create error notice")

  return (
    <>
      <EInvoiceEditorShell
        visible={visible}
        title={popupTitle}
        subtitle={formData.MST?.trim() || undefined}
        loading={loading}
        closeDisabled={loading}
        animation={POPUP_FADE_ANIMATION}
        wrapperAttr={createPopupShortcutWrapperAttr(popupShortcutScopeId)}
        onClose={handleClosePopup}
        onHiding={handleClosePopup}
        footer={
          <>
            <Button text={t("PRINT", "Print")} icon="print" stylingMode="outlined" disabled={loading} onClick={handlePrint} />
            <Button text={t("CANCEL", "Cancel")} stylingMode="outlined" disabled={loading} onClick={handleClosePopup} />
            <Button text={t("SAVE", "Save")} icon="save" type="default" stylingMode="contained" disabled={readOnly || loading} onClick={() => void handleSave()} />
          </>
        }
      >
        <EInvoiceEditorSection title={t("TBAO_HEADER", "Thông tin thông báo")}>
          <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
            <div className="einvoice-editor__field einvoice-editor__col-4">
              <div className="einvoice-editor__field-label">{t("LOAI", "Notice type")}</div>
              <SelectBox
                dataSource={noticeTypeOptions}
                valueExpr="value"
                displayExpr="text"
                value={formData.LOAI}
                disabled={readOnly}
                onValueChanged={(event) => {
                  const nextLoai = Number(event.value ?? 1)
                  if (nextLoai === 2) {
                    updateForm({ LOAI: nextLoai })
                    return
                  }

                  updateForm({ LOAI: nextLoai, SO: "", NTBCCQT: "" })
                }}
              />
            </div>
            <div className="einvoice-editor__field einvoice-editor__col-2">
              <div className="einvoice-editor__field-label">{t("MCQT", "Tax office code")}</div>
              <TextBox value={formData.MCQT} disabled={readOnly} onValueChanged={(event) => updateForm({ MCQT: String(event.value ?? "") })} />
            </div>
            <div className="einvoice-editor__field einvoice-editor__col-4">
              <div className="einvoice-editor__field-label">{t("TCQT", "Tax office")}</div>
              <TextBox value={formData.TCQT} disabled={readOnly} onValueChanged={(event) => updateForm({ TCQT: String(event.value ?? "") })} />
            </div>
            {formData.LOAI === 2 ? (
              <>
                <div className="einvoice-editor__field einvoice-editor__col-3">
                  <div className="einvoice-editor__field-label">{t("SO", "Số thông báo của CQT")}</div>
                  <TextBox value={formData.SO} disabled={readOnly} maxLength={30} onValueChanged={(event) => updateForm({ SO: String(event.value ?? "") })} />
                </div>
                <div className="einvoice-editor__field einvoice-editor__col-3">
                  <div className="einvoice-editor__field-label">{t("NTBCCQT", "Ngày thông báo của CQT")}</div>
                  <DateBox
                    type="date"
                    displayFormat="yyyy-MM-dd"
                    dateSerializationFormat="yyyy-MM-dd"
                    value={parseErrorNoticeDate(formData.NTBCCQT)}
                    disabled={readOnly}
                    onValueChanged={(event) => updateForm({ NTBCCQT: dateValueToText(event.value) })}
                  />
                </div>
              </>
            ) : null}
            <div className="einvoice-editor__field einvoice-editor__col-3">
              <div className="einvoice-editor__field-label">{t("MST", "Tax code")}</div>
              <TextBox value={formData.MST} disabled={readOnly} onValueChanged={(event) => updateForm({ MST: String(event.value ?? "") })} />
            </div>
            <div className="einvoice-editor__field einvoice-editor__col-5">
              <div className="einvoice-editor__field-label">{t("TNNT", "Taxpayer")}</div>
              <TextBox value={formData.TNNT} disabled={readOnly} onValueChanged={(event) => updateForm({ TNNT: String(event.value ?? "") })} />
            </div>
            <div className="einvoice-editor__field einvoice-editor__col-2">
              <div className="einvoice-editor__field-label">{t("DDANH", "Place")}</div>
              <TextBox value={formData.DDANH} disabled={readOnly} onValueChanged={(event) => updateForm({ DDANH: String(event.value ?? "") })} />
            </div>
          </div>
        </EInvoiceEditorSection>

        <section className="einvoice-editor__section">
          <div className="einvoice-editor__detail-toolbar">
            <div className="einvoice-editor__section-title einvoice-editor__section-title--inline">{t("TBAO_DETAIL", "Invoice error details")}</div>
            <Button icon="add" text={t("ADD_ROW", "Add row")} type="default" stylingMode="contained" disabled={readOnly} onClick={addDetail} />
          </div>
          <div className="einvoice-editor__detail-grid" style={{ minHeight: 280 }}>
            <DataGrid<EInvoiceErrorNoticeDetail, GridKey>
              dataSource={activeDetails}
              keyExpr="ROW_KEY"
              height={280}
              showBorders={true}
              columnAutoWidth={true}
              repaintChangesOnly={true}
              onInitialized={handleDetailGridInitialized}
              onRowUpdating={handleDetailRowUpdating}
              onRowRemoving={handleDetailRowRemoving}
            >
              <Editing mode="cell" allowUpdating={!readOnly} allowDeleting={!readOnly} useIcons={true} />
              <Scrolling mode="virtual" />
              <Paging enabled={false} />
              <Column caption="" width={48} allowEditing={false} cellRender={renderLinkedInvoiceCell} />
              <Column dataField="STT" caption={t("STT", "No.")} width={70} allowEditing={false} />
              <Column dataField="MCCQT" caption={t("MCCQT", "Tax authority code")} minWidth={180} />
              <Column dataField="KHMSHDON" caption={t("KHMSHDON", "Form")} width={120} />
              <Column dataField="KHHDON" caption={t("KHHDON", "Serial")} width={110} />
              <Column dataField="SHDON" caption={t("SHDON", "Invoice no.")} width={120} />
              <Column dataField="NGAY" caption={t("NGAY", "Invoice date")} dataType="date" format="yyyy-MM-dd" width={130} />
              <Column dataField="LADHDDT" caption={t("LADHDDT", "Invoice type")} width={190} lookup={{ dataSource: invoiceTypeOptions, valueExpr: "value", displayExpr: "text" }} />
              <Column dataField="LDO" caption={t("LDO", "Reason")} minWidth={240} />
            </DataGrid>
          </div>
        </section>
      </EInvoiceEditorShell>

      {invoicePickerVisible ? (
        <EInvoiceInvoiceSelectPopup
          visible={invoicePickerVisible}
          companyCd={companyCd}
          selectionMode="multiple"
          isSigned={1}
          enableShortcuts={true}
          onClose={closeInvoicePicker}
          onSelect={handleSelectInvoices}
        />
      ) : null}
      <ShortcutHelpPopup
        visible={shortcutHelpVisible}
        shortcuts={shortcutHelpItems}
        onClose={closeShortcutHelp}
      />
    </>
  )
}

function EInvoiceErrorNoticePage() {
  const location = useLocation()
  const gridRef = useRef<dxDataGrid<EInvoiceErrorNotice, GridKey> | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [fromDate, setFromDate] = useState<Date | null>(() => createCurrentMonthDateRange().fromDate)
  const [toDate, setToDate] = useState<Date | null>(() => createCurrentMonthDateRange().toDate)
  const [listQuery, setListQuery] = useState(() => ({
    fromYmd: formatDateToYmd(createCurrentMonthDateRange().fromDate) ?? undefined,
    toYmd: formatDateToYmd(createCurrentMonthDateRange().toDate) ?? undefined,
  }))
  const [popupVisible, setPopupVisible] = useState(false)
  const [editingNoticeId, setEditingNoticeId] = useState(0)
  const [initialNotice, setInitialNotice] = useState<EInvoiceErrorNotice | null>(null)
  const [editorReadOnly, setEditorReadOnly] = useState(false)
  const [deleteDisabled, setDeleteDisabled] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [canSendMail, setCanSendMail] = useState(false)
  const [sendMailVisible, setSendMailVisible] = useState(false)
  const [pendingSendMailNotices, setPendingSendMailNotices] = useState<EInvoiceErrorNotice[]>([])
  const [transmissionPopupVisible, setTransmissionPopupVisible] = useState(false)
  const [transmissionLoading, setTransmissionLoading] = useState(false)
  const [transmissionTitle, setTransmissionTitle] = useState("")
  const [transmissionMessages, setTransmissionMessages] = useState<EInvoiceTransmissionMessage[]>([])

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const { promptIfPluginMissing, setupPopup } = useEInvoiceSigningPluginSetupPrompt()

  const { getCodesByType } = useSysCodes()
  const noticeTypeOptions = useMemo(
    () => buildTbaoLoaiOptions(getCodesByType(EINV_TBAO_LOAI_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const signStatusOptions = useMemo(
    () => buildErrorNoticeSignStatusOptions(getCodesByType(EINV_SIGN_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const mailStatusOptions = useMemo(
    () => buildEInvoiceMailStatusOptions(getCodesByType(EINV_MAIL_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const resolveNoticeLoaiLabel = useCallback(
    (loai: number | null | undefined) => {
      const value = Number(loai ?? 0)
      return noticeTypeOptions.find((option) => option.value === value)?.text ?? (value > 0 ? String(value) : "")
    },
    [noticeTypeOptions],
  )

  const renderHeaderSummaryCell = useCallback(
    (cellInfo: ErrorNoticeGridCellInfo) => {
      const formCode = typeof cellInfo.data?.MSO === "string" ? cellInfo.data.MSO.trim() : ""
      const noticeName = typeof cellInfo.data?.TEN === "string" ? cellInfo.data.TEN.trim() : ""
      const loaiLabel = resolveNoticeLoaiLabel(cellInfo.data?.LOAI)
      const meta = [
        formCode ? `${t("MSO", "Mẫu")}: ${formCode}` : "",
        loaiLabel ? `${t("LOAI", "Loại")}: ${loaiLabel}` : "",
      ]
        .filter(Boolean)
        .join(" · ")

      return <EInvoicePartyCell name={noticeName || "—"} meta={meta} />
    },
    [resolveNoticeLoaiLabel, t],
  )

  const renderTaxpayerSummaryCell = useCallback(
    (cellInfo: ErrorNoticeGridCellInfo) => {
      const taxpayerName = typeof cellInfo.data?.TNNT === "string" ? cellInfo.data.TNNT.trim() : ""
      const taxCode = typeof cellInfo.data?.MST === "string" ? cellInfo.data.MST.trim() : ""
      const place = typeof cellInfo.data?.DDANH === "string" ? cellInfo.data.DDANH.trim() : ""
      const meta = [
        taxCode ? `${t("MST", "MST")}: ${taxCode}` : "",
        place ? `${t("DDANH", "Địa danh")}: ${place}` : "",
      ]
        .filter(Boolean)
        .join(" · ")

      return <EInvoicePartyCell name={taxpayerName || "—"} meta={meta} />
    },
    [t],
  )

  const renderTaxOfficeSummaryCell = useCallback(
    (cellInfo: ErrorNoticeGridCellInfo) => {
      const officeCode = typeof cellInfo.data?.MCQT === "string" ? cellInfo.data.MCQT.trim() : ""
      const officeName = typeof cellInfo.data?.TCQT === "string" ? cellInfo.data.TCQT.trim() : ""
      const noticeNo = typeof cellInfo.data?.SO === "string" ? cellInfo.data.SO.trim() : ""
      const noticeDate = typeof cellInfo.data?.NTBCCQT === "string" ? cellInfo.data.NTBCCQT.trim() : ""
      const meta = [
        officeCode ? `${t("MCQT", "Mã CQT")}: ${officeCode}` : "",
        noticeNo ? `${t("SO", "Số TB")}: ${noticeNo}` : "",
        noticeDate ? `${t("NTBCCQT", "Ngày")}: ${noticeDate}` : "",
      ]
        .filter(Boolean)
        .join(" · ")

      return <EInvoicePartyCell name={officeName || "—"} meta={meta} />
    },
    [t],
  )

  const closeTransmissionPopup = useCallback(() => {
    if (transmissionLoading) {
      return
    }

    setTransmissionPopupVisible(false)
    setTransmissionMessages([])
    setTransmissionTitle("")
  }, [transmissionLoading])

  const handleShowTransmissionMessages = useCallback(
    async (row: EInvoiceErrorNotice) => {
      const tbaoId = Number(row.TBAO_ID ?? 0)
      if (!Number.isFinite(tbaoId) || tbaoId <= 0) {
        return
      }

      const titleParts = [
        typeof row.MSO === "string" ? row.MSO.trim() : "",
        typeof row.SO === "string" ? row.SO.trim() : "",
        typeof row.TNNT === "string" ? row.TNNT.trim() : "",
      ].filter(Boolean)

      setTransmissionTitle(
        titleParts.length > 0
          ? `${t("DECL_TRANSMISSION_INFO", "Thông tin truyền nhận")} - ${titleParts.join(" - ")}`
          : t("DECL_TRANSMISSION_INFO", "Thông tin truyền nhận"),
      )
      setTransmissionMessages([])
      setTransmissionPopupVisible(true)
      setTransmissionLoading(true)

      try {
        const response = await getEInvoiceErrorNoticeTransmissionMessages(tbaoId)
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
        const opened = await openEInvoiceTransmissionHtmlPreview(message)
        if (!opened) {
          notify(t("PREVIEW_OPEN_FAILED", "Could not open preview"), "warning", 3000)
        }
      } catch (error) {
        notify(getApiErrorMessage(error, t("PREVIEW_FAILED", "Preview failed")), "error", 4000)
      }
    },
    [t],
  )

  const renderErrorNoticeStatusCell = useCallback(
    (cellInfo: ErrorNoticeGridCellInfo) => (
      <EInvoiceErrorNoticeStatusCell
        data={cellInfo.data}
        t={t}
        onShowTransmission={(row) => {
          void handleShowTransmissionMessages(row)
        }}
      />
    ),
    [handleShowTransmissionMessages, t],
  )

  const screenCd = useMemo(() => location.pathname, [location.pathname])
  const companyCd = getCurrentCompanyCd()

  const {
    data: noticeData = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch,
  } = useEInvoiceErrorNoticeListQuery(listQuery)
  const invalidateErrorNotices = useEInvoiceErrorNoticeListInvalidate()
  const rows = useMemo(() => normalizeErrorNoticeRows(noticeData, companyCd), [companyCd, noticeData])
  const listLoading = isLoading || isFetching
  const loading = listLoading || actionLoading

  const certificateSigningPopupOptions = useMemo(
    () => ({
      targetLabel: t("SIGN_RECORD_COUNT", "record(s)"),
    }),
    [t],
  )

  const { certificatePopupVisible, openSigningPopup, certificateSelectPopup } = useEInvoiceCertificateSigning<PendingSignNotice>({
    t,
    promptIfPluginMissing,
    onRefresh: invalidateErrorNotices,
    setActionLoading,
    popupOptions: certificateSigningPopupOptions,
    signBatch: async (items, certificateThumbprint) => {
      let successCount = 0
      for (const [index, signRequest] of items.entries()) {
        const signed = await signXmlWithPlugin({
          requestId: `einvoice-tbao-${companyCd}-${signRequest.tbaoId}-${Date.now()}-${index + 1}`,
          invoiceId: signRequest.tbaoId,
          companyCd,
          certificateThumbprint,
          signType: "NNT",
          xml: signRequest.rawXml,
        })

        await saveEInvoiceErrorNoticeSignature(signRequest.tbaoId, {
          XML: signed.signedXml,
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

  useMasterListLoadError(isError, loadError, t, "Failed to load e-invoice error notices")

  useEffect(() => {
    gridRef.current?.clearSelection()
    setDeleteDisabled(false)
  }, [rows])

  const validateDateRange = useCallback(() => {
    if (!fromDate || !toDate || fromDate <= toDate) {
      return true
    }

    notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
    return false
  }, [fromDate, t, toDate])

  const openCreate = useCallback(() => {
    setInitialNotice(null)
    setEditingNoticeId(0)
    setEditorReadOnly(false)
    setPopupVisible(true)
  }, [])

  const openEdit = useCallback((row: EInvoiceErrorNotice) => {
    setInitialNotice(null)
    setEditorReadOnly(isErrorNoticeSigned(row))
    setEditingNoticeId(Number(row.TBAO_ID ?? 0))
    setPopupVisible(true)
  }, [])

  const handleSaved = useCallback(
    async () => {
      await invalidateErrorNotices()
    },
    [invalidateErrorNotices],
  )

  const closePopup = useCallback(() => {
    setPopupVisible(false)
    setEditingNoticeId(0)
    setInitialNotice(null)
    setEditorReadOnly(false)
  }, [])

  const handleGridInitialized = useCallback((event: InitializedEvent<EInvoiceErrorNotice, GridKey>) => {
    gridRef.current = event.component ?? null
  }, [])

  const handleRowDblClick = useCallback(
    (event: RowDblClickEvent<EInvoiceErrorNotice, GridKey>) => {
      const row = event.data
      const noticeId = Number(row?.TBAO_ID ?? 0)
      if (row && noticeId > 0) {
        openEdit(row)
      }
    },
    [openEdit],
  )

  const handleContextMenuUpdate = useCallback(
    (row: EInvoiceErrorNotice) => {
      const noticeId = Number(row.TBAO_ID ?? 0)
      if (noticeId > 0) {
        openEdit(row)
      }
    },
    [openEdit],
  )

  const handleContextMenuCopy = useCallback(
    async (row: EInvoiceErrorNotice) => {
      const noticeId = Number(row.TBAO_ID ?? 0)
      if (noticeId <= 0) {
        return
      }

      setActionLoading(true)
      try {
        const response = await getEInvoiceErrorNotice(noticeId)
        const detail = normalizeErrorNotice(response.data, companyCd)
        setInitialNotice(createErrorNoticeCopy(detail, companyCd))
        setEditingNoticeId(0)
        setEditorReadOnly(false)
        setPopupVisible(true)
      } catch (error) {
        notify(getApiErrorMessage(error, t("COPY_FAILED", "Copy failed")), "error", 4000)
      } finally {
        setActionLoading(false)
      }
    },
    [companyCd, t],
  )

  const handleContextMenuCopyAction = useCallback(
    (row: EInvoiceErrorNotice) => {
      void handleContextMenuCopy(row)
    },
    [handleContextMenuCopy],
  )

  const getSelectedNotices = useCallback((): EInvoiceErrorNotice[] => {
    const selectedKeys = new Set((gridRef.current?.getSelectedRowKeys() ?? []) as GridKey[])
    return rows.filter((row) => selectedKeys.has(row.TBAO_ID))
  }, [rows])

  const getSelectedNoticeIds = useCallback(() => {
    return ((gridRef.current?.getSelectedRowKeys() ?? []) as GridKey[])
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)
  }, [])

  const handleSelectionChanged = useCallback((event: SelectionChangedEvent<EInvoiceErrorNotice, GridKey>) => {
    const selectedRows = event.selectedRowsData ?? []
    setHasSelection(selectedRows.length > 0)
    setCanSendMail(selectedRows.some((row) => isErrorNoticeReadyToSendMail(row)))
    setDeleteDisabled(selectedRows.some((row) => isErrorNoticeSigned(row)))
  }, [])

  const handleSendMail = useCallback(() => {
    const selectedNotices = getSelectedNotices()
    const sendableNotices = selectedNotices.filter((row) => isErrorNoticeReadyToSendMail(row))

    if (sendableNotices.length === 0) {
      notify(t("SEND_MAIL_TBAO_NOT_READY", "Chọn thông báo đã ký để gửi mail"), "warning", 3500)
      return
    }

    const notReadyCount = selectedNotices.length - sendableNotices.length
    if (notReadyCount > 0) {
      notify(
        formatText(t("SEND_MAIL_TBAO_SKIP_NOT_READY", "Bỏ qua {0} thông báo chưa ký"), [notReadyCount]),
        "warning",
        3500,
      )
    }

    setPendingSendMailNotices(sendableNotices)
    setSendMailVisible(true)
  }, [getSelectedNotices, t])

  const closeSendMailPopup = useCallback(() => {
    if (actionLoading) {
      return
    }

    setSendMailVisible(false)
    setPendingSendMailNotices([])
  }, [actionLoading])

  const handleConfirmSendMail = useCallback(
    async (request: EInvoiceErrorNoticeSendMailRequest) => {
      if (request.items.length === 0) {
        notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
        return
      }

      setActionLoading(true)
      try {
        const response = await sendEInvoiceErrorNoticeMail({
          items: request.items.map((item) => ({
            tbaoId: item.tbaoId,
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
        setPendingSendMailNotices([])
        await refetch()
      } catch (error) {
        notify(getApiErrorMessage(error, t("SEND_MAIL_FAILED", "Send mail failed")), "error", 5000)
      } finally {
        setActionLoading(false)
      }
    },
    [refetch, t],
  )

  const handleDelete = useCallback(async () => {
    const selectedNotices = getSelectedNotices()
    const ids = selectedNotices
      .map((row) => Number(row.TBAO_ID ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (ids.length === 0) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }

    const signedIds = selectedNotices.filter((row) => isErrorNoticeSigned(row)).map((row) => Number(row.TBAO_ID))
    const deletableIds = ids.filter((id) => !signedIds.includes(id))

    if (signedIds.length > 0) {
      notify(t("SIGNED_DELETE_BLOCKED", "Signed record cannot be deleted"), "warning", 3500)
    }

    if (deletableIds.length === 0) {
      return
    }

    const confirmed = await confirm(
      formatText(t("MSG_CONFIRM_DELETE_RECORD", "Are you sure you want to delete {0} record?"), [deletableIds.length]),
      t("MSG_CONFIRM_DELETE", "Confirm delete"),
    )
    if (!confirmed) {
      return
    }

    setActionLoading(true)
    try {
      await deleteEInvoiceErrorNotices(deletableIds)
      notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
      setDeleteDisabled(false)
      await invalidateErrorNotices()
    } catch (error) {
      notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 4000)
    } finally {
      setActionLoading(false)
    }
  }, [getSelectedNotices, invalidateErrorNotices, t])

  const handleSignXml = useCallback(async () => {
    const ids = getSelectedNoticeIds()
    if (ids.length === 0) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }

    const confirmed = await confirm(
      formatText(t("SIGN_CONFIRM_BATCH", "Sign {0} selected record(s)?"), [ids.length]),
      t("SIGN_SEND_CQT", "Ký và gửi CQT"),
    )
    if (!confirmed) {
      return
    }

    setActionLoading(true)
    try {
      const signRequests: PendingSignNotice[] = []
      const signedIds: number[] = []
      const emptyXmlIds: number[] = []

      for (const tbaoId of ids) {
        const payloadResponse = await getEInvoiceErrorNoticeSigningPayload(tbaoId)
        const payload = payloadResponse.data

        if (payload.IS_SIGNED) {
          signedIds.push(tbaoId)
          continue
        }

        const rawXml = String(payload.RAW_XML ?? "").trim()
        if (!rawXml) {
          emptyXmlIds.push(tbaoId)
          continue
        }

        signRequests.push({ tbaoId, rawXml })
      }

      if (signedIds.length > 0) {
        notify(formatText(t("SIGN_SKIP_SIGNED", "Skipped {0} already signed record(s)"), [signedIds.length]), "warning", 3000)
      }

      if (emptyXmlIds.length > 0) {
        notify(formatText(t("SIGN_SKIP_EMPTY_XML", "Skipped {0} record(s) because XML is empty"), [emptyXmlIds.length]), "warning", 3500)
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
  }, [getSelectedNoticeIds, openSigningPopup, promptIfPluginMissing, t])

  const handleViewXml = useCallback(async () => {
    const ids = getSelectedNoticeIds()
    if (ids.length === 0) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }

    if (ids.length > 1) {
      notify(t("XML_PREVIEW_SINGLE", "Select exactly one record to view XML"), "warning", 3500)
      return
    }

    const selectedNotice = getSelectedNotices()[0]
    const titleParts = [
      typeof selectedNotice?.SO === "string" ? selectedNotice.SO.trim() : "",
      typeof selectedNotice?.TNNT === "string" ? selectedNotice.TNNT.trim() : "",
    ].filter(Boolean)
    const title = titleParts.length > 0 ? `E-Invoice Error Notice XML ${titleParts.join(" - ")}` : undefined

    setActionLoading(true)
    try {
      await openEInvoiceErrorNoticeXmlPreviewWithNotify(ids[0], {
        title,
        notifyUnableToOpen: (message) => notify(message, "error", 4000),
      })
    } finally {
      setActionLoading(false)
    }
  }, [getSelectedNoticeIds, getSelectedNotices, t])

  const handleViewPreview = useCallback(
    async (event?: MouseEvent) => {
      if (event?.ctrlKey) {
        await handleViewXml()
        return
      }

      const ids = getSelectedNoticeIds()
      if (ids.length === 0) {
        notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
        return
      }

      if (ids.length > 1) {
        notify(t("PREVIEW_SINGLE", "Select exactly one record to preview"), "warning", 3500)
        return
      }

      setActionLoading(true)
      try {
        await openEInvoiceErrorNoticePreview({ tbaoId: ids[0] })
      } finally {
        setActionLoading(false)
      }
    },
    [getSelectedNoticeIds, handleViewXml, t],
  )

  const afterAddItems = useMemo(
    () => [
      createEInvoiceSignSendCqtToolbarItem(t, {
        visible: hasSelection,
        loading,
        onSign: handleSignXml,
      }),
      createEInvoiceSendMailToolbarItem(t, {
        visible: canSendMail,
        loading,
        onSendMail: handleSendMail,
      }),
    ],
    [canSendMail, handleSendMail, handleSignXml, hasSelection, loading, t],
  )

  const toolbarItems = useMemo(
    () => [
      {
        key: "view-preview",
        icon: "print",
        text: t("VIEW", "View"),
        hint: t("PREVIEW_HINT", "View HTML preview"),
        stylingMode: "outlined" as const,
        disabled: loading,
        onClick: (event) => {
          void handleViewPreview(event)
        },
      },
    ],
    [handleViewPreview, loading, t],
  )

  const applyListQuery = useCallback(() => {
    if (!validateDateRange()) {
      return
    }

    setListQuery({
      fromYmd: formatDateToYmd(fromDate) ?? undefined,
      toYmd: formatDateToYmd(toDate) ?? undefined,
    })
  }, [fromDate, toDate, validateDateRange])

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
        <GridToolbar
          gridRef={gridRef}
          onAdd={openCreate}
          onRefresh={() => {
            void refetch()
          }}
          onRangeSearch={applyListQuery}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          showDateRange={true}
          onDelete={handleDelete}
          deleteDisabled={deleteDisabled}
          afterAddItems={afterAddItems}
          customItems={toolbarItems}
          showImport={false}
          showExportPdf={false}
          showExportXlsx={false}
          shortcutsEnabled={!popupVisible && !certificatePopupVisible && !transmissionPopupVisible && !sendMailVisible}
        />

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <EInvoiceTableShell className="h-full">
            <PageGrid<EInvoiceErrorNotice>
              dataSource={rows}
              keyExpr="TBAO_ID"
              screenCd={screenCd}
              gridId="einvoice-error-notice-grid"
              copyExcludeFields={COPY_EXCLUDE_FIELDS}
              wordWrapEnabled={false}
              onAdd={openCreate}
              onContextMenuUpdate={handleContextMenuUpdate}
              onContextMenuCopy={handleContextMenuCopyAction}
              onInitialized={handleGridInitialized}
              onSelectionChanged={handleSelectionChanged}
              onRowDblClick={handleRowDblClick}
              selectMode="multiple"
              showPager={true}
              defaultPageSize={20}
            >
              <Column
                name="ERROR_NOTICE_HEADER_SUMMARY"
                caption={t("TEN", "Notice name")}
                minWidth={280}
                fixed={true}
                fixedPosition="left"
                calculateCellValue={(row: EInvoiceErrorNotice) =>
                  formatErrorNoticeHeaderSummaryText(row, resolveNoticeLoaiLabel(row.LOAI))
                }
                cellRender={renderHeaderSummaryCell}
              />
              <Column
                name="ERROR_NOTICE_TAXPAYER_SUMMARY"
                caption={t("TNNT", "Taxpayer")}
                minWidth={240}
                calculateCellValue={(row: EInvoiceErrorNotice) => formatErrorNoticeTaxpayerSummaryText(row)}
                cellRender={renderTaxpayerSummaryCell}
              />
              <Column
                name="ERROR_NOTICE_TAX_OFFICE_SUMMARY"
                caption={t("TCQT", "Tax office")}
                minWidth={260}
                calculateCellValue={(row: EInvoiceErrorNotice) => formatErrorNoticeTaxOfficeSummaryText(row)}
                cellRender={renderTaxOfficeSummaryCell}
              />
              <Column
                name="ERROR_NOTICE_STATUS_SUMMARY"
                caption={t("STATUS_SUMMARY", "Trạng thái")}
                width={240}
                alignment="center"
                calculateCellValue={(row: EInvoiceErrorNotice) =>
                  formatErrorNoticeStatusSummary(row, signStatusOptions, mailStatusOptions)
                }
                cellRender={renderErrorNoticeStatusCell}
              />
            </PageGrid>
          </EInvoiceTableShell>

          <LoadPanel visible={loading} showIndicator={true} showPane={true} shading={true} shadingColor="rgba(0, 0, 0, 0.15)" />
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

        {sendMailVisible ? (
          <EInvoiceErrorNoticeSendMailPopup
            visible={sendMailVisible}
            notices={pendingSendMailNotices}
            loading={actionLoading}
            onClose={closeSendMailPopup}
            onConfirm={handleConfirmSendMail}
          />
        ) : null}

        <Suspense fallback={null}>
          {certificateSelectPopup}

          {setupPopup}

          {popupVisible ? (
            <ErrorNoticeEditorPopup
              visible={popupVisible}
              noticeId={editingNoticeId}
              initialNotice={initialNotice}
              readOnly={editorReadOnly}
              noticeTypeOptions={noticeTypeOptions}
              onClose={closePopup}
              onSaved={handleSaved}
            />
          ) : null}
        </Suspense>
      </div>
    </DxPage>
  )
}

export default EInvoiceErrorNoticePage
