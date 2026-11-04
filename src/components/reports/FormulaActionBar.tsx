import { memo } from "react"

import Button from "devextreme-react/button"

import type { TranslateFn } from "./formulaOptionsShared"

type FormulaActionBarProps = {
  isDirty: boolean
  isVatDeclaration: boolean
  loading: boolean
  saving: boolean
  hasCompanyOverride: boolean
  t: TranslateFn
  onReload: () => void
  onReset: () => void
  onClose: () => void
  onSave: () => void
}

export const FormulaActionBar = memo(function FormulaActionBar({
  isDirty,
  isVatDeclaration,
  loading,
  saving,
  hasCompanyOverride,
  t,
  onReload,
  onReset,
  onClose,
  onSave,
}: FormulaActionBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-300 bg-white pt-3">
      {isVatDeclaration && isDirty ? (
        <span className="mr-auto text-xs font-medium text-amber-700">
          {t("UNSAVED_CHANGES_HINT", "Có thay đổi chưa lưu")}
        </span>
      ) : null}
      <Button
        stylingMode="outlined"
        text={t("btnRefresh", "Tải lại")}
        disabled={loading || saving}
        onClick={onReload}
      />
      <Button
        stylingMode="outlined"
        type="danger"
        text={t("REPORT_FORMULA_RESET", "Về mặc định")}
        hint={t(
          "REPORT_FORMULA_RESET_HINT",
          "Xóa bản tùy chỉnh của công ty và lấy lại mẫu mặc định ban đầu",
        )}
        disabled={loading || saving || (!hasCompanyOverride && !isDirty)}
        onClick={onReset}
      />
      <Button
        stylingMode="outlined"
        text={t("MSG_BTNCAN", "Đóng")}
        disabled={saving}
        onClick={onClose}
      />
      <Button
        icon="save"
        type="default"
        stylingMode="contained"
        text={saving ? t("SAVING", "Đang lưu...") : t("dxDataGrid-editingSaveRowChanges", "Lưu cấu hình")}
        disabled={!isDirty || loading || saving}
        onClick={onSave}
      />
    </div>
  )
})
