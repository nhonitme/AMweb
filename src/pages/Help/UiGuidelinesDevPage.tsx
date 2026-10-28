/** Dev-only page: embeds AMnote UI Guidelines static kit. */
export default function UiGuidelinesDevPage() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-slate-50">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800">AMnote UI Guidelines</div>
          <div className="text-xs text-slate-500">Chỉ hiện khi npm run dev · không có trong bản build</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            href="/amnote-ui/"
            rel="noreferrer"
            target="_blank"
          >
            Mở Guidelines
          </a>
          <a
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            href="/amnote-ui/dashboard/"
            rel="noreferrer"
            target="_blank"
          >
            Dashboard mẫu
          </a>
        </div>
      </div>
      <iframe
        className="min-h-0 w-full flex-1 border-0 bg-white"
        src="/amnote-ui/"
        title="AMnote UI Guidelines"
      />
    </div>
  );
}
