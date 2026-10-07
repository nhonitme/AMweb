import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"

import { saveEInvoiceSellerInfo } from "@/api/einvoiceSettingApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { LanguageContext } from "@/lib/i18nLoader"
import type { EInvoiceSellerSetting } from "@/types/einvoiceSetting"

import { EInvoiceEditorSection } from "./EInvoiceEditorShell"
import { isEInvoiceHouseholdBusinessTaxCode } from "../einvoiceModel"
import "./einvoiceEditor.css"
import "./einvoiceSettingPanel.css"

type SelectOption<TValue extends string | number> = {
  value: TValue
  text: string
}

type SellerDraft = {
  SELLER_NM: string
  SELLER_ADDRESS: string
  MDDKDOANH: string
  TDDKDOANH: string
  DCDDKDOANH: string
  MCHANG: string
  TCHANG: string
  SDTHOAI: string
  DCTDTU: string
  STKNHANG: string
  TNHANG: string
  FAX: string
  WEBSITE: string
}

type EInvoiceSellerInfoPanelProps = {
  sellers: EInvoiceSellerSetting[]
  loading?: boolean
  onRefresh: () => void | Promise<void>
}

function displayText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function formatSellerOptionLabel(seller: EInvoiceSellerSetting): string {
  const code = displayText(seller.SELLER_CD)
  const name = displayText(seller.SELLER_NM)
  if (code && name) {
    return `${code} · ${name}`
  }
  return name || code || "Người bán"
}

function createDraft(seller: EInvoiceSellerSetting | null | undefined): SellerDraft {
  return {
    SELLER_NM: displayText(seller?.SELLER_NM),
    SELLER_ADDRESS: displayText(seller?.SELLER_ADDRESS),
    MDDKDOANH: displayText(seller?.MDDKDOANH),
    TDDKDOANH: displayText(seller?.TDDKDOANH),
    DCDDKDOANH: displayText(seller?.DCDDKDOANH),
    MCHANG: displayText(seller?.MCHANG),
    TCHANG: displayText(seller?.TCHANG),
    SDTHOAI: displayText(seller?.SDTHOAI),
    DCTDTU: displayText(seller?.DCTDTU),
    STKNHANG: displayText(seller?.STKNHANG),
    TNHANG: displayText(seller?.TNHANG),
    FAX: displayText(seller?.FAX),
    WEBSITE: displayText(seller?.WEBSITE),
  }
}

function draftsEqual(left: SellerDraft, right: SellerDraft): boolean {
  return (Object.keys(left) as Array<keyof SellerDraft>).every((key) => left[key] === right[key])
}

type SellerFieldProps = {
  label: string
  value: string
  readOnly?: boolean
  disabled?: boolean
  hint?: string
  className?: string
  onValueChanged?: (value: string) => void
}

function SellerField({ label, value, readOnly = false, disabled = false, hint, className, onValueChanged }: SellerFieldProps) {
  return (
    <div className={["einvoice-setting-panel__field", hint ? "einvoice-setting-panel__field--with-hint" : "", className].filter(Boolean).join(" ")}>
      <TextBox
        label={label}
        labelMode="floating"
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        onValueChanged={(event) => onValueChanged?.(String(event.value ?? ""))}
      />
      {hint ? (
        <button
          type="button"
          className="einvoice-setting-panel__field-hint"
          aria-label={hint}
          tabIndex={0}
        >
          <span className="einvoice-setting-panel__field-hint-icon" aria-hidden="true">
            i
          </span>
          <span className="einvoice-setting-panel__field-hint-tooltip" role="tooltip">
            {hint}
          </span>
        </button>
      ) : null}
    </div>
  )
}

