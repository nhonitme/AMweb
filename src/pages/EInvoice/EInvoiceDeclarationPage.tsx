import { lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocation } from "react-router-dom"
import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import DataGrid, { Column, Editing, Paging, Scrolling } from "devextreme-react/data-grid"
import DateBox from "devextreme-react/date-box"
import LoadPanel from "devextreme-react/load-panel"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { ColumnCellTemplateData, InitializedEvent, RowDblClickEvent, RowRemovingEvent, RowUpdatingEvent, SelectionChangedEvent } from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"

import {
  createEInvoiceDeclaration,
  deleteEInvoiceDeclarations,
  getEInvoiceDeclaration,
  getEInvoiceDeclarationSigningPayload,
  getEInvoiceDeclarationTransmissionMessages,
  saveEInvoiceDeclarationSignature,
  updateEInvoiceDeclaration,
} from "@/api/einvoiceDeclarationApi"
import { getSigningPluginCertificates, signXmlWithPlugin } from "@/api/einvoiceSigningPluginApi"
import type { EInvoicePluginCertificate } from "@/api/einvoiceSigningPluginApi"
import { getCompanyInfo } from "@/api/companyInfoApi"
import { fetchCountryLookup, type CountryLookup } from "@/api/lookupApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import PageGrid from "@/components/datagrid/PageGrid"
import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import DxPage from "@/dx/DxPage"
import {
  useEInvoiceDeclarationListInvalidate,
  useEInvoiceDeclarationListQuery,
} from "@/hooks/queries/useEInvoiceListQuery"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import useShortcutHelp from "@/hooks/useShortcutHelp"
import { LanguageContext } from "@/lib/i18nLoader"
import { EInvoiceTableShell } from "./components/EInvoiceTableShell"
import { EInvoiceDeclarationStatusCell } from "./components/EInvoiceDeclarationStatusCell"
import { EInvoicePartyCell } from "./components/einvoiceTableUi"
import { createPopupShortcutWrapperAttr, isPopupShortcutScopeTopMost, usePopupShortcutScopeId } from "@/lib/popupShortcutScope"
import { useSysCodes } from "@/lib/sysCodeContext"
import { getCurrentCompanyCd } from "@/lib/login"
import { formatDateToYmd } from "@/pages/Accounting/accountingDateUtils"
import { createShortcutBindings } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import type { EInvoiceDeclaration, EInvoiceDeclarationDetail, EInvoiceDeclarationDetailType } from "@/types/einvoiceDeclaration"
import type { EInvoiceTransmissionMessage } from "@/types/einvoiceTransmission"
import {
  createDefaultDeclaration,
  createDefaultDeclarationWithCompanyInfo,
  createDefaultDeclarationDetail,
  buildDeclarationProviderSysCodeMap,
  buildCertificateMethodOptions,
  buildDeclarationMethodOptions,
  buildTkhaiCqtStatusOptions,
  createDeclarationDetailFromCertificate,
  createDeclarationDetailFromSysCode,
  prepareDeclarationCopy,
  formatDeclarationStatusSummary,
  formatDeclarationTaxpayerSummaryText,
  getActiveDeclarationProviderSysCodes,
  isProviderAlreadyInDeclarationDetails,
  EINV_CERTIFICATE_METHOD_CODE_TYPE,
  EINV_DECLARATION_METHOD_CODE_TYPE,
  EINV_TKHAI_CQT_STATUS_CODE_TYPE,
  formatDateForApi,
  getActiveDeclarationDetails,
  getActiveDeclarationDetailsByType,
  isCertificateAlreadyInDeclarationDetails,
  isDeclarationEditable,
  mapDeclarationToApiPayload,
  normalizeDeclaration,
  normalizeDeclarationRows,
  parseDate,
  renumberDeclarationDetails,
} from "./einvoiceDeclarationModel"
import { useEInvoiceCertificateSigning } from "./hooks/useEInvoiceCertificateSigning"
import { useEInvoiceSigningPluginSetupPrompt } from "./hooks/useEInvoiceSigningPluginSetupPrompt"
import { truncateEInvoiceErrorMessage } from "./einvoiceModel"
import { openEInvoiceDeclarationPreview } from "./einvoiceDeclarationPreviewViewer"
import { openEInvoiceDeclarationXmlPreviewWithNotify } from "./einvoiceDocumentXmlViewer"
import { openEInvoiceTransmissionHtmlPreview } from "./einvoiceTransmissionPreviewViewer"
import { createEInvoiceSignSendCqtToolbarItem } from "./einvoiceSignToolbar"
import { fieldRequiredMessage } from "./einvoiceI18n"
import EInvoiceTransmissionMessagesPopup from "./components/EInvoiceTransmissionMessagesPopup"
import EInvoiceEditorShell, { EInvoiceEditorSection } from "./components/EInvoiceEditorShell"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"

type GridKey = string | number
type DeclarationGridCellInfo = ColumnCellTemplateData<EInvoiceDeclaration, GridKey>

type SelectOption<TValue extends string | number> = {
  value: TValue
  text: string
}

const COPY_EXCLUDE_FIELDS = ["TKHAI_ID", "COMPANY_CD", "DETAILS", "XML", "CREATE_AT", "CREATE_BY", "UPDATE_AT", "UPDATE_BY"]

interface PendingSignDeclaration {
  tkhaiId: number
  rawXml: string
}

type DeclarationRequiredField = {
  field: keyof EInvoiceDeclaration
  labelKey: string
  fallback: string
  valueType?: "date" | "number" | "text"
}

interface DeclarationEditorPopupProps {
  visible: boolean
  declarationId: number
  initialDeclaration?: EInvoiceDeclaration | null
  readOnly?: boolean
  onClose: () => void
  onSaved: (declaration: EInvoiceDeclaration) => void | Promise<void>
}

const EInvoiceDeclarationProviderSelectPopup = lazy(() => import("./components/EInvoiceDeclarationProviderSelectPopup"))

const declarationRequiredFields: readonly DeclarationRequiredField[] = [
  { field: "HTHUC", labelKey: "HTHUC", fallback: "Declaration method", valueType: "number" },
  { field: "TNNT", labelKey: "TNNT", fallback: "Taxpayer name" },
  { field: "MST", labelKey: "MST", fallback: "Tax code" },
  { field: "CQTQLY", labelKey: "CQTQLY", fallback: "Tax authority" },
  { field: "MCQTQLY", labelKey: "MCQTQLY", fallback: "Tax authority code" },
  { field: "TNDDPLUAT", labelKey: "TNDDPLUAT", fallback: "Legal representative" },
  { field: "DTDDPLUAT", labelKey: "DTDDPLUAT", fallback: "Representative phone" },
  { field: "MQTNDDPLUAT", labelKey: "QTDDPLuat", fallback: "Nationality" },
  { field: "NSDDPLUAT", labelKey: "NSDDPLUAT", fallback: "Representative birth date", valueType: "date" },
  { field: "DCLHE", labelKey: "DCLHE", fallback: "Contact address" },
  { field: "DCTDTU", labelKey: "DCTDTU", fallback: "Email" },
  { field: "NLHE", labelKey: "NLHE", fallback: "Contact person" },
  { field: "DTLHE", labelKey: "DTLHE", fallback: "Contact phone" },
  { field: "DDANH", labelKey: "DDANH", fallback: "Place" },
]

