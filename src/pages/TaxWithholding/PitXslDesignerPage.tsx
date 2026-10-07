import { useContext, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import SelectBox from "devextreme-react/select-box"
import notify from "devextreme/ui/notify"
import DxPage from "@/dx/DxPage"
import { getApiErrorMessage } from "@/api/apiTypes"
import { downloadBlobFile } from "@/lib/fileUtils"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import {
  applyXslTemplateSettings,
  defaultXslTemplateSettings,
  readXslTemplateSettings,
  type XslTemplateSettings,
} from "@/pages/EInvoice/xslTemplateSettings"
import { LanguageContext } from "@/lib/i18nLoader"
import { pitXslApi, type PitXslTemplate } from "./pitXslApi"
import EInvoiceFtpImagePickerPopup from "@/pages/EInvoice/components/EInvoiceFtpImagePickerPopup"
import type { EInvoiceDesignerImageKind, EInvoiceFtpImageFile } from "@/api/einvoiceSettingApi"

function positiveId(value: unknown) {
  const id = Math.trunc(Number(value ?? 0))
  return Number.isFinite(id) && id > 0 ? id : 0
}

function imageFileLabel(path: string | null | undefined) {
  if (!path?.trim()) return "Chưa chọn"
  const normalized = path.replace(/\\/g, "/")
  return normalized.slice(normalized.lastIndexOf("/") + 1) || path
}

function formatControlValue(value: number, signed: boolean) {
  if (!signed) return String(value)
  if (value > 0) return `+${value}`
  return String(value)
}

function buildPitDesignerPreviewCss(settings: XslTemplateSettings) {
  const italic = settings.fontStyle.includes("italic") ? "italic" : "normal"
  const weight = settings.fontStyle.includes("bold") ? "700" : "normal"
  const backgroundOpacity = settings.backgroundOpacityPercent / 100
  const nenOpacity = settings.nenOpacityPercent / 100
  return [
    `html,body{font-family:"${settings.fontFamily}",Arial,sans-serif!important;color:${settings.fontColor}!important;font-size:${settings.fontSizePx}px!important;font-style:${italic}!important;font-weight:${weight}!important}`,
    `.title{font-size:${settings.titleFontSizePx}px!important;color:${settings.fontColor}!important}`,
    `.logo-img{max-width:${settings.logoMaxSizePx}px!important;max-height:${settings.logoMaxSizePx}px!important;transform:translate(${settings.logoOffsetXPx}px,${settings.logoOffsetYPx}px)!important}`,
    `.page-bg{background-size:${settings.backgroundSizePercent}% auto!important;opacity:${backgroundOpacity}!important;background-position:calc(50% + ${settings.backgroundOffsetXPx}px) calc(50% + ${settings.backgroundOffsetYPx}px)!important}`,
    `.page-nen{background-size:${settings.nenSizePercent}% auto!important;opacity:${nenOpacity}!important;background-position:calc(50% + ${settings.nenOffsetXPx}px) calc(50% + ${settings.nenOffsetYPx}px)!important}`,
    settings.showLabelEn ? "" : `.en,.header-en,.title-en{display:none!important}`,
  ].join("")
}

function toggleFontStyle(current: XslTemplateSettings["fontStyle"], kind: "bold" | "italic"): XslTemplateSettings["fontStyle"] {
  const hasBold = current.includes("bold")
  const hasItalic = current.includes("italic")
  if (kind === "bold") {
    if (hasBold) return hasItalic ? "italic" : "normal"
    return hasItalic ? "bold-italic" : "bold"
  }
  if (hasItalic) return hasBold ? "bold" : "normal"
  return hasBold ? "bold-italic" : "italic"
}

export default function PitXslDesignerPage() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const companyCd = getCurrentCompanyCd()
  const xslId = positiveId(searchParams.get("xslId"))
  const [detail, setDetail] = useState<PitXslTemplate | null>(null)
  const [workingXsl, setWorkingXsl] = useState("")
  const [settings, setSettings] = useState<XslTemplateSettings>(defaultXslTemplateSettings)
  const [previewHtml, setPreviewHtml] = useState("")
  const [loading, setLoading] = useState(false)
  const [imagePicker, setImagePicker] = useState<{ title: string; imageKind: EInvoiceDesignerImageKind; pitKind: "nen" } | null>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const list = useQuery({ queryKey: ["pit-xsl-designer"], queryFn: () => pitXslApi.list() })
  const options = useMemo(
    () =>
      (list.data ?? []).map(row => ({
        XSL_ID: row.XSL_ID,
        LABEL: `${row.SERIES || "Chưa có ký hiệu"} - ${row.TEMPLATE_NM || "Mẫu 03/TNCN"}`,
      })),
    [list.data],
  )
  const canEdit = Boolean(workingXsl.trim()) && !loading

  function selectTemplate(nextXslId: number) {
    const next = new URLSearchParams(searchParams)
    if (nextXslId > 0) next.set("xslId", String(nextXslId))
    else next.delete("xslId")
    const nextSearch = next.toString()
    navigate(
      {
        pathname: buildAppPath(companyCd, "/pit-withholding/xsl-setting/designer"),
        search: nextSearch ? `?${nextSearch}` : "",
        hash: location.hash,
      },
      { replace: true },
    )
  }

  async function loadTemplate(id: number) {
    if (id <= 0) {
      setDetail(null)
      setWorkingXsl("")
      setSettings(defaultXslTemplateSettings)
      setPreviewHtml("")
      return
    }
    setLoading(true)
    setPreviewHtml("")
    try {
      const [nextDetail, html] = await Promise.all([pitXslApi.get(id), pitXslApi.previewHtml(id)])
      const content = nextDetail.XSL_CONTENT || ""
      setDetail(nextDetail)
      setWorkingXsl(content)
      setSettings(readXslTemplateSettings(content))
      setPreviewHtml(html)
    } catch (error) {
      notify(getApiErrorMessage(error, "Không tải được mẫu PIT"), "error", 5000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTemplate(xslId)
  }, [xslId])

  useEffect(() => {
    const iframe = frameRef.current
    if (!iframe) return
    const apply = () => {
      const doc = iframe.contentDocument
      if (!doc?.head) return
      let style = doc.getElementById("pit-designer-style") as HTMLStyleElement | null
      if (!style) {
        style = doc.createElement("style")
        style.id = "pit-designer-style"
        doc.head.appendChild(style)
      }
      style.textContent = buildPitDesignerPreviewCss(settings)
    }
    iframe.addEventListener("load", apply)
    apply()
    return () => iframe.removeEventListener("load", apply)
  }, [previewHtml, settings])

  function patchSettings(patch: Partial<XslTemplateSettings>) {
    if (!canEdit) return
    const next = { ...settings, ...patch }
    setSettings(next)
    setWorkingXsl(current => applyXslTemplateSettings(current, next))
  }

  async function save() {
    if (!detail || !workingXsl.trim()) {
      notify("Mẫu chưa có nội dung XSL để thiết kế", "warning", 3500)
      return
    }
    setLoading(true)
    try {
      const saved = await pitXslApi.update(detail.XSL_ID, {
        TEMPLATE_CD: detail.TEMPLATE_CD,
        TEMPLATE_NM: detail.TEMPLATE_NM,
        SERIES: detail.SERIES || "",
        FROM_DOC_NO: detail.FROM_DOC_NO,
        TO_DOC_NO: detail.TO_DOC_NO,
        IS_DEFAULT: detail.IS_DEFAULT,
        IS_ACTIVE: detail.IS_ACTIVE,
        XSL_CONTENT: workingXsl,
        LOGO_PATH: detail.LOGO_PATH,
        BACKGROUND_PATH: detail.BACKGROUND_PATH,
        NEN_PATH: detail.NEN_PATH,
      })
      setDetail(saved)
      setWorkingXsl(saved.XSL_CONTENT || workingXsl)
      setSettings(readXslTemplateSettings(saved.XSL_CONTENT || workingXsl))
      setPreviewHtml(await pitXslApi.previewHtml(saved.XSL_ID))
      notify("Đã lưu thiết kế mẫu PIT", "success", 2500)
    } catch (error) {
      notify(getApiErrorMessage(error, "Không lưu được thiết kế mẫu PIT"), "error", 5000)
    } finally {
      setLoading(false)
    }
  }

  async function printPdf() {
    if (xslId <= 0) {
      notify("Hãy chọn mẫu chứng từ trước.", "warning", 3000)
      return
    }
    setLoading(true)
    try {
      notify("Đang tạo PDF...", "info", 2500)
      const pdf = await pitXslApi.previewPdf(xslId)
      const blob = pdf.type.toLowerCase().includes("pdf") ? pdf : new Blob([pdf], { type: "application/pdf" })
      const fileName = `PIT_03-TNCN_${xslId}.pdf`
      const objectUrl = URL.createObjectURL(blob)
      const pdfWindow = window.open(objectUrl, "_blank", "noopener,noreferrer")
      if (pdfWindow) {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000)
        notify("Đã mở PDF trong tab mới.", "success", 3000)
      } else {
        await downloadBlobFile(blob, fileName)
        URL.revokeObjectURL(objectUrl)
        notify("Đã tải PDF về máy.", "success", 3000)
      }
    } catch (error) {
      notify(getApiErrorMessage(error, "Không xuất được PDF"), "error", 5000)
    } finally {
      setLoading(false)
    }
  }

  async function applySelectedImage(kind: "logo" | "background" | "nen", path: string) {
    if (!detail) return
    setDetail(current =>
      current
        ? {
            ...current,
            LOGO_PATH: kind === "logo" ? path : current.LOGO_PATH,
            BACKGROUND_PATH: kind === "background" ? path : current.BACKGROUND_PATH,
            NEN_PATH: kind === "nen" ? path : current.NEN_PATH,
          }
        : current,
    )
    setPreviewHtml(await pitXslApi.previewHtml(detail.XSL_ID))
  }

  async function upload(kind: "logo" | "background" | "nen", file?: File) {
    if (!detail || !file) return
    setLoading(true)
    try {
      const result = await pitXslApi.uploadImage(detail.XSL_ID, kind, file)
      await applySelectedImage(kind, result.PATH)
      notify("Đã gắn ảnh vào mẫu. Có thể chọn ảnh khác bất cứ lúc nào.", "success", 2500)
    } catch (error) {
      notify(getApiErrorMessage(error, "Không tải được ảnh lên"), "error", 5000)
    } finally {
      setLoading(false)
    }
  }

  async function selectLibraryImage(file: EInvoiceFtpImageFile) {
    if (!detail || !imagePicker) return
    setLoading(true)
    try {
      const result = await pitXslApi.selectImage(detail.XSL_ID, imagePicker.pitKind, file.FILE_NAME, file.PATH)
      await applySelectedImage(imagePicker.pitKind, result.PATH || file.PATH)
      setImagePicker(null)
      notify("Đã chọn ảnh từ thư viện.", "success", 2500)
    } catch (error) {
      notify(getApiErrorMessage(error, "Không thể gắn ảnh từ thư viện"), "error", 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col bg-slate-100">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-white px-3 py-2">
          <b className="text-sm">Thiết kế mẫu chứng từ PIT</b>
          <SelectBox
            width={360}
            dataSource={options}
            value={xslId > 0 ? xslId : null}
            valueExpr="XSL_ID"
            displayExpr="LABEL"
            searchEnabled
            searchExpr={["LABEL"]}
            placeholder={t("SELECT_TEMPLATE_03_TNCN", "Chọn mẫu 03/TNCN...")}
            disabled={loading}
            onValueChanged={event => {
              if (!event.event) return
              selectTemplate(positiveId(event.value))
            }}
          />
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading || xslId <= 0}
              onClick={() => void printPdf()}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              In PDF
            </button>
            <button
              type="button"
              disabled={loading || !detail || !workingXsl.trim()}
              onClick={() => void save()}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              Lưu
            </button>
          </div>
        </div>

        {xslId <= 0 ? (
          <div className="m-4 rounded border border-dashed bg-white p-6 text-sm text-slate-600">Chọn mẫu PIT ở trên.</div>
        ) : (
          <div className="min-h-0 flex-1" style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", overflow: "hidden" }}>
            <aside className="overflow-y-auto border-r bg-white p-4" style={{ minWidth: 0, minHeight: 0 }}>
              {!workingXsl.trim() && !loading && (
                <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Mẫu này chưa có nội dung XSL. Hãy tạo lại mẫu để nạp mẫu chuẩn 03/TNCN.
                </div>
              )}
              <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0 disabled:opacity-60">
                <section className="border-b pb-4">
                  <b className="text-sm">Kiểu chữ</b>
                  <label className="mt-3 flex items-center justify-between text-xs">
                    Màu chữ
                    <input className="h-7 w-12" type="color" value={settings.fontColor} onChange={event => patchSettings({ fontColor: event.target.value })} />
                  </label>
                  <label className="mt-3 block text-xs">
                    Cỡ chữ body
                    <input
                      className="ml-2 w-16 rounded border px-1 py-1"
                      type="number"
                      min={8}
                      max={36}
                      value={settings.fontSizePx}
                      onChange={event => patchSettings({ fontSizePx: Number(event.target.value) || 12 })}
                    />{" "}
                    px
                  </label>
                  <label className="mt-3 block text-xs">
                    Cỡ tiêu đề
                    <input
                      className="ml-2 w-16 rounded border px-1 py-1"
                      type="number"
                      min={10}
                      max={48}
                      value={settings.titleFontSizePx}
                      onChange={event => patchSettings({ titleFontSizePx: Number(event.target.value) || 16 })}
                    />{" "}
                    px
                  </label>
                  <label className="mt-3 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.showLabelEn)}
                      onChange={event => patchSettings({ showLabelEn: event.target.checked })}
                    />
                    <span>Hiện tiếng Anh</span>
                  </label>
                  <label className="mt-3 block text-xs">
                    Font
                    <select className="ml-2 rounded border px-1 py-1" value={settings.fontFamily} onChange={event => patchSettings({ fontFamily: event.target.value })}>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Arial">Arial</option>
                      <option value="Tahoma">Tahoma</option>
                      <option value="Verdana">Verdana</option>
                    </select>
                  </label>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      className={`rounded border px-2 py-1 text-xs ${settings.fontStyle.includes("bold") ? "border-blue-500 bg-blue-50" : ""}`}
                      onClick={() => patchSettings({ fontStyle: toggleFontStyle(settings.fontStyle, "bold") })}
                    >
                      Đậm
                    </button>
                    <button
                      type="button"
                      className={`rounded border px-2 py-1 text-xs ${settings.fontStyle.includes("italic") ? "border-blue-500 bg-blue-50" : ""}`}
                      onClick={() => patchSettings({ fontStyle: toggleFontStyle(settings.fontStyle, "italic") })}
                    >
                      Nghiêng
                    </button>
                  </div>
                </section>

                <section className="border-b py-4">
                  <b className="text-sm">Logo</b>
                  <p className="mt-1 text-xs text-slate-500">Tải file từ máy. Âm = trái/lên, dương = phải/xuống.</p>
<ImageField label={t("FILE_LOGO", "File logo")} path={detail?.LOGO_PATH} disabled={!canEdit} onUpload={file => void upload("logo", file)} />
<NumberControl label={t("LOGO_MAX_SIZE", "Kích thước logo (px)")} value={settings.logoMaxSizePx} min={24} max={180} onChange={logoMaxSizePx => patchSettings({ logoMaxSizePx })} />
                  <OffsetControls
                    offsetX={settings.logoOffsetXPx}
                    offsetY={settings.logoOffsetYPx}
                    onChangeX={logoOffsetXPx => patchSettings({ logoOffsetXPx })}
                    onChangeY={logoOffsetYPx => patchSettings({ logoOffsetYPx })}
                  />
                </section>

                <section className="border-b py-4">
                  <b className="text-sm">Ảnh nền trang</b>
                  <p className="mt-1 text-xs text-slate-500">Ảnh mờ giữa trang. Tải file từ máy.</p>
<ImageField label={t("FILE_BACKGROUND", "File nền trang")} path={detail?.BACKGROUND_PATH} disabled={!canEdit} onUpload={file => void upload("background", file)} />
<NumberControl label={t("SIZE_PERCENT", "Kích thước (%)")} value={settings.backgroundSizePercent} min={5} max={150} onChange={backgroundSizePercent => patchSettings({ backgroundSizePercent })} />
<NumberControl label={t("OPACITY_PERCENT", "Độ nhạt (%)")} value={settings.backgroundOpacityPercent} min={0} max={100} onChange={backgroundOpacityPercent => patchSettings({ backgroundOpacityPercent })} />
                  <OffsetControls
                    offsetX={settings.backgroundOffsetXPx}
                    offsetY={settings.backgroundOffsetYPx}
                    onChangeX={backgroundOffsetXPx => patchSettings({ backgroundOffsetXPx })}
                    onChangeY={backgroundOffsetYPx => patchSettings({ backgroundOffsetYPx })}
                  />
                </section>

                <section className="py-4">
                  <b className="text-sm">Nền trong</b>
                  <p className="mt-1 text-xs text-slate-500">Nền ôm trang, nằm dưới nội dung. Chọn từ thư viện hoặc tải lên.</p>
                  <ImageField
label={t("FILE_WATERMARK", "File nền trong")}
                    path={detail?.NEN_PATH}
                    disabled={!canEdit}
                    onPick={() => setImagePicker({ title: "Chọn nền trong", imageKind: "invoice-background", pitKind: "nen" })}
                    onUpload={file => void upload("nen", file)}
                  />
<NumberControl label={t("SIZE_PERCENT", "Kích thước (%)")} value={settings.nenSizePercent} min={5} max={150} onChange={nenSizePercent => patchSettings({ nenSizePercent })} />
<NumberControl label={t("OPACITY_PERCENT", "Độ nhạt (%)")} value={settings.nenOpacityPercent} min={0} max={100} onChange={nenOpacityPercent => patchSettings({ nenOpacityPercent })} />
                  <OffsetControls
                    offsetX={settings.nenOffsetXPx}
                    offsetY={settings.nenOffsetYPx}
                    onChangeX={nenOffsetXPx => patchSettings({ nenOffsetXPx })}
                    onChangeY={nenOffsetYPx => patchSettings({ nenOffsetYPx })}
                  />
                </section>
              </fieldset>
            </aside>
            <main className="overflow-auto p-6" style={{ minWidth: 0, minHeight: 0 }}>
              {previewHtml ? (
                <iframe ref={frameRef} title={t("PREVIEW_PIT_TEMPLATE", "Xem trước mẫu PIT")} srcDoc={previewHtml} className="mx-auto block min-h-[1123px] w-full max-w-[794px] bg-white shadow-xl" />
              ) : (
                <div className="mx-auto max-w-[794px] rounded border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                  {loading ? "Đang tải mẫu PIT..." : "Không tải được bản xem trước."}
                </div>
              )}
            </main>
          </div>
        )}
      </div>
      {imagePicker && (
        <EInvoiceFtpImagePickerPopup
          visible
          title={imagePicker.title}
          imageKind={imagePicker.imageKind}
          selectedPath={detail?.NEN_PATH || undefined}
          onClose={() => setImagePicker(null)}
          onSelect={file => void selectLibraryImage(file)}
        />
      )}
    </DxPage>
  )
}

function NumberControl({
  label,
  value,
  min,
  max,
  signed = false,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  signed?: boolean
  onChange: (value: number) => void
}) {
  return (
    <label className="mt-3 block text-xs">
      <span className="flex justify-between">
        <span>{label}</span>
        <b>{formatControlValue(value, signed)}</b>
      </span>
      <input className="mt-1 w-full" type="range" min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} />
    </label>
  )
}

