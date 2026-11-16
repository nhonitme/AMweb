import PitDeclarationCertificates from "./forms/PitDeclarationCertificates"
import { PIT_CERTIFICATE_MONEY_FIELDS, pitCertificateMoneyError } from "./pitCertificateModel"
import PitErrorNoticeItems from "./forms/PitErrorNoticeItems"
import { createPitDocument, pitDate, PIT_DOCUMENT_INFO, type PitFieldKey } from "./pitDocumentModel"
import PitCertificateForm, { PitCertificateHeaderFields, PitCertificatePayerFields } from "./forms/PitCertificateForm"
import PitDeclarationForm from "./forms/PitDeclarationForm"
import PitErrorNoticeForm from "./forms/PitErrorNoticeForm"
import { useCallback, useEffect, useMemo, useState } from "react"
import DateBox from "devextreme-react/date-box"
import EditorActionToolbar from "@/components/toolbar/EditorActionToolbar"
import NumberBox from "devextreme-react/number-box"
import RadioGroup from "devextreme-react/radio-group"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"
import type { HidingEvent, ShownEvent } from "devextreme/ui/popup"
import { getApiErrorMessage } from "@/api/apiTypes"
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
import PitCertificateSelectPopup from "./components/PitCertificateSelectPopup"
import type { PitIncomePayer } from "./pitIncomePayerApi"
import type { PitXslTemplate } from "./pitXslApi"
import type { PitDocument, PitFormField, PitKind } from "./types"
import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup"
import { createPopupShortcutWrapperAttr, usePopupShortcutScopeId } from "@/lib/popupShortcutScope"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import useShortcutHelp from "@/hooks/useShortcutHelp"
import usePitSaveShortcut from "./usePitSaveShortcut"
import { formatPitMessage } from "./pitMessages"
import { openPitPrintPreview } from "./pitPrintViewer"

const RELATED_FIELD_KEYS = ["LHCTLQUAN", "KHMSCTCLQUAN", "KHCTCLQUAN", "SCTCLQUAN", "NLCTCLQUAN", "GCHU"] as const

type TranslateFn = (key: string, fallback: string) => string

type Props = {
  kind: PitKind
  document: PitDocument | null
  catalog: PitXslTemplate[]
  companyInfo?: CompanyInfo | null
  incomePayer?: PitIncomePayer | null
  busy: boolean
  t: TranslateFn
  onClose: () => void
  onSave: (data: PitDocument, xslId?: number | null) => Promise<void>
  onSign?: (doc: PitDocument) => void | Promise<void>
  onPickCertificate: (callback: (cert: EInvoicePluginCertificate) => void) => void
}

function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function defaults(
  kind: PitKind,
  companyInfo?: CompanyInfo | null,
  incomePayer?: PitIncomePayer | null,
): PitDocument {
  const data = createPitDocument(kind)
  const setDefault = (key: PitFieldKey, value?: string | null) => {
    if (key in data && value?.trim()) Object.assign(data, { [key]: value.trim() })
  }
  if ("HTHUC" in data) setDefault("NLAP", today())
  setDefault("NTBAO", today())
  if (kind === "certificate") {
    data.NAM = new Date().getFullYear()
    data.TTHANG = new Date().getMonth() + 1
    data.DTHANG = new Date().getMonth() + 1
  }
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
  return data
}

function catalogLabel(row: PitXslTemplate, t: TranslateFn) {
  const range =
    row.TO_DOC_NO != null && row.TO_DOC_NO > 0
      ? ` · ${formatPitMessage(t("PIT_CERT_NUMBER_RANGE", "Số {0}–{1}"), row.FROM_DOC_NO ?? 1, row.TO_DOC_NO)}`
      : ` · ${formatPitMessage(t("PIT_CERT_NUMBER_FROM", "Từ số {0}"), row.FROM_DOC_NO ?? 1)}`
  return `03/TNCN · ${row.SERIES}${range}${row.TEMPLATE_NM ? ` · ${row.TEMPLATE_NM}` : ""}`
}

