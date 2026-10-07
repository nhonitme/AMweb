import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import type { EInvoicePluginCertificate } from "@/api/einvoiceSigningPluginApi"
import { LanguageContext } from "@/lib/i18nLoader"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"

interface EInvoiceCertificateSelectPopupProps {
  visible: boolean
  certificates: EInvoicePluginCertificate[]
  selectedThumbprint: string
  signingCount: number
  targetLabel?: string
  confirmText?: string
  confirmIcon?: string
  loading?: boolean
  compact?: boolean
  title?: string
  onClose: () => void
  onSelect: (thumbprint: string) => void
  onConfirm: () => void
}

function formatDateText(value: string): string {
  const text = String(value ?? "").trim()
  if (!text) {
    return "-"
  }

  return text.length >= 10 ? text.slice(0, 10) : text
}

function formatIssuerName(issuer: string): string {
  const match = issuer.match(/(?:^|[,\n]\s*)CN=([^,\n]+)/i)
  return match ? match[1].trim() : issuer.trim() || "-"
}

function getDaysUntilExpiry(notAfter: string): number | null {
  const expiry = new Date(formatDateText(notAfter))
  if (Number.isNaN(expiry.getTime())) {
    return null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function shortThumbprint(thumbprint: string): string {
  const normalized = thumbprint.replace(/[^a-fA-F0-9]/g, "").toUpperCase()
  if (normalized.length <= 12) {
    return normalized
  }

  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`
}

function resolveCertificateDisplayName(
  certificate: EInvoicePluginCertificate,
  unknownLabel: string,
): string {
  return (
    certificate.organizationName.trim() ||
    formatIssuerName(certificate.subject) ||
    unknownLabel
  )
}

interface CertificateDetailPopupProps {
  visible: boolean
  certificate: EInvoicePluginCertificate | null
  loading: boolean
  t: (key: string, fallback: string) => string
  onClose: () => void
}

function CertificateDetailPopup({
  visible,
  certificate,
  loading,
  t,
  onClose,
}: CertificateDetailPopupProps) {
  if (!certificate) {
    return null
  }

  const daysLeft = getDaysUntilExpiry(certificate.notAfter)
  const expiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30
  const displayName = resolveCertificateDisplayName(certificate, t("CERT_UNKNOWN_ORG", "Unknown organization"))

  return (
    <Popup
      visible={visible}
      title={t("CERT_DETAIL", "Certificate details")}
      showTitle={true}
      showCloseButton={false}
      dragEnabled={false}
      resizeEnabled={false}
      hideOnOutsideClick={!loading}
      width="min(560px, 92vw)"
      height="auto"
      maxHeight="min(680px, 88vh)"
      animation={POPUP_FADE_ANIMATION}
      onHiding={onClose}
    >
      <ToolbarItem
        toolbar="top"
        location="after"
        render={() => (
          <Button
            icon="close"
            stylingMode="text"
            disabled={loading}
            hint={t("CLOSE", "Close")}
            onClick={onClose}
          />
        )}
      />

      <div className="flex flex-col gap-4 p-4">
        <div>
          <div className="text-base font-semibold text-slate-900">{displayName}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {certificate.isUsbToken ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                USB Token
              </span>
            ) : null}
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
              C=VN
            </span>
            {expiringSoon ? (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-orange-200">
                {t("CERT_EXPIRING_SOON", "Expiring soon")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 text-sm text-slate-600">
          <div>
            <span className="font-medium text-slate-500">{t("CERT_TAX_CODE", "Tax code")}: </span>
            {certificate.taxCode.trim() || "-"}
          </div>
          <div>
            <span className="font-medium text-slate-500">{t("CERT_SERIAL", "Serial")}: </span>
            {certificate.serialNumber.trim() || "-"}
          </div>
          <div>
            <span className="font-medium text-slate-500">{t("CERT_ISSUER", "Issuer")}: </span>
            {formatIssuerName(certificate.issuer)}
          </div>
          <div>
            <span className="font-medium text-slate-500">{t("CERT_VALID_FROM", "Valid from")}: </span>
            {formatDateText(certificate.notBefore)}
          </div>
          <div>
            <span className="font-medium text-slate-500">{t("CERT_EXPIRES", "Expires")}: </span>
            {formatDateText(certificate.notAfter)}
            {daysLeft !== null && daysLeft >= 0 ? (
              <span className="ml-1 text-xs text-slate-400">
                ({daysLeft} {t("CERT_DAYS_LEFT", "days left")})
              </span>
            ) : null}
          </div>
          {certificate.providerName.trim() ? (
            <div>
              <span className="font-medium text-slate-500">{t("CERT_PROVIDER", "Provider")}: </span>
              {certificate.providerName.trim()}
            </div>
          ) : null}
          <div className="break-all text-xs text-slate-400">
            {t("CERT_THUMBPRINT", "Thumbprint")}: {shortThumbprint(certificate.thumbprint)}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 pt-4">
          <Button text={t("CLOSE", "Close")} stylingMode="outlined" disabled={loading} onClick={onClose} />
        </div>
      </div>
    </Popup>
  )
}

export default function EInvoiceCertificateSelectPopup({
  visible,
  certificates,
  selectedThumbprint,
  signingCount,
  targetLabel,
  confirmText,
  confirmIcon = "key",
  loading = false,
  compact = false,
  title,
  onClose,
  onSelect,
  onConfirm,
}: EInvoiceCertificateSelectPopupProps) {
  const [detailCertificate, setDetailCertificate] = useState<EInvoicePluginCertificate | null>(null)

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const selectedCertificate = useMemo(
    () => certificates.find((item) => item.thumbprint === selectedThumbprint) ?? null,
    [certificates, selectedThumbprint],
  )

  const closeDetailPopup = useCallback(() => {
    setDetailCertificate(null)
  }, [])

  useEffect(() => {
    if (!visible) {
      setDetailCertificate(null)
    }
  }, [visible])

  const handleMainClose = useCallback(() => {
    setDetailCertificate(null)
    onClose()
  }, [onClose])

  return (
    <>
      <Popup
        visible={visible}
        title={title ?? t("CERTIFICATE_SELECT", "Select digital certificate")}
        showTitle={true}
        showCloseButton={false}
        dragEnabled={false}
        resizeEnabled={false}
        hideOnOutsideClick={!loading}
        width={compact ? "min(680px, 96vw)" : "min(760px, 96vw)"}
        height="auto"
        maxHeight="min(680px, 92vh)"
        animation={POPUP_FADE_ANIMATION}
        onHiding={handleMainClose}
      >
        <ToolbarItem
          toolbar="top"
          location="after"
          render={() => (
            <Button
              icon="close"
              stylingMode="text"
              disabled={loading}
              hint={t("CANCEL", "Cancel")}
              onClick={handleMainClose}
            />
          )}
        />

        <div className="flex max-h-[min(560px,78vh)] flex-col gap-4 p-4">
         

          <div className="min-h-0 flex-1 overflow-y-auto">
            {certificates.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
                  <i className="dx-icon-warning text-2xl" />
                </div>
                <div className="text-base font-semibold text-slate-800">
                  {t("CERT_VN_NOT_FOUND", "No Vietnam digital certificate found")}
                </div>
                <div className="mt-2 max-w-md text-sm text-slate-500">
                  {t(
                    "CERT_VN_NOT_FOUND_HINT",
                    "Install a valid Vietnam e-signature certificate (C=VN) with private key, then refresh the signing plugin.",
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <div className="w-5 shrink-0" />
                  <div className="min-w-0 flex-[1.4]">{t("CERT_NAME", "Name")}</div>
                  <div className="min-w-0 flex-[0.9]">{t("MST", "Tax code")}</div>
                  <div className="min-w-0 flex-[0.8]">{t("CERT_EXPIRES", "Expires")}</div>
                  <div className="min-w-0 flex-1">{t("CERT_SERIAL", "Serial")}</div>
                  <div className="w-8 shrink-0" />
                </div>

                <div className="divide-y divide-slate-200">
                  {certificates.map((certificate) => {
                    const isSelected = certificate.thumbprint === selectedThumbprint
                    const displayName = resolveCertificateDisplayName(
                      certificate,
                      t("CERT_UNKNOWN_ORG", "Unknown organization"),
                    )

                    return (
                      <div
                        key={certificate.thumbprint}
                        className={[
                          "flex items-center gap-3 px-3 py-3 transition-colors",
                          isSelected ? "bg-blue-50/70" : "bg-white hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => onSelect(certificate.thumbprint)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span
                            className={[
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
                              isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white",
                            ].join(" ")}
                          >
                            {isSelected ? "✓" : ""}
                          </span>
                          <span className="min-w-0 flex-[1.4] truncate text-sm font-medium text-slate-900">{displayName}</span>
                          <span className="min-w-0 flex-[0.9] truncate text-sm text-slate-700">
                            {certificate.taxCode.trim() || "-"}
                          </span>
                          <span className="min-w-0 flex-[0.8] truncate text-sm text-slate-700">
                            {formatDateText(certificate.notAfter)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                            {certificate.serialNumber.trim() || "-"}
                          </span>
                        </button>

                        <Button
                          text="..."
                          stylingMode="text"
                          disabled={loading}
                          hint={t("CERT_DETAIL", "Certificate details")}
                          onClick={() => setDetailCertificate(certificate)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {selectedCertificate ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">{t("SELECTED", "Selected")}: </span>
              {resolveCertificateDisplayName(selectedCertificate, t("CERT_UNKNOWN_ORG", "Unknown organization"))}
              {selectedCertificate.taxCode ? ` · MST ${selectedCertificate.taxCode}` : ""}
            </div>
          ) : null}

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <Button text={t("CANCEL", "Cancel")} stylingMode="outlined" disabled={loading} onClick={handleMainClose} />
            <Button
              text={confirmText ?? t("SIGN_SEND_CQT", "Ký và gửi CQT")}
              icon={confirmIcon}
              type={confirmText ? "default" : "danger"}
              stylingMode="contained"
              disabled={!selectedThumbprint || loading || certificates.length === 0}
              onClick={onConfirm}
            />
          </div>
        </div>
      </Popup>

      <CertificateDetailPopup
        visible={detailCertificate != null}
        certificate={detailCertificate}
        loading={loading}
        t={t}
        onClose={closeDetailPopup}
      />
    </>
  )
}
