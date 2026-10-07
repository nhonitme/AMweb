import { useCallback, useContext, useMemo } from "react"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import { restoreLookupGridCellFocus, type LookupGridCellValueHost, setLookupGridCellValue, trimLookupText } from "./lookupHelpers"
import { einvLhhdtrungLookupStore, type EinvLhhdtrungLookupItem } from "./einvLhhdtrungLookupStore"
import { LanguageContext } from "@/lib/i18nLoader"
import { formatSysCodeOptionText, getSysCodeDisplayText, type SysCodeTranslate } from "@/lib/sysCodeUtils"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: number | null) => void
  lhhdtrungField?: string
  lhhdtrungFieldCaption?: string
  lhhdtrungNameCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  autoOpen?: LookupOpenMode | null
}

function toLhhdtrungCode(value: LookupValue): string {
  if (value === null || value === undefined || value === "") {
    return ""
  }

  return String(value).trim()
}

function toLhhdtrungNumber(value: LookupValue): number | null {
  const parsed = Number(toLhhdtrungCode(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export default function EinvLhhdtrungLookupCellEditor({
  dataSource = einvLhhdtrungLookupStore,
  value,
  rowIndex,
  grid,
  setValue,
  lhhdtrungField = "SPECIAL.LHHDTRUNG",
  lhhdtrungFieldCaption = "Special type",
  lhhdtrungNameCaption = "Description",
  placeholder = "Select special type",
  popupTitle = "Select special type",
  buttonHint = "Open special type list",
  autoOpen,
}: Props) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const lookupValue = useMemo(() => toLhhdtrungCode(value), [value])

  const displayExpr = useCallback(
    (item: EinvLhhdtrungLookupItem | null) => formatSysCodeOptionText(item, translate),
    [translate],
  )

  const applyLhhdtrung = useCallback(
    (item: EinvLhhdtrungLookupItem) => {
      const numeric = toLhhdtrungNumber(item.CODE_CD)
      setValue(numeric)
      setLookupGridCellValue(grid, rowIndex, lhhdtrungField, numeric)
      restoreLookupGridCellFocus(grid, rowIndex, lhhdtrungField)
    },
    [grid, lhhdtrungField, rowIndex, setValue],
  )

  const clearLhhdtrung = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, lhhdtrungField, null)
    restoreLookupGridCellFocus(grid, rowIndex, lhhdtrungField)
  }, [grid, lhhdtrungField, rowIndex, setValue])

  return (
    <BaseLookupCellEditor<EinvLhhdtrungLookupItem>
      dataSource={dataSource}
      value={lookupValue}
      valueExpr="CODE_CD"
      displayExpr={displayExpr}
      filterFocusField="CODE_CD"
      searchExpr={["CODE_CD", "CODE_NAME", "NOTE"]}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      autoOpen={autoOpen}
      dropDownWidth={460}
      dropDownHeight={280}
      popupWidth="min(760px, 96vw)"
      popupHeight="min(560px, 90vh)"
      popupGridHeight="calc(min(560px, 90vh) - 92px)"
      onApply={applyLhhdtrung}
      onClear={clearLhhdtrung}
      columns={[
        { dataField: "CODE_CD", caption: lhhdtrungFieldCaption, width: 80 },
        {
          dataField: "CODE_NAME",
          caption: lhhdtrungNameCaption,
          minWidth: 240,
          calculateCellValue: (row) => getSysCodeDisplayText(row, translate),
        },
      ]}
    />
  )
}

export function formatEinvLhhdtrungDisplay(
  value: LookupValue,
  items: EinvLhhdtrungLookupItem[],
  translate?: SysCodeTranslate,
): string {
  const code = toLhhdtrungCode(value)
  if (!code) {
    return ""
  }

  const item = items.find((entry) => trimLookupText(entry.CODE_CD) === code)
  return item ? formatSysCodeOptionText(item, translate) : code
}
