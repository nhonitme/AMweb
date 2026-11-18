import { downloadUrlFile } from "@/lib/fileUtils"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"

import { getApiErrorMessage } from "@/api/apiTypes"
import {
  buildPublicPitCertificateDownloadUrl,
  lookupPublicPitCertificate,
  type PublicPitCertificateDownloadFormat,
  type PublicPitCertificateLookup,
  type PublicPitCertificateLookupParams,
} from "@/api/publicPitCertificateLookupApi"

const VI = {
  BRAND: "AMNOTE",
  LOOKUP_TITLE: "Tra cứu chứng từ khấu trừ thuế TNCN",
  TAX_CD: "Mã số thuế",
  MTRACUU: "Mã tra cứu",
  TAX_CODE_PLACEHOLDER: "Nhập MST tổ chức trả thu nhập",
  LOOKUP_CODE_PLACEHOLDER: "Nhập mã tra cứu",
  SEARCH: "Tra cứu",
  LOADING: "Đang tra cứu...",
  LOOKUP_NOT_FOUND: "Không tìm thấy chứng từ",
  LOOKUP_EMPTY: "Không có dữ liệu chứng từ",
  PRINT_PDF: "Tải PDF",
  DOWNLOAD_XML: "Tải XML",
  DOC_DATE: "Ngày lập",
  PAYER: "Tổ chức trả thu nhập",
  PAYER_TAX: "MST tổ chức",
  PERSON: "Người nhận thu nhập",
  PERSON_TAX: "MST cá nhân",
  TAX_AMOUNT: "Số thuế đã khấu trừ",
  PREVIEW: "Bản xem PDF",
  PREVIEW_EMPTY: "Chưa có bản xem PDF",
  DEFAULT_TITLE: "Chứng từ khấu trừ thuế thu nhập cá nhân",
} as const

function trimText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function readSearchParam(searchParams: URLSearchParams, keys: string[]): string {
  for (const key of keys) {
    const value = searchParams.get(key)
    if (value?.trim()) return value.trim()
  }
  return ""
}

const TAX_CODE_PARAM_KEYS = ["taxCode", "mst", "sellerTaxCode", "buyerTaxCode", "companyCd", "company", "c"]
const LOOKUP_CODE_PARAM_KEYS = ["mtracuu", "MTRACUU", "code"]

function formatDate(value: string | null | undefined): string {
  const text = trimText(value)
  if (!text) return "-"
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text.slice(0, 10)
  return new Intl.DateTimeFormat("vi-VN").format(date)
}

function formatMoney(value: number | null | undefined): string {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0)
}

function formatDocNo(row: PublicPitCertificateLookup): string {
  const pattern = [row.MSCTU, row.KHCTU].map(trimText).filter(Boolean).join("/")
  const number = row.SCTU != null ? String(row.SCTU).padStart(8, "0") : ""
  if (pattern && number) return `${pattern} - Số ${number}`
  return pattern || number || "-"
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 min-h-6 break-words text-sm font-medium text-slate-900">{value || "-"}</div>
    </div>
  )
}

function requiredFieldVi(label: string): string {
  return `Vui lòng nhập ${label}`
}

