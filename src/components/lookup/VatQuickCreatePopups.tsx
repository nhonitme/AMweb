import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import Popup from "devextreme-react/popup"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"

import { getApiErrorMessage } from "@/api/apiTypes"
import { checkCodeExists } from "@/api/lookupApi"
import type { Product } from "@/types/product"
import type { CustomerExt } from "@/types/customerExt"
import { normalizeCustomerExt } from "@/pages/Module/CustomerManagementPage/customerExtUtils"
import { createDefaultCustomerExt, mapCustomerExtToApiPayload } from "@/pages/Module/CustomerManagementPage/customerExtUtils"
import { unitLookupStore } from "@/components/lookup/unitLookupStore"
import { createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import { getSequencePreviewCode } from "@/lib/codeSequence"
import { useSysCodes } from "@/lib/sysCodeContext"
import type { SysCode } from "@/api/sysCodeService"
import type { Unit } from "@/types/unit"
import { useCustomerExtMutations } from "@/hooks/queries/master/masterDataQueries"
import { useProductMutations } from "@/hooks/queries/master/useProductListQuery"

type CustomerSeed = { name?: string; taxCode?: string; address?: string }

type CustomerQuickCreateProps = {
  visible: boolean
  seed: CustomerSeed
  onClose: () => void
  onSaved: (customer: CustomerExt) => void
}

function QuickCreateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm text-slate-700">
      <span>{label}</span>
      <TextBox value={value} valueChangeEvent="input" onValueChanged={(event) => onChange(String(event.value ?? ""))} {...createOutlinedEditorOptions({})} />
    </label>
  )
}

