import { useContext, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Button from "devextreme-react/button"
import NumberBox from "devextreme-react/number-box"
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
import { getApiErrorMessage } from "@/api/apiTypes"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import { LanguageContext } from "@/lib/i18nLoader"
import { pitXslApi, type PitXslTemplate } from "./pitXslApi"
import { openPitXslPreview } from "./pitXslPreviewViewer"
import PitSettingTabs from "./PitSettingTabs"
import "./pit.css"

type EditorState = {
  xslId: number
  TEMPLATE_NM: string
  SERIES: string
  FROM_DOC_NO: number
  TO_DOC_NO: number | null
  LOGO_PATH: string
  BACKGROUND_PATH: string
  NEN_PATH: string
}

function emptyEditor(): EditorState {
  const yy = String(new Date().getFullYear()).slice(-2)
  return {
    xslId: 0,
    TEMPLATE_NM: "",
    SERIES: `CT${yy}AA`,
    FROM_DOC_NO: 1,
    TO_DOC_NO: null,
    LOGO_PATH: "",
    BACKGROUND_PATH: "",
    NEN_PATH: "",
  }
}

export default function PitXslSettingPage() {
  const { openWorkspacePath } = useWorkspaceTabs()
  const company = getCurrentCompanyCd()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<PitXslTemplate | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const gridRef = useRef<dxDataGrid<PitXslTemplate, number> | null>(null)
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
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
    await queryClient.invalidateQueries({ queryKey: ["pit-xsl", company] })
  }

  async function openCreate() {
    setEditor(emptyEditor())
  }

  async function openEdit(row: PitXslTemplate) {
    await run(async () => {
      const detail = await pitXslApi.get(row.XSL_ID)
      setEditor({
        xslId: detail.XSL_ID,
        TEMPLATE_NM: detail.TEMPLATE_NM || "",
        SERIES: detail.SERIES || "",
        FROM_DOC_NO: detail.FROM_DOC_NO || 1,
        TO_DOC_NO: detail.TO_DOC_NO ?? null,
        LOGO_PATH: detail.LOGO_PATH || "",
        BACKGROUND_PATH: detail.BACKGROUND_PATH || "",
        NEN_PATH: detail.NEN_PATH || "",
      })
    })
  }

  async function save() {
    if (!editor) return
    const series = editor.SERIES.trim().toUpperCase()
    if (!/^CT\d{2}[A-Z]{2}$/.test(series)) {
      notify("Ký hiệu phải là CT + hai số năm + hai chữ in hoa (ví dụ CT26AA)", "warning", 4000)
      return
    }
    await run(async () => {
      const body = {
        TEMPLATE_CD: "03/TNCN",
        TEMPLATE_NM: editor.TEMPLATE_NM.trim() || `Chứng từ khấu trừ TNCN · ${series}`,
        SERIES: series,
        FROM_DOC_NO: editor.FROM_DOC_NO || 1,
        TO_DOC_NO: editor.TO_DOC_NO && editor.TO_DOC_NO > 0 ? editor.TO_DOC_NO : null,
        LOGO_PATH: editor.LOGO_PATH || null,
        BACKGROUND_PATH: editor.BACKGROUND_PATH || null,
        NEN_PATH: editor.NEN_PATH || null,
      }
      if (editor.xslId > 0) await pitXslApi.update(editor.xslId, body)
      else await pitXslApi.create(body)
      setEditor(null)
      await refresh()
      notify("Đã lưu mẫu số ký hiệu", "success", 2500)
    })
  }

  async function remove() {
    if (!selected) return
    if (!(await confirm("Xóa mẫu số ký hiệu đã chọn? (Không xóa được mẫu mặc định hoặc đã dùng)", "Xóa mẫu số ký hiệu"))) return
    await run(async () => {
      await pitXslApi.remove(selected.XSL_ID)
      await refresh()
      notify("Đã xóa mẫu số ký hiệu", "success", 2500)
    })
  }

  async function upload(kind: "logo" | "background" | "nen", file?: File | null) {
    if (!editor || editor.xslId <= 0) {
      notify("Lưu mẫu trước khi upload ảnh", "warning", 3000)
      return
    }
    if (!file) return
    await run(async () => {
      const result = await pitXslApi.uploadImage(editor.xslId, kind, file)
      setEditor((prev) =>
        prev
          ? {
              ...prev,
              LOGO_PATH: kind === "logo" ? result.PATH : prev.LOGO_PATH,
              BACKGROUND_PATH: kind === "background" ? result.PATH : prev.BACKGROUND_PATH,
              NEN_PATH: kind === "nen" ? result.PATH : prev.NEN_PATH,
            }
          : prev,
      )
      notify("Đã upload ảnh", "success", 2000)
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

  function openDesigner() {
    if (!selected?.XSL_ID) {
      notify("Chọn một mẫu trước khi thiết kế", "warning", 3000)
      return
    }
    const query = new URLSearchParams({ xslId: String(selected.XSL_ID) })
    openWorkspacePath(
      buildAppPath(company, `/pit-withholding/xsl-setting/designer?${query.toString()}`),
      { title: "Thiết kế mẫu chứng từ khấu trừ" },
    )
  }

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
        <PitSettingTabs activeTab="xsl" />
        <GridToolbar
          gridRef={gridRef}
          onAdd={() => void openCreate()}
          onRefresh={() => void refresh()}
          onDelete={() => void remove()}
          deleteDisabled={busy || !selected || selected.IS_DEFAULT === 1}
          showDateRange={false}
          showSearch
          showImport={false}
          showExportPdf={false}
          showExportXlsx={false}
          customItems={[
            {
              key: "edit",
              text: "Sửa",
              icon: "edit",
              disabled: busy || !selected,
              onClick: () => selected && void openEdit(selected),
            },
            {
              key: "preview",
              text: "Xem trước",
              icon: "eyeopen",
              disabled: busy || !selected,
              onClick: () => void preview(selected),
            },
            {
              key: "designer",
              text: "Thiết kế",
              icon: "preferences",
              disabled: busy || !selected,
              onClick: openDesigner,
            },
          ]}
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

        <EInvoiceEditorShell
          visible={Boolean(editor)}
          title={editor && editor.xslId > 0 ? "Sửa mẫu số ký hiệu 03/TNCN" : "Thêm mẫu số ký hiệu 03/TNCN"}
          width="min(680px, 96vw)"
          height={editor && editor.xslId > 0 ? "min(620px, 92vh)" : "min(430px, 92vh)"}
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
                    Đến số
                    <NumberBox
                      value={editor.TO_DOC_NO ?? undefined}
                      min={1}
                      max={99999999}
                      placeholder={t("SERIES_LIMIT_HINT", "Không giới hạn")}
                      showClearButton
                      showSpinButtons
                      onValueChanged={(e) =>
                        setEditor({
                          ...editor,
                          TO_DOC_NO: e.value == null || e.value === "" ? null : Number(e.value),
                        })
                      }
                    />
                  </label>
                </div>
              </EInvoiceEditorSection>
              {editor.xslId > 0 && (
                <EInvoiceEditorSection title={t("PIT_TEMPLATE_IMAGE", "Hình ảnh mẫu in")}>
                  <div className="grid gap-2">
                    <div>
                      Logo: <code>{editor.LOGO_PATH || "(chưa có)"}</code>{" "}
                      <input type="file" accept="image/*" disabled={busy} onChange={(e) => void upload("logo", e.target.files?.[0])} />
                    </div>
                    <div>
                      Background: <code>{editor.BACKGROUND_PATH || "(chưa có)"}</code>{" "}
                      <input type="file" accept="image/*" disabled={busy} onChange={(e) => void upload("background", e.target.files?.[0])} />
                    </div>
                    <div>
                      Nền: <code>{editor.NEN_PATH || "(chưa có)"}</code>{" "}
                      <input type="file" accept="image/*" disabled={busy} onChange={(e) => void upload("nen", e.target.files?.[0])} />
                    </div>
                  </div>
                </EInvoiceEditorSection>
              )}
            </div>
          )}
        </EInvoiceEditorShell>

      </div>
    </DxPage>
  )
}
