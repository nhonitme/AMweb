import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import NumberBox from "devextreme-react/number-box"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"

import { getEInvoiceMailSetting, saveEInvoiceMailSetting, sendTestEInvoiceMailSetting } from "@/api/einvoiceSettingApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { EInvoiceMailSendOptions, EInvoiceMailSetting } from "@/types/einvoiceSetting"

import { EInvoiceEditorSection } from "./EInvoiceEditorShell"
import "./einvoiceEditor.css"
import "./einvoiceSettingPanel.css"

type SelectOption<TValue extends string | number> = {
  value: TValue
  text: string
}

type MailSource = "SYSTEM" | "CUSTOM"

const DEFAULT_MAIL_SETTING: EInvoiceMailSetting = {
  MAIL_ID: 0,
  COMPANY_CD: "",
  MAIL_CD: "EINV",
  MAIL_NM: "E-invoice mail",
  SMTP_HOST: "",
  SMTP_PORT: 587,
  SECURITY_TYPE: "STARTTLS",
  AUTH_TYPE: "PASSWORD",
  USERNAME: "",
  HAS_PASSWORD: false,
  FROM_EMAIL: "",
  FROM_NAME: "",
  REPLY_TO_EMAIL: "",
  CONFIG: {
    Cc: "",
    Bcc: "",
    TimeoutMs: 100000,
    SendAll: false,
    AttachPdf: true,
    AttachXml: true,
  },
  IS_DEFAULT: 0,
  IS_ACTIVE: 1,
  HAS_COMPANY_SETTING: false,
  IS_USING_SYSTEM_DEFAULT: true,
  SYSTEM_SETTING: null,
}

function createEmptyMailSetting(companyCd: string): EInvoiceMailSetting {
  return {
    ...DEFAULT_MAIL_SETTING,
    COMPANY_CD: companyCd,
    CONFIG: { ...DEFAULT_MAIL_SETTING.CONFIG },
  }
}

function cloneMailSetting(data: EInvoiceMailSetting, companyCd: string): EInvoiceMailSetting {
  return {
    ...createEmptyMailSetting(companyCd),
    ...data,
    COMPANY_CD: companyCd,
    CONFIG: {
      ...DEFAULT_MAIL_SETTING.CONFIG,
      ...(data.CONFIG ?? {}),
    },
    HAS_COMPANY_SETTING: Boolean(data.HAS_COMPANY_SETTING),
    IS_USING_SYSTEM_DEFAULT: Boolean(data.IS_USING_SYSTEM_DEFAULT),
  }
}

function toSystemPreview(data: EInvoiceMailSetting | null | undefined, companyCd: string): EInvoiceMailSetting {
  const preview = cloneMailSetting(data ?? createEmptyMailSetting(companyCd), companyCd)
  preview.MAIL_ID = 0
  preview.HAS_COMPANY_SETTING = false
  preview.IS_USING_SYSTEM_DEFAULT = true
  preview.SYSTEM_SETTING = null
  return preview
}

function displayText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

type EInvoiceMailSettingPanelProps = {
  onLoadingChange?: (loading: boolean) => void
}