function applyCustomerToPitFields(fields: PitDocument, customer: CustomerExt | null) {
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
  document,
  catalog,
  companyInfo,
  incomePayer,
  busy,
  t,
  onClose,
  onSave,
  onSign,
  onPickCertificate,
}: Props) {
  const { getCodesByType } = useSysCodes()
  const incomeTypeOptions = useMemo(
    () => getCodesByType("PIT_INCOME_TYPE")
      .filter((code) => /^[1-8]$/.test(code.CODE_CD))
      .map((code) => ({ CODE_CD: Number(code.CODE_CD), text: t(code.CODE_NAME, code.CODE_NAME || code.CODE_CD) })),
    [getCodesByType, t],
  )
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
    const bySeries = activeCatalog.find((c) => c.SERIES && c.SERIES === document?.KHCTU)
      ?? activeCatalog.find((c) => c.SERIES && c.SERIES === document?.SERIES)
    if (bySeries) return bySeries.XSL_ID
    if (document) return 0
    return (activeCatalog.find((c) => c.IS_DEFAULT === 1) ?? activeCatalog[0])?.XSL_ID ?? 0
  })()
  const [data, setData] = useState<PitDocument>(() => {
    const base = document ? structuredClone(document) : defaults(kind, companyInfo, incomePayer)
    if (kind === "certificate" && !document) {
      base.KTNHAP = incomeTypeOptions[0]?.CODE_CD ?? null
    }
    if (kind === "certificate" && !base.KHCTU) {
      const row = activeCatalog.find((c) => c.XSL_ID === initialXslId)
      if (row?.SERIES) base.KHCTU = row.SERIES
    }
    return base
  })
  const [xslId, setXslId] = useState<number>(initialXslId)
  const [validationAttempted, setValidationAttempted] = useState(false)
  const [errorNoticePickerOpen, setErrorNoticePickerOpen] = useState(false)
  const closeErrorNoticePicker = useCallback(() => setErrorNoticePickerOpen(false), [])
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [relatedPickerOpen, setRelatedPickerOpen] = useState(false)
  const lookupPopupHost = useLookupPopupHost()
  const readOnly = Boolean(document?.IS_SIGNED)
  const popupScopeId = usePopupShortcutScopeId("pit-editor")
  const handlePrint = useCallback(async () => {
    const id = Number(data.DOCUMENT_ID ?? document?.DOCUMENT_ID ?? 0)
    if (!Number.isFinite(id) || id <= 0) {
      notify(t("SAVE_BEFORE_PRINT", "Vui lòng lưu chứng từ trước khi in"), "warning", 2500)
      return
    }
    try {
      if (!(await openPitPrintPreview(kind, id))) {
        notify(t("PIT_PREVIEW_BLOCKED", "Trình duyệt đã chặn cửa sổ xem trước"), "warning", 4000)
      }
    } catch (error) {
      notify(getApiErrorMessage(error, t("PIT_ACTION_FAILED", "Không thực hiện được thao tác chứng từ")), "error", 6000)
    }
  }, [data.DOCUMENT_ID, document?.DOCUMENT_ID, kind, t])

  const documentId = Number(data.DOCUMENT_ID ?? document?.DOCUMENT_ID ?? 0)
  const canSignFromPopup = Boolean(onSign && documentId > 0 && !data.IS_SIGNED && !readOnly)
  const handleSign = useCallback(() => {
    if (!onSign) {
      return
    }
    const id = Number(data.DOCUMENT_ID ?? document?.DOCUMENT_ID ?? 0)
    if (!Number.isFinite(id) || id <= 0) {
      notify(t("SAVE_BEFORE_SIGN", "Vui lòng lưu chứng từ trước khi ký"), "warning", 2500)
      return
    }
    if (data.IS_SIGNED) {
      return
    }
    if (inactiveAssignedTemplate) {
      notify(t("PIT_XSL_INACTIVE", "Mẫu số ký hiệu đã ngừng sử dụng. Vui lòng chọn mẫu đang hoạt động."), "warning", 4000)
      return
    }
    void onSign(data)
  }, [data, document?.DOCUMENT_ID, inactiveAssignedTemplate, onSign, t])
  const firstIncomeType = incomeTypeOptions[0]?.CODE_CD
  useEffect(() => {
    if (kind !== "certificate" || document || firstIncomeType == null) return
    setData((current) => current.KTNHAP == null
      ? { ...current, KTNHAP: firstIncomeType }
      : current)
  }, [kind, document, firstIncomeType])
  const incomeTypeValue = data.KTNHAP ?? null
  const incomeTypeValid = incomeTypeOptions.some((option) => option.CODE_CD === incomeTypeValue)
  const incomeTypeMessage = kind !== "certificate" || readOnly ? ""
    : !incomeTypeOptions.length
      ? t("PIT_INCOME_TYPE_EMPTY", "Chưa tải được danh mục khoản thu nhập. Vui lòng làm mới danh mục.")
      : incomeTypeValue !== null && !incomeTypeValid
        ? t("PIT_INCOME_TYPE_INVALID", "Khoản thu nhập cũ không hợp lệ hoặc đã ngừng sử dụng. Vui lòng chọn lại.")
        : !incomeTypeValid ? t("PIT_INCOME_TYPE_REQUIRED", "Vui lòng chọn khoản thu nhập.") : ""
  const certificateMethodOptions = useMemo(
    () => buildCertificateMethodOptions(getCodesByType(EINV_CERTIFICATE_METHOD_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const setField = <K extends PitFieldKey,>(key: K, value: PitDocument[K]) =>
    setData((current) => ({ ...current, [key]: value }))
  const applyCustomer = useCallback((customer: CustomerExt | null) => {
    setCustomerId(toLookupNumber(customer?.CUSTOMER_ID))
    setData((current) => applyCustomerToPitFields(current, customer))
  }, [])
  const shortcutActions = useMemo(() => {
    const actions = [
      SHORTCUT_ACTIONS.SAVE,
      SHORTCUT_ACTIONS.SAVE_AND_CLOSE,
      SHORTCUT_ACTIONS.PRINT,
      SHORTCUT_ACTIONS.CLOSE,
      SHORTCUT_ACTIONS.HELP,
    ]
    if (kind === "declaration" || kind === "error-notice") {
      actions.splice(4, 0, SHORTCUT_ACTIONS.ADD_ROW)
    }
    return actions
  }, [kind])
  const {
    shortcutHelpVisible,
    shortcutHelpItems,
    openShortcutHelp,
    closeShortcutHelp,
  } = useShortcutHelp(shortcutActions)
  const closeEditor = useCallback(() => {
    if (shortcutHelpVisible) {
      closeShortcutHelp()
      return
    }
    if (busy || relatedPickerOpen || errorNoticePickerOpen) {
      return
    }
    onClose()
  }, [busy, closeShortcutHelp, errorNoticePickerOpen, onClose, relatedPickerOpen, shortcutHelpVisible])
  const handlePopupShown = useCallback((event: ShownEvent) => {
    disableBuiltInPopupEscape(event.component)
  }, [])
  const handlePopupHiding = useCallback(
    (event: HidingEvent) => {
      if (busy || lookupPopupHost?.isLookupPopupOpen || relatedPickerOpen || errorNoticePickerOpen) {
        event.cancel = true
        return
      }
      onClose()
    },
    [busy, lookupPopupHost?.isLookupPopupOpen, onClose, relatedPickerOpen, errorNoticePickerOpen],
  )
  usePopupEscapeLayer(true, closeEditor)
  const patchDocument = useCallback((patch: Partial<PitDocument>) => {
    setData((current) => ({ ...current, ...patch }))
  }, [])
  const setOptionField = (key: PitFieldKey, value: number | null) => {
    if (kind === "error-notice" && key === "LOAI" && value !== 2) {
      patchDocument({ LOAI: value, SO: "", NTBCCQT: null })
      return
    }
    if (kind === "certificate" && key === "TCCTU" && value === null) {
      patchDocument({ TCCTU: null, LHCTLQUAN: null, KHMSCTCLQUAN: "", KHCTCLQUAN: "", SCTCLQUAN: "", NLCTCLQUAN: null, GCHU: "" })
      return
    }
    setField(key, value)
  }

  const documentInfo = PIT_DOCUMENT_INFO[kind]

  function pickCatalog(id: string) {
    const row = activeCatalog.find((c) => String(c.XSL_ID) === id)
    if (!row) {
      setXslId(0)
      return
    }
    setXslId(row.XSL_ID)
    setField("KHCTU", row.SERIES || "")
  }

  function fieldInput(field: PitFormField) {
    field = { Type: "text", Required: true, MaxLength: 400, ...field }
    if (kind === "certificate" && field.Key === "KHCTU") return null
    if (kind === "certificate" && RELATED_FIELD_KEYS.includes(field.Key as (typeof RELATED_FIELD_KEYS)[number])) return null
    if (
      kind === "error-notice" &&
      (field.Key === "SO" || field.Key === "NTBCCQT") &&
      data.LOAI !== 2
    ) {
      return null
    }
    const value = data[field.Key] ?? null
    const isIncomeMonth =
      kind === "certificate" && (field.Key === "TTHANG" || field.Key === "DTHANG")
    const isIncomeYear = kind === "certificate" && field.Key === "NAM"
    const incomeYearMax = Number(data.NLAP?.slice(0, 4)) || new Date().getFullYear()
    const required =
      field.Required ||
      (field.Key === "NNT_CCCDAN" && !data.NNT_MST) ||
      (["SO", "NTBCCQT"].includes(field.Key) && data.LOAI === 2)
    const fieldDisabled = readOnly || busy || (kind === "certificate" && field.Key === "NLAP")
    if (kind === "certificate") {
      field = {
        ...field,
        Label: t(`PIT_CERT_FIELD_${field.Key}`, field.Label),
        Options: field.Options?.map((option) => ({
          ...option,
          Label: t(`PIT_CERT_OPTION_${field.Key}_${option.Value || "ORIGINAL"}`, option.Label),
        })),
      }
    }
    const label = `${field.Label}${required ? " *" : ""}`
    const moneyError = kind === "certificate" && validationAttempted
      ? pitCertificateMoneyError(field.Key, value, t) : null
    return (
      <div
        className={`einvoice-editor__field pit-field--${field.Key.toLowerCase().replace(/_/g, "-")}`}
        key={field.Key}
      >
        {kind === "certificate" && field.Key === "KTNHAP" ? (
          <>
            <SelectBox
              label={label}
              labelMode="floating"
              dataSource={readOnly && value !== null && !incomeTypeValid
                ? [...incomeTypeOptions, { CODE_CD: value, text: String(value) }]
                : incomeTypeOptions}
              valueExpr="CODE_CD"
              displayExpr="text"
              value={value ?? null}
              searchEnabled
              disabled={fieldDisabled}
              onValueChanged={(event) => setField(field.Key, event.value == null ? null : Number(event.value))}
            />
            {incomeTypeMessage && <span role="alert" className="pit-error">{incomeTypeMessage}</span>}
          </>
        ) : isIncomeMonth ? (
          <SelectBox
            label={label}
            labelMode="floating"
            dataSource={Array.from({ length: 12 }, (_, index) => ({
              value: index + 1,
              label: formatPitMessage(t("PIT_CERT_MONTH", "Tháng {0}"), String(index + 1).padStart(2, "0")),
            }))}
            valueExpr="value"
            displayExpr="label"
            value={value || null}
            disabled={fieldDisabled}
            onValueChanged={(event) => setField(field.Key, event.value == null ? null : Number(event.value))}
          />
        ) : isIncomeYear ? (
          <SelectBox
            label={label}
            labelMode="floating"
            dataSource={Array.from({ length: incomeYearMax - 1899 }, (_, index) =>
              incomeYearMax - index,
            )}
            value={value || null}
            searchEnabled
            searchTimeout={0}
            disabled={fieldDisabled}
            onValueChanged={(event) => setField(field.Key, event.value == null ? null : Number(event.value))}
          />
        ) : (field.Type === "option" || field.Key === "NNT_CNCTRU") && field.Options ? (
          <>
            <div className="einvoice-editor__field-label">{label}</div>
            <RadioGroup
              items={field.Options.map((option) => ({ ...option, Value: Number(option.Value) }))}
              valueExpr="Value"
              displayExpr="Label"
              value={value ?? null}
              layout="horizontal"
              disabled={fieldDisabled}
              onValueChanged={(event) => {
                const next = event.value == null ? null : Number(event.value)
                if (next === null) return
                setOptionField(field.Key, next)
              }}
            />
          </>
        ) : field.Options ? (
          <SelectBox
            label={label}
            labelMode="floating"
            dataSource={field.Options.filter((option) => option.Value !== "").map((option) => ({ ...option, Value: Number(option.Value) }))}
            valueExpr="Value"
            displayExpr="Label"
            value={value || null}
            showClearButton={!required}
            disabled={fieldDisabled}
            onValueChanged={(event) => setOptionField(field.Key, event.value == null ? null : Number(event.value))}
          />
        ) : field.Type === "date" ? (
          <DateBox
            label={label}
            labelMode="floating"
            type="date"
            displayFormat="dd/MM/yyyy"
            value={value || null}
            disabled={fieldDisabled}
            onValueChanged={(event) => setField(field.Key, pitDate(event.value))}
          />
        ) : field.Type === "integer" || field.Type === "money" ? (
          <NumberBox
            label={label}
            labelMode="floating"
            value={value == null ? undefined : Number(value)}
            format={field.Type === "money" ? "#,##0.######" : "#,##0"}
            isValid={!moneyError}
            validationError={moneyError ? { message: moneyError } : undefined}
            disabled={fieldDisabled}
            onValueChanged={(event) => setField(field.Key, event.value == null ? null : Number(event.value))}
          />
        ) : (
          <TextBox
            label={label}
            labelMode="floating"
            value={String(value ?? "")}
            maxLength={field.MaxLength}
            mode={field.Type === "email" ? "email" : "text"}
            disabled={fieldDisabled}
            onValueChanged={(event) => setField(field.Key, String(event.value ?? ""))}
          />
        )}
      </div>
    )
  }

  function addExisting(row: PitDocument) {
    if (readOnly || busy || row.IS_SIGNED !== 1 || (data.MST && row.TAX_CD !== data.MST)) return
    setData((current) => current.Items?.some((item) => item.REF_CTU_ID === row.DOCUMENT_ID) ? current : ({
      ...current,
      Items: [
        ...(current.Items ?? []),
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
    closeErrorNoticePicker()
  }

  async function submit() {
    if (kind === "certificate") {
      setValidationAttempted(true)
      const moneyError = PIT_CERTIFICATE_MONEY_FIELDS
        .map((field) => pitCertificateMoneyError(field.Key, data[field.Key], t))
        .find((error) => error !== null)
      if (moneyError) {
        notify(moneyError, "warning", 4000)
        return
      }
      if (!incomeTypeValid) {
        notify(incomeTypeMessage, "warning", 4000)
        return
      }
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
      data.KHCTU = row.SERIES
      await onSave(data, xslId)
      return
    }
    await onSave(data, null)
  }

  const handleAddRow = useCallback(() => {
    if (readOnly || busy) return
    if (kind === "error-notice") {
      setErrorNoticePickerOpen(true)
      return
    }
    if (kind === "declaration") {
      onPickCertificate((cert) => setData((current) => ({
        ...current,
        Certificates: [
          ...(current.Certificates ?? []),
          {
            TTCHUC: cert.issuer,
            SERI: cert.serialNumber,
            TNGAY: cert.notBefore,
            DNGAY: cert.notAfter,
            HTHUC: 1,
          },
        ],
      })))
    }
  }, [busy, kind, onPickCertificate, readOnly])

  const handleHelpShortcut = useCallback(() => {
    if (shortcutHelpVisible) {
      closeShortcutHelp()
      return
    }
    openShortcutHelp()
  }, [closeShortcutHelp, openShortcutHelp, shortcutHelpVisible])

  const shortcutsActive = !busy
    && !relatedPickerOpen
    && !errorNoticePickerOpen
    && !lookupPopupHost?.isLookupPopupOpen
    && !shortcutHelpVisible

  usePitSaveShortcut(
    submit,
    !readOnly && shortcutsActive,
    popupScopeId,
    shortcutsActive,
    {
      onPrint: handlePrint,
      onClose: closeEditor,
      onHelp: handleHelpShortcut,
      onAddRow: kind === "declaration" || kind === "error-notice" ? handleAddRow : undefined,
      canAddRow: !readOnly && !busy,
      saveAndClose: true,
    },
  )

  return (
    <>
    <EInvoiceEditorShell
      visible
      fullScreen
      mode={Number(document?.DOCUMENT_ID ?? 0) > 0 ? "edit" : "add"}
      wrapperAttr={createPopupShortcutWrapperAttr(popupScopeId)}
      title={`${document ? t("PIT_TITLE_EDIT", "Chứng từ") : t("PIT_TITLE_NEW", "Lập mới")} · ${kind === "certificate" ? t("PIT_CERT_TITLE", documentInfo.Title) : documentInfo.Title}`}
      subtitle={
        kind === "certificate"
          ? undefined
          : `${t("PIT_SUBTITLE_FORM", "Mẫu số")} ${documentInfo.Form}${document?.DOC_NO ? ` · ${t("PIT_SUBTITLE_NO", "Số")} ${document.DOC_NO}` : ""}`
      }
      loading={busy}
      closeDisabled={busy}
      onClose={closeEditor}
      onShown={handlePopupShown}
      onHiding={handlePopupHiding}
      footer={
        <EditorActionToolbar
          mode={Number(document?.DOCUMENT_ID ?? 0) > 0 ? "edit" : "add"}
          busy={busy}
          actions={[
            {
              key: "sign",
              text: t("SIGN_SEND_CQT", "Ký và gửi CQT"),
              type: "danger",
              stylingMode: "contained",
              visible: canSignFromPopup,
              disabled: inactiveAssignedTemplate,
              hint: inactiveAssignedTemplate
                ? t("PIT_XSL_INACTIVE_HINT", "Mẫu số ký hiệu đã ngừng sử dụng. Mở chứng từ và chọn mẫu đang hoạt động.")
                : undefined,
              onClick: handleSign,
            },
            {
              key: "print",
              text: t("PRINT", "In"),
              type: "default",
              onClick: () => { void handlePrint() },
            },
            {
              key: "save",
              text: busy ? t("SAVING", "Đang lưu...") : t("SAVE", "Lưu"),
              visible: !readOnly,
              disabled: kind === "certificate" && !incomeTypeValid,
              onClick: () => { void submit() },
            },
            {
              key: "close",
              text: t("CANCEL", "Hủy"),
              onClick: closeEditor,
            },
          ]}
        />
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
                  <PitCertificatePayerFields renderField={fieldInput} />
                </div>
              </EInvoiceEditorSection>
              <EInvoiceEditorSection
                title={`${formatPitMessage(t("PIT_CERT_SECTION_DOCUMENT", "Chứng từ · Mẫu số {0}"), documentInfo.Form)}${document?.DOC_NO ? ` · ${formatPitMessage(t("PIT_CERT_DOCUMENT_NUMBER", "Số {0}"), document.DOC_NO)}` : ""}`}
                className="pit-document-section"
              >
                <div className="pit-seller">
                  <SelectBox
                    label={t("SERIES", "Ký hiệu") + " *"}
                    labelMode="floating"
                    dataSource={activeCatalog.map((row) => ({ value: row.XSL_ID, text: catalogLabel(row, t) }))}
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
                  <PitCertificateHeaderFields renderField={fieldInput} />
                </div>
              </EInvoiceEditorSection>
            </div>
          )}
          {kind !== "certificate" && (
            <div className="pit-heading">
              <strong>Mẫu số {documentInfo.Form}</strong>
              {document?.DOC_NO ? <span>Số {document.DOC_NO}</span> : null}
            </div>
          )}
          {kind === "certificate" && (
            <PitCertificateForm
              t={t}
              renderField={fieldInput}
              customerLookup={<div className="einvoice-editor__field pit-field--customer">
                <div className="einvoice-editor__field-label">{t("CUSTOMER", "Khách hàng")}</div>
                <EInvoiceBuyerCustomerLookup value={customerId} onChange={applyCustomer} readOnly={readOnly || busy}
                  placeholder={t("CustomerSelect", "Chọn khách hàng")} popupTitle={t("CustomerSelect", "Chọn khách hàng")}
                  buttonHint={t("LIST_CUSTOMER", "Mở danh sách khách hàng")} />
              </div>}
              relatedPanel={data.TCCTU ? <EInvoiceEditorSection title={t("PIT_CERT_RELATED", "Chứng từ liên quan")}
                className="pit-form-section pit-related-section" bodyClassName="einvoice-editor__section-body--compact">
                <PitRelatedCertificatePanel fields={data} formCode={documentInfo.Form}
                  excludeDocumentId={document?.DOCUMENT_ID ?? 0} readOnly={readOnly} busy={busy} t={t}
                  onPatch={patchDocument} onPickerVisibleChange={setRelatedPickerOpen} />
              </EInvoiceEditorSection> : null}
            />
          )}
          {kind === "declaration" && <PitDeclarationForm renderField={fieldInput} />}
          {kind === "error-notice" && <PitErrorNoticeForm renderField={fieldInput} />}
          {kind === "declaration" && <PitDeclarationCertificates data={data} setData={setData} readOnly={readOnly} busy={busy} t={t}
            onPickCertificate={onPickCertificate} certificateMethodOptions={certificateMethodOptions} />}
          {kind === "error-notice" && <PitErrorNoticeItems data={data} setData={setData} readOnly={readOnly} busy={busy} t={t}
            addExisting={() => setErrorNoticePickerOpen(true)} />}
          {document?.ERROR_MESSAGE && <p role="alert" className="pit-error">{document.ERROR_MESSAGE}</p>}

        </div>
      </div>
    </EInvoiceEditorShell>
    <ShortcutHelpPopup
      visible={shortcutHelpVisible}
      shortcuts={shortcutHelpItems}
      onClose={closeShortcutHelp}
    />
    {kind === "error-notice" && errorNoticePickerOpen && (
      <PitCertificateSelectPopup
        visible={errorNoticePickerOpen}
        title={t("PIT_ERR_ADD_EXISTING", "Thêm chứng từ")}
        taxpayerTaxCode={data.MST ?? ""}
        excludedDocumentIds={(data.Items ?? []).flatMap((item) => item.REF_CTU_ID ? [item.REF_CTU_ID] : [])}
        t={t}
        onClose={closeErrorNoticePicker}
        onSelect={addExisting}
      />
    )}
    </>
  )
}
