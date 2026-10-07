import { useCallback, useMemo } from "react"
import Button from "devextreme-react/button"
import DataGrid, { Column, Paging, Scrolling } from "devextreme-react/data-grid"
import LoadPanel from "devextreme-react/load-panel"
import Popup from "devextreme-react/popup"
import type { ColumnCellTemplateData } from "devextreme/ui/data_grid"

import type { EInvoiceTransmissionMessage } from "@/types/einvoiceTransmission"
import {
  canPreviewTransmissionMessage,
  normalizeTransmissionMessages,
} from "../einvoiceTransmissionMessageUtils"

type GridKey = string | number
type TransmissionGridCellInfo = ColumnCellTemplateData<EInvoiceTransmissionMessage, GridKey>

type EInvoiceTransmissionMessagesPopupProps = {
  visible: boolean
  title: string
  loading: boolean
  messages: EInvoiceTransmissionMessage[]
  t: (key: string, fallback: string) => string
  onClose: () => void
  onViewHtml: (message: EInvoiceTransmissionMessage) => void
}

function trimDisplayText(value: unknown): string {
  return String(value ?? "").trim()
}

export default function EInvoiceTransmissionMessagesPopup({
  visible,
  title,
  loading,
  messages,
  t,
  onClose,
  onViewHtml,
}: EInvoiceTransmissionMessagesPopupProps) {
  const gridMessages = useMemo(() => normalizeTransmissionMessages(messages), [messages])

  const renderTransmissionTypeCell = useCallback((cellInfo: TransmissionGridCellInfo) => {
    const code = trimDisplayText(cellInfo.data?.MLTDIEP)
    const name = trimDisplayText(cellInfo.data?.MLTDIEP_NAME)

    return (
      <div className="leading-tight">
        <div className="font-medium text-slate-700">{code || "-"}</div>
        {name ? <div className="text-xs text-slate-500">{name}</div> : null}
      </div>
    )
  }, [])

  const renderViewCell = useCallback(
    (cellInfo: TransmissionGridCellInfo) => {
      const message = cellInfo.data
      const canPreview = message ? canPreviewTransmissionMessage(message) : false

      return (
        <Button
          icon="eyeopen"
          text={t("VIEW", "Xem")}
          hint={t("VIEW_XML_HTML", "Xem XML dạng HTML")}
          stylingMode="text"
          height={28}
          disabled={!message || !canPreview}
          onClick={(event) => {
            event.event?.stopPropagation()
            if (message) {
              onViewHtml(message)
            }
          }}
        />
      )
    },
    [onViewHtml, t],
  )

  return (
    <Popup
      visible={visible}
      title={title || t("DECL_TRANSMISSION_INFO", "Thông tin truyền nhận")}
      showTitle={true}
      showCloseButton={true}
      dragEnabled={false}
      resizeEnabled={true}
      hideOnOutsideClick={!loading}
      width="min(1120px, 96vw)"
      height="min(720px, 90vh)"
      onHiding={onClose}
    >
      <div className="relative flex h-full min-h-0 flex-col bg-white p-3">
        <DataGrid<EInvoiceTransmissionMessage, GridKey>
          dataSource={gridMessages}
          keyExpr="MESSAGE_KEY"
          height="100%"
          showBorders={true}
          columnAutoWidth={true}
          wordWrapEnabled={true}
          noDataText={t("NO_DATA", "Không có dữ liệu")}
        >
          <Scrolling mode="virtual" />
          <Paging enabled={false} />
          <Column dataField="MLTDIEP" caption={t("MLTDIEP", "Loại thông điệp")} minWidth={220} cellRender={renderTransmissionTypeCell} />
          <Column dataField="MTDIEP" caption={t("MTDIEP", "Mã thông điệp")} minWidth={190} />
          <Column dataField="MTDTCHIEU" caption={t("MTDTCHIEU", "Mã tham chiếu")} minWidth={190} />
          <Column dataField="MST" caption={t("MST", "MST")} width={130} />
          <Column dataField="ERROR_MESSAGE" caption={t("ERROR_MESSAGE", "Lỗi")} minWidth={220} />
          <Column caption="XML" width={104} alignment="center" cellRender={renderViewCell} />
          <Column dataField="CREATE_DT" caption={t("CREATE_DT", "Ngày tạo")} dataType="datetime" format="yyyy-MM-dd HH:mm:ss" width={170} />
        </DataGrid>

        <LoadPanel visible={loading} showIndicator={true} showPane={true} shading={true} shadingColor="rgba(0, 0, 0, 0.12)" />
      </div>
    </Popup>
  )
}
