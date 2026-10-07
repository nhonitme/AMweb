import { useCallback, useState, type RefObject } from "react"

export type SearchableGridInstance = {
  searchByText?: (text: string) => void
  option?: (name: string, value?: boolean | string) => void
}

const normalizeSearchText = (value: unknown) => String(value ?? "")

export const hasSearchText = (value: string) => value.trim().length > 0

export const syncGridSearchState = (
  component: SearchableGridInstance | null | undefined,
  value: string,
) => {
  const searchText = normalizeSearchText(value)
  const hasValue = hasSearchText(searchText)

  component?.searchByText?.(searchText)
  component?.option?.("searchPanel.text", searchText)
  component?.option?.("filterRow.visible", hasValue)
  component?.option?.("filterPanel.visible", hasValue)

  return hasValue
}

export const useInlineGridSearch = <T extends SearchableGridInstance>(
  gridRef: RefObject<T | null>,
) => {
  const [searchText, setSearchText] = useState("")
  const [searchVisible, setSearchVisible] = useState(false)

  const showSearch = useCallback(() => {
    setSearchVisible(true)
  }, [])

  const handleSearchTextChange = useCallback(
    (value: string) => {
      const nextValue = normalizeSearchText(value)
      const hasValue = syncGridSearchState(gridRef.current, nextValue)

      setSearchText(nextValue)
      setSearchVisible(hasValue)
    },
    [gridRef],
  )

  const handleSearchEnter = useCallback(() => {
    const hasValue = syncGridSearchState(gridRef.current, searchText)

    setSearchVisible(hasValue)
  }, [gridRef, searchText])

  const clearSearch = useCallback(() => {
    syncGridSearchState(gridRef.current, "")
    setSearchText("")
    setSearchVisible(false)
  }, [gridRef])

  return {
    searchText,
    searchVisible,
    setSearchVisible,
    showSearch,
    handleSearchTextChange,
    handleSearchEnter,
    clearSearch,
  }
}
