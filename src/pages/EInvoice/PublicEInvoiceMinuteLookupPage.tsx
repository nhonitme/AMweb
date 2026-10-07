import { downloadUrlFile } from "@/lib/fileUtils"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"

import { getApiErrorMessage } from "@/api/apiTypes"
import {
  getSigningPluginCertificates,
  signXmlWithPlugin,
  type EInvoicePluginCertificate,
} from "@/api/einvoiceSigningPluginApi"
import {
  buildPublicEInvoiceMinuteDownloadUrl,
  lookupPublicEInvoiceMinute,
  savePublicEInvoiceMinuteBuyerSignature,
  type PublicEInvoiceMinuteDownloadFormat,
  type PublicEInvoiceMinuteLookup,
  type PublicEInvoiceMinuteLookupParams,
} from "@/api/publicEInvoiceMinuteLookupApi"

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

function formatDateTime(value: string | null | undefined): string {
  const text = trimText(value)
  if (!text) {
    return "-"
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) {
    return text
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

function formatMinuteNo(minute: PublicEInvoiceMinuteLookup): string {
  const pattern = [minute.KHMSHDON, minute.KHHDON].map(trimText).filter(Boolean).join("/")
  const invoiceNo = trimText(minute.SHDON)
  const minuteNo = trimText(minute.SBBAN)
  const ref = pattern && invoiceNo ? `${pattern} - ${invoiceNo}` : pattern || invoiceNo

  return [minuteNo, ref].filter(Boolean).join(" - ") || "-"
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 min-h-6 break-words text-sm font-medium text-slate-900">{value || "-"}</div>
    </div>
  )
}

export default function PublicEInvoiceMinuteLookupPage() {
  const { taxCode: routeTaxCode } = useParams<{ taxCode: string }>()
  const [searchParams] = useSearchParams()

  const routeTaxCodeText = trimText(routeTaxCode)
  const [taxCodeInput, setTaxCodeInput] = useState(() => readSearchParam(searchParams, TAX_CODE_PARAM_KEYS))
  const taxCode = routeTaxCodeText || trimText(taxCodeInput)
  const showTaxCodeInput = !routeTaxCodeText
  const [lookupCode, setLookupCode] = useState(() => readSearchParam(searchParams, LOOKUP_CODE_PARAM_KEYS).toUpperCase())
  const [minute, setMinute] = useState<PublicEInvoiceMinuteLookup | null>(null)
  const [downloadParams, setDownloadParams] = useState<PublicEInvoiceMinuteLookupParams | null>(null)
  const [selectedThumbprint, setSelectedThumbprint] = useState("")
  const [loading, setLoading] = useState(false)
  const [signing, setSigning] = useState(false)
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
      setMinute(null)
      setDownloadParams(null)

      try {
        const data = await lookupPublicEInvoiceMinute({ taxCode, mtracuu })
        setMinute(data)
        setDownloadParams({ taxCode, mtracuu })
      } catch (lookupError) {
        setError(getApiErrorMessage(lookupError, PUBLIC_VI.MINUTE_LOOKUP_NOT_FOUND))
      } finally {
        setLoading(false)
      }
    },
    [taxCode, lookupCode],
  )

  const loadCertificates = useCallback(async (): Promise<EInvoicePluginCertificate[]> => {
    setError("")

    try {
      const items = await getSigningPluginCertificates()
      setSelectedThumbprint((current) => current || items[0]?.thumbprint || "")
      if (items.length === 0) {
        setError(PUBLIC_VI.CERTIFICATE_EMPTY)
      }
      return items
    } catch (certificateError) {
      setError(getApiErrorMessage(certificateError, PUBLIC_VI.SIGNING_PLUGIN_NOT_RUNNING))
      return []
    }
  }, [])

  const openDownload = useCallback(
    (format: PublicEInvoiceMinuteDownloadFormat) => {
      if (!downloadParams) {
        return
      }

      void downloadUrlFile(buildPublicEInvoiceMinuteDownloadUrl({ ...downloadParams, format }), `invoice-minute.${format}`)
    },
    [downloadParams],
  )

  const handleBuyerSign = useCallback(async () => {
    if (!minute || !downloadParams) {
      return
    }

    const xml = trimText(minute.XML)
    if (!xml) {
      setError(PUBLIC_VI.MINUTE_XML_EMPTY)
      return
    }

    let thumbprint = selectedThumbprint
    if (!thumbprint) {
      const loaded = await loadCertificates()
      thumbprint = loaded[0]?.thumbprint || ""
    }

    if (!thumbprint) {
      setError(PUBLIC_VI.CERTIFICATE_REQUIRED)
      return
    }

    setSigning(true)
    setError("")

    try {
      const signed = await signXmlWithPlugin({
        requestId: `public-bban-${minute.BBAN_ID ?? 0}-${Date.now()}`,
        invoiceId: Number(minute.BBAN_ID ?? 0),
        companyCd: "PUBLIC",
        certificateThumbprint: thumbprint,
        signType: "BUYER",
        xml,
      })

      const updated = await savePublicEInvoiceMinuteBuyerSignature(downloadParams, {
        XML: signed.signedXml,
        CERTIFICATE_SUBJECT: signed.certificateSubject,
        CERTIFICATE_THUMBPRINT: signed.certificateThumbprint,
        CERTIFICATE_SERIAL_NUMBER: signed.certificateSerialNumber,
        SIGNED_AT: signed.signedAt,
      })
      setMinute(updated)
    } catch (signError) {
      setError(getApiErrorMessage(signError, PUBLIC_VI.SIGN_FAILED))
    } finally {
      setSigning(false)
    }
  }, [downloadParams, loadCertificates, minute, selectedThumbprint])

  const canDownloadPdf = minute?.CAN_DOWNLOAD_PDF !== false
  const buyerSigned = Number(minute?.NMUA_IS_SIGNED ?? 0) === 1
  const canSign = Boolean(minute && minute.CAN_SIGN !== false && !buyerSigned)
  const html = useMemo(() => trimText(minute?.HTML), [minute])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            {PUBLIC_VI.BRAND}
          </div>
          <h1 className="text-2xl font-semibold">{PUBLIC_VI.MINUTE_LOOKUP_TITLE}</h1>
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
                <span className="text-sm font-medium text-slate-700">{PUBLIC_VI.TAX_CD}</span>
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
                placeholder={PUBLIC_VI.MINUTE_LOOKUP_CODE_PLACEHOLDER}
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

        {minute ? (
          <section className="rounded border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-teal-700">{trimText(minute.MTRACUU)}</div>
                <h2 className="mt-1 text-lg font-semibold">{formatMinuteNo(minute)}</h2>
                <div className="mt-1 text-sm text-slate-600">
                  {trimText(minute.TBBAN) || PUBLIC_VI.DEFAULT_MINUTE_TITLE}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canSign || signing}
                  onClick={handleBuyerSign}
                >
                  {signing ? PUBLIC_VI.SIGNING : PUBLIC_VI.SIGN_BUYER}
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canDownloadPdf}
                  onClick={() => openDownload("pdf")}
                >
                  {PUBLIC_VI.PRINT_PDF}
                </button>
              </div>
            </div>

            <div className="grid gap-4 border-b border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-4">
              <FieldValue label={PUBLIC_VI.MINUTE_DATE} value={formatDate(minute.NBBAN)} />
              <FieldValue label={PUBLIC_VI.SELLER} value={trimText(minute.NBAN)} />
              <FieldValue label={PUBLIC_VI.SELLER_TAX_CD} value={trimText(minute.MSTNBAN)} />
              <FieldValue label={PUBLIC_VI.SELLER_ADDRESS} value={trimText(minute.DCNBAN)} />
              <FieldValue label={PUBLIC_VI.BUYER} value={trimText(minute.NMUA)} />
              <FieldValue label={PUBLIC_VI.BUYER_TAX_CD} value={trimText(minute.MSTNMUA)} />
              <FieldValue label={PUBLIC_VI.BUYER_ADDRESS} value={trimText(minute.DCNMUA)} />
              <FieldValue label={PUBLIC_VI.INVOICE_DATE} value={formatDate(minute.NLAP)} />
              <FieldValue label={PUBLIC_VI.SELLER_SIGN_STATUS} value={Number(minute.IS_SIGNED ?? 0) === 1 ? PUBLIC_VI.SIGNED : PUBLIC_VI.NOT_SIGNED} />
              <FieldValue label={PUBLIC_VI.BUYER_SIGN_STATUS} value={buyerSigned ? PUBLIC_VI.BUYER_SIGNED : PUBLIC_VI.BUYER_NOT_SIGNED} />
              <FieldValue label={PUBLIC_VI.BUYER_SIGNED_AT} value={formatDateTime(minute.NMUA_SIGN_DT)} />
              <FieldValue label={PUBLIC_VI.MTRACUU} value={trimText(minute.MTRACUU)} />
            </div>

            <div className="bg-slate-100 p-4">
              {html ? (
                <iframe
                  title={PUBLIC_VI.MINUTE_PREVIEW}
                  className="h-[75vh] w-full rounded border border-slate-300 bg-white"
                  srcDoc={html}
                />
              ) : (
                <div className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
                  {PUBLIC_VI.MINUTE_PREVIEW_EMPTY}
                </div>
              )}
            </div>
          </section>
        ) : searched && !loading && !error ? (
          <section className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            {PUBLIC_VI.MINUTE_LOOKUP_EMPTY}
          </section>
        ) : null}
      </main>
    </div>
  )
}
