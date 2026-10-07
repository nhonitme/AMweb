export type DashboardKpi = {
  CashBalance: number
  Revenue: number
  Expense: number
  Profit: number
  Receivables: number
  Payables: number
  VatPayable: number
  PendingVouchers: number
  PrevRevenue: number
  PrevExpense: number
  PrevProfit: number
}

export type DashboardChartItem = {
  Month: string
  Revenue: number
  Expense: number
  Profit: number
}

export type DashboardTaskItem = {
  Category: string
  Label: string
  Count: number
  Severity: string
  ActionUrl?: string
}

export type DashboardReceivable = {
  CustomerCd: string
  CustomerNm: string
  TotalAmount: number
  OverdueAmount: number
  LastVoucherYmd: string
}

export type DashboardPayable = {
  VendorCd: string
  VendorNm: string
  TotalAmount: number
  OverdueAmount: number
  LastVoucherYmd: string
}

export type DashboardTaxDeadline = {
  ReportNm: string
  Period: string
  DueDate: string
  Status: string
}

export type DashboardPeriodLockStep = {
  StepCode: string
  StepName: string
  StepOrder: number
  Status: string
  Message: string
  StartedAt: string
  FinishedAt: string
}

export type DashboardPeriodLock = {
  CurrentPeriod: string
  Status: string
  Message: string
  LockedBy: string
  LockedAt: string
  Steps: DashboardPeriodLockStep[]
}

export type DashboardRecentVoucher = {
  ChitYmd: string
  ChitNo: string
  ChitCd: string
  ChitType: string
  Amount: number
  CreateBy: string
  Status: string
  Description: string
}

export type DashboardFilter = {
  fromYmd: string
  toYmd: string
  year: string
  periodYm: string
}

export type DashboardOverviewData = {
  kpi: DashboardKpi | null
  chartData: DashboardChartItem[]
  tasks: DashboardTaskItem[]
  receivables: DashboardReceivable[]
  payables: DashboardPayable[]
  taxDeadlines: DashboardTaxDeadline[]
  periodLock: DashboardPeriodLock | null
  recentVouchers: DashboardRecentVoucher[]
}
