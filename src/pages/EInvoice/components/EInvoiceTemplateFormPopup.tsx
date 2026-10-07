import { useEffect, useState } from "react"
import CheckBox from "devextreme-react/check-box"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"

import {
  listEInvoiceDesignerXslSamples,
  saveEInvoiceSellerXslTemplateMeta,
  type EInvoiceFtpXslFile,
} from "@/api/einvoiceSettingApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import type { SysCode } from "@/api/sysCodeService"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import type { EInvoiceTemplateSetting } from "@/types/einvoiceSetting"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import {
  EINV_KHMSHDON_CODE_TYPE,
  buildEInvoiceKhmshdonOptions,
  type EInvoiceKhmshdonOption,
} from "../einvoiceKhmshdonOptions"
import {
  EINV_KHHDON_LOAI_CODE_TYPE,
  EINV_KHHDON_MCCQT_CODE_TYPE,
  buildEInvoiceKhhdonLoaiOptions,
  buildEInvoiceKhhdonMccqtOptions,
  composeKhhdon,
  createDefaultKhhdonParts,
  isValidKhhdon,
  parseKhhdonParts,
  type EInvoiceKhhdonPartOption,
  type EInvoiceKhhdonParts,
} from "../einvoiceKhhdonOptions"

import { EInvoiceEditorSection } from "./EInvoiceEditorShell"
import "./einvoiceSettingPanel.css"

type TranslateFn = (key: string, fallback: string) => string

export type EInvoiceTemplateFormValues = {
  XSL_ID: number
  TEMPLATE_NM: string
  KHMSHDON: string
  KHHDON: string
  FROM_SHDON: string
  TO_SHDON: string
  USE_MULTI_TAX_RATE: number
  XSL_FILE_NAME: string
}

