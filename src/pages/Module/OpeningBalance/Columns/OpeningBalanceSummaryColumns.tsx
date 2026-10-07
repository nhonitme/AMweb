import React from "react"
import { Column } from "devextreme-react/data-grid"
import Button from "devextreme-react/button"
import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import type { OpeningBalanceSummaryModel } from "@/types/openingBalance"
import { getStatusClass, getStatusText } from "@/utils/openingBalanceHelpers"
import { getCurrentDataLanguageSuffix } from "@/utils/language"

type Props = {
  t: (key: string, fallback?: string) => string
  onOpenDetail: (row: OpeningBalanceSummaryModel) => void
}

export function OpeningBalanceSummaryColumns(props: Props): React.JSX.Element {
  const { t, onOpenDetail } = props
  const { getFormat } = useDecimalColumnFormats()

  return (
    <>
      <Column
        dataField="ITEM_CD"
        caption={t("CODE", "Mã")}
        width={90}
        alignment="center"
        visible={false}
      />
      <Column
        dataField={`ITEM_NAME_${getCurrentDataLanguageSuffix()}`}
        caption={t("OPENING_TRANSACTION", "Nghiệp vụ đầu kỳ")}
        minWidth={220}
      />
      <Column
        dataField="NOTE"
        caption={t("DESCRIPTION1", "Mô tả")}
        minWidth={220}
      />
      <Column
        dataField="RECORD_COUNT"
        caption={t("Row_Count", "Số dòng")}
        width={110}
        alignment="right"
        format={getFormat("RECORD_COUNT", "#,##0")}
        visible={false}
      />
      <Column
        dataField="TOTAL_DEBIT"
        caption={t("AMOUNT_DEBT_TOTAL", "Tổng Nợ")}
        width={150}
        alignment="right"
        format={getFormat("TOTAL_DEBIT", "#,##0")}
      />
      <Column
        dataField="TOTAL_CREDIT"
        caption={t("TOTAL_CREDIT", "Tổng Có")}
        width={150}
        alignment="right"
        format={getFormat("TOTAL_CREDIT", "#,##0")}
      />
      <Column
        dataField="DIFF_AMOUNT"
        caption={t("DIFF_CC", "Chênh lệch")}
        width={150}
        alignment="right"
        format={getFormat("DIFF_AMOUNT", "#,##0")}
      />
      <Column
        dataField="STATUS"
        caption={t("STATUS", "Trạng thái")}
        width={140}
        alignment="center"
        cellRender={({ data }: { data: OpeningBalanceSummaryModel }) => (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(data.STATUS)}`}>
            {getStatusText(data.STATUS, t)}
          </span>
        )}
      />
      <Column
        caption={t("ACTION", "Thao tác")}
        width={160}
        alignment="center"
        cellRender={({ data }: { data: OpeningBalanceSummaryModel }) => (
          <Button
            text={t("ViewDetails", "Xem chi tiết")}
            stylingMode="contained"
            type="default"
            onClick={() => onOpenDetail(data)}
          />
        )}
      />
    </>
  )
}
