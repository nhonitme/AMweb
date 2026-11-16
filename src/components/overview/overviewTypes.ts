import type { ReactElement, ReactNode, Ref } from "react"
import type {
  DashboardFilter,
  DashboardOverviewData,
} from "@/types/dashboard"

export type OverviewKPIProps = {
  title: string
  value: number | null | undefined
  comparison?: string
  iconName?: "chart" | "decrease" | "increase"
  iconClass?: string
  onClick?: () => void
}

export type OverviewPanelProps = {
  title: string
  children?: ReactNode
  action?: ReactNode
  sectionRef?: Ref<HTMLElement | null>
}

export type OverviewLayoutProps = {
  children: ReactNode
  loading?: boolean
  range: DashboardFilter
  overviewData: Pick<
    DashboardOverviewData,
    | "kpi"
    | "tasks"
    | "receivables"
    | "payables"
    | "recentVouchers"
    | "periodLock"
    | "taxDeadlines"
  >
  companyCd?: string
  onTaskAction?: (actionUrl?: string) => void
}

export type MonthlyChartProps = {
  panel: ReactElement
  year: string
  loading?: boolean
}
