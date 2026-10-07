import { Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { Column } from "devextreme-react/data-grid"
import LoadPanel from "devextreme-react/load-panel"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { ColumnCellTemplateData, InitializedEvent, RowDblClickEvent, SelectionChangedEvent } from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"

import { getApiErrorMessage } from "@/api/apiTypes"
import {
  deleteEInvoiceMinutes,
  getEInvoiceMinute,
  getEInvoiceMinuteSigningPayload,
  saveEInvoiceMinuteSignature,
  sendEInvoiceMinuteMail,
} from "@/api/einvoiceMinuteApi"
import { signXmlWithPlugin } from "@/api/einvoiceSigningPluginApi"
import PageGrid from "@/components/datagrid/PageGrid"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import DxPage from "@/dx/DxPage"
import {
  useEInvoiceMinuteListInvalidate,
  useEInvoiceMinuteListQuery,
} from "@/hooks/queries/useEInvoiceListQuery"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import { LanguageContext } from "@/lib/i18nLoader"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import { useSysCodes } from "@/lib/sysCodeContext"
import { formatDateToYmd } from "@/pages/Accounting/accountingDateUtils"
import type { EInvoiceMinute } from "@/types/einvoiceMinute"
import EInvoiceMinuteEditorPopup from "./components/EInvoiceMinuteEditorPopup"
import EInvoiceMinuteSendMailPopup, { type EInvoiceMinuteSendMailRequest } from "./components/EInvoiceMinuteSendMailPopup"
import EInvoiceMinuteXmlPopup from "./components/EInvoiceMinuteXmlPopup"
import { EInvoiceMinuteStatusCell } from "./components/EInvoiceMinuteStatusCell"
import {
  buildMinuteSignStatusOptions,
  buildMinuteTypeOptions,
  buildEInvoiceMailStatusOptions,
  createMinuteCopy,
  createMinuteMonthStartDate,
  createMinuteTodayDate,
  EINV_BBAN_TYPE_CODE_TYPE,
  EINV_MAIL_STATUS_CODE_TYPE,
  formatMinuteInvoiceRefSummaryText,
  formatMinutePartySummaryText,
  formatMinuteStatusSummary,
  isMinuteEditable,
  isMinuteReadyToSendMail,
  isMinuteSigned,
  normalizeMinute,
  normalizeMinuteRows,
} from "./einvoiceMinuteModel"
import { EINV_SIGN_STATUS_CODE_TYPE } from "./einvoiceAdvancedSearch"
import { useEInvoiceCertificateSigning } from "./hooks/useEInvoiceCertificateSigning"
import { useEInvoiceSigningPluginSetupPrompt } from "./hooks/useEInvoiceSigningPluginSetupPrompt"
import { openEInvoiceMinutePreview } from "./einvoiceMinutePreviewViewer"
import { createEInvoiceSignSendCqtToolbarItem } from "./einvoiceSignToolbar"
import { createEInvoiceSendMailToolbarItem } from "./einvoiceSendMailToolbar"
import { EInvoiceTableShell } from "./components/EInvoiceTableShell"
import {
  EInvoiceInvoiceRefCell,
  EInvoicePartyCell,
} from "./components/einvoiceTableUi"

type GridKey = number
type MinuteCellInfo = ColumnCellTemplateData<EInvoiceMinute, GridKey>

interface PendingSignMinute {
  bbanId: number
  rawXml: string
}

const COPY_EXCLUDE_FIELDS = [
  "BBAN_ID",
  "COMPANY_CD",
  "REASONS",
  "MTRACUU",
  "NDBBAN_XML",
  "SIGNED_XML",
  "NMUA_IS_SIGNED",
  "NMUA_SIGN_DT",
  "CREATE_BY",
  "CREATE_DT",
  "UPDATE_BY",
  "UPDATE_DT",
]

function formatText(template: string, values: Array<string | number>): string {
  return values.reduce((text, value, index) => text.replace(`{${index}}`, String(value)), template)
}

export default function EInvoiceMinutesPage() {
  const gridRef = useRef<dxDataGrid<EInvoiceMinute, GridKey> | null>(null)
  const location = useLocation()
  const companyCd = getCurrentCompanyCd()
  const screenCd = useMemo(() => location.pathname, [location.pathname])

  const [fromDate, setFromDate] = useState<Date | null>(() => createMinuteMonthStartDate())
  const [toDate, setToDate] = useState<Date | null>(() => createMinuteTodayDate())
  const [listQuery, setListQuery] = useState(() => ({
    fromYmd: formatDateToYmd(createMinuteMonthStartDate()) ?? undefined,
    toYmd: formatDateToYmd(createMinuteTodayDate()) ?? undefined,
  }))
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteDisabled, setDeleteDisabled] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [canSendMail, setCanSendMail] = useState(false)

  const [sendMailVisible, setSendMailVisible] = useState(false)
  const [pendingSendMailMinutes, setPendingSendMailMinutes] = useState<EInvoiceMinute[]>([])

  const [popupVisible, setPopupVisible] = useState(false)
  const [editingMinuteId, setEditingMinuteId] = useState(0)
  const [initialMinute, setInitialMinute] = useState<EInvoiceMinute | null>(null)

  const [xmlPopupVisible, setXmlPopupVisible] = useState(false)
  const [xmlText, setXmlText] = useState("")
  const [xmlTitle, setXmlTitle] = useState("")

  const { setupPopupVisible, promptIfPluginMissing, setupPopup } = useEInvoiceSigningPluginSetupPrompt()

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const { getCodesByType } = useSysCodes()
  const minuteTypeOptions = useMemo(
    () => buildMinuteTypeOptions(getCodesByType(EINV_BBAN_TYPE_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const minuteSignStatusOptions = useMemo(
    () => buildMinuteSignStatusOptions(getCodesByType(EINV_SIGN_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const minuteMailStatusOptions = useMemo(
    () => buildEInvoiceMailStatusOptions(getCodesByType(EINV_MAIL_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const renderPartySummaryCell = useCallback(
    (cellInfo: MinuteCellInfo) => {
      const lookupCode = typeof cellInfo.data?.MTRACUU === "string" ? cellInfo.data.MTRACUU.trim() : ""
      const sellerName = typeof cellInfo.data?.NBAN === "string" ? cellInfo.data.NBAN.trim() : ""
      const sellerTaxCode = typeof cellInfo.data?.MSTNBAN === "string" ? cellInfo.data.MSTNBAN.trim() : ""
      const buyerName = typeof cellInfo.data?.NMUA === "string" ? cellInfo.data.NMUA.trim() : ""
      const buyerTaxCode = typeof cellInfo.data?.MSTNMUA === "string" ? cellInfo.data.MSTNMUA.trim() : ""
      const meta = [
        lookupCode ? `${t("MTRACUU", "Mã TC")}: ${lookupCode}` : "",
        sellerTaxCode ? `${t("MSTNBAN", "MST NB")}: ${sellerTaxCode}` : "",
        buyerName ? `${t("NMUA", "NMua")}: ${buyerName}` : "",
        buyerTaxCode ? `${t("MSTNMUA", "MST NM")}: ${buyerTaxCode}` : "",
      ]
        .filter(Boolean)
        .join(" · ")

      return <EInvoicePartyCell name={sellerName || "—"} meta={meta} />
    },
    [t],
  )

  const renderInvoiceRefSummaryCell = useCallback(
    (cellInfo: MinuteCellInfo) => {
      const row = cellInfo.data
      const summary = formatMinuteInvoiceRefSummaryText(row)
      const refInvoiceId = Number(row?.REF_INVOICE_ID ?? 0)
      const href =
        refInvoiceId > 0
          ? buildAppPath(companyCd, `/einvoice/manage?invoiceId=${refInvoiceId}`)
          : undefined

      return (
        <EInvoiceInvoiceRefCell
          summary={summary}
          href={href}
          emptyLabel={t("BBAN_NO_REF_INVOICE", "Chưa chọn HĐ gốc")}
        />
      )
    },
    [companyCd, t],
  )

  const renderMinuteStatusSummaryCell = useCallback(
    (cellInfo: MinuteCellInfo) => <EInvoiceMinuteStatusCell data={cellInfo.data} t={t} />,
    [t],
  )

  const {
    data: minuteData = [],
    isFetching,
    isError,
    refetch,
    error: listError,
  } = useEInvoiceMinuteListQuery(listQuery)

  const invalidateMinutes = useEInvoiceMinuteListInvalidate()
  const loading = isFetching || actionLoading

  const certificateSigningPopupOptions = useMemo(
    () => ({
      compact: true as const,
      targetLabel: t("SIGN_RECORD_COUNT", "record(s)"),
    }),
    [t],
  )

  const { certificatePopupVisible, openSigningPopup, certificateSelectPopup } = useEInvoiceCertificateSigning<PendingSignMinute>({
    t,
    promptIfPluginMissing,
    onRefresh: invalidateMinutes,
    setActionLoading,
    popupOptions: certificateSigningPopupOptions,
    signBatch: async (items, certificateThumbprint) => {
      let successCount = 0
      for (const [index, signRequest] of items.entries()) {
        const requestPrefix = `bban-${companyCd}-${signRequest.bbanId}-${Date.now()}-${index + 1}`
        const signed = await signXmlWithPlugin({
          requestId: requestPrefix,
          invoiceId: signRequest.bbanId,
          companyCd,
          certificateThumbprint,
          signType: "SELLER",
          xml: signRequest.rawXml,
        })

        await saveEInvoiceMinuteSignature(signRequest.bbanId, {
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

  const rows = useMemo(() => normalizeMinuteRows(minuteData, companyCd), [companyCd, minuteData])

  useMasterListLoadError(isError, listError, t, "Failed to load e-invoice minutes")

  useEffect(() => {
    gridRef.current?.clearSelection()
    setHasSelection(false)
    setCanSendMail(false)
    setDeleteDisabled(false)
  }, [rows])

  const validateDateRange = useCallback(() => {
    if (!fromDate || !toDate || fromDate <= toDate) {
      return true
    }

    notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
    return false
  }, [fromDate, t, toDate])

  const getSelectedMinutes = useCallback((): EInvoiceMinute[] => {
    const selected = gridRef.current?.getSelectedRowsData() ?? []
    return selected.filter((row): row is EInvoiceMinute => Boolean(row))
  }, [])

  const getSelectedIds = useCallback((): number[] => {
    return getSelectedMinutes()
      .map((row) => Number(row.BBAN_ID ?? 0))
      .filter((id) => Number.isFinite(id) && id > 0)
  }, [getSelectedMinutes])

  const handleGridInitialized = useCallback((event: InitializedEvent<EInvoiceMinute, GridKey>) => {
    gridRef.current = event.component ?? null
  }, [])

  const handleSelectionChanged = useCallback((event: SelectionChangedEvent<EInvoiceMinute, GridKey>) => {
    const selectedRows = event.selectedRowsData ?? []
    setHasSelection(selectedRows.length > 0)
    setCanSendMail(selectedRows.some((row) => isMinuteReadyToSendMail(row)))
    setDeleteDisabled(selectedRows.some((row) => !isMinuteEditable(row)))
  }, [])

  const openCreate = useCallback(() => {
    setInitialMinute(null)
    setEditingMinuteId(0)
    setPopupVisible(true)
  }, [])

  const openEdit = useCallback((minute: EInvoiceMinute) => {
    const bbanId = Number(minute.BBAN_ID ?? 0)
    if (bbanId <= 0) {
      return
    }

    setInitialMinute(null)
    setEditingMinuteId(bbanId)
    setPopupVisible(true)
  }, [])

  const closePopup = useCallback(() => {
    setPopupVisible(false)
    setEditingMinuteId(0)
    setInitialMinute(null)
  }, [])

  const handleRowDblClick = useCallback(
    (event: RowDblClickEvent<EInvoiceMinute, GridKey>) => {
      if (event.data) {
        openEdit(event.data)
      }
    },
    [openEdit],
  )

  const handleContextMenuCopy = useCallback(
    async (minute: EInvoiceMinute) => {
      const bbanId = Number(minute.BBAN_ID ?? 0)
      if (bbanId <= 0) {
        return
      }

      setActionLoading(true)
      try {
        const response = await getEInvoiceMinute(bbanId)
        const detail = normalizeMinute(response.data, companyCd)
        setInitialMinute(createMinuteCopy(detail, companyCd))
        setEditingMinuteId(0)
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
    (minute: EInvoiceMinute) => {
      void handleContextMenuCopy(minute)
    },
    [handleContextMenuCopy],
  )

  const handleEditorSaved = useCallback(async () => {
    closePopup()
    await invalidateMinutes()
  }, [closePopup, invalidateMinutes])

  const handleDelete = useCallback(async () => {
    const selectedMinutes = getSelectedMinutes()
    const deletableIds = selectedMinutes
      .filter((row) => isMinuteEditable(row))
      .map((row) => Number(row.BBAN_ID ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (selectedMinutes.length === 0) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }

    if (deletableIds.length !== selectedMinutes.length) {
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
      await deleteEInvoiceMinutes(deletableIds)
      notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 2500)
      await invalidateMinutes()
    } catch (error) {
      notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 5000)
    } finally {
      setActionLoading(false)
    }
  }, [getSelectedMinutes, invalidateMinutes, t])

  const handleViewXml = useCallback(async () => {
    const selectedMinutes = getSelectedMinutes()
    if (selectedMinutes.length === 0) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }

    if (selectedMinutes.length > 1) {
      notify(t("XML_PREVIEW_SINGLE", "Select exactly one record to view XML"), "warning", 3500)
      return
    }

    const selectedMinute = selectedMinutes[0]
    setActionLoading(true)
    try {
      if (isMinuteSigned(selectedMinute)) {
        const response = await getEInvoiceMinute(selectedMinute.BBAN_ID)
        const detail = normalizeMinute(response.data, companyCd)
        setXmlText(detail.SIGNED_XML || detail.NDBBAN_XML || "")
      } else {
        const payload = await getEInvoiceMinuteSigningPayload(selectedMinute.BBAN_ID)
        setXmlText(payload.data.RAW_XML)
      }

      setXmlTitle(`${selectedMinute.SBBAN} - XML`)
      setXmlPopupVisible(true)
    } catch (error) {
      notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 5000)
    } finally {
      setActionLoading(false)
    }
  }, [companyCd, getSelectedMinutes, t])

  const handleViewPreview = useCallback(
    async (event?: MouseEvent) => {
      if (event?.ctrlKey) {
        await handleViewXml()
        return
      }

      const selectedMinutes = getSelectedMinutes()
      if (selectedMinutes.length === 0) {
        notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
        return
      }

      if (selectedMinutes.length > 1) {
        notify(t("PREVIEW_SINGLE", "Select exactly one record to preview"), "warning", 3500)
        return
      }

      setActionLoading(true)
      try {
        await openEInvoiceMinutePreview({
          bbanId: selectedMinutes[0].BBAN_ID,
          notifyUnableToOpen: (message) => notify(message, "error", 4000),
        })
      } finally {
        setActionLoading(false)
      }
    },
    [getSelectedMinutes, handleViewXml, t],
  )

  const handleSignXml = useCallback(async () => {
    const ids = getSelectedIds()
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
      const signRequests: PendingSignMinute[] = []
      const skippedIds: number[] = []

      for (const bbanId of ids) {
        const payloadResponse = await getEInvoiceMinuteSigningPayload(bbanId)
        const payload = payloadResponse.data
        const rawXml = String(payload.RAW_XML ?? "").trim()

        if (payload.IS_SIGNED || !rawXml) {
          skippedIds.push(bbanId)
          continue
        }

        signRequests.push({ bbanId, rawXml })
      }

      if (skippedIds.length > 0) {
        notify(formatText(t("SIGN_SKIP_COUNT", "Skipped {0} record(s)"), [skippedIds.length]), "warning", 3000)
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
  }, [getSelectedIds, openSigningPopup, promptIfPluginMissing, t])

  const handleSendMail = useCallback(() => {
    const selectedMinutes = getSelectedMinutes()
    const sendableMinutes = selectedMinutes.filter((row) => isMinuteReadyToSendMail(row))

    if (sendableMinutes.length === 0) {
      notify(t("SEND_MAIL_BBAN_NOT_READY", "Chọn biên bản đã ký có số biên bản"), "warning", 3500)
      return
    }

    const notReadyCount = selectedMinutes.length - sendableMinutes.length
    if (notReadyCount > 0) {
      notify(
        formatText(t("SEND_MAIL_BBAN_SKIP_NOT_READY", "Bỏ qua {0} biên bản chưa ký hoặc thiếu số"), [notReadyCount]),
        "warning",
        3500,
      )
    }

    setPendingSendMailMinutes(sendableMinutes)
    setSendMailVisible(true)
  }, [getSelectedMinutes, t])

  const closeSendMailPopup = useCallback(() => {
    if (actionLoading) {
      return
    }

    setSendMailVisible(false)
    setPendingSendMailMinutes([])
  }, [actionLoading])

  const handleConfirmSendMail = useCallback(
    async (request: EInvoiceMinuteSendMailRequest) => {
      if (request.items.length === 0) {
        notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
        return
      }

      setActionLoading(true)
      try {
        const response = await sendEInvoiceMinuteMail({
          items: request.items.map((item) => ({
            bbanId: item.bbanId,
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
        setPendingSendMailMinutes([])
        await refetch()
      } catch (error) {
        notify(getApiErrorMessage(error, t("SEND_MAIL_FAILED", "Send mail failed")), "error", 5000)
      } finally {
        setActionLoading(false)
      }
    },
    [refetch, t],
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
          shortcutsEnabled={!popupVisible && !certificatePopupVisible && !xmlPopupVisible && !setupPopupVisible && !sendMailVisible}
        />

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <EInvoiceTableShell className="h-full">
            <PageGrid<EInvoiceMinute>
              dataSource={rows}
              keyExpr="BBAN_ID"
              screenCd={screenCd}
              gridId="einvoice-minute-grid"
              copyExcludeFields={COPY_EXCLUDE_FIELDS}
              wordWrapEnabled={false}
              onAdd={openCreate}
              onInitialized={handleGridInitialized}
              onSelectionChanged={handleSelectionChanged}
              onRowDblClick={handleRowDblClick}
              onContextMenuUpdate={openEdit}
              onContextMenuCopy={handleContextMenuCopyAction}
              selectMode="multiple"
              showPager={true}
              defaultPageSize={20}
            >
              <Column dataField="SBBAN" caption={t("SBBAN", "Số biên bản")} width={150} fixed={true} fixedPosition="left" />
              <Column dataField="NBBAN" caption={t("NBBAN", "Ngày biên bản")} dataType="date" format="dd/MM/yyyy" width={125} />
              <Column
                name="MINUTE_PARTY_SUMMARY"
                caption={t("BBAN_PARTY_SUMMARY", "Đối tượng")}
                minWidth={260}
                calculateCellValue={(row: EInvoiceMinute) => formatMinutePartySummaryText(row)}
                cellRender={renderPartySummaryCell}
              />
              <Column
                name="MINUTE_INVOICE_REF_SUMMARY"
                caption={t("BBAN_INVOICE_REF", "Hóa đơn liên quan")}
                minWidth={180}
                calculateCellValue={(row: EInvoiceMinute) => formatMinuteInvoiceRefSummaryText(row)}
                cellRender={renderInvoiceRefSummaryCell}
              />
              <Column
                name="MINUTE_STATUS_SUMMARY"
                caption={t("STATUS_SUMMARY", "Trạng thái")}
                width={190}
                alignment="center"
                calculateCellValue={(row: EInvoiceMinute) =>
                  formatMinuteStatusSummary(row, minuteTypeOptions, minuteSignStatusOptions, minuteMailStatusOptions)
                }
                cellRender={renderMinuteStatusSummaryCell}
              />
            </PageGrid>
          </EInvoiceTableShell>

          <LoadPanel visible={loading} showIndicator={true} showPane={true} shading={true} shadingColor="rgba(0, 0, 0, 0.15)" />
        </div>

        <Suspense fallback={null}>
          {popupVisible ? (
            <EInvoiceMinuteEditorPopup
              visible={popupVisible}
              companyCd={companyCd}
              minuteId={editingMinuteId}
              initialMinute={initialMinute}
              onClose={closePopup}
              onSaved={handleEditorSaved}
            />
          ) : null}

          {xmlPopupVisible ? (
            <EInvoiceMinuteXmlPopup
              visible={xmlPopupVisible}
              title={xmlTitle}
              xml={xmlText}
              onClose={() => setXmlPopupVisible(false)}
            />
          ) : null}

          {certificateSelectPopup}

          {sendMailVisible ? (
            <EInvoiceMinuteSendMailPopup
              visible={sendMailVisible}
              minutes={pendingSendMailMinutes}
              loading={actionLoading}
              onClose={closeSendMailPopup}
              onConfirm={handleConfirmSendMail}
            />
          ) : null}

          {setupPopupVisible ? setupPopup : null}
        </Suspense>
      </div>
    </DxPage>
  )
}
