import { useCallback, useContext, useEffect, useState } from "react"
import { Popup } from "devextreme-react/popup"
import Button from "devextreme-react/button"
import DataGrid, { Column, Selection } from "devextreme-react/data-grid"
import TextBox from "devextreme-react/text-box"
import NumberBox from "devextreme-react/number-box"
import SelectBox from "devextreme-react/select-box"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"
import { getApiErrorMessage } from "@/api/apiTypes"
import {
  deleteAiPostingRule,
  getAiPostingRuleDetail,
  getAiPostingRules,
  saveAiPostingRule,
  type AiPostingRuleDetail,
  type AiPostingRuleListItem,
} from "@/api/aiSystemApi"
import { createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions"
import { LanguageContext } from "@/lib/i18nLoader"

type Props = {
  visible: boolean
  onClose: () => void
}

function emptyRule(): AiPostingRuleDetail {
  return {
    ruleId: 0,
    ruleCd: "",
    ruleNm: "",
    ruleScope: "PURCHASE",
    ruleLevel: "LINE",
    businessType: "SERVICE",
    priority: 10,
    confidenceMin: 90,
    processInventoryFlag: "0",
    needAssetProfileFlag: "0",
    note: "",
    isDefault: false,
    conditions: [
      {
        fieldNm: "ITEM_NM",
        operator: "CONTAINS",
        value1: "",
        requiredYn: "1",
        score: 100,
        sort: 1,
      },
    ],
    actions: [
      {
        actionType: "GOODS",
        debitAccCd: "",
        creditAccCd: "",
        sort: 1,
      },
    ],
  }
}

export default function AiPostingRulePopup({ visible, onClose }: Props) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [list, setList] = useState<AiPostingRuleListItem[]>([])
  const [detail, setDetail] = useState<AiPostingRuleDetail>(emptyRule())

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await getAiPostingRules()
      setList(rows)
    } catch (error) {
      notify(getApiErrorMessage(error, "Không tải được quy tắc AI."), "error", 4500)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    setDetail(emptyRule())
    void loadList()
  }, [visible, loadList])

  const openDetail = async (ruleId: number) => {
    try {
      const next = await getAiPostingRuleDetail(ruleId)
      setDetail(next)
    } catch (error) {
      notify(getApiErrorMessage(error, "Không tải chi tiết quy tắc."), "error", 4500)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const saved = await saveAiPostingRule(detail)
      setDetail(saved)
      await loadList()
      notify(t("SAVE_SUCCESS", "Đã lưu quy tắc AI."), "success", 3000)
    } catch (error) {
      notify(getApiErrorMessage(error, "Lưu quy tắc thất bại."), "error", 4500)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!detail.ruleId) return
    const ok = await confirm(
      t("CONFIRM_DELETE", "Xóa quy tắc này?"),
      t("CONFIRM", "Xác nhận"),
    )
    if (!ok) return
    try {
      await deleteAiPostingRule(detail.ruleId)
      setDetail(emptyRule())
      await loadList()
      notify(t("DELETE_SUCCESS", "Đã xóa quy tắc."), "success", 3000)
    } catch (error) {
      notify(getApiErrorMessage(error, "Xóa quy tắc thất bại."), "error", 4500)
    }
  }

  const condition = detail.conditions[0] ?? emptyRule().conditions[0]
  const action = detail.actions[0] ?? emptyRule().actions[0]

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      dragEnabled
      showCloseButton
      title={t("frmAiPostingRule", "Quy tắc AI")}
      width="min(960px, 96vw)"
      height="min(720px, 92vh)"
    >
      <div className="flex h-full min-h-0 flex-col gap-3 p-1">
        <div className="flex flex-wrap gap-2">
          <Button
            icon="plus"
            text={t("btnAdd", "Thêm")}
            stylingMode="outlined"
            onClick={() => setDetail(emptyRule())}
          />
          <Button
            icon="save"
            type="default"
            text={saving ? t("SAVING", "Đang lưu...") : t("dxDataGrid-editingSaveRowChanges", "Lưu")}
            disabled={saving || loading}
            onClick={() => void handleSave()}
          />
          <Button
            icon="trash"
            text={t("btndelete", "Xóa")}
            stylingMode="outlined"
            disabled={!detail.ruleId || saving}
            onClick={() => void handleDelete()}
          />
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <div className="min-h-0 overflow-hidden rounded-lg border border-slate-200">
            <DataGrid
              dataSource={list}
              keyExpr="ruleId"
              height="100%"
              showBorders
              hoverStateEnabled
              onRowClick={(e) => {
                const id = Number(e.data?.ruleId ?? 0)
                if (id > 0) void openDetail(id)
              }}
            >
              <Selection mode="single" />
              <Column dataField="ruleCd" caption={t("lblRuleCd", "Mã")} width={110} />
              <Column dataField="ruleNm" caption={t("lblRuleNm", "Tên")} />
              <Column dataField="ruleScope" caption={t("lblRuleScope", "Phạm vi")} width={110} />
              <Column dataField="priority" caption={t("PRIORITY", "Ưu tiên")} width={80} />
            </DataGrid>
          </div>

          <div className="space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">
                {t("lblRuleCd", "Mã quy tắc")}
                <TextBox
                  value={detail.ruleCd}
                  onValueChanged={(e) => setDetail((prev) => ({ ...prev, ruleCd: String(e.value ?? "") }))}
                  {...createOutlinedEditorOptions()}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                {t("lblRuleNm", "Tên quy tắc")}
                <TextBox
                  value={detail.ruleNm}
                  onValueChanged={(e) => setDetail((prev) => ({ ...prev, ruleNm: String(e.value ?? "") }))}
                  {...createOutlinedEditorOptions()}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                {t("lblRuleScope", "Phạm vi")}
                <SelectBox
                  items={[
                    { text: "PURCHASE", value: "PURCHASE" },
                    { text: "SALES", value: "SALES" },
                  ]}
                  displayExpr="text"
                  valueExpr="value"
                  value={detail.ruleScope}
                  onValueChanged={(e) => setDetail((prev) => ({ ...prev, ruleScope: String(e.value ?? "PURCHASE") }))}
                  {...createOutlinedEditorOptions()}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                {t("PRIORITY", "Ưu tiên")}
                <NumberBox
                  value={detail.priority}
                  onValueChanged={(e) => setDetail((prev) => ({ ...prev, priority: Number(e.value ?? 0) }))}
                  {...createOutlinedEditorOptions()}
                />
              </label>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("AI_RULE_CONDITION", "Điều kiện (MVP 1 dòng)")}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <TextBox
                  value={condition.fieldNm}
                  onValueChanged={(e) =>
                    setDetail((prev) => ({
                      ...prev,
                      conditions: [{ ...condition, fieldNm: String(e.value ?? "") }],
                    }))
                  }
                  {...createOutlinedEditorOptions({ placeholder: "FIELD_NM" })}
                />
                <TextBox
                  value={condition.operator}
                  onValueChanged={(e) =>
                    setDetail((prev) => ({
                      ...prev,
                      conditions: [{ ...condition, operator: String(e.value ?? "") }],
                    }))
                  }
                  {...createOutlinedEditorOptions({ placeholder: "OPERATOR" })}
                />
                <TextBox
                  className="sm:col-span-2"
                  value={condition.value1 ?? ""}
                  onValueChanged={(e) =>
                    setDetail((prev) => ({
                      ...prev,
                      conditions: [{ ...condition, value1: String(e.value ?? "") }],
                    }))
                  }
                  {...createOutlinedEditorOptions({ placeholder: "VALUE1" })}
                />
              </div>
            </div>

            <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("AI_RULE_ACTION", "TK Nợ / TK Có")}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <TextBox
                  value={action.debitAccCd ?? ""}
                  onValueChanged={(e) =>
                    setDetail((prev) => ({
                      ...prev,
                      actions: [{ ...action, debitAccCd: String(e.value ?? "") }],
                    }))
                  }
                  {...createOutlinedEditorOptions({ placeholder: "DEBIT" })}
                />
                <TextBox
                  value={action.creditAccCd ?? ""}
                  onValueChanged={(e) =>
                    setDetail((prev) => ({
                      ...prev,
                      actions: [{ ...action, creditAccCd: String(e.value ?? "") }],
                    }))
                  }
                  {...createOutlinedEditorOptions({ placeholder: "CREDIT" })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Popup>
  )
}
