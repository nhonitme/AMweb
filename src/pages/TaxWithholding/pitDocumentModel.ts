import { createPitCertificate, type PitCertificateData } from "./pitCertificateModel";
import { createPitDeclaration, type PitDeclarationData } from "./pitDeclarationModel";
import { createPitErrorNotice, type PitErrorNoticeData } from "./pitErrorNoticeModel";
import type { PitDocument, PitKind } from "./types";
export type PitFieldKey = Exclude<keyof PitCertificateData | keyof PitDeclarationData | keyof PitErrorNoticeData, "Certificates" | "Items">;
export const PIT_DOCUMENT_INFO = {
    "declaration": { Title: "Tờ khai đăng ký sử dụng chứng từ khấu trừ TNCN", Form: "01/ĐKTĐ-CTĐT" },
    "certificate": { Title: "Chứng từ khấu trừ thuế thu nhập cá nhân", Form: "03/TNCN" },
    "error-notice": { Title: "Thông báo chứng từ điện tử đã lập sai", Form: "04/SS-CTĐT" },
} as const;
export function createPitDocument(kind: PitKind): PitDocument {
    const data = kind === "certificate" ? createPitCertificate()
        : kind === "declaration" ? createPitDeclaration() : createPitErrorNotice();
    return { DOCUMENT_ID: 0, KIND: kind, DOC_VERSION: 0, DOC_DATE: null, TAX_CD: "", DISPLAY_NAME: "", IS_SIGNED: 0, CQT_STATUS: 0, QUEUED: 0, ...data };
}

export const PIT_COPY_EXCLUDE_FIELDS = [
    "DOCUMENT_ID",
    "DOC_VERSION",
    "IS_SIGNED",
    "CQT_STATUS",
    "QUEUED",
    "SERIES",
    "DOC_NO",
    "MTRACUU",
    "ERROR_MESSAGE",
    "MTDIEP",
    "MGDDTU",
    "RAW_XML",
    "SIGNED_XML",
    "RESPONSE_XML",
    "Certificates",
    "Items",
] as const;

function todayYmd(): string {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function createPitDocumentCopy(source: PitDocument): PitDocument {
    const copy = structuredClone(source);
    const today = todayYmd();
    copy.DOCUMENT_ID = 0;
    copy.DOC_VERSION = 0;
    copy.IS_SIGNED = 0;
    copy.CQT_STATUS = 0;
    copy.QUEUED = 0;
    copy.DOC_DATE = today;
    copy.SERIES = null;
    copy.DOC_NO = null;
    copy.MTRACUU = null;
    copy.ERROR_MESSAGE = null;
    copy.MTDIEP = null;
    copy.MGDDTU = null;
    copy.RAW_XML = null;
    copy.SIGNED_XML = null;
    copy.RESPONSE_XML = null;
    if (copy.KIND === "declaration") {
        copy.NLAP = today;
    }
    if (copy.KIND === "certificate") {
        copy.NLAP = null;
    }
    if (copy.KIND === "error-notice") {
        copy.NTBAO = today;
    }
    if (copy.Certificates?.length) {
        copy.Certificates = copy.Certificates.map((certificate) => ({ ...certificate }));
    }
    if (copy.Items?.length) {
        copy.Items = copy.Items.map((item) => ({ ...item }));
    }
    return copy;
}

export function pitDate(value: string | Date | null | undefined): string | null {
    if (!value)
        return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime()))
            return null;
        return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    }
    return value.slice(0, 10);
}
