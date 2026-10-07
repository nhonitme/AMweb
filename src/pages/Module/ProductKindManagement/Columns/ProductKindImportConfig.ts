import type { ExcelImportConfig } from "@/types/modal";
import { useContext } from "react";
import { LanguageContext } from '@/lib/i18nLoader';
type TranslateFn = (key: string, fallback?: string) => string;

export const createProductKindImportConfig = (translate?: TranslateFn): ExcelImportConfig => {
  const t: TranslateFn = (k, f) => (translate ? translate(k, f) : (f ?? k));
  return {
    moduleCd: "ProductKind",
    templateName: `${t('Menu_ProductKind','Product group management')}_${new Date().toISOString().replace(/[:.-]/g, '')}.xlsx`,
  };
};

export const useProductKindImportConfig = (): ExcelImportConfig => {
  const { translate } = useContext(LanguageContext);
  return createProductKindImportConfig(translate);
};
