import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { LoadPanel } from "devextreme-react";
import Button from "devextreme-react/button";
import NumberBox from "devextreme-react/number-box";
import notify from "devextreme/ui/notify";

import { getApiErrorMessage } from "@/api/apiTypes";
import { updateCompanyDecimalSetting } from "@/api/companyDecimalSettingApi";
import {
  useCompanyDecimalSettingsInvalidate,
  useCompanyDecimalSettingsQuery,
} from "@/hooks/queries/adminQueries";
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers";
import type { CompanyDecimalSettingItem } from "@/types/companyDecimalSetting";
import { LanguageContext } from "@/lib/i18nLoader";
import { clearDecimalSettingsCache, refreshDecimalSettingsCache } from "@/lib/decimalSettingCache";
import { getCurrentCompanyCd } from "@/lib/login";

import "./companyDecimalSetting.css";

const settingTypes = [
  "AMOUNT",
  "UNIT_PRICE",
  "QUANTITY",
  "PERCENT",
  "EXCHANGE_RATE",
  "FC_AMOUNT",
  "FC_UNIT_PRICE",
] as const;

type SettingType = (typeof settingTypes)[number];

const settingMeta: Array<{
  type: SettingType;
  labelKey: string;
  labelFallback: string;
  sample: number;
}> = [
  { type: "AMOUNT", labelKey: "AMOUNT", labelFallback: "Số tiền", sample: 1234567.56 },
  { type: "UNIT_PRICE", labelKey: "UNIT_PRICE", labelFallback: "Đơn giá", sample: 125000.5 },
  { type: "QUANTITY", labelKey: "QUANTITY", labelFallback: "Số lượng", sample: 12.3456 },
  { type: "PERCENT", labelKey: "PERCENT", labelFallback: "%", sample: 8.5 },
  { type: "EXCHANGE_RATE", labelKey: "EXCHANGE_RATE", labelFallback: "Tỷ giá", sample: 25450.1234 },
  { type: "FC_AMOUNT", labelKey: "FC_AMOUNT", labelFallback: "Tiền NT", sample: 1250.75 },
  { type: "FC_UNIT_PRICE", labelKey: "FC_UNIT_PRICE", labelFallback: "Đơn giá NT", sample: 99.1234 },
];

function createDefaultSettingRow(companyCd: string, settingType: string): CompanyDecimalSettingItem {
  return {
    ID: null,
    COMPANY_CD: companyCd,
    SETTING_TYPE: settingType,
    DECIMAL_PLACES: 0,
    ROUNDING_MODE: "ROUND",
    USE_THOUSAND_SEPARATOR: "1",
    IS_ACTIVE: "1",
    NOTE: null,
    APPLY_SCOPE: null,
  };
}

function clampPlaces(value: unknown): number {
  const numeric = Math.trunc(Number(value ?? 0));
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(12, numeric));
}

function isFlagOn(value: unknown): boolean {
  return String(value ?? "0").trim() === "1";
}

function formatPreview(sample: number, places: number, useThousandSeparator: boolean, isPercent: boolean): string {
  const precision = clampPlaces(places);
  const absolute = Math.abs(sample);
  const factor = 10 ** precision;
  const rounded = Math.round(absolute * factor) / factor;
  const [intPartRaw, fracRaw = ""] = rounded.toFixed(precision).split(".");
  const intPart = useThousandSeparator
    ? intPartRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : intPartRaw;
  const body = precision > 0 ? `${intPart}.${fracRaw}` : intPart;
  const signed = sample < 0 ? `-${body}` : body;
  return isPercent ? `${signed}%` : signed;
}

