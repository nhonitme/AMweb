import { FormEvent, useCallback, useContext, useMemo, useState } from "react"
import notify from "devextreme/ui/notify"
import LoadPanel from "devextreme-react/load-panel"
import { useNavigate } from "react-router-dom"

import { lookupEInvoiceByCode } from "@/api/einvoiceApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import { formatYmdForDisplay } from "@/pages/Accounting/accountingDateUtils"
import { useSysCodes } from "@/lib/sysCodeContext"
import type { EInvoice } from "@/types/einvoice"
import {
  buildInvoiceStatusOptions,
  EINV_INVOICE_STATUS_CODE_TYPE,
  formatEInvoiceDisplayNo,
  formatEInvoiceInvoiceStatusText,
  formatEInvoiceSignedLabel,
  isEInvoiceSigned,
  normalizeEInvoice,
} from "./einvoiceModel"
import { fieldRequiredMessage } from "./einvoiceI18n"
import { openEInvoiceReportViewer } from "./einvoiceReportViewer"

function trimText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function formatMoney(value: number | null | undefined, currencyCode: string): string {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: currencyCode.toUpperCase() === "VND" ? 0 : 6,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 min-h-6 break-words text-sm font-medium text-slate-900">{value || "-"}</div>
    </div>
  )
}

