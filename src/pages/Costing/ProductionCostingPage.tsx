/**
 * Trang G-K – Giá thành giản đơn.
 * Số liệu và trạng thái bước lấy từ /api/production-cost và PeriodLock.
 */

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import LoadPanel from "devextreme-react/load-panel";
import Button from "devextreme-react/button";
import notify from "devextreme/ui/notify";
import { LanguageContext } from "@/lib/i18nLoader";
import { getCurrentCompanyCd } from "@/lib/login";
import {
  ensureProductionCostingPeriod,
  getReopenInfo,
  reopenCostingStep,
  setProductionCostingActiveStep,
  setProductionCostingPeriod,
  syncProductionCostObjects,
} from "@/api/productionCostingApi";
import type {
  CostingReopenInfo,
  CostingStepIndex,
  ProductionCostingOverview,
} from "./types/productionCostingTypes";
import { CostingHeader } from "./components/CostingHeader";
import { CostingStepNavigator } from "./components/CostingStepNavigator";
import { CostingHistoryPopup } from "./components/CostingHistoryPopup";
import { CostingStepHistoryPopup } from "./components/CostingStepHistoryPopup";
import { CostingReopenPopup } from "./components/CostingReopenPopup";
import { CostingJobProgress } from "./components/CostingJobProgress";
import { CostingPrerequisitePanel } from "./components/CostingPrerequisitePanel";
import { FaPrepaidLockPanel } from "./components/FaPrepaidLockPanel";
import { CostAllocationPanel } from "./components/CostAllocationPanel";
import { CostTransferPanel } from "./components/CostTransferPanel";
import { CostCalculationPanel } from "./components/CostCalculationPanel";
import { CostValuationPanel } from "./components/CostValuationPanel";
import { ProfitLossLockPanel } from "./components/ProfitLossLockPanel";
import "./productionCosting.css";

