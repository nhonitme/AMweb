export type EInvoiceText = string | null | undefined

export interface EInvoiceRelatedInfoApi {
  RELATED_ID?: number | null
  INVOICE_ID?: number | null
  COMPANY_CD?: EInvoiceText
  TCHDON?: number | null
  IS_EXTERNAL?: number | null
  MSTCLQUAN?: EInvoiceText
  LHDCLQUAN?: number | null
  KHMSHDCLQUAN?: EInvoiceText
  KHHDCLQUAN?: EInvoiceText
  SHDCLQUAN?: EInvoiceText
  NLHDCLQUAN?: EInvoiceText
  LDDCTTHE?: number | null
  SBKCLQUAN?: EInvoiceText
  NBKCLQUAN?: EInvoiceText
  GCHU?: EInvoiceText
  CREATE_USER?: EInvoiceText
  CREATE_DT?: EInvoiceText
}

export interface EInvoiceRelatedInfo extends Required<Omit<EInvoiceRelatedInfoApi, "COMPANY_CD" | "CREATE_USER" | "CREATE_DT">> {
  COMPANY_CD: string
  CREATE_USER: string
  CREATE_DT: string
}

export interface EInvoiceBkeReasonApi {
  REASON_ID?: number | null
  BKE_ID?: number | null
  SORT_ORDER?: number | null
  LDO?: EInvoiceText
  CREATE_DT?: EInvoiceText
  ISDEL?: number | null
}

export interface EInvoiceBkeReason extends Required<Omit<EInvoiceBkeReasonApi, "CREATE_DT">> {
  CREATE_DT: string
}

export interface EInvoiceBkeDetailApi {
  DETAIL_ID?: number | null
  BKE_ID?: number | null
  STT?: number | null
  REF_INVOICE_ID?: number | null
  KHMSHDON?: EInvoiceText
  KHHDON?: EInvoiceText
  SHDON?: EInvoiceText
  THHDVGOC?: EInvoiceText
  SLGOC?: number | null
  DGGOC?: number | null
  THTGOC?: number | null
  TSGOC?: EInvoiceText
  TTGOC?: number | null
  TGTKGOC?: number | null
  TGTSTGOC?: number | null
  THHDVTDOI?: EInvoiceText
  SLTDOI?: number | null
  DGTDOI?: number | null
  THTTDOI?: number | null
  TSTDOI?: EInvoiceText
  TTTDOI?: number | null
  TGTTDOI?: number | null
  TGTSTTDOI?: number | null
  TGTCTCLECH?: number | null
  TGTTCLECH?: number | null
  TGTKCLECH?: number | null
  TGTTTCLECH?: number | null
  EXTRA_JSON?: EInvoiceText
  CREATE_DT?: EInvoiceText
  ISDEL?: number | null
}

export interface EInvoiceBkeDetail extends Required<Omit<EInvoiceBkeDetailApi, "CREATE_DT">> {
  ROW_KEY: string
  CREATE_DT: string
}

export interface EInvoiceBkeInfoApi {
  BKE_ID?: number | null
  COMPANY_CD?: EInvoiceText
  INVOICE_ID?: number | null
  SELLER_ID?: number | null
  PBAN?: EInvoiceText
  TBKE?: EInvoiceText
  KHMBKE?: EInvoiceText
  SBKE?: EInvoiceText
  NBKE?: EInvoiceText
  TCHDON?: number | null
  NBAN?: EInvoiceText
  MSTNBAN?: EInvoiceText
  DCNBAN?: EInvoiceText
  TCTCNHANG?: number | null
  NMUA?: EInvoiceText
  MSTNMUA?: EInvoiceText
  DCNMUA?: EInvoiceText
  TTKHAC_XML?: EInvoiceText
  SIGNED_XML?: EInvoiceText
  IS_SIGNED?: number | null
  NMUA_IS_SIGNED?: number | null
  CREATE_BY?: EInvoiceText
  CREATE_DT?: EInvoiceText
  UPDATE_BY?: EInvoiceText
  UPDATE_DT?: EInvoiceText
  ISDEL?: number | null
  REASONS?: EInvoiceBkeReasonApi[]
  DETAILS?: EInvoiceBkeDetailApi[]
}

