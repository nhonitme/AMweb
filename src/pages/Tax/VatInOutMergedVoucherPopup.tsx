import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import SelectBox from "devextreme-react/select-box"
import notify from "devextreme/ui/notify"
import { useLocation } from "react-router-dom"

import { fetchCustomerLookup } from "@/api/lookupApi"
import { linkGdtInvoicesToVoucher } from "@/api/gdtImportApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { createChit, updateChit } from "@/api/voucherApi"
import { clearSysCodeSequencePreviewCache } from "@/api/sysCodeSequenceApi"
import { LanguageContext } from "@/lib/i18nLoader"
import ChitEditorPopup from "@/pages/VoucherManagement/components/ChitEditorPopup"
import { getChitTypeLabel, getVoucherRouteByChitType, mapChitToApiPayload, normalizeChitRows } from "@/pages/VoucherManagement/chitUtils"
import type { AfterAccountingSave } from "@/pages/VoucherManagement/components/useRowInventoryEditor"
import type { CustomerExt } from "@/types/customerExt"
import type { ChitInfo, ChitType } from "@/types/voucher"

import {
  applyInvoiceCustomerMatch,
  buildVatVoucherDraft,
  getDefaultVatVoucherType,
  getVatInvoiceKey,
  type VatInvoiceRow,
  type VatInvoiceType,
  type VatVoucherType,
} from "./vatInvoiceVoucherDraft"

type Props = {
  visible: boolean
  invoiceType: VatInvoiceType
  invoices: VatInvoiceRow[]
  loadInventoryDetail: boolean
  onClose: () => void
  onSaved: () => void | Promise<void>
}

