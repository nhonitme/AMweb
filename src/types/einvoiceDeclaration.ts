export type EInvoiceDeclarationText = string | null | undefined

export interface EInvoiceDeclarationDetailApi {
  DETAIL_ID?: number | null
  TKHAI_ID?: number | null
  COMPANY_CD?: EInvoiceDeclarationText
  DETAIL_TYPE?: EInvoiceDeclarationText
  STT?: number | null
  TTCHUC?: EInvoiceDeclarationText
  SERI?: EInvoiceDeclarationText
  CTS_HTHUC?: number | null
  TTCGP?: EInvoiceDeclarationText
  MSTTCGP?: EInvoiceDeclarationText
  TTCTN?: EInvoiceDeclarationText
  MSTTCTN?: EInvoiceDeclarationText
  TDVHTPT?: EInvoiceDeclarationText
  MSTDVHTPT?: EInvoiceDeclarationText
  TDVI?: EInvoiceDeclarationText
  MSTDUQ?: EInvoiceDeclarationText
  HDBRMVAO?: number | null
  TDLHDTNGAY?: EInvoiceDeclarationText
  TDLHDDNGAY?: EInvoiceDeclarationText
  TGUQTNGAY?: EInvoiceDeclarationText
  TGUQDNGAY?: EInvoiceDeclarationText
  TLHDON?: EInvoiceDeclarationText
  KHMSHDON?: number | null
  KHHDON?: EInvoiceDeclarationText
  TENDKTH?: EInvoiceDeclarationText
  MSTDKTH?: EInvoiceDeclarationText
  MDICH?: EInvoiceDeclarationText
  TNGAY?: EInvoiceDeclarationText
  DNGAY?: EInvoiceDeclarationText
  GCHU?: EInvoiceDeclarationText
  RAW_DETAIL_XML?: EInvoiceDeclarationText
  CREATE_BY?: EInvoiceDeclarationText
  CREATE_AT?: EInvoiceDeclarationText
  UPDATE_BY?: EInvoiceDeclarationText
  UPDATE_AT?: EInvoiceDeclarationText
  ISDEL?: number | null
}

export interface EInvoiceDeclarationApi {
  TKHAI_ID?: number | null
  COMPANY_CD?: EInvoiceDeclarationText
  PBAN?: EInvoiceDeclarationText
  MSO?: EInvoiceDeclarationText
  TEN?: EInvoiceDeclarationText
  HTHUC?: number | null
  TNNT?: EInvoiceDeclarationText
  MST?: EInvoiceDeclarationText
  CQTQLY?: EInvoiceDeclarationText
  MCQTQLY?: EInvoiceDeclarationText
  TNDDPLUAT?: EInvoiceDeclarationText
  DTDDPLUAT?: EInvoiceDeclarationText
  CCCDAN?: EInvoiceDeclarationText
  SHCHIEU?: EInvoiceDeclarationText
  MQTNDDPLUAT?: EInvoiceDeclarationText
  QTICH?: EInvoiceDeclarationText
  NSDDPLUAT?: EInvoiceDeclarationText
  GTINH?: number | null
  DCLHE?: EInvoiceDeclarationText
  DCTDTU?: EInvoiceDeclarationText
  NLHE?: EInvoiceDeclarationText
  DTLHE?: EInvoiceDeclarationText
  DDANH?: EInvoiceDeclarationText
  NLAP?: EInvoiceDeclarationText
  CMA?: number | null
  CMTMTTIEN?: number | null
  KCMTMTTIEN?: number | null
  KCMA?: number | null
  NNTDBKKHAN?: number | null
  NNTKTDNUBND?: number | null
  CQXLTSCONG?: number | null
  CDLTTDCQT?: number | null
  CDLQTCTN?: number | null
  TCNNGOAI?: number | null
  CDDU?: number | null
  CDLTHDTHU?: number | null
  CBTHOP?: number | null
  CTTCTGDICH?: number | null
  HDGTGT?: number | null
  HDGTGTTHBLAI?: number | null
  HDBHANG?: number | null
  HDBHTHBLAI?: number | null
  HDTMAI?: number | null
  HDNCCNNGOAI?: number | null
  HDBTSCONG?: number | null
  HDBHDTQGIA?: number | null
  HDKHAC?: number | null
  CTU?: number | null
  MGDDTU?: EInvoiceDeclarationText
  MTDIEP?: EInvoiceDeclarationText
  XML?: EInvoiceDeclarationText
  IS_SIGNED?: number | null
  CQT_STATUS?: number | null
  MCCQT?: string | null
  ERROR_MESSAGE?: EInvoiceDeclarationText
  CREATE_BY?: EInvoiceDeclarationText
  CREATE_AT?: EInvoiceDeclarationText
  UPDATE_BY?: EInvoiceDeclarationText
  UPDATE_AT?: EInvoiceDeclarationText
  ISDEL?: number | null
  DETAILS?: EInvoiceDeclarationDetailApi[]
}

