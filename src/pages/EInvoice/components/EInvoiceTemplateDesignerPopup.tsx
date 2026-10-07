import { useContext, useEffect, useMemo, useRef, useState } from "react"
import SelectBox from "devextreme-react/select-box"
import notify from "devextreme/ui/notify"
import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import {
  cloneEInvoiceTemplateDesigner,
  getEInvoiceTemplateDesignerDesigns,
  publishEInvoiceTemplateDesigner,
  previewEInvoiceTemplateDesignerLiveHtml,
  exportEInvoiceTemplateDesignerPdf,
  saveEInvoiceTemplateDesignerDraft,
  selectEInvoiceDesignerImage,
  fetchEInvoiceDesignerImageFile,
  fetchEInvoiceDesignerXslSample,
  type EInvoiceDesignerImageKind,
  type EInvoiceFtpXslFile,
  type EInvoiceTemplateDesignerDesign,
} from "@/api/einvoiceSettingApi"
import { downloadBlobFile } from "@/lib/fileUtils"
import { LanguageContext } from "@/lib/i18nLoader"
import EInvoiceFtpImagePickerPopup from "./EInvoiceFtpImagePickerPopup"
import EInvoiceFtpXslPickerPopup from "./EInvoiceFtpXslPickerPopup"
import {
  applyXslTemplateSettings,
  buildColumnParamMap,
  buildDesignerPreviewCss,
  clearXslImageParams,
  defaultXslTemplateSettings,
  getSupportedItemColumnToggles,
  hasInvoiceQrSupport,
  hasItemColumnConditionalSupport,
  hasLabelEnSupport,
  readXslTemplateSettings,
  type XslItemColumnToggleKey,
  type XslTemplateSettings,
} from "@/pages/EInvoice/xslTemplateSettings"

function imageFileLabel(path: string | null | undefined) {
  if (!path?.trim()) return "Chưa chọn"
  const normalized = path.replace(/\\/g, "/")
  return normalized.slice(normalized.lastIndexOf("/") + 1) || path
}

function mergeDesignImageSettings(xslContent: string, design?: EInvoiceTemplateDesignerDesign | null): { xsl: string; settings: XslTemplateSettings } {
  const xsl = clearXslImageParams(xslContent)
  const fromXsl = readXslTemplateSettings(xsl)
  return {
    xsl,
    settings: {
      ...fromXsl,
      logoImage: design?.LOGO_PATH || "",
      backgroundImage: design?.BACKGROUND_PATH || "",
      nenImage: design?.INVOICE_BACKGROUND_PATH || "",
      vienHdImage: design?.INVOICE_BORDER_PATH || "",
    },
  }
}

function buildDesignOptions(designs: EInvoiceTemplateDesignerDesign[]) {
  const ordered = [...designs].sort((left, right) => left.DESIGN_ID - right.DESIGN_ID)
  const numberById = new Map(ordered.map((design, index) => [design.DESIGN_ID, index + 1]))
  return ordered.map(design => ({
    ...design,
    LABEL: `Bản thiết kế ${numberById.get(design.DESIGN_ID)}`,
  }))
}

