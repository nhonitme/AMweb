export function isPublicEInvoiceLookupPath(pathname: string): boolean {
  return /^\/tra-cuu-einvoice-amnote(?:\/[^/]+)?\/?$/i.test(pathname)
    || /^\/einvoice\/lookup(?:\/[^/]+)?\/?$/i.test(pathname)
    || /^\/tra-cuu-bien-ban-amnote(?:\/[^/]+)?\/?$/i.test(pathname)
    || /^\/einvoice\/minutes\/lookup(?:\/[^/]+)?\/?$/i.test(pathname)
}

export function isPublicAppPath(pathname = typeof window === "undefined" ? "" : window.location.pathname): boolean {
  return isPublicEInvoiceLookupPath(pathname)
}

export function isPublicApiPath(path: string): boolean {
  const normalized = path.toLowerCase().replace(/^\/+/, "")
  return normalized.startsWith("public/")
}
