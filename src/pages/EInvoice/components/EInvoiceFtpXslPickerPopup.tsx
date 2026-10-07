import { useEffect, useMemo, useState } from "react"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import notify from "devextreme/ui/notify"
import {
  fetchEInvoiceDesignerXslSample,
  listEInvoiceDesignerXslSamples,
  previewEInvoiceTemplateDesignerLiveHtml,
  type EInvoiceFtpXslFile,
} from "@/api/einvoiceSettingApi"
import { getApiErrorMessage } from "@/api/apiTypes"

export type EInvoiceFtpXslPickResult = EInvoiceFtpXslFile & {
  XSL_CONTENT?: string
  PREVIEW_HTML?: string
}

type SampleCard = {
  file: EInvoiceFtpXslFile
  displayName: string
  status: "loading" | "ready" | "error"
  xslContent?: string
  previewHtml?: string
  previewUrl?: string
  error?: string
}

type EInvoiceFtpXslPickerPopupProps = {
  visible: boolean
  title?: string
  sellerId: number
  xslId: number
  selectedFileName?: string
  onClose: () => void
  onSelect: (file: EInvoiceFtpXslPickResult) => void
}

function displayTemplateName(fileName: string): string {
  return fileName.replace(/\.(xsl|xslt)$/i, "")
}

function looksLikeHtml(value: string): boolean {
  return value.trimStart().startsWith("<")
}