type EInvoiceTemplateFormPopupProps = {
  visible: boolean
  mode: "create" | "edit"
  existingTemplates?: EInvoiceTemplateSetting[]
  template?: EInvoiceTemplateSetting | null
  t: TranslateFn
  onClose: () => void
  onSaved: () => void | Promise<void>
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function createEmptyValues(): EInvoiceTemplateFormValues {
  const khhdonParts = createDefaultKhhdonParts()
  return {
    XSL_ID: 0,
    TEMPLATE_NM: "",
    KHMSHDON: "1",
    KHHDON: composeKhhdon(khhdonParts),
    FROM_SHDON: "1",
    TO_SHDON: "",
    USE_MULTI_TAX_RATE: 0,
    XSL_FILE_NAME: "",
  }
}

function fromTemplate(template: EInvoiceTemplateSetting): EInvoiceTemplateFormValues {
  return {
    XSL_ID: Number(template.XSL_ID ?? 0),
    TEMPLATE_NM: normalizeText(template.XSL_TEMPLATE_NM),
    KHMSHDON: normalizeText(template.KHMSHDON),
    KHHDON: normalizeText(template.KHHDON).toUpperCase(),
    FROM_SHDON: normalizeText(template.FROM_SHDON) || "1",
    TO_SHDON: normalizeText(template.TO_SHDON),
    USE_MULTI_TAX_RATE: Number(template.USE_MULTI_TAX_RATE ?? 0) === 1 ? 1 : 0,
    XSL_FILE_NAME: "",
  }
}

export default function EInvoiceTemplateFormPopup({
  visible,
  mode,
  existingTemplates = [],
  template,
  t,
  onClose,
  onSaved,
}: EInvoiceTemplateFormPopupProps) {
  const isCreate = mode === "create"
  const [values, setValues] = useState<EInvoiceTemplateFormValues>(() => createEmptyValues())
  const [khhdonParts, setKhhdonParts] = useState<EInvoiceKhhdonParts>(() => createDefaultKhhdonParts())
  const [xslSamples, setXslSamples] = useState<EInvoiceFtpXslFile[]>([])
  const [khmshdonOptions, setKhmshdonOptions] = useState<EInvoiceKhmshdonOption[]>(() => buildEInvoiceKhmshdonOptions([], t))
  const [mccqtOptions, setMccqtOptions] = useState<EInvoiceKhhdonPartOption[]>(() => buildEInvoiceKhhdonMccqtOptions([], t))
  const [loaiOptions, setLoaiOptions] = useState<EInvoiceKhhdonPartOption[]>(() => buildEInvoiceKhhdonLoaiOptions([], t))
  const [loadingSamples, setLoadingSamples] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    const nextValues = isCreate
      ? createEmptyValues()
      : template
        ? fromTemplate(template)
        : createEmptyValues()
    setValues(nextValues)
    setKhhdonParts(parseKhhdonParts(nextValues.KHHDON))
  }, [visible, isCreate, template])

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    void Promise.all([
      getCachedSysCodes(EINV_KHMSHDON_CODE_TYPE),
      getCachedSysCodes(EINV_KHHDON_MCCQT_CODE_TYPE),
      getCachedSysCodes(EINV_KHHDON_LOAI_CODE_TYPE),
    ])
      .then(([khmshdon, mccqt, loai]: [SysCode[], SysCode[], SysCode[]]) => {
        if (cancelled) return
        setKhmshdonOptions(buildEInvoiceKhmshdonOptions(khmshdon, t))
        setMccqtOptions(buildEInvoiceKhhdonMccqtOptions(mccqt, t))
        setLoaiOptions(buildEInvoiceKhhdonLoaiOptions(loai, t))
      })
      .catch(() => {
        if (cancelled) return
        setKhmshdonOptions(buildEInvoiceKhmshdonOptions([], t))
        setMccqtOptions(buildEInvoiceKhhdonMccqtOptions([], t))
        setLoaiOptions(buildEInvoiceKhhdonLoaiOptions([], t))
      })
    return () => {
      cancelled = true
    }
  }, [visible, t])

  useEffect(() => {
    if (!visible || !isCreate) return
    let cancelled = false
    setLoadingSamples(true)
    void listEInvoiceDesignerXslSamples()
      .then((result) => {
        if (cancelled) return
        setXslSamples(result.data)
        const preferred =
          result.data.find((item) => item.FILE_NAME.toLowerCase() === "mau2.xsl")
          ?? result.data[0]
        if (preferred) {
          setValues((prev) => ({
            ...prev,
            XSL_FILE_NAME: prev.XSL_FILE_NAME || preferred.FILE_NAME,
            TEMPLATE_NM: prev.TEMPLATE_NM || preferred.FILE_NAME.replace(/\.(xsl|xslt)$/i, ""),
          }))
        }
      })
      .catch((error) => {
        if (!cancelled) {
          notify(getApiErrorMessage(error, t("XSL_FTP_LOAD_FAILED", "Không tải được danh sách mẫu in")), "error", 4000)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSamples(false)
      })
    return () => {
      cancelled = true
    }
  }, [visible, isCreate, t])

  const patch = (patchValue: Partial<EInvoiceTemplateFormValues>) => {
    setValues((prev) => ({ ...prev, ...patchValue }))
  }

  const patchKhhdonParts = (patchValue: Partial<EInvoiceKhhdonParts>) => {
    setKhhdonParts((prev) => {
      const next = { ...prev, ...patchValue }
      setValues((form) => ({ ...form, KHHDON: composeKhhdon(next) }))
      return next
    })
  }

  const handleSave = async () => {
    if (!normalizeText(values.KHMSHDON)) {
      notify(t("KHMSHDON_REQUIRED", "Hãy chọn mẫu số hóa đơn"), "warning", 3000)
      return
    }
    const khms = normalizeText(values.KHMSHDON)
    const khhdon = composeKhhdon(khhdonParts)
    if (!isValidKhhdon(khhdon)) {
      notify(
        t("KHHDON_INVALID", "Ký hiệu HĐ phải đủ 6 ký tự theo mẫu C/K + năm + loại + 2 chữ (vd: C26TYY)"),
        "warning",
        4500,
      )
      return
    }
    if (isCreate && !normalizeText(values.XSL_FILE_NAME)) {
      notify(t("XSL_FILE_REQUIRED", "Hãy chọn mẫu in hóa đơn"), "warning", 3000)
      return
    }

    const currentXslId = isCreate ? 0 : Number(values.XSL_ID ?? 0)
    const duplicate = existingTemplates.find((row) => {
      const rowXslId = Number(row.XSL_ID ?? 0)
      if (currentXslId > 0 && rowXslId === currentXslId) return false
      return normalizeText(row.KHMSHDON) === khms && normalizeText(row.KHHDON).toUpperCase() === khhdon
    })
    if (duplicate) {
      const label = [khms, khhdon].filter(Boolean).join(" / ")
      const confirmed = await confirm(
        t(
          "MSG_CONFIRM_DUPLICATE_TEMPLATE_SYMBOL",
          'Đã tồn tại mẫu số / ký hiệu "{0}". Bạn vẫn muốn tiếp tục?',
        ).replace("{0}", label),
        t("MSG_BTNOK", "Xác nhận"),
      )
      if (!confirmed) return
    }

    setSaving(true)
    try {
      await saveEInvoiceSellerXslTemplateMeta({
        XSL_ID: isCreate ? 0 : values.XSL_ID,
        TEMPLATE_NM: normalizeText(values.TEMPLATE_NM) || null,
        KHMSHDON: khms,
        KHHDON: khhdon,
        FROM_SHDON: normalizeText(values.FROM_SHDON) || "1",
        TO_SHDON: normalizeText(values.TO_SHDON) || null,
        USE_MULTI_TAX_RATE: values.USE_MULTI_TAX_RATE,
        XSL_FILE_NAME: isCreate ? normalizeText(values.XSL_FILE_NAME) : null,
      })
      notify(
        isCreate
          ? t("MSG_ADD_SUCCESS", "Đã thêm mẫu số ký hiệu")
          : t("MSG_EDIT_SUCCESS", "Đã cập nhật mẫu số ký hiệu"),
        "success",
        2500,
      )
      await onSaved()
      onClose()
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Không lưu được mẫu số ký hiệu")), "error", 4500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      title={isCreate ? t("ADD_INVOICE_TEMPLATE", "Thêm mẫu số ký hiệu") : t("EDIT_INVOICE_TEMPLATE", "Sửa mẫu số ký hiệu")}
      width={720}
      height="auto"
      maxHeight="90vh"
      showCloseButton
      dragEnabled
      animation={POPUP_FADE_ANIMATION}
    >
      <ToolbarItem
        toolbar="bottom"
        location="after"
        widget="dxButton"
        options={{ text: t("CANCEL", "Hủy"), onClick: onClose, disabled: saving }}
      />
      <ToolbarItem
        toolbar="bottom"
        location="after"
        widget="dxButton"
        options={{
          text: t("SAVE", "Lưu"),
          type: "default",
          onClick: () => void handleSave(),
          disabled: saving || loadingSamples,
        }}
      />
      <div className="einvoice-setting-panel p-3">
        <EInvoiceEditorSection title={t("INVOICE_TEMPLATE_SETTING", "Mẫu hóa đơn")}>
          <div className="grid gap-3">
            <label className="block text-xs">
              <span className="mb-1 block font-medium">{t("KHMSHDON", "Mẫu số HĐ")}</span>
              <SelectBox
                dataSource={khmshdonOptions}
                value={values.KHMSHDON || null}
                valueExpr="value"
                displayExpr="text"
                searchEnabled
                searchExpr={["value", "text"]}
                stylingMode="outlined"
                disabled={saving}
                placeholder={t("SELECT_KHMSHDON", "Chọn mẫu số hóa đơn")}
                dropDownOptions={{ width: "auto", maxWidth: 720 }}
                itemRender={(item: EInvoiceKhmshdonOption) => (
                  <div className="whitespace-normal py-1 text-xs leading-snug">{item?.text}</div>
                )}
                onValueChanged={(event) => {
                  if (event.event) patch({ KHMSHDON: String(event.value ?? "") })
                }}
              />
            </label>

            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium">{t("KHHDON", "Ký hiệu HĐ")}</span>
                <span className="rounded bg-white px-2 py-0.5 font-mono text-sm font-semibold tracking-wider text-slate-800">
                  {composeKhhdon(khhdonParts) || "------"}
                </span>
              </div>
              <p className="mb-3 text-[11px] text-slate-500">
                {t(
                  "KHHDON_HINT",
                  "6 ký tự theo TT 91/2026: [C/K][năm][loại][2 chữ tự đặt]. Ví dụ C26TYY.",
                )}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs">
                  <span className="mb-1 block font-medium">{t("KHHDON_MCCQT", "Có mã / không mã CQT")}</span>
                  <SelectBox
                    dataSource={mccqtOptions}
                    value={khhdonParts.mccqt || null}
                    valueExpr="value"
                    displayExpr="text"
                    searchEnabled
                    stylingMode="outlined"
                    disabled={saving}
                    dropDownOptions={{ width: "auto", maxWidth: 560 }}
                    itemRender={(item: EInvoiceKhhdonPartOption) => (
                      <div className="whitespace-normal py-1 text-xs leading-snug">{item?.text}</div>
                    )}
                    onValueChanged={(event) => {
                      if (event.event) patchKhhdonParts({ mccqt: String(event.value ?? "") })
                    }}
                  />
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block font-medium">{t("KHHDON_YEAR", "Năm lập (2 số)")}</span>
                  <TextBox
                    value={khhdonParts.year}
                    maxLength={2}
                    stylingMode="outlined"
                    readOnly
                    disabled
                  />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="mb-1 block font-medium">{t("KHHDON_LOAI", "Loại hóa đơn (ký tự 4)")}</span>
                  <SelectBox
                    dataSource={loaiOptions}
                    value={khhdonParts.loai || null}
                    valueExpr="value"
                    displayExpr="text"
                    searchEnabled
                    searchExpr={["value", "text"]}
                    stylingMode="outlined"
                    disabled={saving}
                    dropDownOptions={{ width: "auto", maxWidth: 720 }}
                    itemRender={(item: EInvoiceKhhdonPartOption) => (
                      <div className="whitespace-normal py-1 text-xs leading-snug">{item?.text}</div>
                    )}
                    onValueChanged={(event) => {
                      if (event.event) patchKhhdonParts({ loai: String(event.value ?? "") })
                    }}
                  />
                </label>
                <label className="block text-xs sm:col-span-2">
                  <span className="mb-1 block font-medium">{t("KHHDON_SUFFIX", "2 ký tự tự đặt")}</span>
                  <TextBox
                    value={khhdonParts.suffix}
                    maxLength={2}
                    stylingMode="outlined"
                    disabled={saving}
                    placeholder="YY"
                    onValueChanged={(event) => {
                      const letters = String(event.value ?? "")
                        .toUpperCase()
                        .replace(/[^A-Z]/g, "")
                        .slice(0, 2)
                      patchKhhdonParts({ suffix: letters })
                    }}
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">
                    {t("KHHDON_SUFFIX_HINT", "Mặc định YY nếu không cần quản lý mẫu riêng.")}
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs">
                <span className="mb-1 block font-medium">{t("FROM_SHDON", "Từ số")}</span>
                <TextBox
                  value={values.FROM_SHDON}
                  maxLength={8}
                  stylingMode="outlined"
                  disabled={saving}
                  onValueChanged={(event) => patch({ FROM_SHDON: String(event.value ?? "") })}
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-medium">{t("TO_SHDON", "Đến số")}</span>
                <TextBox
                  value={values.TO_SHDON}
                  maxLength={8}
                  stylingMode="outlined"
                  disabled={saving}
                  onValueChanged={(event) => patch({ TO_SHDON: String(event.value ?? "") })}
                />
              </label>
            </div>
            <label className="block text-xs">
              <span className="mb-1 block font-medium">{t("XSL_TEMPLATE_NM", "Tên mẫu")}</span>
              <TextBox
                value={values.TEMPLATE_NM}
                maxLength={255}
                stylingMode="outlined"
                disabled={saving}
                onValueChanged={(event) => patch({ TEMPLATE_NM: String(event.value ?? "") })}
              />
            </label>
            {isCreate && (
              <label className="block text-xs">
                <span className="mb-1 block font-medium">{t("XSL_FTP_SAMPLE", "Mẫu in hóa đơn")}</span>
                <SelectBox
                  dataSource={xslSamples}
                  value={values.XSL_FILE_NAME || null}
                  valueExpr="FILE_NAME"
                  displayExpr="FILE_NAME"
                  searchEnabled
                  disabled={saving || loadingSamples}
                  stylingMode="outlined"
                  placeholder={loadingSamples ? t("LOADING", "Đang tải...") : t("SELECT_XSL_FTP", "Chọn mẫu in có sẵn")}
                  onValueChanged={(event) => {
                    if (!event.event) return
                    const fileName = String(event.value ?? "")
                    patch({
                      XSL_FILE_NAME: fileName,
                      TEMPLATE_NM: values.TEMPLATE_NM || fileName.replace(/\.(xsl|xslt)$/i, ""),
                    })
                  }}
                />
              </label>
            )}
            <div className="pt-1">
              <CheckBox
                value={values.USE_MULTI_TAX_RATE === 1}
                text={t("USE_MULTI_TAX_RATE", "Đa thuế suất")}
                disabled={saving}
                onValueChanged={(event) => patch({ USE_MULTI_TAX_RATE: event.value ? 1 : 0 })}
              />
            </div>
            {!isCreate && (
              <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                {t("TEMPLATE_EDIT_INACTIVE_ONLY", "Chỉ sửa được mẫu chưa phát hành.")}
              </div>
            )}
          </div>
        </EInvoiceEditorSection>
      </div>
    </Popup>
  )
}
