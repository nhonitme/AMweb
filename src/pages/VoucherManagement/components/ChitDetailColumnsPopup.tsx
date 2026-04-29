import { Fragment, useContext, useEffect, useState, type ComponentType } from "react"

import { Button as GridButton, Column } from "devextreme-react/data-grid"
import type { ColumnButtonClickEvent, ColumnEditCellTemplateData } from "devextreme/ui/data_grid"
import type { Format as LocalizationFormat } from "devextreme/common/core/localization"

import AcclistLookupCellEditor from "@/components/lookup/AcclistLookupCellEditor"
import { LookupStore } from "@/components/lookup/AcclistLookupStore"
import BankLookupCellEditor from "@/components/lookup/BankLookupCellEditor"
import CurrencyLookupCellEditor from "@/components/lookup/CurrencyLookupCellEditor"
import CustomerLookupCellEditor from "@/components/lookup/CustomerLookupCellEditor"
import DepartmentLookupCellEditor from "@/components/lookup/DepartmentLookupCellEditor"
import { customerLookupStore } from "@/components/lookup/customerLookupStore"
import { LanguageContext } from "@/lib/i18nLoader"
import { buildDecimalFormat, loadDecimalSettings, resolveDecimalSetting, subscribeDecimalSettingUpdates } from "@/lib/decimalSettingCache"
import type { ChitDetail, ChitType } from "@/types/voucher"
import type { DecimalSettingRule } from "@/lib/decimalSettingCache"
import { getCurrentLangCode } from "@/utils/language"

export interface VoucherDetailColumnsProps {
  onSoftDeleteRow?: (rowKey: string | null) => void
  onOpenInventoryRow?: (rowKey: string | null) => void
}

type VoucherDetailColumnsComponent = ComponentType<VoucherDetailColumnsProps>

type ChitDetailEditCellInfo = ColumnEditCellTemplateData<ChitDetail, string | number>

type ChitDetailLookupValueField = {
  [K in keyof ChitDetail]: ChitDetail[K] extends string | number | null | undefined ? K : never
}[keyof ChitDetail]

type ChitDetailStringValueField = {
  [K in keyof ChitDetail]: ChitDetail[K] extends string | null | undefined ? K : never
}[keyof ChitDetail]

interface VoucherDetailEditors {
  t: (key: string, fallback: string) => string
  renderCustomerEditor: (cellInfo: ChitDetailEditCellInfo) => JSX.Element
  createAccEditor: (config: {
    valueField: ChitDetailStringValueField
    nameField: ChitDetailStringValueField
    idField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
  }) => (cellInfo: ChitDetailEditCellInfo) => JSX.Element
  createBankEditor: (config: {
    valueField: ChitDetailLookupValueField
    valueMode?: "id" | "code"
    bankIdField?: string
    bankCdField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
  }) => (cellInfo: ChitDetailEditCellInfo) => JSX.Element
  createDepartmentEditor: (config: {
    valueField: ChitDetailLookupValueField
    valueMode?: "id" | "code"
    departmentIdField?: string
    departmentCdField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
  }) => (cellInfo: ChitDetailEditCellInfo) => JSX.Element
  createCurrencyEditor: (config: {
    valueField: ChitDetailLookupValueField
    currencyCdField?: string
    currencyNmField?: string
    symbolField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
  }) => (cellInfo: ChitDetailEditCellInfo) => JSX.Element
}

