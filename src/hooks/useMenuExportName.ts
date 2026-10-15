import { useCallback, useContext, useMemo } from "react"

import { useMenuTreeQuery } from "@/hooks/queries/useMenuTreeQuery"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCompanyCdFromPathname, getCurrentCompanyCd } from "@/lib/login"
import { buildExportFileName, buildExportSheetName, resolveMenuExportLabel } from "@/lib/exportFileName"
import { useLocation } from "react-router-dom"

export type MenuExportName = {
  label: string
  fileName: (extension: string) => string
  sheetName: () => string
}

export function useMenuExportName(menuCode: string): MenuExportName {
  const location = useLocation()
  const companyCd = getCompanyCdFromPathname(location.pathname) || getCurrentCompanyCd() || ""
  const { data: menuTree = [] } = useMenuTreeQuery(companyCd)
  const { translate } = useContext(LanguageContext)

  const label = useMemo(
    () => resolveMenuExportLabel(menuTree, menuCode, translate),
    [menuCode, menuTree, translate],
  )

  const fileName = useCallback(
    (extension: string) => buildExportFileName(label, extension),
    [label],
  )
  const sheetName = useCallback(() => buildExportSheetName(label), [label])

  return useMemo(() => ({ label, fileName, sheetName }), [fileName, label, sheetName])
}
