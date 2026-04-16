"use client"

import { useState, useCallback } from "react"

import { TablePage } from "@/components/table/TablePage"
import { companyColumns } from "./companyConfig"
import CompanyFormModal from "./CompanyFormModal"
import { companyFormConfig, companyDeleteConfig, companyBulkDeleteConfig } from "./companyFormConfig"
import { exportToExcel } from "@/lib/excelUtils"


interface Company {
  id: string
  name: string
  address: string
  taxCode: string
  province: string
  taxOfficeCode?: string
  phone?: string
  email?: string
  industry?: string[]
}

// Dữ liệu mẫu
const generateMockData = (count: number): Company[] => {
  const provinces = [
    "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Bình Dương", "Đồng Nai", "Quảng Ninh", "Thanh Hóa", "Nghệ An"
  ]
  const industries = [
    "Sản xuất", "Thương mại", "Dịch vụ", "Xây dựng", "CNTT", "Vận tải", "Tài chính", "Bất động sản", "Y tế", "Giáo dục"
  ]
  const data: Company[] = []
  for (let i = 1; i <= count; i++) {
    data.push({
      id: i.toString(),
      name: `Công ty ${i}`,
      address: `Số ${i} Đường ABC, Quận ${i % 10}, ${provinces[i % provinces.length]}`,
      taxCode: (1000000000 + i).toString(),
      province: provinces[i % provinces.length],
      taxOfficeCode: `TCT${i % 100}`,
      phone: `09${(10000000 + i).toString().slice(0,8)}`,
      email: `congty${i}@mail.com`,
      industry: [industries[i % industries.length]],
    })
  }
  return data
}

export default function CompanyManagementPage() {

  const [data, setData] = useState<Company[]>(() => generateMockData(100))

  const handleImport = useCallback((_rows: any[], _method: "add" | "update" | "overwrite") => {
    // Xử lý import excel nếu cần
  }, [])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // Hàm onAdd, onEdit đúng kiểu TablePage yêu cầu (trả về Promise)
  const handleAddCompany = async (formData: Company) => {
    try {
      // Thêm company mới vào data
      const newCompany = { ...formData, id: Date.now().toString() }
      setData((prev) => [...prev, newCompany])
      return { success: true, message: "Thêm công ty thành công!" }
    } catch (error) {
      return { success: false, message: "Có lỗi xảy ra khi thêm công ty!" }
    }
  }

  const handleEditCompany = async (formData: Company) => {
    try {
      // Cập nhật company trong data
      setData((prev) => prev.map((c) => (c.id === formData.id ? formData : c)))
      return { success: true, message: "Cập nhật công ty thành công!" }
    } catch (error) {
      return { success: false, message: "Có lỗi xảy ra khi cập nhật công ty!" }
    }
  }

  // Hàm xử lý xóa company
  const handleDeleteCompany = useCallback(async (id: string) => {
    try {
      setData((prev) => prev.filter((c) => c.id !== id));
      return { success: true, message: "Xóa công ty thành công!" };
    } catch (error) {
      console.error("Lỗi khi xóa công ty:", error);
      return { success: false, message: "Có lỗi xảy ra khi xóa công ty!" };
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setData(generateMockData(100))
  }, [])

  const handleExport = useCallback(() => {
    exportToExcel(data, companyColumns, "danh-sach-cong-ty.xlsx", "CompanyList")
    alert("Đã xuất dữ liệu ra file Excel thành công!")
  }, [data])

  return (
    <>
      <TablePage
        title="Quản lý công ty/doanh nghiệp"
        description="Quản lý danh sách công ty/doanh nghiệp"
        columns={companyColumns}
        data={data}
        onImport={handleImport}
        onPrint={handlePrint}
        onRefresh={handleRefresh}
        onExport={handleExport}
        searchFields={["name", "address", "taxCode", "province", "taxOfficeCode", "phone", "email", "industry"]}
        companyInfo={{
          name: "Công ty TNHH ABC Technology",
          address: "123 Đường ABC, Quận Ba Đình, Hà Nội",
          taxCode: "0123456789",
        }}
        formConfig={companyFormConfig}
        deleteConfig={companyDeleteConfig}
        bulkDeleteConfig={companyBulkDeleteConfig}
        FormModalComponent={CompanyFormModal}
        onAdd={handleAddCompany}
        onEdit={handleEditCompany}
        onDelete={handleDeleteCompany}
      />
    </>
  )
}