function useVoucherDetailEditors(): VoucherDetailEditors {
  const { translate } = useContext(LanguageContext)

  const t = (key: string, fallback: string) => translate(key, fallback)

  const renderCustomerEditor = (cellInfo: ChitDetailEditCellInfo) => (
    <CustomerLookupCellEditor
      dataSource={customerLookupStore}
      value={cellInfo.data?.CUSTOMER_ID ?? null}
      rowData={cellInfo.data ?? {}}
      rowIndex={cellInfo.row?.rowIndex ?? -1}
      grid={cellInfo.component}
      setValue={(customerId) => {
        cellInfo.component.cellValue(cellInfo.row.rowIndex, "CUSTOMER_ID", customerId)
      }}
      customerIdField="CUSTOMER_ID"
      customerCdField="CUSTOMER_CD"
      customerNmField="CUSTOMER_NM_VIET"
      taxCdField="TAX_CD"
      addressField="ADDRESS"
      customerCdFieldCaption={t("CUSTOMER_CD", "Customer code")}
      customerNmFieldCaption={t("CUSTOMER_NM", "Customer name")}
      taxCdFieldCaption={t("TAX_CD", "Tax code")}
      addressFieldCaption={t("ADDRESS", "Address")}
      placeholder={t("CustomerSelect", "Select customer")}
      popupTitle={t("CustomerSelect", "Select customer")}
      buttonHint={t("LIST_CUSTOMER", "Open customer list")}
    />
  )

  const createAccEditor = ({
    valueField,
    nameField,
    idField,
    placeholder,
    popupTitle,
    buttonHint,
  }: {
    valueField: ChitDetailStringValueField
    nameField: ChitDetailStringValueField
    idField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
  }) =>
    (cellInfo: ChitDetailEditCellInfo) => (
      <AcclistLookupCellEditor
        dataSource={LookupStore}
        value={cellInfo.data?.[valueField] ?? null}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(accCd) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, valueField, accCd)
        }}
        ValueField={valueField}
        NameField={nameField}
        IdField={idField}
        LookupCodeField="ACC_CD"
        LookupNameField={`ACCTITLE_NM_${getCurrentLangCode()}`}
        placeholder={placeholder ?? t("ACC_SELECT", "Select account")}
        popupTitle={popupTitle ?? t("ACC_SELECT", "Select account")}
        buttonHint={buttonHint ?? t("lblACC", "Open account list")}
      />
    )

  const createBankEditor = ({
    valueField,
    valueMode,
    bankIdField,
    bankCdField,
    placeholder,
    popupTitle,
    buttonHint,
  }: {
    valueField: ChitDetailLookupValueField
    valueMode?: "id" | "code"
    bankIdField?: string
    bankCdField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
  }) =>
    (cellInfo: ChitDetailEditCellInfo) => (
      <BankLookupCellEditor
        value={cellInfo.data?.[valueField] ?? null}
        rowData={cellInfo.data ?? {}}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(value) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, valueField, value)
        }}
        valueMode={valueMode ?? "id"}
        bankIdField={bankIdField ?? "BANK_ID"}
        bankCdField={bankCdField ?? valueField}
        bankNmField={undefined}
        accCdField={undefined}
        passbookNmField={undefined}
        accountNumField={undefined}
        citadCodeField={undefined}
        bankCdFieldCaption={t("BANK_CD", "Bank code")}
        bankNmFieldCaption={t("BANK_NM", "Bank name")}
        placeholder={placeholder ?? t("BANK_SELECT", "Select bank")}
        popupTitle={popupTitle ?? t("BANK_SELECT", "Select bank")}
        buttonHint={buttonHint ?? t("BANK_LOOKUP", "Open bank list")}
      />
    )

  const createDepartmentEditor = ({
    valueField,
    valueMode,
    departmentIdField,
    departmentCdField,
    placeholder,
    popupTitle,
    buttonHint,
  }: {
    valueField: ChitDetailLookupValueField
    valueMode?: "id" | "code"
    departmentIdField?: string
    departmentCdField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
  }) =>
    (cellInfo: ChitDetailEditCellInfo) => (
      <DepartmentLookupCellEditor
        value={cellInfo.data?.[valueField] ?? null}
        rowData={cellInfo.data ?? {}}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(value) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, valueField, value)
        }}
        valueMode={valueMode ?? "id"}
        departmentIdField={departmentIdField ?? "DEPARTMENT_ID"}
        departmentCdField={departmentCdField ?? valueField}
        departmentNmField={undefined}
        departmentCdFieldCaption={t("DEPARTMENT_CD", "Department code")}
        departmentNmFieldCaption={t("DEP_NAME_VIET", "Department name")}
        placeholder={placeholder ?? t("DEPARTMENT_SELECT", "Select department")}
        popupTitle={popupTitle ?? t("DEPARTMENT_SELECT", "Select department")}
        buttonHint={buttonHint ?? t("DEPARTMENT_LOOKUP", "Open department list")}
      />
    )

  const createCurrencyEditor = ({
    valueField,
    currencyCdField,
    currencyNmField,
    symbolField,
    placeholder,
    popupTitle,
    buttonHint,
  }: {
    valueField: ChitDetailLookupValueField
    currencyCdField?: string
    currencyNmField?: string
    symbolField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
  }) =>
    (cellInfo: ChitDetailEditCellInfo) => (
      <CurrencyLookupCellEditor
        value={cellInfo.data?.[valueField] ?? null}
        rowData={cellInfo.data ?? {}}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(value) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, valueField, value)
        }}
        currencyCdField={currencyCdField ?? valueField}
        currencyNmField={currencyNmField}
        symbolField={symbolField}
        currencyCdFieldCaption={t("CURRENCY_CD", "Currency code")}
        currencyNmFieldCaption={t("CURRENCY_NM", "Currency name")}
        placeholder={placeholder ?? t("CURRENCY_SELECT", "Select currency")}
        popupTitle={popupTitle ?? t("CURRENCY_SELECT", "Select currency")}
        buttonHint={buttonHint ?? t("CURRENCY_LOOKUP", "Open currency list")}
      />
    )

  return {
    t,
    createAccEditor,
    createBankEditor,
    createCurrencyEditor,
    createDepartmentEditor,
    renderCustomerEditor,
  }
}

