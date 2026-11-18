import type {
  SafeWriteMonitoringItemDto,
  SafeWriteMonitoringListHttpRequest,
  SafeWriteMonitoringStatus
} from '@interfaces';

export type SafeWriteStatusFilter = SafeWriteMonitoringStatus | '';
export type SafeWriteRetryableFilter = 'all' | 'true' | 'false';

export interface SafeWriteFilterValue {
  searchText: string;
  status: SafeWriteStatusFilter;
  operationCode: string;
  warehouseNo: number | null;
  retryable: SafeWriteRetryableFilter;
  includeCompleted: boolean;
  startDate: string;
  endDate: string;
  take: number | null;
}

export type SafeWriteStatusTone = 'info' | 'warn' | 'danger' | 'success' | 'neutral';

export interface SafeWriteStatusPresentation {
  label: string;
  tone: SafeWriteStatusTone;
  retryLabel: string;
}

export function buildSafeWriteMonitoringRequest(
  value: SafeWriteFilterValue
): SafeWriteMonitoringListHttpRequest {
  const warehouseNo = Number(value.warehouseNo);

  return {
    searchText: value.searchText.trim() || undefined,
    status: value.status || undefined,
    operationCode: value.operationCode.trim() || undefined,
    warehouseNo: Number.isFinite(warehouseNo) && warehouseNo > 0
      ? Math.trunc(warehouseNo)
      : undefined,
    retryable: value.retryable === 'all' ? undefined : value.retryable === 'true',
    includeCompleted: value.includeCompleted,
    createdFromUtc: toUtcBoundary(value.startDate, false),
    createdToUtc: toUtcBoundary(value.endDate, true),
    take: Number.isFinite(Number(value.take))
      ? Math.min(500, Math.max(1, Math.trunc(Number(value.take))))
      : 100
  };
}

function toUtcBoundary(value: string, nextDay: boolean): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  if (nextDay) {
    date.setDate(date.getDate() + 1);
  }

  return date.toISOString();
}

export function getSafeWriteStatusPresentation(
  item: SafeWriteMonitoringItemDto
): SafeWriteStatusPresentation {
  if (item.status === 'Completed') {
    return { label: 'Tamamlandi', tone: 'success', retryLabel: 'Gerekmez' };
  }

  if (item.status === 'Processing') {
    return item.ageSeconds > 720
      ? { label: 'Uzlastirma Bekliyor', tone: 'warn', retryLabel: 'Durumu kontrol et' }
      : { label: 'Isleniyor', tone: 'info', retryLabel: 'Bekle' };
  }

  if (item.status === 'Failed' && item.retryable === true) {
    if (item.errorCode === 'SAFE_WRITE_RETRY_ALLOWED') {
      return {
        label: 'Yeniden Gonderime Hazir',
        tone: 'warn',
        retryLabel: 'Ayni kimlikle'
      };
    }

    return {
      label: 'Sonuc Kontrol Edilebilir',
      tone: 'warn',
      retryLabel: 'Durumu kontrol et'
    };
  }

  if (item.status === 'Failed' && item.retryable === false) {
    if (item.errorCode === 'SAFE_WRITE_VALIDATION_REJECTED') {
      return {
        label: 'Veri Dogrulamasinda Reddedildi',
        tone: 'neutral',
        retryLabel: 'Kaydi duzelt'
      };
    }

    return {
      label: 'Manuel Inceleme Gerekli',
      tone: 'danger',
      retryLabel: 'Tekrar gonderme'
    };
  }

  if (item.status === 'Failed') {
    return {
      label: 'Siniflandirilmamis / Eski Hata',
      tone: 'neutral',
      retryLabel: 'Otomatik tekrar yok'
    };
  }

  if (item.status === 'Cancelled') {
    return {
      label: 'Yetkili Tarafindan Iptal Edildi',
      tone: 'neutral',
      retryLabel: 'Yerel kaydi temizle'
    };
  }

  return { label: 'Bilinmiyor', tone: 'neutral', retryLabel: '-' };
}