export type EInvoiceDeclarationDetailType =
  | "CTS"
  | "TCGP"
  | "TCTN"
  | "DVHTPT"
  | "DVDUQTCUU"
  | "TNSDUNG"
  | "DKTH"

export interface EInvoiceDeclarationDetail extends Required<Omit<EInvoiceDeclarationDetailApi, "COMPANY_CD" | "CREATE_AT" | "CREATE_BY" | "UPDATE_AT" | "UPDATE_BY" | "DETAIL_TYPE">> {
  ROW_KEY: string
  COMPANY_CD: string
  DETAIL_TYPE: EInvoiceDeclarationDetailType
  CREATE_AT: string
  CREATE_BY: string
  UPDATE_AT: string
  UPDATE_BY: string
}

export interface EInvoiceDeclaration extends Required<Omit<EInvoiceDeclarationApi, "COMPANY_CD" | "CREATE_AT" | "CREATE_BY" | "UPDATE_AT" | "UPDATE_BY" | "DETAILS" | "IS_SIGNED" | "GTINH">> {
  COMPANY_CD: string
  CREATE_AT: string
  CREATE_BY: string
  UPDATE_AT: string
  UPDATE_BY: string
  IS_SIGNED: number
  GTINH: number | null
  DETAILS: EInvoiceDeclarationDetail[]
}

export interface EInvoiceDeclarationSearchParams {
  tkhaiId?: number
  fromYmd?: string
  toYmd?: string
  keyword?: string
  isSigned?: number
  includeDetails?: boolean
}

export interface EInvoiceDeclarationSigningPayload {
  TKHAI_ID: number
  RAW_XML: string
  IS_SIGNED: boolean
}

export interface EInvoiceDeclarationSignaturePayload {
  XML: string
  CERTIFICATE_SUBJECT?: string | null
  CERTIFICATE_THUMBPRINT?: string | null
  CERTIFICATE_SERIAL_NUMBER?: string | null
  SIGNED_AT?: string | null
}

export interface EInvoiceDeclarationTransmissionMessage {
  RECEIVE_ID: number
  COMPANY_CD?: EInvoiceDeclarationText
  PBAN?: EInvoiceDeclarationText
  MNGUI?: EInvoiceDeclarationText
  MNNHAN?: EInvoiceDeclarationText
  MLTDIEP?: EInvoiceDeclarationText
  MLTDIEP_NAME?: EInvoiceDeclarationText
  MTDIEP?: EInvoiceDeclarationText
  MTDTCHIEU?: EInvoiceDeclarationText
  MTRA_CUU?: EInvoiceDeclarationText
  MST?: EInvoiceDeclarationText
  SLUONG?: number | null
  RESPONSE_XML?: EInvoiceDeclarationText
  ERROR_MESSAGE?: EInvoiceDeclarationText
  CREATE_USER?: EInvoiceDeclarationText
  CREATE_DT?: EInvoiceDeclarationText
}