function useDecimalColumnFormats() {
  const [cacheVersion, setCacheVersion] = useState(0)
  const [formatVersion, setFormatVersion] = useState(0)
  const [formatMap, setFormatMap] = useState<Record<string, LocalizationFormat>>({})
  const [rules, setRules] = useState<DecimalSettingRule[]>([])

  useEffect(() => {
    let active = true

    const loadSettings = async () => {
      try {
        const loadedRules = await loadDecimalSettings()
        if (!active) {
          return
        }

        const nextMap: Record<string, LocalizationFormat> = {}
        loadedRules.forEach((rule) => {
          const format = buildDecimalFormat(rule)
          if (format) {
            nextMap[rule.FIELD_NAME.toUpperCase()] = format
          }
        })

        setRules(loadedRules)
        setFormatMap(nextMap)
        setFormatVersion((current) => current + 1)
      } catch (error) {
        console.error("Failed to load decimal settings", error)
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [cacheVersion])

  useEffect(() => {
    const unsubscribe = subscribeDecimalSettingUpdates(() => {
      setCacheVersion((current) => current + 1)
    })

    return unsubscribe
  }, [])

  return { formatMap, rules, formatVersion }
}

function getDecimalFormat(
  formatMap: Record<string, LocalizationFormat>,
  rules: DecimalSettingRule[],
  fieldName: string,
  fallback: LocalizationFormat,
): LocalizationFormat {
  const normalized = String(fieldName ?? "").trim().toUpperCase()
  if (!normalized) {
    return fallback
  }

  const exact = formatMap[normalized]
  if (exact) {
    return exact
  }

  const resolved = resolveDecimalSetting(rules, normalized)
  if (resolved) {
    return buildDecimalFormat(resolved)
  }

  return fallback
}

function DetailMetaColumns({
  onSoftDeleteRow,
  onOpenInventoryRow,
  t,
}: {
  onSoftDeleteRow?: (rowKey: string | null) => void
  onOpenInventoryRow?: (rowKey: string | null) => void
  t: (key: string, fallback: string) => string
}) {
  const resolveRowKey = (event: ColumnButtonClickEvent<ChitDetail, string | number>) => {
    const key = event.row?.key
    return key != null ? String(key) : null
  }
  const hasInventoryAction = typeof onOpenInventoryRow === "function"

  return (
    <>
      <Column
        name="DETAIL_ACTIONS"
        type="buttons"
        width={hasInventoryAction ? 110 : 60}
        fixed={true}
        fixedPosition="left"
        visibleIndex={0}
        allowFixing={false}
        showInColumnChooser={false}
      >
        {hasInventoryAction ? (
          <GridButton
            icon="box"
            hint={t("WAREHOUSE", "Kho")}
            onClick={(event: ColumnButtonClickEvent<ChitDetail, string | number>) => {
              const rowKey = resolveRowKey(event)
              onOpenInventoryRow?.(rowKey)
            }}
          />
        ) : null}
        <GridButton
          icon="trash"
          hint={t("DELETE", "Delete")}
          onClick={(event: ColumnButtonClickEvent<ChitDetail, string | number>) => {
            const rowKey = resolveRowKey(event)
            onSoftDeleteRow?.(rowKey)
          }}
        />
      </Column>
      <Column dataField="CHIT_ID" visible={false} showInColumnChooser={false} allowHiding={false} />
      <Column dataField="CHITDETAIL_ID" visible={false} showInColumnChooser={false} allowHiding={false} />
      <Column dataField="CHITDETAIL_CD" visible={false} />
      <Column dataField="CHIT_YMD" visible={false} />
      <Column dataField="BANK_ID" visible={false} showInColumnChooser={false} allowHiding={false} />
      <Column dataField="CUSTOMER_ID" visible={false} showInColumnChooser={false} allowHiding={false} />
      <Column dataField="DEPARTMENT_ID" visible={false} showInColumnChooser={false} allowHiding={false} />
    </>
  )
}

function CustomerColumns({
  renderCustomerEditor,
  t,
}: {
  renderCustomerEditor: (cellInfo: ChitDetailEditCellInfo) => JSX.Element
  t: (key: string, fallback: string) => string
}) {
  return (
    <>
      <Column
        dataField="CUSTOMER_CD"
        caption={t("CUSTOMER_CD", "Customer")}
        editCellRender={renderCustomerEditor}
      />
      <Column
        dataField="CUSTOMER_NM_VIET"
        caption={t("CUSTOMER_NM", "Customer name")}
        allowEditing={false}
      />
    </>
  )
}

function AccountingColumns({
  createAccEditor,
  t,
}: {
  createAccEditor: VoucherDetailEditors["createAccEditor"]
  t: (key: string, fallback: string) => string
}) {
  return (
    <>
      <Column
        dataField="DEBIT"
        caption={t("DEBIT", "Debit account")}
        editCellRender={createAccEditor({
          valueField: "DEBIT",
          nameField: "DEBIT_NM_VIET",
          idField: "ACC_ID",
        })}
      />
      <Column
        dataField="DEBIT_NM_VIET"
        caption={t("ACC_NM_DEBIT", "Debit account name")}
        allowEditing={false}
      />
      <Column
        dataField="CREDIT"
        caption={t("CREDIT", "Credit account")}
        editCellRender={createAccEditor({
          valueField: "CREDIT",
          nameField: "CREDIT_NM_VIET",
          idField: "ACC_ID",
        })}
      />
      <Column
        dataField="CREDIT_NM_VIET"
        caption={t("ACC_NM_CREDIT", "Credit account name")}
        allowEditing={false}
      />
    </>
  )
}

export function CashVoucherDetailColumns({ onSoftDeleteRow, onOpenInventoryRow }: VoucherDetailColumnsProps) {
  const { t, createAccEditor, createCurrencyEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { formatMap, rules, formatVersion } = useDecimalColumnFormats()

  return (
    <Fragment key={formatVersion}>
      <DetailMetaColumns onSoftDeleteRow={onSoftDeleteRow} onOpenInventoryRow={onOpenInventoryRow} t={t} />
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "AMOUNT", "#,##0.00")}
      />
      <Column
        dataField="FC_TYPE"
        caption={t("FC_TYPE", "Currency")}
        editCellRender={createCurrencyEditor({ valueField: "FC_TYPE" })}
      />
      <Column
        dataField="FC_RATE"
        caption={t("FC_RATE", "Exchange rate")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "FC_RATE", "#,##0.000000")}
      />
      <Column dataField="DETAIL_DESCRIPTION_VIET" caption={t("DESCRIPTION2", "Description")} />
    </Fragment>
  )
}

export function BankVoucherDetailColumns({ onSoftDeleteRow, onOpenInventoryRow }: VoucherDetailColumnsProps) {
  const { t, createAccEditor, createBankEditor, createCurrencyEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { formatMap, rules, formatVersion } = useDecimalColumnFormats()

  return (
    <Fragment key={formatVersion}>
      <DetailMetaColumns onSoftDeleteRow={onSoftDeleteRow} onOpenInventoryRow={onOpenInventoryRow} t={t} />
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <Column
        dataField="BANK_CD"
        caption={t("BANK_CD", "Bank")}
        editCellRender={createBankEditor({
          valueField: "BANK_ID",
          valueMode: "id",
          bankIdField: "BANK_ID",
          bankCdField: "BANK_CD",
          placeholder: t("BANK_SELECT", "Select bank"),
          popupTitle: t("BANK_SELECT", "Select bank"),
          buttonHint: t("BANK_LOOKUP", "Open bank list"),
        })}
      />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "AMOUNT", "#,##0.00")}
      />
      <Column
        dataField="FC_TYPE"
        caption={t("FC_TYPE", "Currency")}
        editCellRender={createCurrencyEditor({ valueField: "FC_TYPE" })}
      />
      <Column
        dataField="FC_RATE"
        caption={t("FC_RATE", "Exchange rate")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "FC_RATE", "#,##0.000000")}
      />
      <Column dataField="DETAIL_DESCRIPTION_VIET" caption={t("DESCRIPTION2", "Bank description")} />
    </Fragment>
  )
}

