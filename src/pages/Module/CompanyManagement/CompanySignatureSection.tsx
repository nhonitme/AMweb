import { useCallback, useContext, useEffect, useState } from "react"
import { LoadPanel } from "devextreme-react"

import {
  useCompanySignaturesInvalidate,
  useCompanySignaturesQuery,
} from "@/hooks/queries/adminQueries"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import { LanguageContext } from "@/lib/i18nLoader"
import type { CompanySignatureInfo } from "@/types/companySignatureInfo"

import CompanySignatureDemoPreview from "./CompanySignatureDemoPreview"
import CompanySignatureSettingsPanel from "./CompanySignatureSettingsPanel"
import { normalizeCompanySignatureRows } from "./companySignatureUtils"
import "./companySignatureDemo.css"

interface CompanySignatureSectionProps {
  companyCd: string
}

export default function CompanySignatureSection({ companyCd }: CompanySignatureSectionProps) {
  const [rows, setRows] = useState<CompanySignatureInfo[]>([])

  const {
    data: signatureResponse,
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchSignatures,
  } = useCompanySignaturesQuery(companyCd)
  const invalidateSignatures = useCompanySignaturesInvalidate(companyCd)
  const loading = isLoading || isFetching

  const { lang, translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
    lang?: string
  }

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  )

  useMasterListLoadError(isError, loadError, t, "Failed to load company signatures")

  useEffect(() => {
    setRows(normalizeCompanySignatureRows(signatureResponse?.data || []))
  }, [signatureResponse])

  const handleReload = useCallback(async () => {
    await invalidateSignatures()
    await refetchSignatures()
  }, [invalidateSignatures, refetchSignatures])

  return (
    <div className="company-signature-workspace">
      <div className="company-signature-workspace__settings">
        <CompanySignatureSettingsPanel
          companyCd={companyCd}
          rows={rows}
          onRowsChange={setRows}
          onReload={handleReload}
          t={t}
        />
        <LoadPanel
          shadingColor="rgba(0, 0, 0, 0.4)"
          visible={loading}
          showIndicator={true}
          shading={true}
          showPane={true}
        />
      </div>

      <div className="company-signature-workspace__preview">
        <CompanySignatureDemoPreview signatures={rows} t={t} language={lang} />
      </div>
    </div>
  )
}
