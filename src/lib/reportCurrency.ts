import { DEFAULT_CURRENCY_CODE, normalizeCurrencyCode } from "@/lib/currency"

const DIGIT_WORDS = [
  "không",
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
] as const

function uppercaseFirst(value: string): string {
  if (!value) {
    return ""
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function roundAwayFromZero(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return (Math.sign(value) * Math.round(Math.abs(value) * factor + Number.EPSILON)) / factor
}

function readThreeDigits(number: number, readFull: boolean): string {
  const hundreds = Math.floor(number / 100)
  const tens = Math.floor((number % 100) / 10)
  const units = number % 10
  const parts: string[] = []

  if (hundreds > 0 || readFull) {
    parts.push(hundreds > 0 ? `${DIGIT_WORDS[hundreds]} trăm` : "không trăm")
  }

  if (tens > 1) {
    parts.push(`${DIGIT_WORDS[tens]} mươi`)
    if (units === 1) {
      parts.push("mốt")
    } else if (units === 4) {
      parts.push("tư")
    } else if (units === 5) {
      parts.push("lăm")
    } else if (units > 0) {
      parts.push(DIGIT_WORDS[units])
    }
  } else if (tens === 1) {
    parts.push("mười")
    if (units === 5) {
      parts.push("lăm")
    } else if (units > 0) {
      parts.push(DIGIT_WORDS[units])
    }
  } else if (units > 0) {
    if (hundreds > 0 || readFull) {
      parts.push("lẻ")
    }

    parts.push(units === 5 && (hundreds > 0 || readFull) ? "năm" : DIGIT_WORDS[units])
  }

  return parts.join(" ").trim()
}

function readVietnameseIntegerAmount(amount: number): string {
  if (amount === 0) {
    return "không"
  }

  const groups: number[] = []
  let remainingAmount = Math.trunc(Math.abs(amount))
  while (remainingAmount > 0) {
    groups.push(remainingAmount % 1000)
    remainingAmount = Math.floor(remainingAmount / 1000)
  }

  const unitNames = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"]
  const parts: string[] = []

  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const groupValue = groups[index]
    if (groupValue === 0) {
      continue
    }

    const readFull = index < groups.length - 1 && groupValue < 100
    let part = readThreeDigits(groupValue, readFull)
    const unitName = unitNames[index] ?? ""
    if (unitName) {
      part = `${part} ${unitName}`
    }

    parts.push(part)
  }

  return parts.join(" ").trim()
}

function convertVietnameseDongToWords(amount: number): string {
  const roundedAmount = roundAwayFromZero(amount, 0)
  if (roundedAmount === 0) {
    return "Không đồng"
  }

  const isNegative = roundedAmount < 0
  const absoluteAmount = Math.abs(roundedAmount)
  if (absoluteAmount > Number.MAX_SAFE_INTEGER) {
    return `${absoluteAmount.toLocaleString("vi-VN")} đồng`
  }

  const result = `${uppercaseFirst(readVietnameseIntegerAmount(absoluteAmount))} đồng`
  return isNegative ? `Âm ${result}` : result
}

function convertUsdAmountToWords(amount: number): string {
  const roundedAmount = roundAwayFromZero(amount, 2)
  const isNegative = roundedAmount < 0
  const absoluteAmount = Math.abs(roundedAmount)
  if (absoluteAmount > Number.MAX_SAFE_INTEGER) {
    return `${absoluteAmount.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
  }

  let dollarAmount = Math.trunc(absoluteAmount)
  let centAmount = Math.round((absoluteAmount - dollarAmount) * 100 + Number.EPSILON)
  if (centAmount === 100) {
    dollarAmount += 1
    centAmount = 0
  }

  const parts = [`${readVietnameseIntegerAmount(dollarAmount)} đô la Mỹ`]
  if (centAmount > 0) {
    parts.push(`${readVietnameseIntegerAmount(centAmount)} xu`)
  }

  const result = uppercaseFirst(parts.join(" và "))
  return isNegative ? `Âm ${result}` : result
}

function convertForeignCurrencyToWords(amount: number, currencyCode: string): string {
  const roundedAmount = roundAwayFromZero(amount, 0)
  if (roundedAmount === 0) {
    return `Không ${currencyCode}`
  }

  const isNegative = roundedAmount < 0
  const absoluteAmount = Math.abs(roundedAmount)
  if (absoluteAmount > Number.MAX_SAFE_INTEGER) {
    return `${absoluteAmount.toLocaleString("vi-VN")} ${currencyCode}`
  }

  const result = `${uppercaseFirst(readVietnameseIntegerAmount(absoluteAmount))} ${currencyCode}`
  return isNegative ? `Âm ${result}` : result
}

export function convertAmountToWords(amount: number, currencyCode?: string | null): string {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode) || DEFAULT_CURRENCY_CODE

  if (normalizedCurrencyCode === "USD") {
    return convertUsdAmountToWords(amount)
  }

  if (normalizedCurrencyCode === DEFAULT_CURRENCY_CODE) {
    return convertVietnameseDongToWords(amount)
  }

  return convertForeignCurrencyToWords(amount, normalizedCurrencyCode)
}
