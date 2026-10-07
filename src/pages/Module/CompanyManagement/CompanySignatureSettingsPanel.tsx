import { useCallback, useMemo, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"

import { getApiErrorMessage } from "@/api/apiTypes"
import {
  createCompanySignature,
  deleteCompanySignatures,
  updateCompanySignature,
  uploadCompanySignatureImage,
} from "@/api/companySignatureInfoApi"
import { createSysCodeSelectBoxEditorOptions } from "@/components/forms/sysCodeSelectBoxOptions"
import { useSysCodes } from "@/lib/sysCodeContext"
import { getSysCodeDisplayText } from "@/lib/sysCodeUtils"
import type { CompanySignatureInfo } from "@/types/companySignatureInfo"

import {
  createDefaultCompanySignatureInfo,
  mapCompanySignatureToApiPayload,
} from "./companySignatureUtils"
import { useCompanySignatureThumbSrc } from "./useCompanySignatureThumbSrc"

type TranslateFn = (key: string, fallback?: string) => string

type CompanySignatureSettingsPanelProps = {
  companyCd: string
  rows: CompanySignatureInfo[]
  onRowsChange: Dispatch<SetStateAction<CompanySignatureInfo[]>>
  onReload: () => Promise<void> | void
  t: TranslateFn
}

const fixedSignatureCodes = new Set(["01", "02", "03", "04", "05", "06"])

const isFixedSignatureCode = (value: unknown) => fixedSignatureCodes.has(String(value ?? "").trim())

function SignatureCardThumb({
  row,
  localPreviewUrl,
  isUploading,
  canPickImage,
  t,
  onPick,
  onClear,
}: {
  row: CompanySignatureInfo
  localPreviewUrl?: string
  isUploading: boolean
  canPickImage: boolean
  t: TranslateFn
  onPick: () => void
  onClear: () => void
}) {
  const imageSrc = useCompanySignatureThumbSrc({
    signatureId: typeof row.ID === "number" ? row.ID : undefined,
    storedPath: row.SIGN_IMAGE_URL,
    localPreviewUrl,
  })

  return (
    <div
      className={`company-signature-editor__thumb${imageSrc ? " has-image" : ""}${
        canPickImage ? "" : " is-disabled"
      }`}
      title={
        isUploading
          ? t("UPLOADING", "Đang tải...")
          : imageSrc
            ? t("CHANGE_IMAGE", "Đổi ảnh chữ ký")
            : t("CHOOSE_IMAGE", "Chọn ảnh chữ ký")
      }
      onClick={() => {
        if (canPickImage) {
          onPick()
        }
      }}
      onKeyDown={(event) => {
        if (!canPickImage) {
          return
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onPick()
        }
      }}
      role="button"
      tabIndex={canPickImage ? 0 : -1}
    >
      {imageSrc ? <img src={imageSrc} alt="" /> : <span>{isUploading ? "…" : "+"}</span>}
      {imageSrc ? (
        <button
          type="button"
          className="company-signature-editor__thumb-clear"
          title={t("CLEAR", "Xóa ảnh")}
          aria-label={t("CLEAR", "Xóa ảnh")}
          disabled={isUploading}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onClear()
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  )
}

function compareSignatures(left: CompanySignatureInfo, right: CompanySignatureInfo): number {
  if (left.SORT_ORDER !== right.SORT_ORDER) {
    return left.SORT_ORDER - right.SORT_ORDER
  }
  return left.SIGN_CODE.localeCompare(right.SIGN_CODE, undefined, { sensitivity: "base" })
}

function rowKey(row: CompanySignatureInfo): string {
  if (typeof row.ID === "number" && Number.isFinite(row.ID) && row.ID > 0) {
    return `id:${row.ID}`
  }
  return `code:${row.SIGN_CODE || "new"}`
}

export default function CompanySignatureSettingsPanel({
  companyCd,
  rows,
  onRowsChange,
  onReload,
  t,
}: CompanySignatureSettingsPanelProps) {
  const [keyword, setKeyword] = useState("")
  const [savingKey, setSavingKey] = useState("")
  const [uploadingKey, setUploadingKey] = useState("")
  const [adding, setAdding] = useState(false)
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({})
  const saveTimersRef = useRef<Map<string, number>>(new Map())
  const fileInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map())

  const revokeLocalPreview = useCallback((key: string) => {
    setLocalPreviews((current) => {
      const existing = current[key]
      if (existing) {
        URL.revokeObjectURL(existing)
      }
      if (!(key in current)) {
        return current
      }
      const next = { ...current }
      delete next[key]
      return next
    })
  }, [])

  const { getCodesByType } = useSysCodes()
  const displayLabelCodes = useMemo(() => getCodesByType("SIGN_TITLE"), [getCodesByType])
  const labelSelectOptions = useMemo(
    () =>
      createSysCodeSelectBoxEditorOptions(
        displayLabelCodes,
        t("SELECT_DISPLAY_LABEL", "Chọn nhãn chữ ký"),
        t,
      ),
    [displayLabelCodes, t],
  )

  const sortedRows = useMemo(() => rows.slice().sort(compareSignatures), [rows])

  const filteredRows = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    if (!normalized) {
      return sortedRows
    }

    return sortedRows.filter((row) => {
      const labelCode = displayLabelCodes.find((item) => String(item.CODE_CD ?? "").trim() === row.DISPLAY_LABEL.trim())
      const labelText = labelCode ? getSysCodeDisplayText(labelCode, t) : row.DISPLAY_LABEL
      const haystack = `${row.SIGN_CODE} ${labelText} ${row.SIGN_NAME} ${row.SIGN_TITLE}`.toLowerCase()
      return haystack.includes(normalized)
    })
  }, [displayLabelCodes, keyword, sortedRows, t])

  const persistRow = useCallback(
    async (row: CompanySignatureInfo) => {
      if (typeof row.ID !== "number" || !Number.isFinite(row.ID) || row.ID <= 0) {
        return
      }

      const key = rowKey(row)
      setSavingKey(key)
      try {
        const result = await updateCompanySignature(mapCompanySignatureToApiPayload(row))
        const savedId = Number(result.data?.ID)
        onRowsChange((current) =>
          current.map((item) =>
            rowKey(item) === key ||
            (item.SIGN_CODE === row.SIGN_CODE && item.COMPANY_CD === companyCd)
              ? {
                  ...item,
                  ID: Number.isFinite(savedId) && savedId > 0 ? savedId : item.ID,
                  COMPANY_CD: String(result.data?.COMPANY_CD ?? companyCd).trim(),
                }
              : item,
          ),
        )
      } catch (error) {
        notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")), "error", 3500)
        await onReload()
      } finally {
        setSavingKey((current) => (current === key ? "" : current))
      }
    },
    [companyCd, onReload, onRowsChange, t],
  )

  const schedulePersist = useCallback(
    (row: CompanySignatureInfo) => {
      if (typeof row.ID !== "number" || !Number.isFinite(row.ID) || row.ID <= 0) {
        return
      }

      const key = rowKey(row)
      const existing = saveTimersRef.current.get(key)
      if (existing) {
        window.clearTimeout(existing)
      }

      const timerId = window.setTimeout(() => {
        saveTimersRef.current.delete(key)
        void persistRow(row)
      }, 450)

      saveTimersRef.current.set(key, timerId)
    },
    [persistRow],
  )

  const patchRow = useCallback(
    (target: CompanySignatureInfo, patch: Partial<CompanySignatureInfo>, persist = true) => {
      const nextRows = rows.map((row) => {
        if (rowKey(row) !== rowKey(target)) {
          return row
        }
        return { ...row, ...patch }
      })
      onRowsChange(nextRows)

      const updated = nextRows.find((row) => rowKey(row) === rowKey(target))
      if (persist && updated) {
        schedulePersist(updated)
      }
    },
    [onRowsChange, rows, schedulePersist],
  )

  const handleAdd = useCallback(async () => {
    setAdding(true)
    try {
      const maxOrder = rows.reduce((max, row) => Math.max(max, row.SORT_ORDER || 0), 0)
      const payload = mapCompanySignatureToApiPayload({
        ...createDefaultCompanySignatureInfo(),
        DISPLAY_LABEL: String(displayLabelCodes[0]?.CODE_CD ?? "").trim(),
        SORT_ORDER: maxOrder + 1,
        IS_ACTIVE: true,
      })
      await createCompanySignature(payload)
      notify(t("CREATE_SUCCESS", "Đã thêm chữ ký"), "success", 2500)
      await onReload()
    } catch (error) {
      notify(getApiErrorMessage(error, t("INSERT_FAILED", "Thêm thất bại")), "error", 3500)
    } finally {
      setAdding(false)
    }
  }, [displayLabelCodes, onReload, rows, t])

  const handleDelete = useCallback(
    async (row: CompanySignatureInfo) => {
      if (isFixedSignatureCode(row.SIGN_CODE)) {
        notify(
          t("FIXED_SIGN_CODE_DELETE_BLOCKED", "Không xóa được chữ ký mặc định 01-06"),
          "warning",
          3000,
        )
        return
      }

      if (typeof row.ID !== "number" || row.ID <= 0) {
        return
      }

      const confirmed = await confirm(
        t("MSG_CONFIRM_DELETE_RECORD", "Bạn có chắc muốn xóa {0} bản ghi?").replace("{0}", "1"),
        t("MSG_CONFIRM_DELETE", "Xác nhận xóa"),
      )
      if (!confirmed) {
        return
      }

      try {
        await deleteCompanySignatures([row.ID])
        notify(t("DELETE_SUCCESS", "Đã xóa"), "success", 2500)
        await onReload()
      } catch (error) {
        notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 3500)
      }
    },
    [onReload, t],
  )

  const handlePickImage = useCallback((row: CompanySignatureInfo) => {
    const key = rowKey(row)
    fileInputRefs.current.get(key)?.click()
  }, [])

  const handleImageSelected = useCallback(
    async (row: CompanySignatureInfo, fileList: FileList | null) => {
      const file = fileList?.[0]
      if (!file) {
        return
      }

      if (typeof row.ID !== "number" || row.ID <= 0) {
        notify(t("SIGNATURE_SAVE_BEFORE_IMAGE", "Hãy lưu chữ ký trước khi gắn ảnh"), "warning", 3000)
        return
      }

      if (!file.type.startsWith("image/")) {
        notify(t("SIGNATURE_IMAGE_TYPE_INVALID", "Chỉ chọn file ảnh (png, jpg, ...)"), "warning", 3000)
        return
      }

      if (file.size > 2 * 1024 * 1024) {
        notify(t("SIGNATURE_IMAGE_TOO_LARGE", "Ảnh vượt quá 2MB"), "warning", 3000)
        return
      }

      const key = rowKey(row)
      const localUrl = URL.createObjectURL(file)
      setLocalPreviews((current) => {
        const previous = current[key]
        if (previous) {
          URL.revokeObjectURL(previous)
        }
        return { ...current, [key]: localUrl }
      })
      setUploadingKey(key)
      try {
        const result = await uploadCompanySignatureImage(row.ID, file)
        const nextUrl =
          typeof result.data?.SIGN_IMAGE_URL === "string" ? result.data.SIGN_IMAGE_URL.trim() : ""
        onRowsChange((current) =>
          current.map((item) =>
            rowKey(item) === key ||
            (item.SIGN_CODE === row.SIGN_CODE && (item.COMPANY_CD === companyCd || !item.COMPANY_CD))
              ? {
                  ...item,
                  ID: Number(result.data?.ID) > 0 ? Number(result.data.ID) : item.ID,
                  COMPANY_CD: String(result.data?.COMPANY_CD ?? companyCd).trim(),
                  SIGN_IMAGE_URL: nextUrl,
                }
              : item,
          ),
        )
        revokeLocalPreview(key)
        notify(t("SIGNATURE_IMAGE_UPLOAD_SUCCESS", "Đã cập nhật ảnh chữ ký"), "success", 2500)
      } catch (error) {
        const message = getApiErrorMessage(error, t("SIGNATURE_IMAGE_UPLOAD_FAILED", "Tải ảnh thất bại"))
        revokeLocalPreview(key)
        notify(message, "error", 3500)
      } finally {
        setUploadingKey((current) => (current === key ? "" : current))
      }
    },
    [companyCd, onRowsChange, revokeLocalPreview, t],
  )

  const handleClearImage = useCallback(
    (row: CompanySignatureInfo) => {
      const key = rowKey(row)
      revokeLocalPreview(key)
      if (!row.SIGN_IMAGE_URL.trim()) {
        return
      }
      patchRow(row, { SIGN_IMAGE_URL: "" })
    },
    [patchRow, revokeLocalPreview],
  )

  const moveRow = useCallback(
    async (row: CompanySignatureInfo, direction: -1 | 1) => {
      const ordered = rows.slice().sort(compareSignatures)
      const index = ordered.findIndex((item) => rowKey(item) === rowKey(row))
      const swapIndex = index + direction
      if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) {
        return
      }

      const current = ordered[index]
      const neighbor = ordered[swapIndex]
      const currentOrder = current.SORT_ORDER
      const neighborOrder = neighbor.SORT_ORDER

      const nextCurrent = { ...current, SORT_ORDER: neighborOrder }
      const nextNeighbor = { ...neighbor, SORT_ORDER: currentOrder }

      onRowsChange(
        rows.map((item) => {
          if (rowKey(item) === rowKey(current)) {
            return nextCurrent
          }
          if (rowKey(item) === rowKey(neighbor)) {
            return nextNeighbor
          }
          return item
        }),
      )

      try {
        const savedRows = await Promise.all([
          updateCompanySignature(mapCompanySignatureToApiPayload(nextCurrent)),
          updateCompanySignature(mapCompanySignatureToApiPayload(nextNeighbor)),
        ])
        const savedByCode = new Map(
          savedRows.map(({ data }) => [String(data.SIGN_CODE ?? "").trim(), data]),
        )
        onRowsChange((currentRows) =>
          currentRows.map((item) => {
            const saved = savedByCode.get(item.SIGN_CODE)
            const savedId = Number(saved?.ID)
            return saved
              ? {
                  ...item,
                  ID: Number.isFinite(savedId) && savedId > 0 ? savedId : item.ID,
                  COMPANY_CD: String(saved.COMPANY_CD ?? companyCd).trim(),
                }
              : item
          }),
        )
      } catch (error) {
        notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")), "error", 3500)
        await onReload()
      }
    },
    [companyCd, onReload, onRowsChange, rows, t],
  )

  return (
    <div className="company-signature-editor">
      <div className="company-signature-editor__toolbar">
        <TextBox
          value={keyword}
          stylingMode="outlined"
          mode="search"
          placeholder={t("QUICK_SEARCH", "Tìm theo mã / chức vụ / tên...")}
          valueChangeEvent="input"
          onValueChanged={(event) => setKeyword(String(event.value ?? ""))}
          width="100%"
        />
        <div className="company-signature-editor__actions">
          <Button
            icon="refresh"
            stylingMode="outlined"
            hint={t("btnRefresh", "Làm mới")}
            onClick={() => void onReload()}
          />
          <Button
            icon="plus"
            type="default"
            stylingMode="contained"
            hint={t("lblAddNew", "Thêm chữ ký")}
            text={t("lblAddNew", "Thêm")}
            disabled={adding}
            onClick={() => void handleAdd()}
          />
        </div>
      </div>

      <div className="company-signature-editor__list">
        {filteredRows.length === 0 ? (
          <div className="company-signature-editor__empty">
            {t("SIGNATURE_NO_ROWS", "Chưa có chữ ký nào.")}
          </div>
        ) : (
          filteredRows.map((row) => {
            const key = rowKey(row)
            const isSaving = savingKey === key
            const isUploading = uploadingKey === key
            const canDelete = !isFixedSignatureCode(row.SIGN_CODE)
            const orderIndex = sortedRows.findIndex((item) => rowKey(item) === key)
            const canReorder = !keyword.trim()
            const canPickImage = !isUploading && typeof row.ID === "number" && row.ID > 0

            return (
              <div
                key={key}
                className={`company-signature-editor__card${isSaving || isUploading ? " is-saving" : ""}${
                  row.IS_ACTIVE ? "" : " is-inactive"
                }`}
              >
                <input
                  ref={(element) => {
                    fileInputRefs.current.set(key, element)
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp"
                  className="company-signature-editor__file-input"
                  onChange={(event) => {
                    void handleImageSelected(row, event.target.files)
                    event.target.value = ""
                  }}
                />

                <SignatureCardThumb
                  row={row}
                  localPreviewUrl={localPreviews[key]}
                  isUploading={isUploading}
                  canPickImage={canPickImage}
                  t={t}
                  onPick={() => handlePickImage(row)}
                  onClear={() => handleClearImage(row)}
                />

                <div className="company-signature-editor__body">
                  <div className="company-signature-editor__meta">
                    <span className="company-signature-editor__code">{row.SIGN_CODE || "—"}</span>
                    <span className="company-signature-editor__seq" title={t("SORT_ORDER", "Thứ tự")}>
                      #{orderIndex >= 0 ? orderIndex + 1 : "—"}
                    </span>
                    <div className="company-signature-editor__card-tools">
                      <CheckBox
                        value={row.IS_ACTIVE}
                        hint={t("IS_ACTIVE", "Đang dùng")}
                        onValueChanged={(event) => {
                          if (event.event == null) {
                            return
                          }
                          patchRow(row, { IS_ACTIVE: Boolean(event.value) })
                        }}
                      />
                      <Button
                        icon="arrowup"
                        stylingMode="text"
                        disabled={!canReorder || orderIndex <= 0}
                        hint={t("MOVE_UP", "Lên")}
                        onClick={() => void moveRow(row, -1)}
                      />
                      <Button
                        icon="arrowdown"
                        stylingMode="text"
                        disabled={!canReorder || orderIndex < 0 || orderIndex >= sortedRows.length - 1}
                        hint={t("MOVE_DOWN", "Xuống")}
                        onClick={() => void moveRow(row, 1)}
                      />
                      {canDelete ? (
                        <Button
                          icon="trash"
                          stylingMode="text"
                          type="danger"
                          hint={t("DELETE", "Xóa")}
                          onClick={() => void handleDelete(row)}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="company-signature-editor__inputs">
                    <SelectBox
                      {...labelSelectOptions}
                      value={row.DISPLAY_LABEL || null}
                      width="100%"
                      placeholder={t("DISPLAY_LABEL", "Chức vụ ký")}
                      onValueChanged={(event) => {
                        if (event.event == null) {
                          return
                        }
                        patchRow(row, {
                          DISPLAY_LABEL: String(event.value ?? "").trim(),
                        })
                      }}
                    />
                    <TextBox
                      value={row.SIGN_NAME}
                      stylingMode="outlined"
                      width="100%"
                      valueChangeEvent="input"
                      placeholder={t("SIGN_NAME", "Họ và tên")}
                      onValueChanged={(event) => {
                        if (event.event == null) {
                          return
                        }
                        patchRow(row, { SIGN_NAME: String(event.value ?? "") })
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
