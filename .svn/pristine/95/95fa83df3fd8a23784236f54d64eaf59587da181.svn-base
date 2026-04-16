import type { FormConfig, DeleteConfig } from "@/types/form";

export const receiptFormConfig: FormConfig = {
  title: "Thông tin phiếu thu",
  description: "Thêm hoặc chỉnh sửa thông tin phiếu thu",
  fields: [
    {
      id: "receiptNo",
      name: "receiptNo",
      label: "Số chứng từ",
      type: "text",
      required: true,
      placeholder: "Nhập số chứng từ",
      validation: {
        maxLength: 50,
      },
    },
    {
      id: "transactionDate",
      name: "transactionDate",
      label: "Ngày giao dịch",
      type: "text",
      required: true,
      placeholder: "yyyy-mm-dd",
      validation: {
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      },
    },
    {
      id: "amount",
      name: "amount",
      label: "Số tiền",
      type: "number",
      required: true,
      placeholder: "Nhập số tiền",
      validation: {
        min: 0,
      },
    },
    {
      id: "description1",
      name: "description1",
      label: "Mô tả 1",
      type: "textarea",
      required: false,
      placeholder: "Nhập mô tả chi tiết",
      validation: {
        maxLength: 500,
      },
    },
    {
      id: "description2",
      name: "description2",
      label: "Mô tả 2",
      type: "textarea",
      required: false,
      placeholder: "Nhập mô tả bổ sung",
      validation: {
        maxLength: 500,
      },
    },
    {
      id: "receiverName",
      name: "receiverName",
      label: "Người nhận tiền",
      type: "text",
      required: true,
      placeholder: "Nhập họ tên người nhận tiền",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "modifiedDate",
      name: "modifiedDate",
      label: "Ngày sửa đổi",
      type: "text",
      required: false,
      placeholder: "yyyy-mm-dd",
      validation: {
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      },
    },
    {
      id: "isLocked",
      name: "isLocked",
      label: "Đã khóa",
      type: "select",
      required: false,
      options: [
        { label: "Chưa khóa", value: "false" },
        { label: "Đã khóa", value: "true" },
      ],
    },
    {
      id: "email",
      name: "email",
      label: "Email",
      type: "email",
      required: false,
      placeholder: "Nhập địa chỉ email",
      validation: {
        pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
      },
    },
    {
      id: "attachment",
      name: "attachment",
      label: "File đính kèm",
      type: "text",
      required: false,
      placeholder: "Đường dẫn file đính kèm",
      validation: {
        maxLength: 500,
      },
    },
    {
      id: "createdBy",
      name: "createdBy",
      label: "Người tạo",
      type: "text",
      required: false,
      placeholder: "Tên người tạo",
      validation: {
        maxLength: 100,
      },
    },
    {
      id: "currentEditor",
      name: "currentEditor",
      label: "Người sửa đổi hiện tại",
      type: "text",
      required: false,
      placeholder: "Tên người sửa đổi",
      validation: {
        maxLength: 100,
      },
    },
    {
      id: "costCenter1",
      name: "costCenter1",
      label: "Đối tượng tập hợp chi phí 1",
      type: "text",
      required: false,
      placeholder: "Mã đối tượng chi phí 1",
      validation: {
        maxLength: 50,
      },
    },
    {
      id: "costCenter2",
      name: "costCenter2",
      label: "Đối tượng tập hợp chi phí 2",
      type: "text",
      required: false,
      placeholder: "Mã đối tượng chi phí 2",
      validation: {
        maxLength: 50,
      },
    },
    {
      id: "debit",
      name: "debit",
      label: "Nợ",
      type: "text",
      required: false,
      placeholder: "Số tài khoản nợ",
      validation: {
        maxLength: 20,
      },
    },
    {
      id: "debitAccountName",
      name: "debitAccountName",
      label: "Tên tài khoản nợ",
      type: "text",
      required: false,
      placeholder: "Tên tài khoản nợ",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "credit",
      name: "credit",
      label: "Có",
      type: "text",
      required: false,
      placeholder: "Số tài khoản có",
      validation: {
        maxLength: 20,
      },
    },
    {
      id: "creditAccountName",
      name: "creditAccountName",
      label: "Tên tài khoản có",
      type: "text",
      required: false,
      placeholder: "Tên tài khoản có",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "amountSecond",
      name: "amountSecond",
      label: "Số tiền (2)",
      type: "number",
      required: false,
      placeholder: "Số tiền bổ sung",
      validation: {
        min: 0,
      },
    },
    {
      id: "fcAmount",
      name: "fcAmount",
      label: "FC Số tiền",
      type: "number",
      required: false,
      placeholder: "Số tiền ngoại tệ",
      validation: {
        min: 0,
      },
    },
    {
      id: "country",
      name: "country",
      label: "Quốc gia",
      type: "text",
      required: false,
      placeholder: "Tên quốc gia",
      validation: {
        maxLength: 100,
      },
    },
    {
      id: "customerCode",
      name: "customerCode",
      label: "Mã khách hàng",
      type: "text",
      required: false,
      placeholder: "Mã khách hàng",
      validation: {
        maxLength: 50,
      },
    },
    {
      id: "customerName",
      name: "customerName",
      label: "Tên khách hàng",
      type: "text",
      required: false,
      placeholder: "Tên khách hàng",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "bankName",
      name: "bankName",
      label: "Tên ngân hàng",
      type: "text",
      required: false,
      placeholder: "Tên ngân hàng",
      validation: {
        maxLength: 255,
      },
    },
    {
      id: "manageCode",
      name: "manageCode",
      label: "Mã số quản lý",
      type: "text",
      required: false,
      placeholder: "Mã quản lý nội bộ",
      validation: {
        maxLength: 50,
      },
    },
    {
      id: "manageCode2",
      name: "manageCode2",
      label: "Mã số quản lý 2",
      type: "text",
      required: false,
      placeholder: "Mã quản lý nội bộ 2",
      validation: {
        maxLength: 50,
      },
    },
    {
      id: "note1",
      name: "note1",
      label: "Quản lý ghi chú 1",
      type: "textarea",
      required: false,
      placeholder: "Ghi chú quản lý 1",
      validation: {
        maxLength: 500,
      },
    },
    {
      id: "note2",
      name: "note2",
      label: "Quản lý ghi chú 2",
      type: "textarea",
      required: false,
      placeholder: "Ghi chú quản lý 2",
      validation: {
        maxLength: 500,
      },
    },
    {
      id: "inventory",
      name: "inventory",
      label: "Hàng tồn kho",
      type: "text",
      required: false,
      placeholder: "Liên kết với hàng tồn kho",
      validation: {
        maxLength: 100,
      },
    },
  ],
};

export const receiptDeleteConfig: DeleteConfig = {
  title: "Xóa phiếu thu",
  message: "Bạn có chắc chắn muốn xóa phiếu thu này?",
  confirmText: "Xóa",
  cancelText: "Hủy",
};

export const receiptBulkDeleteConfig: DeleteConfig = {
  title: "Xóa nhiều phiếu thu",
  message: "Bạn có chắc chắn muốn xóa {count} phiếu thu đã chọn?",
  confirmText: "Xóa tất cả",
  cancelText: "Hủy",
};
