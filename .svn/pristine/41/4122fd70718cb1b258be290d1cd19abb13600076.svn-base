"use client"

import { useState, useCallback } from "react"
import { TablePage } from "@/components/table/TablePage"
import { costObjectColumns } from "./costObjectConfig"
import { costObjectImportConfig } from "./costObjectImportConfig"
import { costObjectPrintConfig } from "./costObjectPrintConfig"
import { costObjectDeleteConfig, costObjectBulkDeleteConfig } from "./costObjectFormConfig"
import CostCenterFormModal from "./CostCenterFormModal"
import { exportToExcel } from "@/lib/excelUtils"

interface DoiTuongTapHopChiPhi {
  id: string
  code: string
  nameVi: string
  nameEn: string
  nameKo: string
  parentObject: string
  notes: string
  createdDate: string
  status: "active" | "inactive"
}

// Mock data generator
const generateMockData = (count: number): DoiTuongTapHopChiPhi[] => {
  const data: DoiTuongTapHopChiPhi[] = []
  const departments = ["Sản Xuất", "Marketing", "Kế Toán", "IT", "Nhân Sự", "Kinh Doanh", "Vận Hành", "Chất Lượng"]
  const subDepts = ["Team A", "Team B", "Team C", "Phòng Ban", "Bộ Phận", "Chi Nhánh"]

  for (let i = 1; i <= count; i++) {
    const isParent = i <= Math.floor(count * 0.3)
    const parentId = isParent ? "0" : Math.floor(Math.random() * Math.floor(count * 0.3) + 1).toString()

    data.push({
      id: i.toString(),
      code: `CC${i.toString().padStart(3, "0")}`,
      nameVi: isParent
        ? `Phòng ${departments[i % departments.length]}`
        : `${subDepts[i % subDepts.length]} ${departments[i % departments.length]}`,
      nameEn: isParent
        ? `${departments[i % departments.length]} Department`
        : `${subDepts[i % subDepts.length]} ${departments[i % departments.length]}`,
      nameKo: isParent
        ? `${departments[i % departments.length]}부`
        : `${subDepts[i % subDepts.length]} ${departments[i % departments.length]}`,
      parentObject: parentId,
      notes: `Ghi chú cho đối tượng ${i}`,
      createdDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
        .toISOString()
        .split("T")[0],
      status: "active",
    })
  }

  return data
}

export default function CostObjectPage() {
  const [data, setData] = useState<DoiTuongTapHopChiPhi[]>(() => generateMockData(1000))

  const handleImport = useCallback((rows: any[], method: "add" | "update" | "overwrite") => {
    console.log("Import data:", rows, "Method:", method)
    // This logic is now handled inside TablePage's ExcelImportModal onImport prop
    // For now, we'll keep this as a placeholder if the parent needs to react to import.
    // If TablePage fully manages data, this `onImport` prop might become redundant or change purpose.
    // For this task, I'll remove the direct data manipulation here, as TablePage will do it.
  }, [])

  const handlePrint = useCallback((lang: "vi" | "en" | "ko") => {
    console.log("Print in language:", lang)
  }, [])

  // Update handlers to work with the form modal
  const handleAdd = useCallback(async (newItem: DoiTuongTapHopChiPhi) => {
    try {
      setData((prev) => [...prev, newItem])
      return { success: true, message: "Thêm mới đối tượng thành công!" }
    } catch (error) {
      console.error("Lỗi khi thêm đối tượng:", error)
      return { success: false, message: "Có lỗi xảy ra khi thêm đối tượng!" }
    }
  }, [])

  const handleEdit = useCallback(async (updatedItem: DoiTuongTapHopChiPhi) => {
    try {
      setData((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
      return { success: true, message: "Cập nhật đối tượng thành công!" }
    } catch (error) {
      console.error("Lỗi khi cập nhật đối tượng:", error)
      return { success: false, message: "Có lỗi xảy ra khi cập nhật đối tượng!" }
    }
  }, [])

  // Hàm xử lý xóa đối tượng tập hợp chi phí
  const handleDelete = useCallback(async (id: string) => {
    try {
      setData((prev) => prev.filter((item) => item.id !== id))
      return { success: true, message: "Xóa đối tượng thành công!" }
    } catch (error) {
      console.error("Lỗi khi xóa đối tượng:", error)
      return { success: false, message: "Có lỗi xảy ra khi xóa đối tượng!" }
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setData(generateMockData(1000))
  }, [])

  const handleExport = useCallback(() => {
    exportToExcel(data, costObjectColumns, "doi-tuong-tap-hop-chi-phi.xlsx", "DoiTuongChiPhi")
    alert("Đã xuất dữ liệu ra file Excel thành công!")
  }, [data])

  return (
    <TablePage
      title="Đối tượng tập hợp chi phí"
      description="Quản lý các đối tượng tập hợp chi phí"
      columns={costObjectColumns}
      data={data} // Pass the data state
      onImport={handleImport} // Keep onImport if parent needs to react
      onPrint={handlePrint}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
      onExport={handleExport}
      searchFields={["code", "nameVi", "nameEn", "nameKo"]}
      enableTreeView={true}
      parentField="parentObject"
      companyInfo={{
        name: "Công ty TNHH ABC Technology",
        address: "123 Đường ABC, Quận Ba Đình, Hà Nội",
        taxCode: "0123456789",
      }}
      excelImportConfig={costObjectImportConfig}
      printConfig={costObjectPrintConfig}
      FormModalComponent={CostCenterFormModal}
      deleteConfig={costObjectDeleteConfig}
      bulkDeleteConfig={costObjectBulkDeleteConfig}
    />
  )
}