export function PurchaseVoucherDetailColumns({ onSoftDeleteRow, onOpenInventoryRow }: VoucherDetailColumnsProps) {
  const { t, createAccEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { formatMap, rules, formatVersion } = useDecimalColumnFormats()

  return (
    <Fragment key={formatVersion}>
      <DetailMetaColumns onSoftDeleteRow={onSoftDeleteRow} onOpenInventoryRow={onOpenInventoryRow} t={t} />
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "AMOUNT", "#,##0.00")}
      />
      <Column
        dataField="VAT_AMOUNT"
        caption={t("VAT_AMOUNT", "VAT amount")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "VAT_AMOUNT", "#,##0.00")}
      />
      <Column dataField="VAT_CHIT_NO" caption={t("VAT_CHIT_NO", "Invoice no")} />
      <Column dataField="DETAIL_DESCRIPTION_VIET" caption={t("DESCRIPTION2", "Purchase description")} />
    </Fragment>
  )
}

export function PurchaseServiceVoucherDetailColumns({ onSoftDeleteRow, onOpenInventoryRow }: VoucherDetailColumnsProps) {
  const { t, createAccEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { formatMap, rules, formatVersion } = useDecimalColumnFormats()

  return (
    <Fragment key={formatVersion}>
      <DetailMetaColumns onSoftDeleteRow={onSoftDeleteRow} onOpenInventoryRow={onOpenInventoryRow} t={t} />
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "AMOUNT", "#,##0.00")}
      />
      <Column
        dataField="VAT_AMOUNT"
        caption={t("VAT_AMOUNT", "VAT amount")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "VAT_AMOUNT", "#,##0.00")}
      />
      <Column dataField="VAT_CHIT_NO" caption={t("VAT_CHIT_NO", "Service invoice no")} />
      <Column dataField="DETAIL_DESCRIPTION_VIET" caption={t("DESCRIPTION2", "Service description")} />
    </Fragment>
  )
}

