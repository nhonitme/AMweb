import type { PitNoticeItem } from "./types";
export interface PitErrorNoticeData {
    LOAI: number | null;
    SO: string;
    NTBCCQT: string | null;
    MCQT: string;
    TCQT: string;
    TNNT: string;
    MST: string;
    MDVQHNSACH: string;
    DDANH: string;
    NTBAO: string | null;
    Items: PitNoticeItem[];
}
export function createPitErrorNotice(): PitErrorNoticeData {
    return {
        LOAI: 1,
        SO: "",
        NTBCCQT: null,
        MCQT: "",
        TCQT: "",
        TNNT: "",
        MST: "",
        MDVQHNSACH: "",
        DDANH: "",
        NTBAO: null,
        Items: [],
    };
}