export interface EInvoiceBkeInfo extends Required<Omit<EInvoiceBkeInfoApi, "COMPANY_CD" | "CREATE_BY" | "CREATE_DT" | "UPDATE_BY" | "UPDATE_DT" | "REASONS" | "DETAILS">> {
  COMPANY_CD: string
  CREATE_BY: string
  CREATE_DT: string
  UPDATE_BY: string
  UPDATE_DT: string
  REASONS: EInvoiceBkeReason[]
  DETAILS: EInvoiceBkeDetail[]
}

export interface EInvoicePxkInfoApi {
  PXK_ID?: number | null
  INVOICE_ID?: number | null
  PXK_TYPE?: EInvoiceText
  NBAN_DCHI?: EInvoiceText
  LDDNBO?: EInvoiceText
  HDKTSO?: EInvoiceText
  HDKTNGAY?: EInvoiceText
  HVTNXHANG?: EInvoiceText
  TNVCHUYEN?: EInvoiceText
  HDSO?: EInvoiceText
  PTVCHUYEN?: EInvoiceText
  EXTRA_JSON?: EInvoiceText
  CREATE_BY?: EInvoiceText
  CREATE_AT?: EInvoiceText
  UPDATE_BY?: EInvoiceText
  UPDATE_AT?: EInvoiceText
  ISDEL?: number | null
}

export interface EInvoicePxkInfo extends Required<Omit<EInvoicePxkInfoApi, "CREATE_BY" | "CREATE_AT" | "UPDATE_BY" | "UPDATE_AT">> {
  CREATE_BY: string
  CREATE_AT: string
  UPDATE_BY: string
  UPDATE_AT: string
}

export interface EInvoiceDetailSpecialInfoApi {
  SPECIAL_ID?: number | null
  INVOICE_ID?: number | null
  DETAIL_ID?: number | null
  COMPANY_CD?: EInvoiceText
  LHHDTRUNG?: number | null
  SKHUNG?: EInvoiceText
  SMAY?: EInvoiceText
  BKSPT_VCHUYEN?: EInvoiceText
  TNG_HANG?: EInvoiceText
  DCNG_HANG?: EInvoiceText
  MSTNG_HANG?: EInvoiceText
  MDDNG_HANG?: EInvoiceText
  /** Phụ lục XV extended tags (LTSan, TTTSan, XXu, DDi, DDen, THHVChuyen, TTTDat, ...). */
  EXTRA_JSON?: EInvoiceText
  CREATE_USER?: EInvoiceText
  CREATE_DT?: EInvoiceText
  UPDATE_USER?: EInvoiceText
  UPDATE_DT?: EInvoiceText
}

export interface EInvoiceDetailSpecialInfo extends Required<Omit<EInvoiceDetailSpecialInfoApi, "COMPANY_CD" | "CREATE_USER" | "CREATE_DT" | "UPDATE_USER" | "UPDATE_DT">> {
  COMPANY_CD: string
  CREATE_USER: string
  CREATE_DT: string
  UPDATE_USER: string
  UPDATE_DT: string
}

export interface EInvoiceDetailApi {
  DETAIL_ID?: number | null
  INVOICE_ID?: number | null
  COMPANY_CD?: EInvoiceText
  TCHAT?: number | null
  STT?: number | null
  MHHDVU?: EInvoiceText
  THHDVU?: EInvoiceText
  DVTINH?: EInvoiceText
  SLUONG?: number | null
  SLTHUCNHAP?: number | null
  DGIA?: number | null
  TLCKHAU?: number | null
  STCKHAU?: number | null
  THTIEN?: number | null
  TSUAT?: EInvoiceText
  TTHUE?: number | null
  TSAUTHUE?: number | null
  DGIA_VND?: number | null
  STCKHAU_VND?: number | null
  THTIEN_VND?: number | null
  TTHUE_VND?: number | null
  TSAUTHUE_VND?: number | null
  SPECIAL?: EInvoiceDetailSpecialInfoApi | null
  EXTRA_JSON?: EInvoiceText
  CREATE_AT?: EInvoiceText
  CREATE_BY?: EInvoiceText
  UPDATE_AT?: EInvoiceText
  UPDATE_BY?: EInvoiceText
  ISDEL?: number | null
}

