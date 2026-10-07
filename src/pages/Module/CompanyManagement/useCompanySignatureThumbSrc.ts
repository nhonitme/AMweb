import { useEffect, useState } from "react"

import {
  fetchCompanySignatureImageBlob,
  isCompanySignatureFtpStoredPath,
  resolveCompanySignatureImageUrl,
} from "@/api/companySignatureInfoApi"

type UseCompanySignatureThumbSrcArgs = {
  signatureId?: number
  storedPath?: string | null
  localPreviewUrl?: string
}

/**
 * Thumbnail src for company signatures.
 * FTP-backed paths are loaded via authenticated axios → blob URL.
 */
export function useCompanySignatureThumbSrc({
  signatureId,
  storedPath,
  localPreviewUrl,
}: UseCompanySignatureThumbSrcArgs): string {
  const [remoteSrc, setRemoteSrc] = useState("")

  useEffect(() => {
    let cancelled = false
    let objectUrl = ""

    const normalized = typeof storedPath === "string" ? storedPath.trim() : ""
    if (!normalized || localPreviewUrl) {
      setRemoteSrc("")
      return () => {
        cancelled = true
      }
    }

    if (!isCompanySignatureFtpStoredPath(normalized)) {
      setRemoteSrc(resolveCompanySignatureImageUrl(normalized))
      return () => {
        cancelled = true
      }
    }

    if (typeof signatureId !== "number" || !Number.isFinite(signatureId) || signatureId <= 0) {
      setRemoteSrc("")
      return () => {
        cancelled = true
      }
    }

    setRemoteSrc("")
    void fetchCompanySignatureImageBlob(signatureId)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) {
          setRemoteSrc(objectUrl)
        } else {
          URL.revokeObjectURL(objectUrl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteSrc("")
        }
      })

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [localPreviewUrl, signatureId, storedPath])

  return localPreviewUrl || remoteSrc
}
