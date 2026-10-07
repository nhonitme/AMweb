import { Fragment, useContext, type ComponentType } from "react"

import { Column } from "devextreme-react/data-grid"
import type { ColumnCellTemplateData, ColumnEditCellTemplateData } from "devextreme/ui/data_grid"

import AcclistLookupCellEditor from "@/components/lookup/AccountLookupCellEditor"
import { getAcclistLookupStore } from "@/components/lookup/AcclistLookupStore"
import BankLookupCellEditor from "@/components/lookup/BankLookupCellEditor"
import CurrencyLookupCellEditor from "@/components/lookup/CurrencyLookupCellEditor"
import CustomerLookupCellEditor from "@/components/lookup/CustomerLookupCellEditor"
import DepartmentLookupCellEditor from "@/components/lookup/DepartmentLookupCellEditor"
import { LookupGridCellEditor, consumeLookupCellOpen, type LookupOpenMode } from "@/components/lookup/LookupGridCellDisplay"
import { customerLookupStore } from "@/components/lookup/customerLookupStore"
import { isLangFieldVisible, pickLocalizedText, useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import type { ChitDetail, ChitType } from "@/types/voucher"
import { getCurrentDataLanguageSuffix } from "@/utils/language"
import { useDecimalColumnFormats, type DecimalColumnFormat } from "@/hooks/useDecimalColumnFormats"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"

export interface VoucherDetailColumnsProps {
  onCurrencyValueChanged?: (value: unknown) => void
  foreignCurrencyColumnsVisible?: boolean
}

type VoucherDetailColumnsComponent = ComponentType<VoucherDetailColumnsProps>

type ChitDetailCellInfo = ColumnCellTemplateData<ChitDetail, string | number>
type ChitDetailEditCellInfo = ColumnEditCellTemplateData<ChitDetail, string | number>

const detailDescriptionFields = [
  { field: "DETAIL_DESCRIPTION_VIET", labelKey: "DESCRIPTION_VIET", fallback: "Diễn giải (VI)" },
  { field: "DETAIL_DESCRIPTION_ENG", labelKey: "DESCRIPTION_ENG", fallback: "Diễn giải (EN)" },
  { field: "DETAIL_DESCRIPTION_KOR", labelKey: "DESCRIPTION_KOR", fallback: "Diễn giải (KO)" },
] as const

function DetailDescriptionColumns({
  t,
  caption,
}: {
  t: (key: string, fallback: string) => string
  caption: string
}) {
  useCompanyLangRevision()
  const fields = detailDescriptionFields.filter((item) => isLangFieldVisible(item.field))
  if (fields.length === 0) {
    return null
  }

  return (
    <>
      {fields.map((item) => (
        <Column
          key={item.field}
          dataField={item.field}
          caption={fields.length === 1 ? caption : t(item.labelKey, item.fallback)}
        />
      ))}
    </>
  )
}

type ChitDetailLookupValueField = {
  [K in keyof ChitDetail]: ChitDetail[K] extends string | number | null | undefined ? K : never
}[keyof ChitDetail]

type ChitDetailStringValueField = {
  [K in keyof ChitDetail]: ChitDetail[K] extends string | null | undefined ? K : never
}[keyof ChitDetail]

interface VoucherDetailEditors {
  t: (key: string, fallback: string) => string
  renderCustomerEditor: (cellInfo: ChitDetailEditCellInfo, autoOpen?: LookupOpenMode | null) => JSX.Element
  createAccEditor: (config: {
    valueField: ChitDetailStringValueField
    nameField: ChitDetailStringValueField
    idField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
    editMode?: "code" | "name"
  }) => (cellInfo: ChitDetailEditCellInfo, autoOpen?: LookupOpenMode | null) => JSX.Element
  createBankEditor: (config: {
    valueField: ChitDetailLookupValueField
    valueMode?: "id" | "code"
    bankIdField?: string
    bankCdField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
  }) => (cellInfo: ChitDetailEditCellInfo, autoOpen?: LookupOpenMode | null) => JSX.Element
  createDepartmentEditor: (config: {
    valueField: ChitDetailLookupValueField
    valueMode?: "id" | "code"
    departmentIdField?: string
    departmentCdField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
  }) => (cellInfo: ChitDetailEditCellInfo, autoOpen?: LookupOpenMode | null) => JSX.Element
  createCurrencyEditor: (config: {
    valueField: ChitDetailLookupValueField
    currencyCdField?: string
    currencyNmField?: string
    symbolField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
    onValueChanged?: (cellInfo: ChitDetailEditCellInfo, value: string | number | null) => void
  }) => (cellInfo: ChitDetailEditCellInfo, autoOpen?: LookupOpenMode | null) => JSX.Element
}

function useVoucherDetailEditors(): VoucherDetailEditors {
  const { translate } = useContext(LanguageContext)

  const t = (key: string, fallback: string) => translate(key, fallback)

  const renderCustomerEditor = (cellInfo: ChitDetailEditCellInfo, autoOpen?: LookupOpenMode | null) => (
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
      taxCdFieldCaption={t("TAX_CD", "Tax code")}
      addressFieldCaption={t("ADDRESS", "Address")}
      placeholder={t("CustomerSelect", "Select customer")}
      popupTitle={t("CustomerSelect", "Select customer")}
      buttonHint={t("LIST_CUSTOMER", "Open customer list")}
      autoOpen={autoOpen}
    />
  )

  const createAccEditor = ({
    valueField,
    nameField,
    idField,
    placeholder,
    popupTitle,
    buttonHint,
    editMode,
  }: {
    valueField: ChitDetailStringValueField
    nameField: ChitDetailStringValueField
    idField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
    editMode?: "code" | "name"
  }) =>
    (cellInfo: ChitDetailEditCellInfo, autoOpen?: LookupOpenMode | null) => (
      <AcclistLookupCellEditor
        dataSource={getAcclistLookupStore()}
        value={cellInfo.data?.[valueField] ?? null}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(value) => {
          cellInfo.component.cellValue(
            cellInfo.row.rowIndex,
            editMode === "name" ? nameField : valueField,
            value,
          )
        }}
        ValueField={valueField}
        NameField={nameField}
        IdField={idField}
        LookupCodeField="CD"
        LookupNameField={`NM_${getCurrentDataLanguageSuffix()}`}
        placeholder={placeholder ?? t("ACC_SELECT", "Select account")}
        popupTitle={popupTitle ?? t("ACC_SELECT", "Select account")}
        buttonHint={buttonHint ?? t("lblACC", "Open account list")}
        autoOpen={autoOpen}
        editMode={editMode}
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
    (cellInfo: ChitDetailEditCellInfo, autoOpen?: LookupOpenMode | null) => (
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
        placeholder={placeholder ?? t("BANK_SELECT", "Select bank")}
        popupTitle={popupTitle ?? t("BANK_SELECT", "Select bank")}
        buttonHint={buttonHint ?? t("BANK_LOOKUP", "Open bank list")}
        autoOpen={autoOpen}
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
    (cellInfo: ChitDetailEditCellInfo, autoOpen?: LookupOpenMode | null) => (
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
        placeholder={placeholder ?? t("DEPARTMENT_SELECT", "Select department")}
        popupTitle={popupTitle ?? t("DEPARTMENT_SELECT", "Select department")}
        buttonHint={buttonHint ?? t("DEPARTMENT_LOOKUP", "Open department list")}
        autoOpen={autoOpen}
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
    onValueChanged,
  }: {
    valueField: ChitDetailLookupValueField
    currencyCdField?: string
    currencyNmField?: string
    symbolField?: string
    placeholder?: string
    popupTitle?: string
    buttonHint?: string
    onValueChanged?: (cellInfo: ChitDetailEditCellInfo, value: string | number | null) => void
  }) =>
    (cellInfo: ChitDetailEditCellInfo, autoOpen?: LookupOpenMode | null) => (
      <CurrencyLookupCellEditor
        value={cellInfo.data?.[valueField] ?? null}
        rowData={cellInfo.data ?? {}}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(value) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, valueField, value)
          onValueChanged?.(cellInfo, value)
        }}
        currencyCdField={currencyCdField ?? valueField}
        currencyNmField={currencyNmField}
        symbolField={symbolField}
        currencyCdFieldCaption={t("CURRENCY_CD", "Currency code")}
        currencyNmFieldCaption={t("CURRENCY_NM", "Currency name")}
        placeholder={placeholder ?? t("CURRENCY_SELECT", "Select currency")}
        popupTitle={popupTitle ?? t("CURRENCY_SELECT", "Select currency")}
        buttonHint={buttonHint ?? t("CURRENCY_LOOKUP", "Open currency list")}
        autoOpen={autoOpen}
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

