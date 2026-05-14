import { HttpErrorResponse } from '@angular/common/http';

export interface FurpaDateRange {
  startDate: string;
  endDate: string;
}

export function parseDateRangeToken(token: string): FurpaDateRange | null {
  const normalizedToken = token.trim();
  const match = normalizedToken.match(
    /^aralik-(\d{4}-\d{2}-\d{2})(?:-\d{2}-\d{2}-\d{2})?-(\d{4}-\d{2}-\d{2})(?:-\d{2}-\d{2}-\d{2})?$/
  );

  if (!match) {
    return null;
  }

  return {
    startDate: match[1],
    endDate: match[2]
  };
}

export function formatDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getDefaultDateRange(daysBack = 90): FurpaDateRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return {
    startDate: formatDateOnly(startDate),
    endDate: formatDateOnly(endDate)
  };
}

export function formatDateTimeFilter(token: string): string | null {
  const normalizedToken = token.trim();
  const match = normalizedToken.match(
    /^aralik-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  return `${day}.${month}.${year} ${hour}:${minute}:${second}`;
}

export function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value).trim();
}

export function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return fallback;
}

export function toBooleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLocaleLowerCase('tr-TR');
    return normalizedValue === 'true' || normalizedValue === '1';
  }

  return false;
}

export function toNullableString(value: unknown): string | null {
  const normalizedValue = toStringValue(value);
  return normalizedValue ? normalizedValue : null;
}

export function joinTruthy(values: Array<string | null | undefined>, separator = ' '): string {
  return values
    .map((value) => value?.trim() ?? '')
    .filter(Boolean)
    .join(separator)
    .trim();
}

export function generateClientRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  // Fallback keeps the expected GUID shape when randomUUID is unavailable.
  const segment = (length: number): string =>
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return `${segment(8)}-${segment(4)}-4${segment(3)}-${(
    8 + Math.floor(Math.random() * 4)
  ).toString(16)}${segment(3)}-${segment(12)}`;
}

export function buildProblemError(message: string, status = 501): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: {
      message
    }
  });
}
