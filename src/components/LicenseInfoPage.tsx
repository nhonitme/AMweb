import { useContext, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Headphones, KeyRound, RefreshCw, UsersRound, AlertTriangle } from "lucide-react";
import { getApiErrorMessage } from "@/api/apiTypes";
import { getCurrentLicense, type LicenseInfo } from "@/api/licenseInfoApi";
import { LanguageContext } from "@/lib/i18nLoader";
import { getCurrentCompanyCd } from "@/lib/login";

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

const statusLabel: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  EXPIRING: "Sắp hết hạn",
  EXPIRED: "Đã hết hạn",
  SUSPENDED: "Tạm ngưng",
};
const statusColor: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  EXPIRING: "bg-amber-50 text-amber-700 border-amber-200",
  EXPIRED: "bg-red-50 text-red-700 border-red-200",
  SUSPENDED: "bg-gray-100 text-gray-700 border-gray-200",
};

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return <div className="flex flex-col gap-1 border-b border-gray-100 py-3 sm:grid sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-3 dark:border-gray-700">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">{value === null || value === undefined || value === "" ? "—" : value}</span>
  </div>;
}

export default function LicenseInfoPage() {
  const { t } = useContext(LanguageContext);
  const companyCd = getCurrentCompanyCd();
  const [data, setData] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"general" | "history">("general");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setData(null);
    getCurrentLicense().then((result) => {
      if (active) setData(result);
    }).catch((err: unknown) => {
      if (active) setError(getApiErrorMessage(err, "Không thể tải thông tin License"));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [companyCd, revision]);

  const badge = data?.LICENSE_STATUS ?? "";
  const canShowUserLimit = data?.MAX_USERS !== null && data?.MAX_USERS !== undefined;
  const used = data?.ACTIVE_USERS ?? 0;
  const max = data?.MAX_USERS ?? 0;
  const percent = max > 0 ? Math.min(100, Math.round(used / max * 100)) : 0;

  return <div className="mx-auto w-full max-w-6xl space-y-5 px-2 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t("LICENSE_INFORMATION", "Thông tin License")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">AMnote Web · {companyCd}</p>
      </div>
      <button type="button" onClick={() => setRevision(v => v + 1)} disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <RefreshCw size={15}/> {t("REFRESH", "Tải lại")}
      </button>
    </div>

    {loading && <div role="status" className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">Đang tải thông tin License...</div>}
    {!loading && error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
      <div className="mb-3 flex items-center gap-2"><AlertTriangle size={18}/>{error}</div>
      <button type="button" onClick={() => setRevision(v => v + 1)} className="rounded-md border border-red-200 bg-white px-3 py-1.5">Thử lại</button>
    </div>}
    {!loading && !error && !data && <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2 text-gray-800 dark:text-gray-100"><KeyRound size={20}/><strong>Chưa có thông tin License</strong></div>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Công ty này chưa được cấu hình thông tin License. Vui lòng liên hệ bộ phận hỗ trợ AMNote.</p>
    </div>}
    {!loading && !error && data && <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div><p className="text-xs text-gray-500 dark:text-gray-400">License · {data.COMPANY_CD}</p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{data.COMPANY_NM || data.COMPANY_CD}</p></div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusColor[badge] || statusColor.SUSPENDED}`}>
          <CheckCircle2 size={14}/> {statusLabel[badge] || badge}
        </span>
      </div>
      <div className={`grid gap-4 ${canShowUserLimit ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><KeyRound size={17}/> Gói phần mềm</div>
          <p className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">{data.PLAN_CODE || "—"}</p><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{data.LICENSE_TYPE || "—"}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><CalendarDays size={17}/> Ngày hết hạn</div>
          <p className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatDate(data.END_DATE)}</p>
          <p className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"><Clock3 size={13}/>{data.DAYS_REMAINING === null ? "Không giới hạn / chưa thiết lập" : badge === "EXPIRED" ? "Đã hết hạn" : `Còn ${data.DAYS_REMAINING} ngày`}</p>
        </div>
        {canShowUserLimit && <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"><UsersRound size={17}/> Người dùng</div>
          <p className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">{data.ACTIVE_USERS ?? "—"} / {max}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><div className="h-full rounded-full bg-blue-500" style={{width: `${percent}%`}} /></div>
        </div>}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex gap-1 border-b border-gray-200 px-4 pt-3 dark:border-gray-700">
          <button type="button" onClick={() => setTab("general")} className={`border-b-2 px-4 py-3 text-sm ${tab === "general" ? "border-blue-600 font-semibold text-blue-600" : "border-transparent text-gray-500"}`}>Thông tin chung</button>
          <button type="button" onClick={() => setTab("history")} className={`border-b-2 px-4 py-3 text-sm ${tab === "history" ? "border-blue-600 font-semibold text-blue-600" : "border-transparent text-gray-500"}`}>Lịch sử gia hạn</button>
        </div>
        {tab === "general" ? <div className="px-5 pb-4">
          <Detail label="Tên công ty" value={data.COMPANY_NM}/><Detail label="Mã công ty" value={data.COMPANY_CD}/>
          <Detail label="Mã License (đã ẩn)" value={data.LICENSE_KEY_MASKED}/><Detail label="Gói License" value={data.PLAN_CODE}/>
          <Detail label="Loại giấy phép" value={data.LICENSE_TYPE}/><Detail label="Ngày bắt đầu" value={formatDate(data.START_DATE)}/>
          <Detail label="Ngày hết hạn" value={formatDate(data.END_DATE)}/><Detail label="Số người dùng tối đa" value={data.MAX_USERS}/>
          <Detail label="Số phiên đồng thời tối đa" value={data.MAX_CONCURRENT_USERS}/>
          <Detail label="Đơn vị cung cấp" value="AMNote"/>
        </div> : <div className="overflow-x-auto p-5">
          {data.RENEWAL_HISTORY.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có lịch sử gia hạn.</p> :
            <table className="w-full min-w-[540px] text-left text-sm"><thead><tr className="border-b border-gray-200 text-gray-500 dark:border-gray-700">
              <th className="pb-3 font-medium">Ngày gia hạn</th><th className="pb-3 font-medium">Hạn cũ</th><th className="pb-3 font-medium">Hạn mới</th><th className="pb-3 font-medium">Ghi chú</th>
            </tr></thead><tbody>{data.RENEWAL_HISTORY.map(item => <tr key={item.ID} className="border-b border-gray-100 dark:border-gray-700">
              <td className="py-3">{formatDate(item.RENEWED_AT)}</td><td>{formatDate(item.OLD_END_DATE)}</td><td>{formatDate(item.NEW_END_DATE)}</td><td>{item.NOTE || "—"}</td>
            </tr>)}</tbody></table>}
        </div>}
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <Headphones className="mt-0.5 text-gray-500" size={20}/><div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">Hỗ trợ & gia hạn License</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Vui lòng liên hệ AMNote nếu cần gia hạn hoặc điều chỉnh License. Màn hình này chỉ cho phép xem.</p>
        </div>
      </div>
    </>}
  </div>;
}
