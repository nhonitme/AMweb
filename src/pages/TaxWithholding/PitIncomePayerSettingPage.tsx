import { useContext, useEffect, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import LoadPanel from "devextreme-react/load-panel"
import TextBox from "devextreme-react/text-box"
import type dxDataGrid from "devextreme/ui/data_grid"
import notify from "devextreme/ui/notify"
import DxPage from "@/dx/DxPage"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import { EInvoiceEditorSection } from "@/pages/EInvoice/components/EInvoiceEditorShell"
import { getApiErrorMessage } from "@/api/apiTypes"
import { getCurrentCompanyCd } from "@/lib/login"
import { LanguageContext } from "@/lib/i18nLoader"
import {
  pitIncomePayerApi,
  type PitIncomePayerSaveRequest,
} from "./pitIncomePayerApi"
import PitSettingTabs from "./PitSettingTabs"
import "./pit.css"

const emptyForm = (): PitIncomePayerSaveRequest => ({
  PAYER_NM: "",
  TAX_CD: "",
  ADDRESS: "",
  PHONE: "",
  EMAIL: "",
})

export default function PitIncomePayerSettingPage() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const company = getCurrentCompanyCd()
  const queryClient = useQueryClient()
  const toolbarRef = useRef<dxDataGrid | null>(null)
  const [form, setForm] = useState<PitIncomePayerSaveRequest>(emptyForm)
  const [saving, setSaving] = useState(false)
  const payer = useQuery({
    queryKey: ["pit-income-payer", company],
    queryFn: pitIncomePayerApi.get,
  })

  useEffect(() => {
    if (!payer.isSuccess) return
    setForm(payer.data
      ? {
          PAYER_NM: payer.data.PAYER_NM ?? "",
          TAX_CD: payer.data.TAX_CD ?? "",
          ADDRESS: payer.data.ADDRESS ?? "",
          PHONE: payer.data.PHONE ?? "",
          EMAIL: payer.data.EMAIL ?? "",
        }
      : emptyForm())
  }, [payer.data, payer.isSuccess])

  const setField = (key: keyof PitIncomePayerSaveRequest, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  async function save() {
    if (!form.PAYER_NM.trim() || !form.TAX_CD.trim()) {
      notify("Tên tổ chức và mã số thuế là bắt buộc", "warning", 3500)
      return
    }
    setSaving(true)
    try {
      await pitIncomePayerApi.save({
        PAYER_NM: form.PAYER_NM.trim(),
        TAX_CD: form.TAX_CD.trim(),
        ADDRESS: form.ADDRESS.trim(),
        PHONE: form.PHONE?.trim() || null,
        EMAIL: form.EMAIL?.trim() || null,
      })
      await queryClient.invalidateQueries({ queryKey: ["pit-income-payer", company] })
      notify("Đã lưu thông tin tổ chức trả thu nhập", "success", 2500)
    } catch (error) {
      notify(getApiErrorMessage(error, "Không lưu được thông tin tổ chức trả thu nhập"), "error", 6000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
        <PitSettingTabs activeTab="income-payer" />
        <GridToolbar
          gridRef={toolbarRef}
          showAdd={false}
          showRefresh
          onRefresh={() => void payer.refetch()}
          showColumnChooser={false}
          showExportPdf={false}
          showExportXlsx={false}
          showImport={false}
          showDelete={false}
          showSearch={false}
          showDateRange={false}
          customItems={[
            {
              key: "save",
              text: saving ? "Đang lưu..." : "Lưu",
              icon: "save",
              disabled: saving || payer.isLoading,
              onClick: () => void save(),
            },
          ]}
        />
        {payer.error && (
          <p role="alert" className="pit-error">
            {getApiErrorMessage(payer.error, "Không tải được thông tin tổ chức trả thu nhập")}
          </p>
        )}
        <div className="relative min-h-0 flex-1 overflow-auto rounded border bg-white p-4">
          <LoadPanel visible={saving || payer.isLoading || payer.isFetching} showIndicator showPane shading />
          <div className="pit-editor mx-auto" style={{ maxWidth: 980 }}>
            <EInvoiceEditorSection title={t("PIT_SECTION_INCOME_PAYER", "Tổ chức trả thu nhập")}>
              <div className="pit-fields">
                <div className="pit-field">
                  <TextBox
                    label={t("PIT_PAYER_NAME", "Tên tổ chức trả thu nhập") + " *"}
                    labelMode="floating"
                    value={form.PAYER_NM}
                    maxLength={255}
                    onValueChanged={(event) => setField("PAYER_NM", String(event.value ?? ""))}
                  />
                </div>
                <div className="pit-field">
                  <TextBox
                    label={t("TAX_CODE", "Mã số thuế") + " *"}
                    labelMode="floating"
                    value={form.TAX_CD}
                    maxLength={14}
                    onValueChanged={(event) => setField("TAX_CD", String(event.value ?? ""))}
                  />
                </div>
                <div className="pit-field">
                  <TextBox
                    label={t("ADDRESS", "Địa chỉ")}
                    labelMode="floating"
                    value={form.ADDRESS}
                    maxLength={500}
                    onValueChanged={(event) => setField("ADDRESS", String(event.value ?? ""))}
                  />
                </div>
                <div className="pit-field">
                  <TextBox
                    label={t("PHONE", "Điện thoại")}
                    labelMode="floating"
                    value={form.PHONE ?? ""}
                    maxLength={20}
                    onValueChanged={(event) => setField("PHONE", String(event.value ?? ""))}
                  />
                </div>
                <div className="pit-field">
                  <TextBox
                    label={t("EMAIL", "Email")}
                    labelMode="floating"
                    mode="email"
                    value={form.EMAIL ?? ""}
                    maxLength={255}
                    onValueChanged={(event) => setField("EMAIL", String(event.value ?? ""))}
                  />
                </div>
              </div>
            </EInvoiceEditorSection>
          </div>
        </div>
      </div>
    </DxPage>
  )
}
