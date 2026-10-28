import { useContext, useRef } from "react"
import Button from "devextreme-react/button"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"
import { LanguageContext } from "@/lib/i18nLoader"
import { getApiErrorMessage } from "@/api/apiTypes"
import { useChitListInvalidate } from "@/hooks/queries/useChitListQuery"
import { useInventoryVoucherListInvalidate } from "@/hooks/queries/useInventoryVoucherListQuery"
import { useVatInOutListInvalidate } from "@/hooks/queries/useVatInOutListQuery"

export default function DeleteVoucherButton({ disabled, voucherNo, onDelete, onDeleted, onBusyChange }: {
    disabled: boolean
    voucherNo: string
    onDelete: () => Promise<{ success: boolean; message?: string }>
    onDeleted: () => void
    onBusyChange: (busy: boolean) => void
}) {
    const { translate: t } = useContext(LanguageContext)
    const busyRef = useRef(false)
    const invalidateChits = useChitListInvalidate()
    const invalidateInventory = useInventoryVoucherListInvalidate()
    const invalidateVat = useVatInOutListInvalidate()

    const remove = async () => {
        if (disabled || busyRef.current) return
        busyRef.current = true
        onBusyChange(true)
        try {
            const confirmed = await confirm(
                t("CONFIRM_DELETE_VOUCHER", "Bạn có chắc muốn xóa chứng từ {0}?").replace("{0}", voucherNo.replace(/[&<>"']/g, "")),
                t("MSG_CONFIRM_DELETE", "Xác nhận xóa"),
            )
            if (!confirmed) return
            const result = await onDelete()
            if (!result.success) throw new Error(result.message || t("DELETE_FAILED", "Xóa thất bại"))
            notify(t("DELETE_SUCCESS", "Xóa thành công"), "success", 2500)
            onDeleted()
            await Promise.all([invalidateChits(), invalidateInventory(), invalidateVat()])
        } catch (error) {
            notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 4000)
        } finally {
            busyRef.current = false
            onBusyChange(false)
        }
    }

    return <Button text={t("DELETE_VOUCHER", "Xóa chứng từ")} icon="trash" type="danger" stylingMode="outlined" disabled={disabled} onClick={() => void remove()} />
}
