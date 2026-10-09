import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Button from "devextreme-react/button";
import ProgressBar from "devextreme-react/progress-bar";
import RadioGroup from "devextreme-react/radio-group";
import { confirm } from "devextreme/ui/dialog";
import notify from "devextreme/ui/notify";

import { getApiErrorMessage } from "@/api/apiTypes";
import { isBackgroundJobFinished, waitAsync } from "@/api/jobApi";
import {
  getInventoryValuationJobProgress,
  startInventoryValuationJob,
} from "@/api/inventoryValuationApi";
import MultiLookupCellEditor from "@/components/lookup/MultiLookupCellEditor";
import { inventoryLookupStore } from "@/components/lookup/inventoryLookupStore";
import { trimLookupText } from "@/components/lookup/lookupHelpers";
import { warehouseLookupStore } from "@/components/lookup/warehouseLookupStore";
import { DateRangeBox } from "@/components/toolbar/DateRangeBox";
import { LanguageContext } from "@/lib/i18nLoader";
import { createCurrentMonthDateRange } from "@/lib/dateRangeDefaults";
import { queryKeys } from "@/lib/query/queryKeys";
import {
  buildInventoryValuationMethodOptions,
  buildInventoryValuationYmd,
  getInventoryValuationMethodLabel,
} from "@/lib/inventoryValuationUtils";
import type { InventoryValuationMethodCode } from "@/types/inventoryValuation";
import type { Product } from "@/types/product";
import type { StoreInfo } from "@/types/store";

type CalculationPhase = "IDLE" | "RUNNING" | "DONE" | "ERROR";

type TranslationFn = (key: string, fallback: string) => string;

const PROGRESS_POLL_INTERVAL_MS = 500;