function createMonthStartDate(): Date {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

function createToday(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function formatText(template: string, values: Array<string | number>): string {
  return values.reduce((text, value, index) => text.replace(`{${index}}`, String(value)), template)
}

function normalizeGridDate(value: string | Date | null | undefined): string {
  if (value instanceof Date) {
    return formatDateForApi(value) ?? ""
  }
  return typeof value === "string" ? value.slice(0, 10) : ""
}

function normalizeDeclarationCompareText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

function isVietnameseNationality(code: unknown, name: unknown): boolean {
  const normalizedCode = normalizeDeclarationCompareText(code)
  if (normalizedCode === "VN") {
    return true
  }
  const normalizedName = normalizeDeclarationCompareText(name)
  return normalizedName === "VN" || normalizedName === "VIETNAM"
}

function isDeclarationFieldEmpty(record: EInvoiceDeclaration, item: DeclarationRequiredField): boolean {
  const value = record[item.field]
  if (item.valueType === "number") {
    return value === null || value === undefined || String(value).trim().length === 0
  }
  return String(value ?? "").trim().length === 0
}

function resolveDetailLabel(detailType: EInvoiceDeclarationDetailType): string {
  if (detailType === "TCGP") {
    return "Solution provider"
  }
  if (detailType === "TCTN") {
    return "Transmission provider"
  }
  if (detailType === "DVHTPT") {
    return "Dependent unit"
  }
  if (detailType === "DVDUQTCUU") {
    return "Authorized lookup unit"
  }
  if (detailType === "TNSDUNG") {
    return "Temporary stop"
  }
  if (detailType === "DKTH") {
    return "Invoice integration"
  }
  return "Certificate"
}

interface DeclarationDetailTypeGridProps {
  title: string
  dataSource: EInvoiceDeclarationDetail[]
  isReadOnly: boolean
  headerAction?: ReactNode
  certificateMethodOptions: SelectOption<number>[]
  translate: (key: string, fallback: string) => string
  onRowUpdating: (event: RowUpdatingEvent<EInvoiceDeclarationDetail, GridKey>) => void
  onRowRemoving: (event: RowRemovingEvent<EInvoiceDeclarationDetail, GridKey>) => void
  detailType: EInvoiceDeclarationDetailType
}

function DeclarationDetailTypeGrid({
  title,
  dataSource,
  isReadOnly,
  headerAction,
  certificateMethodOptions,
  translate,
  onRowUpdating,
  onRowRemoving,
  detailType,
}: DeclarationDetailTypeGridProps) {
  const ctsMethodLookup = useMemo(
    () => ({
      dataSource: certificateMethodOptions,
      valueExpr: "value",
      displayExpr: "text",
    }),
    [certificateMethodOptions],
  )

  return (
    <section className="einvoice-editor__section">
      <div className="einvoice-editor__detail-toolbar">
        <div className="einvoice-editor__section-title einvoice-editor__section-title--inline">{title}</div>
        {headerAction}
      </div>
      <div className="einvoice-editor__detail-grid">
      <DataGrid<EInvoiceDeclarationDetail, GridKey>
        dataSource={dataSource}
        keyExpr="ROW_KEY"
        height={180}
        showBorders={true}
        columnAutoWidth={true}
        repaintChangesOnly={true}
        onRowUpdating={onRowUpdating}
        onRowRemoving={onRowRemoving}
      >
        <Editing mode="cell" allowUpdating={!isReadOnly} allowDeleting={!isReadOnly} useIcons={true} />
        <Scrolling mode="virtual" />
        <Paging enabled={false} />
        <Column dataField="STT" caption={translate("STT", "No.")} width={70} allowEditing={false} />
        {detailType === "CTS" ? (
          <>
            <Column dataField="TTCHUC" caption={translate("TTCHUC", "Certificate organization")} minWidth={180} />
            <Column dataField="SERI" caption={translate("SERI", "Serial")} width={130} />
            <Column
              dataField="CTS_HTHUC"
              caption={translate("CTS_HTHUC", "CTS method")}
              width={140}
              lookup={ctsMethodLookup}
            />
          </>
        ) : null}
        {detailType === "TCGP" ? (
          <>
            <Column dataField="TTCGP" caption={translate("TTCGP", "Solution provider")} minWidth={180} />
            <Column dataField="MSTTCGP" caption={translate("MSTTCGP", "Provider tax code")} width={140} />
          </>
        ) : null}
        {detailType === "TCTN" ? (
          <>
            <Column dataField="TTCTN" caption={translate("TTCTN", "Transmission provider")} minWidth={180} />
            <Column dataField="MSTTCTN" caption={translate("MSTTCTN", "Transmission tax code")} width={150} />
          </>
        ) : null}
        {detailType === "DVHTPT" ? (
          <>
            <Column dataField="TDVHTPT" caption={translate("TDVHTPT", "Dependent unit name")} minWidth={180} />
            <Column dataField="MSTDVHTPT" caption={translate("MSTDVHTPT", "Dependent unit tax code")} width={140} />
          </>
        ) : null}
        {detailType === "DVDUQTCUU" ? (
          <>
            <Column dataField="TDVI" caption={translate("TDVI", "Authorized unit name")} minWidth={160} />
            <Column dataField="MSTDUQ" caption={translate("MSTDUQ", "Authorized unit tax code")} width={140} />
            <Column dataField="HDBRMVAO" caption={translate("HDBRMVAO", "Sale/Purchase")} width={110} />
            <Column dataField="TDLHDTNGAY" caption={translate("TDLHDTNGAY", "Invoice from")} dataType="date" format="yyyy-MM-dd" width={120} />
            <Column dataField="TDLHDDNGAY" caption={translate("TDLHDDNGAY", "Invoice to")} dataType="date" format="yyyy-MM-dd" width={120} />
            <Column dataField="TGUQTNGAY" caption={translate("TGUQTNGAY", "Auth from")} dataType="date" format="yyyy-MM-dd" width={120} />
            <Column dataField="TGUQDNGAY" caption={translate("TGUQDNGAY", "Auth to")} dataType="date" format="yyyy-MM-dd" width={120} />
          </>
        ) : null}
        {detailType === "TNSDUNG" ? (
          <>
            <Column dataField="TTCGP" caption={translate("TTCGP", "Solution provider")} minWidth={160} />
            <Column dataField="MSTTCGP" caption={translate("MSTTCGP", "Provider tax code")} width={140} />
            <Column dataField="SERI" caption={translate("SERI", "Certificate serial")} width={130} />
          </>
        ) : null}
        {detailType === "DKTH" ? (
          <>
            <Column dataField="TLHDON" caption={translate("TLHDON", "Invoice type name")} minWidth={140} />
            <Column dataField="KHMSHDON" caption={translate("KHMSHDON", "Form code")} width={90} />
            <Column dataField="KHHDON" caption={translate("KHHDON", "Invoice series")} width={100} />
            <Column dataField="TENDKTH" caption={translate("TENDKTH", "Org name")} minWidth={160} />
            <Column dataField="MSTDKTH" caption={translate("MSTDKTH", "Org tax code")} width={130} />
            <Column dataField="MDICH" caption={translate("MDICH", "Purpose")} minWidth={140} />
          </>
        ) : null}
        {detailType === "CTS" ? (
          <>
            <Column dataField="TNGAY" caption={translate("TNGAY", "From date")} dataType="string" width={170} allowEditing={false} />
            <Column dataField="DNGAY" caption={translate("DNGAY", "To date")} dataType="string" width={170} allowEditing={false} />
          </>
        ) : detailType === "DVDUQTCUU" ? null : (
          <>
            <Column dataField="TNGAY" caption={translate("TNGAY", "From date")} dataType="date" format="yyyy-MM-dd" width={120} />
            {detailType === "TCTN" ? null : (
              <Column dataField="DNGAY" caption={translate("DNGAY", "To date")} dataType="date" format="yyyy-MM-dd" width={120} />
            )}
          </>
        )}
        {detailType === "CTS" ? null : <Column dataField="GCHU" caption={translate("GCHU", "Note")} minWidth={180} />}
      </DataGrid>
      </div>
    </section>
  )
}

function DeclarationEditorPopup({
  visible,
  declarationId,
  initialDeclaration,
  readOnly = false,
  onClose,
  onSaved,
}: DeclarationEditorPopupProps) {
  const companyCd = getCurrentCompanyCd()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<EInvoiceDeclaration>(() => initialDeclaration ?? createDefaultDeclaration(companyCd))
  const [countries, setCountries] = useState<CountryLookup[]>([])
  const [providerPickerVisible, setProviderPickerVisible] = useState(false)
  const [providerPickerType, setProviderPickerType] = useState<Extract<EInvoiceDeclarationDetailType, "TCGP" | "TCTN">>("TCGP")
  const [selectedProviderCodeCd, setSelectedProviderCodeCd] = useState("")
  const { translate } = useContext(LanguageContext) as { translate?: (key: string, fallback?: string) => string }
  const { getCodesByType } = useSysCodes()

  const providerSysCodeMap = useMemo(() => buildDeclarationProviderSysCodeMap(getCodesByType), [getCodesByType])

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const requiredLabel = useCallback((key: string, fallback: string) => `${t(key, fallback)} *`, [t])
  const { promptIfPluginMissing, setupPopup } = useEInvoiceSigningPluginSetupPrompt()

  const ctsPickerPopupOptions = useMemo(
    () => ({
      compact: true as const,
      confirmText: t("ADD", "Add"),
      confirmIcon: "plus",
      title: t("CERTIFICATE_SELECT", "Select digital certificate"),
    }),
    [t],
  )

  const { certificatePopupVisible: ctsPickerVisible, openCertificatePicker, certificateSelectPopup: ctsCertificateSelectPopup } = useEInvoiceCertificateSigning({
    t,
    promptIfPluginMissing,
    onRefresh: async () => {},
    setActionLoading: setLoading,
    loadErrorMessage: t("DECL_CTS_LOAD_FAILED", "Failed to load certificates from signing plugin"),
  })

  const isUpdate = Number(formData.TKHAI_ID ?? 0) > 0
  const isReadOnly = readOnly || !isDeclarationEditable(formData)
  const isVietnamese = useMemo(
    () => isVietnameseNationality(formData.MQTNDDPLUAT, formData.QTICH),
    [formData.MQTNDDPLUAT, formData.QTICH],
  )
  const isForeignNationality = (formData.MQTNDDPLUAT.trim().length > 0 || formData.QTICH.trim().length > 0) && !isVietnamese
  const visibleDetails = useMemo(() => getActiveDeclarationDetails(formData.DETAILS), [formData.DETAILS])
  const ctsDetails = useMemo(() => getActiveDeclarationDetailsByType(formData.DETAILS, "CTS"), [formData.DETAILS])
  const tcgpDetails = useMemo(() => getActiveDeclarationDetailsByType(formData.DETAILS, "TCGP"), [formData.DETAILS])
  const tctnDetails = useMemo(() => getActiveDeclarationDetailsByType(formData.DETAILS, "TCTN"), [formData.DETAILS])
  const dvhtptDetails = useMemo(() => getActiveDeclarationDetailsByType(formData.DETAILS, "DVHTPT"), [formData.DETAILS])
  const dvduqDetails = useMemo(() => getActiveDeclarationDetailsByType(formData.DETAILS, "DVDUQTCUU"), [formData.DETAILS])
  const tnsdungDetails = useMemo(() => getActiveDeclarationDetailsByType(formData.DETAILS, "TNSDUNG"), [formData.DETAILS])
  const dkthDetails = useMemo(() => getActiveDeclarationDetailsByType(formData.DETAILS, "DKTH"), [formData.DETAILS])

  const declarationMethodOptions = useMemo(
    () => buildDeclarationMethodOptions(getCodesByType(EINV_DECLARATION_METHOD_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const certificateMethodOptions = useMemo(
    () => buildCertificateMethodOptions(getCodesByType(EINV_CERTIFICATE_METHOD_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const loadDeclaration = useCallback(async () => {
    if (!visible) {
      return
    }

    setLoading(true)
    try {
      const countryRows = await fetchCountryLookup().catch(() => [] as CountryLookup[])
      setCountries(
        countryRows
          .map((row) => ({
            COUNTRY_ID: Number(row.COUNTRY_ID ?? 0),
            COUNTRY_CD: String(row.COUNTRY_CD ?? "").trim().toUpperCase(),
            COUNTRY_NM: String(row.COUNTRY_NM ?? "").trim(),
          }))
          .filter((row) => row.COUNTRY_CD.length > 0 && row.COUNTRY_NM.length > 0),
      )

      if (initialDeclaration) {
        setFormData(initialDeclaration)
        return
      }

      if (declarationId <= 0) {
        try {
          const response = await getCompanyInfo(companyCd)
          setFormData(createDefaultDeclarationWithCompanyInfo(companyCd, response.data, providerSysCodeMap))
        } catch {
          setFormData(createDefaultDeclarationWithCompanyInfo(companyCd, null, providerSysCodeMap))
        }
        return
      }

      const response = await getEInvoiceDeclaration(declarationId)
      setFormData(normalizeDeclaration(response.data, companyCd))
    } catch (error) {
      notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
    } finally {
      setLoading(false)
    }
  }, [companyCd, declarationId, initialDeclaration, providerSysCodeMap, t, visible])

  useEffect(() => {
    void loadDeclaration()
  }, [loadDeclaration])
  useEffect(() => {
    if (countries.length === 0) {
      return
    }

    setFormData((current) => {
      const code = current.MQTNDDPLUAT.trim().toUpperCase() || "VN"
      const matched = countries.find((country) => country.COUNTRY_CD === code)
        ?? countries.find((country) => country.COUNTRY_CD === "VN")
      if (!matched) {
        return current
      }

      if (current.MQTNDDPLUAT === matched.COUNTRY_CD && current.QTICH === matched.COUNTRY_NM) {
        return current
      }

      return {
        ...current,
        MQTNDDPLUAT: matched.COUNTRY_CD,
        QTICH: matched.COUNTRY_NM,
      }
    })
  }, [countries])

  const updateField = useCallback(<K extends keyof EInvoiceDeclaration>(field: K, value: EInvoiceDeclaration[K]) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }, [])

  const updateFlagField = useCallback((field: keyof EInvoiceDeclaration, value: boolean) => {
    setFormData((current) => ({ ...current, [field]: value ? 1 : 0 }))
  }, [])

  const handleNationalityChanged = useCallback((countryCd: string | null | undefined) => {
    const code = String(countryCd ?? "").trim().toUpperCase()
    setFormData((current) => {
      const matched = countries.find((country) => country.COUNTRY_CD === code)
      if (!matched) {
        return {
          ...current,
          MQTNDDPLUAT: "",
          QTICH: "",
        }
      }

      return {
        ...current,
        MQTNDDPLUAT: matched.COUNTRY_CD,
        QTICH: matched.COUNTRY_NM,
      }
    })
  }, [countries])

  const appendProviderFromSysCode = useCallback(
    (detailType: Extract<EInvoiceDeclarationDetailType, "TCGP" | "TCTN">, codeCd: string): boolean => {
      const sysCodes = detailType === "TCGP" ? providerSysCodeMap.EINV_TCGP : providerSysCodeMap.EINV_TCTN
      const sysCode = sysCodes.find((item) => item.CODE_CD === codeCd)
      if (!sysCode) {
        const providerField = detailType === "TCGP"
          ? { fieldKey: "TTCGP", fieldFallback: "Solution provider" }
          : { fieldKey: "TTCTN", fieldFallback: "Transmission provider" }
        notify(fieldRequiredMessage(t, providerField.fieldKey, providerField.fieldFallback), "warning", 3000)
        return false
      }

      let added = false

      setFormData((current) => {
        if (isProviderAlreadyInDeclarationDetails(current.DETAILS, detailType, codeCd)) {
          return current
        }

        const nextDetail = createDeclarationDetailFromSysCode(
          sysCode,
          detailType,
          getActiveDeclarationDetailsByType(current.DETAILS, detailType).length + 1,
          current.TKHAI_ID,
          companyCd,
        )

        added = true
        return {
          ...current,
          DETAILS: renumberDeclarationDetails([...current.DETAILS, nextDetail]),
        }
      })

      if (!added) {
        notify(
          t("PROVIDER_DUPLICATE", "This provider is already listed"),
          "warning",
          3000,
        )
      }

      return added
    },
    [companyCd, providerSysCodeMap.EINV_TCGP, providerSysCodeMap.EINV_TCTN, t],
  )

  const closeProviderPicker = useCallback(() => {
    setProviderPickerVisible(false)
    setProviderPickerType("TCGP")
    setSelectedProviderCodeCd("")
  }, [])

  const openProviderPicker = useCallback(
    (detailType: Extract<EInvoiceDeclarationDetailType, "TCGP" | "TCTN">) => {
      if (isReadOnly) {
        return
      }

      const options = getActiveDeclarationProviderSysCodes(
        detailType === "TCGP" ? providerSysCodeMap.EINV_TCGP : providerSysCodeMap.EINV_TCTN,
        formData.DETAILS,
        detailType,
      )

      if (options.length === 0) {
        notify(t("DECL_PROVIDER_NOT_FOUND", "No provider available to add"), "warning", 4000)
        return
      }

      setProviderPickerType(detailType)
      setSelectedProviderCodeCd(options[0]?.CODE_CD ?? "")
      setProviderPickerVisible(true)
    },
    [formData.DETAILS, isReadOnly, providerSysCodeMap.EINV_TCGP, providerSysCodeMap.EINV_TCTN, t],
  )

  const handleConfirmProviderSelection = useCallback(() => {
    if (appendProviderFromSysCode(providerPickerType, selectedProviderCodeCd)) {
      closeProviderPicker()
    }
  }, [appendProviderFromSysCode, closeProviderPicker, providerPickerType, selectedProviderCodeCd])

  const availableProviderOptions = useMemo(
    () =>
      getActiveDeclarationProviderSysCodes(
        providerPickerType === "TCGP" ? providerSysCodeMap.EINV_TCGP : providerSysCodeMap.EINV_TCTN,
        formData.DETAILS,
        providerPickerType,
      ),
    [formData.DETAILS, providerPickerType, providerSysCodeMap.EINV_TCGP, providerSysCodeMap.EINV_TCTN],
  )

  const appendCtsFromCertificate = useCallback(
    (certificate: EInvoicePluginCertificate): boolean => {
      let added = false

      setFormData((current) => {
        if (isCertificateAlreadyInDeclarationDetails(current.DETAILS, certificate)) {
          return current
        }

        const nextDetail = createDeclarationDetailFromCertificate(
          certificate,
          getActiveDeclarationDetailsByType(current.DETAILS, "CTS").length + 1,
          current.TKHAI_ID,
          companyCd,
        )

        added = true
        return {
          ...current,
          DETAILS: renumberDeclarationDetails([...current.DETAILS, nextDetail]),
        }
      })

      if (!added) {
        notify(t("DECL_CTS_DUPLICATE", "This certificate is already listed in CTS details"), "warning", 3000)
      }

      return added
    },
    [companyCd, t],
  )

  const handleAddCtsFromPlugin = useCallback(async () => {
    if (isReadOnly) {
      return
    }

    await openCertificatePicker({
      onPick: appendCtsFromCertificate,
      popupOptions: ctsPickerPopupOptions,
    })
  }, [appendCtsFromCertificate, ctsPickerPopupOptions, isReadOnly, openCertificatePicker])

  const appendBlankDetail = useCallback(
    (detailType: EInvoiceDeclarationDetailType) => {
      if (isReadOnly) {
        return
      }

      setFormData((current) => {
        const nextDetail = createDefaultDeclarationDetail(
          getActiveDeclarationDetailsByType(current.DETAILS, detailType).length + 1,
          detailType,
          current.TKHAI_ID,
          companyCd,
        )
        return {
          ...current,
          DETAILS: renumberDeclarationDetails([...current.DETAILS, nextDetail]),
        }
      })
    },
    [companyCd, isReadOnly],
  )

  const handleDetailUpdating = useCallback((event: RowUpdatingEvent<EInvoiceDeclarationDetail, GridKey>) => {
    const rowKey = String(event.key)
    const patch = event.newData as Partial<EInvoiceDeclarationDetail> & {
      TNGAY?: string | Date | null
      DNGAY?: string | Date | null
      TDLHDTNGAY?: string | Date | null
      TDLHDDNGAY?: string | Date | null
      TGUQTNGAY?: string | Date | null
      TGUQDNGAY?: string | Date | null
    }

    setFormData((current) => ({
      ...current,
      DETAILS: renumberDeclarationDetails(
        current.DETAILS.map((detail) => {
          if (detail.ROW_KEY !== rowKey) {
            return detail
          }

          return {
            ...detail,
            ...patch,
            TNGAY: patch.TNGAY !== undefined ? normalizeGridDate(patch.TNGAY) : detail.TNGAY,
            DNGAY: patch.DNGAY !== undefined ? normalizeGridDate(patch.DNGAY) : detail.DNGAY,
            TDLHDTNGAY: patch.TDLHDTNGAY !== undefined ? normalizeGridDate(patch.TDLHDTNGAY) : detail.TDLHDTNGAY,
            TDLHDDNGAY: patch.TDLHDDNGAY !== undefined ? normalizeGridDate(patch.TDLHDDNGAY) : detail.TDLHDDNGAY,
            TGUQTNGAY: patch.TGUQTNGAY !== undefined ? normalizeGridDate(patch.TGUQTNGAY) : detail.TGUQTNGAY,
            TGUQDNGAY: patch.TGUQDNGAY !== undefined ? normalizeGridDate(patch.TGUQDNGAY) : detail.TGUQDNGAY,
          }
        }),
      ),
    }))
    event.cancel = true
  }, [])

  const handleDetailRemoving = useCallback((event: RowRemovingEvent<EInvoiceDeclarationDetail, GridKey>) => {
    const rowKey = String(event.key)
    setFormData((current) => ({
      ...current,
      DETAILS: renumberDeclarationDetails(
        current.DETAILS.map((detail) => (detail.ROW_KEY === rowKey ? { ...detail, ISDEL: 1 } : detail)),
      ),
    }))
    event.cancel = true
  }, [])

  const validateBeforeSave = useCallback(() => {
    const missingField = declarationRequiredFields.find((item) => isDeclarationFieldEmpty(formData, item))
    if (missingField) {
      notify(fieldRequiredMessage(t, missingField.labelKey, missingField.fallback), "warning", 3000)
      return false
    }

    if (isVietnameseNationality(formData.MQTNDDPLUAT, formData.QTICH) && !formData.CCCDAN.trim()) {
      notify(`${t("CCCDAN", "Citizen ID")} ${t("REQUIRED_FOR_VIETNAMESE_CITIZEN", "is required for Vietnamese citizens")}`, "warning", 3500)
      return false
    }

    if (!isVietnameseNationality(formData.MQTNDDPLUAT, formData.QTICH) && !formData.SHCHIEU.trim()) {
      notify(`${t("SHCHIEU", "Passport")} ${t("REQUIRED_FOR_FOREIGN_NATIONALITY", "is required when nationality is not Vietnam")}`, "warning", 3500)
      return false
    }

    const invalidDetail = visibleDetails.find((detail) => {
      if (detail.DETAIL_TYPE === "CTS") {
        return !detail.TTCHUC.trim() || !detail.SERI.trim()
      }
      if (detail.DETAIL_TYPE === "TCGP") {
        return !detail.TTCGP.trim() || !detail.MSTTCGP.trim()
      }
      if (detail.DETAIL_TYPE === "TNSDUNG") {
        return !detail.TTCGP.trim() || !detail.MSTTCGP.trim() || !detail.TNGAY.trim() || !detail.DNGAY.trim()
      }
      if (detail.DETAIL_TYPE === "TCTN") {
        return !detail.TTCTN.trim() || !detail.MSTTCTN.trim()
      }
      if (detail.DETAIL_TYPE === "DVHTPT") {
        return !detail.TDVHTPT.trim() || !detail.MSTDVHTPT.trim() || !detail.TNGAY.trim()
      }
      if (detail.DETAIL_TYPE === "DVDUQTCUU") {
        return (
          !detail.TDVI.trim()
          || !detail.MSTDUQ.trim()
          || !(detail.HDBRMVAO === 1 || detail.HDBRMVAO === 2 || detail.HDBRMVAO === 3)
          || !detail.TDLHDTNGAY.trim()
          || !detail.TDLHDDNGAY.trim()
          || !detail.TGUQTNGAY.trim()
          || !detail.TGUQDNGAY.trim()
        )
      }
      if (detail.DETAIL_TYPE === "DKTH") {
        return (
          !detail.TLHDON.trim()
          || detail.KHMSHDON === null
          || detail.KHMSHDON === undefined
          || !detail.KHHDON.trim()
          || !detail.TENDKTH.trim()
          || !detail.MSTDKTH.trim()
          || !detail.MDICH.trim()
          || !detail.TNGAY.trim()
          || !detail.DNGAY.trim()
        )
      }
      return true
    })

    if (invalidDetail) {
      notify(formatText(t("DECL_DETAIL_INVALID", "{0} detail line {1} is incomplete"), [resolveDetailLabel(invalidDetail.DETAIL_TYPE), invalidDetail.STT ?? 0]), "warning", 3500)
      return false
    }

    return true
  }, [formData, t, visibleDetails])

  const handleSave = useCallback(async () => {
    if (isReadOnly || !validateBeforeSave()) {
      return
    }

    setLoading(true)
    try {
      const prepared = {
        ...formData,
        DETAILS: renumberDeclarationDetails(formData.DETAILS),
      }
      const payload = mapDeclarationToApiPayload(prepared)
      const response = isUpdate ? await updateEInvoiceDeclaration(payload) : await createEInvoiceDeclaration(payload)
      const normalized = normalizeDeclaration(response.data, companyCd)
      setFormData(normalized)
      notify(t("SAVE_SUCCESS", "Saved successfully"), "success", 2500)
      await onSaved(normalized)
      onClose()
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 5000)
    } finally {
      setLoading(false)
    }
  }, [companyCd, formData, isReadOnly, isUpdate, onClose, onSaved, t, validateBeforeSave])

  const handlePrint = useCallback(() => {
    const tkhaiId = Number(formData.TKHAI_ID ?? 0)
    if (!Number.isFinite(tkhaiId) || tkhaiId <= 0) {
      notify(t("SAVE_BEFORE_PRINT", "Save the record before printing"), "warning", 2500)
      return
    }

    void openEInvoiceDeclarationPreview({
      tkhaiId,
      notifyUnableToOpen: (message) => notify(message, "error", 4000),
    })
  }, [formData.TKHAI_ID, t])

  const popupShortcutScopeId = usePopupShortcutScopeId("einvoice-declaration-editor")

  const shortcutActions = useMemo(
    () => [
      SHORTCUT_ACTIONS.SAVE,
      SHORTCUT_ACTIONS.CLOSE,
      SHORTCUT_ACTIONS.HELP,
    ],
    [],
  )

  const {
    shortcutHelpVisible,
    shortcutHelpItems,
    openShortcutHelp,
    closeShortcutHelp,
  } = useShortcutHelp(shortcutActions)

  const handleClosePopup = useCallback(() => {
    if (loading) {
      return
    }

    if (shortcutHelpVisible) {
      closeShortcutHelp()
      return
    }

    onClose()
  }, [closeShortcutHelp, loading, onClose, shortcutHelpVisible])

  const shortcutBindings = useMemo(
    () =>
      createShortcutBindings(
        shortcutActions,
        {
          [SHORTCUT_ACTIONS.SAVE]: () => {
            void handleSave()
          },
          [SHORTCUT_ACTIONS.CLOSE]: () => handleClosePopup(),
          [SHORTCUT_ACTIONS.HELP]: () => {
            if (shortcutHelpVisible) {
              closeShortcutHelp()
              return
            }

            openShortcutHelp()
          },
        },
        {
          [SHORTCUT_ACTIONS.SAVE]: { enabled: !isReadOnly && !loading, allowInInput: true, stopPropagation: true },
          [SHORTCUT_ACTIONS.CLOSE]: { allowInInput: true, stopPropagation: true },
          [SHORTCUT_ACTIONS.HELP]: { allowInInput: true, stopPropagation: true },
        },
      ),
    [
      closeShortcutHelp,
      handleClosePopup,
      handleSave,
      isReadOnly,
      loading,
      openShortcutHelp,
      shortcutActions,
      shortcutHelpVisible,
    ],
  )

  const shouldHandleShortcutEvent = useCallback(
    () => isPopupShortcutScopeTopMost(popupShortcutScopeId),
    [popupShortcutScopeId],
  )

  useShortcutBindings(shortcutBindings, {
    enabled: visible && !ctsPickerVisible && !providerPickerVisible && !shortcutHelpVisible,
    shouldHandleEvent: shouldHandleShortcutEvent,
  })

  return (
    <>
      <EInvoiceEditorShell
        visible={visible}
        title={isUpdate ? t("DECL_EDIT", "Edit e-invoice declaration") : t("DECL_CREATE", "Create e-invoice declaration")}
        subtitle={formData.MST?.trim() || undefined}
        loading={loading}
        closeDisabled={loading}
        animation={POPUP_FADE_ANIMATION}
        wrapperAttr={createPopupShortcutWrapperAttr(popupShortcutScopeId)}
        onClose={handleClosePopup}
        onHiding={handleClosePopup}
        footerStart={
          <>
            {t("IS_SIGNED", "Signed")}:{" "}
            <span style={{ fontWeight: 600, color: "var(--einvoice-editor-text)" }}>
              {formData.IS_SIGNED === 1 ? t("YES", "Yes") : t("NO", "No")}
            </span>
          </>
        }
        footer={
          <>
            <Button text={t("PRINT", "Print")} icon="print" stylingMode="outlined" disabled={loading} onClick={handlePrint} />
            <Button text={t("CANCEL", "Cancel")} stylingMode="outlined" disabled={loading} onClick={handleClosePopup} />
            <Button text={t("SAVE", "Save")} icon="save" type="default" stylingMode="contained" disabled={loading || isReadOnly} onClick={() => void handleSave()} />
          </>
        }
      >
          <EInvoiceEditorSection title={t("DECL_GENERAL_INFO", "General information")}>
            <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
              <div className="einvoice-editor__field einvoice-editor__col-3">
                <div className="einvoice-editor__field-label">{requiredLabel("HTHUC", "Declaration method")}</div>
                <SelectBox
                  dataSource={declarationMethodOptions}
                  valueExpr="value"
                  displayExpr="text"
                  value={formData.HTHUC}
                  readOnly={isReadOnly}
                  onValueChanged={(event) => updateField("HTHUC", Number(event.value ?? 1))}
                />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-6">
                <div className="einvoice-editor__field-label">{requiredLabel("TNNT", "Taxpayer name")}</div>
                <TextBox value={formData.TNNT} readOnly={isReadOnly} onValueChanged={(event) => updateField("TNNT", String(event.value ?? ""))} />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-3">
                <div className="einvoice-editor__field-label">{requiredLabel("MST", "Tax code")}</div>
                <TextBox value={formData.MST} readOnly={isReadOnly} onValueChanged={(event) => updateField("MST", String(event.value ?? ""))} />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-3">
                <div className="einvoice-editor__field-label">{requiredLabel("MCQTQLY", "Tax authority code")}</div>
                <TextBox value={formData.MCQTQLY} readOnly={isReadOnly} onValueChanged={(event) => updateField("MCQTQLY", String(event.value ?? ""))} />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-5">
                <div className="einvoice-editor__field-label">{requiredLabel("CQTQLY", "Tax authority")}</div>
                <TextBox value={formData.CQTQLY} readOnly={isReadOnly} onValueChanged={(event) => updateField("CQTQLY", String(event.value ?? ""))} />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-4">
                <div className="einvoice-editor__field-label">{requiredLabel("DDANH", "Place")}</div>
                <TextBox value={formData.DDANH} readOnly={isReadOnly} onValueChanged={(event) => updateField("DDANH", String(event.value ?? ""))} />
              </div>
            </div>
          </EInvoiceEditorSection>

          <EInvoiceEditorSection title={t("DECL_REPRESENTATIVE_INFO", "Legal representative")}>
            <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
              <div className="einvoice-editor__field einvoice-editor__col-4">
                <div className="einvoice-editor__field-label">{requiredLabel("TNDDPLUAT", "Legal representative")}</div>
                <TextBox value={formData.TNDDPLUAT} readOnly={isReadOnly} onValueChanged={(event) => updateField("TNDDPLUAT", String(event.value ?? ""))} />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-4">
                <div className="einvoice-editor__field-label">{requiredLabel("DTDDPLUAT", "Representative phone")}</div>
                <TextBox value={formData.DTDDPLUAT} readOnly={isReadOnly} onValueChanged={(event) => updateField("DTDDPLUAT", String(event.value ?? ""))} />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-4">
                <div className="einvoice-editor__field-label">{requiredLabel("QTDDPLuat", "Nationality")}</div>
                <SelectBox
                  dataSource={countries}
                  valueExpr="COUNTRY_CD"
                  displayExpr="COUNTRY_NM"
                  searchEnabled={true}
                  searchExpr={["COUNTRY_NM", "COUNTRY_CD"]}
                  value={formData.MQTNDDPLUAT || null}
                  readOnly={isReadOnly}
                  showClearButton={!isReadOnly}
                  placeholder={t("SELECT", "Select")}
                  onValueChanged={(event) => handleNationalityChanged(event.value as string | null)}
                />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-4">
                <div className="einvoice-editor__field-label">{isVietnamese ? requiredLabel("CCCDAN", "Citizen ID") : t("CCCDAN", "Citizen ID")}</div>
                <TextBox value={formData.CCCDAN} readOnly={isReadOnly} onValueChanged={(event) => updateField("CCCDAN", String(event.value ?? ""))} />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-4">
                <div className="einvoice-editor__field-label">{isForeignNationality ? requiredLabel("SHCHIEU", "Passport") : t("SHCHIEU", "Passport")}</div>
                <TextBox value={formData.SHCHIEU} readOnly={isReadOnly} onValueChanged={(event) => updateField("SHCHIEU", String(event.value ?? ""))} />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-4">
                <div className="einvoice-editor__field-label">{requiredLabel("NSDDPLUAT", "Representative birth date")}</div>
                <DateBox
                  type="date"
                  displayFormat="yyyy-MM-dd"
                  value={parseDate(formData.NSDDPLUAT)}
                  readOnly={isReadOnly}
                  onValueChanged={(event) => updateField("NSDDPLUAT", formatDateForApi(event.value as Date | null) ?? "")}
                />
              </div>
            </div>
          </EInvoiceEditorSection>

          <EInvoiceEditorSection title={t("DECL_CONTACT_INFO", "Contact information")}>
            <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
              <div className="einvoice-editor__field einvoice-editor__col-12">
                <div className="einvoice-editor__field-label">{requiredLabel("DCLHE", "Contact address")}</div>
                <TextBox value={formData.DCLHE} readOnly={isReadOnly} onValueChanged={(event) => updateField("DCLHE", String(event.value ?? ""))} />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-4">
                <div className="einvoice-editor__field-label">{requiredLabel("NLHE", "Contact person")}</div>
                <TextBox value={formData.NLHE} readOnly={isReadOnly} onValueChanged={(event) => updateField("NLHE", String(event.value ?? ""))} />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-4">
                <div className="einvoice-editor__field-label">{requiredLabel("DTLHE", "Contact phone")}</div>
                <TextBox value={formData.DTLHE} readOnly={isReadOnly} onValueChanged={(event) => updateField("DTLHE", String(event.value ?? ""))} />
              </div>
              <div className="einvoice-editor__field einvoice-editor__col-4">
                <div className="einvoice-editor__field-label">{requiredLabel("DCTDTU", "Email")}</div>
                <TextBox value={formData.DCTDTU} readOnly={isReadOnly} onValueChanged={(event) => updateField("DCTDTU", String(event.value ?? ""))} />
              </div>
            </div>
          </EInvoiceEditorSection>

          <div className="einvoice-editor__field-grid einvoice-editor__field-grid--3">
            <EInvoiceEditorSection title={t("DECL_AUTH_METHOD", "Invoice authentication")} bodyClassName="einvoice-editor__section-body--compact">
              <div className="einvoice-editor__checkbox-grid einvoice-editor__checkbox-grid--2">
                <CheckBox text={t("CMA", "With tax authority code")} value={formData.CMA === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("CMA", Boolean(event.value))} />
                <CheckBox text={t("CMTMTTIEN", "Cash register with code")} value={formData.CMTMTTIEN === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("CMTMTTIEN", Boolean(event.value))} />
                <CheckBox text={t("KCMTMTTIEN", "Cash register without code")} value={formData.KCMTMTTIEN === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("KCMTMTTIEN", Boolean(event.value))} />
                <CheckBox text={t("KCMA", "Without tax authority code")} value={formData.KCMA === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("KCMA", Boolean(event.value))} />
                <CheckBox text={t("NNTDBKKHAN", "Difficult area taxpayer")} value={formData.NNTDBKKHAN === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("NNTDBKKHAN", Boolean(event.value))} />
                <CheckBox text={t("CQXLTSCONG", "Public asset handling agency")} value={formData.CQXLTSCONG === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("CQXLTSCONG", Boolean(event.value))} />
                <CheckBox text={t("TCNNGOAI", "Foreign organization via digital platform")} value={formData.TCNNGOAI === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("TCNNGOAI", Boolean(event.value))} />
              </div>
            </EInvoiceEditorSection>

            <EInvoiceEditorSection title={t("DECL_TRANSFER_METHOD", "Data transmission")} bodyClassName="einvoice-editor__section-body--compact">
              <div className="einvoice-editor__checkbox-grid einvoice-editor__checkbox-grid--2">
                <CheckBox text={t("CDLTTDCQT", "Direct to tax authority")} value={formData.CDLTTDCQT === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("CDLTTDCQT", Boolean(event.value))} />
                <CheckBox text={t("CDLQTCTN", "Via transmission organization")} value={formData.CDLQTCTN === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("CDLQTCTN", Boolean(event.value))} />
                <CheckBox text={t("CDDU", "Full data")} value={formData.CDDU === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("CDDU", Boolean(event.value))} />
                <CheckBox text={t("CDLTHDTHU", "Revenue summary")} value={formData.CDLTHDTHU === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("CDLTHDTHU", Boolean(event.value))} />
                <CheckBox text={t("CBTHOP", "Summary table")} value={formData.CBTHOP === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("CBTHOP", Boolean(event.value))} />
                <CheckBox text={t("CTTCTGDICH", "Transaction detail table")} value={formData.CTTCTGDICH === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("CTTCTGDICH", Boolean(event.value))} />
              </div>
            </EInvoiceEditorSection>

            <EInvoiceEditorSection title={t("DECL_DOCUMENT_TYPE", "Document type")} bodyClassName="einvoice-editor__section-body--compact">
              <div className="einvoice-editor__checkbox-grid einvoice-editor__checkbox-grid--2">
                <CheckBox text={t("HDGTGT", "VAT invoice")} value={formData.HDGTGT === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("HDGTGT", Boolean(event.value))} />
                <CheckBox text={t("HDGTGTTHBLAI", "VAT invoice with receipt")} value={formData.HDGTGTTHBLAI === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("HDGTGTTHBLAI", Boolean(event.value))} />
                <CheckBox text={t("HDBHANG", "Sales invoice")} value={formData.HDBHANG === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("HDBHANG", Boolean(event.value))} />
                <CheckBox text={t("HDBHTHBLAI", "Sales invoice with receipt")} value={formData.HDBHTHBLAI === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("HDBHTHBLAI", Boolean(event.value))} />
                <CheckBox text={t("HDTMAI", "Commercial invoice")} value={formData.HDTMAI === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("HDTMAI", Boolean(event.value))} />
                <CheckBox text={t("HDNCCNNGOAI", "Foreign supplier invoice")} value={formData.HDNCCNNGOAI === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("HDNCCNNGOAI", Boolean(event.value))} />
                <CheckBox text={t("HDBTSCONG", "Public asset invoice")} value={formData.HDBTSCONG === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("HDBTSCONG", Boolean(event.value))} />
                <CheckBox text={t("HDBHDTQGIA", "National reserve invoice")} value={formData.HDBHDTQGIA === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("HDBHDTQGIA", Boolean(event.value))} />
                <CheckBox text={t("HDKHAC", "Other invoice")} value={formData.HDKHAC === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("HDKHAC", Boolean(event.value))} />
                <CheckBox text={t("CTU", "Voucher")} value={formData.CTU === 1} readOnly={isReadOnly} onValueChanged={(event) => updateFlagField("CTU", Boolean(event.value))} />
              </div>
            </EInvoiceEditorSection>
          </div>

          <DeclarationDetailTypeGrid
            title={t("DECL_CTS_SECTION", "Digital certificates (CTS)")}
            detailType="CTS"
            dataSource={ctsDetails}
            isReadOnly={isReadOnly}
            certificateMethodOptions={certificateMethodOptions}
            translate={t}
            onRowUpdating={handleDetailUpdating}
            onRowRemoving={handleDetailRemoving}
            headerAction={
              <Button
                icon="plus"
                text={t("ADD", "Add")}
                stylingMode="outlined"
                disabled={isReadOnly || loading}
                hint={t("DECL_CTS_FROM_PLUGIN", "Load certificate from signing plugin")}
                onClick={() => void handleAddCtsFromPlugin()}
              />
            }
          />

          <DeclarationDetailTypeGrid
            title={t("DECL_TCGP_SECTION", "Solution providers (TCGP)")}
            detailType="TCGP"
            dataSource={tcgpDetails}
            isReadOnly={isReadOnly}
            certificateMethodOptions={certificateMethodOptions}
            translate={t}
            onRowUpdating={handleDetailUpdating}
            onRowRemoving={handleDetailRemoving}
            headerAction={
              <Button icon="plus" text={t("ADD", "Add")} stylingMode="outlined" disabled={isReadOnly} onClick={() => openProviderPicker("TCGP")} />
            }
          />

          <DeclarationDetailTypeGrid
            title={t("DECL_TCTN_SECTION", "Transmission providers (TCTN)")}
            detailType="TCTN"
            dataSource={tctnDetails}
            isReadOnly={isReadOnly}
            certificateMethodOptions={certificateMethodOptions}
            translate={t}
            onRowUpdating={handleDetailUpdating}
            onRowRemoving={handleDetailRemoving}
            headerAction={
              <Button icon="plus" text={t("ADD", "Add")} stylingMode="outlined" disabled={isReadOnly} onClick={() => openProviderPicker("TCTN")} />
            }
          />

          <DeclarationDetailTypeGrid
            title={t("DECL_DVHTPT_SECTION", "Dependent units for invoice lookup (DVHTPT)")}
            detailType="DVHTPT"
            dataSource={dvhtptDetails}
            isReadOnly={isReadOnly}
            certificateMethodOptions={certificateMethodOptions}
            translate={t}
            onRowUpdating={handleDetailUpdating}
            onRowRemoving={handleDetailRemoving}
            headerAction={
              <Button icon="plus" text={t("ADD", "Add")} stylingMode="outlined" disabled={isReadOnly} onClick={() => appendBlankDetail("DVHTPT")} />
            }
          />

          <DeclarationDetailTypeGrid
            title={t("DECL_DVDUQTCUU_SECTION", "Authorized lookup units (DVDUQTCuu)")}
            detailType="DVDUQTCUU"
            dataSource={dvduqDetails}
            isReadOnly={isReadOnly}
            certificateMethodOptions={certificateMethodOptions}
            translate={t}
            onRowUpdating={handleDetailUpdating}
            onRowRemoving={handleDetailRemoving}
            headerAction={
              <Button icon="plus" text={t("ADD", "Add")} stylingMode="outlined" disabled={isReadOnly} onClick={() => appendBlankDetail("DVDUQTCUU")} />
            }
          />

          <DeclarationDetailTypeGrid
            title={t("DECL_TNSDUNG_SECTION", "Temporary stop using e-invoice (TNSDung)")}
            detailType="TNSDUNG"
            dataSource={tnsdungDetails}
            isReadOnly={isReadOnly}
            certificateMethodOptions={certificateMethodOptions}
            translate={t}
            onRowUpdating={handleDetailUpdating}
            onRowRemoving={handleDetailRemoving}
            headerAction={
              <Button icon="plus" text={t("ADD", "Add")} stylingMode="outlined" disabled={isReadOnly} onClick={() => appendBlankDetail("TNSDUNG")} />
            }
          />

          <DeclarationDetailTypeGrid
            title={t("DECL_DKTH_SECTION", "Invoice-voucher integration (DKTH)")}
            detailType="DKTH"
            dataSource={dkthDetails}
            isReadOnly={isReadOnly}
            certificateMethodOptions={certificateMethodOptions}
            translate={t}
            onRowUpdating={handleDetailUpdating}
            onRowRemoving={handleDetailRemoving}
            headerAction={
              <Button icon="plus" text={t("ADD", "Add")} stylingMode="outlined" disabled={isReadOnly} onClick={() => appendBlankDetail("DKTH")} />
            }
          />
      </EInvoiceEditorShell>

      <ShortcutHelpPopup
        visible={shortcutHelpVisible}
        shortcuts={shortcutHelpItems}
        onClose={closeShortcutHelp}
      />

      <Suspense fallback={null}>
        {ctsCertificateSelectPopup}
        {providerPickerVisible ? (
          <EInvoiceDeclarationProviderSelectPopup
            visible={providerPickerVisible}
            detailType={providerPickerType}
            providers={availableProviderOptions}
            selectedCodeCd={selectedProviderCodeCd}
            loading={loading}
            onClose={closeProviderPicker}
            onSelect={setSelectedProviderCodeCd}
            onConfirm={handleConfirmProviderSelection}
          />
        ) : null}

        {setupPopup}
      </Suspense>
    </>
  )
}

export default function EInvoiceDeclarationPage() {
  const location = useLocation()
  const gridRef = useRef<dxDataGrid<EInvoiceDeclaration, GridKey> | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [fromDate, setFromDate] = useState<Date | null>(() => createMonthStartDate())
  const [toDate, setToDate] = useState<Date | null>(() => createToday())
  // Applied query only — typing dates must not refetch until Search / Enter.
  const [listQuery, setListQuery] = useState(() => ({
    fromYmd: formatDateToYmd(createMonthStartDate()) ?? undefined,
    toYmd: formatDateToYmd(createToday()) ?? undefined,
  }))
  const [popupVisible, setPopupVisible] = useState(false)
  const [editingId, setEditingId] = useState(0)
  const [editorReadOnly, setEditorReadOnly] = useState(false)
  const [initialDeclaration, setInitialDeclaration] = useState<EInvoiceDeclaration | null>(null)
  const [deleteDisabled, setDeleteDisabled] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [transmissionPopupVisible, setTransmissionPopupVisible] = useState(false)
  const [transmissionLoading, setTransmissionLoading] = useState(false)
  const [transmissionTitle, setTransmissionTitle] = useState("")
  const [transmissionMessages, setTransmissionMessages] = useState<EInvoiceTransmissionMessage[]>([])
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const { promptIfPluginMissing, setupPopup } = useEInvoiceSigningPluginSetupPrompt()

  const { getCodesByType } = useSysCodes()
  const declarationMethodOptions = useMemo(
    () => buildDeclarationMethodOptions(getCodesByType(EINV_DECLARATION_METHOD_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const declarationMethodLookup = useMemo(
    () => ({
      dataSource: declarationMethodOptions,
      valueExpr: "value",
      displayExpr: "text",
    }),
    [declarationMethodOptions],
  )

  const cqtStatusOptions = useMemo(
    () => buildTkhaiCqtStatusOptions(getCodesByType(EINV_TKHAI_CQT_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const handleShowTransmissionMessages = useCallback(
    async (row: EInvoiceDeclaration) => {
      const tkhaiId = Number(row.TKHAI_ID ?? 0)
      if (!Number.isFinite(tkhaiId) || tkhaiId <= 0) {
        return
      }

      const titleParts = [
        typeof row.MSO === "string" ? row.MSO.trim() : "",
        typeof row.TNNT === "string" ? row.TNNT.trim() : "",
      ].filter(Boolean)

      setTransmissionTitle(
        titleParts.length > 0
          ? `${t("DECL_TRANSMISSION_INFO", "Thông tin truyền nhận")} - ${titleParts.join(" - ")}`
          : t("DECL_TRANSMISSION_INFO", "Thông tin truyền nhận"),
      )
      setTransmissionMessages([])
      setTransmissionPopupVisible(true)
      setTransmissionLoading(true)

      try {
        const response = await getEInvoiceDeclarationTransmissionMessages(tkhaiId)
        setTransmissionMessages(response.data)
      } catch (error) {
        notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
      } finally {
        setTransmissionLoading(false)
      }
    },
    [t],
  )

  const handleViewTransmissionMessage = useCallback(
    async (message: EInvoiceTransmissionMessage) => {
      try {
        const opened = await openEInvoiceTransmissionHtmlPreview(message)
        if (!opened) {
          notify(t("PREVIEW_OPEN_FAILED", "Could not open preview"), "warning", 3000)
        }
      } catch (error) {
        notify(getApiErrorMessage(error, t("PREVIEW_FAILED", "Preview failed")), "error", 4000)
      }
    },
    [t],
  )

  const renderTaxpayerSummaryCell = useCallback((cellInfo: DeclarationGridCellInfo) => {
    const taxpayerName = typeof cellInfo.data?.TNNT === "string" ? cellInfo.data.TNNT.trim() : ""
    const taxCode = typeof cellInfo.data?.MST === "string" ? cellInfo.data.MST.trim() : ""
    const taxAuthority = typeof cellInfo.data?.CQTQLY === "string" ? cellInfo.data.CQTQLY.trim() : ""
    const errorMessage = typeof cellInfo.data?.ERROR_MESSAGE === "string" ? cellInfo.data.ERROR_MESSAGE.trim() : ""
    const meta = [
      taxCode ? `${t("MST", "MST")}: ${taxCode}` : "",
      taxAuthority ? `${t("CQTQLY", "CQT")}: ${taxAuthority}` : "",
    ]
      .filter(Boolean)
      .join(" · ")

    return (
      <EInvoicePartyCell
        name={taxpayerName || "—"}
        meta={meta}
        error={errorMessage ? truncateEInvoiceErrorMessage(errorMessage) : undefined}
      />
    )
  }, [t])

  const renderDeclarationStatusCell = useCallback(
    (cellInfo: DeclarationGridCellInfo) => (
      <EInvoiceDeclarationStatusCell
        data={cellInfo.data}
        t={t}
        onShowTransmission={(row) => {
          void handleShowTransmissionMessages(row)
        }}
      />
    ),
    [handleShowTransmissionMessages, t],
  )

  const screenCd = useMemo(() => location.pathname, [location.pathname])
  const companyCd = getCurrentCompanyCd()

  const {
    data: declarationData = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch,
  } = useEInvoiceDeclarationListQuery(listQuery)
  const invalidateDeclarations = useEInvoiceDeclarationListInvalidate()
  const rows = useMemo(() => normalizeDeclarationRows(declarationData, companyCd), [companyCd, declarationData])
  const listLoading = isLoading || isFetching
  const loading = listLoading || actionLoading

  const certificateSigningPopupOptions = useMemo(
    () => ({
      targetLabel: t("SIGN_RECORD_COUNT", "record(s)"),
    }),
    [t],
  )

  const { certificatePopupVisible, openSigningPopup, certificateSelectPopup } =
    useEInvoiceCertificateSigning<PendingSignDeclaration>({
      t,
      promptIfPluginMissing,
      onRefresh: invalidateDeclarations,
      setActionLoading,
      popupOptions: certificateSigningPopupOptions,
      signBatch: async (items, certificateThumbprint) => {
        let successCount = 0
        for (const [index, signRequest] of items.entries()) {
          const signed = await signXmlWithPlugin({
            requestId: `einvoice-tkhai-${companyCd}-${signRequest.tkhaiId}-${Date.now()}-${index + 1}`,
            invoiceId: signRequest.tkhaiId,
            companyCd,
            certificateThumbprint,
            signType: "NNT",
            xml: signRequest.rawXml,
          })

          await saveEInvoiceDeclarationSignature(signRequest.tkhaiId, {
            XML: signed.signedXml,
            CERTIFICATE_SUBJECT: signed.certificateSubject,
            CERTIFICATE_THUMBPRINT: signed.certificateThumbprint,
            CERTIFICATE_SERIAL_NUMBER: signed.certificateSerialNumber,
            SIGNED_AT: signed.signedAt,
          })

          successCount += 1
        }

        return successCount
      },
    })

  useMasterListLoadError(isError, loadError, t, "Failed to load e-invoice declarations")

  useEffect(() => {
    gridRef.current?.clearSelection()
    setDeleteDisabled(false)
  }, [rows])

  const validateDateRange = useCallback(() => {
    if (!fromDate || !toDate || fromDate <= toDate) {
      return true
    }

    notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
    return false
  }, [fromDate, t, toDate])

  const getSelectedDeclarations = useCallback((): EInvoiceDeclaration[] => {
    const selectedKeys = new Set((gridRef.current?.getSelectedRowKeys() ?? []) as GridKey[])
    return rows.filter((row) => selectedKeys.has(row.TKHAI_ID))
  }, [rows])

  const getSelectedIds = useCallback(() => {
    return getSelectedDeclarations()
      .map((row) => Number(row.TKHAI_ID ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0)
  }, [getSelectedDeclarations])

  const openCreate = useCallback(() => {
    setInitialDeclaration(null)
    setEditingId(0)
    setEditorReadOnly(false)
    setPopupVisible(true)
  }, [])

  const openEdit = useCallback((row: EInvoiceDeclaration) => {
    setInitialDeclaration(null)
    setEditingId(Number(row.TKHAI_ID ?? 0))
    setEditorReadOnly(!isDeclarationEditable(row))
    setPopupVisible(true)
  }, [])

  const handleContextMenuCopy = useCallback(
    async (row: EInvoiceDeclaration) => {
      const tkhaiId = Number(row.TKHAI_ID ?? 0)
      if (tkhaiId <= 0) {
        return
      }

      setActionLoading(true)
      try {
        const [response, pluginCertificates] = await Promise.all([
          getEInvoiceDeclaration(tkhaiId),
          getSigningPluginCertificates().catch(() => [] as EInvoicePluginCertificate[]),
        ])
        const declaration = normalizeDeclaration(response.data, companyCd)
        setInitialDeclaration(prepareDeclarationCopy(declaration, companyCd, pluginCertificates))
        setEditingId(0)
        setEditorReadOnly(false)
        setPopupVisible(true)
      } catch (error) {
        notify(getApiErrorMessage(error, t("COPY_FAILED", "Copy failed")), "error", 4000)
      } finally {
        setActionLoading(false)
      }
    },
    [companyCd, t],
  )

  const handleContextMenuCopyAction = useCallback(
    (row: EInvoiceDeclaration) => {
      void handleContextMenuCopy(row)
    },
    [handleContextMenuCopy],
  )

  const closeTransmissionPopup = useCallback(() => {
    if (transmissionLoading) {
      return
    }

    setTransmissionPopupVisible(false)
    setTransmissionMessages([])
    setTransmissionTitle("")
  }, [transmissionLoading])

  const closePopup = useCallback(() => {
    setPopupVisible(false)
    setInitialDeclaration(null)
    setEditingId(0)
    setEditorReadOnly(false)
    void invalidateDeclarations()
  }, [invalidateDeclarations])

  const handleSaved = useCallback(async (_declaration: EInvoiceDeclaration) => {
    await invalidateDeclarations()
  }, [invalidateDeclarations])

  const handleGridInitialized = useCallback((event: InitializedEvent<EInvoiceDeclaration, GridKey>) => {
    gridRef.current = event.component ?? null
  }, [])

  const handleRowDblClick = useCallback(
    (event: RowDblClickEvent<EInvoiceDeclaration, GridKey>) => {
      if (event.data && Number(event.data.TKHAI_ID ?? 0) > 0) {
        openEdit(event.data)
      }
    },
    [openEdit],
  )

  const handleSelectionChanged = useCallback((event: SelectionChangedEvent<EInvoiceDeclaration, GridKey>) => {
    const selectedRows = event.selectedRowsData ?? []
    setHasSelection(selectedRows.length > 0)
    setDeleteDisabled(selectedRows.some((row) => !isDeclarationEditable(row)))
  }, [])

  const handleDelete = useCallback(async () => {
    const selectedDeclarations = getSelectedDeclarations()
    const deletableIds = selectedDeclarations
      .filter((row) => isDeclarationEditable(row))
      .map((row) => Number(row.TKHAI_ID ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (selectedDeclarations.length === 0) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }

    if (deletableIds.length !== selectedDeclarations.length) {
      notify(t("SIGNED_DELETE_BLOCKED", "Signed record cannot be deleted"), "warning", 3500)
    }

    if (deletableIds.length === 0) {
      return
    }

    const confirmed = await confirm(
      formatText(t("MSG_CONFIRM_DELETE_RECORD", "Are you sure you want to delete {0} record?"), [deletableIds.length]),
      t("MSG_CONFIRM_DELETE", "Confirm delete"),
    )
    if (!confirmed) {
      return
    }

    setActionLoading(true)
    try {
      await deleteEInvoiceDeclarations(deletableIds)
      notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
      await invalidateDeclarations()
    } catch (error) {
      notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 4000)
    } finally {
      setActionLoading(false)
    }
  }, [getSelectedDeclarations, invalidateDeclarations, t])

  const handleSignXml = useCallback(async () => {
    const ids = getSelectedIds()
    if (ids.length === 0) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }

    const confirmed = await confirm(
      formatText(t("SIGN_CONFIRM_BATCH", "Sign {0} selected record(s)?"), [ids.length]),
      t("SIGN_SEND_CQT", "Ký và gửi CQT"),
    )
    if (!confirmed) {
      return
    }

    setActionLoading(true)
    try {
      const signRequests: PendingSignDeclaration[] = []
      const skippedIds: number[] = []

      for (const tkhaiId of ids) {
        const payloadResponse = await getEInvoiceDeclarationSigningPayload(tkhaiId)
        const payload = payloadResponse.data
        const rawXml = String(payload.RAW_XML ?? "").trim()

        if (payload.IS_SIGNED || !rawXml) {
          skippedIds.push(tkhaiId)
          continue
        }

        signRequests.push({ tkhaiId, rawXml })
      }

      if (skippedIds.length > 0) {
        notify(formatText(t("SIGN_SKIP_COUNT", "Skipped {0} record(s)"), [skippedIds.length]), "warning", 3000)
      }

      if (signRequests.length === 0) {
        return
      }

      await openSigningPopup(signRequests)
    } catch (error) {
      if (await promptIfPluginMissing(error)) {
        return
      }
      notify(getApiErrorMessage(error, t("SIGN_FAILED", "Sign XML failed")), "error", 5000)
    } finally {
      setActionLoading(false)
    }
  }, [getSelectedIds, openSigningPopup, promptIfPluginMissing, t])

  const handleViewXml = useCallback(async () => {
    const ids = getSelectedIds()
    if (ids.length === 0) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }

    if (ids.length > 1) {
      notify(t("XML_PREVIEW_SINGLE", "Select exactly one record to view XML"), "warning", 3500)
      return
    }

    const selectedDeclaration = getSelectedDeclarations()[0]
    const titleParts = [
      typeof selectedDeclaration?.MSO === "string" ? selectedDeclaration.MSO.trim() : "",
      typeof selectedDeclaration?.TNNT === "string" ? selectedDeclaration.TNNT.trim() : "",
    ].filter(Boolean)
    const title = titleParts.length > 0 ? `E-Invoice Declaration XML ${titleParts.join(" - ")}` : undefined

    setActionLoading(true)
    try {
      await openEInvoiceDeclarationXmlPreviewWithNotify(ids[0], {
        title,
        notifyUnableToOpen: (message) => notify(message, "error", 4000),
      })
    } finally {
      setActionLoading(false)
    }
  }, [getSelectedDeclarations, getSelectedIds, t])

  const handleViewPreview = useCallback(
    async (event?: MouseEvent) => {
      if (event?.ctrlKey) {
        await handleViewXml()
        return
      }

      const ids = getSelectedIds()
      if (ids.length === 0) {
        notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
        return
      }

      if (ids.length > 1) {
        notify(t("PREVIEW_SINGLE", "Select exactly one record to preview"), "warning", 3500)
        return
      }

      setActionLoading(true)
      try {
        await openEInvoiceDeclarationPreview({ tkhaiId: ids[0] })
      } finally {
        setActionLoading(false)
      }
    },
    [getSelectedIds, handleViewXml, t],
  )

  const afterAddItems = useMemo(
    () => [
      createEInvoiceSignSendCqtToolbarItem(t, {
        visible: hasSelection,
        loading,
        onSign: handleSignXml,
      }),
    ],
    [handleSignXml, hasSelection, loading, t],
  )

  const toolbarItems = useMemo(
    () => [
      {
        key: "view-preview",
        icon: "print",
        text: t("VIEW", "View"),
        hint: t("PREVIEW_HINT", "View HTML preview"),
        stylingMode: "outlined" as const,
        disabled: loading,
        onClick: (event) => {
          void handleViewPreview(event)
        },
      },
    ],
    [handleViewPreview, loading, t],
  )

  const applyListQuery = useCallback(() => {
    if (!validateDateRange()) {
      return
    }

    setListQuery({
      fromYmd: formatDateToYmd(fromDate) ?? undefined,
      toYmd: formatDateToYmd(toDate) ?? undefined,
    })
  }, [fromDate, toDate, validateDateRange])

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
        <GridToolbar
          gridRef={gridRef}
          onAdd={openCreate}
          onRefresh={() => {
            void refetch()
          }}
          onRangeSearch={applyListQuery}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          showDateRange={true}
          onDelete={handleDelete}
          deleteDisabled={deleteDisabled}
          afterAddItems={afterAddItems}
          customItems={toolbarItems}
          showImport={false}
          showExportPdf={false}
          showExportXlsx={false}
          shortcutsEnabled={!popupVisible && !certificatePopupVisible && !transmissionPopupVisible}
        />

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <EInvoiceTableShell className="h-full">
            <PageGrid<EInvoiceDeclaration>
              dataSource={rows}
              keyExpr="TKHAI_ID"
              screenCd={screenCd}
              gridId="einvoice-declaration-grid"
              copyExcludeFields={COPY_EXCLUDE_FIELDS}
              wordWrapEnabled={false}
              onAdd={openCreate}
              onInitialized={handleGridInitialized}
              onSelectionChanged={handleSelectionChanged}
              onRowDblClick={handleRowDblClick}
              onContextMenuUpdate={openEdit}
              onContextMenuCopy={handleContextMenuCopyAction}
              selectMode="multiple"
              showPager={true}
              defaultPageSize={20}
            >
              <Column dataField="MCCQT" caption="MCCQT (MTT)" width={230} allowEditing={false} />
              <Column dataField="MSO" caption={t("MSO", "Form code")} width={130} fixed={true} fixedPosition="left" />
              <Column dataField="TEN" caption={t("TEN", "Declaration name")} minWidth={260} />
              <Column dataField="HTHUC" caption={t("HTHUC", "Method")} width={180} lookup={declarationMethodLookup} />
              <Column
                name="DECLARATION_TAXPAYER_SUMMARY"
                caption={t("TNNT", "Taxpayer")}
                minWidth={260}
                calculateCellValue={(row: EInvoiceDeclaration) => formatDeclarationTaxpayerSummaryText(row)}
                cellRender={renderTaxpayerSummaryCell}
              />
              <Column
                name="DECLARATION_STATUS_SUMMARY"
                caption={t("STATUS_SUMMARY", "Trạng thái")}
                width={220}
                alignment="center"
                calculateCellValue={(row: EInvoiceDeclaration) =>
                  formatDeclarationStatusSummary(
                    row,
                    cqtStatusOptions,
                    t("IS_SIGNED", "Signed"),
                    t("SIGNED_NO", "Not signed"),
                  )
                }
                cellRender={renderDeclarationStatusCell}
              />
            </PageGrid>
          </EInvoiceTableShell>

          <LoadPanel visible={loading} showIndicator={true} showPane={true} shading={true} shadingColor="rgba(0, 0, 0, 0.15)" />
        </div>

        {transmissionPopupVisible ? (
          <EInvoiceTransmissionMessagesPopup
            visible={transmissionPopupVisible}
            title={transmissionTitle}
            loading={transmissionLoading}
            messages={transmissionMessages}
            t={t}
            onClose={closeTransmissionPopup}
            onViewHtml={handleViewTransmissionMessage}
          />
        ) : null}

        <Suspense fallback={null}>
          {certificateSelectPopup}

          {setupPopup}

          {popupVisible ? (
            <DeclarationEditorPopup
              key={initialDeclaration ? "copy" : `declaration-${editingId}`}
              visible={popupVisible}
              declarationId={editingId}
              initialDeclaration={initialDeclaration}
              readOnly={editorReadOnly}
              onClose={closePopup}
              onSaved={handleSaved}
            />
          ) : null}
        </Suspense>
      </div>
    </DxPage>
  )
}
