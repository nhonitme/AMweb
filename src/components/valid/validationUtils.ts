export type AsyncValidationEvent<TData = Record<string, unknown>> = {
  data?: TData;
  value: unknown;
};

export type AsyncValidationResult = boolean | { isValid: boolean; message?: string };

export type AsyncValidationCallback<TData = Record<string, unknown>> = (
  event: AsyncValidationEvent<TData>,
) => Promise<AsyncValidationResult>;

export function normalizeValidationValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toUpperCase();
}

export function hasDuplicateValidationValue<TRow>(
  rows: TRow[],
  value: unknown,
  getValue: (row: TRow) => unknown,
  shouldSkip?: (row: TRow) => boolean,
): boolean {
  const normalizedValue = normalizeValidationValue(value);

  if (!normalizedValue) {
    return false;
  }

  return rows.some((row) => {
    if (shouldSkip?.(row)) {
      return false;
    }

    return normalizeValidationValue(getValue(row)) === normalizedValue;
  });
}
