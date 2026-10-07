import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import TextBox from "devextreme-react/text-box"
import { Form as DxForm } from "devextreme-react/data-grid"
import { GroupItem, Item } from "devextreme-react/form"
import Form from "devextreme/ui/form"
import type dxForm from "devextreme/ui/form"

import { createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions"
import TaxCodeLookupField from "@/components/forms/TaxCodeLookupField"
import MasterLookupFormField from "@/components/lookup/MasterLookupFormField"
import type { SysCode } from "@/api/sysCodeService"
import { createSysCodeSelectBoxEditorOptions } from "@/components/forms/sysCodeSelectBoxOptions"
import { LanguageContext } from "@/lib/i18nLoader"
import { bankLookupStore } from "@/components/lookup/bankLookupStore"
import { renderSharedBankLookupPage } from "@/components/lookup/sharedMasterLookupPages"
import { normalizeTaxCode } from "@/lib/taxCode"
import type { BankInfo } from "@/types/bankInfo"
import type { TaxLookupInfo } from "@/types/taxLookup"
import {
  customerFieldGroups,
  customerFields,
  requiredCustomerFields,
  type CustomerFieldKey,
} from "./Columns/CustomerFields"
import {
  getCustomerEditSessionKey,
  patchCustomerEditIdentity,
  resolveCustomerIdentitySeed,
} from "./customerEditSession"

export type FormGroup = {
  key: string
  caption: string
  colCount: number
  cssClass?: string
  items: FormItemConfig[]
}

interface CustomerExtFormProps {
  categoryCodes: SysCode[]
  customerTypeCodes: SysCode[]
  formGroups?: FormGroup[]
  translate?: (key: string, fallback?: string) => string
}

type CustomerEditorType = "dxTextBox" | "dxSelectBox" | "dxLookup"
type RequiredFormRule = {
  type: "required"
  message: string
}

type FormLike = {
  NAME?: string
  element?: () => Element
  option: (name: string, value?: unknown) => unknown
  updateData: (field: string | Record<string, unknown>, value?: unknown) => void
}

type FormItemConfig = {
  dataField: CustomerFieldKey
  label: string | { text?: string; visible?: boolean }
  editorType?: CustomerEditorType
  editorOptions?: Record<string, unknown>
  validationRules?: RequiredFormRule[]
  colSpan?: number
  render?: (data: { component: FormLike }) => JSX.Element
}

type IdentityValues = {
  TAX_CD: string
  CUSTOMER_NM_VIET: string
  ADDRESS: string
}

const getEditorConfig = (
  fieldKey: CustomerFieldKey,
  caption: string,
  categoryCodes: SysCode[],
  customerTypeCodes: SysCode[],
  translate: (key: string, fallback?: string) => string,
): {
  editorType?: CustomerEditorType
  editorOptions?: Record<string, unknown>
  render?: (data: { component: FormLike }) => JSX.Element
} => {
  if (fieldKey === "CATEGORY_CD") {
    return {
      editorType: "dxSelectBox",
      editorOptions: createSysCodeSelectBoxEditorOptions(categoryCodes, caption, translate),
    }
  }

  if (fieldKey === "CUSTOMER_TYPE") {
    return {
      editorType: "dxSelectBox",
      editorOptions: createSysCodeSelectBoxEditorOptions(customerTypeCodes, caption, translate),
    }
  }

  if (fieldKey === "BANK_ID") {
    const displayExpr = (item: BankInfo | null) => {
      const code = item?.BANK_CD?.trim() ?? ""
      const name = item?.BANK_NM?.trim() ?? ""
      return code && name ? `${code} - ${name}` : code || name
    }

    return {
      render: ({ component }) => (
        <MasterLookupFormField<BankInfo>
          form={component as unknown as dxForm}
          dataField="BANK_ID"
          dataSource={bankLookupStore}
          valueExpr="BANK_ID"
          getValue={(item) => item.BANK_ID}
          displayExpr={displayExpr}
          placeholder={caption}
          popupTitle={translate("BANK_LIST", "Banks")}
          buttonHint={translate("SEARCH", "Open bank list")}
          filterFocusField="BANK_CD"
          searchExpr={["BANK_CD", "BANK_NM", "ACCOUNT_NUM", "ACC_CD"]}
          renderPopupContent={({ closePopup, onPick }) =>
            renderSharedBankLookupPage({ closePopup, onPick })
          }
        />
      ),
    }
  }

  return {
    editorType: "dxTextBox",
    editorOptions: createOutlinedEditorOptions({}),
  }
}

function resolveDxForm(component: FormLike): dxForm | null {
  if ((component as { NAME?: string }).NAME === "dxForm") {
    return component as unknown as dxForm
  }

  const rawElement = (component as { element?: () => Element }).element?.() as
    | Element
    | { get?: (index: number) => Element | undefined; [index: number]: Element }
    | undefined
  if (!rawElement) {
    return null
  }

  const element =
    typeof (rawElement as Element).closest === "function"
      ? (rawElement as Element)
      : ((rawElement as { get?: (index: number) => Element | undefined })[0] ??
          (rawElement as { get?: (index: number) => Element | undefined }).get?.(0))

  if (!element || typeof element.closest !== "function") {
    return null
  }

  const formElement = element.closest(".dx-form")
  if (!formElement) {
    return null
  }

  return Form.getInstance(formElement) as dxForm | null
}

function readFormData(component: FormLike): Record<string, unknown> {
  const form = resolveDxForm(component)
  const fromForm = form?.option("formData")
  if (fromForm && typeof fromForm === "object") {
    return fromForm as Record<string, unknown>
  }

  const layoutData = component.option("layoutData")
  if (layoutData && typeof layoutData === "object") {
    return layoutData as Record<string, unknown>
  }

  const formData = component.option("formData")
  return formData && typeof formData === "object" ? (formData as Record<string, unknown>) : {}
}

function updateFormField(component: FormLike, dataField: string, value: string) {
  const form = resolveDxForm(component)
  const target = (form as unknown as FormLike | null) ?? component
  target.updateData(dataField, value)
}

function readIdentityValues(component: FormLike): IdentityValues {
  const formData = readFormData(component)
  return {
    TAX_CD: String(formData.TAX_CD ?? ""),
    CUSTOMER_NM_VIET: String(formData.CUSTOMER_NM_VIET ?? ""),
    ADDRESS: String(formData.ADDRESS ?? ""),
  }
}

function pickIdentitySeed(component: FormLike): IdentityValues {
  const fromForm = readIdentityValues(component)
  if (fromForm.TAX_CD || fromForm.CUSTOMER_NM_VIET || fromForm.ADDRESS) {
    return fromForm
  }
  return resolveCustomerIdentitySeed()
}

/** One React tree for MST + name + address so lookup setState always paints. */
function CustomerIdentitySection({
  component,
  labels,
  sectionKey,
}: {
  component: FormLike
  labels: { taxCd: string; name: string; address: string }
  sectionKey: string
}) {
  const [values, setValues] = useState<IdentityValues>(() => pickIdentitySeed(component))

  useEffect(() => {
    const applySeed = () => {
      const seed = pickIdentitySeed(component)
      const hasData = Boolean(seed.TAX_CD || seed.CUSTOMER_NM_VIET || seed.ADDRESS)
      if (!hasData) {
        return false
      }

      setValues(seed)
      updateFormField(component, "TAX_CD", seed.TAX_CD)
      updateFormField(component, "CUSTOMER_NM_VIET", seed.CUSTOMER_NM_VIET)
      updateFormField(component, "ADDRESS", seed.ADDRESS)
      return true
    }

    if (applySeed()) {
      return
    }

    const t1 = window.setTimeout(() => applySeed(), 50)
    const t2 = window.setTimeout(() => applySeed(), 200)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [component, sectionKey])

  const commitField = useCallback(
    (dataField: keyof IdentityValues, nextValue: string) => {
      patchCustomerEditIdentity({ [dataField]: nextValue })
      setValues((current) => ({ ...current, [dataField]: nextValue }))
      updateFormField(component, dataField, nextValue)
    },
    [component],
  )

  const applyLookup = useCallback(
    (info: TaxLookupInfo) => {
      const current = pickIdentitySeed(component)
      const next: IdentityValues = {
        TAX_CD: normalizeTaxCode(info.TaxID) || normalizeTaxCode(current.TAX_CD),
        CUSTOMER_NM_VIET: (info.Name ?? "").trim() || current.CUSTOMER_NM_VIET,
        ADDRESS: (info.Address ?? "").trim() || current.ADDRESS,
      }

      patchCustomerEditIdentity(next)
      setValues(next)
      updateFormField(component, "TAX_CD", next.TAX_CD)
      updateFormField(component, "CUSTOMER_NM_VIET", next.CUSTOMER_NM_VIET)
      updateFormField(component, "ADDRESS", next.ADDRESS)
    },
    [component],
  )

  return (
    <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
      <div className="min-w-0">
        <div className="dx-field-item-label-text mb-1 text-sm">{labels.taxCd}</div>
        <TaxCodeLookupField
          value={values.TAX_CD}
          onValueChange={(nextValue) => commitField("TAX_CD", nextValue)}
          onLookupApply={applyLookup}
        />
      </div>
      <div className="min-w-0">
        <div className="dx-field-item-label-text mb-1 text-sm">{labels.name}</div>
        <TextBox
          value={values.CUSTOMER_NM_VIET}
          valueChangeEvent="input"
          onValueChanged={(event) => commitField("CUSTOMER_NM_VIET", String(event.value ?? ""))}
          {...createOutlinedEditorOptions({})}
        />
      </div>
      <div className="min-w-0 md:col-span-2">
        <div className="dx-field-item-label-text mb-1 text-sm">{labels.address}</div>
        <TextBox
          value={values.ADDRESS}
          valueChangeEvent="input"
          onValueChanged={(event) => commitField("ADDRESS", String(event.value ?? ""))}
          {...createOutlinedEditorOptions({})}
        />
      </div>
    </div>
  )
}

function CustomerIdentityFormItem({
  component,
  labels,
}: {
  component: FormLike
  labels: { taxCd: string; name: string; address: string }
}) {
  const formData = readFormData(component)
  const sessionKey = getCustomerEditSessionKey()
  const seed = resolveCustomerIdentitySeed()
  const sectionKey = String(
    sessionKey ?? formData.CUSTOMER_ID ?? formData.CUSTOMER_CD ?? (seed.TAX_CD || "new"),
  )

  return (
    <CustomerIdentitySection
      key={sectionKey}
      sectionKey={sectionKey}
      component={component}
      labels={labels}
    />
  )
}

export default function CustomerExtForm({
  categoryCodes,
  customerTypeCodes,
  formGroups,
  translate: translateOverride,
}: CustomerExtFormProps) {
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = useMemo(
    () => (key: string, fallback?: string) => {
      const tFn = translateOverride ?? translate
      return tFn ? tFn(key, fallback) : fallback ?? ""
    },
    [translate, translateOverride],
  )

  const identityLabels = useMemo(
    () => ({
      taxCd: t("TAX_CD", "Tax Code"),
      name: t("CUSTOMER_NM_VIET", "Customer Name (VI)"),
      address: t("ADDRESS", "Address"),
    }),
    [t],
  )

  const defaultGroups = useMemo(() => {
    const createItem = (fieldKey: CustomerFieldKey): FormItemConfig => {
      const field = customerFields.find((item) => item.key === fieldKey)
      const caption = t(fieldKey, field?.caption ?? fieldKey)
      const { editorType, editorOptions, render } = getEditorConfig(fieldKey, caption, categoryCodes, customerTypeCodes, t)

      return {
        dataField: fieldKey,
        label: caption,
        editorType,
        editorOptions,
        render,
        validationRules: requiredCustomerFields.has(fieldKey)
          ? [{ type: "required", message: t("MSG_MUST_ITEM", `${fieldKey} is required`) }]
          : undefined,
        colSpan: field?.colSpan,
      }
    }

    return [
      {
        key: "basic",
        caption: t("BASE_INFO", "Basic Information"),
        colCount: 3,
        cssClass: "popup-card popup-card--classify",
        items: customerFieldGroups.basic.map(createItem),
      },
      {
        key: "names",
        caption: t("CUSTOMER_NAME_INFO", "Thông tin khách hàng"),
        colCount: 1,
        cssClass: "popup-card popup-card--company",
        items: [
          {
            dataField: "CUSTOMER_NM_VIET",
            label: { visible: false },
            validationRules: requiredCustomerFields.has("CUSTOMER_NM_VIET")
              ? [{ type: "required" as const, message: t("MSG_MUST_ITEM", "CUSTOMER_NM_VIET is required") }]
              : undefined,
            render: (data: { component: FormLike }) => (
              <CustomerIdentityFormItem component={data.component} labels={identityLabels} />
            ),
          } satisfies FormItemConfig,
        ],
      },
      {
        key: "contact",
        caption: t("COMPANY_INFO_CONTACT", "Contact Information"),
        colCount: 2,
        cssClass: "popup-card popup-card--contact",
        items: customerFieldGroups.contact.map(createItem),
      },
      {
        key: "finance",
        caption: t("lblTAX_BANK_INFORMATION", "Tax / Bank"),
        colCount: 3,
        cssClass: "popup-card popup-card--bank",
        items: customerFieldGroups.finance.map(createItem),
      },
      {
        key: "other",
        caption: t("Other", "Khác"),
        colCount: 2,
        cssClass: "popup-card popup-card--note",
        items: customerFieldGroups.other.map(createItem),
      },
    ]
  }, [categoryCodes, customerTypeCodes, identityLabels, t])

  const groups = formGroups && formGroups.length > 0 ? formGroups : defaultGroups

  return (
    <div className="customer-ext-form">
      <DxForm colCount={1} labelLocation="top" width="100%">
        {groups.map((group) => (
          <GroupItem key={group.key} caption={group.caption} colCount={group.colCount} cssClass={group.cssClass}>
            {group.items.map((item) => (
              <Item
                key={typeof item.label === "string" ? item.dataField : `${item.dataField}-custom`}
                dataField={item.dataField}
                label={typeof item.label === "string" ? { text: item.label } : item.label}
                editorType={item.editorType}
                editorOptions={item.editorOptions}
                validationRules={item.validationRules}
                colSpan={item.colSpan}
                render={item.render}
              />
            ))}
          </GroupItem>
        ))}
      </DxForm>
    </div>
  )
}
