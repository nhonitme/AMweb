import { useCallback, useContext, useEffect, useState } from "react"
import Button from "devextreme-react/button"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"

import { fetchTaxLookupInfo } from "@/api/taxLookupApi"
import { createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions"
import { LanguageContext } from "@/lib/i18nLoader"
import { normalizeTaxCode } from "@/lib/taxCode"
import type { TaxLookupInfo } from "@/types/taxLookup"

type TaxCodeLookupFieldProps = {
  value: string
  onValueChange: (value: string) => void
  onLookupApply?: (info: TaxLookupInfo) => void
  readOnly?: boolean
  disabled?: boolean
  lookupButtonText?: string
  lookupButtonHint?: string
}

export default function TaxCodeLookupField({
  value,
  onValueChange,
  onLookupApply,
  readOnly = false,
  disabled = false,
  lookupButtonText,
  lookupButtonHint,
}: TaxCodeLookupFieldProps) {
  const [loading, setLoading] = useState(false)
  // Keep a local draft so Tab / focus traps cannot wipe uncommitted TextBox input
  // (DevExtreme default valueChangeEvent is "change", which only commits on blur).
  const [draft, setDraft] = useState(value)
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  useEffect(() => {
    setDraft(value)
  }, [value])

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const resolvedLookupText = lookupButtonText ?? t("TRA_CUU_MST", "Tra cứu")
  const resolvedLookupHint = lookupButtonHint ?? t("TRA_CUU_MST_HINT", "Tra cứu thông tin theo MST")

  const commitDraft = useCallback(
    (nextValue: string, options?: { normalize?: boolean }) => {
      const committed = options?.normalize ? normalizeTaxCode(nextValue) : nextValue
      setDraft(committed)
      if (committed !== value) {
        onValueChange(committed)
      }
      return committed
    },
    [onValueChange, value],
  )

  const handleLookup = useCallback(async () => {
    const normalizedMst = commitDraft(draft, { normalize: true })
    if (!normalizedMst) {
      notify(t("TRA_CUU_MST_REQUIRED", "Vui lòng nhập MST trước khi tra cứu"), "warning", 3000)
      return
    }

    setLoading(true)
    try {
      const info = await fetchTaxLookupInfo(normalizedMst)
      const nextTaxId = normalizeTaxCode(info.TaxID) || normalizedMst
      const nextInfo = { ...info, TaxID: nextTaxId }

      if (onLookupApply) {
        onLookupApply(nextInfo)
      } else {
        onValueChange(nextTaxId)
      }
      setDraft(nextTaxId)

      if (!nextInfo.Name.trim()) {
        notify(t("TRA_CUU_MST_NO_NAME", "Tra cứu OK nhưng không có tên đơn vị"), "warning", 3500)
      } else {
        notify(t("TRA_CUU_MST_SUCCESS", "Đã tải thông tin MST"), "success", 2500)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("TRA_CUU_MST_FAILED", "Không tra cứu được thông tin MST")
      notify(message, "error", 4000)
    } finally {
      setLoading(false)
    }
  }, [commitDraft, draft, onLookupApply, onValueChange, t])

  const fieldDisabled = disabled || readOnly || loading

  return (
    <div className="flex min-w-0 items-start gap-2">
      <TextBox
        className="min-w-0 flex-1"
        value={draft}
        readOnly={readOnly}
        disabled={disabled || loading}
        valueChangeEvent="input"
        onValueChanged={(event) => commitDraft(String(event.value ?? ""))}
        onFocusOut={() => {
          commitDraft(draft, { normalize: true })
        }}
        {...createOutlinedEditorOptions({})}
      />
      <Button
        className="shrink-0"
        disabled={fieldDisabled}
        hint={resolvedLookupHint}
        icon={loading ? undefined : "search"}
        stylingMode="outlined"
        text={loading ? t("SEARCHING", "Đang tra cứu...") : resolvedLookupText}
        type="default"
        onClick={() => void handleLookup()}
      />
    </div>
  )
}
