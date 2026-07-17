import { AuthService } from '../../../core/auth/services/auth.service';
import type { SettingsTypeOptionDto } from '@interfaces';

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
    code: 'cash-type-0',
    name: 'Kasa Tipi 0',
    description: 'Mevcut veri sozlugunde is kurali adi netlestirilmemis kasa tipi.',
    isKnown: false
  },
  {
    value: 1,
    code: 'cash-type-1',
    name: 'Kasa Tipi 1',
    description: 'Mevcut veri sozlugunde is kurali adi netlestirilmemis kasa tipi.',
    isKnown: false
  }
];

export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const httpError = error as { error?: unknown; message?: unknown };

  if (typeof httpError.error === 'string' && httpError.error.trim()) {
    return httpError.error;
  }

  if (typeof httpError.error === 'object' && httpError.error !== null) {
    const body = httpError.error as Record<string, unknown>;
    const bodyMessage = body['message'] ?? body['title'] ?? body['detail'];

    if (typeof bodyMessage === 'string' && bodyMessage.trim()) {
      return bodyMessage;
    }
  }

  if (typeof httpError.message === 'string' && httpError.message.trim()) {
    return httpError.message;
  }

  return fallback;
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
    (currentUser?.roller ?? []).some(
      (role) => role.toLocaleLowerCase('tr-TR') === 'administrator'
    ) ||
    (currentUser?.permissions ?? []).includes(permissionCode) ||
    authService.getTaskPermissionCodes(taskId).includes(permissionCode)
  );
}
