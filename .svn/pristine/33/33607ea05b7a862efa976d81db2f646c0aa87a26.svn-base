"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import type { ColumnConfig, BaseTableItem } from "@/types/table"

interface UseTableStateProps<T extends BaseTableItem> {
  data: T[]
  columns: ColumnConfig[]
  searchFields?: string[]
  enableTreeView?: boolean
  parentField?: string
  localStorageKey?: string
  defaultSort?: { field: keyof T; order: "asc" | "desc" } // Thêm dòng này
}

export function useTableState<T extends BaseTableItem>({
  data,
  columns: initialColumns,
  searchFields = ["code", "nameVi", "nameEn"],
  enableTreeView = false,
  parentField = "parentObject",
  localStorageKey,
  defaultSort, // Thêm dòng này
}: UseTableStateProps<T>) {
  // Search and pagination
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [isSearching, setIsSearching] = useState(false)

  // Selection
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  // Tree view
  const [expandedParents, setExpandedParents] = useState<string[]>([])

  // Loading states
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Column configuration
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(() => {
    if (typeof window !== "undefined" && localStorageKey) {
      const saved = localStorage.getItem(localStorageKey)
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error("Failed to parse column configs from localStorage", e)
        }
      }
    }
    return initialColumns
  })

  // Save column configs to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && localStorageKey) {
      localStorage.setItem(localStorageKey, JSON.stringify(columnConfigs))
    }
  }, [columnConfigs, localStorageKey])

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setIsSearching(false)
    }, 1000)

    return () => clearTimeout(handler)
  }, [searchTerm])

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm])

  // Filtered and SORTED data
  const filteredAndSortedData = useMemo(() => {
    let currentData = data

    if (debouncedSearchTerm.trim()) {
      const lowerSearchTerm = debouncedSearchTerm.toLowerCase()
      currentData = data.filter((item) =>
        searchFields.some((field) => {
          const value = item[field]
          return value && String(value).toLowerCase().includes(lowerSearchTerm)
        }),
      )
    }

    // Apply default sorting
    if (defaultSort) {
      const { field, order } = defaultSort
      currentData = [...currentData].sort((a, b) => {
        const valA = a[field]
        const valB = b[field]

        // Handle null/undefined values gracefully
        if (valA == null && valB == null) return 0
        if (valA == null) return order === "asc" ? -1 : 1 // Nulls come first in asc, last in desc
        if (valB == null) return order === "asc" ? 1 : -1

        if (typeof valA === "string" && typeof valB === "string") {
          // For date strings, parse them for correct comparison
          if (String(field).includes("Date")) {
            // Simple check for date fields like 'createdDate'
            const dateA = new Date(valA)
            const dateB = new Date(valB)
            return order === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
          }
          return order === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA)
        }
        if (typeof valA === "number" && typeof valB === "number") {
          return order === "asc" ? valA - valB : valB - valA
        }
        // Fallback for other types or mixed types (should be consistent for sorting to work well)
        return 0
      })
    }

    return currentData
  }, [data, debouncedSearchTerm, searchFields, defaultSort]) // Add defaultSort to dependencies

  // Tree structure (if enabled)
  const childrenMap = useMemo(() => {
    if (!enableTreeView) return {}

    const map: Record<string, T[]> = {}
    filteredAndSortedData.forEach((item) => {
      const parentId = item[parentField]
      if (parentId && parentId !== "0") {
        map[parentId] = map[parentId] || []
        map[parentId].push(item)
      }
    })
    return map
  }, [filteredAndSortedData, enableTreeView, parentField])

  const rootItems = useMemo(() => {
    if (!enableTreeView) return filteredAndSortedData // Sử dụng filteredAndSortedData
    return filteredAndSortedData.filter((item) => !item[parentField] || item[parentField] === "0")
  }, [filteredAndSortedData, enableTreeView, parentField])

  // Flattened items for display
  interface FlattenedItem {
    item: T
    depth: number
  }

  const flattenedItems = useMemo(() => {
    if (!enableTreeView) {
      return filteredAndSortedData.map((item) => ({ item, depth: 0 })) // Sử dụng filteredAndSortedData
    }

    const flattenWithDepth = (items: T[], depth = 0): FlattenedItem[] =>
      items.reduce<FlattenedItem[]>((acc, item) => {
        acc.push({ item, depth })
        if (expandedParents.includes(item.id) && childrenMap[item.id]) {
          acc.push(...flattenWithDepth(childrenMap[item.id], depth + 1))
        }
        return acc
      }, [])

    return searchTerm ? filteredAndSortedData.map((item) => ({ item, depth: 0 })) : flattenWithDepth(rootItems) // Sử dụng filteredAndSortedData
  }, [searchTerm, filteredAndSortedData, rootItems, expandedParents, childrenMap, enableTreeView])

  // Pagination
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(flattenedItems.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const displayed = flattenedItems.slice(startIndex, endIndex)

    return { totalPages, startIndex, endIndex, displayed }
  }, [flattenedItems, currentPage, itemsPerPage])

  // Ordered columns
  const getOrderedColumns = useMemo(() => {
    const visibleColumns = columnConfigs.filter((col) => col.visible)
    const pinnedColumns = visibleColumns.filter((col) => col.pinned).sort((a, b) => a.originalOrder - b.originalOrder)
    const unpinnedColumns = visibleColumns
      .filter((col) => !col.pinned)
      .sort((a, b) => a.originalOrder - b.originalOrder)

    return [...pinnedColumns, ...unpinnedColumns]
  }, [columnConfigs])

  // Sticky positions
  const stickyPositions = useMemo(() => {
    const orderedColumns = getOrderedColumns
    const pinnedColumns = orderedColumns.filter((col) => col.pinned)
    const positions: { [key: string]: number } = {}

    const checkboxWidth = 30
    let currentLeft = checkboxWidth

    pinnedColumns.forEach((col) => {
      positions[col.id] = currentLeft
      currentLeft += col.width
    })

    return positions
  }, [getOrderedColumns])

  // Handlers
  const toggleExpand = useCallback((id: string) => {
    setExpandedParents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedItems(checked ? paginationData.displayed.map(({ item }) => item.id) : [])
    },
    [paginationData.displayed],
  )

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedItems((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }, [])

  const handleColumnConfigChange = useCallback((columnId: string, field: keyof ColumnConfig, value: any) => {
    setColumnConfigs((prev) => prev.map((col) => (col.id === columnId ? { ...col, [field]: value } : col)))
  }, [])

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
    setIsSearching(true)
  }, [])

  return {
    // Data
    data: filteredAndSortedData, // Expose the sorted data
    flattenedItems,
    paginationData,
    childrenMap,

    // State
    searchTerm,
    debouncedSearchTerm,
    isSearching,
    isRefreshing,
    setIsRefreshing,
    selectedItems,
    setSelectedItems,
    expandedParents,
    currentPage,
    itemsPerPage,

    // Column config
    columnConfigs,
    setColumnConfigs,
    getOrderedColumns,
    stickyPositions,

    // Handlers
    handleSearch,
    toggleExpand,
    handleSelectAll,
    handleSelectOne,
    handlePageChange,
    handleItemsPerPageChange,
    handleColumnConfigChange,
  }
}
