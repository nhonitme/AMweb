import { memo, useMemo, type ReactNode } from "react"

import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import NumberBox from "devextreme-react/number-box"
import SelectBox from "devextreme-react/select-box"
import TextArea from "devextreme-react/text-area"
import TextBox from "devextreme-react/text-box"

import type { CashflowFormulaOptionRow } from "@/api/reportFormulaOptionApi"

import {
  buildFormulaDisplay,
  buildSignedAccountRule,
  isUserValueChange,
  isVatFormulaMethod,
  isVatHeaderRow,
  normalizeText,
  parseSignedAccountRule,
  toPositiveInteger,
  type DataSourceOption,
  type FlowSignOption,
  type TranslateFn,
} from "./formulaOptionsShared"

function CollapsibleSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <details className="rounded-md border border-slate-200 bg-slate-50/80">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </summary>
      <div className="space-y-2 border-t border-slate-200 px-3 py-2">
        {children}
      </div>
    </details>
  )
}

type FormulaDetailEditorProps = {
  selectedRow: CashflowFormulaOptionRow | null
  sortedRows: CashflowFormulaOptionRow[]
  isVatDeclaration: boolean
  isAccountRuleReport: boolean
  isCashflow: boolean
  isIndirect: boolean
  isProfitLoss: boolean
  canonicalReportCode: string
  dataSourceOptions: DataSourceOption[]
  elementTypeOptions: DataSourceOption[]
  calcMethodOptions: DataSourceOption[]
  vatCalcMethodOptions: DataSourceOption[]
  flowSignOptions: FlowSignOption[]
  saving: boolean
  t: TranslateFn
  updateSelectedRow: (updater: (current: CashflowFormulaOptionRow) => CashflowFormulaOptionRow) => void
  moveSelectedRow: (direction: -1 | 1) => void
  deleteSelectedRow: () => void
}

