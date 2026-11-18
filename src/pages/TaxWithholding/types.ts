import type { PitFieldKey } from "./pitDocumentModel";
import type { PitCertificateData } from "./pitCertificateModel";
import type { PitDeclarationData } from "./pitDeclarationModel";
import type { PitErrorNoticeData } from "./pitErrorNoticeModel";
export type PitKind = "declaration" | "certificate" | "error-notice";
export interface PitSigningCertificate {
    TTCHUC: string;
    SERI: string;
    TNGAY: string;
    DNGAY: string;
    HTHUC: number;
}
export interface PitNoticeItem {
    REF_CTU_ID?: number;
    KHMSCTU: string;
    KHCTU: string;
    SCTU: string;
    NLAP: string;
    LCTDT: string;
    LDO: string;
}
export interface PitDocumentInfo {
    DOCUMENT_ID: number;
    KIND: PitKind;
    DOC_VERSION: number;
    DOC_DATE?: string | null;
    TAX_CD: string;
    DISPLAY_NAME: string;
    SERIES?: string | null;
    XSL_ID?: number | null;
    DOC_NO?: number | null;
    MTRACUU?: string | null;
    IS_SIGNED: number;
    CQT_STATUS: number;
    ERROR_MESSAGE?: string | null;
    MTDIEP?: string | null;
    MGDDTU?: string | null;
    QUEUED: number;
    RAW_XML?: string | null;
    SIGNED_XML?: string | null;
    RESPONSE_XML?: string | null;
}
export interface PitDocument extends PitDocumentInfo, Partial<PitCertificateData>, Partial<PitDeclarationData>, Partial<PitErrorNoticeData> {
}
export type PitCertificateDocument = PitDocumentInfo & PitCertificateData;
export type PitDeclarationDocument = PitDocumentInfo & PitDeclarationData;
export type PitErrorNoticeDocument = PitDocumentInfo & PitErrorNoticeData;
export interface PitSearchParams {
    fromYmd?: string;
    toYmd?: string;
    keyword?: string;
    signed?: number;
    cqtStatus?: number;
    pageNumber?: number;
    pageSize?: number;
}
export interface PitTransmissionMessage {
    RECEIVE_ID: number;
    MLTDIEP: string;
    MLTDIEP_NAME?: string;
    MTDIEP?: string;
    MTDTCHIEU?: string;
    MST?: string;
    ERROR_MESSAGE?: string;
    CREATE_AT: string;
    RESPONSE_XML: string;
}
export interface PitFormField {
    Key: PitFieldKey;
    Label: string;
    Type?: string;
    Required?: boolean;
    MaxLength?: number;
    Options?: {
        Value: string;
        Label: string;
    }[];
    Default?: string;
}
export const pitStatus = (row: PitDocument) => !row.IS_SIGNED ? "Chưa ký" : row.CQT_STATUS === 2 ? "CQT chấp nhận" : row.CQT_STATUS === 3 ? "CQT không chấp nhận" : row.QUEUED ? "Đã ký · Chờ phản hồi" : "Đã ký · Chờ gửi";
