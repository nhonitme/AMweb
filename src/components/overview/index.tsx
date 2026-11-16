import {
  MonthlyChart as MonthlyChartImpl,
  OverviewKPI as OverviewKPIImpl,
  OverviewLayout as OverviewLayoutImpl,
  OverviewPanel as OverviewPanelImpl,
} from "./am-overview-layout.vendor.js"
import type {
  MonthlyChartProps,
  OverviewKPIProps,
  OverviewLayoutProps,
  OverviewPanelProps,
} from "./overviewTypes"

export type {
  MonthlyChartProps,
  OverviewKPIProps,
  OverviewLayoutProps,
  OverviewPanelProps,
} from "./overviewTypes"

// Vendor JS infers every destructured prop as required; wrappers keep the public API typed.
export function OverviewKPI(props: OverviewKPIProps) {
  return <OverviewKPIImpl {...(props as never)} />
}

export function OverviewPanel(props: OverviewPanelProps) {
  return <OverviewPanelImpl {...(props as never)} />
}

export function OverviewLayout(props: OverviewLayoutProps) {
  return <OverviewLayoutImpl {...(props as never)} />
}

export function MonthlyChart(props: MonthlyChartProps) {
  return <MonthlyChartImpl {...(props as never)} />
}
