import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import { LoadPanel } from "devextreme-react"
import NumberBox from "devextreme-react/number-box"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"

import { getApiErrorMessage } from "@/api/apiTypes"
import {
  type SysCodeSequence,
  type SysCodeSequenceRequest,
  updateSysCodeSequence,
} from "@/api/sysCodeSequenceApi"
import {
  useSysCodeSequencesInvalidate,
  useSysCodeSequencesQuery,
} from "@/hooks/queries/adminQueries"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import { useSysCodes } from "@/lib/sysCodeContext"

import "./sysCodeSequence.css"

const CODE_PATTERN_CODE_TYPE = "CODE_PATTERN"
const FALLBACK_CODE_PATTERN = "{PREFIX}{NO}{SUFFIX}"
const SAVE_DEBOUNCE_MS = 650

function normalizeUseFlag(value: unknown): "1" | "0" {
  return value === true || String(value ?? "").trim() === "1" ? "1" : "0"
}

function padNo(value: number, length: number): string {
  const safeLength = Math.max(1, Math.min(12, Math.trunc(length) || 4))
  const safeNo = Math.max(0, Math.trunc(value) || 0)
  return String(safeNo).padStart(safeLength, "0")
}

function buildPreviewCode(row: SysCodeSequence): string {
  const prefix = String(row.PREFIX ?? "")
  const suffix = String(row.SUFFIX ?? "")
  const pattern = String(row.CODE_PATTERN ?? FALLBACK_CODE_PATTERN).trim() || FALLBACK_CODE_PATTERN
  const nextNo = Math.max(0, Number(row.CURRENT_NO) || 0) + 1
  const noText = padNo(nextNo, Number(row.NUMBER_LENGTH) || 4)

  return pattern
    .replaceAll("{PREFIX}", prefix)
    .replaceAll("{SUFFIX}", suffix)
    .replaceAll("{NO}", noText)
    .replaceAll("{YEAR}", "YYYY")
    .replaceAll("{MONTH}", "MM")
    .replaceAll("{YYYY}", "YYYY")
    .replaceAll("{YY}", "YY")
    .replaceAll("{MM}", "MM")
}

function rowKey(row: SysCodeSequence): string {
  return typeof row.ID === "number" && row.ID > 0 ? `id:${row.ID}` : `obj:${row.OBJECT_TYPE}`
}

