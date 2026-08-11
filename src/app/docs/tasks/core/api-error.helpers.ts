import { HttpErrorResponse } from '@angular/common/http';

type ValidationErrorsBag = Record<string, string[] | string>;

const FIELD_LABELS: Record<string, string> = {
  acceptor: 'Kontrol Eden',
  customerCode: 'Cari Kod',
  creator: 'Tespit Eden',
  deliverer: 'Teslim Eden',
  description: 'Aciklama',
  description1: 'Aciklama 1',
  description2: 'Aciklama 2',
  documentNo: 'Belge No',
  modelKodu: 'Model Kodu',
  packageCode: 'Model Kodu',
  partyCode: 'Parti',
  projectCode: 'Proje',
  receiver: 'Teslim Alan',
  stockCode: 'Stok Kodu',
  warehouseNo: 'Depo No'
};

export function resolveHttpErrorMessage(error: HttpErrorResponse, fallback: string): string {
  if (typeof error.error === 'string' && error.error.trim()) {
    return error.error.trim();
  }

  if (typeof error.error !== 'object' || error.error === null) {
    return fallback;
  }

  const body = error.error as Record<string, unknown>;
  const validationMessage = resolveValidationErrors(body['errors']);
  if (validationMessage) {
    return validationMessage;
  }

  const message = body['message'];
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }

  const detail = body['detail'];
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }

  const title = body['title'];
  if (typeof title === 'string' && title.trim()) {
    return title.trim();
  }

  return fallback;
}

export function trimToMaxLength(value: string | null | undefined, maxLength: number): string {
  return (value ?? '').trim().slice(0, maxLength);
}

export function combineValidationMessage(
  fallback: string,
  messages: Array<string | null | undefined>
): string {
  const normalizedMessages = messages
    .map((message) => message?.trim() ?? '')
    .filter(Boolean);

  return normalizedMessages.length ? normalizedMessages.join(' ') : fallback;
}

export function maxLengthMessage(
  label: string,
  value: string | null | undefined,
  maxLength: number
): string | null {
  const currentLength = (value ?? '').trim().length;
  return currentLength > maxLength ? `${label} en fazla ${maxLength} karakter olmali.` : null;
}

function resolveValidationErrors(errors: unknown): string {
  if (!errors || typeof errors !== 'object') {
    return '';
  }

  const entries = Object.entries(errors as ValidationErrorsBag);
  if (!entries.length) {
    return '';
  }

  return entries
    .flatMap(([field, messages]) => {
      const label = FIELD_LABELS[normalizeFieldName(field)] ?? field;
      const messageList = Array.isArray(messages) ? messages : [messages];

      return messageList
        .map((message) => (typeof message === 'string' ? message.trim() : ''))
        .filter(Boolean)
        .map((message) => `${label}: ${message}`);
    })
    .join(' ');
}

function normalizeFieldName(field: string): string {
  const parts = field.split('.');
  return (parts[parts.length - 1] ?? field).trim();
}
