export const numberFields = new Set<string>([
  "HDCTTCHINH",
  "TGIA",
  "TGTCTHUE",
  "TGTKCTHUE",
  "TGTTTHUE",
  "TTCKTMAI",
  "TGTKHAC",
  "TGTTTBSO",
  "TGTCTHUE_VND",
  "TGTKCTHUE_VND",
  "TGTTTHUE_VND",
  "TTCKTMAI_VND",
  "TGTKHAC_VND",
  "TGTTTBSO_VND",
])

/** Header totals derived from detail lines when commercial discount uses TCHAT=3 rows. */
export const autoCalculatedHeaderTotalFields = new Set<string>([
  "TTCKTMAI",
  "TTCKTMAI_VND",
])

/** Header commercial discount fields blocked when detail lines use TCHAT=3. */
export const headerCommercialDiscountBlockedFields = new Set<string>([
  ...autoCalculatedHeaderTotalFields,
  "CKTMAI_GCHU",
])

export const manualTotalFields = new Set<string>([
  "TGTCTHUE",
  "TGTKCTHUE",
  "TGTTTHUE",
  "TTCKTMAI",
  "CKTMAI_GCHU",
  "TGTKHAC",
  "TGTTTBSO",
  "TGTCTHUE_VND",
  "TGTKCTHUE_VND",
  "TGTTTHUE_VND",
  "TTCKTMAI_VND",
  "TGTKHAC_VND",
  "TGTTTBSO_VND",
  "TGTTTBCHU",
])

export const dateFields = new Set<string>(["NLAP", "NBKE"])
export const DEFAULT_TCHAT = 1
export const SPECIAL_TCHAT = 5
export const DETAIL_GRID_FIRST_EDIT_FIELD = "TCHAT"
export const DETAIL_LIVE_INPUT_FIELDS = new Set<string>(["SLUONG", "SLTHUCNHAP", "DGIA", "TLCKHAU", "STCKHAU", "THTIEN", "TTHUE", "TSAUTHUE", "AFTER_TAX_UNIT_PRICE"])
export const DETAIL_LOOKUP_FIELDS = new Set<string>(["TCHAT", "MHHDVU", "TSUAT"])

export type DetailCalcDriverField = "SLUONG" | "DGIA" | "TLCKHAU" | "STCKHAU" | "TSUAT"
export type DetailTaxDriverField = "TTHUE" | "TSAUTHUE"