export function SalesVoucherDetailColumns({ onSoftDeleteRow, onOpenInventoryRow }: VoucherDetailColumnsProps) {
  const { t, createAccEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { formatMap, rules, formatVersion } = useDecimalColumnFormats()

  return (
    <Fragment key={formatVersion}>
      <DetailMetaColumns onSoftDeleteRow={onSoftDeleteRow} onOpenInventoryRow={onOpenInventoryRow} t={t} />
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "AMOUNT", "#,##0.00")}
      />
      <Column
        dataField="VAT_AMOUNT"
        caption={t("VAT_AMOUNT", "VAT amount")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "VAT_AMOUNT", "#,##0.00")}
      />
      <Column dataField="VAT_CHIT_NO" caption={t("VAT_CHIT_NO", "Sales invoice no")} />
      <Column dataField="DETAIL_DESCRIPTION_VIET" caption={t("DESCRIPTION2", "Sales description")} />
    </Fragment>
  )
}

export function OffsetVoucherDetailColumns({ onSoftDeleteRow, onOpenInventoryRow }: VoucherDetailColumnsProps) {
  const { t, createAccEditor, createCurrencyEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { formatMap, rules, formatVersion } = useDecimalColumnFormats()

  return (
    <Fragment key={formatVersion}>
      <DetailMetaColumns onSoftDeleteRow={onSoftDeleteRow} onOpenInventoryRow={onOpenInventoryRow} t={t} />
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <Column dataField="MR_CD" caption={t("MR_CD", "Offset code 1")} />
      <Column dataField="MR_CD2" caption={t("MR_CD2", "Offset code 2")} />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "AMOUNT", "#,##0.00")}
      />
      <Column
        dataField="FC_TYPE"
        caption={t("FC_TYPE", "Currency")}
        editCellRender={createCurrencyEditor({ valueField: "FC_TYPE" })}
      />
      <Column
        dataField="FC_RATE"
        caption={t("FC_RATE", "Exchange rate")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "FC_RATE", "#,##0.000000")}
      />
      <Column dataField="DETAIL_DESCRIPTION_VIET" caption={t("DESCRIPTION2", "Offset description")} />
    </Fragment>
  )
}

