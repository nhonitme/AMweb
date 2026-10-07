import { useCallback, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import DateBox from "devextreme-react/date-box"
import NumberBox from "devextreme-react/number-box"
import RadioGroup from "devextreme-react/radio-group"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"
import type { HidingEvent, ShownEvent } from "devextreme/ui/popup"
import type { EInvoicePluginCertificate } from "@/api/einvoiceSigningPluginApi"
import { getCustomerLookupName } from "@/components/lookup/customerLookupUtils"
import { LookupPopupProvider, useLookupPopupHost } from "@/components/lookup/LookupPopupHost"
import { toLookupNumber, trimLookupText } from "@/components/lookup/lookupHelpers"
import {
  disableBuiltInPopupEscape,
  usePopupEscapeLayer,
} from "@/components/popup/popupEscapeStack"
import type { CompanyInfo } from "@/types/companyInfo"
import type { CustomerExt } from "@/types/customerExt"
import { useSysCodes } from "@/lib/sysCodeContext"
import EInvoiceBuyerCustomerLookup from "@/pages/EInvoice/components/BuyerCustomerLookup"
import {
  EINV_CERTIFICATE_METHOD_CODE_TYPE,
  buildCertificateMethodOptions,
} from "@/pages/EInvoice/einvoiceDeclarationModel"
import EInvoiceEditorShell, { EInvoiceEditorSection } from "@/pages/EInvoice/components/EInvoiceEditorShell"
import PitRelatedCertificatePanel from "./components/PitRelatedCertificatePanel"
import type { PitIncomePayer } from "./pitIncomePayerApi"
import type { PitXslTemplate } from "./pitXslApi"
import type { PitData, PitDocument, PitField, PitKind, PitSchema } from "./types"

const RELATED_FIELD_KEYS = ["LHCTLQUAN", "KHMSCTCLQUAN", "KHCTCLQUAN", "SCTCLQUAN", "NLCTCLQUAN", "GCHU"] as const

const INCOME_MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Tháng ${String(index + 1).padStart(2, "0")}`,
}))

type TranslateFn = (key: string, fallback: string) => string

type Props = {
  kind: PitKind
  schema: PitSchema
  document: PitDocument | null
  certificates: PitDocument[]
  catalog: PitXslTemplate[]
  companyInfo?: CompanyInfo | null
  incomePayer?: PitIncomePayer | null
  busy: boolean
  t: TranslateFn
  onClose: () => void
  onSave: (data: PitData, xslId?: number | null) => Promise<void>
  onPickCertificate: (callback: (cert: EInvoicePluginCertificate) => void) => void
}

function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function defaults(
  schema: PitSchema,
  companyInfo?: CompanyInfo | null,
  incomePayer?: PitIncomePayer | null,
): PitData {
  const Fields = Object.fromEntries(schema.Fields.map((f) => [f.Key, f.Default ?? ""]))
  const setDefault = (key: string, value?: string | null) => {
    if (key in Fields && value?.trim()) Fields[key] = value.trim()
  }
  if ("HTHUC" in Fields) setDefault("NLAP", today())
  setDefault("NTBAO", today())
  setDefault("NAM", String(new Date().getFullYear()))
  setDefault("TTHANG", String(new Date().getMonth() + 1))
  setDefault("DTHANG", String(new Date().getMonth() + 1))
  if (companyInfo) {
    setDefault("TNNT", companyInfo.COMPANY_NM)
    setDefault("MST", companyInfo.TAX_CD)
    setDefault("TCTTNHAP_TEN", companyInfo.COMPANY_NM)
    setDefault("TCTTNHAP_MST", companyInfo.TAX_CD)
    setDefault("TCTTNHAP_DCHI", companyInfo.ADDRESS)
    setDefault("TCTTNHAP_SDTHOAI", companyInfo.TEL)
    setDefault("CQTQLY", companyInfo.TCQTQLy)
    setDefault("MCQTQLY", companyInfo.MCQTQLy)
    setDefault("TCQT", companyInfo.TCQTQLy)
    setDefault("MCQT", companyInfo.MCQTQLy)
    setDefault("NLHE", companyInfo.OWNER_NM)
    setDefault("DCLHE", companyInfo.ADDRESS)
    setDefault("DCTDTU", companyInfo.EMAIL)
    setDefault("DTLHE", companyInfo.TEL)
    const location = [companyInfo.SIDO, companyInfo.GUMYUN]
      .map((value) => value?.trim() ?? "")
      .filter(Boolean)
      .join(", ")
    setDefault("DDANH", location)
  }
  if (incomePayer) {
    setDefault("TCTTNHAP_TEN", incomePayer.PAYER_NM)
    setDefault("TCTTNHAP_MST", incomePayer.TAX_CD)
    setDefault("TCTTNHAP_DCHI", incomePayer.ADDRESS)
    setDefault("TCTTNHAP_SDTHOAI", incomePayer.PHONE)
  }
  return { Fields, Certificates: [], Items: [] }
}

function catalogLabel(row: PitXslTemplate) {
  const range =
    row.TO_DOC_NO != null && row.TO_DOC_NO > 0
      ? ` · số ${row.FROM_DOC_NO ?? 1}–${row.TO_DOC_NO}`
      : ` · từ số ${row.FROM_DOC_NO ?? 1}`
  return `03/TNCN · ${row.SERIES}${range}${row.TEMPLATE_NM ? ` · ${row.TEMPLATE_NM}` : ""}`
}

function applyCustomerToPitFields(fields: Record<string, string>, customer: CustomerExt | null) {
  return {
    ...fields,
    NNT_TEN: customer ? getCustomerLookupName(customer) : "",
    NNT_MST: customer ? trimLookupText(customer.TAX_CD) : "",
    NNT_DCHI: customer ? trimLookupText(customer.ADDRESS) : "",
    NNT_CCCDAN: customer ? trimLookupText(customer.IDNUMBER) : "",
    NNT_SDTHOAI: customer ? trimLookupText(customer.TEL) : "",
    NNT_DCTDTU: customer ? trimLookupText(customer.EMAIL) : "",
  }
}

export default function PitEditor(props: Props) {
  return (
    <LookupPopupProvider>
      <PitEditorBody {...props} />
    </LookupPopupProvider>
  )
}

function PitEditorBody({
  kind,
  schema,
  document,
  certificates,
  catalog,
  companyInfo,
  incomePayer,
  busy,
  t,
  onClose,
  onSave,
  onPickCertificate,
}: Props) {
  const { getCodesByType } = useSysCodes()
  const activeCatalog = catalog.filter((c) => c.IS_ACTIVE === 1 && c.SERIES)
  const inactiveAssignedTemplate = Boolean(
    kind === "certificate" &&
    !document?.IS_SIGNED &&
    document?.XSL_ID &&
    !activeCatalog.some((c) => c.XSL_ID === document.XSL_ID),
  )
  const initialXslId = (() => {
    if (document?.XSL_ID && activeCatalog.some((c) => c.XSL_ID === document.XSL_ID)) return document.XSL_ID
    if (document?.IS_SIGNED && document.XSL_ID && document.XSL_ID > 0) return document.XSL_ID
    const bySeries = activeCatalog.find((c) => c.SERIES && c.SERIES === document?.DATA?.Fields?.KHCTU)
      ?? activeCatalog.find((c) => c.SERIES && c.SERIES === document?.SERIES)
    if (bySeries) return bySeries.XSL_ID
    if (document) return 0
    return (activeCatalog.find((c) => c.IS_DEFAULT === 1) ?? activeCatalog[0])?.XSL_ID ?? 0
  })()
  const [data, setData] = useState<PitData>(() => {
    const base = document ? structuredClone(document.DATA) : defaults(schema, companyInfo, incomePayer)
    if (kind === "certificate" && !base.Fields.KHCTU) {
      const row = activeCatalog.find((c) => c.XSL_ID === initialXslId)
      if (row?.SERIES) base.Fields.KHCTU = row.SERIES
    }
    return base
  })
  const [xslId, setXslId] = useState<number>(initialXslId)
  const [selectedCertificate, setSelectedCertificate] = useState("")
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [relatedPickerOpen, setRelatedPickerOpen] = useState(false)
  const lookupPopupHost = useLookupPopupHost()
  const readOnly = Boolean(document?.IS_SIGNED)
  const certificateMethodOptions = useMemo(
    () => buildCertificateMethodOptions(getCodesByType(EINV_CERTIFICATE_METHOD_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const setField = (key: string, value: string) =>
    setData((current) => ({ ...current, Fields: { ...current.Fields, [key]: value } }))
  const applyCustomer = useCallback((customer: CustomerExt | null) => {
    setCustomerId(toLookupNumber(customer?.CUSTOMER_ID))
    setData((current) => ({
      ...current,
      Fields: applyCustomerToPitFields(current.Fields, customer),
    }))
  }, [])
  const closeEditor = useCallback(() => {
    if (busy || relatedPickerOpen) {
      return
    }
    onClose()
  }, [busy, onClose, relatedPickerOpen])
  const handlePopupShown = useCallback((event: ShownEvent) => {
    disableBuiltInPopupEscape(event.component)
  }, [])
  const handlePopupHiding = useCallback(
    (event: HidingEvent) => {
      if (busy || lookupPopupHost?.isLookupPopupOpen || relatedPickerOpen) {
        event.cancel = true
        return
      }
      onClose()
    },
    [busy, lookupPopupHost?.isLookupPopupOpen, onClose, relatedPickerOpen],
  )
  usePopupEscapeLayer(true, closeEditor)
  const patchFields = useCallback((patch: Record<string, string>) => {
    setData((current) => ({ ...current, Fields: { ...current.Fields, ...patch } }))
  }, [])
  const setOptionField = (key: string, value: string) => {
    if (kind === "error-notice" && key === "LOAI" && value !== "2") {
      setData((current) => ({
        ...current,
        Fields: {
          ...current.Fields,
          LOAI: value,
          SO: "",
          NTBCCQT: "",
        },
      }))
      return
    }
    if (kind === "certificate" && key === "TCCTU" && !value) {
      patchFields({
        TCCTU: "",
        LHCTLQUAN: "",
        KHMSCTCLQUAN: "",
        KHCTCLQUAN: "",
        SCTCLQUAN: "",
        NLCTCLQUAN: "",
        GCHU: "",
      })
      return
    }
    setField(key, value)
  }

  const groups = [...new Set(schema.Fields.map((f) => f.Group))]

  function pickCatalog(id: string) {
    const row = activeCatalog.find((c) => String(c.XSL_ID) === id)
    if (!row) {
      setXslId(0)
      return
    }
    setXslId(row.XSL_ID)
    setField("KHCTU", row.SERIES || "")
  }

  function fieldInput(field: PitField) {
    if (kind === "certificate" && field.Key === "KHCTU") return null
    if (kind === "certificate" && RELATED_FIELD_KEYS.includes(field.Key as (typeof RELATED_FIELD_KEYS)[number])) return null
    if (
      kind === "error-notice" &&
      (field.Key === "SO" || field.Key === "NTBCCQT") &&
      data.Fields.LOAI !== "2"
    ) {
      return null
    }
    const value = data.Fields[field.Key] ?? ""
    const isIncomeMonth =
      kind === "certificate" && (field.Key === "TTHANG" || field.Key === "DTHANG")
    const isIncomeYear = kind === "certificate" && field.Key === "NAM"
    const incomeYearMax = Number(data.Fields.NLAP?.slice(0, 4)) || new Date().getFullYear()
    const required =
      field.Required ||
      (field.Key === "NNT_CCCDAN" && !data.Fields.NNT_MST) ||
      (field.Group === "Chứng từ liên quan" &&
        field.Key !== "GCHU" &&
        Boolean(data.Fields.TCCTU)) ||
      (["SO", "NTBCCQT"].includes(field.Key) && data.Fields.LOAI === "2")
    const fieldDisabled = readOnly || busy || (kind === "certificate" && field.Key === "NLAP")
    const label = `${field.Label}${required ? " *" : ""}`
    return (
      <div
        className={`einvoice-editor__field pit-field--${field.Key.toLowerCase().replaceAll("_", "-")}`}
        key={field.Key}
      >
        {isIncomeMonth ? (
          <SelectBox
            label={label}
            labelMode="floating"
            dataSource={INCOME_MONTH_OPTIONS}
            valueExpr="value"
            displayExpr="label"
            value={value || null}
            disabled={fieldDisabled}
            onValueChanged={(event) => setField(field.Key, String(event.value ?? ""))}
          />
        ) : isIncomeYear ? (
          <SelectBox
            label={label}
            labelMode="floating"
            dataSource={Array.from({ length: incomeYearMax - 1899 }, (_, index) =>
              String(incomeYearMax - index),
            )}
            value={value || null}
            searchEnabled
            searchTimeout={0}
            disabled={fieldDisabled}
            onValueChanged={(event) => setField(field.Key, String(event.value ?? ""))}
          />
        ) : (field.Type === "option" || field.Key === "NNT_CNCTRU") && field.Options ? (
          <>
            <div className="einvoice-editor__field-label">{label}</div>
            <RadioGroup
              items={field.Options}
              valueExpr="Value"
              displayExpr="Label"
              value={value || field.Default || null}
              layout="horizontal"
              disabled={fieldDisabled}
              onValueChanged={(event) => {
                const next = String(event.value ?? "")
                if (!next) return
                setOptionField(field.Key, next)
              }}
            />
          </>
        ) : field.Options ? (
          <SelectBox
            label={label}
            labelMode="floating"
            dataSource={field.Options.filter((option) => option.Value !== "")}
            valueExpr="Value"
            displayExpr="Label"
            value={value || null}
            showClearButton={!required}
            disabled={fieldDisabled}
            onValueChanged={(event) => setOptionField(field.Key, String(event.value ?? ""))}
          />
        ) : field.Type === "date" ? (
          <DateBox
            label={label}
            labelMode="floating"
            type="date"
            displayFormat="dd/MM/yyyy"
            value={value || null}
            disabled={fieldDisabled}
            onValueChanged={(event) => setField(field.Key, event.value ? String(event.value).slice(0, 10) : "")}
          />
        ) : field.Type === "integer" || field.Type === "money" ? (
          <NumberBox
            label={label}
            labelMode="floating"
            value={value === "" ? null : Number(value)}
            format={field.Type === "money" ? "#,##0.######" : "#,##0"}
            disabled={fieldDisabled}
            onValueChanged={(event) => setField(field.Key, event.value == null ? "" : String(event.value))}
          />
        ) : (
          <TextBox
            label={label}
            labelMode="floating"
            value={value}
            maxLength={field.MaxLength}
            mode={field.Type === "email" ? "email" : "text"}
            disabled={fieldDisabled}
            onValueChanged={(event) => setField(field.Key, String(event.value ?? ""))}
          />
        )}
      </div>
    )
  }

  function addExisting() {
    const row = certificates.find((r) => String(r.DOCUMENT_ID) === selectedCertificate)
    if (!row) return
    if (data.Items.some((i) => i.REF_CTU_ID === row.DOCUMENT_ID)) return
    setData((current) => ({
      ...current,
      Items: [
        ...current.Items,
        {
          REF_CTU_ID: row.DOCUMENT_ID,
          KHMSCTU: "03/TNCN",
          KHCTU: row.SERIES ?? "",
          SCTU: String(row.DOC_NO ?? ""),
          NLAP: row.DOC_DATE?.slice(0, 10) ?? "",
          LCTDT: "8",
          LDO: "",
        },
      ],
    }))
  }

  async function submit() {
    if (kind === "certificate") {
      if (!xslId) {
        notify(
          inactiveAssignedTemplate
            ? t("PIT_XSL_INACTIVE", "Mẫu số ký hiệu đã ngừng sử dụng. Vui lòng chọn mẫu đang hoạt động.")
            : t("PIT_PICK_XSL", "Vui lòng chọn mẫu số ký hiệu đang hoạt động."),
          "warning",
          4000,
        )
        return
      }
      const row = activeCatalog.find((c) => c.XSL_ID === xslId)
      if (!row?.SERIES) {
        notify(t("PIT_XSL_INACTIVE", "Mẫu số ký hiệu đã ngừng sử dụng. Vui lòng chọn mẫu đang hoạt động."), "warning", 4000)
        return
      }
      data.Fields.KHCTU = row.SERIES
      await onSave(data, xslId)
      return
    }
    await onSave(data, null)
  }

  return (
    <EInvoiceEditorShell
      visible
      width="min(1280px, 96vw)"
      height="min(900px, 94vh)"
      title={`${document ? t("PIT_TITLE_EDIT", "Chứng từ") : t("PIT_TITLE_NEW", "Lập mới")} · ${schema.Title}`}
      subtitle={
        kind === "certificate"
          ? undefined
          : `${t("PIT_SUBTITLE_FORM", "Mẫu số")} ${schema.Form}${document?.DOC_NO ? ` · ${t("PIT_SUBTITLE_NO", "Số")} ${document.DOC_NO}` : ""}`
      }
      loading={busy}
      closeDisabled={busy}
      onClose={closeEditor}
      onShown={handlePopupShown}
      onHiding={handlePopupHiding}
      footer={
        <>
          <Button text={t("CLOSE", "Đóng")} disabled={busy} onClick={closeEditor} />
          {!readOnly ? (
            <Button
              text={busy ? t("SAVING", "Đang lưu...") : t("SAVE", "Lưu")}
              icon="save"
              type="default"
              stylingMode="contained"
              disabled={busy}
              onClick={() => void submit()}
            />
          ) : null}
        </>
      }
    >
      <div className="pit-editor">
        <div className="pit-editor-body">
          {kind === "certificate" && (
            <div className="pit-top-sections">
              <EInvoiceEditorSection
                title={t("PIT_SECTION_INCOME_PAYER", "Tổ chức trả thu nhập")}
                className="pit-income-payer-section"
              >
                {kind === "certificate" && !document && incomePayer === null && (
                  <p role="alert" className="pit-error">
                    {t("PIT_NO_INCOME_PAYER", "Chưa cấu hình tổ chức trả thu nhập PIT. Vui lòng nhập thông tin thủ công hoặc cấu hình trong menu PIT.")}
                  </p>
                )}
                <div className="pit-fields">
                  {schema.Fields.filter((field) => field.Group === "Tổ chức trả thu nhập").map(fieldInput)}
                </div>
              </EInvoiceEditorSection>
              <EInvoiceEditorSection
                title={`${t("PIT_SECTION_DOC", "Chứng từ")} · ${t("PIT_SUBTITLE_FORM", "Mẫu số")} ${schema.Form}${document?.DOC_NO ? ` · ${t("PIT_SUBTITLE_NO", "Số")} ${document.DOC_NO}` : ""}`}
                className="pit-document-section"
              >
                <div className="pit-seller">
                  <SelectBox
                    label={t("PIT_CATALOG_LABEL", "Ký hiệu") + " *"}
                    labelMode="floating"
                    dataSource={activeCatalog.map((row) => ({ value: row.XSL_ID, text: catalogLabel(row) }))}
                    valueExpr="value"
                    displayExpr="text"
                    value={xslId || null}
                    disabled={readOnly || busy}
                    onValueChanged={(event) => pickCatalog(String(event.value ?? ""))}
                  />
                  {!activeCatalog.length && (
                    <span className="pit-error">
                      {t("PIT_NO_CATALOG", "Chưa có danh mục. Vào Quản lý mẫu số ký hiệu chứng từ TNCN để đăng ký.")}
                    </span>
                  )}
                  {inactiveAssignedTemplate && (
                    <span className="pit-error">
                      {t("PIT_XSL_INACTIVE", "Mẫu số ký hiệu của chứng từ đã ngừng sử dụng. Vui lòng chọn mẫu đang hoạt động.")}
                    </span>
                  )}
                </div>
                <div className="pit-fields">
                  {schema.Fields.filter((field) => field.Group === "Chứng từ").map(fieldInput)}
                </div>
              </EInvoiceEditorSection>
            </div>
          )}
          {kind !== "certificate" && (
            <div className="pit-heading">
              <strong>Mẫu số {schema.Form}</strong>
              {document?.DOC_NO ? <span>Số {document.DOC_NO}</span> : null}
            </div>
          )}
          {groups
            .filter(
              (g) =>
                (kind !== "certificate" || (g !== "Chứng từ" && g !== "Tổ chức trả thu nhập")) &&
                (g !== "Chứng từ liên quan" || data.Fields.TCCTU),
            )
            .map((group) => (
              <EInvoiceEditorSection
                key={group}
                title={group}
                className={
                  group === "Người nhận thu nhập"
                    ? "pit-form-section pit-person-section"
                    : group === "Thu nhập và thuế"
                      ? "pit-form-section pit-income-section"
                      : group === "Chứng từ liên quan"
                        ? "pit-form-section pit-related-section"
                        : undefined
                }
                bodyClassName={group === "Chứng từ liên quan" ? "einvoice-editor__section-body--compact" : undefined}
              >
                {group === "Chứng từ liên quan" ? (
                  <PitRelatedCertificatePanel
                    fields={data.Fields}
                    formCode={schema.Form}
                    relatedFields={schema.Fields.filter((field) => field.Group === "Chứng từ liên quan")}
                    excludeDocumentId={document?.DOCUMENT_ID ?? 0}
                    readOnly={readOnly}
                    busy={busy}
                    t={t}
                    onPatch={patchFields}
                    onPickerVisibleChange={setRelatedPickerOpen}
                  />
                ) : (
                  <div className="pit-fields">
                    {group === "Người nhận thu nhập" ? (
                      <div className="einvoice-editor__field pit-field--customer">
                        <div className="einvoice-editor__field-label">{t("CUSTOMER", "Khách hàng")}</div>
                        <EInvoiceBuyerCustomerLookup
                          value={customerId}
                          onChange={applyCustomer}
                          readOnly={readOnly || busy}
                          placeholder={t("CustomerSelect", "Chọn khách hàng")}
                          popupTitle={t("CustomerSelect", "Chọn khách hàng")}
                          buttonHint={t("LIST_CUSTOMER", "Mở danh sách khách hàng")}
                        />
                      </div>
                    ) : null}
                    {schema.Fields.filter((field) => field.Group === group).map(fieldInput)}
                  </div>
                )}
              </EInvoiceEditorSection>
            ))}
          {kind === "declaration" && (
            <EInvoiceEditorSection title={t("DECL_CTS_SECTION", "Digital certificates (CTS)")}>
              {!readOnly && (
                <Button
                  icon="plus"
                  text={t("ADD", "Add")}
                  hint={t("DECL_CTS_FROM_PLUGIN", "Load certificate from signing plugin")}
                  disabled={busy}
                  onClick={() =>
                    onPickCertificate((cert) =>
                      setData((current) => ({
                        ...current,
                        Certificates: [
                          ...current.Certificates,
                          {
                            TTCHUC: cert.issuer,
                            SERI: cert.serialNumber,
                            TNGAY: cert.notBefore.slice(0, 19),
                            DNGAY: cert.notAfter.slice(0, 19),
                            HTHUC: 1,
                          },
                        ],
                      })),
                    )
                  }
                />
              )}
              <div className="pit-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("TTCHUC", "Certificate organization")} *</th>
                      <th>{t("SERI", "Serial")} *</th>
                      <th>{t("CERT_VALID_FROM", "Valid from")} *</th>
                      <th>{t("CERT_EXPIRES", "Expires")} *</th>
                      <th>{t("CTS_HTHUC", "CTS method")} *</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.Certificates.map((cert, i) => (
                      <tr key={i}>
                        {(["TTCHUC", "SERI", "TNGAY", "DNGAY"] as const).map((key) => (
                          <td key={key}>
                            <input
                              aria-label={key}
                              required
                              readOnly
                              disabled={busy}
                              type={key === "TNGAY" || key === "DNGAY" ? "datetime-local" : "text"}
                              value={cert[key]}
                            />
                          </td>
                        ))}
                        <td>
                          <select
                            disabled={readOnly || busy}
                            value={cert.HTHUC}
                            onChange={(e) =>
                              setData((current) => ({
                                ...current,
                                Certificates: current.Certificates.map((c, j) =>
                                  i === j ? { ...c, HTHUC: Number(e.target.value) } : c,
                                ),
                              }))
                            }
                          >
                            {certificateMethodOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.text}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {!readOnly && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                setData((current) => ({
                                  ...current,
                                  Certificates: current.Certificates.filter((_, j) => j !== i),
                                }))
                              }
                            >
                              {t("DELETE", "Xóa")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </EInvoiceEditorSection>
          )}
          {kind === "error-notice" && (
            <EInvoiceEditorSection title={t("PIT_ERR_SECTION_TITLE", "Danh sách chứng từ đã lập sai")}>
              {!readOnly && (
                <div className="pit-actions">
                  <select
                    aria-label={t("PIT_ERR_ARIA_SIGNED_DOC", "Chứng từ đã ký")}
                    value={selectedCertificate}
                    onChange={(e) => setSelectedCertificate(e.target.value)}
                  >
                    <option value="">{t("PIT_ERR_SELECT_SIGNED", "Chọn chứng từ đã ký...")}</option>
                    {certificates
                      .filter((c) => !data.Fields.MST || c.TAX_CD === data.Fields.MST)
                      .map((c) => (
                        <option key={c.DOCUMENT_ID} value={c.DOCUMENT_ID}>
                          {c.SERIES} · {c.DOC_NO} · {c.DISPLAY_NAME}
                        </option>
                      ))}
                  </select>
                  <Button text={t("PIT_ERR_ADD_EXISTING", "Thêm chứng từ")} disabled={busy || !selectedCertificate} onClick={addExisting} />
                  <Button
                    text={t("PIT_ERR_ADD_MANUAL", "Nhập chứng từ hệ thống cũ")}
                    disabled={busy}
                    onClick={() =>
                      setData((current) => ({
                        ...current,
                        Items: [
                          ...current.Items,
                          { KHMSCTU: "", KHCTU: "", SCTU: "", NLAP: "", LCTDT: "1", LDO: "" },
                        ],
                      }))
                    }
                  />
                </div>
              )}
              <div className="pit-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("FORM_NO", "Mẫu số")} *</th>
                      <th>{t("SERIES", "Ký hiệu")} *</th>
                      <th>{t("NO", "Số")} *</th>
                      <th>{t("DOC_DATE", "Ngày")} *</th>
                      <th>{t("PIT_ERR_COL_TYPE", "Loại chứng từ")} *</th>
                      <th>{t("REASON", "Lý do")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.Items.map((item, i) => (
                      <tr key={i}>
                        {(["KHMSCTU", "KHCTU", "SCTU", "NLAP"] as const).map((key) => (
                          <td key={key}>
                            <input
                              aria-label={key}
                              required
                              disabled={readOnly || busy || Boolean(item.REF_CTU_ID)}
                              type={key === "NLAP" ? "date" : "text"}
                              value={item[key]}
                              onChange={(e) =>
                                setData((current) => ({
                                  ...current,
                                  Items: current.Items.map((c, j) =>
                                    i === j ? { ...c, [key]: e.target.value } : c,
                                  ),
                                }))
                              }
                            />
                          </td>
                        ))}
                        <td>
                          <select
                            disabled={readOnly || busy || Boolean(item.REF_CTU_ID)}
                            value={item.LCTDT}
                            onChange={(e) =>
                              setData((current) => ({
                                ...current,
                                Items: current.Items.map((c, j) =>
                                  i === j ? { ...c, LCTDT: e.target.value } : c,
                                ),
                              }))
                            }
                          >
                            <option value="1">{t("PIT_LCTDT_ND_70", "Theo NĐ 70")}</option>
                            <option value="7">{t("PIT_LCTDT_ND_123", "Theo NĐ 123")}</option>
                            <option value="8">{t("PIT_LCTDT_ND_254", "Theo NĐ 254")}</option>
                            <option value="CTT50">{t("PIT_LCTDT_CTT50", "Chứng từ CTT50")}</option>
                          </select>
                        </td>
                        <td>
                          <input
                            aria-label={t("REASON", "Lý do")}
                            disabled={readOnly || busy}
                            maxLength={255}
                            value={item.LDO}
                            onChange={(e) =>
                              setData((current) => ({
                                ...current,
                                Items: current.Items.map((c, j) =>
                                  i === j ? { ...c, LDO: e.target.value } : c,
                                ),
                              }))
                            }
                          />
                        </td>
                        <td>
                          {!readOnly && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                setData((current) => ({
                                  ...current,
                                  Items: current.Items.filter((_, j) => j !== i),
                                }))
                              }
                            >
                              {t("DELETE", "Xóa")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </EInvoiceEditorSection>
          )}
          {document?.ERROR_MESSAGE && (
            <p role="alert" className="pit-error">
              {document.ERROR_MESSAGE}
            </p>
          )}
        </div>
      </div>
    </EInvoiceEditorShell>
  )
}