export function VatCustomerQuickCreatePopup({ visible, seed, onClose, onSaved }: CustomerQuickCreateProps) {
  const { translate, lang } = useContext(LanguageContext) as { translate?: (key: string, fallback?: string) => string; lang?: string }
  const t = useCallback((key: string, fallback: string) => translate ? translate(key, fallback) : fallback, [translate])
  const { getCodesByType } = useSysCodes()
  const { createMutation } = useCustomerExtMutations(lang ?? "VIET")
  const [draft, setDraft] = useState(() => ({
    CUSTOMER_CD: "",
    CATEGORY_CD: "",
    CUSTOMER_TYPE: "",
    CUSTOMER_NM_VIET: "",
    TAX_CD: "",
    ADDRESS: "",
  }))
  const [saving, setSaving] = useState(false)
  const categoryOptions = useMemo(() => getCodesByType("CATEGORY_CD") ?? [], [getCodesByType])
  const customerTypeOptions = useMemo(() => getCodesByType("CUSTOMER_TYPE") ?? [], [getCodesByType])

  useEffect(() => {
    if (!visible) return
    setDraft({
      CUSTOMER_CD: "",
      CATEGORY_CD: "",
      CUSTOMER_TYPE: "",
      CUSTOMER_NM_VIET: seed.name?.trim() ?? "",
      TAX_CD: seed.taxCode?.trim() ?? "",
      ADDRESS: seed.address?.trim() ?? "",
    })
    let cancelled = false
    void getSequencePreviewCode("MD_CUSTOMER", "CUSTOMER_CD")
      .then((code) => {
        if (!cancelled && code) setDraft((current) => current.CUSTOMER_CD ? current : { ...current, CUSTOMER_CD: code })
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [seed.address, seed.name, seed.taxCode, visible])

  const handleSave = useCallback(async () => {
    if (!draft.CUSTOMER_CD.trim() || !draft.CATEGORY_CD || !draft.CUSTOMER_TYPE || !draft.CUSTOMER_NM_VIET.trim()) {
      notify(t("MSG_MUST_ITEM", "Vui lòng nhập các trường bắt buộc."), "warning", 2500)
      return
    }
    setSaving(true)
    try {
      if (await checkCodeExists("customer", draft.CUSTOMER_CD.trim())) {
        notify(t("MSG_CODE_EXISTS", "Mã khách hàng đã tồn tại."), "warning", 3000)
        return
      }
      const base = createDefaultCustomerExt(getCurrentCompanyCd())
      const response = await createMutation.mutateAsync(mapCustomerExtToApiPayload({
        ...base,
        ...draft,
        CUSTOMER_CD: draft.CUSTOMER_CD.trim(),
        CUSTOMER_NM_VIET: draft.CUSTOMER_NM_VIET.trim(),
        TAX_CD: draft.TAX_CD.trim(),
        ADDRESS: draft.ADDRESS.trim(),
      }))
      if (!response.data || response.data.CUSTOMER_ID == null) throw new Error(response.message || t("INSERT_FAILED", "Không tạo được khách hàng."))
      const customer = normalizeCustomerExt(response.data)
      notify(t("MSG_INSERT_SUCCESS", "Tạo khách hàng thành công."), "success", 2500)
      onSaved(customer)
      onClose()
    } catch (error) {
      notify(getApiErrorMessage(error, t("INSERT_FAILED", "Tạo khách hàng thất bại.")), "error", 4000)
    } finally {
      setSaving(false)
    }
  }, [createMutation, draft, onClose, onSaved, t])

  const toOptions = (codes: SysCode[]) => codes.map((item) => ({ value: item.CODE_CD, label: translate ? translate(item.CODE_NAME, item.CODE_NAME) : item.CODE_NAME }))

  return (
    <Popup visible={visible} title={t("ADD_CUSTOMER", "Tạo nhanh khách hàng")} showTitle showCloseButton width="min(680px, 94vw)" height="auto" dragEnabled={false} hideOnOutsideClick={!saving} onHiding={onClose}>
      <div className="flex flex-col gap-3 p-2">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <QuickCreateField label={t("CUSTOMER_CD", "Mã khách hàng *")} value={draft.CUSTOMER_CD} onChange={(CUSTOMER_CD) => setDraft((current) => ({ ...current, CUSTOMER_CD }))} />
          <SelectBox dataSource={toOptions(categoryOptions)} valueExpr="value" displayExpr="label" value={draft.CATEGORY_CD} searchEnabled label={t("CATEGORY_CD", "Nhóm khách hàng *")} labelMode="floating" stylingMode="outlined" onValueChanged={(event) => setDraft((current) => ({ ...current, CATEGORY_CD: String(event.value ?? "") }))} />
          <SelectBox dataSource={toOptions(customerTypeOptions)} valueExpr="value" displayExpr="label" value={draft.CUSTOMER_TYPE} searchEnabled label={t("CUSTOMER_TYPE", "Loại khách hàng *")} labelMode="floating" stylingMode="outlined" onValueChanged={(event) => setDraft((current) => ({ ...current, CUSTOMER_TYPE: String(event.value ?? "") }))} />
          <QuickCreateField label={t("CUSTOMER_NM_VIET", "Tên khách hàng *")} value={draft.CUSTOMER_NM_VIET} onChange={(CUSTOMER_NM_VIET) => setDraft((current) => ({ ...current, CUSTOMER_NM_VIET }))} />
          <QuickCreateField label={t("TAX_CD", "Mã số thuế")} value={draft.TAX_CD} onChange={(TAX_CD) => setDraft((current) => ({ ...current, TAX_CD }))} />
          <QuickCreateField label={t("ADDRESS", "Địa chỉ")} value={draft.ADDRESS} onChange={(ADDRESS) => setDraft((current) => ({ ...current, ADDRESS }))} />
        </div>
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button text={t("CANCEL", "Hủy")} stylingMode="outlined" disabled={saving} onClick={onClose} />
          <Button text={t("SAVE_AND_SELECT", "Lưu và chọn")} type="default" stylingMode="contained" disabled={saving} onClick={() => void handleSave()} />
        </div>
      </div>
    </Popup>
  )
}

type ProductQuickCreateProps = {
  visible: boolean
  name: string
  unitName: string
  onClose: () => void
  onSaved: (product: Product) => void
}

export function VatProductQuickCreatePopup({ visible, name, unitName, onClose, onSaved }: ProductQuickCreateProps) {
  const { translate } = useContext(LanguageContext) as { translate?: (key: string, fallback?: string) => string }
  const t = useCallback((key: string, fallback: string) => translate ? translate(key, fallback) : fallback, [translate])
  const { createMutation } = useProductMutations()
  const [productCd, setProductCd] = useState("")
  const [productName, setProductName] = useState("")
  const [unitId, setUnitId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setProductCd("")
    setProductName(name.trim())
    setUnitId(null)
    let cancelled = false
    void getSequencePreviewCode("MD_INVENTORY", "PRODUCT_CD")
      .then((code) => {
        if (!cancelled && code) setProductCd((current) => current || code)
      })
      .catch(() => undefined)
    if (unitName.trim()) {
      void unitLookupStore.load().then((units: Unit[]) => {
        const normalized = unitName.trim().toLocaleLowerCase()
        const match = units.find((unit) => unit.UNIT_CD.trim().toLocaleLowerCase() === normalized)
          ?? units.find((unit) => unit.UNIT_NM.trim().toLocaleLowerCase() === normalized)
        if (!cancelled && match) setUnitId(match.UNIT_ID)
      }).catch(() => undefined)
    }
    return () => { cancelled = true }
  }, [name, unitName, visible])

  const handleSave = useCallback(async () => {
    if (!productCd.trim() || !productName.trim() || !unitId) {
      notify(t("MSG_MUST_ITEM", "Vui lòng nhập mã, tên và đơn vị tính."), "warning", 2500)
      return
    }
    setSaving(true)
    try {
      if (await checkCodeExists("product", productCd.trim())) {
        notify(t("MSG_CODE_EXISTS", "Mã sản phẩm đã tồn tại."), "warning", 3000)
        return
      }
      const response = await createMutation.mutateAsync({
        COMPANY_CD: getCurrentCompanyCd(),
        PRODUCT_CD: productCd.trim(),
        PRODUCT_NM_VIET: productName.trim(),
        PRODUCT_NM_ENG: "",
        PRODUCT_NM_KOR: "",
        PRODUCT_NM_CHINA: "",
        PRODUCT_KIND_ID: null,
        UNIT_ID: unitId,
        STORE_ID: null,
        DIVISION: null,
        SUMMARY: "",
      })
      if (response.Success === false) throw new Error(response.Message || t("INSERT_FAILED", "Không tạo được sản phẩm."))
      const product = response.Data
      if (!product || !Number(product.PRODUCT_ID)) throw new Error(response.Message || t("INSERT_FAILED", "Không nhận được mã sản phẩm vừa tạo."))
      notify(t("MSG_INSERT_SUCCESS", "Tạo sản phẩm thành công."), "success", 2500)
      onSaved(product)
      onClose()
    } catch (error) {
      notify(getApiErrorMessage(error, t("INSERT_FAILED", "Tạo sản phẩm thất bại.")), "error", 4000)
    } finally {
      setSaving(false)
    }
  }, [createMutation, onClose, onSaved, productCd, productName, t, unitId])

  return (
    <Popup visible={visible} title={t("PRODUCT", "Tạo nhanh sản phẩm/dịch vụ")} showTitle showCloseButton width="min(620px, 94vw)" height="auto" dragEnabled={false} hideOnOutsideClick={!saving} onHiding={onClose}>
      <div className="flex flex-col gap-3 p-2">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex min-w-0 flex-col gap-1 text-sm text-slate-700"><span>{t("PRODUCT_CD", "Mã sản phẩm *")}</span><TextBox value={productCd} valueChangeEvent="input" onValueChanged={(event) => setProductCd(String(event.value ?? ""))} {...createOutlinedEditorOptions({})} /></label>
          <label className="flex min-w-0 flex-col gap-1 text-sm text-slate-700"><span>{t("PRODUCT_NM_VIET", "Tên sản phẩm/dịch vụ *")}</span><TextBox value={productName} valueChangeEvent="input" onValueChanged={(event) => setProductName(String(event.value ?? ""))} {...createOutlinedEditorOptions({})} /></label>
          <SelectBox dataSource={unitLookupStore} valueExpr="UNIT_ID" displayExpr={(item: Unit | null) => item ? `${item.UNIT_CD} - ${item.UNIT_NM}` : ""} value={unitId} searchEnabled searchExpr={["UNIT_CD", "UNIT_NM"]} label={unitName ? `${t("UNIT_NM", "Đơn vị tính *")} · ${t("INVOICE_UNIT", "Hóa đơn")}: ${unitName}` : t("UNIT_NM", "Đơn vị tính *")} labelMode="floating" stylingMode="outlined" placeholder={t("SELECT", "Chọn đơn vị tính")} onValueChanged={(event) => setUnitId(event.value == null ? null : Number(event.value))} />
        </div>
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button text={t("CANCEL", "Hủy")} stylingMode="outlined" disabled={saving} onClick={onClose} />
          <Button text={t("SAVE_AND_SELECT", "Lưu và chọn")} type="default" stylingMode="contained" disabled={saving} onClick={() => void handleSave()} />
        </div>
      </div>
    </Popup>
  )
}
