import { useEffect, useState } from "react"
import ProgressBar from "devextreme-react/progress-bar"

type ReportLoadingProgressBarProps = {
  loading: boolean
}

/** Indeterminate top bar while a report preview request is in flight. */
export default function ReportLoadingProgressBar({ loading }: ReportLoadingProgressBarProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!loading) {
      setProgress(0)
      return
    }

    setProgress(18)
    const timer = window.setInterval(() => {
      setProgress((currentValue) => {
        if (currentValue >= 92) return currentValue
        return Math.min(92, currentValue + 0.8)
      })
    }, 40)

    return () => window.clearInterval(timer)
  }, [loading])

  if (!loading) {
    return null
  }

  return (
    <div className="px-1 pb-2">
      <ProgressBar
        min={0}
        max={100}
        value={progress}
        showStatus={false}
      />
    </div>
  )
}
