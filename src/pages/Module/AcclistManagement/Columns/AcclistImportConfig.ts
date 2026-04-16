import type { ExcelImportConfig } from "@/types/modal";
import { useContext } from "react";
import { LanguageContext } from '@/lib/i18nLoader';
type TranslateFn = (key: string, fallback?: string) => string;

export const createAcclistImportConfig = (translate?: TranslateFn): ExcelImportConfig => {

  const t: TranslateFn = (k, f) => (translate ? translate(k, f) : (f ?? k));
return {
  moduleCd: "AcclistInfo",
  templateName: `${t('Menu_AcclistInfo','Warehouse Classification Management')}_${new Date().toISOString().replace(/[:.-]/g, '')}.xlsx`
}
}

export const useAcclistImportConfig = (): ExcelImportConfig => {
  const ctx = useContext(LanguageContext) as any;
  const translate: TranslateFn | undefined = ctx?.translate;
  return createAcclistImportConfig(translate);
};