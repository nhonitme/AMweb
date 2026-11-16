/** Replace every occurrence without interpreting replacement values as patterns. */
export function formatPitMessage(message: string, ...values: (string | number)[]): string {
  return message.replace(/\{(\d+)\}/g, (placeholder, index: string) =>
    values[Number(index)] === undefined ? placeholder : String(values[Number(index)]),
  )
}