export interface EInvoiceApi {
  INVOICE_ID?: number | null
  DOC_VERSION?: number | null
  COMPANY_CD?: EInvoiceText
  PBAN?: EInvoiceText
  THDON?: EInvoiceText
  KHMSHDON?: EInvoiceText
  KHHDON?: EInvoiceText
  SHDON?: EInvoiceText
  MHSO?: EInvoiceText
  NLAP?: EInvoiceText
  HDCTTCHINH?: number | null
  SBKE?: EInvoiceText
  NBKE?: EInvoiceText
  DVTTE?: EInvoiceText
  TGIA?: number | null
  HTTTOAN?: EInvoiceText
  MSTTCGP?: EInvoiceText
  TCHDON?: number | null
  SELLER_ID?: number | null
  XSL_ID?: number | null
  SELLER_NM?: EInvoiceText
  SELLER_TAX_CD?: EInvoiceText
  NMUA_TEN?: EInvoiceText
  NMUA_MST?: EInvoiceText
  NMUA_MDVQHNSACH?: EInvoiceText
  NMUA_DCHI?: EInvoiceText
  NMUA_MTINH?: EInvoiceText
  NMUA_TTINH?: EInvoiceText
  NMUA_MXA?: EInvoiceText
  NMUA_TXA?: EInvoiceText
  NMUA_MKHANG?: EInvoiceText
  NMUA_SDTHOAI?: EInvoiceText
  NMUA_CCCDAN?: EInvoiceText
  NMUA_SHCHIEU?: EInvoiceText
  NMUA_DCTDTU?: EInvoiceText
  NMUA_HVTNMHANG?: EInvoiceText
  NMUA_STKNHANG?: EInvoiceText
  NMUA_TNHANG?: EInvoiceText
  TGTCTHUE?: number | null
  TGTKCTHUE?: number | null
  TGTTTHUE?: number | null
  TTCKTMAI?: number | null
  CKTMAI_GCHU?: EInvoiceText
  TGTKHAC?: number | null
  TGTTTBSO?: number | null
  TGTTTBCHU?: EInvoiceText
  TGTCTHUE_VND?: number | null
  TGTKCTHUE_VND?: number | null
  TGTTTHUE_VND?: number | null
  TTCKTMAI_VND?: number | null
  TGTKHAC_VND?: number | null
  TGTTTBSO_VND?: number | null
  DLQRCODE?: EInvoiceText
  MCCQT?: EInvoiceText
  MTRACUU?: EInvoiceText
  XML_FTP_PATH?: EInvoiceText
  MTDIEP?: EInvoiceText
  MGDDTu?: EInvoiceText
  TAX_SUMMARY_JSON?: EInvoiceText
  FEE_JSON?: EInvoiceText
  EXTRA_JSON?: EInvoiceText
  IS_SIGNED?: number | null
  INVOICE_STATUS?: number | null
  MAIL_STATUS?: number | null
  SOURCE_INVOICE_ID?: number | null
  ERROR_MESSAGE?: EInvoiceText
  CREATE_BY?: EInvoiceText
  CREATE_AT?: EInvoiceText
  UPDATE_BY?: EInvoiceText
  UPDATE_AT?: EInvoiceText
  ISDEL?: number | null
  PXK_INFO?: EInvoicePxkInfoApi | null
  RELATED?: EInvoiceRelatedInfoApi | null
  BKE_INFO?: EInvoiceBkeInfoApi | null
  DETAILS?: EInvoiceDetailApi[]
}

export interface EInvoiceDetail extends Required<Omit<EInvoiceDetailApi, "COMPANY_CD" | "CREATE_AT" | "CREATE_BY" | "UPDATE_AT" | "UPDATE_BY" | "SPECIAL">> {
  ROW_KEY: string
  COMPANY_CD: string
  CREATE_AT: string
  CREATE_BY: string
  UPDATE_AT: string
  UPDATE_BY: string
  SPECIAL: EInvoiceDetailSpecialInfo | null
}

