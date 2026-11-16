import type { PitSigningCertificate } from "./types";
export interface PitDeclarationData {
    HTHUC: number | null;
    TNNT: string;
    MST: string;
    CQTQLY: string;
    MCQTQLY: string;
    NLHE: string;
    DCLHE: string;
    DCTDTU: string;
    DTLHE: string;
    DDANH: string;
    NLAP: string | null;
    Certificates: PitSigningCertificate[];
}
export function createPitDeclaration(): PitDeclarationData {
    return {
        HTHUC: 1,
        TNNT: "",
        MST: "",
        CQTQLY: "",
        MCQTQLY: "",
        NLHE: "",
        DCLHE: "",
        DCTDTU: "",
        DTLHE: "",
        DDANH: "",
        NLAP: null,
        Certificates: [],
    };
}
