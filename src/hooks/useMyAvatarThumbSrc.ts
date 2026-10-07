import { useEffect, useState } from "react"

import {
  fetchMyAvatarImageBlob,
} from "@/api/profileApi"
import {
  isUserAvatarFtpStoredPath,
  resolveUserAvatarImageUrl,
} from "@/api/userInfoApi"

/**
 * Current-user avatar thumbnail.
 * FTP paths load via authenticated /UserProfile/me/avatar-file → blob URL.
 */
export function useMyAvatarThumbSrc(
  storedPath?: string | null,
  localPreviewUrl?: string,
): string {
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

    if (!isUserAvatarFtpStoredPath(normalized)) {
      setRemoteSrc(resolveUserAvatarImageUrl(normalized))
      return () => {
        cancelled = true
      }
    }

    setRemoteSrc("")
    void fetchMyAvatarImageBlob()
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
  }, [localPreviewUrl, storedPath])

  return localPreviewUrl || remoteSrc
}
