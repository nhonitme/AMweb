import { useState, useCallback, useEffect } from "react";
import { TablePage } from "@/components/table/TablePage";
import UnitFormModal from "./UnitFormModal";
import { exportToExcel } from "@/lib/excelUtils";
import type { UnitManagement } from "@/types/unitmanagement";
import { login } from "@/lib/login";
import { getAllUnitAPI, addUnitAPI, updateUnitAPI, deleteUnitAPI } from "@/api/unitmanagementApi";

const unitColumns = [
  { id: 'UNIT_CD', dataField: 'UNIT_CD', displayName: 'Mã đơn vị tính', width: 150, visible: true, pinned: false, originalOrder: 0 },
  { id: 'UNIT_NM', dataField: 'UNIT_NM', displayName: 'Tên đơn vị tính', width: 200, visible: true, pinned: false, originalOrder: 1 },
  { id: 'ISDEL', dataField: 'ISDEL', displayName: 'Trạng thái', width: 120, visible: true, pinned: false, originalOrder: 2 },
  { id: 'USERID', dataField: 'USERID', displayName: 'User ID', width: 120, visible: true, pinned: false, originalOrder: 3 },
];

const unitDeleteConfig = {
  title: "Xóa đơn vị tính",
  message: "Bạn có chắc chắn muốn xóa đơn vị tính {item}?",
  confirmText: "Xóa",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác.",
};

const unitBulkDeleteConfig = {
  title: "Xóa nhiều đơn vị tính",
  message: "Bạn có chắc chắn muốn xóa {count} đơn vị tính đã chọn?",
  confirmText: "Xóa tất cả",
  cancelText: "Hủy",
  warningMessage: "Hành động này không thể hoàn tác.",
};
export default function UnitManagementPage() {
  const [data, setData] = useState<UnitManagement[]>([]);
  const [isLoading, setIsInitialLoading] = useState(true);
  const [isEditLoading, setIsEditLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsInitialLoading(true);
      try {
        const result = await getAllUnitAPI();
        if (result && Array.isArray(result)) {
          const processedData: UnitManagement[] = result.map((item: any) => ({
            id: item.UNIT_CD,
            UNIT_CD: item.UNIT_CD,
            UNIT_NM: item.UNIT_NM,
            ISDEL: item.ISDEL,
            USERID: item.USERID,
          }));
          setData(processedData);
        }
      } catch (error) {
        console.error("Failed to fetch unit data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleImport = useCallback((rows: any[], method: "add" | "update" | "overwrite") => {
    console.log("Import unit data:", rows, "Method:", method);
  }, []);

  const handlePrint = useCallback((lang: "vi" | "en" | "ko") => {
    console.log("Print unit list in language:", lang);
  }, []);

  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const result = await getAllUnitAPI();
    if (result && Array.isArray(result)) {
      const refreshedData: UnitManagement[] = result.map((item: any) => ({
        id: item.UNIT_CD,
        UNIT_CD: item.UNIT_CD,
        UNIT_NM: item.UNIT_NM,
        ISDEL: item.ISDEL,
        USERID: item.USERID,
      }));
      setData(refreshedData);
    }
  }, []);

  const handleAdd = useCallback(async (newItem: UnitManagement) => {
    setIsEditLoading(true);
    try {
      const result = await addUnitAPI(newItem);
      if (result && result.success) {
        await handleRefresh();
        setIsEditLoading(false);
        return { success: true, message: result.message || "Thêm mới đơn vị tính thành công!" };
      } else {
        setIsEditLoading(false);
        return { success: false, message: result?.message || "Thêm mới đơn vị tính thất bại!" };
      }
    } catch (error) {
      setIsEditLoading(false);
      console.error("Failed to add unit:", error);
      return { success: false, message: "Thêm mới đơn vị tính thất bại!" };
    }
  }, [handleRefresh]);

  const handleEdit = useCallback(async (updatedItem: UnitManagement) => {
    setIsEditLoading(true);
    try {
      const result = await updateUnitAPI(updatedItem);
      if (result && result.success) {
        await handleRefresh();
        setIsEditLoading(false);
        return { success: true, message: result.message || "Cập nhật đơn vị tính thành công!" };
      } else {
        setIsEditLoading(false);
        return { success: false, message: result?.message || "Cập nhật đơn vị tính thất bại!" };
      }
    } catch (error) {
      setIsEditLoading(false);
      console.error("Failed to edit unit:", error);
      return { success: false, message: "Cập nhật đơn vị tính thất bại!" };
    }
  }, [handleRefresh]);

  const handleDelete = useCallback(async (id: string) => {
    setIsEditLoading(true);
    try {
      const result = await deleteUnitAPI(id);
      await handleRefresh();
      setIsEditLoading(false);
      if (result && result.success) {
        return { success: true, message: result.message || "Xóa đơn vị tính thành công!" };
      } else {
        return { success: false, message: result?.message || "Xóa đơn vị tính thất bại!" };
      }
    } catch (error) {
      setIsEditLoading(false);
      console.error("Failed to delete unit:", error);
      return { success: false, message: "Xóa đơn vị tính thất bại!" };
    }
  }, [handleRefresh]);

  const handleExport = useCallback(() => {
    exportToExcel(data, unitColumns, "danh-sach-don-vi-tinh.xlsx", "DonViTinh");
    alert("Đã xuất dữ liệu đơn vị tính ra Excel thành công!");
  }, [data]);

  return (
    <TablePage
      title="Quản lý đơn vị tính"
      description="Quản lý danh sách đơn vị tính"
      columns={unitColumns}
      data={data}
      isInitialLoading={isLoading || isEditLoading}
      onImport={handleImport}
      onPrint={handlePrint}
      onRefresh={handleRefresh}
      onExport={handleExport}
      searchFields={["UNIT_CD", "UNIT_NM", "USERID"]}
      enableTreeView={false}
      companyInfo={{
        name: "Công ty TNHH ABC Technology",
        address: "123 Đường ABC, Quận Ba Đình, Hà Nội",
        taxCode: "0123456789",
      }}
      FormModalComponent={UnitFormModal}
      deleteConfig={unitDeleteConfig}
      bulkDeleteConfig={unitBulkDeleteConfig}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
