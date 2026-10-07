import { SVG_CHAR_MAP } from "./svgCharMap"

function svgCountChar(count: number, pathParts: string[]): string {
  for (let i = 1; i <= 9; i += 1) {
    const mapped = SVG_CHAR_MAP[String(i)]
    if (mapped && mapped.length === count) {
      return String(i)
    }
  }

  for (const char of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const mapped = SVG_CHAR_MAP[char]
    if (!mapped || mapped.length === 0) {
      continue
    }
    if (mapped.length !== count) {
      continue
    }
    if (char === "B" && pathParts.length > 1 && pathParts[1].split(".")[0] === "35") {
      return "S"
    }
    if (char === "N" && pathParts.length > 1 && pathParts[1].split(".")[0] === "25") {
      return "X"
    }
    return char
  }

  return "-"
}

function sortKey(value: string): [number, number | string] {
  const asInt = Number.parseInt(value, 10)
  if (Number.isFinite(asInt) && String(asInt) === value) {
    return [0, asInt]
  }
  return [1, value]
}

/** Giải captcha SVG GDT bằng cách đếm path segments (port từ local_agent.py). */
export function solveSvgCaptcha(svgContent: string): string {
  const doc = new DOMParser().parseFromString(svgContent, "image/svg+xml")
  const paths = Array.from(doc.getElementsByTagName("path"))
  const segmentCountById = new Map<string, number>()
  const partsById = new Map<string, string[]>()
  const indexIds: string[] = []

  for (const path of paths) {
    const fill = path.getAttribute("fill")
    if (!fill || fill === "none") {
      continue
    }
    const dAttr = path.getAttribute("d") ?? ""
    const parts = dAttr.split(" ")
    const rawId = parts[0]?.replace("M", "") ?? ""
    const idVal = rawId.split(".")[0] ?? ""
    if (!idVal) {
      continue
    }
    segmentCountById.set(idVal, parts.length - 1)
    partsById.set(idVal, parts)
    indexIds.push(idVal)
  }

  const uniqueSorted = Array.from(new Set(indexIds)).sort((a, b) => {
    const [ka, va] = sortKey(a)
    const [kb, vb] = sortKey(b)
    if (ka !== kb) {
      return ka - kb
    }
    if (typeof va === "number" && typeof vb === "number") {
      return va - vb
    }
    return String(va).localeCompare(String(vb))
  })

  let result = ""
  for (const id of uniqueSorted) {
    const count = segmentCountById.get(id) ?? 0
    const parts = partsById.get(id) ?? []
    result += svgCountChar(count, parts)
  }
  return result
}
