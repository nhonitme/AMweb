"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReceiptTwoViewTable from "./ReceiptTwoViewTable";


interface Receipt {
  id: string;
  receiptNo: string;
  transactionDate: string;
  amount: number;
  description1?: string;
  description2?: string;
  receiverName: string;
  modifiedDate?: string;
  isLocked?: string;
  email?: string;
  attachment?: string;
  createdBy?: string;
  currentEditor?: string;
  costCenter1?: string;
  costCenter2?: string;
  debit?: string;
  debitAccountName?: string;
  credit?: string;
  creditAccountName?: string;
  amountSecond?: number;
  fcAmount?: number;
  country?: string;
  customerCode?: string;
  customerName?: string;
  bankName?: string;
  manageCode?: string;
  manageCode2?: string;
  note1?: string;
  note2?: string;
  inventory?: string;
}

// Generate mock data
const generateMockData = (count: number): Receipt[] => {
  const data: Receipt[] = [];
  for (let i = 1; i <= count; i++) {
    data.push({
      id: i.toString(),
      receiptNo: `PT${String(i).padStart(4, "0")}`,
      transactionDate: "2025-07-29",
      amount: Math.floor(Math.random() * 10000000) + 100000,
      description1: `Thu tiền bán hàng khách hàng ${i}`,
      description2: `Thanh toán hóa đơn số ${i}`,
      receiverName: `Nguyễn Văn ${String.fromCharCode(65 + (i % 26))}`,
      modifiedDate: "2025-07-29",
      isLocked: i % 3 === 0 ? "true" : "false",
      email: `customer${i}@company.com`,
      attachment: i % 4 === 0 ? `receipt_${i}.pdf` : "",
      createdBy: `Admin${(i % 3) + 1}`,
      currentEditor: `User${(i % 5) + 1}`,
      costCenter1: `CC${String(i % 10).padStart(3, "0")}`,
      costCenter2: `CC${String((i + 1) % 10).padStart(3, "0")}`,
      debit: "111",
      debitAccountName: "Tiền mặt",
      credit: "131",
      creditAccountName: "Phải thu khách hàng",
      amountSecond: Math.floor(Math.random() * 5000000) + 50000,
      fcAmount: Math.floor(Math.random() * 1000) + 100,
      country: "Việt Nam",
      customerCode: `KH${String(i).padStart(4, "0")}`,
      customerName: `Công ty TNHH ${i}`,
      bankName: ["Vietcombank", "BIDV", "Techcombank", "MB Bank"][i % 4],
      manageCode: `MGT${String(i).padStart(4, "0")}`,
      manageCode2: `MGT2${String(i).padStart(4, "0")}`,
      note1: `Ghi chú quản lý 1 cho phiếu thu ${i}`,
      note2: `Ghi chú quản lý 2 cho phiếu thu ${i}`,
      inventory: i % 5 === 0 ? `Kho ${i % 3 + 1}` : "",
    });
  }
  return data;
};

export default function ReceiptManagementPage() {
  const [data] = useState<Receipt[]>(() => generateMockData(50));
  const navigate = useNavigate();

  return (
    <div className="">
      <ReceiptTwoViewTable data={data} />
    </div>
  );
}
