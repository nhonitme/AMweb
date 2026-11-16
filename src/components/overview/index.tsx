import { useContext } from "react"
import {
  MonthlyChart as MonthlyChartImpl,
  OverviewKPI as OverviewKPIImpl,
  OverviewLayout as OverviewLayoutImpl,
  OverviewPanel as OverviewPanelImpl,
} from "./am-overview-layout.vendor.js"
import { LanguageContext } from "@/lib/i18nLoader"
import { setOverviewTranslator } from "./overviewLabels"
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

function useOverviewTranslator() {
  const { translate } = useContext(LanguageContext)
  setOverviewTranslator((key, fallback) => (translate ? translate(key, fallback) : fallback ?? key))
}

// Vendor JS infers every destructured prop as required; wrappers keep the public API typed.
export function OverviewKPI(props: OverviewKPIProps) {
  useOverviewTranslator()
  return <OverviewKPIImpl {...(props as never)} />
}

export function OverviewPanel(props: OverviewPanelProps) {
  useOverviewTranslator()
  return <OverviewPanelImpl {...(props as never)} />
}

export function OverviewLayout(props: OverviewLayoutProps) {
  useOverviewTranslator()
  return <OverviewLayoutImpl {...(props as never)} />
}

export function MonthlyChart(props: MonthlyChartProps) {
  useOverviewTranslator()
  return <MonthlyChartImpl {...(props as never)} />
}