function renderLookupCell(dataField: string) {
  return (cellInfo: ChitDetailCellInfo) => (
    <LookupGridCellEditor mode="display" cellInfo={cellInfo} dataField={dataField} />
  )
}

function consumeLookupAutoOpen(cellInfo: ChitDetailEditCellInfo, dataField: string) {
  return consumeLookupCellOpen(cellInfo, dataField)
}

function renderLookupEditor(children: JSX.Element) {
  return <LookupGridCellEditor mode="edit">{children}</LookupGridCellEditor>
}

function CustomerColumns({
  renderCustomerEditor,
  t,
}: {
  renderCustomerEditor: (cellInfo: ChitDetailEditCellInfo, autoOpen?: LookupOpenMode | null) => JSX.Element
  t: (key: string, fallback: string) => string
}) {
  const dataField = "CUSTOMER_CD"

  return (
    <>
      <Column
        dataField={dataField}
        caption={t("CUSTOMER_CD", "Customer")}
        cssClass="am-grid-lookup-column-cell"
        cellRender={renderLookupCell(dataField)}
        editCellRender={(cellInfo: ChitDetailEditCellInfo) =>
          renderLookupEditor(renderCustomerEditor(cellInfo, consumeLookupAutoOpen(cellInfo, dataField)))
        }
      />
      <Column
        dataField="CUSTOMER_NM_VIET"
        caption={t("CUSTOMER_NM", "Customer name")}
        allowEditing={false}
        calculateCellValue={(row) => pickLocalizedText(row, "CUSTOMER_NM")}
      />
    </>
  )
}