export const FormulaDetailEditor = memo(function FormulaDetailEditor({
  selectedRow,
  sortedRows,
  isVatDeclaration,
  isAccountRuleReport,
  isCashflow,
  isIndirect,
  isProfitLoss,
  canonicalReportCode,
  dataSourceOptions,
  elementTypeOptions,
  calcMethodOptions,
  vatCalcMethodOptions,
  flowSignOptions,
  saving,
  t,
  updateSelectedRow,
  moveSelectedRow,
  deleteSelectedRow,
}: FormulaDetailEditorProps) {
  const commitSelectedRow = (
    event: { event?: unknown },
    updater: (current: CashflowFormulaOptionRow) => CashflowFormulaOptionRow,
  ) => {
    if (!isUserValueChange(event)) {
      return
    }

    updateSelectedRow(updater)
  }

  const signedAccountRule = useMemo(
    () => parseSignedAccountRule(selectedRow?.ACCOUNT_RULE),
    [selectedRow?.ACCOUNT_RULE],
  )
  const showVatFormulaBlock = Boolean(
    selectedRow
    && isVatDeclaration
    && !isVatHeaderRow(selectedRow)
    && ["MANUAL", "FORMULA"].includes(normalizeText(selectedRow.DATA_SOURCE_TYPE).toUpperCase()),
  )

  return (
    <section className={`flex min-h-0 flex-col overflow-auto border bg-white p-3 ${isVatDeclaration ? "rounded-lg border-slate-300 shadow-sm" : "rounded-xl border-slate-200 p-4"}`}>
            {selectedRow ? (
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {isVatDeclaration && (normalizeText(selectedRow.CODE_NO1) || normalizeText(selectedRow.CODE_NO2))
                      ? [
                          normalizeText(selectedRow.CODE_NO1) ? `[${normalizeText(selectedRow.CODE_NO1)}]` : null,
                          normalizeText(selectedRow.CODE_NO2) ? `[${normalizeText(selectedRow.CODE_NO2)}]` : null,
                        ].filter(Boolean).join(" ")
                      : selectedRow.ITEM_CODE
                        ? `${t("ITEM_CODE_SHORT", "Chỉ tiêu")} ${selectedRow.ITEM_CODE}`
                        : t("NEW_ROW", "Chỉ tiêu mới")}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {selectedRow.CAPTION || t("UNTITLED", "Chưa đặt tên")}
                  </p>
                </div>

                {isVatDeclaration ? (
                  <>
                    <section className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("VAT_IDENTITY_SECTION", "Định danh chỉ tiêu")}
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
                        <TextBox
                          value={selectedRow.ITEM_CODE}
                          stylingMode="outlined"
                          label={t("ITEM_CODE_STT", "STT trên tờ khai")}
                          labelMode="floating"
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            updateSelectedRow((row) => ({ ...row, ITEM_CODE: String(event.value ?? "") }))
                          }}
                        />
                        <TextBox
                          value={selectedRow.CAPTION}
                          stylingMode="outlined"
                          label={t("CAPTION", "Tên chỉ tiêu (VN)")}
                          labelMode="floating"
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            updateSelectedRow((row) => ({ ...row, CAPTION: String(event.value ?? "") }))
                          }}
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <TextBox
                          value={selectedRow.CODE_NO1 ?? ""}
                          stylingMode="outlined"
                          label={t("VAT_CODE_NO1", "Mã chỉ tiêu HHDV [ ]")}
                          labelMode="floating"
                          placeholder="27"
                          inputAttr={{ class: "font-mono font-semibold tracking-wide" }}
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            updateSelectedRow((row) => ({ ...row, CODE_NO1: String(event.value ?? "") }))
                          }}
                        />
                        <TextBox
                          value={selectedRow.CODE_NO2 ?? ""}
                          stylingMode="outlined"
                          label={t("VAT_CODE_NO2", "Mã chỉ tiêu thuế GTGT [ ]")}
                          labelMode="floating"
                          placeholder="28"
                          inputAttr={{ class: "font-mono font-semibold tracking-wide" }}
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            updateSelectedRow((row) => ({ ...row, CODE_NO2: String(event.value ?? "") }))
                          }}
                        />
                      </div>
                    </section>

                    <section className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("VAT_CALC_SECTION", "Cách tính")}
                      </h3>
                      <SelectBox
                        dataSource={dataSourceOptions}
                        valueExpr="value"
                        displayExpr="label"
                        value={selectedRow.DATA_SOURCE_TYPE}
                        stylingMode="outlined"
                        label={t("DATA_SOURCE_TYPE", "Cách lấy số")}
                        labelMode="floating"
                        onValueChanged={(event) => {
                          if (!isUserValueChange(event)) {
                            return
                          }

                          updateSelectedRow((row) => {
                            const nextSource = String(event.value ?? "MANUAL").toUpperCase()
                            const next: CashflowFormulaOptionRow = {
                              ...row,
                              DATA_SOURCE_TYPE: nextSource,
                            }

                            if (nextSource === "HEADER") {
                              next.ELEMENT_TYPE = "HEADER"
                              next.CALC_METHOD_NO1 = ""
                              next.CALC_METHOD_NO2 = ""
                              next.FORMULA_NO1 = ""
                              next.FORMULA_NO2 = ""
                            } else if (nextSource === "FORMULA") {
                              next.ELEMENT_TYPE = "FORMULA"
                              if (!normalizeText(row.CALC_METHOD_NO1) && normalizeText(row.CODE_NO1)) {
                                next.CALC_METHOD_NO1 = "FORMULA"
                              }
                              if (!normalizeText(row.CALC_METHOD_NO2) && normalizeText(row.CODE_NO2)) {
                                next.CALC_METHOD_NO2 = "FORMULA"
                              }
                            } else if (nextSource === "MANUAL") {
                              next.ELEMENT_TYPE = "AMOUNT"
                            }

                            return next
                          })
                        }}
                      />
                    </section>

                    {showVatFormulaBlock ? (
                      <section className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {t("VAT_DUAL_FORMULA", "Công thức theo cột")}
                          </h3>
                          <p className="mt-0.5 text-xs leading-5 text-slate-600">
                            {t(
                              "VAT_DUAL_FORMULA_HINT_SHORT",
                              "Ví dụ HHDV: 27=29+30+32+32A · Thuế: 36=35-25",
                            )}
                          </p>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <div className="space-y-2 rounded border border-slate-200 bg-white p-2">
                            <div className="text-xs font-semibold text-slate-700">
                              {t("VAT_COL_HHDV", "Cột HHDV")}
                              {normalizeText(selectedRow.CODE_NO1) ? (
                                <span className="ml-1 font-mono text-slate-500">[{normalizeText(selectedRow.CODE_NO1)}]</span>
                              ) : null}
                            </div>
                            <SelectBox
                              dataSource={vatCalcMethodOptions}
                              valueExpr="value"
                              displayExpr="label"
                              value={normalizeText(selectedRow.CALC_METHOD_NO1).toUpperCase() || null}
                              stylingMode="outlined"
                              label={t("VAT_CALC_METHOD_NO1", "Cách lấy số")}
                              labelMode="floating"
                              showClearButton={true}
                              searchEnabled={false}
                              onValueChanged={(event) => {
                                if (!isUserValueChange(event)) {
                                  return
                                }

                                updateSelectedRow((row) => ({
                                  ...row,
                                  CALC_METHOD_NO1: String(event.value ?? ""),
                                }))
                              }}
                            />
                            <TextArea
                              value={selectedRow.FORMULA_NO1 ?? ""}
                              stylingMode="outlined"
                              label={t("VAT_FORMULA_NO1", "Công thức")}
                              labelMode="floating"
                              height={88}
                              disabled={!isVatFormulaMethod(selectedRow.CALC_METHOD_NO1)}
                              placeholder={t("VAT_FORMULA_PLACEHOLDER", "Ví dụ: 27=29+30+32+32A")}
                              inputAttr={{ class: "font-mono text-xs" }}
                              onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                                ...row,
                                FORMULA_NO1: String(event.value ?? ""),
                              }))}
                            />
                          </div>
                          <div className="space-y-2 rounded border border-slate-200 bg-white p-2">
                            <div className="text-xs font-semibold text-slate-700">
                              {t("VAT_COL_TAX", "Cột thuế GTGT")}
                              {normalizeText(selectedRow.CODE_NO2) ? (
                                <span className="ml-1 font-mono text-slate-500">[{normalizeText(selectedRow.CODE_NO2)}]</span>
                              ) : null}
                            </div>
                            <SelectBox
                              dataSource={vatCalcMethodOptions}
                              valueExpr="value"
                              displayExpr="label"
                              value={normalizeText(selectedRow.CALC_METHOD_NO2).toUpperCase() || null}
                              stylingMode="outlined"
                              label={t("VAT_CALC_METHOD_NO2", "Cách lấy số")}
                              labelMode="floating"
                              showClearButton={true}
                              searchEnabled={false}
                              onValueChanged={(event) => {
                                if (!isUserValueChange(event)) {
                                  return
                                }

                                updateSelectedRow((row) => ({
                                  ...row,
                                  CALC_METHOD_NO2: String(event.value ?? ""),
                                }))
                              }}
                            />
                            <TextArea
                              value={selectedRow.FORMULA_NO2 ?? ""}
                              stylingMode="outlined"
                              label={t("VAT_FORMULA_NO2", "Công thức")}
                              labelMode="floating"
                              height={88}
                              disabled={!isVatFormulaMethod(selectedRow.CALC_METHOD_NO2)}
                              placeholder={t("VAT_FORMULA_PLACEHOLDER_2", "Ví dụ: 36=35-25")}
                              inputAttr={{ class: "font-mono text-xs" }}
                              onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                                ...row,
                                FORMULA_NO2: String(event.value ?? ""),
                              }))}
                            />
                          </div>
                        </div>
                      </section>
                    ) : null}

                    {buildFormulaDisplay(selectedRow, canonicalReportCode, t) ? (
                      <section className="rounded border border-slate-200 bg-white px-2.5 py-2 text-xs leading-5 text-slate-700">
                        <span className="font-semibold text-slate-900">{t("CURRENT_FORMULA", "Đang áp dụng")}: </span>
                        <span className="font-mono">{buildFormulaDisplay(selectedRow, canonicalReportCode, t)}</span>
                      </section>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                      <TextBox
                        value={selectedRow.ITEM_CODE}
                        stylingMode="outlined"
                        label={t("ITEM_CODE", "Mã chỉ tiêu")}
                        labelMode="floating"
                        onValueChanged={(event) => {
                          if (!isUserValueChange(event)) {
                            return
                          }

                          updateSelectedRow((row) => ({ ...row, ITEM_CODE: String(event.value ?? "") }))
                        }}
                      />
                      <TextBox
                        value={selectedRow.CAPTION}
                        stylingMode="outlined"
                        label={t("CAPTION", "Tên chỉ tiêu (VN)")}
                        labelMode="floating"
                        onValueChanged={(event) => {
                          if (!isUserValueChange(event)) {
                            return
                          }

                          updateSelectedRow((row) => ({ ...row, CAPTION: String(event.value ?? "") }))
                        }}
                      />
                    </div>

                    <SelectBox
                      dataSource={dataSourceOptions}
                      valueExpr="value"
                      displayExpr="label"
                      value={selectedRow.DATA_SOURCE_TYPE}
                      stylingMode="outlined"
                      label={t("DATA_SOURCE_TYPE", "Cách lấy số")}
                      labelMode="floating"
                      onValueChanged={(event) => {
                        if (!isUserValueChange(event)) {
                          return
                        }

                        updateSelectedRow((row) => {
                          const nextSource = String(event.value ?? "MANUAL").toUpperCase()
                          const next: CashflowFormulaOptionRow = {
                            ...row,
                            DATA_SOURCE_TYPE: nextSource,
                          }

                          if ((nextSource === "ACCOUNT_RULE" || nextSource === "PROCEDURE")
                            && !normalizeText(row.CALC_METHOD)) {
                            next.CALC_METHOD = isProfitLoss ? "CREDIT_MINUS_DEBIT" : "DEBIT_MINUS_CREDIT"
                          }

                          return next
                        })
                      }}
                    />

                    {selectedRow.DATA_SOURCE_TYPE === "FORMULA" ? (
                      <TextArea
                        value={selectedRow.FORMULA_EXPR ?? ""}
                        stylingMode="outlined"
                        label={t("FORMULA_EXPR", "Công thức cộng trừ chỉ tiêu")}
                        labelMode="floating"
                        height={86}
                        placeholder={t("FORMULA_EXPR_PLACEHOLDER", "Ví dụ: 10 = 01 - 02")}
                        onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                          ...row,
                          FORMULA_EXPR: String(event.value ?? ""),
                        }))}
                      />
                    ) : null}

                    {buildFormulaDisplay(selectedRow, canonicalReportCode, t) ? (
                      <section className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                        <span className="font-semibold text-slate-900">{t("CURRENT_FORMULA", "Đang áp dụng")}: </span>
                        {buildFormulaDisplay(selectedRow, canonicalReportCode, t)}
                      </section>
                    ) : null}

                    {isAccountRuleReport && (selectedRow.DATA_SOURCE_TYPE === "ACCOUNT_RULE" || selectedRow.DATA_SOURCE_TYPE === "PROCEDURE") ? (
                      <section className="space-y-3 rounded-lg border border-violet-100 bg-violet-50 p-3">
                        <TextBox
                          value={selectedRow.ACCOUNT_RULE ?? ""}
                          stylingMode="outlined"
                          label={t("ACCOUNT_RULE", "Tài khoản lấy số")}
                          labelMode="floating"
                          placeholder={t("ACCOUNT_RULE_PLACEHOLDER", "Ví dụ: 111, 112, 113")}
                          onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                            ...row,
                            ACCOUNT_RULE: String(event.value ?? ""),
                          }))}
                        />
                        <SelectBox
                          dataSource={calcMethodOptions}
                          valueExpr="value"
                          displayExpr="label"
                          value={normalizeText(selectedRow.CALC_METHOD).toUpperCase()
                            || (isProfitLoss ? "CREDIT_MINUS_DEBIT" : "DEBIT_MINUS_CREDIT")}
                          stylingMode="outlined"
                          label={isProfitLoss
                            ? t("CALC_METHOD_PL", "Cách lấy phát sinh")
                            : t("CALC_METHOD_BS", "Cách lấy số dư")}
                          labelMode="floating"
                          searchEnabled={false}
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            updateSelectedRow((row) => ({
                              ...row,
                              CALC_METHOD: String(event.value ?? ""),
                            }))
                          }}
                        />
                      </section>
                    ) : null}

                    {isCashflow && isIndirect ? (
                      <section className="space-y-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {t("CASHFLOW_INDIRECT_ACCOUNT_RULE", "Tài khoản lấy số cho chỉ tiêu")}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {t(
                              "CASHFLOW_INDIRECT_ACCOUNT_RULE_HINT",
                              "Nhập mã tài khoản (hoặc đầu số). Ví dụ cộng: 511, 515 — trừ: 632, 641. Nhiều tài khoản cách nhau bằng dấu phẩy.",
                            )}
                          </p>
                        </div>
                        <TextBox
                          value={signedAccountRule.plus}
                          stylingMode="outlined"
                          label={t("CASHFLOW_ACCOUNT_PLUS", "Tài khoản cộng vào chỉ tiêu (+)")}
                          labelMode="floating"
                          placeholder="511, 515, 711"
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            const plus = String(event.value ?? "")
                            updateSelectedRow((row) => ({
                              ...row,
                              ACCOUNT_RULE: buildSignedAccountRule(plus, parseSignedAccountRule(row.ACCOUNT_RULE).minus),
                            }))
                          }}
                        />
                        <TextBox
                          value={signedAccountRule.minus}
                          stylingMode="outlined"
                          label={t("CASHFLOW_ACCOUNT_MINUS", "Tài khoản trừ khỏi chỉ tiêu (−)")}
                          labelMode="floating"
                          placeholder="632, 641, 413"
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            const minus = String(event.value ?? "")
                            updateSelectedRow((row) => ({
                              ...row,
                              ACCOUNT_RULE: buildSignedAccountRule(parseSignedAccountRule(row.ACCOUNT_RULE).plus, minus),
                            }))
                          }}
                        />
                      </section>
                    ) : isCashflow ? (
                      <section className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {t("CASHFLOW_DIRECT_ACCOUNT_RULE", "Quy tắc thu / chi theo đối ứng")}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {t(
                              "CASHFLOW_DIRECT_ACCOUNT_RULE_HINT",
                              "Khai báo tài khoản đối ứng với tài khoản tiền. Số ưu tiên nhỏ hơn được chọn trước khi nhiều quy tắc cùng khớp.",
                            )}
                          </p>
                        </div>
                        <SelectBox
                          dataSource={flowSignOptions}
                          valueExpr="value"
                          displayExpr="label"
                          value={selectedRow.DIRECT_RULE_FLOW_SIGN ?? 1}
                          stylingMode="outlined"
                          label={t("CASHFLOW_RULE_1_DIRECTION", "Quy tắc thu/chi 1")}
                          labelMode="floating"
                          onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                            ...row,
                            DIRECT_RULE_FLOW_SIGN: Number(event.value) === -1 ? -1 : 1,
                          }))}
                        />
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
                          <TextBox
                            value={selectedRow.DIRECT_RULE_ACC_PREFIX ?? ""}
                            stylingMode="outlined"
                            label={t("CASHFLOW_COUNTER_ACCOUNTS_1", "Tài khoản đối ứng 1")}
                            labelMode="floating"
                            placeholder="131, 511, 515"
                            onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                              ...row,
                              DIRECT_RULE_ACC_PREFIX: String(event.value ?? ""),
                            }))}
                          />
                          <NumberBox
                            value={selectedRow.DIRECT_RULE_PRIORITY ?? selectedRow.SORT_ORDER}
                            min={0}
                            showSpinButtons={true}
                            stylingMode="outlined"
                            label={t("PRIORITY", "Ưu tiên")}
                            labelMode="floating"
                            onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                              ...row,
                              DIRECT_RULE_PRIORITY: toPositiveInteger(event.value, row.SORT_ORDER),
                            }))}
                          />
                        </div>
                        <SelectBox
                          dataSource={flowSignOptions}
                          valueExpr="value"
                          displayExpr="label"
                          value={selectedRow.DIRECT_RULE_FLOW_SIGN_2 ?? -1}
                          stylingMode="outlined"
                          label={t("CASHFLOW_RULE_2_DIRECTION", "Quy tắc thu/chi 2")}
                          labelMode="floating"
                          onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                            ...row,
                            DIRECT_RULE_FLOW_SIGN_2: Number(event.value) === -1 ? -1 : 1,
                          }))}
                        />
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
                          <TextBox
                            value={selectedRow.DIRECT_RULE_ACC_PREFIX_2 ?? ""}
                            stylingMode="outlined"
                            label={t("CASHFLOW_COUNTER_ACCOUNTS_2", "Tài khoản đối ứng 2")}
                            labelMode="floating"
                            placeholder="331, 152, 642"
                            onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                              ...row,
                              DIRECT_RULE_ACC_PREFIX_2: String(event.value ?? ""),
                            }))}
                          />
                          <NumberBox
                            value={selectedRow.DIRECT_RULE_PRIORITY_2 ?? selectedRow.SORT_ORDER}
                            min={0}
                            showSpinButtons={true}
                            stylingMode="outlined"
                            label={t("PRIORITY", "Ưu tiên")}
                            labelMode="floating"
                            onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                              ...row,
                              DIRECT_RULE_PRIORITY_2: toPositiveInteger(event.value, row.SORT_ORDER),
                            }))}
                          />
                        </div>
                      </section>
                    ) : null}
                  </>
                )}

                <CollapsibleSection title={t("FORMULA_ADVANCED_SECTION", "Định danh & thứ tự")}>
                  <TextBox
                    value={selectedRow.LABEL_TEXT ?? ""}
                    stylingMode="outlined"
                    label={t("LABEL_TEXT", "Khóa dịch (LABEL_TEXT)")}
                    labelMode="floating"
                    readOnly
                    hint={t("LABEL_TEXT_HINT", "Khóa dịch đa ngôn ngữ; ưu tiên t(LABEL_TEXT), miss thì CAPTION/ITEM_NAME.")}
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <SelectBox
                      dataSource={elementTypeOptions}
                      valueExpr="value"
                      displayExpr="label"
                      value={selectedRow.ELEMENT_TYPE || "DETAIL"}
                      stylingMode="outlined"
                      label={t("ROW_TYPE", "Kiểu dòng")}
                      labelMode="floating"
                      onValueChanged={(event) => {
                        if (!isUserValueChange(event)) {
                          return
                        }

                        updateSelectedRow((row) => ({
                          ...row,
                          ELEMENT_TYPE: String(event.value ?? "DETAIL"),
                        }))
                      }}
                    />
                    <NumberBox
                      value={selectedRow.SORT_ORDER}
                      min={0}
                      showSpinButtons={true}
                      stylingMode="outlined"
                      label={t("SORT_ORDER", "Thứ tự trên báo cáo")}
                      labelMode="floating"
                      onValueChanged={(event) => {
                        if (!isUserValueChange(event)) {
                          return
                        }

                        updateSelectedRow((row) => ({
                          ...row,
                          SORT_ORDER: toPositiveInteger(event.value, row.SORT_ORDER),
                        }))
                      }}
                    />
                    <NumberBox
                      value={selectedRow.LEVEL_NO}
                      min={0}
                      max={10}
                      showSpinButtons={true}
                      stylingMode="outlined"
                      label={t("LEVEL_NO", "Cấp thụt lề")}
                      labelMode="floating"
                      onValueChanged={(event) => {
                        if (!isUserValueChange(event)) {
                          return
                        }

                        updateSelectedRow((row) => ({
                          ...row,
                          LEVEL_NO: toPositiveInteger(event.value, row.LEVEL_NO),
                        }))
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      icon="chevronup"
                      stylingMode="text"
                      hint={t("MOVE_UP", "Đưa lên trên")}
                      disabled={saving || sortedRows[0]?.ITEM_KEY === selectedRow.ITEM_KEY}
                      onClick={() => moveSelectedRow(-1)}
                    />
                    <Button
                      icon="chevrondown"
                      stylingMode="text"
                      hint={t("MOVE_DOWN", "Đưa xuống dưới")}
                      disabled={saving || sortedRows[sortedRows.length - 1]?.ITEM_KEY === selectedRow.ITEM_KEY}
                      onClick={() => moveSelectedRow(1)}
                    />
                    <Button
                      icon="trash"
                      stylingMode="text"
                      hint={t("DELETE", "Xóa chỉ tiêu")}
                      disabled={saving}
                      onClick={deleteSelectedRow}
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title={t("FORMULA_DISPLAY_SECTION", "Hiển thị trên báo cáo")}>
                  <div className="flex flex-wrap gap-5">
                    <CheckBox
                      value={selectedRow.IS_VISIBLE === "1"}
                      text={t("IS_VISIBLE", "Hiện trên báo cáo")}
                      onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                        ...row,
                        IS_VISIBLE: event.value ? "1" : "0",
                      }))}
                    />
                    <CheckBox
                      value={selectedRow.FONT_BOLD === "1"}
                      text={t("FONT_BOLD", "In đậm")}
                      onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                        ...row,
                        FONT_BOLD: event.value ? "1" : "0",
                      }))}
                    />
                    <CheckBox
                      value={selectedRow.FONT_ITALIC === "1"}
                      text={t("FONT_ITALIC", "In nghiêng")}
                      onValueChanged={(event) => commitSelectedRow(event, (row) => ({
                        ...row,
                        FONT_ITALIC: event.value ? "1" : "0",
                      }))}
                    />
                  </div>
                </CollapsibleSection>
              </div>
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center text-center text-sm text-slate-500">
                {t("CASHFLOW_SELECT_REPORT_LINE", "Chọn một chỉ tiêu bên trái để khai báo, hoặc bấm Thêm chỉ tiêu.")}
              </div>
            )}
          </section>
  )
})