import { useCallback, useEffect, useRef, useState } from "react"
import notify from "devextreme/ui/notify"

import { getApiErrorMessage } from "@/api/apiTypes"
import { uploadUserAvatar } from "@/api/userInfoApi"
import type { UserInfo } from "@/types/userInfo"
import { useUserAvatarThumbSrc } from "./useUserAvatarThumbSrc"

type UserAvatarFieldProps = {
  value: UserInfo
  disabled?: boolean
  isCreate?: boolean
  onChange: (next: UserInfo) => void
  onUploaded?: (avatarUrl: string) => void
  t: (key: string, fallback?: string) => string
}

export default function UserAvatarField({
  value,
  disabled = false,
  isCreate = false,
  onChange,
  onUploaded,
  t,
}: UserAvatarFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState("")
  const [uploading, setUploading] = useState(false)

  const userPkId = typeof value.USER_PK_ID === "number" ? value.USER_PK_ID : null
  const canUpload = !disabled && !isCreate && typeof userPkId === "number" && userPkId > 0

  const imageSrc = useUserAvatarThumbSrc({
    userPkId,
    storedPath: value.AVATAR_URL,
    localPreviewUrl,
  })

  const revokeLocalPreview = useCallback(() => {
    setLocalPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }
      return ""
    })
  }, [])

  useEffect(() => {
    revokeLocalPreview()
  }, [userPkId, revokeLocalPreview])

  const handlePick = useCallback(() => {
    if (!canUpload) {
      if (isCreate) {
        notify(t("AVATAR_SAVE_BEFORE_IMAGE", "Hãy lưu người dùng trước khi gắn ảnh"), "warning", 3000)
      }
      return
    }
    inputRef.current?.click()
  }, [canUpload, isCreate, t])

  const handleSelected = useCallback(
    async (fileList: FileList | null) => {
      const file = fileList?.[0]
      if (!file || !canUpload || userPkId == null) {
        return
      }

      if (!file.type.startsWith("image/")) {
        notify(t("AVATAR_IMAGE_TYPE_INVALID", "Chỉ chọn file ảnh (png, jpg, ...)"), "warning", 3000)
        return
      }

      if (file.size > 2 * 1024 * 1024) {
        notify(t("AVATAR_IMAGE_TOO_LARGE", "Ảnh vượt quá 2MB"), "warning", 3000)
        return
      }

      const localUrl = URL.createObjectURL(file)
      setLocalPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current)
        }
        return localUrl
      })
      setUploading(true)

      try {
        const result = await uploadUserAvatar(userPkId, file)
        const nextUrl =
          typeof result.data?.AVATAR_URL === "string" ? result.data.AVATAR_URL.trim() : ""
        if (onUploaded) {
          onUploaded(nextUrl)
        } else {
          onChange({
            ...value,
            AVATAR_URL: nextUrl,
          })
        }
        notify(t("AVATAR_IMAGE_UPLOAD_SUCCESS", "Đã cập nhật ảnh đại diện"), "success", 2500)
      } catch (error) {
        revokeLocalPreview()
        notify(
          getApiErrorMessage(error, t("AVATAR_IMAGE_UPLOAD_FAILED", "Tải ảnh thất bại")),
          "error",
          3500,
        )
      } finally {
        setUploading(false)
        if (inputRef.current) {
          inputRef.current.value = ""
        }
      }
    },
    [canUpload, onChange, onUploaded, revokeLocalPreview, t, userPkId, value],
  )

  const handleClear = useCallback(() => {
    revokeLocalPreview()
    if (!value.AVATAR_URL?.trim()) {
      return
    }
    onChange({
      ...value,
      AVATAR_URL: "",
    })
  }, [onChange, revokeLocalPreview, value])

  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-800">
        {t("AVATAR_URL", "Ảnh đại diện")}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={handlePick}
          className={[
            "relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-500 transition",
            canUpload && !uploading ? "cursor-pointer hover:border-slate-400" : "cursor-default opacity-90",
          ].join(" ")}
          title={
            uploading
              ? t("UPLOADING", "Đang tải...")
              : imageSrc
                ? t("CHANGE_IMAGE", "Đổi ảnh")
                : t("CHOOSE_IMAGE", "Chọn ảnh")
          }
        >
          {imageSrc ? (
            <img src={imageSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{uploading ? "…" : "+"}</span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          {isCreate ? (
            <div className="mb-2 text-xs text-slate-500">
              {t("AVATAR_SAVE_BEFORE_IMAGE", "Hãy lưu người dùng trước khi gắn ảnh")}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canUpload || uploading}
              onClick={handlePick}
            >
              {imageSrc
                ? t("CHANGE_IMAGE", "Đổi ảnh")
                : t("CHOOSE_IMAGE", "Chọn ảnh")}
            </button>
            {imageSrc || value.AVATAR_URL?.trim() ? (
              <button
                type="button"
                className="rounded border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled || uploading}
                onClick={handleClear}
              >
                {t("CLEAR", "Xóa ảnh")}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleSelected(event.target.files)
        }}
      />
    </div>
  )
}
