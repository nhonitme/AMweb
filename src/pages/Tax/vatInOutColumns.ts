import type { VatInOutInvoice } from "@/api/vatInOutApi"

export type VatInvoiceColumn = {
  field: keyof VatInOutInvoice
  caption: string
  width: number
  type?: "number" | "date"
  hidden?: boolean
}

export const VAT_INVOICE_COLUMNS: readonly VatInvoiceColumn[] = [
  { field: "tdlap", caption: "Ngày hóa đơn", width: 115, type: "date" },
  { field: "khmshdon", caption: "Mẫu số", width: 90 },
  { field: "khmshdon_ten", caption: "Loại hóa đơn", width: 160 },
  { field: "khhdon", caption: "Ký hiệu", width: 100 },
  { field: "shdon", caption: "Số hóa đơn", width: 115 },
  { field: "tthai_ten", caption: "Trạng thái", width: 165 },
  { field: "ten", caption: "Tên đối tượng", width: 250 },
  { field: "mst", caption: "Mã số thuế", width: 130 },
  { field: "dchi", caption: "Địa chỉ", width: 250 },
  { field: "dvtte", caption: "Loại tiền", width: 90 },
  { field: "TGia", caption: "Tỷ giá", width: 110, type: "number" },
  { field: "tgtcthue", caption: "Tiền trước thuế", width: 150, type: "number" },
  { field: "tgtthue", caption: "Tiền thuế", width: 140, type: "number" },
  { field: "tgtttbso", caption: "Tổng thanh toán", width: 160, type: "number" },
  { field: "ttcktmai", caption: "Chiết khấu", width: 140, type: "number" },
  { field: "CHIT_NO", caption: "Số chứng từ", width: 130 },
  { field: "CHIT_YMD", caption: "Ngày chứng từ", width: 120, type: "date" },
  { field: "GChu", caption: "Ghi chú", width: 220 },
  { field: "mtdtchieu", caption: "Mã tra cứu", width: 180 },
  { field: "nbten", caption: "Tên người bán", width: 250, hidden: true },
  { field: "nbdchi", caption: "Địa chỉ người bán", width: 250, hidden: true },
  { field: "nbmst", caption: "Mã số thuế người bán", width: 150, hidden: true },
  { field: "nmten", caption: "Tên người mua", width: 250, hidden: true },
  { field: "nmdchi", caption: "Địa chỉ người mua", width: 250, hidden: true },
  { field: "nmmst", caption: "Mã số thuế người mua", width: 150, hidden: true },
  { field: "tthai", caption: "Mã trạng thái", width: 110, hidden: true },
  { field: "tdlap_ten", caption: "Ngày lập (hiển thị)", width: 120, hidden: true },
  { field: "CHIT_TYPE", caption: "Loại chứng từ", width: 110, hidden: true },
]