function AccountingColumns({
  createAccEditor,
  t,
  allowNameLookup = true,
}: {
  createAccEditor: VoucherDetailEditors["createAccEditor"]
  t: (key: string, fallback: string) => string
  allowNameLookup?: boolean
}) {
  const debitField = "DEBIT"
  const creditField = "CREDIT"
  const debitNameField = "DEBIT_NM_VIET"
  const creditNameField = "CREDIT_NM_VIET"
  const debitEditor = createAccEditor({
    valueField: debitField,
    nameField: debitNameField,
    idField: "ACC_ID",
  })
  const creditEditor = createAccEditor({
    valueField: creditField,
    nameField: creditNameField,
    idField: "ACC_ID",
  })
  const debitNameEditor = createAccEditor({
    valueField: debitField,
    nameField: debitNameField,
    idField: "ACC_ID",
    editMode: "name",
  })
  const creditNameEditor = createAccEditor({
    valueField: creditField,
    nameField: creditNameField,
    idField: "ACC_ID",
    editMode: "name",
  })

  return (
    <>
      <Column
        dataField={debitField}
        caption={t("DEBIT", "TK Nợ")}
        cssClass="am-grid-lookup-column-cell"
        cellRender={renderLookupCell(debitField)}
        editCellRender={(cellInfo: ChitDetailEditCellInfo) =>
          renderLookupEditor(debitEditor(cellInfo, consumeLookupAutoOpen(cellInfo, debitField)))
        }
      />
      <Column
        dataField={debitNameField}
        caption={t("ACC_NM_DEBIT", "Tên TK Nợ")}
        allowEditing={allowNameLookup}
        cssClass={allowNameLookup ? "am-grid-lookup-column-cell" : undefined}
        cellRender={allowNameLookup ? renderLookupCell(debitNameField) : undefined}
        editCellRender={allowNameLookup
          ? (cellInfo: ChitDetailEditCellInfo) =>
              renderLookupEditor(debitNameEditor(cellInfo, consumeLookupAutoOpen(cellInfo, debitNameField)))
          : undefined}
      />
      <Column
        dataField={creditField}
        caption={t("CREDIT", "TK Có")}
        cssClass="am-grid-lookup-column-cell"
        cellRender={renderLookupCell(creditField)}
        editCellRender={(cellInfo: ChitDetailEditCellInfo) =>
          renderLookupEditor(creditEditor(cellInfo, consumeLookupAutoOpen(cellInfo, creditField)))
        }
      />
      <Column
        dataField={creditNameField}
        caption={t("ACC_NM_CREDIT", "Tên TK Có")}
        allowEditing={allowNameLookup}
        cssClass={allowNameLookup ? "am-grid-lookup-column-cell" : undefined}
        cellRender={allowNameLookup ? renderLookupCell(creditNameField) : undefined}
        editCellRender={allowNameLookup
          ? (cellInfo: ChitDetailEditCellInfo) =>
              renderLookupEditor(creditNameEditor(cellInfo, consumeLookupAutoOpen(cellInfo, creditNameField)))
          : undefined}
      />
    </>
  )
}