export default function VatInOutMergedVoucherPopup({ visible, invoiceType, invoices, loadInventoryDetail, onClose, onSaved }: Props) {
  const { translate } = useContext(LanguageContext) as { translate?: (key: string, fallback: string) => string }
  const location = useLocation()
  const t = useCallback((key: string, fallback: string) => translate ? translate(key, fallback) : fallback, [translate])
  const [saving, setSaving] = useState(false)
  const [voucherType, setVoucherType] = useState<VatVoucherType>(() => getDefaultVatVoucherType(invoiceType))
  const [customerLookup, setCustomerLookup] = useState<CustomerExt[]>([])
  const [savedRecord, setSavedRecord] = useState<ChitInfo | null>(null)
  const [isUpdate, setIsUpdate] = useState(false)
  const [linkedInvoiceKeys, setLinkedInvoiceKeys] = useState<string[]>([])

  useEffect(() => {
    if (!visible) return
    setVoucherType(getDefaultVatVoucherType(invoiceType))
    setCustomerLookup([])
    setSavedRecord(null)
    setIsUpdate(false)
    setLinkedInvoiceKeys([])
  }, [invoiceType, invoices, visible])

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    void fetchCustomerLookup()
      .then((customers) => { if (!cancelled) setCustomerLookup(customers) })
      .catch((error: unknown) => {
        if (!cancelled) notify(getApiErrorMessage(error, "Không tải được danh mục khách hàng."), "error", 4500)
      })
    return () => { cancelled = true }
  }, [visible])

  const record = useMemo(
    () => invoices.length > 0 ? buildVatVoucherDraft(invoices, invoiceType, voucherType) : null,
    [invoices, invoiceType, voucherType],
  )
  const matchedRecord = useMemo(
    () => record ? applyInvoiceCustomerMatch(record, invoices, invoiceType, customerLookup) : null,
    [customerLookup, invoiceType, invoices, record],
  )
  const ledger = invoiceType === "BUY" ? "AP" : "AR"
  const chitType: ChitType = voucherType
  const voucherRoute = getVoucherRouteByChitType(chitType)
  const routePrefix = location.pathname.split("/tax/")[0]
  const editorScreenCd = voucherRoute ? `${routePrefix}${voucherRoute}` : location.pathname
  const voucherTypeOptions = invoiceType === "BUY"
    ? [
      { value: "PO", label: t("PURCHASE_VOUCHER", "Phiếu mua hàng") },
      { value: "PS", label: t("PURCHASE_SERVICE_VOUCHER", "Phiếu mua dịch vụ") },
    ]
    : [{ value: "SO", label: t("SALES_VOUCHER", "Phiếu bán hàng") }]

  const handleSave = useCallback(async (editedRecord: ChitInfo, afterSave?: AfterAccountingSave) => {
    setSaving(true)
    let persisted: ChitInfo | null = null
    try {
      const payload = mapChitToApiPayload(editedRecord)
      const result = isUpdate
        ? await updateChit(ledger, payload, chitType)
        : await createChit(ledger, payload, chitType)
      if (!isUpdate) clearSysCodeSequencePreviewCache()

      persisted = normalizeChitRows(result.data ? [result.data] : [], chitType)[0] ?? null
      if (!persisted) throw new Error("Không nhận được chứng từ sau khi lưu.")
      persisted.DETAILS = persisted.DETAILS.map((detail) => ({
        ...detail,
        ROW_KEY: editedRecord.DETAILS.find((row) => Number(row.SORT) === Number(detail.SORT))?.ROW_KEY ?? detail.ROW_KEY,
      }))
      setSavedRecord(persisted)
      setIsUpdate(true)

      const invoiceKeys = invoices.map(getVatInvoiceKey)
      const linked = new Set(linkedInvoiceKeys)
      const pendingLinks = invoiceKeys.filter((key) => !linked.has(key)).map((Mhdon) => ({
        Mhdon,
        ChitCd: String(persisted?.CHIT_CD ?? "").trim(),
      }))
      if (pendingLinks.some((item) => !item.ChitCd)) throw new Error("Không nhận được mã chứng từ để liên kết hóa đơn.")
      if (pendingLinks.length > 0) {
        const linkResults = await linkGdtInvoicesToVoucher(invoiceType, pendingLinks)
        linkResults.forEach((item) => {
          if (["LINKED", "ALREADY_LINKED"].includes(String(item.Status ?? "").toUpperCase())) linked.add(item.Mhdon)
        })
      }
      setLinkedInvoiceKeys(Array.from(linked))

      const keepOpenForInventory = afterSave ? (await afterSave(persisted, editedRecord)) === true : false
      if (linked.size === invoiceKeys.length) {
        notify("Đã lưu và liên kết chứng từ.", "success", 3000)
        await onSaved()
        if (!keepOpenForInventory) onClose()
      } else {
        notify(`Đã lưu chứng từ ${persisted.CHIT_CD}, còn hóa đơn chưa liên kết. Bấm Lưu để thử lại liên kết.`, "warning", 5000)
      }
    } catch (error) {
      if (persisted) {
        setSavedRecord(persisted)
        setIsUpdate(true)
      }
      notify(getApiErrorMessage(error, "Không lưu được chứng từ."), "error", 5000)
    } finally {
      setSaving(false)
    }
  }, [chitType, invoices, isUpdate, ledger, linkedInvoiceKeys, onClose, onSaved, invoiceType])

  if (!visible || !matchedRecord) return null

  return <ChitEditorPopup
    visible={visible}
    value={savedRecord ?? matchedRecord}
    ledger={ledger}
    chitType={chitType}
    voucherLabel={getChitTypeLabel(chitType, t)}
    screenCd={editorScreenCd}
    showInventoryLinkActions={loadInventoryDetail && invoiceType === "SELL"}
    quickCreateCustomer={false}
    headerContent={invoiceType === "BUY" ? (
      <SelectBox
        dataSource={voucherTypeOptions}
        displayExpr="label"
        valueExpr="value"
        value={voucherType}
        stylingMode="outlined"
        label={t("CHIT_TYPE", "Loại phiếu")}
        labelMode="floating"
        width={280}
        disabled={saving || isUpdate}
        onValueChanged={(event) => setVoucherType(String(event.value ?? getDefaultVatVoucherType(invoiceType)) as VatVoucherType)}
      />
    ) : undefined}
    isUpdate={isUpdate}
    loading={saving}
    onClose={onClose}
    onSave={handleSave}
  />
}
