import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LoadPanel } from "devextreme-react";
import Button from "devextreme-react/button";
import Form, { GroupItem, Item } from "devextreme-react/form";
import notify from "devextreme/ui/notify";

import { getCompanyInfo, updateCompanyInfo } from "@/api/companyInfoApi";
import DxPage from "@/dx/DxPage";
import { LanguageContext } from "@/lib/i18nLoader";
import type { CompanyInfo } from "@/types/companyInfo";
import CompanySignatureSection from "./CompanySignatureSection";
import { createCompanyInfoFieldGroups } from "./companyInfoFields";

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

type CompanyManagementTab = "profile" | "signature";

function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length === 0 ? null : text;
}

function normalizeDate(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeCompanyInfo(data?: Partial<CompanyInfo>): CompanyInfo {
  return {
    ...emptyCompanyInfo,
    ...data,
    COMPANY_CD: data?.COMPANY_CD ?? "",
    COMPANY_TYPE: normalizeNumber(data?.COMPANY_TYPE),
    COMPANY_KIND: normalizeNumber(data?.COMPANY_KIND),
    OPEN_YMD: normalizeDate(data?.OPEN_YMD),
    CARRYFORWARD_YMD: normalizeDate(data?.CARRYFORWARD_YMD),
  };
}

export default function CompanyManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [activeTab, setActiveTab] = useState<CompanyManagementTab>("profile");
  const [formData, setFormData] = useState<CompanyInfo>(emptyCompanyInfo);
  const [initialData, setInitialData] = useState<CompanyInfo>(emptyCompanyInfo);

  const { lang, translate } = useContext(LanguageContext) as {
    lang: string;
    translate: (key: string, fallback?: string) => string;
  };

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  );
  const companyInfoFieldGroups = useMemo(() => createCompanyInfoFieldGroups(t), [lang, t]);
  const tabs = useMemo(
    () => [
      {
        key: "profile" as const,
        title: t("lblCompanyInfo", "Company profile"),
       
      },
      {
        key: "signature" as const,
        title: t("xrTab_TypeSign", "Signature settings"),
       
      },
    ],
    [t],
  );

  const activeTabMeta = useMemo(
    () => tabs.find((tab) => tab.key === activeTab) ?? tabs[0],
    [activeTab, tabs],
  );

  const isDirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(initialData),
    [formData, initialData],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getCompanyInfo();
      const normalized = normalizeCompanyInfo(response.data);

      setFormData(normalized);
      setInitialData(normalized);
      setExists(response.exists);
    } catch (error) {
      console.error("Failed to load company info", error);
      notify(t("LOAD_FAILED", "Failed to load company info"), "error", 4000);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resolveLabel = useCallback(
    (labelKey: string, fallback: string) => {
      return t(labelKey, fallback);
    },
    [t],
  );

  const handleFieldDataChanged = useCallback((event: { dataField?: string; value?: unknown }) => {
    const field = event.dataField as keyof CompanyInfo | undefined;
    if (!field) {
      return;
    }

    setFormData((current) => {
      if (dateFields.has(field)) {
        return { ...current, [field]: normalizeDate(event.value) };
      }

      if (numberFields.has(field)) {
        return { ...current, [field]: normalizeNumber(event.value) };
      }

      if (field === "COMPANY_CD") {
        return { ...current, COMPANY_CD: String(event.value ?? "") };
      }

      return { ...current, [field]: normalizeString(event.value) };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.COMPANY_NM?.trim()) {
      const companyNameLabel = resolveLabel("COMPANY_NM", "Company name");
      notify(`${companyNameLabel} ${t("REQUIRED", "is required")}`, "warning", 3000);
      return;
    }

    setSaving(true);
    try {
      const result = await updateCompanyInfo(formData);
      const normalized = normalizeCompanyInfo(result.data);

      setFormData(normalized);
      setInitialData(normalized);
      setExists(true);

      notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000);
    } catch (error) {
      console.error("Failed to update company info", error);
      notify(t("UPDATE_FAILED", "Update failed"), "error", 4000);
    } finally {
      setSaving(false);
    }
  }, [formData, resolveLabel, t]);

  const editorOptionsByField = useCallback(
    (key: keyof CompanyInfo, editorType?: string, readOnly?: boolean): Record<string, unknown> => {
      if (editorType === "dxDateBox") {
        return {
          dateSerializationFormat: "yyyy-MM-dd",
          displayFormat: "yyyy-MM-dd",
          openOnFieldClick: true,
          showClearButton: true,
          stylingMode: "outlined",
          type: "date",
        };
      }

      if (editorType === "dxNumberBox") {
        return {
          min: 0,
          showSpinButtons: true,
          stylingMode: "outlined",
        };
      }

      if (editorType === "dxTextArea") {
        return {
          autoResizeEnabled: true,
          minHeight: key === "NOTE" ? 120 : 96,
          stylingMode: "outlined",
        };
      }

      return {
        readOnly: readOnly ?? false,
        stylingMode: "outlined",
      };
    },
    [],
  );

  return (
    <DxPage>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{activeTabMeta.title}</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  {formData.COMPANY_NM || formData.COMPANY_CD || t("COMPANY", "Company")}
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-600">
                  {activeTab === "profile"
                    ? exists
                      ? activeTabMeta.description
                      : t(
                          "lblCompanyInfoEmpty",
                          "No company profile exists yet. Enter the details below to create one.",
                        )
                    : activeTabMeta.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {tabs.map((tab) => {
                    const isSelected = tab.key === activeTab;

                    return (
                      <button
                        key={tab.key}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          isSelected
                            ? "bg-slate-900 text-white shadow-sm"
                            : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                      >
                        {tab.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    {resolveLabel("COMPANY_CD", "Company code")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formData.COMPANY_CD || "-"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    {resolveLabel("TAX_CD", "Tax code")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formData.TAX_CD || "-"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    {resolveLabel("OWNER_NM", "Representative")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formData.OWNER_NM || "-"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          
              {activeTab === "profile" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    icon="refresh"
                    stylingMode="outlined"
                    text={t("btnRefresh", "Refresh")}
                    type="normal"
                    onClick={() => void loadData()}
                  />
                  <Button
                    disabled={!isDirty || saving}
                    icon="save"
                    stylingMode="contained"
                    text={saving ? t("SAVING", "Saving...") : t("dxDataGrid-editingSaveRowChanges", "Save")}
                    type="default"
                    onClick={() => void handleSave()}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {activeTab === "profile" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <Form
              colCount={1}
              formData={formData}
              labelLocation="top"
              onFieldDataChanged={handleFieldDataChanged}
              width="100%"
            >
              {companyInfoFieldGroups.map((group) => (
                <GroupItem key={group.key} caption={t(group.titleKey, group.title)} colCount={2}>
                  {group.items.map((field) => (
                    <Item
                      key={field.key}
                      colSpan={field.colSpan}
                      dataField={field.key}
                      editorOptions={editorOptionsByField(field.key, field.editorType, field.readOnly)}
                      editorType={field.editorType ?? "dxTextBox"}
                      label={{ text: resolveLabel(field.labelKey, field.label) }}
                    />
                  ))}
                </GroupItem>
              ))}
            </Form>
          </section>
        ) : (
          <CompanySignatureSection companyCd={formData.COMPANY_CD} />
        )}

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
