import type { Dispatch, SetStateAction } from "react";
import Button from "devextreme-react/button";
import { EInvoiceEditorSection } from "@/pages/EInvoice/components/EInvoiceEditorShell";
import type { PitDocument } from "../types";
import type { EInvoicePluginCertificate } from "@/api/einvoiceSigningPluginApi";
type Translate = (key: string, fallback: string) => string;
import type { DeclarationMethodOption } from "@/pages/EInvoice/einvoiceDeclarationModel";
type Props = {
    data: PitDocument;
    setData: Dispatch<SetStateAction<PitDocument>>;
    readOnly: boolean;
    busy: boolean;
    t: Translate;
    onPickCertificate: (callback: (cert: EInvoicePluginCertificate) => void) => void;
    certificateMethodOptions: DeclarationMethodOption[];
};
export default function PitDeclarationCertificates({ data, setData, readOnly, busy, t, onPickCertificate, certificateMethodOptions }: Props) {
    return (<EInvoiceEditorSection title={t("DECL_CTS_SECTION", "Digital certificates (CTS)")}
              headerAction={!readOnly && (<Button icon="plus" stylingMode="outlined" text={t("ADD", "Thêm")} hint={t("DECL_CTS_FROM_PLUGIN", "Load certificate from signing plugin")} disabled={busy} onClick={() => onPickCertificate((cert) => setData((current) => ({
                ...current,
                Certificates: [
                    ...(current.Certificates ?? []),
                    {
                        TTCHUC: cert.issuer,
                        SERI: cert.serialNumber,
                        TNGAY: cert.notBefore,
                        DNGAY: cert.notAfter,
                        HTHUC: 1,
                    },
                ],
            })))}/>)}>
              <div className="pit-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("TTCHUC", "Certificate organization")} *</th>
                      <th>{t("SERI", "Serial")} *</th>
                      <th>{t("CERT_VALID_FROM", "Valid from")} *</th>
                      <th>{t("CERT_EXPIRES", "Expires")} *</th>
                      <th>{t("CTS_HTHUC", "CTS method")} *</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(data.Certificates ?? []).map((cert, i) => (<tr key={i}>
                        {(["TTCHUC", "SERI", "TNGAY", "DNGAY"] as const).map((key) => (<td key={key}>
                            <input aria-label={key} maxLength={key === "TTCHUC" ? 400 : key === "SERI" ? 40 : undefined} required readOnly disabled={busy} type={key === "TNGAY" || key === "DNGAY" ? "datetime-local" : "text"} value={key === "TNGAY" || key === "DNGAY" ? cert[key].slice(0, 19) : cert[key]}/>
                          </td>))}
                        <td>
                          <select disabled={readOnly || busy} value={cert.HTHUC} onChange={(e) => setData((current) => ({
                ...current,
                Certificates: (current.Certificates ?? []).map((c, j) => i === j ? { ...c, HTHUC: Number(e.target.value) } : c),
            }))}>
                            {certificateMethodOptions.map((option) => (<option key={option.value} value={option.value}>{option.text}</option>))}
                          </select>
                        </td>
                        <td>
                          {!readOnly && (<Button icon="trash" stylingMode="text" hint={t("DELETE", "Xóa")} disabled={busy} onClick={() => setData((current) => ({
                    ...current,
                    Certificates: (current.Certificates ?? []).filter((_, j) => j !== i),
                }))} />)}
                        </td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
            </EInvoiceEditorSection>);
}
