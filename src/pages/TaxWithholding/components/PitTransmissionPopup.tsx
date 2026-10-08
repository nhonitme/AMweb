import { useContext, useState } from "react"
import Button from "devextreme-react/button"
import DataGrid, { Column, Paging, Scrolling } from "devextreme-react/data-grid"
import LoadPanel from "devextreme-react/load-panel"
import Popup from "devextreme-react/popup"
import type { ColumnCellTemplateData } from "devextreme/ui/data_grid"
import { LanguageContext } from "@/lib/i18nLoader"
import type { PitTransmissionMessage } from "../types"

const messageNames: Record<string, string> = {
  "110": "Tiếp nhận tờ khai chứng từ điện tử",
  "111": "Chấp nhận tờ khai chứng từ điện tử",
  "213": "Kết quả kiểm tra dữ liệu chứng từ điện tử",
  "301": "Kết quả xử lý thông báo sai sót",
}

export default function PitTransmissionPopup({
  visible,
  loading,
  title,
  messages,
  onClose,
}: {
  visible: boolean
  loading: boolean
  title: string
  messages: PitTransmissionMessage[]
  onClose: () => void
}) {
  const [xml, setXml] = useState<PitTransmissionMessage | null>(null)
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  return (
    <>
      <Popup
        visible={visible}
        title={title}
        showCloseButton
        resizeEnabled
        width="min(820px, 96vw)"
        height="min(720px, 90vh)"
        hideOnOutsideClick={!loading}
        onHiding={onClose}
      >
        <div className="relative flex h-full min-h-0 flex-col bg-white p-3">
          <DataGrid<PitTransmissionMessage, number>
            dataSource={messages}
            keyExpr="RECEIVE_ID"
            height="100%"
            showBorders
            columnAutoWidth
            wordWrapEnabled
            noDataText={t("NO_DATA", "Không có dữ liệu")}
          >
            <Scrolling mode="virtual" />
            <Paging enabled={false} />
            <Column
              dataField="MLTDIEP"
              caption={t("MLTDIEP", "Loại thông điệp")}
              minWidth={230}
              cellRender={(cell: ColumnCellTemplateData<PitTransmissionMessage, number>) => (
                <div className="leading-tight">
                  <div className="font-medium text-slate-700">{cell.data.MLTDIEP}</div>
                  <div className="text-xs text-slate-500">
                    {cell.data.MLTDIEP_NAME || messageNames[cell.data.MLTDIEP] || ""}
                  </div>
                </div>
              )}
            />
            <Column dataField="ERROR_MESSAGE" caption={t("ERROR_MESSAGE", "Lỗi")} minWidth={220} />
            <Column dataField="CREATE_AT" caption={t("CREATE_AT", "Ngày tạo")} dataType="datetime" format="dd/MM/yyyy HH:mm:ss" width={170} />
            <Column
              caption="XML"
              width={90}
              alignment="center"
              cellRender={(cell: ColumnCellTemplateData<PitTransmissionMessage, number>) => (
                <Button icon="eyeopen" text={t("VIEW", "Xem")} stylingMode="text" onClick={() => setXml(cell.data)} />
              )}
            />
          </DataGrid>
          <LoadPanel visible={loading} showIndicator showPane shading />
        </div>
      </Popup>
      <Popup
        visible={Boolean(xml)}
        title={`XML thông điệp ${xml?.MLTDIEP ?? ""}`}
        showCloseButton
        resizeEnabled
        width="min(1000px, 96vw)"
        height="min(760px, 92vh)"
        onHiding={() => setXml(null)}
      >
        <pre className="pit-xml-viewer">{xml?.RESPONSE_XML}</pre>
      </Popup>
    </>
  )
}
