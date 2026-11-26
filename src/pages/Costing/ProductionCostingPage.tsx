/**
 * Trang G-K – Giá thành giản đơn.
 * Số liệu và trạng thái bước lấy từ /api/production-cost và PeriodLock.
 */

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import LoadPanel from "devextreme-react/load-panel";
import { confirm } from "devextreme/ui/dialog";
import notify from "devextreme/ui/notify";
import DxPage from "@/dx/DxPage";
import { LanguageContext } from "@/lib/i18nLoader";
import { getCurrentCompanyCd } from "@/lib/login";
import {
  discardDraftProductionCostObjectSelection,
  ensureProductionCostingPeriod,
  getReopenInfo,
  isProductionCostObjectSelectionDirty,
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
import { formatGkMessage } from "./components/costingPanelShared";
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

  /** Cảnh báo thay đổi lựa chọn đối tượng chưa lưu; OK = bỏ Draft và tiếp tục. */
  const confirmDiscardObjectSelectionDraft = useCallback(async (): Promise<boolean> => {
    if (!isProductionCostObjectSelectionDirty()) return true;
    const ok = await confirm(
      t(
        "GK_UNSAVED_SELECTION",
        "Bạn có thay đổi lựa chọn đối tượng chưa lưu. Bỏ thay đổi và tiếp tục?",
      ),
      t("CONFIRM", "Xác nhận"),
    );
    if (!ok) return false;
    try {
      refresh(discardDraftProductionCostObjectSelection());
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
      return false;
    }
    return true;
  }, [t, refresh, showError]);

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

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isProductionCostObjectSelectionDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [overview]);

  const handleRequestReopen = useCallback(
    async (stepIndex: 1 | 2 | 3 | 4 | 5 | 6) => {
      try {
        setBusy(true);
        const info = await getReopenInfo(stepIndex, t);
        setReopenInfo(info);
        setReopenOpen(true);
      } catch (err) {
        showError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [showError, t],
  );

  const handleRequestStepHistory = useCallback((stepIndex: 1 | 2 | 3 | 4 | 5 | 6) => {
    setStepHistoryIndex(stepIndex);
    setStepHistoryOpen(true);
  }, []);

  const handleSyncObjects = useCallback(async () => {
    if (!(await confirmDiscardObjectSelectionDraft())) return;
    try {
      setBusy(true);
      const result = await syncProductionCostObjects();
      refresh(result.overview);
      showSuccess(
        result.syncedCount > 0
          ? formatGkMessage(
              t("GK_SYNC_OBJECTS_OK", "Đã đồng bộ {0} đối tượng từ phiếu nhập kho."),
              result.syncedCount,
            )
          : t(
              "GK_SYNC_OBJECTS_EMPTY",
              "Đã đồng bộ xong. Chưa có phiếu nhập thành phẩm hợp lệ — danh sách đối tượng trống.",
            ),
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [confirmDiscardObjectSelectionDraft, refresh, showSuccess, showError, t]);

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
        const goPrev = async () => {
          if (!(await confirmDiscardObjectSelectionDraft())) return;
          const cur = overview.activeStep;
          const prev = Math.max(0, cur - 1) as CostingStepIndex;
          refresh(await setProductionCostingActiveStep(prev));
        };
        void goPrev().catch((err) => showError(err instanceof Error ? err.message : String(err)));
      },
      onNext: () => {
        const goNext = async () => {
          // Bước 00 tự lưu Draft trước khi gọi onNext; các bước khác chỉ cần cảnh báo nếu còn dirty.
          if (overview.activeStep !== 0 && !(await confirmDiscardObjectSelectionDraft())) {
            return;
          }
          const cur = overview.activeStep;
          const nextStep = Math.min(6, cur + 1) as CostingStepIndex;
          refresh(await setProductionCostingActiveStep(nextStep));
        };
        void goNext().catch((err) => showError(err instanceof Error ? err.message : String(err)));
      },
      onSyncObjects: () => {
        void handleSyncObjects();
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
    confirmDiscardObjectSelectionDraft,
    handleSyncObjects,
    handleRequestReopen,
    handleRequestStepHistory,
  ]);

  const handleSelectStep = async (step: CostingStepIndex) => {
    if (!(await confirmDiscardObjectSelectionDraft())) return;
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
    if (!(await confirmDiscardObjectSelectionDraft())) return;
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
    if (!(await confirmDiscardObjectSelectionDraft())) return;
    const ok = await confirm(
      t("MSG_ARE_YOU_SURE", "Bạn có chắc chắn muốn thực hiện thao tác này?"),
      t("CONFIRM", "Xác nhận"),
    );
    if (!ok) return;
    try {
      setBusy(true);
      const result = await ensureProductionCostingPeriod();
      refresh(result.overview);
      showSuccess(
        t("GK_PERIOD_ENSURE_OK", "Đã khởi tạo kỳ trên máy chủ."),
      );
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
      showSuccess(
        formatGkMessage(
          t("GK_REOPEN_OK", "Đã mở lại bước {0}. Số liệu cũ được giữ."),
          reopenInfo.stepIndex,
        ),
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const ready = Boolean(overview && panelProps);
  const active = overview?.activeStep ?? 0;

  return (
    <DxPage>
      <div className="gk-page">
        {/* Overlay tuyệt đối — không đưa LoadPanel vào flex column (tránh nhảy chiều cao khi đồng bộ). */}
        <div className="gk-load-host" id="gk-load-host" aria-hidden>
          <LoadPanel
            visible={booting || busy}
            showIndicator
            showPane
            shading
            shadingColor="rgba(255, 255, 255, 0.45)"
            hideOnOutsideClick={false}
            container="#gk-load-host"
            position={{ of: "#gk-load-host" }}
          />
        </div>

        {ready && overview && panelProps ? (
          <>
            <CostingHeader
              periodYm={overview.periodYm}
              busy={busy || booting}
              t={t}
              onChangePeriod={(p) => void handleChangePeriod(p)}
              onEnsurePeriod={() => void handleEnsurePeriod()}
              onOpenHistory={() => setHistoryOpen(true)}
            />

            <div className="gk-stats">
              <div className="gk-stat">
                <div className="lbl">{t("GK_STAT_OBJECTS", "Đối tượng")}</div>
                <div className="val">{overview.stats.objectCount}</div>
              </div>
              <div className="gk-stat">
                <div className="lbl">{t("GK_STAT_PRODUCTS", "Thành phẩm")}</div>
                <div className="val">{overview.stats.productCount}</div>
              </div>
              <div className="gk-stat">
                <div className="lbl">{t("GK_STAT_RECEIPTS", "Phiếu nhập")}</div>
                <div className="val">{overview.stats.receiptCount}</div>
              </div>
              <div className="gk-stat">
                <div className="lbl">{t("GK_STAT_WARNINGS", "Cảnh báo")}</div>
                <div className="val">{overview.stats.warningCount}</div>
              </div>
              <div className="gk-stat">
                <div className="lbl">{t("GK_STAT_PROGRESS", "Tiến độ")}</div>
                <div className="val">{overview.stats.doneStepCount}/6</div>
              </div>
            </div>

            <div className="gk-layout">
              <CostingStepNavigator
                activeStep={overview.activeStep}
                doneFlags={overview.doneFlags}
                stepStatuses={overview.stepStatuses}
                prerequisiteStatus={overview.prerequisiteValidation.status}
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
              </main>
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
          </>
        ) : null}
      </div>
    </DxPage>
  );
}
