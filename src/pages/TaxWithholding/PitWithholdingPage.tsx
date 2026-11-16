import { downloadBlobFile } from "@/lib/fileUtils"
import { Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import LoadPanel from "devextreme-react/load-panel"
import Popup from "devextreme-react/popup"
import SelectBox from "devextreme-react/select-box"
import Button from "devextreme-react/button"
import { Column } from "devextreme-react/data-grid"
import type dxDataGrid from "devextreme/ui/data_grid"
import type {
  ColumnCellTemplateData,
  InitializedEvent,
  OptionChangedEvent,
  RowDblClickEvent,
  SelectionChangedEvent,
} from "devextreme/ui/data_grid"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"
import DxPage from "@/dx/DxPage"
import PageGrid from "@/components/datagrid/PageGrid"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import { LanguageContext } from "@/lib/i18nLoader"
import { createCurrentMonthDateRange } from "@/lib/dateRangeDefaults"
import { getCurrentCompanyCd } from "@/lib/login"
import { getCompanyInfo } from "@/api/companyInfoApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { signXmlWithPlugin } from "@/api/einvoiceSigningPluginApi"
import {
  DEFAULT_PAGE_SIZE,
  SERVER_PAGING_REMOTE_OPERATIONS,
  createMirrorPagedStore,
} from "@/lib/paging"
import { useEInvoiceCertificateSigning } from "@/pages/EInvoice/hooks/useEInvoiceCertificateSigning"
import { useEInvoiceSigningPluginSetupPrompt } from "@/pages/EInvoice/hooks/useEInvoiceSigningPluginSetupPrompt"
import { EInvoiceTableShell } from "@/pages/EInvoice/components/EInvoiceTableShell"
import { EInvoiceDocNoCell, EInvoicePartyCell } from "@/pages/EInvoice/components/einvoiceTableUi"
import { formatDateToYmd } from "@/pages/Accounting/accountingDateUtils"
import PitEditor from "./PitEditor"
import PitStatusCell from "./components/PitStatusCell"
import PitSendMailPopup from "./components/PitSendMailPopup"
import EInvoiceMailHistoryPopup from "@/pages/EInvoice/components/EInvoiceMailHistoryPopup"
import PitTransmissionPopup from "./components/PitTransmissionPopup"
import { pitApi } from "./api"
import { pitIncomePayerApi } from "./pitIncomePayerApi"
import { pitXslApi } from "./pitXslApi"
import { openPitPrintPreview } from "./pitPrintViewer"
import { createPitDocumentCopy, PIT_COPY_EXCLUDE_FIELDS } from "./pitDocumentModel"
import type { PitDocument, PitKind } from "./types"
import { pitDocumentLabel, pitXmlFileName, type PitRowAction } from "./pitRowActions"
import "./pit.css"
import { formatPitMessage } from "./pitMessages"

type GridKey = string | number
type PitGrid = dxDataGrid<PitDocument, GridKey>
type PitEditorState = { document: PitDocument | null; instanceKey: string }

export default function PitWithholdingPage({ kind }: { kind: PitKind }) {
  const { translate } = useContext(LanguageContext) as { translate?: (key: string, fallback?: string) => string }
  const t = useCallback((key: string, fallback: string) => translate?.(key, fallback) ?? fallback, [translate])
  const company = getCurrentCompanyCd()
  const queryClient = useQueryClient()
  const gridRef = useRef<PitGrid | null>(null)
  const rowsRef = useRef<PitDocument[]>([])
  const totalRef = useRef(0)
  const [fromDate, setFromDate] = useState<Date | null>(() => createCurrentMonthDateRange().fromDate)
  const [toDate, setToDate] = useState<Date | null>(() => createCurrentMonthDateRange().toDate)
  const [keywordDraft, setKeywordDraft] = useState("")
  const [signedDraft, setSignedDraft] = useState<number | null>(null)
  const [cqtDraft, setCqtDraft] = useState<number | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [filters, setFilters] = useState({ fromYmd: formatDateToYmd(createCurrentMonthDateRange().fromDate) ?? "", toYmd: formatDateToYmd(createCurrentMonthDateRange().toDate) ?? "", keyword: "", signed: null as number | null, cqtStatus: null as number | null })
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedRows, setSelectedRows] = useState<PitDocument[]>([])
  const [editor, setEditor] = useState<PitEditorState | null>(null)
  const [busy, setBusy] = useState(false)
  const actionLock = useRef(false)
  const [xmlPreview, setXmlPreview] = useState<{ row: PitDocument; xml: string } | null>(null)
  const [historyRow, setHistoryRow] = useState<PitDocument | null>(null)
  const [mailHistoryRow, setMailHistoryRow] = useState<PitDocument | null>(null)
  const [mailRow, setMailRow] = useState<PitDocument | null>(null)
  const history = useQuery({
    queryKey: ["pit-transmission", company, kind, historyRow?.DOCUMENT_ID],
    queryFn: () => pitApi.history(kind, historyRow!.DOCUMENT_ID),
    enabled: Boolean(historyRow),
    staleTime: 0,
  })
  const mailHistory = useQuery({
    queryKey: ["pit-mail-history", company, kind, mailHistoryRow?.DOCUMENT_ID],
    queryFn: () => pitApi.mailHistory(kind, mailHistoryRow!.DOCUMENT_ID),
    enabled: Boolean(mailHistoryRow),
    staleTime: 0,
  })

  const list = useQuery({
    queryKey: ["pit", company, kind, filters, pageNumber, pageSize],
    queryFn: () => pitApi.listPaged(kind, {
      ...filters,
      signed: filters.signed ?? undefined,
      cqtStatus: filters.cqtStatus ?? undefined,
      pageNumber,
      pageSize,
    }),
  })
  const companyInfo = useQuery({
    queryKey: ["pit-company-info", company],
    queryFn: () => getCompanyInfo(company),
    enabled: Boolean(editor) && !editor?.document && kind !== "certificate",
    staleTime: Infinity,
  })
  const incomePayer = useQuery({
    queryKey: ["pit-income-payer", company],
    queryFn: pitIncomePayerApi.get,
    enabled: Boolean(editor) && !editor?.document && kind === "certificate",
    staleTime: Infinity,
  })
  const catalog = useQuery({
    queryKey: ["pit-xsl", company],
    queryFn: () => pitXslApi.list(),
    enabled: kind === "certificate",
  })

  const dataSource = useMemo(
    () => createMirrorPagedStore<PitDocument>("DOCUMENT_ID", () => rowsRef.current, () => totalRef.current),
    [],
  )

  useEffect(() => {
    rowsRef.current = list.data?.data ?? []
    totalRef.current = list.data?.totalRecords ?? 0
    void gridRef.current?.getDataSource()?.reload()
  }, [list.data])

  const closeEditorAfterSignRef = useRef(false)

  const refresh = useCallback(async () => {
    setSelectedRows([])
    gridRef.current?.clearSelection()
    await queryClient.invalidateQueries({ queryKey: ["pit", company] })
    await queryClient.invalidateQueries({ queryKey: ["pit-certificate-lookup", company] })
  }, [company, queryClient])

  const refreshAfterSign = useCallback(async () => {
    await refresh()
    if (!closeEditorAfterSignRef.current) {
      return
    }
    closeEditorAfterSignRef.current = false
    setEditor(null)
  }, [refresh])

  const run = useCallback(async (action: () => Promise<void>) => {
    if (actionLock.current) return
    actionLock.current = true
    setBusy(true)
    try {
      await action()
    } catch (error) {
      notify(getApiErrorMessage(error, t("PIT_ACTION_FAILED", "Không thực hiện được thao tác chứng từ")), "error", 6000)
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }, [t])

  const { promptIfPluginMissing, setupPopup } = useEInvoiceSigningPluginSetupPrompt()
  const signing = useEInvoiceCertificateSigning<PitDocument>({
    t,
    promptIfPluginMissing,
    onRefresh: refreshAfterSign,
    setActionLoading: setBusy,
    popupOptions: {
      title: t("PIT_SIGN_SEND_TITLE", "Ký và gửi chứng từ khấu trừ TNCN"),
      targetLabel: t("PIT_SIGN_TARGET", "chứng từ"),
      confirmText: t("SIGN_SEND_CQT", "Ký và gửi CQT"),
    },
    signBatch: async (items, thumbprint) => {
      let count = 0
      for (const row of items) {
        const payload = await pitApi.prepare(kind, row.DOCUMENT_ID)
        const signed = await signXmlWithPlugin({
          requestId: `pit-${kind}-${row.DOCUMENT_ID}-${Date.now()}`,
          companyCd: company,
          certificateThumbprint: thumbprint,
          xml: payload.RAW_XML,
          signType: "PIT",
        })
        await pitApi.sign(kind, row.DOCUMENT_ID, payload.DOC_VERSION, signed.signedXml)
        count += 1
      }
      return count
    },
  })

  const primary = selectedRows[0] ?? null
  const unsignedRows = selectedRows.filter((row) => !row.IS_SIGNED)
  const unavailableTemplateRows = kind === "certificate"
    ? unsignedRows.filter((row) => !catalog.data?.some(
      (template) =>
        template.IS_ACTIVE === 1 &&
        template.XSL_ID === row.XSL_ID,
    ))
    : []
  const catalogLoading = kind === "certificate" && (catalog.isLoading || catalog.isFetching)
  const loading = busy || list.isLoading || list.isFetching || catalogLoading

  const openEditor = useCallback((document: PitDocument | null, instanceKey?: string) => {
    setEditor({
      document,
      instanceKey: instanceKey ?? `${document?.DOCUMENT_ID ?? 0}-${Date.now()}`,
    })
  }, [])

  const openEdit = useCallback((row: PitDocument) => {
    void run(async () => openEditor(await pitApi.get(kind, row.DOCUMENT_ID)))
  }, [kind, openEditor, run])

  const openCopy = useCallback((row: PitDocument) => {
    if (!row.DOCUMENT_ID) return
    void run(async () => {
      const detail = await pitApi.get(kind, row.DOCUMENT_ID)
      openEditor(createPitDocumentCopy(detail), `copy-${row.DOCUMENT_ID}-${Date.now()}`)
    })
  }, [kind, openEditor, run])

  const handleContextMenuCopy = useCallback((row: PitDocument) => {
    openCopy(row)
  }, [openCopy])

  const save = async (data: PitDocument, xslId?: number | null) => {
    await run(async () => {
      await pitApi.save({ ...data, KIND: kind, XSL_ID: kind === "certificate" ? xslId : null })
      setEditor(null)
      await refresh()
      notify(t("PIT_SAVE_SUCCESS", "Đã lưu chứng từ"), "success", 2500)
    })
  }

  const removeSelected = () => {
    void run(async () => {
      const removable = selectedRows.filter((row) => !row.IS_SIGNED)
      if (!removable.length || !(await confirm(formatPitMessage(t("PIT_DELETE_CONFIRM", "Xóa {0} chứng từ chưa ký đã chọn?"), removable.length), t("PIT_DELETE_TITLE", "Xóa chứng từ")))) return
      for (const row of removable) await pitApi.remove(kind, row)
      await refresh()
      notify(formatPitMessage(t("PIT_DELETE_SUCCESS", "Đã xóa {0} chứng từ"), removable.length), "success", 2500)
    })
  }

  const applySearch = useCallback(() => {
    setPageNumber(1)
    setFilters({
      fromYmd: formatDateToYmd(fromDate) ?? "",
      toYmd: formatDateToYmd(toDate) ?? "",
      keyword: keywordDraft.trim(),
      signed: signedDraft,
      cqtStatus: cqtDraft,
    })
  }, [cqtDraft, fromDate, keywordDraft, signedDraft, toDate])

  const openPrint = (row: PitDocument, event?: MouseEvent) => {
    void run(async () => {
      if (event?.ctrlKey) {
        setXmlPreview({ row, xml: await pitApi.xml(kind, row.DOCUMENT_ID) })
        return
      }
      if (!(await openPitPrintPreview(kind, row.DOCUMENT_ID))) {
        notify(t("PIT_PREVIEW_BLOCKED", "Trình duyệt đã chặn cửa sổ xem trước"), "warning", 4000)
      }
    })
  }

  const downloadXml = () => {
    if (!xmlPreview) return
    void downloadBlobFile(new Blob([xmlPreview.xml], { type: "application/xml;charset=utf-8" }), pitXmlFileName(xmlPreview.row))
  }

  const onRowAction = (row: PitDocument, action: PitRowAction) => {
    if (loading || actionLock.current) return
    if (action === "transmission-history") setHistoryRow(row)
    if (action === "mail-history") setMailHistoryRow(row)
    if (action === "print") openPrint(row)
    if (action === "download-xml") void run(async () => {
      const xml = await pitApi.xml(kind, row.DOCUMENT_ID)
      await downloadBlobFile(new Blob([xml], { type: "application/xml;charset=utf-8" }), pitXmlFileName(row))
    })
    if (action === "send-mail" && row.IS_SIGNED) void run(async () => {
      setMailRow(await pitApi.get(kind, row.DOCUMENT_ID))
    })
  }
  // DevExtreme can retain the first cell template callback after the page changes.
  // Forward through a stable function so row actions always see current loading state.
  const rowActionRef = useRef(onRowAction)
  rowActionRef.current = onRowAction
  const dispatchRowAction = useCallback((row: PitDocument, action: PitRowAction) => {
    rowActionRef.current(row, action)
  }, [])

  const sendMail = (toEmail: string) => {
    if (!mailRow) return
    const row = mailRow
    void run(async () => {
      const result = await pitApi.sendMail(kind, row.DOCUMENT_ID, toEmail)
      if (!result.Sent) throw new Error(t("PIT_MAIL_FAILED", "Không gửi được mail"))
      setMailRow(null)
      notify(result.Warning || t("PIT_MAIL_SENT", "Đã gửi mail chứng từ"), result.HistorySaved ? "success" : "warning", 6000)
      await queryClient.invalidateQueries({ queryKey: ["pit-mail-history", company, kind, row.DOCUMENT_ID] })
    })
  }

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
        <GridToolbar
          gridRef={gridRef}
          onAdd={() => openEditor(null)}
          onRefresh={() => void refresh()}
          onDelete={removeSelected}
          deleteDisabled={!selectedRows.length || selectedRows.some((row) => Boolean(row.IS_SIGNED))}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          showDateRange
          onRangeSearch={applySearch}
          showSearch
          onSearchStateChange={(value) => setKeywordDraft(value)}
          onSearchSubmit={applySearch}
          showAdvancedSearchToggle={kind !== "declaration"}
          advancedSearchOpen={advancedOpen}
          onToggleAdvancedSearch={() => setAdvancedOpen((value) => !value)}
          showImport={false}
          showExportPdf={false}
          showExportXlsx={false}
          shortcutsEnabled={!editor}
          additionalShortcutActions={[SHORTCUT_ACTIONS.PRINT]}
          additionalShortcutHandlers={{
            [SHORTCUT_ACTIONS.PRINT]: () => {
              if (primary) openPrint(primary)
            },
          }}
          additionalShortcutOptions={{
            [SHORTCUT_ACTIONS.PRINT]: { enabled: !loading && Boolean(primary) },
          }}
          afterAddItems={[
            {
              key: "sign",
              text: t("SIGN_SEND_CQT", "Ký và gửi CQT"),
              icon: "key",
              type: "danger",
              hint: unavailableTemplateRows.length
                ? t("PIT_XSL_INACTIVE_HINT", "Mẫu số ký hiệu đã ngừng sử dụng. Mở chứng từ và chọn mẫu đang hoạt động.")
                : undefined,
              disabled: loading || !unsignedRows.length || unavailableTemplateRows.length > 0,
              onClick: () => {
                closeEditorAfterSignRef.current = false
                void signing.openSigningPopup(unsignedRows)
              },
            },
          ]}
          customItems={[
            {
              key: "print",
              text: t("PRINT", "In"),
              icon: "print",
              hint: t("PIT_PRINT_XML_HINT", "Giữ Ctrl và nhấn In để xem XML"),
              disabled: loading || !primary,
              onClick: (event) => { if (primary) openPrint(primary, event) },
            },
          ]}
        />

        {kind !== "declaration" && advancedOpen ? (
          <div className="pit-advanced-search">
            <SelectBox
              label={t("SIGN_STATUS", "Trạng thái ký")}
              labelMode="floating"
              dataSource={[
                { value: null, text: t("ALL", "Tất cả") },
                { value: 0, text: t("UNSIGNED", "Chưa ký") },
                { value: 1, text: t("SIGNED", "Đã ký") },
              ]}
              valueExpr="value"
              displayExpr="text"
              value={signedDraft}
              onValueChanged={(event) => setSignedDraft(event.value ?? null)}
            />
            <SelectBox
              label={t("CQT_STATUS", "Kết quả CQT")}
              labelMode="floating"
              dataSource={[
                { value: null, text: t("ALL", "Tất cả") },
                { value: 0, text: t("NOT_SENT", "Chưa gửi") },
                { value: 1, text: t("WAITING_RESPONSE", "Chờ phản hồi") },
                { value: 2, text: t("ACCEPTED", "Chấp nhận") },
                { value: 3, text: t("REJECTED", "Không chấp nhận") },
              ]}
              valueExpr="value"
              displayExpr="text"
              value={cqtDraft}
              onValueChanged={(event) => setCqtDraft(event.value ?? null)}
            />
            <Button text={t("APPLY", "Áp dụng")} icon="filter" type="default" stylingMode="contained" onClick={applySearch} />
          </div>
        ) : null}

        {list.error ? (
          <div role="alert" className="pit-error">
            {getApiErrorMessage(list.error, t("PIT_LOAD_FAILED", "Không tải được dữ liệu chứng từ"))}
          </div>
        ) : null}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <EInvoiceTableShell className="h-full">
            <PageGrid<PitDocument>
              dataSource={dataSource}
              keyExpr="DOCUMENT_ID"
              screenCd={location.pathname}
              gridId={`pit-${kind}`}
              runtimeColumnVisibility={{ controlledColumnVisibility: { TRANSMISSION: false } }}
              selectMode="multiple"
              pagingEnabled
              showPager
              pageSize={pageSize}
              defaultPageSize={DEFAULT_PAGE_SIZE}
              remoteOperations={SERVER_PAGING_REMOTE_OPERATIONS}
              loadPanelEnabled={false}
              wordWrapEnabled
              copyExcludeFields={[...PIT_COPY_EXCLUDE_FIELDS]}
              onContextMenuCopy={handleContextMenuCopy}
              onContextMenuUpdate={openEdit}
              onInitialized={(event: InitializedEvent<PitDocument, GridKey>) => { gridRef.current = event.component ?? null }}
              onSelectionChanged={(event: SelectionChangedEvent<PitDocument, GridKey>) => setSelectedRows(event.selectedRowsData ?? [])}
              onRowDblClick={(event: RowDblClickEvent<PitDocument, GridKey>) => event.data && openEdit(event.data)}
              onOptionChanged={(event: OptionChangedEvent<PitDocument, GridKey>) => {
                if (loading) return
                if (event.fullName === "paging.pageIndex") setPageNumber(Number(event.value ?? 0) + 1)
                if (event.fullName === "paging.pageSize") {
                  setPageSize(Number(event.value ?? DEFAULT_PAGE_SIZE))
                  setPageNumber(1)
                }
              }}
            >
              <Column
                name="PIT_DOC_NO"
                caption={t("PIT_DOC_NO", "Ký hiệu / Số")}
                width={155}
                fixed
                fixedPosition="left"
                visible={kind === "certificate"}
                cellRender={(cell: ColumnCellTemplateData<PitDocument, GridKey>) => (
                  <EInvoiceDocNoCell
                    series={cell.data?.SERIES ?? ""}
                    numberLabel={cell.data?.DOC_NO ? String(cell.data.DOC_NO).padStart(8, "0") : t("PIT_NO_NUMBER", "Chưa cấp số")}
                    codeLabel={cell.data?.MGDDTU ?? undefined}
                  />
                )}
              />
              <Column dataField="DOC_DATE" caption={t("DOC_DATE", "Ngày lập")} dataType="date" format="dd/MM/yyyy" width={110} />
              <Column
                dataField="DISPLAY_NAME"
                caption={kind === "certificate" ? t("INCOME_RECIPIENT", "Người nhận thu nhập") : t("TAX_PAYER", "Người nộp thuế")}
                minWidth={260}
                cellRender={(cell: ColumnCellTemplateData<PitDocument, GridKey>) => (
                  <EInvoicePartyCell name={cell.data?.DISPLAY_NAME ?? ""} meta={cell.data?.TAX_CD} error={cell.data?.ERROR_MESSAGE ?? undefined} />
                )}
              />
              <Column
                name="STATUS_SUMMARY"
                caption={t("STATUS", "Trạng thái")}
                minWidth={220}
                cellRender={(cell: ColumnCellTemplateData<PitDocument, GridKey>) => cell.data ? <PitStatusCell row={cell.data} disabled={loading} onAction={dispatchRowAction} /> : null}
              />
            </PageGrid>
          </EInvoiceTableShell>
          <LoadPanel visible={loading} showIndicator showPane shading shadingColor="rgba(0,0,0,.12)" />
        </div>

        {editor ? (
          <PitEditor
            key={`${kind}-${editor.instanceKey}-${catalog.dataUpdatedAt ?? 0}-${companyInfo.dataUpdatedAt ?? 0}-${incomePayer.dataUpdatedAt ?? 0}`}
            kind={kind}
            document={editor.document}
            catalog={catalog.data ?? []}
            companyInfo={companyInfo.data?.data ?? null}
            incomePayer={incomePayer.isSuccess ? incomePayer.data : undefined}
            busy={busy || (kind === "certificate" && (catalog.isLoading || (!editor.document && incomePayer.isLoading))) || (kind !== "certificate" && !editor.document && companyInfo.isLoading)}
            t={t}
            onClose={() => setEditor(null)}
            onSave={save}
            onSign={async (doc) => {
              closeEditorAfterSignRef.current = true
              try {
                const opened = await signing.openSigningPopup([doc])
                if (!opened) {
                  closeEditorAfterSignRef.current = false
                }
              } catch (error) {
                closeEditorAfterSignRef.current = false
                if (await promptIfPluginMissing(error)) {
                  return
                }
                notify(getApiErrorMessage(error, t("SIGN_FAILED", "Sign XML failed")), "error", 5000)
              }
            }}
            onPickCertificate={(callback) => void signing.openCertificatePicker({
              onPick: callback,
              popupOptions: {
                compact: true,
                title: t("CERTIFICATE_SELECT", "Select digital certificate"),
                confirmText: t("ADD", "Add"),
                confirmIcon: "plus",
              },
            })}
          />
        ) : null}

        <Popup
          visible={Boolean(xmlPreview)}
          title={`${t("XML_DOCUMENT", "XML chứng từ")} - ${xmlPreview ? pitDocumentLabel(xmlPreview.row) : ""}`}
          width="92vw"
          height="92vh"
          showCloseButton
          onHiding={() => setXmlPreview(null)}
        >
          <div className="pit-preview">
            <Button text={t("DOWNLOAD_XML", "Tải XML")} icon="download" onClick={downloadXml} />
            <pre className="pit-xml-viewer">{xmlPreview?.xml}</pre>
          </div>
        </Popup>

        <PitTransmissionPopup
          visible={Boolean(historyRow)}
          loading={history.isFetching}
          title={`${t("PIT_POPUP_TRANSMISSION_TITLE", "Lịch sử truyền nhận CQT")} - ${historyRow ? pitDocumentLabel(historyRow) : ""}`}
          messages={history.data ?? []}
          error={history.error ? getApiErrorMessage(history.error, t("PIT_HISTORY_FAILED", "Không tải được lịch sử truyền nhận")) : undefined}
          onClose={() => setHistoryRow(null)}
        />
        <EInvoiceMailHistoryPopup
          visible={Boolean(mailHistoryRow)}
          loading={mailHistory.isFetching}
          title={`${t("MAIL_HISTORY", "Lịch sử gửi mail")} - ${mailHistoryRow ? pitDocumentLabel(mailHistoryRow) : ""}`}
          items={mailHistory.data ?? []}
          error={mailHistory.error ? getApiErrorMessage(mailHistory.error, t("PIT_MAIL_HISTORY_FAILED", "Không tải được lịch sử gửi mail")) : undefined}
          onClose={() => setMailHistoryRow(null)}
        />
        {mailRow ? <PitSendMailPopup key={`${kind}-${mailRow.DOCUMENT_ID}`} row={mailRow} loading={busy} t={t} onClose={() => { if (!actionLock.current) setMailRow(null) }} onConfirm={sendMail} /> : null}
        <Suspense fallback={null}>{signing.certificateSelectPopup}{setupPopup}</Suspense>
      </div>
    </DxPage>
  )
}