export default function EInvoiceLookupPage() {
  const navigate = useNavigate()
  const companyCd = getCurrentCompanyCd()
  const [lookupCode, setLookupCode] = useState("")
  const [invoice, setInvoice] = useState<EInvoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback((key: string, fallback: string) => (translate ? translate(key, fallback) : fallback), [translate])
  const { getCodesByType } = useSysCodes()
  const invoiceStatusOptions = useMemo(
    () => buildInvoiceStatusOptions(getCodesByType(EINV_INVOICE_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const handleSearch = useCallback(async () => {
    const code = lookupCode.trim()
    if (!code) {
      notify(fieldRequiredMessage(t, "MTRACUU", "Mã tra cứu"), "warning", 2500)
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const response = await lookupEInvoiceByCode(code)
      setInvoice(normalizeEInvoice(response.data, companyCd))
    } catch (error) {
      setInvoice(null)
      notify(getApiErrorMessage(error, t("LOOKUP_NOT_FOUND", "Không tìm thấy hóa đơn")), "error", 4000)
    } finally {
      setLoading(false)
    }
  }, [companyCd, lookupCode, t])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void handleSearch()
    },
    [handleSearch],
  )

  const openPreview = useCallback(() => {
    const invoiceId = Number(invoice?.INVOICE_ID ?? 0)
    if (invoiceId <= 0) {
      return
    }

    void openEInvoiceReportViewer({
      invoiceIds: [invoiceId],
      companyCd,
      printRequest: { mode: "normal" },
      notifyUnableToOpen: (message) => notify(message, "error", 4000),
      notifyInfo: (message) => notify(message, "info", 8000),
      notifySuccess: (message) => notify(message, "success", 4000),
    })
  }, [companyCd, invoice?.INVOICE_ID])

  const openManagePage = useCallback(() => {
    const invoiceId = Number(invoice?.INVOICE_ID ?? 0)
    if (invoiceId <= 0) {
      return
    }

    navigate(buildAppPath(companyCd, `/einvoice/manage?invoiceId=${invoiceId}`))
  }, [companyCd, invoice?.INVOICE_ID, navigate])

  const signedLabel = invoice
    ? formatEInvoiceSignedLabel(invoice, t("IS_SIGNED", "Signed"), t("SIGNED_NO", "Not signed"))
    : ""
  const statusLabel = invoice ? formatEInvoiceInvoiceStatusText(invoice.INVOICE_STATUS, invoiceStatusOptions) : ""
  const activeDetails = invoice?.DETAILS.filter((detail) => Number(detail.ISDEL ?? 0) !== 1) ?? []

  return (
    <DxPage>
      <div className="relative flex min-h-full flex-col gap-4 overflow-auto bg-slate-50 p-4">
        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{t("LOOKUP_TITLE", "Tra cứu hóa đơn điện tử")}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {t("LOOKUP_DESC", "Nhập mã tra cứu in trên hóa đơn để xem nhanh thông tin hóa đơn.")}
              </p>
            </div>

            <form className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row" onSubmit={handleSubmit}>
              <input
                className="h-10 min-w-0 flex-1 rounded border border-slate-300 px-3 text-sm font-medium uppercase tracking-wide outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={lookupCode}
                placeholder={t("MTRACUU", "Mã tra cứu")}
                onChange={(event) => setLookupCode(event.target.value.toUpperCase())}
              />
              <button
                type="submit"
                className="h-10 rounded bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {t("SEARCH", "Tìm kiếm")}
              </button>
            </form>
          </div>
        </section>

        {invoice ? (
          <section className="rounded border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">{trimText(invoice.MTRACUU)}</div>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{formatEInvoiceDisplayNo(invoice) || "-"}</h2>
                <div className="mt-1 text-sm text-slate-600">
                  {signedLabel} · {statusLabel}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={openManagePage}>
                  {t("OPEN_DETAIL", "Mở chi tiết")}
                </button>
                <button className="rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600" onClick={openPreview}>
                  {t("PRINT_PDF", "Xem/In hóa đơn")}
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
              <FieldValue label={t("NLAP", "Ngày lập")} value={formatYmdForDisplay(invoice.NLAP)} />
              <FieldValue label={t("SELLER_NM", "Người bán")} value={trimText(invoice.SELLER_NM)} />
              <FieldValue label={t("SELLER_TAX_CD", "MST người bán")} value={trimText(invoice.SELLER_TAX_CD)} />
              <FieldValue label={t("MCCQT", "Mã cơ quan thuế")} value={trimText(invoice.MCCQT)} />
              <FieldValue label={t("NMUA_TEN", "Tên người mua")} value={trimText(invoice.NMUA_TEN)} />
              <FieldValue label={t("NMUA_MST", "MST người mua")} value={trimText(invoice.NMUA_MST)} />
              <FieldValue label={t("DVTTE", "Tiền tệ")} value={trimText(invoice.DVTTE)} />
              <FieldValue label={t("TGTTTBSO", "Tổng thanh toán")} value={`${formatMoney(invoice.TGTTTBSO, invoice.DVTTE)} ${invoice.DVTTE}`} />
            </div>

            <div className="overflow-auto border-t border-slate-200">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="w-16 px-4 py-3 text-center">{t("STT", "STT")}</th>
                    <th className="px-4 py-3">{t("THHDVU", "Tên hàng hóa, dịch vụ")}</th>
                    <th className="px-4 py-3">{t("DVTINH", "ĐVT")}</th>
                    <th className="px-4 py-3 text-right">{t("SLUONG", "Số lượng")}</th>
                    <th className="px-4 py-3 text-right">{t("DGIA", "Đơn giá")}</th>
                    <th className="px-4 py-3 text-right">{t("THTIEN", "Thành tiền")}</th>
                    <th className="px-4 py-3">{t("TSUAT", "Thuế suất")}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDetails.map((detail, index) => (
                    <tr key={detail.ROW_KEY || detail.DETAIL_ID || index} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-center text-slate-600">{detail.STT || index + 1}</td>
                      <td className="min-w-72 px-4 py-3 font-medium text-slate-900">{trimText(detail.THHDVU) || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{trimText(detail.DVTINH) || "-"}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatMoney(detail.SLUONG, invoice.DVTTE)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatMoney(detail.DGIA, invoice.DVTTE)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatMoney(detail.THTIEN, invoice.DVTTE)}</td>
                      <td className="px-4 py-3 text-slate-600">{trimText(detail.TSUAT) || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : searched && !loading ? (
          <section className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            {t("LOOKUP_EMPTY", "Không có hóa đơn phù hợp với mã tra cứu đã nhập.")}
          </section>
        ) : null}

        <LoadPanel visible={loading} showIndicator={true} showPane={true} shading={true} shadingColor="rgba(15, 23, 42, 0.15)" />
      </div>
    </DxPage>
  )
}