export default function PublicPitCertificateLookupPage() {
  const { taxCode: routeTaxCode } = useParams<{ taxCode: string }>()
  const [searchParams] = useSearchParams()

  const routeTaxCodeText = trimText(routeTaxCode)
  const [taxCodeInput, setTaxCodeInput] = useState(() => readSearchParam(searchParams, TAX_CODE_PARAM_KEYS))
  const taxCode = routeTaxCodeText || trimText(taxCodeInput)
  const showTaxCodeInput = !routeTaxCodeText
  const [lookupCode, setLookupCode] = useState(() => readSearchParam(searchParams, LOOKUP_CODE_PARAM_KEYS).toUpperCase())
  const [certificate, setCertificate] = useState<PublicPitCertificateLookup | null>(null)
  const [downloadParams, setDownloadParams] = useState<PublicPitCertificateLookupParams | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!routeTaxCodeText) {
      const queryTaxCode = readSearchParam(searchParams, TAX_CODE_PARAM_KEYS)
      if (queryTaxCode) setTaxCodeInput(queryTaxCode)
    }
    const queryCode = readSearchParam(searchParams, LOOKUP_CODE_PARAM_KEYS)
    if (queryCode) setLookupCode(queryCode.toUpperCase())
  }, [routeTaxCodeText, searchParams])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const mtracuu = lookupCode.trim().toUpperCase()
      if (!taxCode) {
        setError(requiredFieldVi(VI.TAX_CD))
        return
      }
      if (!mtracuu) {
        setError(requiredFieldVi(VI.MTRACUU))
        return
      }

      setLoading(true)
      setSearched(true)
      setError("")
      setCertificate(null)
      setDownloadParams(null)

      try {
        const data = await lookupPublicPitCertificate({ taxCode, mtracuu })
        setCertificate(data)
        setDownloadParams({ taxCode, mtracuu })
      } catch (lookupError) {
        setError(getApiErrorMessage(lookupError, VI.LOOKUP_NOT_FOUND))
      } finally {
        setLoading(false)
      }
    },
    [taxCode, lookupCode],
  )

  const openDownload = useCallback(
    (format: PublicPitCertificateDownloadFormat) => {
      if (!downloadParams) return
      void downloadUrlFile(buildPublicPitCertificateDownloadUrl({ ...downloadParams, format }), `pit-certificate.${format}`)
    },
    [downloadParams],
  )

  const canDownloadPdf = certificate?.CAN_DOWNLOAD_PDF !== false
  const canDownloadXml = certificate?.CAN_DOWNLOAD_XML !== false
  const pdfUrl = useMemo(
    () => (certificate && downloadParams
      ? `${buildPublicPitCertificateDownloadUrl({ ...downloadParams, format: "pdf" })}&revision=${encodeURIComponent(trimText(certificate.MTRACUU))}`
      : ""),
    [certificate, downloadParams],
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">{VI.BRAND}</div>
          <h1 className="text-2xl font-semibold">{VI.LOOKUP_TITLE}</h1>
          <div className="text-sm text-slate-600">{VI.TAX_CD}: {taxCode || "-"}</div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <form className={`grid gap-3 ${showTaxCodeInput ? "lg:grid-cols-[240px_1fr_auto]" : "lg:grid-cols-[1fr_auto]"}`} onSubmit={handleSubmit}>
            {showTaxCodeInput ? (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-700">{VI.TAX_CD}</span>
                <input
                  className="h-11 rounded border border-slate-300 px-3 text-sm font-semibold uppercase tracking-wide outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  value={taxCodeInput}
                  placeholder={VI.TAX_CODE_PLACEHOLDER}
                  autoComplete="off"
                  onChange={(event) => setTaxCodeInput(event.target.value.toUpperCase())}
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">{VI.MTRACUU}</span>
              <input
                className="h-11 rounded border border-slate-300 px-3 text-sm font-semibold uppercase tracking-wide outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={lookupCode}
                placeholder={VI.LOOKUP_CODE_PLACEHOLDER}
                autoComplete="off"
                onChange={(event) => setLookupCode(event.target.value.toUpperCase())}
              />
            </label>

            <button
              type="submit"
              className="mt-0 h-11 rounded bg-teal-700 px-6 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-6"
              disabled={loading}
            >
              {loading ? VI.LOADING : VI.SEARCH}
            </button>
          </form>

          {error ? <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </section>

        {certificate ? (
          <section className="rounded border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">{trimText(certificate.MTRACUU)}</div>
                <h2 className="mt-1 text-lg font-semibold">{formatDocNo(certificate)}</h2>
                <div className="mt-1 text-sm text-slate-600">{trimText(certificate.TCTU) || VI.DEFAULT_TITLE}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canDownloadPdf}
                  onClick={() => openDownload("pdf")}
                >
                  {VI.PRINT_PDF}
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canDownloadXml}
                  onClick={() => openDownload("xml")}
                >
                  {VI.DOWNLOAD_XML}
                </button>
              </div>
            </div>

            <div className="grid gap-4 border-b border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-4">
              <FieldValue label={VI.DOC_DATE} value={formatDate(certificate.NLAP)} />
              <FieldValue label={VI.PAYER} value={trimText(certificate.TCTTNHAP_TEN)} />
              <FieldValue label={VI.PAYER_TAX} value={trimText(certificate.TCTTNHAP_MST)} />
              <FieldValue label={VI.TAX_AMOUNT} value={`${formatMoney(certificate.STHUE)} VND`} />
              <FieldValue label={VI.PERSON} value={trimText(certificate.NNT_TEN)} />
              <FieldValue label={VI.PERSON_TAX} value={trimText(certificate.NNT_MST)} />
            </div>

            <div className="bg-slate-100 p-4">
              {pdfUrl ? (
                <iframe title={VI.PREVIEW} className="h-[75vh] w-full rounded border border-slate-300 bg-white" src={pdfUrl} />
              ) : (
                <div className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                  {VI.PREVIEW_EMPTY}
                </div>
              )}
            </div>
          </section>
        ) : searched && !loading && !error ? (
          <section className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            {VI.LOOKUP_EMPTY}
          </section>
        ) : null}
      </main>
    </div>
  )
}
