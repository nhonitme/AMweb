import * as XLSX from "xlsx"
import type { ColumnConfig } from "@/types/table"

/**
 * Xuất dữ liệu ra file Excel.
 * @param data Mảng các đối tượng dữ liệu cần xuất.
 * @param columns Cấu hình cột, bao gồm dataField và displayName.
 * @param fileName Tên file Excel (ví dụ: "bao-cao.xlsx").
 * @param sheetName Tên sheet trong Excel (mặc định: "Sheet1").
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ColumnConfig[],
  fileName: string,
  sheetName = "Sheet1",
) {
  /* Convert table data → worksheet rows */
  const worksheetData = data.map((item) => {
    const row: Record<string, any> = {}
    columns.forEach((col) => {
      // Sử dụng displayName làm header và dataField để lấy giá trị
      row[col.displayName] = item[col.dataField]
    })
    return row
  })

  /* Build worksheet & workbook */
  const ws = XLSX.utils.json_to_sheet(worksheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  /* Write workbook to an in-memory ArrayBuffer */
  const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  /* Trigger a browser download */
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
