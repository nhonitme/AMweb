import { useContext, useState } from "react"
import Button from "devextreme-react/button"
import Popup from "devextreme-react/popup"
import { LanguageContext } from "@/lib/i18nLoader"

export type ReportPageSettings = {
  orientation: "" | "AUTO" | "PORTRAIT" | "LANDSCAPE"
  paperKind: "" | "AUTO" | "A4" | "A3"
}

type Props = {
  settings: ReportPageSettings
  onClose: () => void
  onApply: (settings: ReportPageSettings) => void
}

export default function ReportPageSetupPopup({ settings, onClose, onApply }: Props) {
  const [draft, setDraft] = useState(settings)
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => translate ? translate(key, fallback) : fallback

  return (
    <Popup
      visible={true}
      title={t("REPORT_PAGE_SETUP", "Cấu hình trang in")}
      showTitle={true}
      showCloseButton={true}
      dragEnabled={false}
      hideOnOutsideClick={false}
      width={420}
      maxWidth="95vw"
      height="auto"
      onHiding={onClose}
    >
      <form className="space-y-4 p-4" onSubmit={(event) => { event.preventDefault(); onApply(draft) }}>
        <label className="block space-y-2">
          <span className="font-medium">{t("REPORT_PAGE_ORIENTATION", "Hướng giấy")}</span>
          <select
            className="w-full rounded border border-slate-300 bg-white px-3 py-2"
            value={draft.orientation}
            onChange={(event) => setDraft({ ...draft, orientation: event.target.value as ReportPageSettings["orientation"] })}
          >
            <option value="">{t("REPORT_USE_CONFIGURED_LAYOUT", "Theo cấu hình báo cáo")}</option>
            <option value="AUTO">{t("REPORT_PAGE_AUTO", "Tự động theo số cột")}</option>
            <option value="PORTRAIT">{t("REPORT_PAGE_PORTRAIT", "Dọc")}</option>
            <option value="LANDSCAPE">{t("REPORT_PAGE_LANDSCAPE", "Ngang")}</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="font-medium">{t("REPORT_PAPER_SIZE", "Khổ giấy")}</span>
          <select
            className="w-full rounded border border-slate-300 bg-white px-3 py-2"
            value={draft.paperKind}
            onChange={(event) => setDraft({ ...draft, paperKind: event.target.value as ReportPageSettings["paperKind"] })}
          >
            <option value="">{t("REPORT_USE_CONFIGURED_LAYOUT", "Theo cấu hình báo cáo")}</option>
            <option value="AUTO">{t("REPORT_PAGE_AUTO", "Tự động theo số cột")}</option>
            <option value="A4">A4</option>
            <option value="A3">A3</option>
          </select>
        </label>
        <p className="text-sm text-slate-600">
          {t("REPORT_PAGE_SETUP_SCOPE", "Áp dụng cho bản xem trước, bản in và file xuất của báo cáo đang mở.")}
        </p>
        <div className="flex justify-end gap-2">
          <Button text={t("CANCEL", "Hủy")} onClick={onClose} />
          <Button text={t("APPLY", "Áp dụng")} type="default" useSubmitBehavior={true} />
        </div>
      </form>
    </Popup>
  )
}
