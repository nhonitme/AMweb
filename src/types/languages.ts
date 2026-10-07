export type MessageLanguageKey = "KOR" | "ENG" | "VIET" | "JPN" | "THA" | "CHN"

export interface languages {
  KEY: string
  KOR: string | null
  ENG: string | null
  VIET: string | null
  JPN: string | null
  THA: string | null
  CHN: string | null
  COMMENT?: string | null
  REG_DATE?: string | null
  LAST_MIDOFY_DATE?: string | null
}
