import { useCallback, useContext, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Button from "devextreme-react/button"
import NumberBox from "devextreme-react/number-box"
import SelectBox from "devextreme-react/select-box"
import LoadPanel from "devextreme-react/load-panel"
import TextBox from "devextreme-react/text-box"
import { Column } from "devextreme-react/data-grid"
import type dxDataGrid from "devextreme/ui/data_grid"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"
import DxPage from "@/dx/DxPage"
import PageGrid from "@/components/datagrid/PageGrid"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import { useWorkspaceTabs } from "@/components/workspaceTabs/WorkspaceTabs"
import { EInvoiceTableShell } from "@/pages/EInvoice/components/EInvoiceTableShell"
import EInvoiceEditorShell, { EInvoiceEditorSection } from "@/pages/EInvoice/components/EInvoiceEditorShell"
import { createEInvoicePrintToolbarItem } from "@/pages/EInvoice/einvoicePrintToolbar"
import { getApiErrorMessage } from "@/api/apiTypes"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import { LanguageContext } from "@/lib/i18nLoader"
import { pitXslApi, type PitXslTemplate } from "./pitXslApi"
import { openPitXslPreview } from "./pitXslPreviewViewer"
import PitSettingTabs from "./PitSettingTabs"
import { createPopupShortcutWrapperAttr, usePopupShortcutScopeId } from "@/lib/popupShortcutScope"
import usePitSaveShortcut from "./usePitSaveShortcut"
import "./pit.css"

type EditorState = {
  xslId: number
  XSL_CONTENT?: string
  TEMPLATE_NM: string
  SERIES: string
  FROM_DOC_NO: number
  TO_DOC_NO: number | null
}

function emptyEditor(): EditorState {
  const yy = String(new Date().getFullYear()).slice(-2)
  return {
    xslId: 0,
    TEMPLATE_NM: "",
    SERIES: `CT${yy}AA`,
    FROM_DOC_NO: 1,
    TO_DOC_NO: 50,
  }
}

export default function PitXslSettingPage() {
  const { openWorkspacePath } = useWorkspaceTabs()
  const company = getCurrentCompanyCd()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<PitXslTemplate | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [customToNumber, setCustomToNumber] = useState(false)
  const popupScopeId = usePopupShortcutScopeId("pit-xsl-setting")
  usePitSaveShortcut(save, !busy && Boolean(editor), popupScopeId, Boolean(editor), {
    onClose: () => {
      if (!busy) setEditor(null)
    },
  })
  const gridRef = useRef<dxDataGrid<PitXslTemplate, number> | null>(null)
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const list = useQuery({
    queryKey: ["pit-xsl", company],
    queryFn: () => pitXslApi.list(),
  })

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      notify(getApiErrorMessage(error, "Không thực hiện được thao tác mẫu số ký hiệu"), "error", 6000)
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    setSelected(null)
    gridRef.current?.clearSelection?.()
    await queryClient.invalidateQueries({ queryKey: ["pit-xsl", company] })
  }

  async function openEdit(row: PitXslTemplate) {
    await run(async () => {
      const detail = await pitXslApi.get(row.XSL_ID)
      setCustomToNumber(![50, 100, 200].includes(detail.TO_DOC_NO ?? 0))
      setEditor({
        xslId: detail.XSL_ID,
        TEMPLATE_NM: detail.TEMPLATE_NM || "",
        SERIES: detail.SERIES || "",
        FROM_DOC_NO: detail.FROM_DOC_NO || 1,
        TO_DOC_NO: detail.TO_DOC_NO ?? null,
      })
    })
  }

  async function save() {
    if (!editor) return
    if (editor.TO_DOC_NO == null) {
      notify(t("TO_DOC_NO_REQUIRED", "Hãy nhập đến số"), "warning", 3000)
      return
    }
    if (!Number.isInteger(editor.TO_DOC_NO) || editor.TO_DOC_NO < 1 || editor.TO_DOC_NO > 99999999) {
      notify(t("TO_DOC_NO_INVALID", "Đến số phải là số nguyên từ 1 đến 99999999"), "warning", 3000)
      return
    }
    if (editor.xslId === 0 && !editor.XSL_CONTENT?.trim()) {
      notify("Hãy chọn file XSL cho mẫu mới", "warning", 3000)
      return
    }
    const series = editor.SERIES.trim().toUpperCase()
    if (!/^CT\d{2}[A-Z]{2}$/.test(series)) {
      notify("Ký hiệu phải là CT + hai số năm + hai chữ in hoa (ví dụ CT26AA)", "warning", 4000)
      return
    }
    await run(async () => {
      const body = {
        XSL_CONTENT: editor.XSL_CONTENT,
        TEMPLATE_CD: "03/TNCN",
        TEMPLATE_NM: editor.TEMPLATE_NM.trim() || `Chứng từ khấu trừ TNCN · ${series}`,
        SERIES: series,
        FROM_DOC_NO: editor.FROM_DOC_NO || 1,
        TO_DOC_NO: editor.TO_DOC_NO,
      }
      if (editor.xslId > 0) await pitXslApi.update(editor.xslId, body)
      else await pitXslApi.create({ ...body, IS_ACTIVE: 0 })
      setEditor(null)
      await refresh()
      notify("Đã lưu mẫu số ký hiệu", "success", 2500)
    })
  }

  async function remove() {
    if (!selected) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }
    if (!(await confirm("Xóa mẫu số ký hiệu đã chọn? (Không xóa được mẫu mặc định hoặc đã dùng)", "Xóa mẫu số ký hiệu"))) return
    await run(async () => {
      await pitXslApi.remove(selected.XSL_ID)
      await refresh()
      notify("Đã xóa mẫu số ký hiệu", "success", 2500)
    })
  }

  async function preview(row?: PitXslTemplate | null) {
    const id = row?.XSL_ID ?? editor?.xslId ?? selected?.XSL_ID ?? 0
    if (!id) {
      notify("Chọn hoặc lưu mẫu trước khi xem trước", "warning", 3000)
      return
    }
    await run(async () => {
      if (!(await openPitXslPreview(id))) {
        notify("Trình duyệt đã chặn cửa sổ xem trước", "warning", 4000)
      }
    })
  }

  const handleEditTemplate = useCallback(() => {
    if (!selected) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }
    void openEdit(selected)
  }, [selected, t])

  const handleToolbarViewPreview = useCallback(() => {
    if (!selected) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }
    void preview(selected)
  }, [selected, t])

  const openDesigner = useCallback(() => {
    if (!selected?.XSL_ID) {
      notify(t("SELECT_TEMPLATE_FIRST", "Chọn một mẫu trước khi thiết kế"), "warning", 3000)
      return
    }
    const query = new URLSearchParams({ xslId: String(selected.XSL_ID) })
    openWorkspacePath(
      buildAppPath(company, `/pit-withholding/xsl-setting/designer?${query.toString()}`),
      { title: t("DESIGN_PIT_TEMPLATE", "Thiết kế mẫu chứng từ khấu trừ") },
    )
  }, [company, openWorkspacePath, selected, t])

  const templateToolbarItems = useMemo(
    () => [
      {
        key: "edit-template",
        icon: "edit",
        text: t("EDIT", "Sửa"),
        hint: t("EDIT_PIT_TEMPLATE", "Sửa mẫu số ký hiệu"),
        stylingMode: "outlined" as const,
        disabled: busy,
        onClick: handleEditTemplate,
      },
      createEInvoicePrintToolbarItem(t, {
        loading: busy,
        onClick: handleToolbarViewPreview,
        hintKey: "PREVIEW",
        hintFallback: "Xem trước mẫu chứng từ",
      }),
      {
        key: "designer",
        icon: "preferences",
        hint: t("DESIGN_PIT_TEMPLATE", "Thiết kế mẫu chứng từ khấu trừ"),
        stylingMode: "text" as const,
        disabled: busy,
        onClick: openDesigner,
      },
    ],
    [busy, handleEditTemplate, handleToolbarViewPreview, openDesigner, t],
  )

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
        <PitSettingTabs activeTab="xsl" />
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          <GridToolbar
            gridRef={gridRef}
            onAdd={() => {
              setCustomToNumber(false)
              setEditor(emptyEditor())
            }}
            onRefresh={() => void refresh()}
            onDelete={() => void remove()}
            deleteDisabled={busy || !selected || selected.IS_DEFAULT === 1}
            customItems={templateToolbarItems}
            showAdd
            showDelete
            showDateRange={false}
            showImport={false}
            showExportPdf={false}
            shortcutsEnabled={!editor}
          />
          {list.error && (
            <p role="alert" className="pit-error">
              {getApiErrorMessage(list.error, "Không tải được danh mục mẫu số ký hiệu")}
            </p>
          )}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <EInvoiceTableShell className="h-full">
              <PageGrid<PitXslTemplate>
                dataSource={list.data ?? []}
                keyExpr="XSL_ID"
                screenCd="/pit-withholding/xsl-setting"
                gridId="pit-xsl-setting"
                selectMode="single"
                onInitialized={(event) => {
                  gridRef.current = (event.component as dxDataGrid<PitXslTemplate, number> | undefined) ?? null
                }}
                onSelectionChanged={(e) => setSelected((e.selectedRowsData[0] as PitXslTemplate) ?? null)}
                onRowDblClick={(e) => {
                  if (e.data && !busy) void openEdit(e.data)
                }}
                defaultPageSize={20}
                showPager
              >
                <Column dataField="SERIES" caption={t("SERIES", "Ký hiệu")} width={110} />
                <Column dataField="TEMPLATE_NM" caption={t("TEMPLATE_NAME", "Tên mẫu")} minWidth={220} />
                <Column dataField="FROM_DOC_NO" caption={t("FROM_DOC_NO", "Từ số")} width={90} />
                <Column dataField="TO_DOC_NO" caption={t("TO_DOC_NO", "Đến số")} width={90} />
              </PageGrid>
            </EInvoiceTableShell>
            <LoadPanel visible={busy || list.isLoading || list.isFetching} showIndicator showPane shading />
          </div>
        </div>

        <EInvoiceEditorShell
          visible={Boolean(editor)}
          wrapperAttr={createPopupShortcutWrapperAttr(popupScopeId)}
          title={editor && editor.xslId > 0 ? "Sửa mẫu số ký hiệu 03/TNCN" : "Thêm mẫu số ký hiệu 03/TNCN"}
          width="min(680px, 96vw)"
          height="min(430px, 92vh)"
          loading={busy}
          closeDisabled={busy}
          onClose={() => setEditor(null)}
          onHiding={(event) => {
            if (busy) {
              event.cancel = true
              return
            }
            setEditor(null)
          }}
          footer={
            <>
              <Button text={t("CLOSE", "Đóng")} disabled={busy} onClick={() => setEditor(null)} />
              <Button
                text={t("PREVIEW", "Xem trước")}
                icon="eyeopen"
                disabled={busy || !editor || editor.xslId <= 0}
                onClick={() => void preview()}
              />
              <Button
                text={t("SAVE", "Lưu")}
                icon="save"
                type="default"
                stylingMode="contained"
                disabled={busy}
                onClick={() => void save()}
              />
            </>
          }
        >
          {editor && (
            <div className="pit-editor">
                {editor.xslId === 0 && <label className="block mb-3">
                  File mẫu XSL
                  <input type="file" accept=".xsl,.xslt" disabled={busy} onChange={async event => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    if (file.size > 10 * 1024 * 1024) { notify("File XSL tối đa 10 MB", "warning", 3000); return }
                    const content = await file.text()
                    setEditor(current => current ? { ...current, XSL_CONTENT: content } : current)
                  }} />
                </label>}
              <EInvoiceEditorSection title={t("PIT_TEMPLATE_INFO", "Thông tin mẫu")}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label>
                    Mẫu số
                    <TextBox value="03/TNCN" readOnly />
                  </label>
                  <label>
                    Ký hiệu *
                    <TextBox
                      value={editor.SERIES}
                      maxLength={6}
                      onValueChanged={(e) => setEditor({ ...editor, SERIES: String(e.value ?? "").toUpperCase() })}
                    />
                  </label>
                  <label className="sm:col-span-2">
                    Tên mẫu
                    <TextBox
                      value={editor.TEMPLATE_NM}
                      placeholder={`Chứng từ khấu trừ TNCN · ${editor.SERIES}`}
                      onValueChanged={(e) => setEditor({ ...editor, TEMPLATE_NM: String(e.value ?? "") })}
                    />
                  </label>
                  <label>
                    Từ số
                    <NumberBox
                      value={editor.FROM_DOC_NO}
                      min={1}
                      max={99999999}
                      showSpinButtons
                      onValueChanged={(e) => setEditor({ ...editor, FROM_DOC_NO: Number(e.value) || 1 })}
                    />
                  </label>
                  <label>
                    Đến số *
                    <SelectBox
                      dataSource={[
                        { value: 50, text: "50" },
                        { value: 100, text: "100" },
                        { value: 200, text: "200" },
                        { value: "other", text: t("OTHER", "Khác") },
                      ]}
                      value={customToNumber ? "other" : editor.TO_DOC_NO}
                      valueExpr="value"
                      displayExpr="text"
                      disabled={busy}
                      onValueChanged={(e) => {
                        if (!e.event) return
                        const custom = e.value === "other"
                        setCustomToNumber(custom)
                        setEditor({ ...editor, TO_DOC_NO: custom ? null : Number(e.value) })
                      }}
                    />
                    {customToNumber && (
                      <div className="mt-2">
                        <NumberBox
                          value={editor.TO_DOC_NO ?? undefined}
                          min={1}
                          max={99999999}
                          placeholder={t("TO_DOC_NO_REQUIRED", "Hãy nhập đến số")}
                          disabled={busy}
                          inputAttr={{ "aria-label": t("TO_DOC_NO", "Đến số"), "aria-required": "true" }}
                          onValueChanged={(e) =>
                            setEditor({
                              ...editor,
                              TO_DOC_NO: e.value == null || e.value === "" ? null : Number(e.value),
                            })
                          }
                        />
                      </div>
                    )}
                  </label>
                </div>
              </EInvoiceEditorSection>
            </div>
          )}
        </EInvoiceEditorShell>
      </div>
    </DxPage>
  )
}
