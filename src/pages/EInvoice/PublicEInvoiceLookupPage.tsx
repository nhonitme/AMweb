import { downloadUrlFile } from "@/lib/fileUtils"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"

import { getApiErrorMessage } from "@/api/apiTypes"
import {
  buildPublicEInvoiceDownloadUrl,
  lookupPublicEInvoice,
  type PublicEInvoiceDownloadFormat,
  type PublicEInvoiceLookup,
  type PublicEInvoiceLookupParams,
} from "@/api/publicEInvoiceLookupApi"

import { PUBLIC_VI, requiredFieldVi } from "./publicEInvoiceVi"

function trimText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function readSearchParam(searchParams: URLSearchParams, keys: string[]): string {
  for (const key of keys) {
    const value = searchParams.get(key)
    if (value?.trim()) {
      return value.trim()
    }
  }

  return ""
}

const TAX_CODE_PARAM_KEYS = ["taxCode", "mst", "sellerTaxCode", "buyerTaxCode", "companyCd", "company", "c"]
const LOOKUP_CODE_PARAM_KEYS = ["mtracuu", "MTRACUU", "code"]

function formatDate(value: string | null | undefined): string {
  const text = trimText(value)
  if (!text) {
    return "-"
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) {
    return text.slice(0, 10)
  }

  return new Intl.DateTimeFormat("vi-VN").format(date)
}

function formatMoney(value: number | null | undefined, currencyCode: string | null | undefined): string {
  const currency = trimText(currencyCode).toUpperCase() || "VND"
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: currency === "VND" ? 0 : 6,
  }).format(Number.isFinite(amount) ? amount : 0)
}

