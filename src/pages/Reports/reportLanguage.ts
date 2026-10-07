import type { MessageLanguageKey } from "@/types/languages";
import { isUiLanguageEnabled } from "@/lib/companyLang";
import { DEFAULT_MESSAGE_LANGUAGE, languages, normalizeMessageLanguageKey } from "@/utils/language";

export type ReportLanguageCode = MessageLanguageKey;

export type ReportLanguageOption = {
  code: ReportLanguageCode;
  label: string;
  backendCode: MessageLanguageKey;
};

export function getReportLanguageOptions(): ReportLanguageOption[] {
  return languages
    .filter((language) => isUiLanguageEnabled(language.code))
    .map((language) => ({
      code: language.code,
      label: language.shortLabel,
      backendCode: language.code,
    }));
}

export function normalizeReportLanguage(value?: string | null): ReportLanguageCode {
  return normalizeMessageLanguageKey(value ?? DEFAULT_MESSAGE_LANGUAGE);
}
