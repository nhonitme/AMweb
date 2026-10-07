import { useContext, useEffect, useMemo, useState } from "react"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import notify from "devextreme/ui/notify"
import { LanguageContext } from "@/lib/i18nLoader"
import {
  fetchEInvoiceDesignerImageFile,
  listEInvoiceDesignerImages,
  type EInvoiceDesignerImageKind,
  type EInvoiceFtpImageFile,
} from "@/api/einvoiceSettingApi"

type EInvoiceFtpImagePickerPopupProps = {
  visible: boolean
  title: string
  imageKind: EInvoiceDesignerImageKind
  selectedPath?: string
  onClose: () => void
  onSelect: (file: EInvoiceFtpImageFile) => void
}

function isCompanySource(file: EInvoiceFtpImageFile) {
  return String(file.SOURCE ?? "").toLowerCase() === "company"
}

export default function EInvoiceFtpImagePickerPopup({
  visible,
  title,
  imageKind,
  selectedPath,
  onClose,
  onSelect,
}: EInvoiceFtpImagePickerPopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const [files, setFiles] = useState<EInvoiceFtpImageFile[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const companyFiles = useMemo(() => files.filter(isCompanySource), [files])
  const libraryFiles = useMemo(() => files.filter(file => !isCompanySource(file)), [files])

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    const objectUrls: string[] = []
    setLoading(true)
    setFiles([])
    setThumbs({})
    void listEInvoiceDesignerImages(imageKind)
      .then(async result => {
        if (cancelled) return
        setFiles(result.data)
        setLoading(false)
        await Promise.all(
          result.data.map(async file => {
            try {
              const blob = await fetchEInvoiceDesignerImageFile(imageKind, file.FILE_NAME, file.PATH)
              if (cancelled) return
              const url = URL.createObjectURL(blob)
              objectUrls.push(url)
              setThumbs(prev => ({ ...prev, [file.PATH]: url }))
            } catch {
              /* thumbnail optional */
            }
          }),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
          notify("Không tải được thư viện ảnh", "error", 3500)
        }
      })

    return () => {
      cancelled = true
      objectUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [visible, imageKind])

  return (
    <Popup visible={visible} onHiding={onClose} title={title} width={720} height={560} showCloseButton dragEnabled>
      <ToolbarItem toolbar="bottom" location="after" widget="dxButton" options={{ text: "Đóng", onClick: onClose }} />
      <div className="h-full overflow-auto p-3">
        {loading ? (
          <div className="p-4 text-sm text-slate-500">{t("LOADING_IMAGE_LIBRARY", "Đang tải thư viện ảnh...")}</div>
        ) : files.length === 0 ? (
          <div className="rounded border border-dashed p-4 text-sm text-slate-500">{t("NO_IMAGE_IN_LIBRARY", "Chưa có ảnh trong thư viện này.")}</div>
        ) : (
          <div className="space-y-4">
            {companyFiles.length > 0 && (
              <ImageGroup title={t("COMPANY_IMAGES", "Ảnh công ty đã tải lên")} files={companyFiles} selectedPath={selectedPath} thumbs={thumbs} onSelect={onSelect} />
            )}
            <ImageGroup
              title={companyFiles.length > 0 ? t("SHARED_LIBRARY", "Thư viện dùng chung") : t("LIBRARY", "Thư viện")}
              files={libraryFiles}
              selectedPath={selectedPath}
              thumbs={thumbs}
              onSelect={onSelect}
              emptyText={t("NO_IMAGE_IN_SHARED_LIBRARY", "Chưa có ảnh trong thư viện dùng chung.")}
            />
          </div>
        )}
      </div>
    </Popup>
  )
}

function ImageGroup({
  title,
  files,
  selectedPath,
  thumbs,
  onSelect,
  emptyText,
}: {
  title: string
  files: EInvoiceFtpImageFile[]
  selectedPath?: string
  thumbs: Record<string, string>
  onSelect: (file: EInvoiceFtpImageFile) => void
  emptyText?: string
}) {
  return (
    <section>
      <div className="mb-2 text-xs font-semibold text-slate-600">{title}</div>
      {files.length === 0 ? (
        <div className="rounded border border-dashed p-3 text-xs text-slate-500">{emptyText}</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {files.map(file => {
            const selected = selectedPath === file.PATH
            return (
              <button
                key={file.PATH}
                type="button"
                title={file.FILE_NAME}
                onClick={() => onSelect(file)}
                className={`overflow-hidden rounded border bg-white text-left ${selected ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200 hover:border-blue-400"}`}
              >
                <div className="flex h-28 items-center justify-center bg-slate-50">
                  {thumbs[file.PATH] ? (
                    <img src={thumbs[file.PATH]} alt={file.FILE_NAME} className="max-h-28 max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">...</span>
                  )}
                </div>
                <div className="truncate px-2 py-1 text-xs" title={file.FILE_NAME}>
                  {file.FILE_NAME}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