export default function CompanyDecimalSettingSection() {
  const [rows, setRows] = useState<CompanyDecimalSettingItem[]>([]);
  const [savingType, setSavingType] = useState<string | null>(null);
  const saveTimersRef = useRef<Map<string, number>>(new Map());
  const rowsRef = useRef(rows);

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string;
  };

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  );

  const companyCd = useMemo(() => getCurrentCompanyCd(), []);

  const {
    data: decimalSettings = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchDecimalSettings,
  } = useCompanyDecimalSettingsQuery(companyCd);
  const invalidateDecimalSettings = useCompanyDecimalSettingsInvalidate(companyCd);
  const loading = isLoading || isFetching;

  const buildRows = useCallback(
    (data: CompanyDecimalSettingItem[]) => {
      const existing = new Map<string, CompanyDecimalSettingItem>();
      data.forEach((item) => existing.set(item.SETTING_TYPE, item));
      return settingTypes.map((type) => existing.get(type) ?? createDefaultSettingRow(companyCd, type));
    },
    [companyCd],
  );

  useMasterListLoadError(isError, loadError, t, "Failed to load decimal settings");

  useEffect(() => {
    const nextRows = buildRows(decimalSettings || []);
    setRows(nextRows);
    rowsRef.current = nextRows;
  }, [buildRows, decimalSettings]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    return () => {
      saveTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      saveTimersRef.current.clear();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    clearDecimalSettingsCache();
    await invalidateDecimalSettings();
    await refetchDecimalSettings();
  }, [invalidateDecimalSettings, refetchDecimalSettings]);

  const persistRow = useCallback(
    async (settingType: string) => {
      const row = rowsRef.current.find((item) => item.SETTING_TYPE === settingType);
      if (!row) {
        return;
      }

      setSavingType(settingType);
      try {
        await updateCompanyDecimalSetting(settingType, {
          COMPANY_CD: companyCd,
          DECIMAL_PLACES: clampPlaces(row.DECIMAL_PLACES),
          ROUNDING_MODE: row.ROUNDING_MODE || "ROUND",
          USE_THOUSAND_SEPARATOR: isFlagOn(row.USE_THOUSAND_SEPARATOR) ? "1" : "0",
          IS_ACTIVE: isFlagOn(row.IS_ACTIVE) ? "1" : "0",
          NOTE: row.NOTE ?? "",
        });

        try {
          await refreshDecimalSettingsCache();
        } catch (cacheError) {
          console.error("Failed to refresh decimal setting cache", cacheError);
          clearDecimalSettingsCache();
        }

        notify(t("MSG_EDIT_SUCCESS", "Đã lưu"), "success", 1800);
        await invalidateDecimalSettings();
      } catch (error) {
        console.error("Failed to update decimal setting", error);
        notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Lưu thất bại")), "error", 4000);
      } finally {
        setSavingType((current) => (current === settingType ? null : current));
      }
    },
    [companyCd, invalidateDecimalSettings, t],
  );

  const schedulePersist = useCallback(
    (settingType: string) => {
      const existing = saveTimersRef.current.get(settingType);
      if (existing) {
        window.clearTimeout(existing);
      }

      const timerId = window.setTimeout(() => {
        saveTimersRef.current.delete(settingType);
        void persistRow(settingType);
      }, 450);

      saveTimersRef.current.set(settingType, timerId);
    },
    [persistRow],
  );

  const patchPlaces = useCallback(
    (settingType: string, places: number) => {
      setRows((current) => {
        const nextRows = current.map((row) =>
          row.SETTING_TYPE === settingType
            ? { ...row, DECIMAL_PLACES: clampPlaces(places) }
            : row,
        );
        rowsRef.current = nextRows;
        return nextRows;
      });
      schedulePersist(settingType);
    },
    [schedulePersist],
  );

  const rowByType = useMemo(() => {
    const map = new Map<string, CompanyDecimalSettingItem>();
    rows.forEach((row) => map.set(row.SETTING_TYPE, row));
    return map;
  }, [rows]);

  return (
    <section className="company-decimal-editor">
      <div className="company-decimal-editor__toolbar">
        <Button
          icon="refresh"
          stylingMode="text"
          hint={t("btnRefresh", "Làm mới")}
          onClick={() => {
            void handleRefresh();
          }}
        />
      </div>

      <div className="company-decimal-editor__list">
        {settingMeta.map((meta) => {
          const row = rowByType.get(meta.type) ?? createDefaultSettingRow(companyCd, meta.type);
          const places = clampPlaces(row.DECIMAL_PLACES);
          const useSep = isFlagOn(row.USE_THOUSAND_SEPARATOR);
          const isSaving = savingType === meta.type;

          return (
            <div
              key={meta.type}
              className={`company-decimal-editor__row${isSaving ? " is-saving" : ""}`}
            >
              <div className="company-decimal-editor__label" title={meta.type}>
                {t(meta.labelKey, meta.labelFallback)}
              </div>
              <NumberBox
                value={places}
                min={0}
                max={12}
                showSpinButtons
                stylingMode="outlined"
                width="100%"
                onValueChanged={(event) => {
                  if (event.event == null) {
                    return;
                  }
                  patchPlaces(meta.type, clampPlaces(event.value));
                }}
              />
              <div
                className="company-decimal-editor__example"
                title={t("DECIMAL_EXAMPLE", "Ví dụ")}
              >
                {formatPreview(meta.sample, places, useSep, meta.type === "PERCENT")}
              </div>
            </div>
          );
        })}
      </div>

      <LoadPanel
        shading
        shadingColor="rgba(15, 23, 42, 0.2)"
        showIndicator
        showPane
        visible={loading}
      />
    </section>
  );
}