function toPreviewDocument(html: string): string {
  const trimmed = html.trim()
  if (/^<!doctype html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return trimmed
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:8px;background:#fff;color:#111;font:12px/1.4 Arial,sans-serif}</style></head><body>${trimmed}</body></html>`
}

function revokePreviewUrls(cards: SampleCard[]) {
  for (const card of cards) {
    if (card.previewUrl) URL.revokeObjectURL(card.previewUrl)
  }
}

async function mapPool<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await mapper(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

export default function EInvoiceFtpXslPickerPopup({
  visible,
  title = "Chọn mẫu in hóa đơn",
  sellerId,
  xslId,
  selectedFileName,
  onClose,
  onSelect,
}: EInvoiceFtpXslPickerPopupProps) {
  const [cards, setCards] = useState<SampleCard[]>([])
  const [listing, setListing] = useState(false)
  const [applyingName, setApplyingName] = useState("")

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    setListing(true)
    setCards((prev) => {
      revokePreviewUrls(prev)
      return []
    })
    setApplyingName("")

    void (async () => {
      try {
        const listed = await listEInvoiceDesignerXslSamples()
        if (cancelled) return
        const files = Array.isArray(listed.data) ? listed.data : []
        if (files.length === 0) {
          setCards([])
          return
        }

        setCards(
          files.map((file) => ({
            file,
            displayName: displayTemplateName(file.FILE_NAME),
            status: "loading",
          })),
        )

        await mapPool(files, 2, async (file) => {
          if (cancelled) return null
          try {
            const sample = await fetchEInvoiceDesignerXslSample(file.FILE_NAME)
            const xslContent = sample.XSL_CONTENT || ""
            if (!xslContent.trim()) {
              throw new Error("Mẫu in trống")
            }
            if (!looksLikeHtml(xslContent) && !xslContent.includes("xsl:")) {
              throw new Error("Nội dung mẫu không hợp lệ")
            }
            if (sellerId <= 0) {
              throw new Error("Thiếu thông tin người bán để xem trước")
            }

            const rawHtml = await previewEInvoiceTemplateDesignerLiveHtml({
              sellerId,
              xslId: xslId > 0 ? xslId : 0,
              xslContent,
            })
            const previewHtml = toPreviewDocument(rawHtml || "")
            if (!looksLikeHtml(previewHtml)) {
              throw new Error("Không tạo được bản xem trước")
            }

            const previewUrl = URL.createObjectURL(new Blob([previewHtml], { type: "text/html;charset=utf-8" }))
            if (cancelled) {
              URL.revokeObjectURL(previewUrl)
              return null
            }

            setCards((prev) =>
              prev.map((card) => {
                if (card.file.FILE_NAME !== file.FILE_NAME) return card
                if (card.previewUrl) URL.revokeObjectURL(card.previewUrl)
                return {
                  ...card,
                  status: "ready",
                  xslContent,
                  previewHtml,
                  previewUrl,
                  error: undefined,
                }
              }),
            )
          } catch (error) {
            if (cancelled) return null
            const message = getApiErrorMessage(error, "Không xem trước được mẫu này")
            setCards((prev) =>
              prev.map((card) =>
                card.file.FILE_NAME === file.FILE_NAME
                  ? { ...card, status: "error", error: message }
                  : card,
              ),
            )
          }
          return null
        })
      } catch (error) {
        if (!cancelled) {
          notify(getApiErrorMessage(error, "Không tải được danh sách mẫu in"), "error", 3500)
          setCards([])
        }
      } finally {
        if (!cancelled) setListing(false)
      }
    })()

    return () => {
      cancelled = true
      setCards((prev) => {
        revokePreviewUrls(prev)
        return prev
      })
    }
  }, [visible, sellerId, xslId])

  const readyCount = useMemo(() => cards.filter((card) => card.status === "ready").length, [cards])

  const handlePick = async (card: SampleCard) => {
    if (applyingName) return
    setApplyingName(card.file.FILE_NAME)
    try {
      let xslContent = card.xslContent
      let previewHtml = card.previewHtml
      if (!xslContent?.trim()) {
        const sample = await fetchEInvoiceDesignerXslSample(card.file.FILE_NAME)
        xslContent = sample.XSL_CONTENT || ""
      }
      if (!xslContent.trim()) {
        notify("Mẫu in vừa chọn không có nội dung.", "warning", 3000)
        return
      }
      onSelect({
        FILE_NAME: card.file.FILE_NAME,
        PATH: card.file.PATH,
        XSL_CONTENT: xslContent,
        PREVIEW_HTML: previewHtml,
      })
    } catch (error) {
      notify(getApiErrorMessage(error, "Không áp dụng được mẫu in"), "error", 4000)
    } finally {
      setApplyingName("")
    }
  }

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      title={title}
      width="min(980px, 96vw)"
      height="min(920px, 96vh)"
      showCloseButton
      dragEnabled
    >
      <ToolbarItem
        toolbar="bottom"
        location="before"
        text={
          listing || cards.some((c) => c.status === "loading")
            ? `Đang nạp xem trước... (${readyCount}/${cards.length})`
            : `${cards.length} mẫu in`
        }
      />
      <ToolbarItem
        toolbar="bottom"
        location="after"
        widget="dxButton"
        options={{ text: "Đóng", onClick: onClose, disabled: Boolean(applyingName) }}
      />
      <div className="h-full overflow-auto bg-slate-50 p-3">
        {listing && cards.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Đang tải kho mẫu in...</div>
        ) : cards.length === 0 ? (
          <div className="rounded border border-dashed bg-white p-6 text-sm text-slate-500">
            Chưa có mẫu in trong kho mẫu. Liên hệ quản trị hệ thống để bổ sung.
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[920px] flex-col gap-4">
            {cards.map((card) => {
              const selected = selectedFileName === card.file.FILE_NAME
              const applying = applyingName === card.file.FILE_NAME
              return (
                <div
                  key={card.file.PATH}
                  role="button"
                  tabIndex={0}
                  aria-disabled={Boolean(applyingName)}
                  onClick={() => {
                    if (!applyingName) void handlePick(card)
                  }}
                  onKeyDown={(event) => {
                    if (applyingName) return
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      void handlePick(card)
                    }
                  }}
                  className={`group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-white text-left shadow-sm transition outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    selected
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-slate-200 hover:border-blue-400 hover:shadow-md"
                  } ${applyingName && !applying ? "opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                    <span className="truncate text-base font-semibold text-slate-800">{card.displayName}</span>
                    <span className="shrink-0 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {applying ? "Đang áp dụng..." : selected ? "Đang dùng" : "Chọn"}
                    </span>
                  </div>
                  <div className="relative h-[560px] overflow-hidden bg-[#dbe3ee]">
                    {card.status === "ready" && card.previewUrl ? (
                      <iframe
                        key={card.previewUrl}
                        title={card.displayName}
                        src={card.previewUrl}
                        className="pointer-events-none absolute left-1/2 top-3 border border-slate-300 bg-white shadow"
                        style={{
                          width: 794,
                          height: 1123,
                          transform: "translateX(-50%) scale(0.68)",
                          transformOrigin: "top center",
                        }}
                      />
                    ) : card.status === "error" ? (
                      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-rose-600">
                        {card.error || "Không xem trước được"}
                        <br />
                        <span className="mt-1 block text-slate-500">Vẫn có thể bấm để thử áp dụng.</span>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center p-4 text-sm text-slate-600">
                        Đang áp dụng XML + mẫu in để xem trước...
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Popup>
  )
}
