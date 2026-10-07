/** KHHDon has six characters; position four identifies cash-register invoices. */
export function isCashRegisterSeries(series: unknown): boolean {
  return String(series ?? "").trim().toUpperCase().charAt(3) === "M"
}
