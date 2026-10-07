import { useEffect, useState } from "react"

import {
  fetchUserAvatarImageBlob,
  isUserAvatarFtpStoredPath,
  resolveUserAvatarImageUrl,
} from "@/api/userInfoApi"

type UseUserAvatarThumbSrcArgs = {
  userPkId?: number | null
  storedPath?: string | null
  localPreviewUrl?: string
}

/**
 * Avatar thumbnail src.
 * FTP-backed paths are loaded via authenticated axios → blob URL.
 */
export function useUserAvatarThumbSrc({
  userPkId,
  storedPath,
  localPreviewUrl,
}: UseUserAvatarThumbSrcArgs): string {
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

    if (typeof userPkId !== "number" || !Number.isFinite(userPkId) || userPkId <= 0) {
      setRemoteSrc("")
      return () => {
        cancelled = true
      }
    }

    setRemoteSrc("")
    void fetchUserAvatarImageBlob(userPkId)
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
  }, [localPreviewUrl, storedPath, userPkId])

  return localPreviewUrl || remoteSrc
}