function CurrencyColumn({
  createCurrencyEditor,
  onCurrencyValueChanged,
  t,
}: {
  createCurrencyEditor: VoucherDetailEditors["createCurrencyEditor"]
  onCurrencyValueChanged?: (value: unknown) => void
  t: (key: string, fallback: string) => string
}) {
  const dataField = "FC_TYPE"
  const editor = createCurrencyEditor({
    valueField: dataField,
    onValueChanged: (_cellInfo, value) => onCurrencyValueChanged?.(value),
  })

  return (
    <Column
      dataField={dataField}
      caption={t("FC_TYPE", "Currency")}
      cssClass="am-grid-lookup-column-cell"
      cellRender={renderLookupCell(dataField)}
      editCellRender={(cellInfo: ChitDetailEditCellInfo) =>
        renderLookupEditor(editor(cellInfo, consumeLookupAutoOpen(cellInfo, dataField)))
      }
    />
  )
}

function ForeignCurrencyAmountColumns({
  t,
  getFormat,
  visible,
}: {
  t: (key: string, fallback: string) => string
  getFormat: (fieldName: string, fallbackFormat?: DecimalColumnFormat) => DecimalColumnFormat
  visible: boolean
}) {
  return (
    <>
      <Column
        dataField="FC_AMOUNT"
        caption={t("FC_AMOUNT", "Foreign amount")}
        dataType="number"
        format={getFormat("FC_AMOUNT", "#,##0.00")}
        editorOptions={createNumberEditorOptions(getFormat("FC_AMOUNT", "#,##0.00"))}
        visible={visible}
      />
      <Column
        dataField="FC_RATE"
        caption={t("FC_RATE", "Exchange rate")}
        dataType="number"
        format={getFormat("FC_RATE", "#,##0.000000")}
        editorOptions={createNumberEditorOptions(getFormat("FC_RATE", "#,##0.000000"))}
        visible={visible}
      />
    </>
  )
}

