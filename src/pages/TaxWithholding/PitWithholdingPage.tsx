import { downloadBlobFile } from "@/lib/fileUtils"
import { Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
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
import PitTransmissionPopup from "./components/PitTransmissionPopup"
import { pitApi } from "./api"
import { pitIncomePayerApi } from "./pitIncomePayerApi"
import { pitXslApi } from "./pitXslApi"
import { openPitPrintPreview } from "./pitPrintViewer"
import type { PitData, PitDocument, PitKind, PitTransmissionMessage } from "./types"
import "./pit.css"

type GridKey = string | number
type PitGrid = dxDataGrid<PitDocument, GridKey>

const createMonthStart = () => {
  const value = new Date()
  value.setDate(1)
  value.setHours(0, 0, 0, 0)
  return value
}

const createToday = () => {
  const value = new Date()
  value.setHours(0, 0, 0, 0)
  return value
}

export default function PitWithholdingPage({ kind }: { kind: PitKind }) {
  const { translate } = useContext(LanguageContext) as { translate?: (key: string, fallback?: string) => string }
  const t = useCallback((key: string, fallback: string) => translate?.(key, fallback) ?? fallback, [translate])
  const company = getCurrentCompanyCd()
  const queryClient = useQueryClient()
  const gridRef = useRef<PitGrid | null>(null)
  const rowsRef = useRef<PitDocument[]>([])
  const totalRef = useRef(0)
  const [fromDate, setFromDate] = useState<Date | null>(createMonthStart)
  const [toDate, setToDate] = useState<Date | null>(createToday)
  const [keywordDraft, setKeywordDraft] = useState("")
  const [signedDraft, setSignedDraft] = useState<number | null>(null)
  const [cqtDraft, setCqtDraft] = useState<number | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [filters, setFilters] = useState({ fromYmd: formatDateToYmd(createMonthStart()) ?? "", toYmd: formatDateToYmd(createToday()) ?? "", keyword: "", signed: null as number | null, cqtStatus: null as number | null })
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedRows, setSelectedRows] = useState<PitDocument[]>([])
  const [editor, setEditor] = useState<{ document: PitDocument | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [xmlPreview, setXmlPreview] = useState<string | null>(null)
  const [history, setHistory] = useState<PitTransmissionMessage[] | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const schema = useQuery({ queryKey: ["pit-schema", kind], queryFn: () => pitApi.schema(kind), staleTime: Infinity })
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
  const certificates = useQuery({
    queryKey: ["pit-certificate-lookup", company],
    queryFn: async () => (await pitApi.list("certificate")).filter((row) => row.IS_SIGNED === 1),
    enabled: Boolean(editor) && kind === "error-notice",
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

  const refresh = useCallback(async () => {
    setSelectedRows([])
    gridRef.current?.clearSelection()
    await queryClient.invalidateQueries({ queryKey: ["pit", company] })
    await queryClient.invalidateQueries({ queryKey: ["pit-certificate-lookup", company] })
  }, [company, queryClient])

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      notify(getApiErrorMessage(error, "Không thực hiện được thao tác chứng từ"), "error", 6000)
    } finally {
      setBusy(false)
    }
  }, [])

  const { promptIfPluginMissing, setupPopup } = useEInvoiceSigningPluginSetupPrompt()
  const signing = useEInvoiceCertificateSigning<PitDocument>({
    t,
    promptIfPluginMissing,
    onRefresh: refresh,
    setActionLoading: setBusy,
    popupOptions: {
      title: "Ký và gửi chứng từ khấu trừ TNCN",
      targetLabel: "chứng từ",
      confirmText: "Ký và gửi CQT",
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

  const openEdit = useCallback((row: PitDocument) => {
    void run(async () => setEditor({ document: await pitApi.get(kind, row.DOCUMENT_ID) }))
  }, [kind, run])

  const save = async (data: PitData, xslId?: number | null) => {
    await run(async () => {
      await pitApi.save(kind, editor?.document?.DOCUMENT_ID ?? 0, editor?.document?.DOC_VERSION ?? 0, data, kind === "certificate" ? xslId : null)
      setEditor(null)
      await refresh()
      notify("Đã lưu chứng từ", "success", 2500)
    })
  }

  const removeSelected = () => {
    void run(async () => {
      const removable = selectedRows.filter((row) => !row.IS_SIGNED)
      if (!removable.length || !(await confirm(`Xóa ${removable.length} chứng từ chưa ký đã chọn?`, "Xóa chứng từ"))) return
      for (const row of removable) await pitApi.remove(kind, row)
      await refresh()
      notify(`Đã xóa ${removable.length} chứng từ`, "success", 2500)
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

  const openHistory = (row: PitDocument | null = primary) => {
    if (!row) return
    setHistoryLoading(true)
    setHistory([])
    void pitApi.history(kind, row.DOCUMENT_ID)
      .then(setHistory)
      .catch((error) => notify(getApiErrorMessage(error, "Không tải được lịch sử truyền nhận"), "error", 5000))
      .finally(() => setHistoryLoading(false))
  }

  const openPrint = (event?: MouseEvent) => {
    if (!primary) return
    void run(async () => {
      if (event?.ctrlKey) {
        setXmlPreview(await pitApi.xml(kind, primary.DOCUMENT_ID))
        return
      }
      if (!(await openPitPrintPreview(kind, primary.DOCUMENT_ID))) {
        notify("Trình duyệt đã chặn cửa sổ xem trước", "warning", 4000)
      }
    })
  }

  const downloadXml = () => {
    if (!xmlPreview) return
    void downloadBlobFile(new Blob([xmlPreview], { type: "application/xml;charset=utf-8" }), `${kind}-${primary?.DOCUMENT_ID ?? "document"}.xml`)
  }

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
        <GridToolbar
          gridRef={gridRef}
          onAdd={() => setEditor({ document: null })}
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
          afterAddItems={[
            {
              key: "sign",
              text: t("SIGN_SEND_CQT", "Ký và gửi CQT"),
              icon: "key",
              type: "danger",
              hint: unavailableTemplateRows.length
                ? t("PIT_XSL_INACTIVE_HINT", "Mẫu số ký hiệu đã ngừng sử dụng. Mởi chứng từ và chọn mẫu đang hoạt động.")
                : undefined,
              disabled: loading || !unsignedRows.length || unavailableTemplateRows.length > 0,
              onClick: () => void signing.openSigningPopup(unsignedRows),
            },
          ]}
          customItems={[
            {
              key: "edit",
              text: primary?.IS_SIGNED ? t("VIEW", "Xem") : t("EDIT", "Sửa"),
              icon: "edit",
              disabled: loading || !primary,
              onClick: () => primary && openEdit(primary),
            },
            {
              key: "print",
              text: t("PRINT", "In"),
              icon: "print",
              visible: kind === "declaration" || kind === "certificate",
              disabled: loading || !primary,
              onClick: openPrint,
            },
            {
              key: "xml",
              text: "XML",
              icon: "codeblock",
              visible: kind !== "declaration",
              disabled: loading || !primary,
                onClick: () => primary && void run(async () => setXmlPreview(await pitApi.xml(kind, primary.DOCUMENT_ID))),
            },
            {
              key: "history",
              text: t("TRANSMISSION", "Truyền nhận"),
              icon: "email",
              visible: kind !== "declaration",
              disabled: loading || !primary,
              onClick: () => openHistory(),
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

        {(list.error || schema.error) ? (
          <div role="alert" className="pit-error">
            {getApiErrorMessage(list.error ?? schema.error, t("PIT_LOAD_FAILED", "Không tải được dữ liệu chứng từ"))}
          </div>
        ) : null}

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <EInvoiceTableShell className="h-full">
            <PageGrid<PitDocument>
              dataSource={dataSource}
              keyExpr="DOCUMENT_ID"
              screenCd={location.pathname}
              gridId={`pit-${kind}`}
              selectMode="multiple"
              pagingEnabled
              showPager
              pageSize={pageSize}
              defaultPageSize={DEFAULT_PAGE_SIZE}
              remoteOperations={SERVER_PAGING_REMOTE_OPERATIONS}
              loadPanelEnabled={false}
              wordWrapEnabled
              onInitialized={(event: InitializedEvent<PitDocument, GridKey>) => { gridRef.current = event.component }}
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
                    series={cell.data.SERIES ?? ""}
                    numberLabel={cell.data.DOC_NO ? String(cell.data.DOC_NO).padStart(8, "0") : "Chưa cấp số"}
                    codeLabel={cell.data.MGDDTU}
                  />
                )}
              />
              <Column dataField="DOC_DATE" caption={t("DOC_DATE", "Ngày lập")} dataType="date" format="dd/MM/yyyy" width={110} />
              <Column
                dataField="DISPLAY_NAME"
                caption={kind === "certificate" ? t("INCOME_RECIPIENT", "Người nhận thu nhập") : t("TAX_PAYER", "Người nộp thuế")}
                minWidth={260}
                cellRender={(cell: ColumnCellTemplateData<PitDocument, GridKey>) => (
                  <EInvoicePartyCell name={cell.data.DISPLAY_NAME} meta={cell.data.TAX_CD} error={cell.data.ERROR_MESSAGE} />
                )}
              />
              <Column
                name="STATUS_SUMMARY"
                caption={t("STATUS", "Trạng thái")}
                minWidth={220}
                cellRender={(cell: ColumnCellTemplateData<PitDocument, GridKey>) => <PitStatusCell row={cell.data} />}
              />
              <Column
                name="TRANSMISSION"
                caption={t("TRANSMISSION", "Truyền nhận")}
                width={120}
                alignment="center"
                visible={kind === "declaration"}
                cellRender={(cell: ColumnCellTemplateData<PitDocument, GridKey>) => (
                  <Button
                    text="Xem"
                    icon="email"
                    stylingMode="text"
                    disabled={loading}
                    onClick={() => openHistory(cell.data)}
                  />
                )}
              />
            </PageGrid>
          </EInvoiceTableShell>
          <LoadPanel visible={loading} showIndicator showPane shading shadingColor="rgba(0,0,0,.12)" />
        </div>

        {editor && schema.data ? (
          <PitEditor
            key={`${kind}-${editor.document?.DOCUMENT_ID ?? 0}-${catalog.dataUpdatedAt ?? 0}-${companyInfo.dataUpdatedAt ?? 0}-${incomePayer.dataUpdatedAt ?? 0}`}
            kind={kind}
            schema={schema.data}
            document={editor.document}
            certificates={certificates.data ?? []}
            catalog={catalog.data ?? []}
            companyInfo={companyInfo.data?.data ?? null}
            incomePayer={incomePayer.isSuccess ? incomePayer.data : undefined}
            busy={busy || (kind === "certificate" && (catalog.isLoading || (!editor.document && incomePayer.isLoading))) || (kind !== "certificate" && !editor.document && companyInfo.isLoading)}
            t={t}
            onClose={() => setEditor(null)}
            onSave={save}
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
          title={t("XML_DOCUMENT", "XML chứng từ")}
          width="92vw"
          height="92vh"
          showCloseButton
          onHiding={() => setXmlPreview(null)}
        >
          <div className="pit-preview">
            <Button text={t("DOWNLOAD_XML", "Tải XML")} icon="download" onClick={downloadXml} />
            <pre className="pit-xml-viewer">{xmlPreview}</pre>
          </div>
        </Popup>

        <PitTransmissionPopup
          visible={history !== null}
          loading={historyLoading}
          title={t("PIT_POPUP_TRANSMISSION_TITLE", "Lịch sử truyền nhận CQT")}
          messages={history ?? []}
          onClose={() => setHistory(null)}
        />
        <Suspense fallback={null}>{signing.certificateSelectPopup}{setupPopup}</Suspense>
      </div>
    </DxPage>
  )
}