function formatControlValue(value: number, signed: boolean) {
  if (!signed) return String(value)
  if (value > 0) return `+${value}`
  return String(value)
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

type ImageParamKey = keyof Pick<XslTemplateSettings, "logoImage" | "backgroundImage" | "nenImage" | "vienHdImage">

function applyImagePathToDesign(design: EInvoiceTemplateDesignerDesign, paramKey: ImageParamKey, path: string): EInvoiceTemplateDesignerDesign {
  if (paramKey === "logoImage") return { ...design, LOGO_PATH: path }
  if (paramKey === "backgroundImage") return { ...design, BACKGROUND_PATH: path }
  if (paramKey === "nenImage") return { ...design, INVOICE_BACKGROUND_PATH: path }
  return { ...design, INVOICE_BORDER_PATH: path }
}

function ftpFileName(path: string) {
  const normalized = path.replace(/\\/g, "/")
  return normalized.slice(normalized.lastIndexOf("/") + 1)
}

function imageKindFromPath(path: string, fallback: EInvoiceDesignerImageKind): EInvoiceDesignerImageKind {
  const normalized = path.replace(/\\/g, "/")
  if (normalized.includes("/EinvoiceNen/")) return "invoice-background"
  if (normalized.includes("/EinvoiceVien/")) return "border"
  return fallback
}

export type EInvoiceDesignerTemplateOption = {
  XSL_ID: number
  SELLER_ID: number
  LABEL: string
}

export default function EInvoiceTemplateDesignerPopup({
  xslId,
  sellerId,
  templates = [],
  onTemplateChange,
}: {
  xslId: number
  sellerId: number
  templates?: EInvoiceDesignerTemplateOption[]
  onTemplateChange?: (xslId: number, sellerId: number) => void
}) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const [designs, setDesigns] = useState<EInvoiceTemplateDesignerDesign[]>([])
  const [activeDesignId, setActiveDesignId] = useState(0)
  const [workingXsl, setWorkingXsl] = useState("")
  const [settings, setSettings] = useState<XslTemplateSettings>(defaultXslTemplateSettings)
  const [loading, setLoading] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const [imagePicker, setImagePicker] = useState<{ title: string; imageKind: EInvoiceDesignerImageKind; paramKey: ImageParamKey } | null>(null)
  const [xslPickerVisible, setXslPickerVisible] = useState(false)
  const [selectedFtpXslName, setSelectedFtpXslName] = useState("")
  const frameRef = useRef<HTMLIFrameElement>(null)
  const livePreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const livePreviewSeqRef = useRef(0)
  const activeDesign = designs.find(design => design.DESIGN_ID === activeDesignId)
  const isEditable = activeDesignId > 0
  const templateIsActive = Number(activeDesign?.TEMPLATE_IS_ACTIVE ?? designs[0]?.TEMPLATE_IS_ACTIVE ?? 0) === 1
  const canPublishToContent = isEditable && !templateIsActive
  const designOptions = useMemo(() => buildDesignOptions(designs), [designs])
  const columnToggles = useMemo(() => getSupportedItemColumnToggles(workingXsl), [workingXsl])

  const loadPreview = async (designId?: number) => {
    const resolvedDesignId = designId || activeDesignId || undefined
    try {
      const response = await axios
        .get<string>(`${API_BASE_URL}/EInvoiceSetting/sellers/${sellerId}/designer-preview/html`, {
          responseType: "text",
          transformResponse: [(data) => data],
          params: { xslId, designId: resolvedDesignId },
        })
        .catch(() =>
          axios.get<string>(`${API_BASE_URL}/EInvoiceSetting/sellers/${sellerId}/preview/html`, {
            responseType: "text",
            transformResponse: [(data) => data],
            params: { xslId },
          }),
        )
      const html = typeof response.data === "string" ? response.data : String(response.data ?? "")
      setPreviewHtml(html)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      notify(message, "error", 5000)
    }
  }

  const scheduleLivePreview = (xslContent: string, nextSettings: XslTemplateSettings) => {
    if (sellerId <= 0 || !xslContent.trim()) return
    if (livePreviewTimerRef.current) clearTimeout(livePreviewTimerRef.current)
    livePreviewTimerRef.current = setTimeout(() => {
      const seq = ++livePreviewSeqRef.current
      void previewEInvoiceTemplateDesignerLiveHtml({
        sellerId,
        xslId,
        designId: activeDesignId || undefined,
        xslContent,
        columnParams: buildColumnParamMap(nextSettings),
      })
        .then(html => {
          if (seq !== livePreviewSeqRef.current) return
          setPreviewHtml(html)
          if (!hasItemColumnConditionalSupport(xslContent)) {
            notify("XSL chưa hỗ trợ ẩn/hiện cột. Hãy nạp lại mẫu in Mau1-DTS rồi lưu.", "warning", 5000)
          }
          if (nextSettings.showQrCode && !hasInvoiceQrSupport(xslContent)) {
            notify("XSL chưa chèn được layout QR. Hãy nạp lại mẫu Mau2/Mau1 rồi lưu.", "warning", 5000)
          }
        })
        .catch(error => {
          const message = error instanceof Error ? error.message : String(error)
          notify(`Live preview cột lỗi: ${message}`, "error", 5000)
        })
    }, 350)
  }

  const syncSettingsFromDesign = (design?: EInvoiceTemplateDesignerDesign | null, xslOverride?: string) => {
    const { xsl, settings: nextSettings } = mergeDesignImageSettings(xslOverride ?? design?.XSL_CONTENT ?? "", design)
    setWorkingXsl(xsl)
    setSettings(nextSettings)
  }

  const patchSettings = (patch: Partial<XslTemplateSettings>) => {
    if (!isEditable || !workingXsl) return
    const next = { ...settings, ...patch }
    setSettings(next)
    const nextXsl = applyXslTemplateSettings(workingXsl, next)
    setWorkingXsl(nextXsl)
    const columnKeys = Object.keys(patch) as (keyof XslTemplateSettings)[]
    if (columnKeys.some(key => String(key).startsWith("showCol") || key === "showQrCode" || key === "showLabelEn")) {
      scheduleLivePreview(nextXsl, next)
    }
  }

  useEffect(() => {
    return () => {
      if (livePreviewTimerRef.current) clearTimeout(livePreviewTimerRef.current)
    }
  }, [])


  useEffect(() => {
    if (xslId <= 0) {
      setActiveDesignId(0)
      setPreviewHtml("")
      setDesigns([])
      return
    }
    setLoading(true)
    setPreviewHtml("")
    void getEInvoiceTemplateDesignerDesigns(xslId)
      .then(designList => {
        setDesigns(designList.data)
        const preferred =
          [...designList.data].sort((a, b) => a.DESIGN_ID - b.DESIGN_ID)[0]?.DESIGN_ID ?? 0
        setActiveDesignId(preferred)
        syncSettingsFromDesign(designList.data.find(design => design.DESIGN_ID === preferred))
      })
      .catch(() => {
        setDesigns([])
        notify("Không tải được danh sách mẫu hóa đơn", "error", 3500)
      })
      .finally(() => setLoading(false))
  }, [xslId, sellerId])

  useEffect(() => {
    const design = designs.find(item => item.DESIGN_ID === activeDesignId)
    if (!design) return
    syncSettingsFromDesign(design)
    void loadPreview(activeDesignId)
    // Only rehydrate when switching design id; save/clone sync explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDesignId])

  useEffect(() => {
    const iframe = frameRef.current
    if (!iframe) return
    const apply = () => {
      const doc = iframe.contentDocument
      if (!doc?.body) return
      let style = doc.getElementById("einvoice-designer-style") as HTMLStyleElement | null
      if (!style) {
        style = doc.createElement("style")
        style.id = "einvoice-designer-style"
        doc.head.appendChild(style)
      }
      style.textContent = buildDesignerPreviewCss(settings)
    }
    iframe.addEventListener("load", apply)
    apply()
    return () => iframe.removeEventListener("load", apply)
  }, [settings, previewHtml])

  useEffect(() => {
    const iframe = frameRef.current
    if (!iframe || !previewHtml) return
    let cancelled = false
    const urls: string[] = []

    const loadUrl = async (path: string, fallbackKind: EInvoiceDesignerImageKind) => {
      const fileName = ftpFileName(path)
      if (!fileName) return ""
      const blob = await fetchEInvoiceDesignerImageFile(imageKindFromPath(path, fallbackKind), fileName, path)
      if (!blob || blob.size < 32 || blob.type === "application/json") return ""
      const url = URL.createObjectURL(blob)
      urls.push(url)
      if (cancelled) {
        URL.revokeObjectURL(url)
        return ""
      }
      return url
    }

    const liveDoc = () => iframe.contentDocument

    const waitForPages = async () => {
      for (let i = 0; i < 40; i++) {
        const current = liveDoc()
        if (current?.querySelector(".invoice-page")) return current
        await new Promise(resolve => setTimeout(resolve, 80))
      }
      return liveDoc()
    }

    const inject = async () => {
      const startDoc = await waitForPages()
      if (cancelled || !startDoc?.body) return
      let failed = false
      let failReason = ""
      const tryLoad = async (path: string, kind: EInvoiceDesignerImageKind, alreadyPresent: boolean) => {
        if (!path || alreadyPresent) return ""
        try {
          return await loadUrl(path, kind)
        } catch (error) {
          failed = true
          failReason = error instanceof Error ? error.message : String(error)
          return ""
        }
      }
      try {
        const docForCheck = liveDoc() ?? startDoc
        const logoUrl = await tryLoad(settings.logoImage, "logo", !!docForCheck.querySelector(".logo-img[src]"))
        if (cancelled) return
        if (logoUrl) {
          const current = liveDoc()
          if (!current) return
          current.querySelectorAll(".logo-box").forEach(box => {
            let img = box.querySelector("img.logo-img") as HTMLImageElement | null
            if (!img) {
              img = current.createElement("img")
              img.className = "logo-img"
              img.alt = "Logo"
              box.appendChild(img)
            }
            img.src = logoUrl
          })
        }
        const backgroundUrl = await tryLoad(
          settings.backgroundImage,
          "background",
          !!(liveDoc() ?? startDoc).querySelector(".invoice-bg[style*='background-image']"),
        )
        if (cancelled) return
        if (backgroundUrl) {
          const current = liveDoc()
          if (!current) return
          current.querySelectorAll(".invoice-page").forEach(page => {
            page.classList.add("has-background")
            let bg = page.querySelector(".invoice-bg") as HTMLElement | null
            if (!bg) {
              bg = current.createElement("div")
              bg.className = "invoice-bg"
              page.insertBefore(bg, page.firstChild)
            }
            bg.style.backgroundImage = `url("${backgroundUrl}")`
          })
        }
        const nenUrl = await tryLoad(
          settings.nenImage,
          "invoice-background",
          !!(liveDoc() ?? startDoc).querySelector(".invoice-nen[style*='background-image']"),
        )
        if (cancelled) return
        if (nenUrl) {
          const current = liveDoc()
          if (!current) return
          current.querySelectorAll(".invoice-page").forEach(page => {
            page.classList.add("has-nen")
            let nen = page.querySelector(".invoice-nen") as HTMLElement | null
            if (!nen) {
              nen = current.createElement("div")
              nen.className = "invoice-nen"
              page.insertBefore(nen, page.firstChild)
            }
            nen.style.backgroundImage = `url("${nenUrl}")`
          })
        }
        const vienUrl = await tryLoad(
          settings.vienHdImage,
          "border",
          !!(liveDoc() ?? startDoc).getElementById("main")?.style.getPropertyValue("--vienhd-image"),
        )
        if (cancelled) return
        if (vienUrl) {
          const current = liveDoc()
          if (!current) return
          const main = current.getElementById("main")
          if (main) {
            if (!main.className.includes("vienhd")) main.className += " vienhd"
            main.style.setProperty("--vienhd-image", `url("${vienUrl}")`)
          }
          current.querySelectorAll(".invoice-page").forEach(page => {
            if (!page.className.includes("page")) page.className += " page"
          })
        }
      } catch {
        failed = true
      }
      if (cancelled) return
      if (failed) notify(failReason || "Không tải được logo/nền để xem trước", "warning", 3500)
    }

    const onLoad = () => {
      void inject()
    }
    iframe.addEventListener("load", onLoad)
    if (iframe.contentDocument?.readyState === "complete" && iframe.contentDocument.querySelector(".invoice-page")) {
      void inject()
    }
    return () => {
      cancelled = true
      iframe.removeEventListener("load", onLoad)
      urls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewHtml, settings.logoImage, settings.backgroundImage, settings.nenImage, settings.vienHdImage])

  const chooseImage = async (paramKey: ImageParamKey, imageKind: EInvoiceDesignerImageKind, file?: File) => {
    if (!file || !isEditable || activeDesignId <= 0) return
    try {
      const form = new FormData()
      form.append("file", file)
      const response = await axios.post(`${API_BASE_URL}/EInvoiceSetting/templates/${xslId}/designer/images/${imageKind}?designId=${activeDesignId}`, form)
      const payload = response.data?.Data ?? response.data?.data ?? response.data
      if (!payload?.PATH) throw new Error("Missing image path")
      applyChosenImage(paramKey, payload.PATH)
      await loadPreview(activeDesignId)
      notify("Đã gắn ảnh vào mẫu hóa đơn. Có thể chọn ảnh khác bất cứ lúc nào.", "success", 2500)
    } catch {
      notify("Không thể tải ảnh lên", "error", 3500)
    }
  }

  const applyChosenImage = (paramKey: ImageParamKey, path: string) => {
    setSettings(prev => ({ ...prev, [paramKey]: path }))
    setWorkingXsl(prev => clearXslImageParams(prev))
    setDesigns(prev => prev.map(design => (design.DESIGN_ID === activeDesignId ? applyImagePathToDesign(design, paramKey, path) : design)))
  }

  const selectLibraryImage = async (fileName: string, path: string) => {
    if (!imagePicker || !isEditable || activeDesignId <= 0) return
    try {
      const selected = await selectEInvoiceDesignerImage(xslId, activeDesignId, imagePicker.imageKind, fileName, path)
      applyChosenImage(imagePicker.paramKey, selected.PATH || path)
      setImagePicker(null)
      await loadPreview(activeDesignId)
      notify("Đã chọn ảnh từ thư viện.", "success", 2500)
    } catch {
      notify("Không thể gắn ảnh từ thư viện", "error", 3500)
    }
  }

  const applyFtpXslSample = async (file: EInvoiceFtpXslFile & { XSL_CONTENT?: string; PREVIEW_HTML?: string }) => {
    if (!isEditable || activeDesignId <= 0) {
      notify("Hãy chọn bản thiết kế trước khi nạp mẫu in.", "warning", 3500)
      return
    }
    setLoading(true)
    try {
      let nextXsl = clearXslImageParams(file.XSL_CONTENT || "")
      if (!nextXsl.trim()) {
        const sample = await fetchEInvoiceDesignerXslSample(file.FILE_NAME)
        nextXsl = clearXslImageParams(sample.XSL_CONTENT || "")
      }
      if (!nextXsl.trim()) {
        notify("Mẫu in vừa chọn không có nội dung.", "warning", 3000)
        return
      }
      const nextSettings = {
        ...readXslTemplateSettings(nextXsl),
        logoImage: settings.logoImage,
        backgroundImage: settings.backgroundImage,
        nenImage: settings.nenImage,
        vienHdImage: settings.vienHdImage,
      }
      setWorkingXsl(nextXsl)
      setSettings(nextSettings)
      setSelectedFtpXslName(file.FILE_NAME)
      setXslPickerVisible(false)
      if (file.PREVIEW_HTML?.trim()) {
        setPreviewHtml(file.PREVIEW_HTML)
      } else {
        scheduleLivePreview(nextXsl, nextSettings)
      }
      notify(`Đã nạp mẫu in "${file.FILE_NAME.replace(/\.(xsl|xslt)$/i, "")}". Nhấn Lưu để giữ lại.`, "success", 3500)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không tải được mẫu in từ kho mẫu"
      notify(message, "error", 4000)
    } finally {
      setLoading(false)
    }
  }

  const draftImagePayload = () => ({
    LOGO_PATH: settings.logoImage || activeDesign?.LOGO_PATH || null,
    BACKGROUND_PATH: settings.backgroundImage || activeDesign?.BACKGROUND_PATH || null,
    INVOICE_BACKGROUND_PATH: settings.nenImage || activeDesign?.INVOICE_BACKGROUND_PATH || null,
    INVOICE_BORDER_PATH: settings.vienHdImage || activeDesign?.INVOICE_BORDER_PATH || null,
  })

  const save = async () => {
    if (!isEditable || !workingXsl.trim()) {
      return
    }

    const images = draftImagePayload()
    setLoading(true)
    try {
      const saved = await saveEInvoiceTemplateDesignerDraft(xslId, activeDesignId, workingXsl, images)
      const list = await getEInvoiceTemplateDesignerDesigns(xslId)
      setDesigns(list.data)
      const current = list.data.find(item => item.DESIGN_ID === activeDesignId)
      syncSettingsFromDesign(current, saved.data.XSL_CONTENT || current?.XSL_CONTENT || workingXsl)
      await loadPreview(activeDesignId)
      notify("Đã lưu bản thiết kế", "success", 2500)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không lưu được bản thiết kế"
      notify(message, "error", 4000)
    } finally {
      setLoading(false)
    }
  }

  const createDesignCopy = async () => {
    if (xslId <= 0 || activeDesignId <= 0) {
      notify("Hãy chọn bản thiết kế nguồn trước.", "warning", 3000)
      return
    }
    setLoading(true)
    try {
      const cloned = await cloneEInvoiceTemplateDesigner(xslId, activeDesignId)
      const list = await getEInvoiceTemplateDesignerDesigns(xslId)
      setDesigns(list.data)
      const nextId = cloned.data.DESIGN_ID
      setActiveDesignId(nextId)
      syncSettingsFromDesign(list.data.find(item => item.DESIGN_ID === nextId) ?? cloned.data)
      await loadPreview(nextId)
      notify(`Đã tạo bản thiết kế mới: ${cloned.data.DESIGN_NM || `#${nextId}`}`, "success", 3000)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không tạo được bản thiết kế mới"
      notify(message, "error", 4000)
    } finally {
      setLoading(false)
    }
  }

  const publish = async () => {
    if (!canPublishToContent) {
      notify(
        templateIsActive
          ? "Mẫu này đã phát hành. Không thể áp dụng thay đổi. Hãy ngưng phát hành trên công cụ tạo mẫu trước."
          : "Hãy chọn bản thiết kế để áp dụng.",
        "warning",
        4000,
      )
      return
    }
    setLoading(true)
    try {
      if (workingXsl.trim()) {
        await saveEInvoiceTemplateDesignerDraft(xslId, activeDesignId, workingXsl, draftImagePayload())
      }
      await publishEInvoiceTemplateDesigner(xslId, activeDesignId)
      setDesigns((await getEInvoiceTemplateDesignerDesigns(xslId)).data)
      await loadPreview(activeDesignId)
      notify("Đã áp dụng mẫu hóa đơn.", "success", 3500)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể áp dụng mẫu hóa đơn"
      notify(message, "error", 4000)
    } finally {
      setLoading(false)
    }
  }

  const printPdf = async () => {
    if (sellerId <= 0 || xslId <= 0) {
      notify("Hãy chọn mẫu hóa đơn trước.", "warning", 3000)
      return
    }
    setLoading(true)
    try {
      notify("Đang tạo PDF...", "info", 2500)
      const pdf = await exportEInvoiceTemplateDesignerPdf({
        sellerId,
        xslId,
        designId: activeDesignId || undefined,
        xslContent: workingXsl.trim() || undefined,
        columnParams: buildColumnParamMap(settings),
      })
      const fileName = `EInvoiceDesigner_${xslId}_${activeDesignId || 0}.pdf`
      const objectUrl = URL.createObjectURL(pdf)
      const pdfWindow = window.open(objectUrl, "_blank", "noopener,noreferrer")
      if (pdfWindow) {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000)
        notify("Đã mở PDF trong tab mới.", "success", 3000)
      } else {
        await downloadBlobFile(pdf, fileName)
        URL.revokeObjectURL(objectUrl)
        notify("Đã tải PDF về máy.", "success", 3000)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không xuất được PDF"
      notify(message, "error", 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-white px-3 py-2">
        <b className="text-sm">Thiết kế mẫu hóa đơn</b>
        <SelectBox
          width={360}
          dataSource={templates}
          value={xslId > 0 ? xslId : null}
          valueExpr="XSL_ID"
          displayExpr="LABEL"
          searchEnabled
          searchExpr={["LABEL"]}
placeholder={t("SELECT_INVOICE_TEMPLATE", "Chọn mẫu hóa đơn...")}
          disabled={loading}
          onValueChanged={event => {
            if (!event.event) return
            const nextXslId = Number(event.value) || 0
            const selected = templates.find(item => item.XSL_ID === nextXslId)
            onTemplateChange?.(nextXslId, selected?.SELLER_ID ?? 0)
          }}
        />
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading || sellerId <= 0 || xslId <= 0}
            onClick={() => void printPdf()}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
          >
            In PDF
          </button>
          <button
            type="button"
            disabled={loading || !isEditable}
            onClick={() => void save()}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Lưu
          </button>
          <button
            type="button"
            disabled={loading || !canPublishToContent}
            onClick={() => void publish()}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Áp dụng mẫu
          </button>
        </div>
      </div>
      {xslId <= 0 ? (
        <div className="m-4 rounded border border-dashed bg-white p-6 text-sm text-slate-600">
          Chọn mẫu hóa đơn ở trên.
        </div>
      ) : (
      <div className="min-h-0 flex-1" style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", overflow: "hidden" }}>
        <aside className="overflow-y-auto border-r bg-white p-4" style={{ minWidth: 0, minHeight: 0 }}>
          <section className="border-b pb-4">
            <b className="text-sm">Bản thiết kế</b>
            <div className="mt-2">
              {designs.length ? (
                <SelectBox
                  dataSource={designOptions}
                  value={activeDesignId || null}
                  valueExpr="DESIGN_ID"
                  displayExpr="LABEL"
                  searchEnabled
                  searchExpr={["LABEL"]}
placeholder={t("SELECT_DESIGN_VERSION", "Chọn bản thiết kế...")}
                  disabled={loading}
                  onValueChanged={event => {
                    if (event.event) setActiveDesignId(Number(event.value) || 0)
                  }}
                />
              ) : (
                <div className="rounded border border-dashed p-2 text-xs text-slate-500">Chưa có bản thiết kế. Hãy tạo mẫu từ công cụ tạo mẫu.</div>
              )}
            </div>
            {activeDesign && (
              <div className="mt-2 text-xs text-slate-500">
                {designOptions.find(item => item.DESIGN_ID === activeDesign.DESIGN_ID)?.LABEL ?? "Mẫu"}
              </div>
            )}
            <button
              type="button"
              disabled={loading || activeDesignId <= 0}
              onClick={() => void createDesignCopy()}
              className="mt-3 w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
            >
              Tạo bản thiết kế mới từ bản đang chọn
            </button>
            {templateIsActive && (
              <div className="mt-3 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                Mẫu này đã phát hành. Bạn vẫn có thể lưu chỉnh sửa nhưng chưa áp dụng được cho xem/in.
              </div>
            )}
          </section>

          <fieldset disabled={!isEditable} className="m-0 min-w-0 border-0 p-0 disabled:opacity-60">
            <section className="border-b py-4">
              <b className="text-sm">Mẫu in chuẩn</b>
              <p className="mt-1 text-xs text-slate-500">
                Chọn mẫu in hóa đơn có sẵn để đưa vào bản thiết kế đang mở. Có thể chỉnh tiếp sau khi nạp.
              </p>
              <div className="mt-2 text-xs text-slate-500">
                Mẫu đang dùng:{" "}
                <span className="font-medium text-slate-700">
                  {selectedFtpXslName
                    ? selectedFtpXslName.replace(/\.(xsl|xslt)$/i, "")
                    : "Chưa chọn mẫu"}
                </span>
              </div>
              <button
                type="button"
                disabled={!isEditable || loading}
                onClick={() => setXslPickerVisible(true)}
                className="mt-3 w-full rounded border border-blue-500 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 disabled:opacity-50"
              >
                Chọn mẫu in có sẵn
              </button>
            </section>

            <section className="border-b py-4">
              <b className="text-sm">Kiểu chữ</b>
              <label className="mt-3 flex items-center justify-between text-xs">
                Màu chữ
                <input className="h-7 w-12" type="color" value={settings.fontColor} onChange={event => patchSettings({ fontColor: event.target.value })} />
              </label>
              <label className="mt-3 block text-xs">
                Cỡ chữ body
                <input className="ml-2 w-16 rounded border px-1 py-1" type="number" min={8} max={36} value={settings.fontSizePx} onChange={event => patchSettings({ fontSizePx: Number(event.target.value) || 12 })} /> px
              </label>
              <label className="mt-3 block text-xs">
                Cỡ tiêu đề
                <input className="ml-2 w-16 rounded border px-1 py-1" type="number" min={10} max={48} value={settings.titleFontSizePx} onChange={event => patchSettings({ titleFontSizePx: Number(event.target.value) || 16 })} /> px
              </label>
              <label className="mt-3 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(settings.showLabelEn)}
                  disabled={!isEditable}
                  onChange={event => patchSettings({ showLabelEn: event.target.checked })}
                />
                <span>Hiện tiếng Anh (trong ngoặc)</span>
              </label>
              {hasLabelEnSupport(workingXsl) ? null : (
                <p className="mt-1 text-xs text-slate-500">Mẫu hiện tại ít/không có nhãn tiếng Anh.</p>
              )}
              <label className={`mt-3 block text-xs ${settings.showLabelEn ? "" : "opacity-50"}`}>
                Cỡ chữ trong ngoặc
                <input
                  className="ml-2 w-16 rounded border px-1 py-1"
                  type="number"
                  min={8}
                  max={24}
                  disabled={!settings.showLabelEn}
                  value={settings.labelEnFontSizePx}
                  onChange={event => patchSettings({ labelEnFontSizePx: Number(event.target.value) || 11 })}
                />{" "}
                px
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
                <button type="button" className={`rounded border px-2 py-1 text-xs ${settings.fontStyle.includes("bold") ? "border-blue-500 bg-blue-50" : ""}`} onClick={() => patchSettings({ fontStyle: settings.fontStyle.includes("bold") ? (settings.fontStyle.includes("italic") ? "italic" : "normal") : settings.fontStyle.includes("italic") ? "bold-italic" : "bold" })}>
                  Đậm
                </button>
                <button type="button" className={`rounded border px-2 py-1 text-xs ${settings.fontStyle.includes("italic") ? "border-blue-500 bg-blue-50" : ""}`} onClick={() => patchSettings({ fontStyle: settings.fontStyle.includes("italic") ? (settings.fontStyle.includes("bold") ? "bold" : "normal") : settings.fontStyle.includes("bold") ? "bold-italic" : "italic" })}>
                  Nghiêng
                </button>
              </div>
            </section>

            <section className="border-b py-4">
              <b className="text-sm">Mã QR</b>
              <p className="mt-1 text-xs text-slate-500">Hiển thị QR bên phải thông tin người bán.</p>
              <label className="mt-3 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(settings.showQrCode)}
                  disabled={!isEditable}
                  onChange={event => patchSettings({ showQrCode: event.target.checked })}
                />
                <span>Hiện mã QR</span>
              </label>
              {!hasInvoiceQrSupport(workingXsl) && (
                <p className="mt-2 text-xs text-amber-600">
                  XSL chưa có layout QR. Bật tùy chọn này sẽ tự chèn layout; nên Lưu nháp rồi xem lại.
                </p>
              )}
            </section>

            {columnToggles.length > 0 && (
              <section className="border-b py-4">
                <b className="text-sm">Cột bảng hàng</b>
                <div className="mt-3 space-y-2">
                  {columnToggles.map(item => (
                    <label key={item.key} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={Boolean(settings[item.key as XslItemColumnToggleKey])}
                        onChange={event => patchSettings({ [item.key]: event.target.checked } as Partial<XslTemplateSettings>)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            <section className="border-b py-4">
              <b className="text-sm">Logo</b>
              <p className="mt-1 text-xs text-slate-500">
                Tải file từ máy. Âm = trái/lên, dương = phải/xuống.
              </p>
              <ImageField
label={t("FILE_LOGO", "File logo")}
                path={settings.logoImage}
                disabled={!isEditable}
                onUpload={file => void chooseImage("logoImage", "logo", file)}
              />
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
              <ImageField
label={t("FILE_BACKGROUND", "File nền trang")}
                path={settings.backgroundImage}
                disabled={!isEditable}
                onUpload={file => void chooseImage("backgroundImage", "background", file)}
              />
<NumberControl label={t("SIZE_PERCENT", "Kích thước (%)")} value={settings.backgroundSizePercent} min={5} max={150} onChange={backgroundSizePercent => patchSettings({ backgroundSizePercent })} />
<NumberControl label={t("OPACITY_PERCENT", "Độ nhạt (%)")} value={settings.backgroundOpacityPercent} min={0} max={100} onChange={backgroundOpacityPercent => patchSettings({ backgroundOpacityPercent })} />
              <OffsetControls
                offsetX={settings.backgroundOffsetXPx}
                offsetY={settings.backgroundOffsetYPx}
                onChangeX={backgroundOffsetXPx => patchSettings({ backgroundOffsetXPx })}
                onChangeY={backgroundOffsetYPx => patchSettings({ backgroundOffsetYPx })}
              />
            </section>

            <section className="border-b py-4">
              <b className="text-sm">Nền trong</b>
              <p className="mt-1 text-xs text-slate-500">Nền ôm trang, nằm dưới nội dung. Chọn từ thư viện hoặc tải lên.</p>
              <ImageField
label={t("FILE_WATERMARK", "File nền trong")}
                path={settings.nenImage}
                disabled={!isEditable}
                onPick={() => setImagePicker({ title: "Chọn nền trong", imageKind: "invoice-background", paramKey: "nenImage" })}
                onUpload={file => void chooseImage("nenImage", "invoice-background", file)}
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

            <section className="py-4">
              <b className="text-sm">Viền hóa đơn</b>
              <p className="mt-1 text-xs text-slate-500">Chọn từ thư viện hoặc tải lên. Độ dày / tỷ lệ cắt chỉnh khung viền.</p>
              <ImageField
label={t("FILE_BORDER", "File viền")}
                path={settings.vienHdImage}
                disabled={!isEditable}
                onPick={() => setImagePicker({ title: "Chọn viền hóa đơn", imageKind: "border", paramKey: "vienHdImage" })}
                onUpload={file => void chooseImage("vienHdImage", "border", file)}
              />
<NumberControl label={t("BORDER_WIDTH", "Độ dày viền (px)")} value={settings.borderWidthPx} min={0} max={50} onChange={borderWidthPx => patchSettings({ borderWidthPx })} />
<NumberControl label={t("BORDER_SLICE", "Tỷ lệ cắt viền (%)")} value={settings.borderSlicePercent} min={1} max={40} onChange={borderSlicePercent => patchSettings({ borderSlicePercent })} />
              <label className="mt-3 flex items-center justify-between text-xs">
                Màu khung trang
                <input className="h-7 w-12" type="color" value={settings.borderColor} onChange={event => patchSettings({ borderColor: event.target.value })} />
              </label>
            </section>
          </fieldset>
        </aside>
        <main className="overflow-auto p-6" style={{ minWidth: 0, minHeight: 0 }}>
          {previewHtml ? (
<iframe ref={frameRef} title={t("PREVIEW_INVOICE_TEMPLATE", "Xem trước mẫu hóa đơn")} srcDoc={previewHtml} className="mx-auto block min-h-[1020px] w-full max-w-[794px] bg-white shadow-xl" />
          ) : (
            <div className="mx-auto max-w-[794px] rounded border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">{loading ? "Đang tải mẫu hóa đơn..." : "Không tải được bản xem trước."}</div>
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
          selectedPath={settings[imagePicker.paramKey]}
          onClose={() => setImagePicker(null)}
          onSelect={file => void selectLibraryImage(file.FILE_NAME, file.PATH)}
        />
      )}
      {xslPickerVisible && (
        <EInvoiceFtpXslPickerPopup
          visible
          sellerId={sellerId}
          xslId={xslId}
          selectedFileName={selectedFtpXslName}
          onClose={() => setXslPickerVisible(false)}
          onSelect={(file) => void applyFtpXslSample(file)}
        />
      )}
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
  path: string
  disabled: boolean
  onPick?: () => void
  onUpload: (file?: File) => void
}) {
  return (
    <div className="mt-3">
      <div className="text-xs font-medium">{label}</div>
      <span className="mt-1 block truncate text-xs font-normal text-slate-500" title={path}>{imageFileLabel(path)}</span>
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
