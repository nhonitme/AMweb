import type { SysCode } from "@/api/sysCodeService";

export function normalizeSysCodeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function createSysCodeSelectBoxEditorOptions(
  dataSource: SysCode[],
  placeholder?: string,
  translate?: (key: string, fallback?: string) => string,
): Record<string, unknown> {
  return {
    dataSource,
    displayExpr: (item: SysCode) => {
      const raw = String(item?.CODE_NAME ?? "").trim();
      if (!raw) {
        return "";
      }
      if (translate) {
        return translate(raw, raw);
      }
      return raw;
    },
    placeholder,
    searchEnabled: true,
    searchExpr: ["CODE_NAME", "CODE_CD"],
    showClearButton: true,
    stylingMode: "outlined",
    valueExpr: "CODE_CD",
  };
}
