export interface Product {
    PRODUCT_ID: number
    PRODUCT_CD: string
    COMPANY_CD: string,
    PRODUCT_NM_VIET: string,
    PRODUCT_NM_ENG: string,
    PRODUCT_NM_KOR: string,
    PRODUCT_NM_CHINA: string,
    PRODUCT_KIND_ID?: number | null,
    PRODUCT_KIND_CD?: string | null,
    PRODUCTKIND_NM_VIET?: string | null,
    UNIT_ID?: number | null,
    UNIT_CD?: string | null,
    UNIT_NM?: string | null,
    STORE_ID?: number | null,
    STORE_CD?: string | null,
    STORE_KIND_CD?: string | null,
    STORE_NM_VIET?: string | null,
    DIVISION?: string | null,
    SUMMARY?: string | null,
};