export default function EInvoiceMailSettingPanel({ onLoadingChange }: EInvoiceMailSettingPanelProps) {
  const companyCd = getCurrentCompanyCd()
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const [source, setSource] = useState<MailSource>("SYSTEM")
  const [formData, setFormData] = useState<EInvoiceMailSetting>(() => createEmptyMailSetting(companyCd))
  const [systemPreview, setSystemPreview] = useState<EInvoiceMailSetting>(() => createEmptyMailSetting(companyCd))
  const customDraftRef = useRef<EInvoiceMailSetting>(createEmptyMailSetting(companyCd))
  const [password, setPassword] = useState("")
  const [testToEmail, setTestToEmail] = useState("")
  const [testEmailPopupVisible, setTestEmailPopupVisible] = useState(false)
  const [testEmailDraft, setTestEmailDraft] = useState("")
  const [initialLoading, setInitialLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const mailSourceOptions = useMemo<SelectOption<MailSource>[]>(
    () => [
      { value: "SYSTEM", text: t("MAIL_SOURCE_SYSTEM", "Mail gốc") },
      { value: "CUSTOM", text: t("MAIL_SOURCE_CUSTOM", "Tùy chỉnh") },
    ],
    [t],
  )

  const securityTypeOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "NONE", text: t("MAIL_SECURITY_NONE", "None") },
      { value: "SSL", text: t("MAIL_SECURITY_SSL", "SSL") },
      { value: "STARTTLS", text: t("MAIL_SECURITY_STARTTLS", "STARTTLS") },
    ],
    [t],
  )

  const authTypeOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "NONE", text: t("MAIL_AUTH_NONE", "None") },
      { value: "PASSWORD", text: t("MAIL_AUTH_PASSWORD", "Password") },
    ],
    [t],
  )

  const activeOptions = useMemo<SelectOption<number>[]>(
    () => [
      { value: 1, text: t("YES", "Có") },
      { value: 0, text: t("NO", "Không") },
    ],
    [t],
  )

  const applyLoadedSetting = useCallback(
    (data: EInvoiceMailSetting) => {
      const system = toSystemPreview(data.SYSTEM_SETTING ?? (data.IS_USING_SYSTEM_DEFAULT ? data : null), companyCd)
      setSystemPreview(system)

      if (data.IS_USING_SYSTEM_DEFAULT) {
        const customTemplate = cloneMailSetting(system, companyCd)
        customTemplate.IS_USING_SYSTEM_DEFAULT = false
        customTemplate.HAS_COMPANY_SETTING = false
        customDraftRef.current = customTemplate
        setSource("SYSTEM")
        setFormData(system)
      } else {
        const custom = cloneMailSetting(data, companyCd)
        custom.IS_USING_SYSTEM_DEFAULT = false
        customDraftRef.current = custom
        setSource("CUSTOM")
        setFormData(custom)
      }

      setPassword("")
      setTestToEmail("")
    },
    [companyCd],
  )

  const loadMailSetting = useCallback(async () => {
    setInitialLoading(true)
    onLoadingChange?.(true)
    try {
      const response = await getEInvoiceMailSetting()
      applyLoadedSetting(response.data)
    } catch (error) {
      notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải dữ liệu thất bại")), "error", 4000)
    } finally {
      setInitialLoading(false)
      onLoadingChange?.(false)
    }
  }, [applyLoadedSetting, onLoadingChange, t])

  useEffect(() => {
    void loadMailSetting()
  }, [loadMailSetting])

  const handleSourceChange = useCallback(
    (nextSource: MailSource) => {
      if (nextSource === source) {
        return
      }

      if (source === "CUSTOM") {
        customDraftRef.current = formData
      }

      setSource(nextSource)
      setPassword("")
      setTestToEmail("")
      setFormData(nextSource === "SYSTEM" ? systemPreview : customDraftRef.current)
    },
    [formData, source, systemPreview],
  )

  const updateField = useCallback(<K extends keyof EInvoiceMailSetting>(field: K, value: EInvoiceMailSetting[K]) => {
    setFormData((current) => {
      const next = { ...current, [field]: value }
      if (source === "CUSTOM") {
        customDraftRef.current = next
      }
      return next
    })
  }, [source])

  const updateConfigField = useCallback(<K extends keyof EInvoiceMailSendOptions>(field: K, value: EInvoiceMailSendOptions[K]) => {
    setFormData((current) => {
      const next = {
        ...current,
        CONFIG: {
          ...current.CONFIG,
          [field]: value,
        },
      }
      if (source === "CUSTOM") {
        customDraftRef.current = next
      }
      return next
    })
  }, [source])

  const handleSave = useCallback(async () => {
    setSaving(true)
    onLoadingChange?.(true)
    try {
      const response = await saveEInvoiceMailSetting(
        source === "SYSTEM"
          ? { USE_SYSTEM_DEFAULT: true }
          : {
              MAIL_ID: formData.MAIL_ID,
              MAIL_NM: formData.MAIL_NM,
              SMTP_HOST: formData.SMTP_HOST,
              SMTP_PORT: formData.SMTP_PORT,
              SECURITY_TYPE: formData.SECURITY_TYPE,
              AUTH_TYPE: formData.AUTH_TYPE,
              USERNAME: formData.USERNAME,
              PASSWORD: password.trim() || undefined,
              FROM_EMAIL: formData.FROM_EMAIL,
              FROM_NAME: formData.FROM_NAME,
              REPLY_TO_EMAIL: formData.REPLY_TO_EMAIL,
              CONFIG: formData.CONFIG,
              IS_DEFAULT: formData.IS_DEFAULT,
              IS_ACTIVE: formData.IS_ACTIVE,
              USE_SYSTEM_DEFAULT: false,
            },
      )
      applyLoadedSetting(response.data)
      notify(
        source === "SYSTEM"
          ? t("MAIL_SETTING_USE_SYSTEM", "Đã chuyển sang mail gốc")
          : t("MSG_EDIT_SUCCESS", "Cập nhật thành công"),
        "success",
        2500,
      )
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 4000)
    } finally {
      setSaving(false)
      onLoadingChange?.(false)
    }
  }, [applyLoadedSetting, formData, onLoadingChange, password, source, t])

  const sendTestMail = useCallback(
    async (toEmail: string) => {
      const trimmed = toEmail.trim()
      if (!trimmed) {
        return
      }

      setTesting(true)
      onLoadingChange?.(true)
      try {
        await sendTestEInvoiceMailSetting({
          MAIL_NM: formData.MAIL_NM,
          SMTP_HOST: formData.SMTP_HOST,
          SMTP_PORT: formData.SMTP_PORT,
          SECURITY_TYPE: formData.SECURITY_TYPE,
          AUTH_TYPE: formData.AUTH_TYPE,
          USERNAME: formData.USERNAME,
          PASSWORD: password.trim() || undefined,
          FROM_EMAIL: formData.FROM_EMAIL,
          FROM_NAME: formData.FROM_NAME,
          REPLY_TO_EMAIL: formData.REPLY_TO_EMAIL,
          CONFIG: formData.CONFIG,
          TO_EMAIL: trimmed,
        })
        notify(t("MAIL_TEST_SUCCESS", "Đã gửi mail thử"), "success", 2500)
      } catch (error) {
        notify(getApiErrorMessage(error, t("MAIL_TEST_FAILED", "Gửi mail thử thất bại")), "error", 4000)
      } finally {
        setTesting(false)
        onLoadingChange?.(false)
      }
    },
    [formData, onLoadingChange, password, t],
  )

  const handleTestSend = useCallback(() => {
    const toEmail = testToEmail.trim()
    if (!toEmail) {
      setTestEmailDraft("")
      setTestEmailPopupVisible(true)
      return
    }

    void sendTestMail(toEmail)
  }, [sendTestMail, testToEmail])

  const closeTestEmailPopup = useCallback(() => {
    if (testing) {
      return
    }
    setTestEmailPopupVisible(false)
    setTestEmailDraft("")
  }, [testing])

  const confirmTestEmailPopup = useCallback(() => {
    const toEmail = testEmailDraft.trim()
    if (!toEmail) {
      notify(t("MAIL_TEST_TO_REQUIRED", "Nhập email nhận thử"), "warning", 3000)
      return
    }

    setTestToEmail(toEmail)
    setTestEmailPopupVisible(false)
    void sendTestMail(toEmail)
  }, [sendTestMail, t, testEmailDraft])

  const isBusy = initialLoading || saving || testing
  const isSystem = source === "SYSTEM"
  const fieldsReadOnly = isBusy || isSystem
  const passwordPlaceholder = isSystem
    ? t("MAIL_PASSWORD_SYSTEM_HINT", "Dùng mật khẩu mail gốc")
    : formData.HAS_PASSWORD
      ? t("MAIL_PASSWORD_KEEP_HINT", "Để trống nếu không đổi mật khẩu")
      : t("MAIL_PASSWORD_REQUIRED_HINT", "Nhập mật khẩu SMTP")

  const mailName = displayText(formData.MAIL_NM) || t("MAIL_NM", "Tên cấu hình")
  const fromEmail = displayText(formData.FROM_EMAIL)
  const smtpSummary = [displayText(formData.SMTP_HOST), formData.SMTP_PORT ? String(formData.SMTP_PORT) : ""]
    .filter(Boolean)
    .join(":")

  return (
    <>
    <div className="einvoice-setting-panel">
      <header className="einvoice-setting-panel__header einvoice-setting-panel__header--actions-only">
        <div className="einvoice-setting-panel__header-actions">
          <Button
            icon="refresh"
            stylingMode="outlined"
            text={t("REFRESH", "Tải lại")}
            disabled={isBusy}
            onClick={() => void loadMailSetting()}
          />
          {!isSystem ? (
            <Button
              icon="email"
              stylingMode="outlined"
              text={testing ? t("MAIL_TESTING", "Đang gửi...") : t("MAIL_TEST_SEND", "Gửi thử")}
              disabled={isBusy}
              onClick={handleTestSend}
            />
          ) : null}
          <Button
            icon="save"
            type="default"
            stylingMode="contained"
            text={t("SAVE", "Lưu")}
            disabled={isBusy}
            onClick={() => void handleSave()}
          />
        </div>
      </header>

      <div className="einvoice-setting-panel__body">
        <div className="einvoice-setting-panel__stack einvoice-editor am-einvoice-editor-form">
          <div className="einvoice-setting-panel__hero">
            <div className="einvoice-setting-panel__hero-name">{mailName}</div>
            <div className="einvoice-setting-panel__hero-meta">
              <span
                className={[
                  "einvoice-setting-panel__badge",
                  isSystem ? "einvoice-setting-panel__badge--muted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isSystem ? t("MAIL_SOURCE_SYSTEM", "Mail gốc") : t("MAIL_SOURCE_CUSTOM", "Tùy chỉnh")}
              </span>
              <span
                className={[
                  "einvoice-setting-panel__badge",
                  formData.IS_ACTIVE === 1 ? "einvoice-setting-panel__badge--success" : "einvoice-setting-panel__badge--warning",
                ].join(" ")}
              >
                {formData.IS_ACTIVE === 1 ? t("IS_ACTIVE", "Đang dùng") : t("INACTIVE", "Ngưng dùng")}
              </span>
              {fromEmail ? (
                <span className="einvoice-setting-panel__badge">{fromEmail}</span>
              ) : null}
              {smtpSummary ? (
                <span className="einvoice-setting-panel__badge einvoice-setting-panel__badge--muted">{smtpSummary}</span>
              ) : null}
            </div>
            {isSystem ? (
              <div className="einvoice-setting-panel__hero-note">
                {t("MAIL_SYSTEM_READONLY_HINT", "Đang dùng cấu hình mail gốc của hệ thống. Chọn Tùy chỉnh để thiết lập riêng cho công ty.")}
              </div>
            ) : null}
          </div>

          <EInvoiceEditorSection title={t("MAIL_SOURCE_SECTION", "Nguồn mail")}>
            <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
              <div className="einvoice-editor__col-4">
                <SelectBox
                  label={t("MAIL_SOURCE", "Nguồn mail")}
                  labelMode="floating"
                  dataSource={mailSourceOptions}
                  valueExpr="value"
                  displayExpr="text"
                  value={source}
                  readOnly={isBusy}
                  onValueChanged={(event) => handleSourceChange((event.value as MailSource) || "SYSTEM")}
                />
              </div>
              {!isSystem ? (
                <div className="einvoice-editor__col-8">
                  <TextBox
                    label={t("MAIL_TEST_TO", "Email gửi thử")}
                    labelMode="floating"
                    value={testToEmail}
                    readOnly={isBusy}
                    onValueChanged={(event) => setTestToEmail(String(event.value ?? ""))}
                  />
                </div>
              ) : null}
            </div>
          </EInvoiceEditorSection>

          <div className="einvoice-setting-panel__columns">
            <EInvoiceEditorSection title={t("MAIL_SMTP_SECTION", "SMTP server")}>
              <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
                <div className="einvoice-editor__col-8">
                  <TextBox
                    label={t("MAIL_NM", "Tên cấu hình")}
                    labelMode="floating"
                    value={formData.MAIL_NM}
                    readOnly={fieldsReadOnly}
                    onValueChanged={(event) => updateField("MAIL_NM", String(event.value ?? ""))}
                  />
                </div>
                <div className="einvoice-editor__col-4">
                  <SelectBox
                    label={t("IS_ACTIVE", "Kích hoạt")}
                    labelMode="floating"
                    dataSource={activeOptions}
                    valueExpr="value"
                    displayExpr="text"
                    value={formData.IS_ACTIVE}
                    readOnly={fieldsReadOnly}
                    onValueChanged={(event) => updateField("IS_ACTIVE", Number(event.value ?? 1) === 1 ? 1 : 0)}
                  />
                </div>
                <div className="einvoice-editor__col-8">
                  <TextBox
                    label={t("SMTP_HOST", "SMTP host")}
                    labelMode="floating"
                    value={formData.SMTP_HOST}
                    readOnly={fieldsReadOnly}
                    onValueChanged={(event) => updateField("SMTP_HOST", String(event.value ?? ""))}
                  />
                </div>
                <div className="einvoice-editor__col-4">
                  <NumberBox
                    label={t("SMTP_PORT", "SMTP port")}
                    labelMode="floating"
                    value={formData.SMTP_PORT}
                    min={1}
                    max={65535}
                    showSpinButtons
                    readOnly={fieldsReadOnly}
                    onValueChanged={(event) => updateField("SMTP_PORT", Number(event.value ?? 587))}
                  />
                </div>
                <div className="einvoice-editor__col-6">
                  <SelectBox
                    label={t("SECURITY_TYPE", "Bảo mật")}
                    labelMode="floating"
                    dataSource={securityTypeOptions}
                    valueExpr="value"
                    displayExpr="text"
                    value={formData.SECURITY_TYPE}
                    readOnly={fieldsReadOnly}
                    onValueChanged={(event) => updateField("SECURITY_TYPE", String(event.value ?? "STARTTLS"))}
                  />
                </div>
                <div className="einvoice-editor__col-6">
                  <SelectBox
                    label={t("AUTH_TYPE", "Xác thực")}
                    labelMode="floating"
                    dataSource={authTypeOptions}
                    valueExpr="value"
                    displayExpr="text"
                    value={formData.AUTH_TYPE}
                    readOnly={fieldsReadOnly}
                    onValueChanged={(event) => updateField("AUTH_TYPE", String(event.value ?? "PASSWORD"))}
                  />
                </div>
                <div className="einvoice-editor__col-6">
                  <TextBox
                    label={t("USERNAME", "Tên đăng nhập")}
                    labelMode="floating"
                    value={formData.USERNAME ?? ""}
                    readOnly={fieldsReadOnly}
                    onValueChanged={(event) => updateField("USERNAME", String(event.value ?? ""))}
                  />
                </div>
                <div className="einvoice-editor__col-6">
                  <TextBox
                    label={t("PASSWORD", "Mật khẩu")}
                    labelMode="floating"
                    mode="password"
                    value={password}
                    placeholder={passwordPlaceholder}
                    readOnly={fieldsReadOnly}
                    onValueChanged={(event) => setPassword(String(event.value ?? ""))}
                  />
                </div>
              </div>
            </EInvoiceEditorSection>

            <EInvoiceEditorSection title={t("MAIL_SENDER_SECTION", "Người gửi")}>
              <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
                <div className="einvoice-editor__col-12">
                  <TextBox
                    label={t("FROM_EMAIL", "Email gửi")}
                    labelMode="floating"
                    value={formData.FROM_EMAIL}
                    readOnly={fieldsReadOnly}
                    onValueChanged={(event) => updateField("FROM_EMAIL", String(event.value ?? ""))}
                  />
                </div>
                <div className="einvoice-editor__col-12">
                  <TextBox
                    label={t("FROM_NAME", "Tên người gửi")}
                    labelMode="floating"
                    value={formData.FROM_NAME ?? ""}
                    readOnly={fieldsReadOnly}
                    onValueChanged={(event) => updateField("FROM_NAME", String(event.value ?? ""))}
                  />
                </div>
                <div className="einvoice-editor__col-12">
                  <TextBox
                    label={t("REPLY_TO_EMAIL", "Reply-To")}
                    labelMode="floating"
                    value={formData.REPLY_TO_EMAIL ?? ""}
                    readOnly={fieldsReadOnly}
                    onValueChanged={(event) => updateField("REPLY_TO_EMAIL", String(event.value ?? ""))}
                  />
                </div>
              </div>
            </EInvoiceEditorSection>
          </div>

          <EInvoiceEditorSection title={t("MAIL_OPTIONS_SECTION", "Tùy chọn gửi mail hóa đơn")}>
            <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
              <div className="einvoice-editor__col-6">
                <TextBox
                  label={t("MAIL_CC", "CC")}
                  labelMode="floating"
                  value={formData.CONFIG.Cc ?? ""}
                  readOnly={fieldsReadOnly}
                  onValueChanged={(event) => updateConfigField("Cc", String(event.value ?? ""))}
                />
              </div>
              <div className="einvoice-editor__col-6">
                <TextBox
                  label={t("MAIL_BCC", "BCC")}
                  labelMode="floating"
                  value={formData.CONFIG.Bcc ?? ""}
                  readOnly={fieldsReadOnly}
                  onValueChanged={(event) => updateConfigField("Bcc", String(event.value ?? ""))}
                />
              </div>
              <div className="einvoice-editor__col-4">
                <NumberBox
                  label={t("MAIL_TIMEOUT_MS", "Timeout (ms)")}
                  labelMode="floating"
                  value={formData.CONFIG.TimeoutMs ?? 100000}
                  min={1000}
                  max={600000}
                  showSpinButtons
                  readOnly={fieldsReadOnly}
                  onValueChanged={(event) => updateConfigField("TimeoutMs", Number(event.value ?? 100000))}
                />
              </div>
              <div className="einvoice-editor__col-4 einvoice-setting-panel__checkbox-row">
                <CheckBox
                  text={t("MAIL_SEND_ALL", "Gửi một lần cho tất cả người nhận")}
                  value={Boolean(formData.CONFIG.SendAll)}
                  readOnly={fieldsReadOnly}
                  onValueChanged={(event) => updateConfigField("SendAll", Boolean(event.value))}
                />
              </div>
              <div className="einvoice-editor__col-2 einvoice-setting-panel__checkbox-row">
                <CheckBox
                  text={t("MAIL_ATTACH_PDF", "Đính kèm PDF")}
                  value={formData.CONFIG.AttachPdf !== false}
                  readOnly={fieldsReadOnly}
                  onValueChanged={(event) => updateConfigField("AttachPdf", Boolean(event.value))}
                />
              </div>
              <div className="einvoice-editor__col-2 einvoice-setting-panel__checkbox-row">
                <CheckBox
                  text={t("MAIL_ATTACH_XML", "Đính kèm XML")}
                  value={formData.CONFIG.AttachXml !== false}
                  readOnly={fieldsReadOnly}
                  onValueChanged={(event) => updateConfigField("AttachXml", Boolean(event.value))}
                />
              </div>
            </div>
          </EInvoiceEditorSection>
        </div>
      </div>
    </div>

    <Popup
      visible={testEmailPopupVisible}
      onHiding={closeTestEmailPopup}
      dragEnabled={false}
      hideOnOutsideClick={!testing}
      showCloseButton={!testing}
      width={480}
      height="auto"
      title={t("MAIL_TEST_TO", "Email gửi thử")}
      animation={POPUP_FADE_ANIMATION}
    >
      <ToolbarItem
        toolbar="bottom"
        location="after"
        widget="dxButton"
        options={{
          text: testing ? t("MAIL_TESTING", "Đang gửi...") : t("MAIL_TEST_SEND", "Gửi thử"),
          icon: "email",
          type: "default",
          stylingMode: "contained",
          disabled: testing || !testEmailDraft.trim(),
          onClick: confirmTestEmailPopup,
        }}
      />
      <ToolbarItem
        toolbar="bottom"
        location="after"
        widget="dxButton"
        options={{
          text: t("CANCEL", "Hủy"),
          stylingMode: "outlined",
          disabled: testing,
          onClick: closeTestEmailPopup,
        }}
      />

      <div className="flex flex-col gap-3 p-1">
        <div className="text-xs text-slate-500">
          {t("MAIL_TEST_TO_HINT", "Nhập email nhận mail thử để kiểm tra cấu hình SMTP.")}
        </div>
        <TextBox
          value={testEmailDraft}
          showClearButton
          disabled={testing}
          label={t("MAIL_TEST_TO", "Email gửi thử")}
          labelMode="floating"
          placeholder={t("MAIL_TEST_TO_PLACEHOLDER", "vd: you@company.com")}
          onValueChanged={(event) => setTestEmailDraft(String(event.value ?? ""))}
          onEnterKey={confirmTestEmailPopup}
        />
      </div>
    </Popup>
    </>
  )
}
