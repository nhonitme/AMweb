import type { ReportPreviewColumn } from "@/api/configuredReportPreviewApi"
import {
  resolveConfigCaption,
  resolveReportItemCaption,
  type ConfigCaptionTranslator,
  type ReportItemCaptionSource,
} from "@/utils/resolveConfigCaption"

export type ReportColumnTranslator = ConfigCaptionTranslator

export function resolveReportColumnCaptionFallback(column: ReportPreviewColumn): string {
  return column.CAPTION?.trim() || column.FIELD_NAME || column.COLUMN_KEY || ""
}

export function translateReportColumnCaption(
  column: ReportPreviewColumn,
  translate: ReportColumnTranslator,
): string {
  return resolveConfigCaption(
    {
      LABEL_TEXT: column.LABEL_TEXT,
      CAPTION: column.CAPTION,
      FIELD_NAME: column.FIELD_NAME || column.COLUMN_KEY,
    },
    translate,
  )
}

export function translateReportItemCaption(
  source: ReportItemCaptionSource | null | undefined,
  translate: ReportColumnTranslator,
): string {
  return resolveReportItemCaption(source, translate)
}