export interface EInvoice extends Required<Omit<EInvoiceApi, "COMPANY_CD" | "CREATE_AT" | "CREATE_BY" | "UPDATE_AT" | "UPDATE_BY" | "DETAILS" | "SELLER_NM" | "SELLER_TAX_CD" | "PXK_INFO" | "RELATED" | "BKE_INFO">> {
  COMPANY_CD: string
  CREATE_AT: string
  CREATE_BY: string
  UPDATE_AT: string
  UPDATE_BY: string
  SELLER_NM: string
  SELLER_TAX_CD: string
  PXK_INFO: EInvoicePxkInfo | null
  RELATED: EInvoiceRelatedInfo | null
  BKE_INFO: EInvoiceBkeInfo | null
  DETAILS: EInvoiceDetail[]
}

export interface EInvoiceSearchParams {
  cashRegister?: boolean
  invoiceId?: number
  fromYmd?: string
  toYmd?: string
  keyword?: string
  khhdon?: string
  khhdonOp?: string
  shdonFrom?: string
  shdonTo?: string
  nmuaTen?: string
  nmuaTenOp?: string
  nmuaMst?: string
  nmuaMstOp?: string
  invoiceStatus?: number
  cqtStatus?: number
  isSigned?: number
  tchdon?: number
  mailStatus?: number
  includeDetails?: boolean
  lang?: string
  pageNumber?: number
  pageSize?: number
}

export interface EInvoiceSigningPayload {
  INVOICE_ID: number
  RAW_XML: string
  /** XML bảng kê 01/BK-ĐCTT (chưa ký) khi HĐ TCHDon 3/4. */
  BKE_RAW_XML?: string | null
  REQUIRES_BKE?: boolean
  IS_SIGNED: boolean
}

export interface EInvoiceSignaturePayload {
  XML: string
  /** XML bảng kê đã ký (bắt buộc khi HĐ TCHDon 3/4). */
  BKE_XML?: string | null
  CERTIFICATE_SUBJECT?: string | null
  CERTIFICATE_THUMBPRINT?: string | null
  CERTIFICATE_SERIAL_NUMBER?: string | null
  SIGNED_AT?: string | null
}

export interface EInvoiceSellerSearchParams {
  khhdon?: string
  sellerId?: number
  keyword?: string
  includeInactive?: boolean
  includeAllTemplates?: boolean
}

export interface EInvoiceSeller {
  MCCQT?: string | null
  SELLER_ID: number
  COMPANY_CD: string
  SELLER_CD: string
  SELLER_NM: string
  SELLER_TAX_CD: string
  SELLER_ADDRESS: string
  MDDKDOANH?: EInvoiceText
  TDDKDOANH?: EInvoiceText
  DCDDKDOANH?: EInvoiceText
  THDON?: EInvoiceText
  KHMSHDON?: EInvoiceText
  KHHDON?: EInvoiceText
  FROM_SHDON?: EInvoiceText
  TO_SHDON?: EInvoiceText
  MCHANG?: EInvoiceText
  TCHANG?: EInvoiceText
  SDTHOAI?: EInvoiceText
  DCTDTU?: EInvoiceText
  STKNHANG?: EInvoiceText
  TNHANG?: EInvoiceText
  FAX?: EInvoiceText
  WEBSITE?: EInvoiceText
  LOGO_PATH?: EInvoiceText
  INVOICE_BACKGROUND_PATH?: EInvoiceText
  INVOICE_BORDER_PATH?: EInvoiceText
  BACKGROUND_PATH?: EInvoiceText
  USE_MULTI_TAX_RATE?: number
  XSL_ID?: number
  XSL_TEMPLATE_NM?: EInvoiceText
  HAS_XSL_TEMPLATE?: number
  VERSION_NO?: number
  XSL_IS_DEFAULT?: number
  XSL_IS_ACTIVE?: number
  CREATE_BY?: EInvoiceText
  CREATE_AT?: EInvoiceText
  UPDATE_BY?: EInvoiceText
  UPDATE_AT?: EInvoiceText
}
