/**
 * Thanh tiến độ cho tác vụ dài giả lập (khóa sổ / ghi nhận).
 */

import ProgressBar from "devextreme-react/progress-bar";
import type { CostingJobProgressState } from "../types/productionCostingTypes";

type CostingJobProgressProps = {
  job: CostingJobProgressState;
  t: (key: string, fallback: string) => string;
};

export function CostingJobProgress({ job, t }: CostingJobProgressProps) {
  if (!job.running && !job.message) return null;

  return (
    <div className="gk-notice" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        <strong>{t("GK_JOB_PROGRESS", "Tiến độ tác vụ")}</strong>
        {job.message ? ` — ${job.message}` : null}
      </div>
      <ProgressBar value={job.percent} min={0} max={100} showStatus width="100%" />
    </div>
  );
}
