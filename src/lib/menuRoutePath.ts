// Both PIT setup tabs belong to the template-management menu entry.
// Keep the actual navigation URL intact; normalize only for menu matching.
export function normalizeMenuRoutePath(path: string): string {
  const normalized = path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path
  return normalized === "/pit-withholding/income-payer-setting"
    ? "/pit-withholding/xsl-setting"
    : normalized
}
