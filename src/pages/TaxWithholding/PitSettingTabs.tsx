import { useContext } from "react"
import { useNavigate } from "react-router-dom"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import { LanguageContext } from "@/lib/i18nLoader"

type PitSettingTab = "xsl" | "income-payer"

const tabs: Array<{ key: PitSettingTab; labelKey: string; labelFallback: string; path: string }> = [
  {
    key: "income-payer",
    labelKey: "PIT_TAB_INCOME_PAYER",
    labelFallback: "Thông tin tổ chức trả thu nhập",
    path: "/pit-withholding/income-payer-setting",
  },
  {
    key: "xsl",
    labelKey: "PIT_TAB_TEMPLATE",
    labelFallback: "Mẫu số, ký hiệu",
    path: "/pit-withholding/xsl-setting",
  },
]

export default function PitSettingTabs({ activeTab }: { activeTab: PitSettingTab }) {
  const navigate = useNavigate()
  const company = getCurrentCompanyCd()
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  return (
    <div
      role="tablist"
      aria-label={t("PIT_DOCUMENT_SETUP", "Thiết lập chứng từ TNCN")}
      className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-2 pt-1"
    >
      {tabs.map((tab) => {
        const active = tab.key === activeTab
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            className={[
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
            ].join(" ")}
            onClick={() => {
              if (!active) navigate(buildAppPath(company, tab.path))
            }}
          >
            {t(tab.labelKey, tab.labelFallback)}
          </button>
        )
      })}
    </div>
  )
}
