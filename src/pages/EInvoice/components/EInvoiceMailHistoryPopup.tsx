import { useCallback, useContext } from "react"
import DataGrid, { Column, Paging, Scrolling } from "devextreme-react/data-grid"
import LoadPanel from "devextreme-react/load-panel"
import Popup from "devextreme-react/popup"
import type { ColumnCellTemplateData } from "devextreme/ui/data_grid"

import { LanguageContext } from "@/lib/i18nLoader"
import type { EInvoiceEmailHistory } from "@/types/einvoiceMailHistory"

type GridKey = string | number
type MailHistoryCellInfo = ColumnCellTemplateData<EInvoiceEmailHistory, GridKey>

type EInvoiceMailHistoryPopupProps = {
  visible: boolean
  title: string
  loading: boolean
  items: EInvoiceEmailHistory[]
  onClose: () => void
}

function trimText(value: unknown): string {
  return String(value ?? "").trim()
}

function getStatusClassName(status: string): string {
  const normalized = status.trim().toUpperCase()
  if (normalized === "SENT") {
    return "rounded bg-green-50 px-2 py-1 text-xs font-semibold text-green-700"
  }
  if (normalized === "ERROR") {
    return "rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
  }
  if (normalized === "SENDING") {
    return "rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
  }
  return "rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
}

export default function EInvoiceMailHistoryPopup({
  visible,
  title,
  loading,
  items,
  onClose,
}: EInvoiceMailHistoryPopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const renderStatusCell = useCallback((cellInfo: MailHistoryCellInfo) => {
    const status = trimText(cellInfo.value)
    return <span className={getStatusClassName(status)}>{status || "-"}</span>
  }, [])

  const renderTextCell = useCallback((cellInfo: MailHistoryCellInfo) => {
    const text = trimText(cellInfo.value)
    return <span title={text}>{text || "-"}</span>
  }, [])

  return (
    <Popup
      visible={visible}
      title={title || t("MAIL_HISTORY", "Lịch sử gửi mail")}
      showTitle={true}
      showCloseButton={true}
      dragEnabled={false}
      resizeEnabled={true}
      hideOnOutsideClick={!loading}
      width="min(1180px, 96vw)"
      height="min(680px, 88vh)"
      onHiding={onClose}
    >
      <div className="relative flex h-full min-h-0 flex-col bg-white p-3">
        <DataGrid<EInvoiceEmailHistory, GridKey>
          dataSource={items}
          keyExpr="MAIL_ID"
          height="100%"
          showBorders={true}
          columnAutoWidth={true}
          wordWrapEnabled={true}
          noDataText={t("NO_DATA", "Không có dữ liệu")}
        >
          <Scrolling mode="virtual" />
          <Paging enabled={false} />
          <Column dataField="SEND_STATUS" caption={t("SEND_STATUS", "Trạng thái")} width={120} alignment="center" cellRender={renderStatusCell} />
          <Column dataField="SEND_TYPE" caption={t("SEND_TYPE", "Kiểu gửi")} width={110} />
          <Column dataField="FROM_EMAIL" caption={t("FROM_EMAIL", "Email gửi")} minWidth={180} cellRender={renderTextCell} />
          <Column dataField="TO_EMAIL" caption={t("TO_EMAIL", "Email nhận")} minWidth={220} cellRender={renderTextCell} />
          <Column dataField="MAIL_SUBJECT" caption={t("MAIL_SUBJECT", "Tiêu đề")} minWidth={260} cellRender={renderTextCell} />
          <Column dataField="ERROR_MESSAGE" caption={t("ERROR_MESSAGE", "Lỗi")} minWidth={240} cellRender={renderTextCell} />
          <Column dataField="SEND_DT" caption={t("SEND_DT", "Ngày gửi")} dataType="datetime" format="yyyy-MM-dd HH:mm:ss" width={170} />
          <Column dataField="CREATE_DT" caption={t("CREATE_DT", "Ngày tạo")} dataType="datetime" format="yyyy-MM-dd HH:mm:ss" width={170} />
          <Column dataField="CREATE_USER" caption={t("CREATE_USER", "Người tạo")} width={120} />
        </DataGrid>

        <LoadPanel visible={loading} showIndicator={true} showPane={true} shading={true} shadingColor="rgba(0, 0, 0, 0.12)" />
      </div>
    </Popup>
  )
}