function OffsetControls({
  offsetX,
  offsetY,
  onChangeX,
  onChangeY,
}: {
  offsetX: number
  offsetY: number
  onChangeX: (value: number) => void
  onChangeY: (value: number) => void
}) {
  return (
    <>
<NumberControl label={t("OFFSET_X", "Trái / phải (px)")} value={offsetX} min={-200} max={200} signed onChange={onChangeX} />
<NumberControl label={t("OFFSET_Y", "Lên / xuống (px)")} value={offsetY} min={-200} max={200} signed onChange={onChangeY} />
    </>
  )
}

function ImageField({
  label,
  path,
  disabled,
  onPick,
  onUpload,
}: {
  label: string
  path?: string | null
  disabled: boolean
  onPick?: () => void
  onUpload: (file?: File) => void
}) {
  return (
    <div className="mt-3">
      <div className="text-xs font-medium">{label}</div>
      <span className="mt-1 block truncate text-xs font-normal text-slate-500" title={path || ""}>
        {imageFileLabel(path)}
      </span>
      <div className="mt-1 flex gap-2">
        {onPick && (
          <button type="button" disabled={disabled} onClick={onPick} className="rounded border border-blue-500 bg-blue-50 px-2 py-1 text-xs text-blue-700 disabled:opacity-50">
            Chọn từ thư viện
          </button>
        )}
        <label className={`cursor-pointer rounded border px-2 py-1 text-xs ${disabled ? "pointer-events-none opacity-50" : ""}`}>
          Tải lên
          <input
            className="hidden"
            type="file"
            accept="image/*"
            disabled={disabled}
            onChange={event => {
              onUpload(event.target.files?.[0])
              event.target.value = ""
            }}
          />
        </label>
      </div>
    </div>
  )
}
