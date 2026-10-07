import type { ExcelImportConfig } from "@/types/modal";
import { useContext } from "react";
import { LanguageContext } from '@/lib/i18nLoader';
type TranslateFn = (key: string, fallback?: string) => string;

export const createProductUnitImportConfig = (translate?: TranslateFn): ExcelImportConfig => {
  const t: TranslateFn = (k, f) => (translate ? translate(k, f) : (f ?? k));
  return {
    moduleCd: "ProductUnit",
    templateName: `${t('Menu_ProductUnit','Product unit management')}_${new Date().toISOString().replace(/[:.-]/g, '')}.xlsx`,
  };
};

export const useProductUnitImportConfig = (): ExcelImportConfig => {
  const { translate } = useContext(LanguageContext);
  return createProductUnitImportConfig(translate);
};
