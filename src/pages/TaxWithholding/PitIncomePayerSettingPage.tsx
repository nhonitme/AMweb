import { useContext, useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Button from "devextreme-react/button"
import LoadPanel from "devextreme-react/load-panel"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"
import DxPage from "@/dx/DxPage"
import { EInvoiceEditorSection } from "@/pages/EInvoice/components/EInvoiceEditorShell"
import { getApiErrorMessage } from "@/api/apiTypes"
import { getCurrentCompanyCd } from "@/lib/login"
import { LanguageContext } from "@/lib/i18nLoader"
import {
  pitIncomePayerApi,
  type PitIncomePayerSaveRequest,
} from "./pitIncomePayerApi"
import PitSettingTabs from "./PitSettingTabs"
import usePitSaveShortcut from "./usePitSaveShortcut"
import "@/pages/EInvoice/components/einvoiceSettingPanel.css"
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
  const [form, setForm] = useState<PitIncomePayerSaveRequest>(emptyForm)
  const [saving, setSaving] = useState(false)
  const payer = useQuery({
    queryKey: ["pit-income-payer", company],
    queryFn: pitIncomePayerApi.get,
  })
  const isBusy = saving || payer.isLoading || payer.isFetching
  const baseline: PitIncomePayerSaveRequest = {
    PAYER_NM: payer.data?.PAYER_NM ?? "",
    TAX_CD: payer.data?.TAX_CD ?? "",
    ADDRESS: payer.data?.ADDRESS ?? "",
    PHONE: payer.data?.PHONE ?? "",
    EMAIL: payer.data?.EMAIL ?? "",
  }
  const isDirty = (Object.keys(baseline) as Array<keyof PitIncomePayerSaveRequest>)
    .some((key) => form[key] !== baseline[key])
  usePitSaveShortcut(save, !isBusy && isDirty && !payer.isError)

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
    if (isBusy) return
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
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
        <PitSettingTabs activeTab="income-payer" />
        <div className="einvoice-setting-panel relative min-h-0 flex-1">
          <LoadPanel visible={isBusy} showIndicator showPane shading />
          <header className="einvoice-setting-panel__header einvoice-setting-panel__header--actions-only">
            <div className="einvoice-setting-panel__header-actions">
              <Button
                icon="revert"
                stylingMode="outlined"
                text={t("RESET", "Hoàn tác")}
                disabled={isBusy || !isDirty}
                onClick={() => setForm(baseline)}
              />
              <Button
                icon="save"
                type="default"
                stylingMode="contained"
                text={saving ? "Đang lưu..." : t("SAVE", "Lưu")}
                disabled={isBusy || !isDirty || payer.isError}
                onClick={() => void save()}
              />
              <Button
                icon="refresh"
                stylingMode="outlined"
                text={t("REFRESH", "Tải lại")}
                disabled={isBusy}
                onClick={() => void payer.refetch()}
              />
            </div>
          </header>
          <div className="einvoice-setting-panel__body">
            <div className="einvoice-setting-panel__stack am-einvoice-editor-form">
              {payer.error && (
                <p role="alert" className="pit-error">
                  {getApiErrorMessage(payer.error, "Không tải được thông tin tổ chức trả thu nhập")}
                </p>
              )}
              <div className="einvoice-setting-panel__hero">
                <div className="einvoice-setting-panel__hero-name">
                  {form.PAYER_NM.trim() || t("PIT_SECTION_INCOME_PAYER", "Tổ chức trả thu nhập")}
                </div>
                {form.TAX_CD && (
                  <div className="einvoice-setting-panel__hero-meta">
                    <span className="einvoice-setting-panel__badge">MST: {form.TAX_CD}</span>
                  </div>
                )}
              </div>
              <EInvoiceEditorSection title={t("SELLER_GENERAL", "Thông tin chung")}>
                <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
                  <div className="einvoice-setting-panel__field einvoice-editor__col-12">
                    <TextBox
                      label={t("PIT_PAYER_NAME", "Tên tổ chức trả thu nhập") + " *"}
                      labelMode="floating"
                      value={form.PAYER_NM}
                      disabled={isBusy}
                      maxLength={255}
                      onValueChanged={(event) => setField("PAYER_NM", String(event.value ?? ""))}
                    />
                  </div>
                  <div className="einvoice-setting-panel__field einvoice-editor__col-4">
                    <TextBox
                      label={t("TAX_CODE", "Mã số thuế") + " *"}
                      labelMode="floating"
                      value={form.TAX_CD}
                      readOnly
                      disabled={isBusy}
                      maxLength={14}
                    />
                  </div>
                  <div className="einvoice-setting-panel__field einvoice-editor__col-12">
                    <TextBox
                      label={t("ADDRESS", "Địa chỉ")}
                      labelMode="floating"
                      value={form.ADDRESS}
                      disabled={isBusy}
                      maxLength={500}
                      onValueChanged={(event) => setField("ADDRESS", String(event.value ?? ""))}
                    />
                  </div>
                </div>
              </EInvoiceEditorSection>
              <EInvoiceEditorSection title={t("CONTACT_INFO", "Thông tin liên hệ")}>
                <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
                  <div className="einvoice-setting-panel__field einvoice-editor__col-4">
                    <TextBox
                      label={t("PHONE", "Điện thoại")}
                      labelMode="floating"
                      value={form.PHONE ?? ""}
                      disabled={isBusy}
                      maxLength={20}
                      onValueChanged={(event) => setField("PHONE", String(event.value ?? ""))}
                    />
                  </div>
                  <div className="einvoice-setting-panel__field einvoice-editor__col-8">
                    <TextBox
                      label={t("EMAIL", "Email")}
                      labelMode="floating"
                      mode="email"
                      value={form.EMAIL ?? ""}
                      disabled={isBusy}
                      maxLength={255}
                      onValueChanged={(event) => setField("EMAIL", String(event.value ?? ""))}
                    />
                  </div>
                </div>
              </EInvoiceEditorSection>
            </div>
          </div>
        </div>
      </div>
    </DxPage>
  )
}
