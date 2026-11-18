import type { Dispatch, SetStateAction } from "react";
import Button from "devextreme-react/button";
import DateBox from "devextreme-react/date-box";
import { createDateBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions";
import { EInvoiceEditorSection } from "@/pages/EInvoice/components/EInvoiceEditorShell";
import { pitDate } from "../pitDocumentModel";
import type { PitDocument } from "../types";
const dateBoxOptions = createDateBoxEditorOptions({
    dateSerializationFormat: "yyyy-MM-dd",
    openOnFieldClick: true,
});
type Translate = (key: string, fallback: string) => string;
type Props = {
    data: PitDocument;
    setData: Dispatch<SetStateAction<PitDocument>>;
    readOnly: boolean;
    busy: boolean;
    t: Translate;
    addExisting: () => void;
};
export default function PitErrorNoticeItems({ data, setData, readOnly, busy, t, addExisting }: Props) {
    return (<EInvoiceEditorSection title={t("PIT_ERR_SECTION_TITLE", "Danh sách chứng từ đã lập sai")}>
              {!readOnly && (<div className="pit-actions">
                  <Button icon="plus" text={t("ADD", "Thêm")} stylingMode="outlined" hint={t("PIT_ERR_ADD_EXISTING", "Thêm chứng từ")} disabled={busy} onClick={addExisting}/>
                </div>)}
              <div className="pit-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("FORM_NO", "Mẫu số")} *</th>
                      <th>{t("SERIES", "Ký hiệu")} *</th>
                      <th>{t("NO", "Số")} *</th>
                      <th>{t("DOC_DATE", "Ngày")} *</th>
                      <th>{t("PIT_ERR_COL_TYPE", "Loại chứng từ")} *</th>
                      <th>{t("REASON", "Lý do")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(data.Items ?? []).map((item, i) => (<tr key={i}>
                        {(["KHMSCTU", "KHCTU", "SCTU", "NLAP"] as const).map((key) => (<td key={key}>
                            {key === "NLAP" ? <DateBox
                              {...dateBoxOptions}
                              inputAttr={{ "aria-label": t("DOC_DATE", "Ngày lập"), "aria-required": "true" }}
                              value={item.NLAP || null}
                              disabled={readOnly || busy || Boolean(item.REF_CTU_ID)}
                              onValueChanged={(event) => setData((current) => ({
                                ...current,
                                Items: (current.Items ?? []).map((c, j) => i === j ? { ...c, NLAP: pitDate(event.value) ?? "" } : c),
                              }))}
                            /> : <input aria-label={key} maxLength={key === "KHMSCTU" ? 10 : key === "KHCTU" ? 9 : 8} required disabled={readOnly || busy || Boolean(item.REF_CTU_ID)} type="text" value={item[key]} onChange={(e) => setData((current) => ({
                    ...current,
                    Items: (current.Items ?? []).map((c, j) => i === j ? { ...c, [key]: e.target.value } : c),
                }))}/>}
                          </td>))}
                        <td>
                          <select disabled={readOnly || busy || Boolean(item.REF_CTU_ID)} value={item.LCTDT} onChange={(e) => setData((current) => ({
                ...current,
                Items: (current.Items ?? []).map((c, j) => i === j ? { ...c, LCTDT: e.target.value } : c),
            }))}>
                            <option value="1">{t("PIT_LCTDT_ND_70", "Theo NĐ 70")}</option>
                            <option value="2">{t("PIT_LCTDT_RECEIPT_ND_254", "Biên lai theo NĐ 254 / NĐ 347")}</option>
                            <option value="3">{t("PIT_LCTDT_RECEIPT_NO_DENOMINATION", "Biên lai không in sẵn mệnh giá theo NĐ 70")}</option>
                            <option value="4">{t("PIT_LCTDT_RECEIPT_DENOMINATION", "Biên lai in sẵn mệnh giá theo NĐ 70")}</option>
                            <option value="6">{t("PIT_LCTDT_RECEIPT_LEGACY", "Biên lai theo TT 303 / NĐ 51")}</option>
                            <option value="7">{t("PIT_LCTDT_ND_123", "Theo NĐ 123")}</option>
                            <option value="8">{t("PIT_LCTDT_ND_254", "Theo NĐ 254")}</option>
                            <option value="CTT50">{t("PIT_LCTDT_CTT50", "Chứng từ CTT50")}</option>
                          </select>
                        </td>
                        <td>
                          <input aria-label={t("REASON", "Lý do")} disabled={readOnly || busy} maxLength={255} value={item.LDO} onChange={(e) => setData((current) => ({
                ...current,
                Items: (current.Items ?? []).map((c, j) => i === j ? { ...c, LDO: e.target.value } : c),
            }))}/>
                        </td>
                        <td>
                          {!readOnly && (<button type="button" disabled={busy} onClick={() => setData((current) => ({
                    ...current,
                    Items: (current.Items ?? []).filter((_, j) => j !== i),
                }))}>
                              {t("DELETE", "Xóa")}
                            </button>)}
                        </td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
            </EInvoiceEditorSection>);
}
