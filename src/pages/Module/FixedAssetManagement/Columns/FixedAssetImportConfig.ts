import type { ExcelImportConfig } from '@/types/modal'
import { useContext } from 'react'
import { LanguageContext } from '@/lib/i18nLoader'

type TranslateFn = (key: string, fallback?: string) => string

export const createFixedAssetImportConfig = (translate?: TranslateFn): ExcelImportConfig => {
  const t: TranslateFn = (k, f) => (translate ? translate(k, f) : (f ?? k))
  return {
    moduleCd: 'FixedAssetInfo',
    templateName: `${t('FA_REGISTER', 'Danh mục tài sản cố định')}`,
  }
}

export const useFixedAssetImportConfig = (): ExcelImportConfig => {
  const { translate } = useContext(LanguageContext)
  return createFixedAssetImportConfig(translate)
}