export function CashVoucherDetailColumns({
  onCurrencyValueChanged,
  foreignCurrencyColumnsVisible = false,
}: VoucherDetailColumnsProps) {
  const { t, createAccEditor, createCurrencyEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { getFormat, formatVersion } = useDecimalColumnFormats()
  const amountFormat = getFormat("AMOUNT", "#,##0.00")

  return (
    <Fragment key={formatVersion}>
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={amountFormat}
        editorOptions={createNumberEditorOptions(amountFormat)}
        allowHiding={false}
      />
      <CurrencyColumn createCurrencyEditor={createCurrencyEditor} onCurrencyValueChanged={onCurrencyValueChanged} t={t} />
      <ForeignCurrencyAmountColumns t={t} getFormat={getFormat} visible={foreignCurrencyColumnsVisible} />
      <DetailDescriptionColumns t={t} caption={t("DESCRIPTION2", "Description")} />
    </Fragment>
  )
}

export function BankVoucherDetailColumns({
  onCurrencyValueChanged,
  foreignCurrencyColumnsVisible = false,
}: VoucherDetailColumnsProps) {
  const { t, createAccEditor, createBankEditor, createCurrencyEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { getFormat, formatVersion } = useDecimalColumnFormats()
  const bankField = "BANK_CD"
  const bankEditor = createBankEditor({
    valueField: "BANK_ID",
    valueMode: "id",
    bankIdField: "BANK_ID",
    bankCdField: bankField,
    placeholder: t("BANK_SELECT", "Select bank"),
    popupTitle: t("BANK_SELECT", "Select bank"),
    buttonHint: t("BANK_LOOKUP", "Open bank list"),
  })

  return (
    <Fragment key={formatVersion}>
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <Column
        dataField={bankField}
        caption={t("BANK_CD", "Bank")}
        cssClass="am-grid-lookup-column-cell"
        cellRender={renderLookupCell(bankField)}
        editCellRender={(cellInfo: ChitDetailEditCellInfo) =>
          renderLookupEditor(bankEditor(cellInfo, consumeLookupAutoOpen(cellInfo, bankField)))
        }
      />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getFormat("AMOUNT", "#,##0.00")}
        editorOptions={createNumberEditorOptions(getFormat("AMOUNT", "#,##0.00"))}
        allowHiding={false}
      />
      <CurrencyColumn createCurrencyEditor={createCurrencyEditor} onCurrencyValueChanged={onCurrencyValueChanged} t={t} />
      <ForeignCurrencyAmountColumns t={t} getFormat={getFormat} visible={foreignCurrencyColumnsVisible} />
      <DetailDescriptionColumns t={t} caption={t("DESCRIPTION2", "Bank description")} />
    </Fragment>
  )
}

export function PurchaseVoucherDetailColumns() {
  const { t, createAccEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { getFormat, formatVersion } = useDecimalColumnFormats()

  return (
    <Fragment key={formatVersion}>
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <AccountingColumns createAccEditor={createAccEditor} t={t} allowNameLookup />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getFormat("AMOUNT", "#,##0.00")}
        editorOptions={createNumberEditorOptions(getFormat("AMOUNT", "#,##0.00"))}
        allowHiding={false}
      />
      <Column
        dataField="VAT_AMOUNT"
        caption={t("VAT_AMOUNT", "VAT amount")}
        dataType="number"
        format={getFormat("VAT_AMOUNT", "#,##0.00")}
        editorOptions={createNumberEditorOptions(getFormat("VAT_AMOUNT", "#,##0.00"))}
      />
      <Column dataField="VAT_CHIT_NO" caption={t("VAT_CHIT_NO", "Invoice no")} />
      <DetailDescriptionColumns t={t} caption={t("DESCRIPTION2", "Purchase description")} />
    </Fragment>
  )
}

export function PurchaseServiceVoucherDetailColumns() {
  const { t, createAccEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { getFormat, formatVersion } = useDecimalColumnFormats()

  return (
    <Fragment key={formatVersion}>
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getFormat("AMOUNT", "#,##0.00")}
        editorOptions={createNumberEditorOptions(getFormat("AMOUNT", "#,##0.00"))}
        allowHiding={false}
      />
      <Column
        dataField="VAT_AMOUNT"
        caption={t("VAT_AMOUNT", "VAT amount")}
        dataType="number"
        format={getFormat("VAT_AMOUNT", "#,##0.00")}
        editorOptions={createNumberEditorOptions(getFormat("VAT_AMOUNT", "#,##0.00"))}
      />
      <Column dataField="VAT_CHIT_NO" caption={t("VAT_CHIT_NO", "Service invoice no")} />
      <DetailDescriptionColumns t={t} caption={t("DESCRIPTION2", "Service description")} />
    </Fragment>
  )
}

export function SalesVoucherDetailColumns() {
  const { t, createAccEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { getFormat, formatVersion } = useDecimalColumnFormats()

  return (
    <Fragment key={formatVersion}>
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getFormat("AMOUNT", "#,##0.00")}
        editorOptions={createNumberEditorOptions(getFormat("AMOUNT", "#,##0.00"))}
        allowHiding={false}
      />
      <Column
        dataField="VAT_AMOUNT"
        caption={t("VAT_AMOUNT", "VAT amount")}
        dataType="number"
        format={getFormat("VAT_AMOUNT", "#,##0.00")}
        editorOptions={createNumberEditorOptions(getFormat("VAT_AMOUNT", "#,##0.00"))}
      />
      <Column dataField="VAT_CHIT_NO" caption={t("VAT_CHIT_NO", "Sales invoice no")} />
      <DetailDescriptionColumns t={t} caption={t("DESCRIPTION2", "Sales description")} />
    </Fragment>
  )
}

export function OffsetVoucherDetailColumns({
  onCurrencyValueChanged,
  foreignCurrencyColumnsVisible = false,
}: VoucherDetailColumnsProps) {
  const { t, createAccEditor, createCurrencyEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { getFormat, formatVersion } = useDecimalColumnFormats()

  return (
    <Fragment key={formatVersion}>
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <Column dataField="MR_CD" caption={t("MR_CD", "Offset code 1")} />
      <Column dataField="MR_CD2" caption={t("MR_CD2", "Offset code 2")} />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getFormat("AMOUNT", "#,##0.00")}
        editorOptions={createNumberEditorOptions(getFormat("AMOUNT", "#,##0.00"))}
        allowHiding={false}
      />
      <CurrencyColumn createCurrencyEditor={createCurrencyEditor} onCurrencyValueChanged={onCurrencyValueChanged} t={t} />
      <ForeignCurrencyAmountColumns t={t} getFormat={getFormat} visible={foreignCurrencyColumnsVisible} />
      <DetailDescriptionColumns t={t} caption={t("DESCRIPTION2", "Offset description")} />
    </Fragment>
  )
}

export function OtherVoucherDetailColumns({
  onCurrencyValueChanged,
  foreignCurrencyColumnsVisible = false,
}: VoucherDetailColumnsProps) {
  const { t, createAccEditor, createCurrencyEditor, createDepartmentEditor, renderCustomerEditor } = useVoucherDetailEditors()
  const { getFormat, formatVersion } = useDecimalColumnFormats()
  const departmentField = "DEPARTMENT_CD"
  const departmentEditor = createDepartmentEditor({
    valueField: "DEPARTMENT_ID",
    valueMode: "id",
    departmentIdField: "DEPARTMENT_ID",
    departmentCdField: departmentField,
    placeholder: t("DEPARTMENT_SELECT", "Select department"),
    popupTitle: t("DEPARTMENT_SELECT", "Select department"),
    buttonHint: t("DEPARTMENT_LOOKUP", "Open department list"),
  })

  return (
    <Fragment key={formatVersion}>
      <CustomerColumns renderCustomerEditor={renderCustomerEditor} t={t} />
      <Column dataField="MG_CD" caption={t("MG_CD", "Management code")} />
      <Column
        dataField={departmentField}
        caption={t("DEPARTMENT_CD", "Department")}
        cssClass="am-grid-lookup-column-cell"
        cellRender={renderLookupCell(departmentField)}
        editCellRender={(cellInfo: ChitDetailEditCellInfo) =>
          renderLookupEditor(departmentEditor(cellInfo, consumeLookupAutoOpen(cellInfo, departmentField)))
        }
      />
      <AccountingColumns createAccEditor={createAccEditor} t={t} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "Amount")}
        dataType="number"
        format={getFormat("AMOUNT", "#,##0.00")}
        editorOptions={createNumberEditorOptions(getFormat("AMOUNT", "#,##0.00"))}
        allowHiding={false}
      />
      <CurrencyColumn createCurrencyEditor={createCurrencyEditor} onCurrencyValueChanged={onCurrencyValueChanged} t={t} />
      <ForeignCurrencyAmountColumns t={t} getFormat={getFormat} visible={foreignCurrencyColumnsVisible} />
      <DetailDescriptionColumns t={t} caption={t("DESCRIPTION2", "Description")} />
    </Fragment>
  )
}

const InventoryVoucherDetailColumns: VoucherDetailColumnsComponent = () => null

const detailColumnsMap: Record<ChitType, VoucherDetailColumnsComponent> = {
  RC: CashVoucherDetailColumns,
  PM: CashVoucherDetailColumns,
  DN: BankVoucherDetailColumns,
  CN: BankVoucherDetailColumns,
  PO: PurchaseVoucherDetailColumns,
  IR: InventoryVoucherDetailColumns,
  IA: InventoryVoucherDetailColumns,
  PS: PurchaseServiceVoucherDetailColumns,
  PD: PurchaseServiceVoucherDetailColumns,
  PR: PurchaseServiceVoucherDetailColumns,
  SO: SalesVoucherDetailColumns,
  SD: SalesVoucherDetailColumns,
  SR: SalesVoucherDetailColumns,
  IO: InventoryVoucherDetailColumns,
  CO: OffsetVoucherDetailColumns,
  OT: OtherVoucherDetailColumns,
}

export function getVoucherDetailColumnsComponent(chitType: ChitType): VoucherDetailColumnsComponent {
  return detailColumnsMap[chitType]
}
