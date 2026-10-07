import type { ExcelImportConfig } from "@/types/modal";
import { useContext } from "react";
import { LanguageContext } from '@/lib/i18nLoader';
type TranslateFn = (key: string, fallback?: string) => string;

export const createProductImportConfig = (translate?: TranslateFn): ExcelImportConfig => {
  const t: TranslateFn = (k, f) => (translate ? translate(k, f) : (f ?? k));
  return {
    moduleCd: "ProductInfo",
    templateName: `${t('Menu_ProductInfo','Inventory management')}_${new Date().toISOString().replace(/[:.-]/g, '')}.xlsx`,
  };
};

export const useProductImportConfig = (): ExcelImportConfig => {
  const { translate } = useContext(LanguageContext);
  return createProductImportConfig(translate);
};
