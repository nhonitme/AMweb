import { EINV_KEY, einvPdfExportFailed, einvT } from "./einvoiceI18n"

export const PREVIEW_EXPORT_DONE_MESSAGE = "amnote-einvoice-export-pdf-done"
export const PREVIEW_EXPORT_ERROR_MESSAGE = "amnote-einvoice-export-pdf-error"

export type HtmlPreviewToolbarOptions = {
  exportMessageType: string
  exportPayload: Record<string, unknown>
}

function resolvePreviewToolbarLabels() {
  return {
    exportPdf: einvT(EINV_KEY.PRINT_PDF, "Print PDF"),
    print: einvT(EINV_KEY.PRINT, "Print"),
    exportingPdf: einvT(EINV_KEY.PDF_GENERATING, "Generating PDF..."),
    noOpener: einvT(
      "PREVIEW_NO_OPENER",
      "Cannot export PDF because the preview window is not linked to the application.",
    ),
    exportFailed: einvPdfExportFailed(),
  }
}

export function injectHtmlPreviewToolbar(html: string, options: HtmlPreviewToolbarOptions): string {
  const exportPayloadJson = JSON.stringify(options.exportPayload)
  const labels = resolvePreviewToolbarLabels()
  const toolbar = `
<div id="amnote-preview-actions">
  <button type="button" id="amnote-export-pdf-btn" class="amnote-preview-action-btn" title=${JSON.stringify(labels.exportPdf)} aria-label=${JSON.stringify(labels.exportPdf)}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="12" y1="18" x2="12" y2="12"></line>
      <polyline points="9 15 12 18 15 15"></polyline>
    </svg>
  </button>
  <button type="button" id="amnote-print-btn" class="amnote-preview-action-btn" title=${JSON.stringify(labels.print)} aria-label=${JSON.stringify(labels.print)}>
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="6 9 6 2 18 2 18 9"></polyline>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="8"></rect>
    </svg>
  </button>
</div>
<style>
  #amnote-preview-actions {
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 100000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: "Segoe UI", Arial, sans-serif;
  }
  #amnote-preview-actions .amnote-preview-action-btn {
    width: 52px;
    height: 52px;
    border: none;
    border-radius: 50%;
    background: #0f766e;
    color: #fff;
    box-shadow: 0 4px 14px rgba(15, 118, 110, 0.45);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  }
  #amnote-preview-actions .amnote-preview-action-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(15, 118, 110, 0.5);
    background: #0d9488;
  }
  #amnote-preview-actions .amnote-preview-action-btn:disabled {
    opacity: 0.65;
    cursor: wait;
  }
  #amnote-preview-actions .amnote-preview-action-btn.is-loading svg {
    opacity: 0.35;
  }
  @media print {
    #amnote-preview-actions {
      display: none !important;
    }
  }
</style>
<script>
(function () {
  var exportPayload = ${exportPayloadJson};
  var exportBtn = document.getElementById("amnote-export-pdf-btn");
  var printBtn = document.getElementById("amnote-print-btn");
  var parentOrigin = ${JSON.stringify(window.location.origin)};
  var labels = ${JSON.stringify(labels)};

  function resetExportButton() {
    if (!exportBtn) return;
    exportBtn.disabled = false;
    exportBtn.classList.remove("is-loading");
    exportBtn.setAttribute("title", labels.exportPdf);
    exportBtn.setAttribute("aria-label", labels.exportPdf);
  }

  if (printBtn) {
    printBtn.addEventListener("click", function () {
      window.print();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      if (!window.opener) {
        window.alert(labels.noOpener);
        return;
      }

      exportBtn.disabled = true;
      exportBtn.classList.add("is-loading");
      exportBtn.setAttribute("title", labels.exportingPdf);
      exportBtn.setAttribute("aria-label", labels.exportingPdf);
      window.opener.postMessage(
        Object.assign({ type: ${JSON.stringify(options.exportMessageType)} }, exportPayload),
        parentOrigin,
      );
    });
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== parentOrigin || !event.data) {
      return;
    }

    if (event.data.type === ${JSON.stringify(PREVIEW_EXPORT_DONE_MESSAGE)}) {
      resetExportButton();
      return;
    }

    if (event.data.type === ${JSON.stringify(PREVIEW_EXPORT_ERROR_MESSAGE)}) {
      resetExportButton();
      window.alert(event.data.message || labels.exportFailed);
    }
  });
})();
</script>
`

  if (html.includes("</body>")) {
    return html.replace("</body>", `${toolbar}</body>`)
  }

  return `${html}${toolbar}`
}
