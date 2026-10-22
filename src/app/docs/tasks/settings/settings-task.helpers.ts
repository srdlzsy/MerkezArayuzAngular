import { AuthService } from '../../../core/auth/services/auth.service';
import type { SettingsTypeOptionDto } from '@interfaces';

import { appendHttpErrorCorrelation } from '../core/api-error.helpers';

export interface ActionFeedback {
  tone: 'error' | 'info' | 'success';
  title: string;
  message: string;
}

export const FALLBACK_SCALE_TYPE_OPTIONS: readonly SettingsTypeOptionDto[] = [
  {
    value: 0,
    code: 'cas-16',
    name: 'CAS 16',
    description: 'Terazi.plu formatinda CAS 16 terazi dosyasi uretir.',
    isKnown: true
  },
  {
    value: 1,
    code: 'cas-500',
    name: 'CAS 500',
    description: 'ART_STM.txt formatinda CAS 500 terazi dosyasi uretir.',
    isKnown: true
  }
];

export const FALLBACK_CASH_TYPE_OPTIONS: readonly SettingsTypeOptionDto[] = [
  {
    value: 0,
    code: 'standard-pos-cash-register',
    name: 'Standart Kasa',
    description: 'Ana fiziksel kasa. POSKON/MESAJ dosyalarina dahildir. Banka/POS terminali degildir.',
    isKnown: true
  },
  {
    value: 1,
    code: 'additional-pos-cash-register',
    name: 'Ek Kasa',
    description: 'Ana kasaya ek fiziksel kasa. Kendi kasa numarasiyla izlenir; banka/POS terminali ayri tanimlanir.',
    isKnown: true
  }
];

export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const httpError = error as { error?: unknown; message?: unknown };
  let message = fallback;

  if (typeof httpError.error === 'string' && httpError.error.trim()) {
    message = httpError.error.trim();
  } else if (typeof httpError.error === 'object' && httpError.error !== null) {
    const body = httpError.error as Record<string, unknown>;
    const bodyMessage = body['message'] ?? body['title'] ?? body['detail'];

    if (typeof bodyMessage === 'string' && bodyMessage.trim()) {
      message = bodyMessage.trim();
    }
  }

  if (message === fallback && typeof httpError.message === 'string' && httpError.message.trim()) {
    message = httpError.message.trim();
  }

  return appendHttpErrorCorrelation(error, message);
}

export function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

export function getOptionalText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

export function hasSettingsPermission(
  authService: AuthService,
  taskId: string,
  permissionCode: string
): boolean {
  const currentUser = authService.currentUser();

  return (
    (currentUser?.permissions ?? []).includes(permissionCode) ||
    authService.getTaskPermissionCodes(taskId).includes(permissionCode)
  );
}