export default function SysCodeSequenceSection() {
  const [items, setItems] = useState<SysCodeSequence[]>([])
  const [keyword, setKeyword] = useState("")
  const [savingKey, setSavingKey] = useState("")
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set())
  const saveTimersRef = useRef<Map<string, number>>(new Map())
  const companyCd = useMemo(() => getCurrentCompanyCd(), [])
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }
  const { getCodesByType } = useSysCodes()
  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  )

  const {
    data: sequenceRows = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchSequences,
  } = useSysCodeSequencesQuery()
  const invalidateSequences = useSysCodeSequencesInvalidate()
  const loading = isLoading || isFetching

  const codePatternCodes = useMemo(() => getCodesByType(CODE_PATTERN_CODE_TYPE), [getCodesByType])

  const defaultCodePattern = useMemo(() => {
    const preferred = codePatternCodes.find((item) => item.CODE_NAME === "PATTERN_NO")
    return preferred?.CODE_CD ?? codePatternCodes[0]?.CODE_CD ?? FALLBACK_CODE_PATTERN
  }, [codePatternCodes])

  const codePatternOptions = useMemo(() => {
    if (codePatternCodes.length === 0) {
      return [{ value: FALLBACK_CODE_PATTERN, text: FALLBACK_CODE_PATTERN }]
    }

    return codePatternCodes.map((item) => ({
      value: item.CODE_CD,
      text: t(item.CODE_NAME, item.NOTE?.trim() || item.CODE_CD),
    }))
  }, [codePatternCodes, t])

  const resetTypeOptions = useMemo(
    () => [
      { value: "NONE", text: t("RESET_NONE", "Không đặt lại") },
      { value: "YEAR", text: t("RESET_YEAR", "Theo năm") },
      { value: "MONTH", text: t("RESET_MONTH", "Theo tháng") },
    ],
    [t],
  )

  useMasterListLoadError(isError, loadError, t, "Failed to load code sequences")

  useEffect(() => {
    setItems(
      sequenceRows.map((item) => ({
        ...item,
        CODE_PATTERN: item.CODE_PATTERN || defaultCodePattern,
        IS_USE: normalizeUseFlag(item.IS_USE),
      })),
    )
  }, [defaultCodePattern, sequenceRows])

  useEffect(() => {
    const timers = saveTimersRef.current
    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId))
      timers.clear()
    }
  }, [])

  const filteredItems = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    const sorted = items.slice().sort((a, b) => {
      const left = translate(String(a.OBJECT_TYPE ?? "").trim())
      const right = translate(String(b.OBJECT_TYPE ?? "").trim())
      return left.localeCompare(right, undefined, { sensitivity: "base" })
    })

    if (!normalized) {
      return sorted
    }

    return sorted.filter((row) => {
      const title = translate(String(row.OBJECT_TYPE ?? "").trim())
      const haystack = `${title} ${row.OBJECT_TYPE} ${row.PREFIX} ${row.SUFFIX}`.toLowerCase()
      return haystack.includes(normalized)
    })
  }, [items, keyword, translate])

  const buildPayload = useCallback(
    (item: SysCodeSequence): SysCodeSequenceRequest => ({
      COMPANY_CD: companyCd,
      OBJECT_TYPE: item.OBJECT_TYPE ?? "",
      MENU_CODE: item.MENU_CODE ?? "",
      CODE_FIELD: item.CODE_FIELD ?? "",
      PREFIX: item.PREFIX ?? "",
      SUFFIX: item.SUFFIX ?? "",
      CODE_PATTERN: item.CODE_PATTERN ?? defaultCodePattern,
      CURRENT_NO: item.CURRENT_NO ?? 0,
      NUMBER_LENGTH: item.NUMBER_LENGTH ?? 4,
      RESET_TYPE: item.RESET_TYPE ?? "NONE",
      RESET_KEY: item.RESET_KEY ?? "",
      IS_USE: normalizeUseFlag(item.IS_USE),
    }),
    [companyCd, defaultCodePattern],
  )

  const persistRow = useCallback(
    async (row: SysCodeSequence) => {
      if (typeof row.ID !== "number" || row.ID <= 0) {
        return
      }

      const key = rowKey(row)
      setSavingKey(key)
      try {
        await updateSysCodeSequence(row.ID, buildPayload(row))
      } catch (error) {
        notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3500)
        await invalidateSequences()
        await refetchSequences()
      } finally {
        setSavingKey((current) => (current === key ? "" : current))
      }
    },
    [buildPayload, invalidateSequences, refetchSequences, t],
  )

  const schedulePersist = useCallback(
    (row: SysCodeSequence) => {
      const key = rowKey(row)
      const existing = saveTimersRef.current.get(key)
      if (existing) {
        window.clearTimeout(existing)
      }

      const timerId = window.setTimeout(() => {
        saveTimersRef.current.delete(key)
        void persistRow(row)
      }, SAVE_DEBOUNCE_MS)

      saveTimersRef.current.set(key, timerId)
    },
    [persistRow],
  )

  const patchRow = useCallback(
    (row: SysCodeSequence, patch: Partial<SysCodeSequence>) => {
      const key = rowKey(row)
      let nextRow: SysCodeSequence | null = null
      setItems((current) =>
        current.map((item) => {
          if (rowKey(item) !== key) {
            return item
          }
          nextRow = { ...item, ...patch }
          return nextRow
        }),
      )
      if (nextRow) {
        schedulePersist(nextRow)
      }
    },
    [schedulePersist],
  )

  const toggleExpanded = useCallback((key: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const handleReload = useCallback(async () => {
    await invalidateSequences()
    await refetchSequences()
  }, [invalidateSequences, refetchSequences])

  return (
    <div className="sys-code-sequence">
      <div className="sys-code-sequence__toolbar">
        <TextBox
          value={keyword}
          height={28}
          stylingMode="outlined"
          mode="search"
          width="100%"
          placeholder={t("QUICK_SEARCH", "Tìm chứng từ...")}
          valueChangeEvent="input"
          onValueChanged={(event) => setKeyword(String(event.value ?? ""))}
        />
        <Button
          icon="refresh"
          stylingMode="text"
          hint={t("btnRefresh", "Làm mới")}
          onClick={() => void handleReload()}
        />
      </div>

      <div className="sys-code-sequence__list">
        {filteredItems.length === 0 ? (
          <div className="sys-code-sequence__empty">
            {t("SYS_CODE_SEQUENCE_EMPTY", "Chưa có cấu hình số chứng từ.")}
          </div>
        ) : (
          <>
            <div className="sys-code-sequence__head" aria-hidden>
              <span>{t("OBJECT_TYPE", "Loại chứng từ")}</span>
              <span>{t("PREFIX", "Tiền tố")}</span>
              <span>{t("CURRENT_NO", "Số HT")}</span>
              <span>{t("NEXT_CODE", "Số tiếp theo")}</span>
              <span />
              <span />
            </div>

            {filteredItems.map((row) => {
              const key = rowKey(row)
              const isSaving = savingKey === key
              const isExpanded = expandedKeys.has(key)
              const isActive = normalizeUseFlag(row.IS_USE) === "1"
              const objectLabel =
                translate(String(row.OBJECT_TYPE ?? "").trim()) || row.OBJECT_TYPE || "—"
              const preview = buildPreviewCode(row)
              const resetType = String(row.RESET_TYPE ?? "NONE").toUpperCase()
              const showResetKey = resetType === "YEAR" || resetType === "MONTH"

              return (
                <div
                  key={key}
                  className={`sys-code-sequence__row${isSaving ? " is-saving" : ""}${
                    isActive ? "" : " is-inactive"
                  }${isExpanded ? " is-expanded" : ""}`}
                >
                  <div className="sys-code-sequence__main">
                    <div className="sys-code-sequence__name" title={row.OBJECT_TYPE}>
                      {objectLabel}
                    </div>

                    <TextBox
                      value={row.PREFIX}
                      height={26}
                      stylingMode="outlined"
                      width="100%"
                      valueChangeEvent="input"
                      onValueChanged={(event) => {
                        if (event.event == null) {
                          return
                        }
                        patchRow(row, { PREFIX: String(event.value ?? "") })
                      }}
                    />

                    <NumberBox
                      value={Number(row.CURRENT_NO) || 0}
                      height={26}
                      min={0}
                      showSpinButtons={false}
                      stylingMode="outlined"
                      width="100%"
                      onValueChanged={(event) => {
                        if (event.event == null) {
                          return
                        }
                        patchRow(row, {
                          CURRENT_NO: Math.max(0, Math.trunc(Number(event.value ?? 0)) || 0),
                        })
                      }}
                    />

                    <div className="sys-code-sequence__next" title={t("NEXT_CODE", "Số tiếp theo")}>
                      {preview}
                    </div>

                    <CheckBox
                      value={isActive}
                      hint={t("IS_USE", "Đang dùng")}
                      onValueChanged={(event) => {
                        if (event.event == null) {
                          return
                        }
                        patchRow(row, { IS_USE: event.value ? "1" : "0" })
                      }}
                    />

                    <button
                      type="button"
                      className="sys-code-sequence__more"
                      title={isExpanded ? t("COLLAPSE", "Thu gọn") : t("ADVANCED", "Nâng cao")}
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpanded(key)}
                    >
                      {isExpanded ? "▾" : "▸"}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="sys-code-sequence__advanced">
                      <label className="sys-code-sequence__field">
                        <span>{t("SUFFIX", "Hậu tố")}</span>
                        <TextBox
                          value={row.SUFFIX}
                          height={26}
                          stylingMode="outlined"
                          width="100%"
                          valueChangeEvent="input"
                          onValueChanged={(event) => {
                            if (event.event == null) {
                              return
                            }
                            patchRow(row, { SUFFIX: String(event.value ?? "") })
                          }}
                        />
                      </label>

                      <label className="sys-code-sequence__field">
                        <span>{t("NUMBER_LENGTH", "Độ dài số")}</span>
                        <NumberBox
                          value={Number(row.NUMBER_LENGTH) || 4}
                          height={26}
                          min={1}
                          max={12}
                          showSpinButtons={false}
                          stylingMode="outlined"
                          width="100%"
                          onValueChanged={(event) => {
                            if (event.event == null) {
                              return
                            }
                            patchRow(row, {
                              NUMBER_LENGTH: Math.max(
                                1,
                                Math.min(12, Math.trunc(Number(event.value ?? 4)) || 4),
                              ),
                            })
                          }}
                        />
                      </label>

                      <label className="sys-code-sequence__field sys-code-sequence__field--wide">
                        <span>{t("CODE_PATTERN", "Mẫu số")}</span>
                        <SelectBox
                          dataSource={codePatternOptions}
                          valueExpr="value"
                          displayExpr="text"
                          value={row.CODE_PATTERN || defaultCodePattern}
                          height={26}
                          stylingMode="outlined"
                          width="100%"
                          searchEnabled
                          onValueChanged={(event) => {
                            if (event.event == null) {
                              return
                            }
                            patchRow(row, {
                              CODE_PATTERN: String(event.value ?? defaultCodePattern),
                            })
                          }}
                        />
                      </label>

                      <label className="sys-code-sequence__field">
                        <span>{t("RESET_TYPE", "Đặt lại số")}</span>
                        <SelectBox
                          dataSource={resetTypeOptions}
                          valueExpr="value"
                          displayExpr="text"
                          value={resetType}
                          height={26}
                          stylingMode="outlined"
                          width="100%"
                          onValueChanged={(event) => {
                            if (event.event == null) {
                              return
                            }
                            patchRow(row, { RESET_TYPE: String(event.value ?? "NONE") })
                          }}
                        />
                      </label>

                      {showResetKey ? (
                        <label className="sys-code-sequence__field">
                          <span>{t("RESET_KEY", "Kỳ hiện tại")}</span>
                          <TextBox
                            value={row.RESET_KEY || "—"}
                            height={26}
                            stylingMode="outlined"
                            width="100%"
                            readOnly
                          />
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </>
        )}
      </div>

      <LoadPanel
        shading
        visible={loading}
        showIndicator
        showPane
        shadingColor="rgba(15,23,42,0.2)"
      />
    </div>
  )
}