export default function ProductionCostingPage() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string;
  };
  const t = useCallback(
    (key: string, fallback: string) => translate?.(key, fallback) ?? fallback,
    [translate],
  );

  const companyCd = getCurrentCompanyCd() || "";

  const [overview, setOverview] = useState<ProductionCostingOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [stepHistoryOpen, setStepHistoryOpen] = useState(false);
  const [stepHistoryIndex, setStepHistoryIndex] = useState<number | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenInfo, setReopenInfo] = useState<CostingReopenInfo | null>(null);
  const [booting, setBooting] = useState(true);

  const refresh = useCallback((next: ProductionCostingOverview) => {
    setOverview(next);
  }, []);

  const showError = useCallback((message: string) => {
    notify(message, "error", 3500);
  }, []);

  const showSuccess = useCallback((message: string) => {
    notify(message, "success", 2500);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBooting(true);
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const next = await setProductionCostingPeriod(companyCd, `${now.getFullYear()}${month}`);
        if (!cancelled) setOverview(next);
      } catch (err) {
        if (!cancelled) showError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyCd, showError]);

  const handleRequestReopen = useCallback(
    async (stepIndex: 1 | 2 | 3 | 4 | 5 | 6) => {
      try {
        setBusy(true);
        const info = await getReopenInfo(stepIndex);
        setReopenInfo(info);
        setReopenOpen(true);
      } catch (err) {
        showError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [showError],
  );

  const handleRequestStepHistory = useCallback((stepIndex: 1 | 2 | 3 | 4 | 5 | 6) => {
    setStepHistoryIndex(stepIndex);
    setStepHistoryOpen(true);
  }, []);

  const panelProps = useMemo(() => {
    if (!overview) return null;
    return {
      overview,
      busy,
      t,
      onRefresh: refresh,
      onBusy: setBusy,
      onError: showError,
      onSuccess: showSuccess,
      onPrev: () => {
        const cur = overview.activeStep;
        const prev = Math.max(0, cur - 1) as CostingStepIndex;
        void setProductionCostingActiveStep(prev).then(refresh);
      },
      onNext: () => {
        const cur = overview.activeStep;
        const nextStep = Math.min(6, cur + 1) as CostingStepIndex;
        void setProductionCostingActiveStep(nextStep).then(refresh);
      },
      onRequestReopen: handleRequestReopen,
      onRequestStepHistory: handleRequestStepHistory,
    };
  }, [
    overview,
    busy,
    t,
    refresh,
    showError,
    showSuccess,
    handleRequestReopen,
    handleRequestStepHistory,
  ]);

  const handleSelectStep = async (step: CostingStepIndex) => {
    try {
      setBusy(true);
      const next = await setProductionCostingActiveStep(step);
      refresh(next);
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleChangePeriod = async (periodYm: string) => {
    try {
      setBusy(true);
      const next = await setProductionCostingPeriod(companyCd, periodYm);
      refresh(next);
      showSuccess(t("GK_PERIOD_CHANGED", "Đã tải kỳ từ máy chủ."));
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEnsurePeriod = async () => {
    try {
      setBusy(true);
      refresh(await ensureProductionCostingPeriod());
      showSuccess(t("GK_PERIOD_ENSURE_OK", "Đã khởi tạo kỳ trên máy chủ."));
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSyncObjects = async () => {
    try {
      setBusy(true);
      refresh(await syncProductionCostObjects());
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmReopen = async (reason: string) => {
    if (!reopenInfo) return;
    try {
      setBusy(true);
      const next = await reopenCostingStep(reopenInfo.stepIndex, reason);
      refresh(next);
      setReopenOpen(false);
      setReopenInfo(null);
      showSuccess(t("GK_REOPEN_OK", `Đã mở lại bước ${reopenInfo.stepIndex}. Số liệu cũ được giữ.`));
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (booting || !overview || !panelProps) {
    return (
      <div className="gk-page">
        <LoadPanel visible />
      </div>
    );
  }

  const active = overview.activeStep;
  const recentLogs = overview.logs.slice(0, 3);

  return (
    <div className="gk-page">
      <LoadPanel visible={busy} showIndicator showPane shading={false} />

      <div className="gk-demo-banner" role="status">
        <span>{overview.statusMessage || t("GK_DB_STATUS", "Dữ liệu lấy từ cơ sở dữ liệu của công ty.")}</span>
        {!overview.periodExists ? (
          <Button text={t("GK_PERIOD_ENSURE", "Khởi tạo kỳ")} disabled={busy} onClick={() => void handleEnsurePeriod()} />
        ) : (
          <Button text={t("GK_SYNC_OBJECTS", "Đồng bộ đối tượng từ nhập kho")} disabled={busy} onClick={() => void handleSyncObjects()} />
        )}
      </div>

      <CostingHeader
        periodYm={overview.periodYm}
        monthStatus={overview.monthStatus}
        busy={busy}
        t={t}
        onChangePeriod={(p) => void handleChangePeriod(p)}
        onOpenPrerequisite={() => void handleSelectStep(0)}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <div className="gk-stats">
        <div className="gk-stat">
          <div className="lbl">{t("GK_STAT_OBJECTS", "Đối tượng")}</div>
          <div className="val">{overview.stats.objectCount}</div>
          <div className="descr">{t("GK_STAT_OBJECTS_D", "Đối tượng giá thành")}</div>
        </div>
        <div className="gk-stat">
          <div className="lbl">{t("GK_STAT_PRODUCTS", "Thành phẩm")}</div>
          <div className="val">{overview.stats.productCount}</div>
          <div className="descr">{t("GK_STAT_PRODUCTS_D", "Gồm cả TP cảnh báo")}</div>
        </div>
        <div className="gk-stat">
          <div className="lbl">{t("GK_STAT_RECEIPTS", "Phiếu nhập")}</div>
          <div className="val">{overview.stats.receiptCount}</div>
          <div className="descr">INPUT_ID</div>
        </div>
        <div className="gk-stat">
          <div className="lbl">{t("GK_STAT_WARNINGS", "Cảnh báo")}</div>
          <div className="val">{overview.stats.warningCount}</div>
          <div className="descr">{t("GK_STAT_WARNINGS_D", "Lỗi / REOPENED")}</div>
        </div>
        <div className="gk-stat">
          <div className="lbl">{t("GK_STAT_PROGRESS", "Tiến độ")}</div>
          <div className="val">{overview.stats.doneStepCount}/6</div>
          <div className="descr">{overview.monthStatus}</div>
        </div>
      </div>

      <div className="gk-layout">
        <CostingStepNavigator
          activeStep={overview.activeStep}
          doneFlags={overview.doneFlags}
          stepStatuses={overview.stepStatuses}
          monthStatus={overview.monthStatus}
          t={t}
          onSelectStep={(s) => void handleSelectStep(s)}
        />

        <main className="gk-content">
          <CostingJobProgress job={overview.job} t={t} />

          {active === 0 ? <CostingPrerequisitePanel {...panelProps} /> : null}
          {active === 1 ? <FaPrepaidLockPanel {...panelProps} /> : null}
          {active === 2 ? <CostAllocationPanel {...panelProps} /> : null}
          {active === 3 ? <CostTransferPanel {...panelProps} /> : null}
          {active === 4 ? <CostCalculationPanel {...panelProps} /> : null}
          {active === 5 ? <CostValuationPanel {...panelProps} /> : null}
          {active === 6 ? <ProfitLossLockPanel {...panelProps} /> : null}

          <div className="gk-card">
            <div className="gk-cardhead">
              <h2 style={{ fontSize: 13, margin: 0 }}>
                {t("GK_SHARED_STATUS", "Trạng thái dùng chung với B-I")}
              </h2>
              <span className="gk-pill">{t("GK_ONE_FLOW", "Trạng thái lấy từ cơ sở dữ liệu")}</span>
            </div>
            <div className="gk-cardbody">
              <div className="gk-workflow">
                <span className={overview.doneFlags[0] ? "mark" : ""}>
                  Bước 1: {overview.stepStatuses[0]}
                </span>
                <span className={overview.doneFlags[2] ? "mark" : ""}>
                  Bước 2: {overview.stepStatuses[2]}
                </span>
                <span className={overview.doneFlags[5] ? "mark" : ""}>
                  Bước 3: {overview.stepStatuses[5]}
                </span>
                <span>
                  {t("GK_MONTH", "Tháng")}: {overview.monthStatus}
                </span>
              </div>
              <p className="gk-muted" style={{ margin: "12px 0 0" }}>
                {t(
                  "GK_SHARED_NOTE",
                  "Mở lại theo thứ tự ngược. B1/B6 đang DONE trên PeriodLock phải mở sổ trước — G-K không báo thành công nếu chưa hoàn nguyên.",
                )}
              </p>
            </div>
          </div>
        </main>
      </div>

      <div className="gk-footer-log">
        <div className="title">{t("GK_RECENT_LOG", "Nhật ký gần nhất")}</div>
        {recentLogs.length === 0 ? (
          <div className="gk-muted">{t("GK_HISTORY_EMPTY", "Chưa có thao tác.")}</div>
        ) : (
          recentLogs.map((item, idx) => (
            <div className="gk-log-line" key={`${item.at}-${idx}`}>
              <span className="gk-log-time">{item.at}</span>
              <span>{item.message}</span>
            </div>
          ))
        )}
      </div>

      <CostingHistoryPopup
        visible={historyOpen}
        logs={overview.logs}
        t={t}
        onClose={() => setHistoryOpen(false)}
      />

      <CostingStepHistoryPopup
        visible={stepHistoryOpen}
        stepIndex={stepHistoryIndex}
        items={overview.stepHistory}
        t={t}
        onClose={() => setStepHistoryOpen(false)}
      />

      <CostingReopenPopup
        visible={reopenOpen}
        info={reopenInfo}
        busy={busy}
        t={t}
        onClose={() => {
          // TC-07: Hủy Popup — không đổi trạng thái.
          setReopenOpen(false);
          setReopenInfo(null);
        }}
        onConfirm={(reason) => void handleConfirmReopen(reason)}
      />
    </div>
  );
}
