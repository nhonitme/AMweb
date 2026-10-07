import React from "react"
import type { OpeningBalanceSummaryStatus } from "@/types/openingBalance"

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

export function getStatusText(
  status: OpeningBalanceSummaryStatus,
  t: (key: string, fallback?: string) => string
): string {
  switch (status) {
    case "BALANCED":
      return t("BALANCED", "Cân đối")
    case "UNBALANCED":
      return t("UNBALANCED", "Lệch số liệu")
    case "EMPTY":
      return t("EMPTY", "Chưa nhập")
    default:
      return ""
  }
}

export function getStatusClass(status: OpeningBalanceSummaryStatus): string {
  switch (status) {
    case "BALANCED":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700"
    case "UNBALANCED":
      return "border border-red-200 bg-red-50 text-red-700"
    case "EMPTY":
      return "border border-amber-200 bg-amber-50 text-amber-700"
    default:
      return "border border-gray-200 bg-gray-50 text-gray-700"
  }
}

type SummaryCardTone = "red" | "blue" | "green" | "amber"

export function SummaryCard(props: {
  title: string
  value: string
  subtitle: string
  tone: SummaryCardTone
}): React.JSX.Element {
  const toneClassMap: Record<SummaryCardTone, string> = {
    red: "rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm",
    blue: "rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-700 shadow-sm",
    green: "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 shadow-sm",
    amber: "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700 shadow-sm",
  }

  return React.createElement(
    "div",
    { className: toneClassMap[props.tone] },
    React.createElement("div", { className: "text-sm font-medium" }, props.title),
    React.createElement("div", { className: "mt-2 text-2xl font-bold" }, props.value)
    // subtitle intentionally omitted; to add back, include another createElement here
  )
}