import { formatPitMessage } from "./pitMessages";

export interface PitCertificateData {
    KHCTU: string;
    NLAP: string | null;
    TCCTU: number | null;
    LHCTLQUAN: number | null;
    KHMSCTCLQUAN: string;
    KHCTCLQUAN: string;
    SCTCLQUAN: string;
    NLCTCLQUAN: string | null;
    GCHU: string;
    TCTTNHAP_TEN: string;
    TCTTNHAP_MST: string;
    TCTTNHAP_DCHI: string;
    TCTTNHAP_SDTHOAI: string;
    NNT_TEN: string;
    NNT_MST: string;
    NNT_DCHI: string;
    NNT_QTICH: string;
    NNT_CNCTRU: number | null;
    NNT_CCCDAN: string;
    NNT_SDTHOAI: string;
    NNT_DCTDTU: string;
    NNT_GCHU: string;
    KTNHAP: number | null;
    TTHANG: number | null;
    DTHANG: number | null;
    NAM: number | null;
    BHIEM: number | null;
    TTHIEN: number | null;
    TTNCTHUE: number | null;
    TTNTTHUE: number | null;
    STHUE: number | null;
}
// QĐ 1233: all five amounts are required; these three must be whole đồng.
export const PIT_CERTIFICATE_MONEY_FIELDS = [
    { Key: "BHIEM", Label: "Bảo hiểm bắt buộc" },
    { Key: "TTHIEN", Label: "Từ thiện, nhân đạo, khuyến học" },
    { Key: "TTNCTHUE", Label: "Tổng thu nhập chịu thuế" },
    { Key: "TTNTTHUE", Label: "Tổng thu nhập tính thuế" },
    { Key: "STHUE", Label: "Số thuế TNCN đã khấu trừ" },
] as const;

export function pitCertificateMoneyError(key: string, value: unknown, t: (key: string, fallback: string) => string = (_key, fallback) => fallback): string | null {
    const field = PIT_CERTIFICATE_MONEY_FIELDS.find((item) => item.Key === key);
    if (!field) return null;
    const label = t(`PIT_CERT_FIELD_${field.Key}`, field.Label);
    if (value == null || value === "") return formatPitMessage(t("PIT_CERT_AMOUNT_REQUIRED", "Vui lòng nhập {0} (nhập 0 nếu không phát sinh)."), label);
    if (typeof value !== "number" || !Number.isFinite(value)) return formatPitMessage(t("PIT_CERT_AMOUNT_INVALID", "{0} phải là số hợp lệ."), label);
    if (["TTNCTHUE", "TTNTTHUE", "STHUE"].includes(key) && !Number.isInteger(value)) {
        return formatPitMessage(t("PIT_CERT_AMOUNT_INTEGER", "{0} phải làm tròn đến đồng, không có phần thập phân theo Quyết định 1233."), label);
    }
    return null;
}

export function createPitCertificate(): PitCertificateData {
    return {
        KHCTU: "",
        NLAP: null,
        TCCTU: null,
        LHCTLQUAN: null,
        KHMSCTCLQUAN: "",
        KHCTCLQUAN: "",
        SCTCLQUAN: "",
        NLCTCLQUAN: null,
        GCHU: "",
        TCTTNHAP_TEN: "",
        TCTTNHAP_MST: "",
        TCTTNHAP_DCHI: "",
        TCTTNHAP_SDTHOAI: "",
        NNT_TEN: "",
        NNT_MST: "",
        NNT_DCHI: "",
        NNT_QTICH: "",
        NNT_CNCTRU: 1,
        NNT_CCCDAN: "",
        NNT_SDTHOAI: "",
        NNT_DCTDTU: "",
        NNT_GCHU: "",
        KTNHAP: null,
        TTHANG: null,
        DTHANG: null,
        NAM: null,
        BHIEM: 0,
        TTHIEN: 0,
        TTNCTHUE: 0,
        TTNTTHUE: 0,
        STHUE: 0,
    };
}
