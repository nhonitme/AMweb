export interface PagedResult<T> {
  data: T[]
  pageNumber: number
  pageSize: number
  totalRecords: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
  message?: string
  success?: boolean
}
