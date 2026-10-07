import { useCallback, useContext, useMemo } from "react"
import Button from "devextreme-react/button"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import type { SysCode } from "@/api/sysCodeService"
import { LanguageContext } from "@/lib/i18nLoader"
import { getSysCodeDisplayText } from "@/lib/sysCodeUtils"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { EInvoiceDeclarationDetailType } from "@/types/einvoiceDeclaration"

interface EInvoiceDeclarationProviderSelectPopupProps {
  visible: boolean
  detailType: Extract<EInvoiceDeclarationDetailType, "TCGP" | "TCTN">
  providers: SysCode[]
  selectedCodeCd: string
  loading?: boolean
  onClose: () => void
  onSelect: (codeCd: string) => void
  onConfirm: () => void
}

function resolveProviderTitle(detailType: EInvoiceDeclarationProviderSelectPopupProps["detailType"], translate: (key: string, fallback: string) => string): string {
  if (detailType === "TCGP") {
    return translate("DECL_TCGP_SELECT", "Select solution provider")
  }

  return translate("DECL_TCTN_SELECT", "Select transmission provider")
}

export default function EInvoiceDeclarationProviderSelectPopup({
  visible,
  detailType,
  providers,
  selectedCodeCd,
  loading = false,
  onClose,
  onSelect,
  onConfirm,
}: EInvoiceDeclarationProviderSelectPopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const selectedProvider = useMemo(
    () => providers.find((item) => item.CODE_CD === selectedCodeCd) ?? null,
    [providers, selectedCodeCd],
  )

  const title = resolveProviderTitle(detailType, t)

  return (
    <Popup
      visible={visible}
      title={title}
      showTitle={true}
      showCloseButton={false}
      dragEnabled={false}
      resizeEnabled={false}
      hideOnOutsideClick={!loading}
      width="min(760px, 96vw)"
      height="auto"
      maxHeight="min(680px, 92vh)"
      animation={POPUP_FADE_ANIMATION}
      onHiding={onClose}
    >
      <ToolbarItem
        toolbar="top"
        location="after"
        render={() => (
          <Button icon="close" stylingMode="text" disabled={loading} hint={t("CANCEL", "Cancel")} onClick={onClose} />
        )}
      />

      <div className="flex max-h-[min(620px,82vh)] flex-col gap-4 p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          {detailType === "TCGP"
            ? t("DECL_TCGP_SELECT_DESC", "Choose a registered e-invoice solution provider from the master list.")
            : t("DECL_TCTN_SELECT_DESC", "Choose a registered transmission provider from the master list.")}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <div className="text-base font-semibold text-slate-800">
                {t("DECL_PROVIDER_NOT_FOUND", "No provider available to add")}
              </div>
              <div className="mt-2 max-w-md text-sm text-slate-500">
                {t("DECL_PROVIDER_NOT_FOUND_HINT", "All providers from the master list are already added or inactive.")}
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {providers.map((provider) => {
                const isSelected = provider.CODE_CD === selectedCodeCd

                return (
                  <button
                    key={`${provider.CODE_TYPE}-${provider.CODE_CD}`}
                    type="button"
                    disabled={loading}
                    onClick={() => onSelect(provider.CODE_CD)}
                    className={[
                      "w-full rounded-xl border p-4 text-left transition-all",
                      isSelected
                        ? "border-blue-500 bg-blue-50/70 shadow-sm ring-2 ring-blue-200"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={[
                          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                          isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white",
                        ].join(" ")}
                      >
                        {isSelected ? <span className="text-xs leading-none">✓</span> : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold text-slate-900">{getSysCodeDisplayText(provider, t)}</div>
                        <div className="mt-2 text-sm text-slate-600">
                          <span className="font-medium text-slate-500">{t("MST", "Tax code")}: </span>
                          {provider.CODE_CD}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {selectedProvider ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-medium text-slate-700">{t("SELECTED", "Selected")}: </span>
            {getSysCodeDisplayText(selectedProvider, t)}
            {selectedProvider.CODE_CD ? ` · MST ${selectedProvider.CODE_CD}` : ""}
          </div>
        ) : null}

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <Button text={t("CANCEL", "Cancel")} stylingMode="outlined" disabled={loading} onClick={onClose} />
          <Button
            text={t("ADD", "Add")}
            icon="plus"
            type="default"
            stylingMode="contained"
            disabled={!selectedCodeCd || loading || providers.length === 0}
            onClick={onConfirm}
          />
        </div>
      </div>
    </Popup>
  )
}