function formatInvoiceNo(invoice: PublicEInvoiceLookup): string {
  const pattern = [invoice.KHMSHDON, invoice.KHHDON].map(trimText).filter(Boolean).join("/")
  const number = trimText(invoice.SHDON)
  if (pattern && number) {
    return `${pattern} - ${PUBLIC_VI.INVOICE_NO} ${number}`
  }

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

export default function PublicEInvoiceLookupPage() {
  const { taxCode: routeTaxCode } = useParams<{ taxCode: string }>()
  const [searchParams] = useSearchParams()

  const routeTaxCodeText = trimText(routeTaxCode)
  const [taxCodeInput, setTaxCodeInput] = useState(() => readSearchParam(searchParams, TAX_CODE_PARAM_KEYS))
  const taxCode = routeTaxCodeText || trimText(taxCodeInput)
  const showTaxCodeInput = !routeTaxCodeText
  const [lookupCode, setLookupCode] = useState(() => readSearchParam(searchParams, LOOKUP_CODE_PARAM_KEYS).toUpperCase())
  const [invoice, setInvoice] = useState<PublicEInvoiceLookup | null>(null)
  const [downloadParams, setDownloadParams] = useState<PublicEInvoiceLookupParams | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!routeTaxCodeText) {
      const queryTaxCode = readSearchParam(searchParams, TAX_CODE_PARAM_KEYS)
      if (queryTaxCode) {
        setTaxCodeInput(queryTaxCode)
      }
    }

    const queryCode = readSearchParam(searchParams, LOOKUP_CODE_PARAM_KEYS)
    if (queryCode) {
      setLookupCode(queryCode.toUpperCase())
    }
  }, [routeTaxCodeText, searchParams])

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const mtracuu = lookupCode.trim().toUpperCase()
      if (!taxCode) {
        setError(requiredFieldVi(PUBLIC_VI.TAX_CD))
        return
      }
      if (!mtracuu) {
        setError(requiredFieldVi(PUBLIC_VI.MTRACUU))
        return
      }

      setLoading(true)
      setSearched(true)
      setError("")
      setInvoice(null)
      setDownloadParams(null)

      try {
        const data = await lookupPublicEInvoice({ taxCode, mtracuu })
        setInvoice(data)
        setDownloadParams({ taxCode, mtracuu })
      } catch (lookupError) {
        setError(getApiErrorMessage(lookupError, PUBLIC_VI.LOOKUP_NOT_FOUND))
      } finally {
        setLoading(false)
      }
    },
    [taxCode, lookupCode],
  )

  const openDownload = useCallback(
    (format: PublicEInvoiceDownloadFormat) => {
      if (!downloadParams) {
        return
      }

      void downloadUrlFile(buildPublicEInvoiceDownloadUrl({ ...downloadParams, format }), `invoice.${format}`)
    },
    [downloadParams],
  )

  const currency = invoice?.DVTTE || "VND"
  const canDownloadPdf = invoice?.CAN_DOWNLOAD_PDF !== false
  const canDownloadXml = invoice?.CAN_DOWNLOAD_XML !== false
  const html = useMemo(() => trimText(invoice?.HTML), [invoice])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            {PUBLIC_VI.BRAND}
          </div>
          <h1 className="text-2xl font-semibold">{PUBLIC_VI.LOOKUP_TITLE}</h1>
          <div className="text-sm text-slate-600">
            {PUBLIC_VI.TAX_CD}: {taxCode || "-"}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <form className={`grid gap-3 ${showTaxCodeInput ? "lg:grid-cols-[240px_1fr_auto]" : "lg:grid-cols-[1fr_auto]"}`} onSubmit={handleSubmit}>
            {showTaxCodeInput ? (
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-700">
                  {PUBLIC_VI.TAX_CD}
                </span>
                <input
                  className="h-11 rounded border border-slate-300 px-3 text-sm font-semibold uppercase tracking-wide outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  value={taxCodeInput}
                  placeholder={PUBLIC_VI.TAX_CODE_PLACEHOLDER}
                  autoComplete="off"
                  onChange={(event) => setTaxCodeInput(event.target.value.toUpperCase())}
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-700">{PUBLIC_VI.MTRACUU}</span>
              <input
                className="h-11 rounded border border-slate-300 px-3 text-sm font-semibold uppercase tracking-wide outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                value={lookupCode}
                placeholder={PUBLIC_VI.LOOKUP_CODE_PLACEHOLDER}
                autoComplete="off"
                onChange={(event) => setLookupCode(event.target.value.toUpperCase())}
              />
            </label>

            <button
              type="submit"
              className="mt-0 h-11 rounded bg-teal-700 px-6 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-6"
              disabled={loading}
            >
              {loading ? PUBLIC_VI.LOADING : PUBLIC_VI.SEARCH}
            </button>
          </form>

          {error ? <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        </section>

        {invoice ? (
          <section className="rounded border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">{trimText(invoice.MTRACUU)}</div>
                <h2 className="mt-1 text-lg font-semibold">{formatInvoiceNo(invoice)}</h2>
                <div className="mt-1 text-sm text-slate-600">
                  {trimText(invoice.THDON) || PUBLIC_VI.DEFAULT_INVOICE_TITLE}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canDownloadPdf}
                  onClick={() => openDownload("pdf")}
                >
                  {PUBLIC_VI.PRINT_PDF}
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canDownloadXml}
                  onClick={() => openDownload("xml")}
                >
                  {PUBLIC_VI.DOWNLOAD_XML}
                </button>
              </div>
            </div>

            <div className="grid gap-4 border-b border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-4">
              <FieldValue label={PUBLIC_VI.INVOICE_DATE} value={formatDate(invoice.NLAP)} />
              <FieldValue label={PUBLIC_VI.SELLER} value={trimText(invoice.SELLER_NM)} />
              <FieldValue label={PUBLIC_VI.SELLER_TAX_CD} value={trimText(invoice.SELLER_TAX_CD)} />
              <FieldValue label={PUBLIC_VI.TAX_AUTHORITY_CODE} value={trimText(invoice.MCCQT)} />
              <FieldValue label={PUBLIC_VI.BUYER} value={trimText(invoice.NMUA_TEN)} />
              <FieldValue label={PUBLIC_VI.BUYER_TAX_CD} value={trimText(invoice.NMUA_MST)} />
              <FieldValue label={PUBLIC_VI.BUYER_ADDRESS} value={trimText(invoice.NMUA_DCHI)} />
              <FieldValue
                label={PUBLIC_VI.TOTAL_AMOUNT}
                value={`${formatMoney(invoice.TGTTTBSO, currency)} ${trimText(currency) || "VND"}`}
              />
              <FieldValue
                label={PUBLIC_VI.BEFORE_TAX}
                value={`${formatMoney(invoice.TGTCTHUE, currency)} ${trimText(currency) || "VND"}`}
              />
              <FieldValue
                label={PUBLIC_VI.TAX_AMOUNT}
                value={`${formatMoney(invoice.TGTTTHUE, currency)} ${trimText(currency) || "VND"}`}
              />
              <FieldValue
                label={PUBLIC_VI.DISCOUNT}
                value={`${formatMoney(invoice.TTCKTMAI, currency)} ${trimText(currency) || "VND"}`}
              />
              <FieldValue label={PUBLIC_VI.AMOUNT_IN_WORDS} value={trimText(invoice.TGTTTBCHU)} />
            </div>

            <div className="bg-slate-100 p-4">
              {html ? (
                <iframe
                  title={PUBLIC_VI.INVOICE_PREVIEW}
                  className="h-[75vh] w-full rounded border border-slate-300 bg-white"
                  srcDoc={html}
                />
              ) : (
                <div className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                  {PUBLIC_VI.INVOICE_PREVIEW_EMPTY}
                </div>
              )}
            </div>
          </section>
        ) : searched && !loading && !error ? (
          <section className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            {PUBLIC_VI.LOOKUP_EMPTY}
          </section>
        ) : null}
      </main>
    </div>
  )
}