export function OtherVoucherDetailColumns({ onSoftDeleteRow, onOpenInventoryRow }: VoucherDetailColumnsProps) {
  const { t, createAccEditor, createCurrencyEditor, createDepartmentEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { formatMap, rules, formatVersion } = useDecimalColumnFormats()

  return (
    <Fragment key={formatVersion}>
      <DetailMetaColumns onSoftDeleteRow={onSoftDeleteRow} onOpenInventoryRow={onOpenInventoryRow} t={t} />
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <Column dataField="MG_CD" caption={t("MG_CD", "Management code")} />
      <Column
        dataField="DEPARTMENT_CD"
        caption={t("DEPARTMENT_CD", "Department")}
        editCellRender={createDepartmentEditor({
          valueField: "DEPARTMENT_ID",
          valueMode: "id",
          departmentIdField: "DEPARTMENT_ID",
          departmentCdField: "DEPARTMENT_CD",
          placeholder: t("DEPARTMENT_SELECT", "Select department"),
          popupTitle: t("DEPARTMENT_SELECT", "Select department"),
          buttonHint: t("DEPARTMENT_LOOKUP", "Open department list"),
        })}
      />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "AMOUNT", "#,##0.00")}
      />
      <Column
        dataField="FC_TYPE"
        caption={t("FC_TYPE", "Currency")}
        editCellRender={createCurrencyEditor({ valueField: "FC_TYPE" })}
      />
      <Column
        dataField="FC_RATE"
        caption={t("FC_RATE", "Exchange rate")}
        dataType="number"
        format={getDecimalFormat(formatMap, rules, "FC_RATE", "#,##0.000000")}
      />
      <Column dataField="DETAIL_DESCRIPTION_VIET" caption={t("DESCRIPTION2", "Description")} />
    </Fragment>
  )
}

const detailColumnsMap: Record<ChitType, VoucherDetailColumnsComponent> = {
  RC: CashVoucherDetailColumns,
  PM: CashVoucherDetailColumns,
  DN: BankVoucherDetailColumns,
  CN: BankVoucherDetailColumns,
  PO: PurchaseVoucherDetailColumns,
  IR: PurchaseVoucherDetailColumns,
  PS: PurchaseServiceVoucherDetailColumns,
  SO: SalesVoucherDetailColumns,
  IO: SalesVoucherDetailColumns,
  CO: OffsetVoucherDetailColumns,
  OT: OtherVoucherDetailColumns,
}

export function getVoucherDetailColumnsComponent(chitType: ChitType): VoucherDetailColumnsComponent {
  return detailColumnsMap[chitType]
}