export default function EInvoiceSellerInfoPanel({ sellers, loading = false, onRefresh }: EInvoiceSellerInfoPanelProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const [selectedSellerId, setSelectedSellerId] = useState(0)
  const [draft, setDraft] = useState<SellerDraft>(() => createDraft(null))
  const [saving, setSaving] = useState(false)
  const [storeExtendedOpen, setStoreExtendedOpen] = useState(false)

  const sellerOptions = useMemo<SelectOption<number>[]>(
    () =>
      sellers.map((seller) => ({
        value: seller.SELLER_ID,
        text: formatSellerOptionLabel(seller),
      })),
    [sellers],
  )

  useEffect(() => {
    if (sellers.length === 0) {
      setSelectedSellerId(0)
      setDraft(createDraft(null))
      return
    }

    const exists = sellers.some((seller) => seller.SELLER_ID === selectedSellerId)
    if (!exists) {
      setSelectedSellerId(sellers[0].SELLER_ID)
    }
  }, [selectedSellerId, sellers])

  const selectedSeller = useMemo(
    () => sellers.find((seller) => seller.SELLER_ID === selectedSellerId) ?? null,
    [selectedSellerId, sellers],
  )

  useEffect(() => {
    setDraft(createDraft(selectedSeller))
  }, [selectedSeller])

  const baseline = useMemo(() => createDraft(selectedSeller), [selectedSeller])
  const isDirty = !draftsEqual(draft, baseline)
  const isBusy = loading || saving
  const taxCode = displayText(selectedSeller?.SELLER_TAX_CD)
  const showBusinessLocation = isEInvoiceHouseholdBusinessTaxCode(taxCode)

  const updateField = useCallback(<K extends keyof SellerDraft>(key: K, value: SellerDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    const sellerId = Number(selectedSeller?.SELLER_ID ?? 0)
    if (sellerId <= 0 || saving) {
      return
    }

    const sellerName = draft.SELLER_NM.trim()
    const sellerAddress = draft.SELLER_ADDRESS.trim()
    if (!sellerName) {
      notify(t("SELLER_NM_REQUIRED", "Tên người bán không được để trống"), "warning", 3500)
      return
    }
    if (!sellerAddress) {
      notify(t("SELLER_ADDRESS_REQUIRED", "Địa chỉ người bán không được để trống"), "warning", 3500)
      return
    }

    setSaving(true)
    try {
      await saveEInvoiceSellerInfo(sellerId, {
        SELLER_NM: sellerName,
        SELLER_ADDRESS: sellerAddress,
        MDDKDOANH: showBusinessLocation ? draft.MDDKDOANH.trim() || null : null,
        TDDKDOANH: showBusinessLocation ? draft.TDDKDOANH.trim() || null : null,
        DCDDKDOANH: showBusinessLocation ? draft.DCDDKDOANH.trim() || null : null,
        MCHANG: draft.MCHANG.trim() || null,
        TCHANG: draft.TCHANG.trim() || null,
        SDTHOAI: draft.SDTHOAI.trim() || null,
        DCTDTU: draft.DCTDTU.trim() || null,
        STKNHANG: draft.STKNHANG.trim() || null,
        TNHANG: draft.TNHANG.trim() || null,
        FAX: draft.FAX.trim() || null,
        WEBSITE: draft.WEBSITE.trim() || null,
      })
      notify(t("SAVE_SUCCESS", "Đã lưu thông tin người bán"), "success", 2500)
      await onRefresh()
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 4000)
    } finally {
      setSaving(false)
    }
  }, [draft, onRefresh, saving, selectedSeller?.SELLER_ID, showBusinessLocation, t])

  const handleReset = useCallback(() => {
    setDraft(createDraft(selectedSeller))
  }, [selectedSeller])

  if (sellers.length === 0) {
    return (
      <div className="einvoice-setting-panel">
        <header className="einvoice-setting-panel__header einvoice-setting-panel__header--actions-only">
          <div className="einvoice-setting-panel__header-actions">
            <Button
              icon="refresh"
              stylingMode="outlined"
              text={t("REFRESH", "Tải lại")}
              disabled={isBusy}
              onClick={() => void onRefresh()}
            />
          </div>
        </header>
        <div className="einvoice-setting-panel__body">
          <div className="einvoice-setting-panel__empty">
            <div className="einvoice-setting-panel__empty-text">{t("SELLER_EMPTY", "Chưa có thông tin người bán.")}</div>
            <Button
              icon="refresh"
              type="default"
              stylingMode="contained"
              text={t("REFRESH", "Tải lại")}
              disabled={isBusy}
              onClick={() => void onRefresh()}
            />
          </div>
        </div>
      </div>
    )
  }

  const sellerName = draft.SELLER_NM.trim()

  return (
    <div className="einvoice-setting-panel">
      <header className="einvoice-setting-panel__header einvoice-setting-panel__header--actions-only">
        <div className="einvoice-setting-panel__header-actions">
          {sellers.length > 1 ? (
            <SelectBox
              width={360}
              label={t("SELLER_SELECT", "Người bán")}
              labelMode="floating"
              dataSource={sellerOptions}
              valueExpr="value"
              displayExpr="text"
              value={selectedSellerId}
              searchEnabled
              readOnly={isBusy}
              onValueChanged={(event) => {
                const sellerId = Number(event.value ?? 0)
                setSelectedSellerId(Number.isFinite(sellerId) && sellerId > 0 ? sellerId : 0)
              }}
            />
          ) : null}
          <Button
            icon="revert"
            stylingMode="outlined"
            text={t("RESET", "Hoàn tác")}
            disabled={isBusy || !isDirty}
            onClick={handleReset}
          />
          <Button
            icon="save"
            type="default"
            stylingMode="contained"
            text={t("SAVE", "Lưu")}
            disabled={isBusy || !isDirty}
            onClick={() => void handleSave()}
          />
          <Button
            icon="refresh"
            stylingMode="outlined"
            text={t("REFRESH", "Tải lại")}
            disabled={isBusy}
            onClick={() => void onRefresh()}
          />
        </div>
      </header>

      <div className="einvoice-setting-panel__body">
        <div className="einvoice-setting-panel__stack am-einvoice-editor-form">
          <div className="einvoice-setting-panel__hero">
            <div className="einvoice-setting-panel__hero-name">{sellerName || t("SELLER_NM", "Tên người bán")}</div>
            {taxCode ? (
              <div className="einvoice-setting-panel__hero-meta">
                <span className="einvoice-setting-panel__badge">
                  {t("SELLER_TAX_CODE", "MST")}: {taxCode}
                </span>
              </div>
            ) : null}
          </div>

          <EInvoiceEditorSection title={t("SELLER_GENERAL", "Thông tin chung")}>
            <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
              <SellerField
                className="einvoice-editor__col-12"
                label={t("SELLER_NM", "Tên người bán")}
                value={draft.SELLER_NM}
                disabled={isBusy}
                onValueChanged={(value) => updateField("SELLER_NM", value)}
              />
              <SellerField
                className="einvoice-editor__col-4"
                label={t("SELLER_TAX_CODE", "Mã số thuế")}
                value={taxCode}
                readOnly
                disabled={isBusy}
              />
              <SellerField
                className="einvoice-editor__col-12"
                label={t("SELLER_ADDRESS", "Địa chỉ")}
                value={draft.SELLER_ADDRESS}
                disabled={isBusy}
                onValueChanged={(value) => updateField("SELLER_ADDRESS", value)}
              />
            </div>
          </EInvoiceEditorSection>

          {showBusinessLocation ? (
            <EInvoiceEditorSection title={t("SELLER_DDKDOANH", "Địa điểm kinh doanh")}>
              <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
                <SellerField
                  className="einvoice-editor__col-3"
                  label={t("MDDKDOANH", "Mã địa điểm kinh doanh")}
                  value={draft.MDDKDOANH}
                  disabled={isBusy}
                  onValueChanged={(value) => updateField("MDDKDOANH", value)}
                />
                <SellerField
                  className="einvoice-editor__col-4"
                  label={t("TDDKDOANH", "Tên địa điểm kinh doanh")}
                  value={draft.TDDKDOANH}
                  disabled={isBusy}
                  onValueChanged={(value) => updateField("TDDKDOANH", value)}
                />
                <SellerField
                  className="einvoice-editor__col-5"
                  label={t("DCDDKDOANH", "Địa chỉ địa điểm kinh doanh")}
                  value={draft.DCDDKDOANH}
                  disabled={isBusy}
                  onValueChanged={(value) => updateField("DCDDKDOANH", value)}
                />
              </div>
            </EInvoiceEditorSection>
          ) : null}

          <section className="einvoice-editor__section">
            <button
              type="button"
              className="einvoice-editor__buyer-toggle"
              onClick={() => setStoreExtendedOpen((open) => !open)}
              aria-expanded={storeExtendedOpen}
            >
              <span
                className={`einvoice-editor__buyer-toggle-icon ${storeExtendedOpen ? "is-open" : ""}`}
                aria-hidden="true"
              >
                ▶
              </span>
              {t("SELLER_STORE", "Cửa hàng")}
            </button>
            {storeExtendedOpen ? (
              <div className="einvoice-editor__section-body">
                <div className="einvoice-editor__field-grid einvoice-editor__field-grid--2">
                  <SellerField
                    label={t("MCHANG", "Mã cửa hàng")}
                    value={draft.MCHANG}
                    disabled={isBusy}
                    onValueChanged={(value) => updateField("MCHANG", value)}
                  />
                  <SellerField
                    label={t("TCHANG", "Tên cửa hàng")}
                    value={draft.TCHANG}
                    disabled={isBusy}
                    onValueChanged={(value) => updateField("TCHANG", value)}
                  />
                </div>
              </div>
            ) : null}
          </section>

          <EInvoiceEditorSection title={t("SELLER_CONTACT", "Liên hệ")}>
            <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
              <SellerField
                className="einvoice-editor__col-3"
                label={t("SDTHOAI", "Điện thoại")}
                value={draft.SDTHOAI}
                disabled={isBusy}
                hint={t("SELLER_MULTI_PHONE_HINT", "Nhập nhiều số điện thoại cách nhau bởi dấu chấm phẩy (;).")}
                onValueChanged={(value) => updateField("SDTHOAI", value)}
              />
              <SellerField
                className="einvoice-editor__col-3"
                label={t("DCTDTU", "Email")}
                value={draft.DCTDTU}
                disabled={isBusy}
                onValueChanged={(value) => updateField("DCTDTU", value)}
              />
              <SellerField
                className="einvoice-editor__col-3"
                label={t("FAX", "Fax")}
                value={draft.FAX}
                disabled={isBusy}
                onValueChanged={(value) => updateField("FAX", value)}
              />
              <SellerField
                className="einvoice-editor__col-3"
                label={t("WEBSITE", "Website")}
                value={draft.WEBSITE}
                disabled={isBusy}
                onValueChanged={(value) => updateField("WEBSITE", value)}
              />
            </div>
          </EInvoiceEditorSection>

          <EInvoiceEditorSection title={t("SELLER_BANK", "Ngân hàng")}>
            <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
              <SellerField
                className="einvoice-editor__col-4"
                label={t("STKNHANG", "Số TK ngân hàng")}
                value={draft.STKNHANG}
                disabled={isBusy}
                hint={t("SELLER_MULTI_BANK_ACCOUNT_HINT", "Nhập nhiều số tài khoản cách nhau bởi dấu chấm phẩy (;).")}
                onValueChanged={(value) => updateField("STKNHANG", value)}
              />
              <SellerField
                className="einvoice-editor__col-12"
                label={t("TNHANG", "Tên ngân hàng")}
                value={draft.TNHANG}
                disabled={isBusy}
                hint={t("SELLER_MULTI_BANK_NAME_HINT", "Nhập nhiều tên ngân hàng tương ứng STK, cách nhau bởi dấu chấm phẩy (;).")}
                onValueChanged={(value) => updateField("TNHANG", value)}
              />
            </div>
          </EInvoiceEditorSection>
        </div>
      </div>
    </div>
  )
}
