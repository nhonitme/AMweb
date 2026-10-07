import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LoadPanel } from "devextreme-react";
import Button from "devextreme-react/button";
import DateBox from "devextreme-react/date-box";
import SelectBox from "devextreme-react/select-box";
import TabPanel, { Item as TabPanelItem, type TabPanelTypes } from "devextreme-react/tab-panel";
import TextArea from "devextreme-react/text-area";
import TextBox from "devextreme-react/text-box";
import Toolbar, { Item as ToolbarItem } from "devextreme-react/toolbar";
import { confirm } from "devextreme/ui/dialog";
import notify from "devextreme/ui/notify";
import { ChevronDown } from "lucide-react";

import { createOutlinedDateBoxEditorOptions, createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions";
import { getApiErrorMessage } from "@/api/apiTypes";
import { useCompanyInfoMutations, useCompanyInfoQuery } from "@/hooks/queries/adminQueries";
import DxPage from "@/dx/DxPage";
import useStateRef from "@/hooks/useStateRef";
import { isLangFieldVisible, useCompanyLangRevision } from "@/lib/companyLang";
import { LanguageContext } from "@/lib/i18nLoader";
import { flushActiveEditorValue } from "@/lib/shortcuts/shortcutUtils";
import type { CompanyInfo } from "@/types/companyInfo";
import CompanyDecimalSettingSection from "./CompanyDecimalSettingSection";
import CompanySignatureSection from "./CompanySignatureSection";
import SysCodeSequenceSection from "./SysCodeSequenceSection";
import { createCompanyInfoFieldGroups, type CompanyInfoFieldConfig } from "./companyInfoFields";
import { createCompanyInfoSelectOptions } from "./companyInfoOptions";

const emptyCompanyInfo: CompanyInfo = {
  COMPANY_CD: "",
  COMPANY_NM: null,
  COMPANY_NM_EN: null,
  COMPANY_NM_KOR: null,
  COMPANY_TYPE: null,
  COMPANY_KIND: null,
  DE_COMPANY_CD: null,
  COMPANY_LV: null,
  ACCDATE_CD: null,
  TAX_CD: null,
  CCCDan: null,
  TCQTQLy: null,
  MCQTQLy: null,
  BRN: null,
  CRN: null,
  OWNER_NM: null,
  ZIP_CODE: null,
  ADDRESS_DO: null,
  ADDRESS: null,
  ADDRESS_ENG: null,
  ADDRESS_KOR: null,
  CARRYFORWARD_YMD: null,
  SIDO: null,
  GUMYUN: null,
  BUSINESS_TYPE: null,
  KIND_BUSINESS: null,
  TEL: null,
  EMAIL: null,
  WEBSITE: null,
  FAX: null,
  STOCKCALC_TYPE: null,
  OPEN_YMD: null,
  DECISION: null,
  NOTE: null,
};

const dateFields = new Set<keyof CompanyInfo>(["CARRYFORWARD_YMD", "OPEN_YMD"]);
const numberFields = new Set<keyof CompanyInfo>(["COMPANY_TYPE", "COMPANY_KIND"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const colSpanClass: Record<NonNullable<CompanyInfoFieldConfig["colSpan"]>, string> = {
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  8: "lg:col-span-8",
  12: "lg:col-span-12",
};

function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length === 0 ? null : text;
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function formatLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeCompanyDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : formatLocalDate(value);
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const dateText = /^\d{8}$/.test(text)
    ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`
    : text.slice(0, 10);
  const date = new Date(`${dateText}T00:00:00`);
  return Number.isNaN(date.getTime()) ? text.slice(0, 10) : formatLocalDate(date);
}

function parseCompanyDate(value: string | null | undefined): Date | null {
  const text = value?.trim();
  if (!text) {
    return null;
  }

  const date = new Date(`${text.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeCompanyInfo(data?: Partial<CompanyInfo>): CompanyInfo {
  return {
    ...emptyCompanyInfo,
    ...data,
    COMPANY_CD: data?.COMPANY_CD ?? "",
    COMPANY_TYPE: normalizeNumber(data?.COMPANY_TYPE),
    COMPANY_KIND: normalizeNumber(data?.COMPANY_KIND),
    OPEN_YMD: normalizeCompanyDate(data?.OPEN_YMD),
    CARRYFORWARD_YMD: normalizeCompanyDate(data?.CARRYFORWARD_YMD),
  };
}

function serializeCompanyInfo(data: CompanyInfo): string {
  return JSON.stringify(data);
}

function FieldShell({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1 text-xs font-medium text-slate-600">
        {label}
        {required ? " *" : ""}
      </div>
      {children}
    </div>
  );
}

export default function CompanyManagementPage() {
  const [saving, setSaving] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [formData, setFormData, formDataRef] = useStateRef<CompanyInfo>(emptyCompanyInfo);
  const [initialData, setInitialData] = useState<CompanyInfo>(emptyCompanyInfo);
  const initialDataRef = useRef<CompanyInfo>(emptyCompanyInfo);
  const forceHydrateRef = useRef(false);

  const {
    data: companyInfoResponse,
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchCompanyInfo,
  } = useCompanyInfoQuery();
  const { updateMutation } = useCompanyInfoMutations();
  const loading = isLoading || isFetching;

  const { lang, translate } = useContext(LanguageContext) as {
    lang: string;
    translate: (key: string, fallback?: string) => string;
  };

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  );

  const companyInfoFieldGroups = useMemo(() => createCompanyInfoFieldGroups(t), [lang, t]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedGroups((current) => {
      const next: Record<string, boolean> = {};
      for (const group of companyInfoFieldGroups) {
        next[group.key] = current[group.key] ?? Boolean(group.defaultExpanded);
      }
      return next;
    });
  }, [companyInfoFieldGroups]);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }, []);
  const selectOptions = useMemo(() => createCompanyInfoSelectOptions(t), [lang, t]);

  const displayName = useMemo(
    () => formData.COMPANY_NM?.trim() || formData.COMPANY_CD?.trim() || t("COMPANY", "Công ty"),
    [formData.COMPANY_CD, formData.COMPANY_NM, t],
  );

  const isDirty = useMemo(
    () => serializeCompanyInfo(formData) !== serializeCompanyInfo(initialData),
    [formData, initialData],
  );

  const applyServerData = useCallback(
    (data: CompanyInfo, force: boolean) => {
      const dirty = serializeCompanyInfo(formDataRef.current) !== serializeCompanyInfo(initialDataRef.current);
      initialDataRef.current = data;
      setInitialData(data);

      if (force || !dirty) {
        setFormData(data);
      }
    },
    [formDataRef, setFormData],
  );

  useEffect(() => {
    if (!companyInfoResponse?.data) {
      return;
    }

    const force = forceHydrateRef.current;
    forceHydrateRef.current = false;
    applyServerData(normalizeCompanyInfo(companyInfoResponse.data), force);
  }, [applyServerData, companyInfoResponse]);

  useEffect(() => {
    if (isError && loadError) {
      notify(getApiErrorMessage(loadError, t("LOAD_FAILED", "Không thể tải thông tin công ty")), "error", 4000);
    }
  }, [isError, loadError, t]);

  const updateField = useCallback(
    (field: keyof CompanyInfo, value: unknown) => {
      setFormData((current) => {
        if (dateFields.has(field)) {
          return { ...current, [field]: normalizeCompanyDate(value) };
        }

        if (numberFields.has(field)) {
          return { ...current, [field]: normalizeNumber(value) };
        }

        if (field === "COMPANY_CD") {
          return { ...current, COMPANY_CD: String(value ?? "") };
        }

        return { ...current, [field]: normalizeString(value) };
      });
    },
    [setFormData],
  );

  const handleCancel = useCallback(() => {
    setFormData(initialDataRef.current);
  }, [setFormData]);
  const loadData = useCallback(async () => {
    const dirty = serializeCompanyInfo(formDataRef.current) !== serializeCompanyInfo(initialDataRef.current);
    if (dirty) {
      const confirmed = await confirm(
        t("MSG_CONFIRM_DISCARD", "Dữ liệu chưa lưu sẽ bị mất. Tiếp tục?"),
        t("CONFIRM", "Xác nhận"),
      );
      if (!confirmed) {
        return;
      }
    }

    forceHydrateRef.current = true;
    await refetchCompanyInfo();
  }, [formDataRef, refetchCompanyInfo, t]);

  const handleSave = useCallback(async () => {
    await flushActiveEditorValue();

    const currentFormData = formDataRef.current;
    if (!currentFormData.COMPANY_NM?.trim()) {
      notify(`${t("COMPANY_NM", "Tên công ty")} ${t("REQUIRED", "là bắt buộc")}`, "warning", 3000);
      return;
    }

    if (!currentFormData.TAX_CD?.trim()) {
      notify(`${t("TAX_CD", "Mã số thuế")} ${t("REQUIRED", "là bắt buộc")}`, "warning", 3000);
      return;
    }

    if (currentFormData.EMAIL && !emailPattern.test(currentFormData.EMAIL)) {
      notify(t("EMAIL_INVALID", "Email không hợp lệ"), "warning", 3000);
      return;
    }

    setSaving(true);
    try {
      const result = await updateMutation.mutateAsync({
        ...currentFormData,
        CARRYFORWARD_YMD: normalizeCompanyDate(currentFormData.CARRYFORWARD_YMD)?.replace(/-/g, "") ?? null,
        OPEN_YMD: normalizeCompanyDate(currentFormData.OPEN_YMD)?.replace(/-/g, "") ?? null,
      });
      const normalized = normalizeCompanyInfo(result.data);
      initialDataRef.current = normalized;
      setFormData(normalized);
      setInitialData(normalized);
      notify(t("MSG_EDIT_SUCCESS", "Cập nhật thành công"), "success", 3000);
    } catch (error) {
      notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")), "error", 4000);
    } finally {
      setSaving(false);
    }
  }, [formDataRef, setFormData, t, updateMutation]);

  const handleTabSelectionChanged = useCallback((event: TabPanelTypes.SelectionChangedEvent) => {
    setActiveTabIndex(event.component.option("selectedIndex") ?? 0);
  }, []);

  const companyLangRevision = useCompanyLangRevision();

  const renderField = useCallback(
    (field: CompanyInfoFieldConfig) => {
      if (!isLangFieldVisible(String(field.key))) {
        return null;
      }

      if (field.showWhen && !field.showWhen(formData)) {
        return null;
      }

      const className = colSpanClass[field.colSpan ?? 4];
      const label = t(field.labelKey, field.label);

      if (field.editorType === "dxSelectBox" && field.optionsKey) {
        return (
          <FieldShell key={field.key} className={className} label={label} required={field.required}>
            <SelectBox
              dataSource={selectOptions[field.optionsKey]}
              displayExpr="label"
              valueExpr="value"
              value={formData[field.key]}
              searchEnabled={true}
              showClearButton={true}
              onValueChanged={(event) => updateField(field.key, event.value)}
              {...createOutlinedEditorOptions()}
            />
          </FieldShell>
        );
      }

      if (field.editorType === "dxDateBox") {
        return (
          <FieldShell key={field.key} className={className} label={label} required={field.required}>
            <DateBox
              type="date"
              value={parseCompanyDate(formData[field.key] as string | null)}
              onValueChanged={(event) => updateField(field.key, event.value)}
              {...createOutlinedDateBoxEditorOptions({
                dateSerializationFormat: "yyyy-MM-dd",
                displayFormat: "yyyy-MM-dd",
                openOnFieldClick: true,
                showClearButton: true,
              })}
            />
          </FieldShell>
        );
      }

      if (field.editorType === "dxTextArea") {
        return (
          <FieldShell key={field.key} className={className} label={label} required={field.required}>
            <TextArea
              value={(formData[field.key] as string | null) ?? ""}
              autoResizeEnabled={true}
              minHeight={72}
              onValueChanged={(event) => updateField(field.key, event.value)}
              {...createOutlinedEditorOptions()}
            />
          </FieldShell>
        );
      }

      const textMode = field.key === "EMAIL" ? "email" : field.key === "WEBSITE" ? "url" : field.key === "TEL" || field.key === "FAX" ? "tel" : undefined;

      return (
        <FieldShell key={field.key} className={className} label={label} required={field.required}>
          <TextBox
            value={(formData[field.key] as string | null) ?? ""}
            readOnly={field.readOnly}
            onValueChanged={(event) => updateField(field.key, event.value)}
            {...createOutlinedEditorOptions(textMode ? { mode: textMode } : {})}
          />
        </FieldShell>
      );
    },
    [companyLangRevision, formData, selectOptions, t, updateField],
  );

  const profileForm = (
    <div className="space-y-3">
      {(() => {
        const taxCd = formData.TAX_CD?.trim() || "—";
        const companyNm = formData.COMPANY_NM?.trim() || "—";
        const address = formData.ADDRESS?.trim() || "—";

        return (
          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="absolute inset-y-0 left-0 w-1 bg-slate-800" aria-hidden />
            <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {t("BASE_INFO", "Thông tin chung")}
                </div>
                <h2 className="mt-2 max-w-4xl text-2xl font-semibold leading-snug tracking-tight text-slate-900 sm:text-[1.75rem]">
                  {companyNm}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t("TAX_CD", "Mã số thuế")}
                </span>
                <span className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 font-mono text-sm font-semibold tracking-wide text-white">
                  {taxCd}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {t("ADDRESS", "Địa chỉ")}
                </div>
                <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-slate-700">{address}</p>
              </div>
            </div>
          </section>
        );
      })()}

      {companyInfoFieldGroups
        .filter((group) => group.key !== "identity")
        .map((group) => {
          const visibleItems = group.items.filter((field) => !field.showWhen || field.showWhen(formData));
          if (visibleItems.length === 0) {
            return null;
          }

          const expanded = Boolean(expandedGroups[group.key]);

          return (
            <section key={group.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                aria-expanded={expanded}
                onClick={() => toggleGroup(group.key)}
              >
                <span className="text-sm font-semibold text-slate-700">{t(group.titleKey, group.title)}</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {expanded ? (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  <div className="grid gap-3 lg:grid-cols-12 lg:items-start">{visibleItems.map(renderField)}</div>
                </div>
              ) : null}
            </section>
          );
        })}
    </div>
  );

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("lblCompanyInfo", "Thông tin công ty")}
              </div>

              <div className="shrink-0">
            <Toolbar>
              <ToolbarItem location="after">
                <Button
                  icon="refresh"
                  stylingMode="outlined"
                  text={t("btnRefresh", "Làm mới")}
                  onClick={() => void loadData()}
                />
              </ToolbarItem>
              <ToolbarItem location="after">
                <Button
                  disabled={!isDirty || saving}
                  icon="revert"
                  stylingMode="outlined"
                  text={t("CANCEL", "Hủy")}
                  onClick={handleCancel}
                />
              </ToolbarItem>
              <ToolbarItem location="after">
                <Button
                  disabled={!isDirty || saving}
                  icon="save"
                  stylingMode="contained"
                  text={saving ? t("SAVING", "Đang lưu...") : t("dxDataGrid-editingSaveRowChanges", "Lưu")}
                  type="default"
                  onClick={() => void handleSave()}
                />
              </ToolbarItem>
            </Toolbar>
              </div>
            </div>

            <h1 className="text-lg font-semibold leading-snug text-slate-900 break-words sm:text-xl">{displayName}</h1>
          </div>

          <TabPanel
            animationEnabled={true}
            className="min-h-0 flex-1"
            deferRendering={true}
            height="100%"
            selectedIndex={activeTabIndex}
            swipeEnabled={false}
            onSelectionChanged={handleTabSelectionChanged}
          >
            <TabPanelItem title={t("lblCompanyInfo", "Hồ sơ công ty")}>
              <div className="h-full overflow-y-auto p-3 sm:p-4">{profileForm}</div>
            </TabPanelItem>
            <TabPanelItem title={t("xrTab_TypeSign", "Chữ ký")}>
              <div className="flex h-full min-h-0 flex-col p-3">
                <CompanySignatureSection companyCd={formData.COMPANY_CD} />
              </div>
            </TabPanelItem>
            <TabPanelItem title={t("lblDecimalSettings", "Thiết lập số thập phân")}>
              <div className="h-full overflow-y-auto p-3 sm:p-4">
                <CompanyDecimalSettingSection />
              </div>
            </TabPanelItem>
            <TabPanelItem title={t("lblSequenceManagement", "Quản lý số chứng từ")}>
              <div className="h-full overflow-y-auto p-3 sm:p-4">
                <SysCodeSequenceSection />
              </div>
            </TabPanelItem>
          </TabPanel>
        </section>

        <LoadPanel
          shading={true}
          shadingColor="rgba(15, 23, 42, 0.2)"
          showIndicator={true}
          showPane={true}
          visible={loading || saving}
        />
      </div>
    </DxPage>
  );
}
