import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "devextreme/dist/css/dx.fluent.blue.light.compact.css";
import "./index.css";
import "./styles/icon-colors.scss";
import "./styles/devextreme-overrides.css";
import "./styles/master-data-edit-popup.css";
import "./api/axiosClient";

import App from "./App";
import DownloadQueuePanel from "@/components/DownloadQueuePanel";
import { FontScaleProvider } from "@/components/font-scale-provider";
import { MenuLayoutProvider } from "@/components/menu-layout-provider";
import { LanguageProvider } from "@/lib/i18nLoader";
import { applyFontBoost, getStoredFontBoost } from "@/lib/fontScale";
import { initGridOverflowTooltips } from "@/lib/gridOverflowTooltip";
import { initGridHeaderFieldTooltips } from "@/lib/gridHeaderFieldTooltip";
import { SysGridColumnSettingProvider } from "@/lib/sysGridColumnSettingContext";
import { SysCodeProvider } from "@/lib/sysCodeContext";
import { QueryProvider } from "@/lib/query/QueryProvider";
import { installPopupStacking } from "@/components/popup/popupEscapeStack";

window.localStorage.removeItem("dx-theme");
document.querySelectorAll('link[rel="dx-theme"]').forEach((link) => link.remove());

applyFontBoost(getStoredFontBoost());

initGridOverflowTooltips();
initGridHeaderFieldTooltips();
installPopupStacking();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <FontScaleProvider>
      <MenuLayoutProvider>
        <QueryProvider>
          <LanguageProvider>
            <SysGridColumnSettingProvider>
              <SysCodeProvider>
                <App />
                <DownloadQueuePanel />
              </SysCodeProvider>
            </SysGridColumnSettingProvider>
          </LanguageProvider>
        </QueryProvider>
      </MenuLayoutProvider>
    </FontScaleProvider>
  </StrictMode>,
);
