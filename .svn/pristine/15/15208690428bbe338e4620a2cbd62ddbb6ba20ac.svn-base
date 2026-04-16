import { useCallback, useMemo, useState } from "react"
import Popup from "devextreme-react/popup"
import SelectBox, {
  Button as SelectBoxButton,
  DropDownOptions,
  type SelectBoxTypes,
} from "devextreme-react/select-box"

import AcclistManager from "@/pages/Module/AcclistManagement/AcclistManager"
import type { AcclistInfo } from "@/types/acclist"
import { useLookupPopupHost } from "./LookupPopupHost"
import {
  firstLookupText,
  setLookupGridCellValue,
  toLookupNumber,
  trimLookupText,
} from "./lookupHelpers"

type AccDataSource = SelectBoxTypes.Properties["dataSource"]

type Props = {
  dataSource: AccDataSource
  value: string | null | undefined
  rowIndex: number
  grid: any
  setValue: (value: string | null) => void
  ValueField?: string
  NameField?: string
  IdField?: string
  LookupCodeField?: string
  LookupNameField?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
}

export default function AcclistLookupCellEditor({
  dataSource,
  value,
  rowIndex,
  grid,
  setValue,
  ValueField = "DEBIT",
  NameField = "DEBIT_NM_VIET",
  IdField = "ACC_ID",
  LookupCodeField = "ACC_CD",
  LookupNameField = "ACCTITLE_NM_VIET",
  placeholder = "Select account",
  popupTitle = "Select account",
  buttonHint = "Open account list",
}: Props) {
  const [opened, setOpened] = useState(false)
  const [popupVisible, setPopupVisible] = useState(false)
  const lookupPopupHost = useLookupPopupHost()

  const getAccountCode = useCallback(
    (item?: Partial<AcclistInfo> | null) => {
      if (!item) {
        return ""
      }

      return trimLookupText(item[LookupCodeField as keyof AcclistInfo])
    },
    [LookupCodeField],
  )

  const getAccountName = useCallback(
    (item?: Partial<AcclistInfo> | null) => {
      if (!item) {
        return ""
      }

      return firstLookupText(
        item[LookupNameField as keyof AcclistInfo],
        item.ACCTITLE_NM_VIET,
        item.ACCTITLE_NM_ENG,
        item.ACCTITLE_NM_KOR,
        item.ACCTITLE_NM_CHINA,
      )
    },
    [LookupNameField],
  )

  const displayExpr = useCallback(
    (item: AcclistInfo | null) => {
      const accCd = getAccountCode(item)
      const accNm = getAccountName(item)

      if (accCd && accNm) {
        return `${accCd}`// - ${accNm}`
      }

      return accCd || accNm
    },
    [getAccountCode, getAccountName],
  )

  const searchExpr = useMemo(
    () =>
      Array.from(
        new Set([
          LookupCodeField,
          LookupNameField,
          "ACCTITLE_NM_VIET",
          "ACCTITLE_NM_ENG",
          "ACCTITLE_NM_KOR",
          "ACCTITLE_NM_CHINA",
        ].filter((field): field is string => Boolean(field))),
      ),
    [LookupCodeField, LookupNameField],
  )

  const applyNormalizedAccount = useCallback(
    (account: {
      accId?: number | null
      accCd: string
      accNm: string
    }) => {
      setValue(account.accCd || null)
      setLookupGridCellValue(grid, rowIndex, ValueField, account.accCd)
      setLookupGridCellValue(grid, rowIndex, NameField, account.accNm)

      if (IdField) {
        setLookupGridCellValue(grid, rowIndex, IdField, account.accId ?? null)
      }

      lookupPopupHost?.closeLookupPopup()
      setOpened(false)
      setPopupVisible(false)
    },
    [IdField, NameField, ValueField, grid, rowIndex, setValue, lookupPopupHost],
  )

  const applyAccount = useCallback(
    (account: AcclistInfo | null | undefined) => {
      if (!account) {
        return
      }

      applyNormalizedAccount({
        accId: toLookupNumber(account.ACC_ID),
        accCd: getAccountCode(account),
        accNm: getAccountName(account),
      })
    },
    [applyNormalizedAccount, getAccountCode, getAccountName],
  )

  const clearAccount = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, ValueField, "")
    setLookupGridCellValue(grid, rowIndex, NameField, "")

    if (IdField) {
      setLookupGridCellValue(grid, rowIndex, IdField, null)
    }
  }, [IdField, NameField, ValueField, grid, rowIndex, setValue])

  const handleValueChanged = useCallback(
    (event: any) => {
      if (event.value == null || event.value === "") {
        clearAccount()
        return
      }

      const selectedItem = (event.component?.option?.("selectedItem") ?? event.itemData) as AcclistInfo | null | undefined
      if (selectedItem) {
        applyAccount(selectedItem)
      }
    },
    [applyAccount, clearAccount],
  )

  const renderAccountItem = useCallback(
    (item: AcclistInfo | null) => {
      if (!item) {
        return null
      }

      const accCd = getAccountCode(item)
      const accNm = getAccountName(item)

      return (
        <div className="flex items-center gap-2 py-2 leading-tight">
          <span className="font-semibold text-slate-900">{accCd || "-"}</span>
          <span className="text-slate-600">{accNm || "-"}</span>
        </div>
      )
    },
    [getAccountCode, getAccountName],
  )

  const handleOpenPopup = useCallback(() => {
    if (lookupPopupHost) {
      lookupPopupHost.openLookupPopup({
        title: popupTitle,
        width: "95vw",
        height: "90vh",
        renderContent: ({ closePopup }) => (
          <AcclistManager
            mode="lookup"
            hideToolbar={false}
            onPickAcclist={applyAccount}
            onCloseLookup={closePopup}
          />
        ),
      })
      return
    }

    setPopupVisible(true)
  }, [applyAccount, lookupPopupHost, popupTitle])

  return (
    <>
      <SelectBox
        dataSource={dataSource}
        value={value ?? null}
        valueExpr={LookupCodeField}
        displayExpr={displayExpr as (item: unknown) => string}
        itemRender={renderAccountItem}
        opened={opened}
        openOnFieldClick={true}
        deferRendering={false}
        showClearButton={true}
        showDataBeforeSearch={true}
        minSearchLength={0}
        searchEnabled={true}
        searchExpr={searchExpr}
        searchMode="contains"
        searchTimeout={0}
        placeholder={placeholder}
        noDataText="No matching accounts"
        onOpenedChange={setOpened}
        onInput={() => {
          setOpened(true)
        }}
        onValueChanged={handleValueChanged}
      >
        <DropDownOptions width={920} maxHeight={360} />
        <SelectBoxButton name="dropDown" location="after" />
        <SelectBoxButton
          name="openAcclistPopup"
          location="after"
          options={{
            icon: "search",
            stylingMode: "text",
            hint: buttonHint,
            onClick: handleOpenPopup,
          }}
        />
      </SelectBox>

      {!lookupPopupHost && popupVisible ? (
        <Popup
          visible={popupVisible}
          title={popupTitle}
          showTitle={true}
          width="95vw"
          height="90vh"
          dragEnabled={false}
          hideOnOutsideClick={false}
          onHiding={() => setPopupVisible(false)}
        >
          <AcclistManager
            mode="lookup"
            hideToolbar={false}
            onPickAcclist={applyAccount}
            onCloseLookup={() => setPopupVisible(false)}
          />
        </Popup>
      ) : null}
    </>
  )
}