function getLookupText(row: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    const value = row[field];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export default function InventoryCalcOutPricePopup() {
  const queryClient = useQueryClient();
  const dateRange = useMemo(createCurrentMonthDateRange, [])
  const [fromDate, setFromDate] = useState<Date | null>(dateRange.fromDate);
  const [toDate, setToDate] = useState<Date | null>(dateRange.toDate);
  const [productCodes, setProductCodes] = useState<string[]>([]);
  const [warehouseCodes, setWarehouseCodes] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<InventoryValuationMethodCode>("PERIOD_END_AVG");
  const [phase, setPhase] = useState<CalculationPhase>("IDLE");
  const [progressValue, setProgressValue] = useState(0);
  const [processedGroups, setProcessedGroups] = useState(0);
  const [totalGroups, setTotalGroups] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const isPollingRef = useRef(false);

  const { translate } = useContext(LanguageContext) as { translate?: TranslationFn };
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  );

  useEffect(() => () => {
    isPollingRef.current = false;
  }, []);

  const valuationMethodOptions = useMemo(() => buildInventoryValuationMethodOptions(t), [t]);

  const selectedMethodLabel = useMemo(
    () => getInventoryValuationMethodLabel(selectedMethod, t),
    [selectedMethod, t],
  );

  const validateFilters = useCallback(() => {
    const fromYmd = buildInventoryValuationYmd(fromDate);
    const toYmd = buildInventoryValuationYmd(toDate);
    if (!fromYmd || !toYmd) {
      notify(t("DATE_RANGE_REQUIRED", "Vui lòng chọn đầy đủ Từ ngày và Đến ngày"), "warning", 3000);
      return null;
    }
    if (fromYmd > toYmd) {
      notify(t("INVALID_DATE_RANGE", "Từ ngày phải nhỏ hơn hoặc bằng Đến ngày"), "warning", 3000);
      return null;
    }
    return { fromYmd, toYmd };
  }, [fromDate, t, toDate]);

  const pollJobProgress = useCallback(async (jobId: string) => {
    isPollingRef.current = true;

    while (isPollingRef.current) {
      const progress = await queryClient.fetchQuery({
        queryKey: queryKeys.jobs.progress("inventory-valuation", jobId),
        queryFn: () => getInventoryValuationJobProgress(jobId),
        staleTime: 0,
      });

      setProgressValue(Math.max(0, Math.min(100, progress.percent)));
      setProcessedGroups(progress.processedGroups);
      setTotalGroups(progress.totalGroups);
      setStatusMessage(progress.message || t("CALCULATING_OUT_PRICE", "Đang tính giá xuất kho..."));

      if (isBackgroundJobFinished(progress.status)) {
        isPollingRef.current = false;

        if (progress.status === "DONE") {
          setPhase("DONE");
          setProgressValue(100);
          const methodLabel =
            getInventoryValuationMethodLabel(progress.methodCode, t) || progress.methodName || selectedMethodLabel;
          const summary = `${t("CALCULATION_COMPLETED", "Tính toán hoàn tất")} · ${methodLabel} · ${progress.processedGroups} ${t("GROUPS", "nhóm")} · ${progress.movementCount} ${t("MOVEMENTS", "dòng phát sinh")}`;
          setStatusMessage(summary);
          notify(summary, "success", 3000);
          return;
        }

        setPhase("ERROR");
        setProgressValue(0);
        const message = progress.message || t("CALCULATION_FAILED", "Tính toán thất bại");
        setStatusMessage(message);
        notify(message, "error", 4000);
        return;
      }

      await waitAsync(PROGRESS_POLL_INTERVAL_MS);
    }
  }, [queryClient, selectedMethodLabel, t]);

  const handleCalculate = useCallback(async () => {
    const range = validateFilters();
    if (!range) {
      return;
    }

    const confirmed = await confirm(
      t("CONFIRM_INVENTORY_CALCULATION", "Bạn có muốn thực hiện tính giá xuất kho ngay bây giờ?"),
      t("CONFIRM", "Xác nhận"),
    );

    if (!confirmed) {
      return;
    }

    setPhase("RUNNING");
    setProgressValue(0);
    setProcessedGroups(0);
    setTotalGroups(0);
    setStatusMessage(t("CALCULATING_OUT_PRICE", "Đang tính giá xuất kho..."));

    try {
      const startResult = await startInventoryValuationJob({
        FROM_YMD: range.fromYmd,
        TO_YMD: range.toYmd,
        METHOD_CODE: selectedMethod,
        PRODUCT_CDS: productCodes.length > 0 ? productCodes.join(",") : undefined,
        STORE_CDS: warehouseCodes.length > 0 ? warehouseCodes.join(",") : undefined,
      });

      if (!startResult.jobId) {
        throw new Error(startResult.message || t("JOB_ID_MISSING", "Không nhận được jobId từ server."));
      }

      setStatusMessage(startResult.message || t("JOB_CREATED", "Đã tạo job. Đang chờ server xử lý..."));
      await pollJobProgress(startResult.jobId);
    } catch (error) {
      isPollingRef.current = false;
      setPhase("ERROR");
      setProgressValue(0);
      const message = getApiErrorMessage(error, t("CALCULATION_FAILED", "Tính toán thất bại"));
      setStatusMessage(message);
      notify(message, "error", 4000);
    }
  }, [pollJobProgress, productCodes, selectedMethod, t, validateFilters, warehouseCodes]);

  const isRunning = phase === "RUNNING";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-white p-4">
      <div className="w-full max-w-3xl space-y-4">
        <p className="text-sm text-slate-600">
          {t(
            "INVENTORY_CALC_OUT_PRICE_DESC",
            "Chọn kỳ và bộ lọc, sau đó thực hiện tính giá xuất kho.",
          )}
        </p>

        <DateRangeBox
          fromDate={fromDate}
          toDate={toDate}
          fromPlaceholder={t("FROM_DATE", "Từ ngày")}
          toPlaceholder={t("TO_DATE", "Đến ngày")}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          width="100%"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MultiLookupCellEditor<StoreInfo>
            dataSource={warehouseLookupStore}
            values={warehouseCodes}
            valueExpr="STORE_CD"
            searchExpr={["STORE_CD", "STORE_NM_VIET", "STORE_NM_ENG", "STORE_NM_KOR", "STORE_NM_CHINA"]}
            placeholder={t("WAREHOUSE_CODE", "Mã kho")}
            buttonHint={t("OPEN_WAREHOUSE_LOOKUP", "Chọn kho")}
            onApply={(values) => setWarehouseCodes(values.map((value) => trimLookupText(value) || ""))}
            onClear={() => setWarehouseCodes([])}
            width="100%"
            columns={[
              { dataField: "STORE_CD", caption: t("WAREHOUSE_CODE", "Mã kho"), width: 120 },
              {
                dataField: "STORE_NM_VIET",
                caption: t("WAREHOUSE_NAME", "Tên kho"),
                minWidth: 220,
                calculateCellValue: (row) =>
                  getLookupText(row as unknown as Record<string, unknown>, [
                    "STORE_NM_VIET",
                    "STORE_NM_ENG",
                    "STORE_NM_KOR",
                    "STORE_NM_CHINA",
                  ]),
              },
            ]}
          />

          <MultiLookupCellEditor<Product>
            dataSource={inventoryLookupStore}
            values={productCodes}
            valueExpr="PRODUCT_CD"
            searchExpr={["PRODUCT_CD", "PRODUCT_NM_VIET", "PRODUCT_NM_ENG", "PRODUCT_NM_KOR", "PRODUCT_NM_CHINA"]}
            placeholder={t("PRODUCT_CODE", "Mã hàng")}
            buttonHint={t("OPEN_PRODUCT_LOOKUP", "Chọn hàng hóa")}
            onApply={(values) => setProductCodes(values.map((value) => trimLookupText(value) || ""))}
            onClear={() => setProductCodes([])}
            width="100%"
            columns={[
              { dataField: "PRODUCT_CD", caption: t("PRODUCT_CODE", "Mã hàng"), width: 120 },
              {
                dataField: "PRODUCT_NM_VIET",
                caption: t("PRODUCT_NAME", "Tên hàng"),
                minWidth: 220,
                calculateCellValue: (row) =>
                  getLookupText(row as unknown as Record<string, unknown>, [
                    "PRODUCT_NM_VIET",
                    "PRODUCT_NM_ENG",
                    "PRODUCT_NM_KOR",
                    "PRODUCT_NM_CHINA",
                  ]),
              },
            ]}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 text-sm font-semibold text-slate-800">
            {t("CALC_METHOD", "Phương pháp tính giá xuất kho")}
          </div>
          <RadioGroup
            dataSource={valuationMethodOptions}
            valueExpr="MethodCode"
            displayExpr="MethodName"
            layout="vertical"
            value={selectedMethod}
            disabled={isRunning}
            onValueChanged={(event) => {
              setSelectedMethod(event.value as InventoryValuationMethodCode);
            }}
          />
        </div>

        {(phase === "RUNNING" || phase === "DONE" || phase === "ERROR") && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-sm font-medium text-slate-700">
              {statusMessage || t("PROCESSING", "Đang xử lý...")}
            </div>
            <ProgressBar
              min={0}
              max={100}
              value={progressValue}
              showStatus={false}
            />
            <div className="mt-1 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>{Math.round(progressValue)}%</span>
              {totalGroups > 0 ? (
                <span>
                  {processedGroups}/{totalGroups} {t("GROUPS", "nhóm")}
                </span>
              ) : null}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button
            icon="formula"
            text={t("CALCULATE_NOW", "Thực hiện tính toán")}
            type="default"
            stylingMode="contained"
            disabled={isRunning}
            onClick={() => void handleCalculate()}
          />
        </div>
      </div>
    </div>
  );
}
