import { useCallback, useContext, useMemo } from "react"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import { restoreLookupGridCellFocus, type LookupGridCellValueHost, setLookupGridCellValue, trimLookupText } from "./lookupHelpers"
import { einvTchatLookupStore, type EinvTchatLookupItem } from "./einvTchatLookupStore"
import { LanguageContext } from "@/lib/i18nLoader"
import { formatSysCodeOptionText, getSysCodeDisplayText, type SysCodeTranslate } from "@/lib/sysCodeUtils"

const DEFAULT_TCHAT = 1

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: number | null) => void
  tchatField?: string
  tchatFieldCaption?: string
  tchatNameCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  autoOpen?: LookupOpenMode | null
}

function toTchatCode(value: LookupValue): string {
  if (value === null || value === undefined || value === "") {
    return String(DEFAULT_TCHAT)
  }

  return String(value).trim() || String(DEFAULT_TCHAT)
}

function toTchatNumber(value: LookupValue): number {
  const parsed = Number(toTchatCode(value))
  return Number.isFinite(parsed) ? parsed : DEFAULT_TCHAT
}

export default function EinvTchatLookupCellEditor({
  dataSource = einvTchatLookupStore,
  value,
  rowIndex,
  grid,
  setValue,
  tchatField = "TCHAT",
  tchatFieldCaption = "Line type",
  tchatNameCaption = "Description",
  placeholder = "Select line type",
  popupTitle = "Select line type",
  buttonHint = "Open line type list",
  autoOpen,
}: Props) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const lookupValue = useMemo(() => toTchatCode(value), [value])

  const displayExpr = useCallback(
    (item: EinvTchatLookupItem | null) => formatSysCodeOptionText(item, translate),
    [translate],
  )

  const applyTchat = useCallback(
    (item: EinvTchatLookupItem) => {
      const numeric = toTchatNumber(item.CODE_CD)
      setValue(numeric)
      setLookupGridCellValue(grid, rowIndex, tchatField, numeric)
      restoreLookupGridCellFocus(grid, rowIndex, tchatField)
    },
    [grid, rowIndex, setValue, tchatField],
  )

  const clearTchat = useCallback(() => {
    setValue(DEFAULT_TCHAT)
    setLookupGridCellValue(grid, rowIndex, tchatField, DEFAULT_TCHAT)
    restoreLookupGridCellFocus(grid, rowIndex, tchatField)
  }, [grid, rowIndex, setValue, tchatField])

  return (
    <BaseLookupCellEditor<EinvTchatLookupItem>
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
      onApply={applyTchat}
      onClear={clearTchat}
      columns={[
        { dataField: "CODE_CD", caption: tchatFieldCaption, width: 80 },
        {
          dataField: "CODE_NAME",
          caption: tchatNameCaption,
          minWidth: 240,
          calculateCellValue: (row) => getSysCodeDisplayText(row, translate),
        },
      ]}
    />
  )
}

export function formatEinvTchatDisplay(
  value: LookupValue,
  items: EinvTchatLookupItem[],
  translate?: SysCodeTranslate,
): string {
  const code = toTchatCode(value)
  const item = items.find((entry) => trimLookupText(entry.CODE_CD) === code)
  return item ? formatSysCodeOptionText(item, translate) : code
}
